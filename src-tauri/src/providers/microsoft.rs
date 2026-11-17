use serde::{Deserialize, Serialize};

use super::{
    BoxFuture, DeadlineUpdateResult, MSToDoListSummary, OrganizationRoles, ProviderContext,
    RemoteDeleteRequest, SubtaskMutationRequest, TaskDeadlineRequest, TaskProvider,
    TaskTransitionRequest,
};
use crate::{
    chrono_now_iso, current_epoch_seconds, ensure_valid_microsoft_token, get_health_store,
    ms_status_to_task_status, task_status_to_ms_planner_percent, task_status_to_ms_todo_status,
    ProviderHealth, SourceMeta, SubtaskItem, TaskLink, UnifiedTask,
};

pub struct MicrosoftProvider;

#[derive(Deserialize, Debug)]
struct MSGraphCollection<T> {
    value: Option<Vec<T>>,
}

#[derive(Deserialize, Debug)]
struct MSEducationAssignmentInstructions {
    content: Option<String>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct MSEducationAssignment {
    id: String,
    display_name: Option<String>,
    instructions: Option<MSEducationAssignmentInstructions>,
    due_date_time: Option<String>,
    status: Option<String>,
    web_url: Option<String>,
    class_id: Option<String>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct MSPlannerTask {
    id: String,
    title: Option<String>,
    percent_complete: Option<u8>,
    due_date_time: Option<String>,
    #[allow(dead_code)]
    plan_id: Option<String>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct MSToDoList {
    id: String,
    display_name: Option<String>,
    wellknown_list_name: Option<String>,
}

#[derive(Deserialize, Debug)]
struct MSToDoBody {
    content: Option<String>,
}

#[derive(Deserialize, Debug)]
struct MSToDoDateTime {
    #[serde(rename = "dateTime")]
    date_time: Option<String>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct MSToDoChecklistItem {
    id: String,
    display_name: Option<String>,
    is_checked: Option<bool>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct MSToDoLinkedResource {
    web_url: Option<String>,
    application_name: Option<String>,
    display_name: Option<String>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct MSToDoTask {
    id: String,
    title: Option<String>,
    status: Option<String>,
    body: Option<MSToDoBody>,
    due_date_time: Option<MSToDoDateTime>,
    checklist_items: Option<Vec<MSToDoChecklistItem>>,
    linked_resources: Option<Vec<MSToDoLinkedResource>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CreateToDoListPayload<'a> {
    display_name: &'a str,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct MSEduUserProfile {
    primary_role: Option<String>,
}

/// Fetch Microsoft To Do task lists via Microsoft Graph.
pub async fn fetch_todo_lists(ctx: &ProviderContext) -> Result<Vec<MSToDoListSummary>, String> {
    let token = ensure_valid_microsoft_token(&ctx.app_handle).await?;
    let client = ctx.http_client()?;

    let resp = client
        .get("https://graph.microsoft.com/v1.0/me/todo/lists")
        .bearer_auth(&token)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch Microsoft To Do lists: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Microsoft Graph API error: {} {}", status, body));
    }

    let body: MSGraphCollection<MSToDoList> = resp.json().await.map_err(|e| e.to_string())?;
    Ok(body
        .value
        .unwrap_or_default()
        .into_iter()
        .map(|l| MSToDoListSummary {
            id: l.id,
            title: l.display_name.unwrap_or_else(|| "Tasks".to_string()),
            is_owner: true,
        })
        .collect())
}

/// Create a new Microsoft To Do task list via Microsoft Graph.
pub async fn create_todo_list(
    ctx: &ProviderContext,
    title: &str,
) -> Result<MSToDoListSummary, String> {
    let trimmed = title.trim();
    if trimmed.is_empty() {
        return Err("List title cannot be empty".to_string());
    }

    let token = ensure_valid_microsoft_token(&ctx.app_handle).await?;
    let client = ctx.http_client()?;
    let payload = CreateToDoListPayload {
        display_name: trimmed,
    };

    let resp = client
        .post("https://graph.microsoft.com/v1.0/me/todo/lists")
        .bearer_auth(&token)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Failed to create Microsoft To Do list: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!(
            "Microsoft Graph API error (create list): {} {}",
            status, body
        ));
    }

    let created: MSToDoList = resp.json().await.map_err(|e| e.to_string())?;
    Ok(MSToDoListSummary {
        id: created.id,
        title: created.display_name.unwrap_or_else(|| trimmed.to_string()),
        is_owner: true,
    })
}

/// Evaluate Microsoft Teams Education role; defaults safely to "student" when unavailable.
pub async fn get_organization_roles(ctx: &ProviderContext) -> Result<OrganizationRoles, String> {
    if let Ok(token) = ensure_valid_microsoft_token(&ctx.app_handle).await {
        if let Ok(client) = ctx.http_client() {
            if let Ok(resp) = client
                .get("https://graph.microsoft.com/v1.0/education/me/user")
                .bearer_auth(&token)
                .send()
                .await
            {
                if resp.status().is_success() {
                    if let Ok(profile) = resp.json::<MSEduUserProfile>().await {
                        let is_instructor = profile
                            .primary_role
                            .as_deref()
                            .map(|r| {
                                r.eq_ignore_ascii_case("teacher")
                                    || r.eq_ignore_ascii_case("faculty")
                            })
                            .unwrap_or(false);
                        return Ok(OrganizationRoles {
                            teams_role: if is_instructor {
                                "instructor".to_string()
                            } else {
                                "student".to_string()
                            },
                        });
                    }
                }
            }
        }
    }

    Ok(OrganizationRoles {
        teams_role: "student".to_string(),
    })
}

/// Normalize Microsoft To Do tasks into UnifiedTask, mapping checklist item status strictly to "done" | "todo".
fn normalize_todo_task(
    task: MSToDoTask,
    list_id: &str,
    list_title: Option<String>,
    is_flagged_list: bool,
) -> Option<UnifiedTask> {
    let title = task.title.clone().unwrap_or_default();
    if title.trim().is_empty() {
        return None;
    }

    let status = ms_status_to_task_status(task.status.as_deref(), None);

    let subtasks: Option<Vec<SubtaskItem>> = task.checklist_items.map(|items| {
        items
            .into_iter()
            .map(|ci| SubtaskItem {
                id: ci.id,
                title: ci.display_name.unwrap_or_default(),
                status: if ci.is_checked.unwrap_or(false) {
                    "done".to_string()
                } else {
                    "todo".to_string()
                },
            })
            .collect()
    });

    let has_subtasks = subtasks.as_ref().map(|s| !s.is_empty());
    let subtask_count = subtasks.as_ref().map(|s| s.len());

    let links: Option<Vec<TaskLink>> = task.linked_resources.map(|res| {
        res.into_iter()
            .filter_map(|lr| {
                let link = lr.web_url?;
                Some(TaskLink {
                    description: lr.display_name.or(lr.application_name),
                    link,
                    link_type: Some("url".to_string()),
                })
            })
            .collect()
    });

    let web_url = links
        .as_ref()
        .and_then(|l| l.first())
        .map(|l| l.link.clone())
        .unwrap_or_else(|| format!("https://to-do.office.com/tasks/id/{}", task.id));

    Some(UnifiedTask {
        id: format!("ms_todo_{}", task.id),
        title,
        source: "microsoft_teams".to_string(),
        status,
        priority: None,
        url: web_url,
        updated_at: chrono_now_iso(),
        description: task.body.and_then(|b| b.content),
        source_meta: SourceMeta {
            list_id: Some(list_id.to_string()),
            list_title,
            due_date: task.due_date_time.and_then(|d| d.date_time),
            has_subtasks,
            subtask_count,
            subtasks,
            links,
            is_flagged_email: if is_flagged_list { Some(true) } else { None },
            ..Default::default()
        },
    })
}

impl TaskProvider for MicrosoftProvider {
    fn provider_id(&self) -> &'static str {
        "microsoft_teams"
    }

    fn fetch_tasks<'a>(
        &'a self,
        ctx: &'a ProviderContext,
    ) -> BoxFuture<'a, Result<Vec<UnifiedTask>, String>> {
        Box::pin(async move {
            let token = match ensure_valid_microsoft_token(&ctx.app_handle).await {
                Ok(t) => t,
                Err(e) => {
                    if let Ok(mut health) = get_health_store().lock() {
                        health.microsoft = Some(ProviderHealth {
                            connected: false,
                            error_message: Some(e.clone()),
                            last_checked: Some(current_epoch_seconds()),
                            ..Default::default()
                        });
                    }
                    return Err(e);
                }
            };

            let client = ctx.http_client()?;
            let mut unified_tasks: Vec<UnifiedTask> = Vec::new();

            // 1. Fetch Microsoft To Do lists & tasks
            let lists_resp = client
                .get("https://graph.microsoft.com/v1.0/me/todo/lists")
                .bearer_auth(&token)
                .send()
                .await;

            if let Ok(resp) = lists_resp {
                if resp.status().is_success() {
                    if let Ok(lists_body) = resp.json::<MSGraphCollection<MSToDoList>>().await {
                        for list in lists_body.value.unwrap_or_default() {
                            let is_flagged_list = list
                                .wellknown_list_name
                                .as_deref()
                                .map(|w| w.eq_ignore_ascii_case("flaggedEmails"))
                                .unwrap_or(false);

                            let tasks_resp = client
                                .get(format!(
                                    "https://graph.microsoft.com/v1.0/me/todo/lists/{}/tasks?$expand=checklistItems,linkedResources",
                                    list.id
                                ))
                                .bearer_auth(&token)
                                .send()
                                .await;

                            if let Ok(t_resp) = tasks_resp {
                                if t_resp.status().is_success() {
                                    if let Ok(tasks_body) =
                                        t_resp.json::<MSGraphCollection<MSToDoTask>>().await
                                    {
                                        for task in tasks_body.value.unwrap_or_default() {
                                            if let Some(normalized) = normalize_todo_task(
                                                task,
                                                &list.id,
                                                list.display_name.clone(),
                                                is_flagged_list,
                                            ) {
                                                unified_tasks.push(normalized);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 2. Fetch Microsoft Planner tasks
            let planner_resp = client
                .get("https://graph.microsoft.com/v1.0/me/planner/tasks")
                .bearer_auth(&token)
                .send()
                .await;

            if let Ok(resp) = planner_resp {
                if resp.status().is_success() {
                    if let Ok(planner_body) = resp.json::<MSGraphCollection<MSPlannerTask>>().await
                    {
                        for task in planner_body.value.unwrap_or_default() {
                            let title = task.title.clone().unwrap_or_default();
                            if title.trim().is_empty() {
                                continue;
                            }

                            let status = ms_status_to_task_status(None, task.percent_complete);
                            let percent = task.percent_complete.unwrap_or(0);

                            unified_tasks.push(UnifiedTask {
                                id: format!("ms_planner_{}", task.id),
                                title,
                                source: "microsoft_teams".to_string(),
                                status,
                                priority: None,
                                url: "https://tasks.office.com/".to_string(),
                                updated_at: chrono_now_iso(),
                                description: None,
                                source_meta: SourceMeta {
                                    is_planner: Some(true),
                                    percent_complete: Some(percent),
                                    due_date: task.due_date_time,
                                    ..Default::default()
                                },
                            });
                        }
                    }
                }
            }

            // 3. Fetch Teams for Education assignments (optional / school accounts)
            let edu_resp = client
                .get("https://graph.microsoft.com/v1.0/education/me/assignments")
                .bearer_auth(&token)
                .send()
                .await;

            if let Ok(resp) = edu_resp {
                if resp.status().is_success() {
                    if let Ok(edu_body) = resp
                        .json::<MSGraphCollection<MSEducationAssignment>>()
                        .await
                    {
                        for assignment in edu_body.value.unwrap_or_default() {
                            let title = assignment.display_name.clone().unwrap_or_default();
                            if title.trim().is_empty() {
                                continue;
                            }

                            let status =
                                ms_status_to_task_status(assignment.status.as_deref(), None);
                            let web_url = assignment.web_url.clone().unwrap_or_else(|| {
                                "https://teams.microsoft.com/l/entity/66aeee93-507d-479a-a3ef-ba44ac2e7735/classroom".to_string()
                            });

                            unified_tasks.push(UnifiedTask {
                                id: format!("ms_assignment_{}", assignment.id),
                                title,
                                source: "microsoft_teams".to_string(),
                                status,
                                priority: None,
                                url: web_url.clone(),
                                updated_at: chrono_now_iso(),
                                description: assignment.instructions.and_then(|i| i.content),
                                source_meta: SourceMeta {
                                    is_assignment: Some(true),
                                    assignment_id: Some(assignment.id),
                                    due_date: assignment.due_date_time,
                                    submission_url: Some(web_url),
                                    course_name: assignment.class_id,
                                    ..Default::default()
                                },
                            });
                        }
                    }
                }
            }

            Ok(unified_tasks)
        })
    }

    fn transition_status<'a>(
        &'a self,
        ctx: &'a ProviderContext,
        req: TaskTransitionRequest,
    ) -> BoxFuture<'a, Result<(), String>> {
        Box::pin(async move {
            let token = ensure_valid_microsoft_token(&ctx.app_handle).await?;
            let client = ctx.http_client()?;

            if req.task_id.starts_with("ms_planner_") {
                let raw_id = req.task_id.strip_prefix("ms_planner_").unwrap_or(&req.task_id);
                let percent = task_status_to_ms_planner_percent(&req.new_status);

                let get_resp = client
                    .get(format!("https://graph.microsoft.com/v1.0/planner/tasks/{}", raw_id))
                    .bearer_auth(&token)
                    .send()
                    .await
                    .map_err(|e| format!("Failed to fetch planner task: {}", e))?;

                if !get_resp.status().is_success() {
                    let status = get_resp.status();
                    let body = get_resp.text().await.unwrap_or_default();
                    return Err(format!("Microsoft Planner GET error ({}): {}", status, body));
                }

                let etag = get_resp
                    .headers()
                    .get("etag")
                    .and_then(|v| v.to_str().ok())
                    .unwrap_or("*");

                let patch_resp = client
                    .patch(format!("https://graph.microsoft.com/v1.0/planner/tasks/{}", raw_id))
                    .header("If-Match", etag)
                    .bearer_auth(&token)
                    .json(&serde_json::json!({ "percentComplete": percent }))
                    .send()
                    .await
                    .map_err(|e| format!("Failed to patch planner task: {}", e))?;

                if !patch_resp.status().is_success() {
                    let status = patch_resp.status();
                    let body = patch_resp.text().await.unwrap_or_default();
                    return Err(format!("Microsoft Planner PATCH error ({}): {}", status, body));
                }
            } else if req.task_id.starts_with("ms_assignment_") {
                return Ok(());
            } else {
                let raw_id = req.task_id.strip_prefix("ms_todo_").unwrap_or(&req.task_id);
                let target_list_id = req.container_id.ok_or_else(|| {
                    "list_id is required for Microsoft To Do task updates".to_string()
                })?;
                let ms_status = task_status_to_ms_todo_status(&req.new_status);

                let patch_resp = client
                    .patch(format!(
                        "https://graph.microsoft.com/v1.0/me/todo/lists/{}/tasks/{}",
                        target_list_id, raw_id
                    ))
                    .bearer_auth(&token)
                    .json(&serde_json::json!({ "status": ms_status }))
                    .send()
                    .await
                    .map_err(|e| format!("Failed to update To Do task: {}", e))?;

                if !patch_resp.status().is_success() {
                    let status = patch_resp.status();
                    let body = patch_resp.text().await.unwrap_or_default();
                    return Err(format!("Microsoft To Do API error ({}): {}", status, body));
                }
            }

            Ok(())
        })
    }

    fn update_deadline<'a>(
        &'a self,
        _ctx: &'a ProviderContext,
        _req: TaskDeadlineRequest,
    ) -> BoxFuture<'a, Result<DeadlineUpdateResult, String>> {
        Box::pin(async { Err("Microsoft 365 deadline editing is not supported yet".to_string()) })
    }

    fn delete_remote<'a>(
        &'a self,
        _ctx: &'a ProviderContext,
        _req: RemoteDeleteRequest,
    ) -> BoxFuture<'a, Result<(), String>> {
        Box::pin(async { Err("Microsoft 365 remote deletion is not supported".to_string()) })
    }

    fn mutate_subtask<'a>(
        &'a self,
        _ctx: &'a ProviderContext,
        _req: SubtaskMutationRequest,
    ) -> BoxFuture<'a, Result<Option<SubtaskItem>, String>> {
        Box::pin(async { Err("Microsoft To Do checklist items are currently read-only".to_string()) })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_todo_task_maps_checklist_statuses_to_done_and_todo() {
        let task = MSToDoTask {
            id: "td_99".to_string(),
            title: Some("Finish sprint demo".to_string()),
            status: Some("inProgress".to_string()),
            body: Some(MSToDoBody {
                content: Some("Notes".to_string()),
            }),
            due_date_time: None,
            checklist_items: Some(vec![
                MSToDoChecklistItem {
                    id: "c1".to_string(),
                    display_name: Some("Checked item".to_string()),
                    is_checked: Some(true),
                },
                MSToDoChecklistItem {
                    id: "c2".to_string(),
                    display_name: Some("Unchecked item".to_string()),
                    is_checked: Some(false),
                },
            ]),
            linked_resources: None,
        };

        let unified = normalize_todo_task(task, "list_1", Some("Work".to_string()), false).unwrap();
        assert_eq!(unified.id, "ms_todo_td_99");
        assert_eq!(unified.status, "in_progress");
        let subtasks = unified.source_meta.subtasks.unwrap();
        assert_eq!(subtasks[0].status, "done");
        assert_eq!(subtasks[1].status, "todo");
    }
}
