use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::{
    BoxFuture, DeadlineUpdateResult, ProviderContext, RemoteDeleteRequest, SubtaskMutationRequest,
    TaskDeadlineRequest, TaskProvider, TaskTransitionRequest,
};
use crate::{
    chrono_epoch_to_iso, chrono_now_iso, current_epoch_seconds, ensure_valid_google_token,
    get_health_store, google_status_to_task_status, parse_widkanban_deadline, read_stored_credentials_file,
    task_status_to_google_status, write_credentials, ProviderHealth, SourceMeta, SubtaskItem,
    TaskLink, UnifiedTask,
};

pub struct GoogleTasksProvider;

#[derive(Deserialize, Debug)]
struct GTaskList {
    id: String,
    title: String,
}

#[derive(Deserialize, Debug)]
struct GTaskListsResponse {
    items: Option<Vec<GTaskList>>,
}

#[derive(Deserialize, Debug, Clone)]
#[allow(dead_code)]
struct GTaskLink {
    description: Option<String>,
    link: Option<String>,
    #[serde(rename = "type")]
    link_type: Option<String>,
}

#[derive(Deserialize, Debug, Clone)]
struct GTask {
    id: String,
    title: Option<String>,
    status: Option<String>,
    notes: Option<String>,
    due: Option<String>,
    #[serde(default)]
    deadline: Option<String>,
    updated: Option<String>,
    parent: Option<String>,
    links: Option<Vec<GTaskLink>>,
    #[serde(rename = "selfLink")]
    self_link: Option<String>,
}

#[derive(Deserialize, Debug)]
struct GTasksResponse {
    items: Option<Vec<GTask>>,
    #[serde(rename = "nextPageToken")]
    next_page_token: Option<String>,
}

#[derive(Serialize)]
struct GTaskPatchPayload {
    status: String,
}

#[derive(Serialize)]
struct CreateSubtaskPayload<'a> {
    title: &'a str,
}

struct RawTaskEntry {
    task: GTask,
    list_id: String,
    list_title: String,
}

/// Google Tasks ID encoding/decoding lives exclusively inside this adapter.
fn encode_google_task_id(raw_id: &str) -> String {
    format!("gt_{}", raw_id)
}

fn decode_google_task_id(opaque_id: &str) -> &str {
    opaque_id.strip_prefix("gt_").unwrap_or(opaque_id)
}

fn normalize_google_due_date_for_patch(due_date: Option<&str>) -> Option<String> {
    match due_date {
        Some(d) if !d.trim().is_empty() => {
            let trimmed = d.trim();
            if trimmed.len() >= 10 && trimmed.as_bytes()[4] == b'-' && trimmed.as_bytes()[7] == b'-'
            {
                Some(format!("{}T00:00:00.000Z", &trimmed[..10]))
            } else {
                Some(trimmed.to_string())
            }
        }
        _ => None,
    }
}

fn normalize_google_entries(raw_entries: Vec<RawTaskEntry>) -> Vec<UnifiedTask> {
    let mut subtasks_map: HashMap<String, Vec<SubtaskItem>> = HashMap::new();
    for entry in &raw_entries {
        if let Some(ref parent_id) = entry.task.parent {
            let status = google_status_to_task_status(entry.task.status.as_deref());
            let title = entry.task.title.clone().unwrap_or_default();
            subtasks_map
                .entry(parent_id.clone())
                .or_default()
                .push(SubtaskItem {
                    id: encode_google_task_id(&entry.task.id),
                    title,
                    status,
                });
        }
    }

    let mut unified_tasks: Vec<UnifiedTask> = Vec::new();

    for entry in raw_entries {
        let task = entry.task;
        let title = task.title.unwrap_or_default();
        let status = google_status_to_task_status(task.status.as_deref());
        let updated_at = task.updated.unwrap_or_else(chrono_now_iso);
        let url = task
            .self_link
            .unwrap_or_else(|| "https://tasks.google.com".to_string());

        let raw_id = task.id;
        let parent_id = task.parent.as_deref().map(encode_google_task_id);

        let subtasks = subtasks_map.get(&raw_id).cloned();
        let has_subtasks = subtasks.as_ref().map(|s| !s.is_empty());
        let subtask_count = subtasks.as_ref().map(|s| s.len());

        let links: Option<Vec<TaskLink>> = task.links.map(|gls| {
            gls.into_iter()
                .filter_map(|l| {
                    let link = l.link?;
                    let link_type = if link.starts_with("mailto:") || link.contains("mail.google.com")
                    {
                        Some("email".to_string())
                    } else if link.contains("calendar.google.com") {
                        Some("calendar".to_string())
                    } else {
                        Some("generic".to_string())
                    };
                    Some(TaskLink {
                        description: l.description,
                        link,
                        link_type,
                    })
                })
                .collect()
        });

        let notes_str = task.notes.as_deref().unwrap_or("");
        let (parsed_due, parsed_type) = match task.due.or(task.deadline) {
            Some(native_due) => {
                let (_, t) = parse_widkanban_deadline(notes_str).unwrap_or((String::new(), None));
                (Some(native_due), t)
            }
            None => match parse_widkanban_deadline(notes_str) {
                Some((due, t)) => (Some(due), t),
                None => (None, None),
            },
        };

        unified_tasks.push(UnifiedTask {
            id: encode_google_task_id(&raw_id),
            title,
            source: "google_tasks".to_string(),
            status,
            priority: None,
            url,
            updated_at,
            description: task.notes.clone(),
            source_meta: SourceMeta {
                list_id: Some(entry.list_id),
                list_title: Some(entry.list_title),
                notes: task.notes,
                due_date: parsed_due,
                deadline_type: parsed_type,
                parent_id,
                has_subtasks,
                subtask_count,
                subtasks,
                links,
                ..Default::default()
            },
        });
    }

    unified_tasks
}

async fn patch_google_status(
    client: &reqwest::Client,
    token: &str,
    list_id: &str,
    opaque_task_id: &str,
    new_status: &str,
) -> Result<(), String> {
    let raw_id = decode_google_task_id(opaque_task_id);
    let google_status = task_status_to_google_status(new_status);
    let payload = GTaskPatchPayload {
        status: google_status,
    };

    let resp = client
        .patch(format!(
            "https://tasks.googleapis.com/tasks/v1/lists/{}/tasks/{}",
            list_id, raw_id
        ))
        .bearer_auth(token)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Failed to update task: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Google Tasks API error (update) {}: {}", status, body));
    }

    Ok(())
}

impl TaskProvider for GoogleTasksProvider {
    fn provider_id(&self) -> &'static str {
        "google_tasks"
    }

    fn fetch_tasks<'a>(
        &'a self,
        ctx: &'a ProviderContext,
    ) -> BoxFuture<'a, Result<Vec<UnifiedTask>, String>> {
        Box::pin(async move {
            let app_handle = &ctx.app_handle;
            let mut token = match ensure_valid_google_token(app_handle).await {
                Ok(t) => t,
                Err(e) => {
                    if let Ok(mut health) = get_health_store().lock() {
                        health.google.connected = false;
                        health.google.error_message = Some(e.clone());
                        health.google.last_checked = Some(current_epoch_seconds());
                    }
                    return Err(e);
                }
            };

            let client = ctx.http_client()?;

            let mut lists_resp = client
                .get("https://tasks.googleapis.com/tasks/v1/users/@me/lists")
                .bearer_auth(&token)
                .send()
                .await
                .map_err(|e| {
                    if let Ok(mut health) = get_health_store().lock() {
                        health.google.connected = false;
                        health.google.error_message = Some(format!("Network error: {}", e));
                        health.google.last_checked = Some(current_epoch_seconds());
                    }
                    format!("Failed to fetch task lists: {}", e)
                })?;

            if lists_resp.status().as_u16() == 401 {
                let mut stored = read_stored_credentials_file(app_handle);
                stored.google_token = None;
                stored.google_token_expiry = None;
                let _ = write_credentials(app_handle, &stored);

                match ensure_valid_google_token(app_handle).await {
                    Ok(new_token) => {
                        token = new_token;
                        lists_resp = client
                            .get("https://tasks.googleapis.com/tasks/v1/users/@me/lists")
                            .bearer_auth(&token)
                            .send()
                            .await
                            .map_err(|e| {
                                format!("Failed to fetch task lists after refresh: {}", e)
                            })?;
                    }
                    Err(refresh_err) => {
                        let is_deleted = refresh_err.contains("deleted_client")
                            || refresh_err.contains("invalid_grant")
                            || refresh_err.contains("invalid_client")
                            || refresh_err.contains("credentials deleted or revoked");
                        let err_msg = if is_deleted {
                            "Google OAuth credentials deleted or revoked. Please re-authenticate in Settings.".to_string()
                        } else {
                            format!("Google authentication failed: {}", refresh_err)
                        };
                        if let Ok(mut health) = get_health_store().lock() {
                            health.google.connected = false;
                            health.google.token_expires_at = Some("Expired".to_string());
                            health.google.is_expiring_soon = Some(true);
                            health.google.last_checked = Some(current_epoch_seconds());
                            health.google.error_message = Some(err_msg.clone());
                        }
                        return Err(err_msg);
                    }
                }
            }

            let lists_status = lists_resp.status();
            let now = current_epoch_seconds();
            if let Ok(mut health) = get_health_store().lock() {
                let is_unauthorized = lists_status.as_u16() == 401;
                health.google = ProviderHealth {
                    connected: lists_status.is_success(),
                    rate_limit_remaining: None,
                    rate_limit_limit: None,
                    rate_limit_reset: None,
                    token_expires_at: if is_unauthorized {
                        Some("Expired".to_string())
                    } else {
                        health.google.token_expires_at.clone()
                    },
                    is_expiring_soon: Some(is_unauthorized),
                    is_rate_limited: Some(false),
                    last_checked: Some(now),
                    error_message: if lists_status.is_success() {
                        None
                    } else if is_unauthorized {
                        Some("Google token expired or revoked (401 Unauthorized)".to_string())
                    } else {
                        Some(format!("HTTP {}", lists_status))
                    },
                };
            }

            if !lists_resp.status().is_success() {
                let status = lists_resp.status();
                let body = lists_resp.text().await.unwrap_or_default();
                return Err(format!("Google Tasks API error (lists) {}: {}", status, body));
            }

            let lists_body: GTaskListsResponse = lists_resp
                .json()
                .await
                .map_err(|e| format!("Failed to parse task lists response: {}", e))?;

            let lists = lists_body.items.unwrap_or_default();
            let mut raw_entries: Vec<RawTaskEntry> = Vec::new();

            for list in &lists {
                let mut page_token: Option<String> = None;
                for _page in 0..5 {
                    let mut query_params = vec![
                        ("showCompleted", "true".to_string()),
                        ("showHidden", "false".to_string()),
                        ("maxResults", "100".to_string()),
                    ];
                    if let Some(ref pt) = page_token {
                        query_params.push(("pageToken", pt.clone()));
                    }

                    let tasks_resp = client
                        .get(format!(
                            "https://tasks.googleapis.com/tasks/v1/lists/{}/tasks",
                            list.id
                        ))
                        .query(&query_params)
                        .bearer_auth(&token)
                        .send()
                        .await
                        .map_err(|e| {
                            format!("Failed to fetch tasks for list '{}': {}", list.title, e)
                        })?;

                    if !tasks_resp.status().is_success() {
                        break;
                    }

                    let tasks_body: GTasksResponse = match tasks_resp.json().await {
                        Ok(b) => b,
                        Err(_) => break,
                    };

                    for task in tasks_body.items.unwrap_or_default() {
                        if let Some(ref t) = task.title {
                            if !t.trim().is_empty() {
                                raw_entries.push(RawTaskEntry {
                                    task,
                                    list_id: list.id.clone(),
                                    list_title: list.title.clone(),
                                });
                            }
                        }
                    }

                    match tasks_body.next_page_token {
                        Some(next_pt) if !next_pt.is_empty() => page_token = Some(next_pt),
                        _ => break,
                    }
                }
            }

            let _ = chrono_epoch_to_iso(now);
            Ok(normalize_google_entries(raw_entries))
        })
    }

    fn transition_status<'a>(
        &'a self,
        ctx: &'a ProviderContext,
        req: TaskTransitionRequest,
    ) -> BoxFuture<'a, Result<(), String>> {
        Box::pin(async move {
            let list_id = req
                .container_id
                .filter(|id| !id.trim().is_empty())
                .ok_or_else(|| "Google Tasks listId is required to update task status".to_string())?;
            let token = ensure_valid_google_token(&ctx.app_handle).await?;
            let client = ctx.http_client()?;
            patch_google_status(&client, &token, &list_id, &req.task_id, &req.new_status).await
        })
    }

    fn update_deadline<'a>(
        &'a self,
        ctx: &'a ProviderContext,
        req: TaskDeadlineRequest,
    ) -> BoxFuture<'a, Result<DeadlineUpdateResult, String>> {
        Box::pin(async move {
            let list_id = req
                .container_id
                .filter(|id| !id.trim().is_empty())
                .ok_or_else(|| "Google Tasks listId is required to update due date".to_string())?;
            let token = ensure_valid_google_token(&ctx.app_handle).await?;
            let raw_id = decode_google_task_id(&req.task_id);
            let normalized_due = normalize_google_due_date_for_patch(req.due_date.as_deref());
            let client = ctx.http_client()?;

            let resp = client
                .patch(format!(
                    "https://tasks.googleapis.com/tasks/v1/lists/{}/tasks/{}",
                    list_id, raw_id
                ))
                .bearer_auth(&token)
                .json(&serde_json::json!({ "due": normalized_due }))
                .send()
                .await
                .map_err(|e| format!("Network error updating Google Task due date: {}", e))?;

            if !resp.status().is_success() {
                let status = resp.status();
                let body = resp.text().await.unwrap_or_default();
                return Err(format!(
                    "Google Tasks API error updating due date ({}): {}",
                    status, body
                ));
            }

            Ok(DeadlineUpdateResult {
                due_date: normalized_due,
                updated_description: None,
            })
        })
    }

    fn delete_remote<'a>(
        &'a self,
        _ctx: &'a ProviderContext,
        _req: RemoteDeleteRequest,
    ) -> BoxFuture<'a, Result<(), String>> {
        Box::pin(async { Err("Google Tasks does not support remote task deletion from cards".to_string()) })
    }

    fn mutate_subtask<'a>(
        &'a self,
        ctx: &'a ProviderContext,
        req: SubtaskMutationRequest,
    ) -> BoxFuture<'a, Result<Option<SubtaskItem>, String>> {
        Box::pin(async move {
            let token = ensure_valid_google_token(&ctx.app_handle).await?;
            let client = ctx.http_client()?;

            match req.action.as_str() {
                "toggle" => {
                    let target_id = req.subtask_id.as_deref().unwrap_or(&req.task_id);
                    let new_status = req
                        .new_status
                        .ok_or_else(|| "newStatus is required to toggle a subtask".to_string())?;
                    patch_google_status(&client, &token, &req.container_id, target_id, &new_status)
                        .await?;
                    Ok(None)
                }
                "create" => {
                    let raw_parent = decode_google_task_id(&req.task_id);
                    let trimmed_title = req.title.unwrap_or_default();
                    let trimmed_title = trimmed_title.trim();
                    if trimmed_title.is_empty() {
                        return Err("Subtask title cannot be empty".to_string());
                    }

                    let payload = CreateSubtaskPayload {
                        title: trimmed_title,
                    };
                    let resp = client
                        .post(format!(
                            "https://tasks.googleapis.com/tasks/v1/lists/{}/tasks?parent={}",
                            req.container_id, raw_parent
                        ))
                        .bearer_auth(&token)
                        .json(&payload)
                        .send()
                        .await
                        .map_err(|e| format!("Failed to create subtask: {}", e))?;

                    if !resp.status().is_success() {
                        let status = resp.status();
                        let body = resp.text().await.unwrap_or_default();
                        return Err(format!(
                            "Google Tasks API error (create subtask) {}: {}",
                            status, body
                        ));
                    }

                    let created: GTask = resp
                        .json()
                        .await
                        .map_err(|e| format!("Failed to parse created subtask: {}", e))?;

                    let st_status = google_status_to_task_status(created.status.as_deref());
                    Ok(Some(SubtaskItem {
                        id: encode_google_task_id(&created.id),
                        title: created.title.unwrap_or_else(|| trimmed_title.to_string()),
                        status: st_status,
                    }))
                }
                "delete" => {
                    let target_id = req.subtask_id.as_deref().unwrap_or(&req.task_id);
                    let raw_subtask = decode_google_task_id(target_id);
                    let resp = client
                        .delete(format!(
                            "https://tasks.googleapis.com/tasks/v1/lists/{}/tasks/{}",
                            req.container_id, raw_subtask
                        ))
                        .bearer_auth(&token)
                        .send()
                        .await
                        .map_err(|e| format!("Failed to delete subtask: {}", e))?;

                    if !resp.status().is_success() {
                        let status = resp.status();
                        let body = resp.text().await.unwrap_or_default();
                        return Err(format!(
                            "Google Tasks API error (delete subtask) {}: {}",
                            status, body
                        ));
                    }

                    Ok(None)
                }
                other => Err(format!("Unsupported Google subtask action '{}'", other)),
            }
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_google_id_encode_decode_roundtrip() {
        let encoded = encode_google_task_id("abc123");
        assert_eq!(encoded, "gt_abc123");
        assert_eq!(decode_google_task_id(&encoded), "abc123");
        assert_eq!(decode_google_task_id("raw_only"), "raw_only");
    }

    #[test]
    fn test_normalize_google_due_date_for_patch() {
        assert_eq!(
            normalize_google_due_date_for_patch(Some("2026-11-18T17:30:00Z")),
            Some("2026-11-18T00:00:00.000Z".to_string())
        );
        assert_eq!(
            normalize_google_due_date_for_patch(Some("2026-11-18")),
            Some("2026-11-18T00:00:00.000Z".to_string())
        );
        assert_eq!(normalize_google_due_date_for_patch(None), None);
    }

    #[test]
    fn test_normalize_google_entries_links_subtasks() {
        let entries = vec![
            RawTaskEntry {
                task: GTask {
                    id: "parent_1".to_string(),
                    title: Some("Parent".to_string()),
                    status: Some("needsAction".to_string()),
                    notes: None,
                    due: Some("2026-11-18T00:00:00.000Z".to_string()),
                    deadline: None,
                    updated: Some("2026-11-16T00:00:00Z".to_string()),
                    parent: None,
                    links: None,
                    self_link: None,
                },
                list_id: "list_a".to_string(),
                list_title: "Stuff to do".to_string(),
            },
            RawTaskEntry {
                task: GTask {
                    id: "child_1".to_string(),
                    title: Some("Sub step".to_string()),
                    status: Some("completed".to_string()),
                    notes: None,
                    due: None,
                    deadline: None,
                    updated: None,
                    parent: Some("parent_1".to_string()),
                    links: None,
                    self_link: None,
                },
                list_id: "list_a".to_string(),
                list_title: "Stuff to do".to_string(),
            },
        ];

        let normalized = normalize_google_entries(entries);
        let parent = normalized.iter().find(|t| t.id == "gt_parent_1").unwrap();
        assert_eq!(parent.source_meta.has_subtasks, Some(true));
        assert_eq!(parent.source_meta.subtask_count, Some(1));
        assert_eq!(parent.source_meta.subtasks.as_ref().unwrap()[0].status, "done");
        assert_eq!(
            parent.source_meta.subtasks.as_ref().unwrap()[0].id,
            "gt_child_1"
        );
    }
}
