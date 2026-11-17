use serde::{Deserialize, Serialize};

use super::{
    BoxFuture, DeadlineUpdateResult, ProviderContext, RemoteDeleteRequest, SubtaskMutationRequest,
    TaskDeadlineRequest, TaskProvider, TaskTransitionRequest,
};
use crate::{
    chrono_now_iso, current_epoch_seconds, get_health_store, github_issue_status,
    parse_github_repo_from_url, parse_widkanban_deadline, read_credentials,
    update_body_with_widkanban_deadline, url_encode, GitHubLabel, PRBranchInfo, ProviderHealth,
    SourceMeta, SubtaskItem, TaskMilestone, TaskUser, UnifiedTask,
};

pub struct GitHubProvider;

#[derive(Deserialize, Debug)]
struct GHUser {
    login: String,
    avatar_url: Option<String>,
}

#[derive(Deserialize, Debug)]
pub(crate) struct GHLabel {
    pub(crate) name: String,
    pub(crate) color: String,
    pub(crate) description: Option<String>,
}

#[derive(Deserialize, Debug)]
struct GHMilestone {
    title: String,
    due_on: Option<String>,
}

#[derive(Deserialize, Debug)]
#[allow(dead_code)]
struct GHPullRequestRef {
    url: Option<String>,
    html_url: Option<String>,
}

#[derive(Deserialize, Debug)]
struct GHRepoRef {
    full_name: Option<String>,
}

#[derive(Deserialize, Debug)]
#[allow(dead_code)]
struct GHBranchRef {
    r#ref: String,
    label: Option<String>,
    repo: Option<GHRepoRef>,
}

#[derive(Deserialize, Debug)]
struct GHPullDetail {
    head: Option<GHBranchRef>,
    base: Option<GHBranchRef>,
    draft: Option<bool>,
    additions: Option<u64>,
    deletions: Option<u64>,
    changed_files: Option<u64>,
}

#[derive(Deserialize, Debug)]
struct GHIssue {
    id: u64,
    number: u64,
    title: String,
    state: String,
    body: Option<String>,
    html_url: String,
    comments: Option<u64>,
    updated_at: Option<String>,
    user: Option<GHUser>,
    assignees: Option<Vec<GHUser>>,
    labels: Option<Vec<GHLabel>>,
    milestone: Option<GHMilestone>,
    pull_request: Option<GHPullRequestRef>,
}

#[derive(Serialize)]
struct AddLabelsPayload<'a> {
    labels: Vec<&'a str>,
}

#[derive(Serialize)]
struct CreateCommentPayload<'a> {
    body: &'a str,
}

#[derive(Serialize)]
struct CloseIssuePayload<'a> {
    state: &'a str,
    state_reason: &'a str,
}

#[derive(Serialize)]
struct GraphQLRequest<'a> {
    query: &'a str,
    variables: serde_json::Value,
}

fn resolve_github_token(ctx: &ProviderContext, update_health_on_missing: bool) -> Result<String, String> {
    let creds = read_credentials(&ctx.app_handle);
    creds
        .github_token
        .filter(|t| !t.trim().is_empty())
        .ok_or_else(|| {
            if update_health_on_missing {
                if let Ok(mut health) = get_health_store().lock() {
                    health.github.connected = false;
                    health.github.error_message = Some("GitHub token not configured".to_string());
                }
            }
            "GitHub token not configured".to_string()
        })
}

fn normalize_github_issue(issue: GHIssue, branch_info: Option<PRBranchInfo>) -> UnifiedTask {
    let repo = parse_github_repo_from_url(&issue.html_url);
    let status = github_issue_status(&issue.state, issue.labels.as_deref());
    let is_pull_request = issue.pull_request.is_some();

    let labels = issue.labels.map(|labs| {
        labs.into_iter()
            .map(|l| GitHubLabel {
                name: l.name,
                color: l.color,
                description: l.description,
            })
            .collect()
    });

    let author = issue.user.map(|u| TaskUser {
        login: u.login,
        avatar_url: u.avatar_url.unwrap_or_default(),
    });

    let assignees = issue.assignees.map(|users| {
        users
            .into_iter()
            .map(|u| TaskUser {
                login: u.login,
                avatar_url: u.avatar_url.unwrap_or_default(),
            })
            .collect()
    });

    let milestone = issue.milestone.map(|m| TaskMilestone {
        title: m.title,
        due_on: m.due_on,
    });

    let body_str = issue.body.as_deref().unwrap_or("");
    let (parsed_due, parsed_type) = match parse_widkanban_deadline(body_str) {
        Some((due, t)) => (Some(due), t),
        None => (milestone.as_ref().and_then(|m| m.due_on.clone()), None),
    };

    UnifiedTask {
        id: format!("gh_{}", issue.id),
        title: issue.title,
        source: "github".to_string(),
        status,
        priority: None,
        url: issue.html_url,
        updated_at: issue.updated_at.unwrap_or_else(chrono_now_iso),
        description: issue.body,
        source_meta: SourceMeta {
            repo,
            issue_number: Some(issue.number),
            labels,
            is_pull_request: Some(is_pull_request),
            comments_count: issue.comments,
            milestone,
            author,
            assignees,
            branch_info,
            due_date: parsed_due,
            deadline_type: parsed_type,
            ..Default::default()
        },
    }
}

async fn close_issue_remote(
    client: &reqwest::Client,
    token: &str,
    repo: &str,
    issue_number: u64,
    reason: Option<String>,
    duplicate_of: Option<u64>,
) -> Result<(), String> {
    let mut comment_parts = Vec::new();
    if let Some(dup) = duplicate_of {
        comment_parts.push(format!("Duplicate of #{}", dup));
    }
    if let Some(r) = reason {
        let r_trim = r.trim();
        if !r_trim.is_empty() {
            if duplicate_of.is_some() {
                comment_parts.push(format!("Reason: {}", r_trim));
            } else {
                comment_parts.push(r_trim.to_string());
            }
        }
    }

    if !comment_parts.is_empty() {
        let comment_body = comment_parts.join("\n\n");
        let comment_payload = CreateCommentPayload {
            body: &comment_body,
        };
        let comment_url = format!(
            "https://api.github.com/repos/{}/issues/{}/comments",
            repo, issue_number
        );
        let _ = client
            .post(&comment_url)
            .header("User-Agent", "WidKanban-Desktop")
            .header("Accept", "application/vnd.github.v3+json")
            .bearer_auth(token)
            .json(&comment_payload)
            .send()
            .await;
    }

    let patch_url = format!("https://api.github.com/repos/{}/issues/{}", repo, issue_number);
    let patch_payload = CloseIssuePayload {
        state: "closed",
        state_reason: "not_planned",
    };

    let resp = client
        .patch(&patch_url)
        .header("User-Agent", "WidKanban-Desktop")
        .header("Accept", "application/vnd.github.v3+json")
        .bearer_auth(token)
        .json(&patch_payload)
        .send()
        .await
        .map_err(|e| format!("Network error closing issue: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!(
            "Failed to close issue {}#{} ({}): {}",
            repo, issue_number, status, body
        ));
    }

    Ok(())
}

async fn delete_issue_permanently(
    client: &reqwest::Client,
    token: &str,
    repo: &str,
    issue_number: u64,
) -> Result<(), String> {
    let parts: Vec<&str> = repo.split('/').collect();
    if parts.len() != 2 {
        return Err(format!(
            "Invalid repository format '{}', expected 'owner/repo'",
            repo
        ));
    }
    let owner = parts[0];
    let name = parts[1];

    let query = r#"
        query($owner: String!, $name: String!, $number: Int!) {
            repository(owner: $owner, name: $name) {
                issue(number: $number) {
                    id
                }
            }
        }
    "#;
    let query_payload = GraphQLRequest {
        query,
        variables: serde_json::json!({
            "owner": owner,
            "name": name,
            "number": issue_number,
        }),
    };

    let q_resp = client
        .post("https://api.github.com/graphql")
        .header("User-Agent", "WidKanban-Desktop")
        .bearer_auth(token)
        .json(&query_payload)
        .send()
        .await
        .map_err(|e| format!("Network error querying issue node ID: {}", e))?;

    let q_json: serde_json::Value = q_resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse issue ID response: {}", e))?;

    if let Some(errors) = q_json.get("errors").and_then(|e| e.as_array()) {
        if !errors.is_empty() {
            let msg = errors[0]
                .get("message")
                .and_then(|m| m.as_str())
                .unwrap_or("GraphQL query failed");
            return Err(format!("GitHub error: {}", msg));
        }
    }

    let issue_id = q_json
        .pointer("/data/repository/issue/id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| format!("Issue {}#{} not found", repo, issue_number))?;

    let mutation = r#"
        mutation($issueId: ID!) {
            deleteIssue(input: { issueId: $issueId }) {
                clientMutationId
            }
        }
    "#;
    let mutation_payload = GraphQLRequest {
        query: mutation,
        variables: serde_json::json!({
            "issueId": issue_id,
        }),
    };

    let m_resp = client
        .post("https://api.github.com/graphql")
        .header("User-Agent", "WidKanban-Desktop")
        .bearer_auth(token)
        .json(&mutation_payload)
        .send()
        .await
        .map_err(|e| format!("Network error executing delete mutation: {}", e))?;

    let m_json: serde_json::Value = m_resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse delete mutation response: {}", e))?;

    if let Some(errors) = m_json.get("errors").and_then(|e| e.as_array()) {
        if !errors.is_empty() {
            let msg = errors[0]
                .get("message")
                .and_then(|m| m.as_str())
                .unwrap_or("Permanent deletion failed");
            return Err(format!(
                "Failed to permanently delete issue on GitHub: {}. (Note: Only repository admins/owners can permanently delete issues)",
                msg
            ));
        }
    }

    Ok(())
}

impl TaskProvider for GitHubProvider {
    fn provider_id(&self) -> &'static str {
        "github"
    }

    fn fetch_tasks<'a>(
        &'a self,
        ctx: &'a ProviderContext,
    ) -> BoxFuture<'a, Result<Vec<UnifiedTask>, String>> {
        Box::pin(async move {
            let token = resolve_github_token(ctx, true)?;
            let client = ctx.http_client()?;

            let resp = client
                .get("https://api.github.com/user/issues?filter=all&state=open&per_page=100")
                .header("User-Agent", "WidKanban-Desktop")
                .header("Accept", "application/vnd.github.v3+json")
                .bearer_auth(&token)
                .send()
                .await
                .map_err(|e| {
                    if let Ok(mut health) = get_health_store().lock() {
                        health.github.connected = false;
                        health.github.error_message = Some(format!("Network error: {}", e));
                    }
                    format!("Failed to fetch GitHub issues: {}", e)
                })?;

            let rate_limit_limit = resp
                .headers()
                .get("x-ratelimit-limit")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| s.parse::<u32>().ok());
            let rate_limit_remaining = resp
                .headers()
                .get("x-ratelimit-remaining")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| s.parse::<u32>().ok());
            let rate_limit_reset = resp
                .headers()
                .get("x-ratelimit-reset")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| s.parse::<u64>().ok());
            let token_expires_at = resp
                .headers()
                .get("github-authentication-token-expiration")
                .and_then(|v| v.to_str().ok())
                .map(|s| s.to_string());

            let is_rate_limited = rate_limit_remaining.map(|r| r == 0).unwrap_or(false);
            let now = current_epoch_seconds();
            let is_success = resp.status().is_success();
            let status_code = resp.status().as_u16();

            if let Ok(mut health) = get_health_store().lock() {
                health.github = ProviderHealth {
                    connected: is_success,
                    rate_limit_remaining,
                    rate_limit_limit,
                    rate_limit_reset,
                    token_expires_at,
                    is_expiring_soon: Some(false),
                    is_rate_limited: Some(is_rate_limited),
                    last_checked: Some(now),
                    error_message: if is_success {
                        None
                    } else if status_code == 401 {
                        Some("Token invalid, expired, or revoked (401 Unauthorized)".to_string())
                    } else if status_code == 403 && is_rate_limited {
                        Some("GitHub API rate limit exceeded".to_string())
                    } else {
                        Some(format!("HTTP {}", resp.status()))
                    },
                };
            }

            if !resp.status().is_success() {
                let status = resp.status();
                let body = resp.text().await.unwrap_or_default();
                return Err(format!("GitHub API error {}: {}", status, body));
            }

            let issues: Vec<GHIssue> = resp
                .json()
                .await
                .map_err(|e| format!("Failed to parse GitHub issues response: {}", e))?;

            let mut unified_tasks: Vec<UnifiedTask> = Vec::new();

            for issue in issues {
                let mut branch_info: Option<PRBranchInfo> = None;
                if let Some(ref pr_ref) = issue.pull_request {
                    if let Some(ref pr_url) = pr_ref.url {
                        let pr_resp = client
                            .get(pr_url)
                            .header("User-Agent", "WidKanban-Desktop")
                            .header("Accept", "application/vnd.github.v3+json")
                            .bearer_auth(&token)
                            .send()
                            .await;

                        if let Ok(resp) = pr_resp {
                            if resp.status().is_success() {
                                if let Ok(pr_detail) = resp.json::<GHPullDetail>().await {
                                    let head_ref = pr_detail
                                        .head
                                        .as_ref()
                                        .map(|h| h.r#ref.clone())
                                        .unwrap_or_default();
                                    let base_ref = pr_detail
                                        .base
                                        .as_ref()
                                        .map(|b| b.r#ref.clone())
                                        .unwrap_or_else(|| "main".to_string());

                                    let head_repo = pr_detail
                                        .head
                                        .as_ref()
                                        .and_then(|h| h.repo.as_ref())
                                        .and_then(|r| r.full_name.clone());
                                    let base_repo = pr_detail
                                        .base
                                        .as_ref()
                                        .and_then(|b| b.repo.as_ref())
                                        .and_then(|r| r.full_name.clone());

                                    let is_fork = match (&head_repo, &base_repo) {
                                        (Some(h), Some(b)) => Some(h != b),
                                        _ => None,
                                    };

                                    if !head_ref.is_empty() {
                                        branch_info = Some(PRBranchInfo {
                                            head_ref,
                                            base_ref,
                                            is_fork,
                                            head_repo,
                                            is_draft: pr_detail.draft,
                                            additions: pr_detail.additions,
                                            deletions: pr_detail.deletions,
                                            changed_files: pr_detail.changed_files,
                                        });
                                    }
                                }
                            }
                        }
                    }
                }

                unified_tasks.push(normalize_github_issue(issue, branch_info));
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
            let repo = req
                .container_id
                .filter(|r| !r.trim().is_empty())
                .ok_or_else(|| "GitHub repository is required for label sync".to_string())?;
            let issue_number = req
                .issue_number
                .ok_or_else(|| "GitHub issue number is required for label sync".to_string())?;

            let token = resolve_github_token(ctx, false)?;
            let client = ctx.http_client()?;

            if let Some(ref opp) = req.opposing_label {
                let opp_trim = opp.trim();
                if !opp_trim.is_empty() {
                    let delete_url = format!(
                        "https://api.github.com/repos/{}/issues/{}/labels/{}",
                        repo,
                        issue_number,
                        url_encode(opp_trim)
                    );
                    let _ = client
                        .delete(&delete_url)
                        .header("User-Agent", "WidKanban-Desktop")
                        .header("Accept", "application/vnd.github.v3+json")
                        .bearer_auth(&token)
                        .send()
                        .await;
                }
            }

            let target_trim = req.target_label.as_deref().unwrap_or("").trim();
            if !target_trim.is_empty() {
                let add_url = format!(
                    "https://api.github.com/repos/{}/issues/{}/labels",
                    repo, issue_number
                );
                let payload = AddLabelsPayload {
                    labels: vec![target_trim],
                };
                let add_resp = client
                    .post(&add_url)
                    .header("User-Agent", "WidKanban-Desktop")
                    .header("Accept", "application/vnd.github.v3+json")
                    .bearer_auth(&token)
                    .json(&payload)
                    .send()
                    .await;

                let add_failed = match add_resp {
                    Ok(ref resp) => !resp.status().is_success(),
                    Err(_) => true,
                };

                if add_failed {
                    if req.post_comment_fallback {
                        let comment_url = format!(
                            "https://api.github.com/repos/{}/issues/{}/comments",
                            repo, issue_number
                        );
                        let comment_body = format!(
                            "Task status updated to **{}** via WidKanban widget.",
                            target_trim
                        );
                        let comment_payload = CreateCommentPayload {
                            body: &comment_body,
                        };
                        let comment_resp = client
                            .post(&comment_url)
                            .header("User-Agent", "WidKanban-Desktop")
                            .header("Accept", "application/vnd.github.v3+json")
                            .bearer_auth(&token)
                            .json(&comment_payload)
                            .send()
                            .await;

                        if let Ok(c_resp) = comment_resp {
                            if c_resp.status().is_success() {
                                return Ok(());
                            }
                        }
                    }

                    return Err(format!(
                        "Failed to apply label '{}' to {}#{}",
                        target_trim, repo, issue_number
                    ));
                }
            }

            Ok(())
        })
    }

    fn update_deadline<'a>(
        &'a self,
        ctx: &'a ProviderContext,
        req: TaskDeadlineRequest,
    ) -> BoxFuture<'a, Result<DeadlineUpdateResult, String>> {
        Box::pin(async move {
            let repo = req
                .container_id
                .filter(|r| !r.trim().is_empty())
                .ok_or_else(|| "GitHub repository is required to update deadline".to_string())?;
            let issue_number = req
                .issue_number
                .ok_or_else(|| "GitHub issue number is required to update deadline".to_string())?;

            let token = resolve_github_token(ctx, false)?;
            let client = ctx.http_client()?;

            let issue_url = format!("https://api.github.com/repos/{}/issues/{}", repo, issue_number);
            let get_resp = client
                .get(&issue_url)
                .header("User-Agent", "WidKanban-Desktop")
                .header("Accept", "application/vnd.github.v3+json")
                .bearer_auth(&token)
                .send()
                .await
                .map_err(|e| format!("Network error fetching issue {}: {}", issue_number, e))?;

            if !get_resp.status().is_success() {
                let status = get_resp.status();
                let body = get_resp.text().await.unwrap_or_default();
                return Err(format!(
                    "GitHub API error fetching issue {}: {} - {}",
                    issue_number, status, body
                ));
            }

            let issue_data: serde_json::Value = get_resp
                .json()
                .await
                .map_err(|e| format!("Failed to parse issue response {}: {}", issue_number, e))?;

            let existing_body = issue_data.get("body").and_then(|b| b.as_str());
            let new_body = update_body_with_widkanban_deadline(
                existing_body,
                req.due_date.as_deref(),
                req.deadline_type.as_deref(),
            );

            let patch_resp = client
                .patch(&issue_url)
                .header("User-Agent", "WidKanban-Desktop")
                .header("Accept", "application/vnd.github.v3+json")
                .bearer_auth(&token)
                .json(&serde_json::json!({ "body": new_body }))
                .send()
                .await
                .map_err(|e| format!("Network error updating issue deadline {}: {}", issue_number, e))?;

            if !patch_resp.status().is_success() {
                let status = patch_resp.status();
                let body = patch_resp.text().await.unwrap_or_default();
                return Err(format!(
                    "GitHub API error updating issue deadline {}: {} - {}",
                    issue_number, status, body
                ));
            }

            Ok(DeadlineUpdateResult {
                due_date: req.due_date,
                updated_description: Some(new_body),
            })
        })
    }

    fn delete_remote<'a>(
        &'a self,
        ctx: &'a ProviderContext,
        req: RemoteDeleteRequest,
    ) -> BoxFuture<'a, Result<(), String>> {
        Box::pin(async move {
            let repo = req
                .container_id
                .filter(|r| !r.trim().is_empty())
                .ok_or_else(|| "GitHub repository is required for remote deletion".to_string())?;
            let issue_number = req
                .issue_number
                .ok_or_else(|| "GitHub issue number is required for remote deletion".to_string())?;

            let token = resolve_github_token(ctx, false)?;
            let client = ctx.http_client()?;

            match req.mode.as_str() {
                "close" => close_issue_remote(
                    &client,
                    &token,
                    &repo,
                    issue_number,
                    req.reason,
                    req.duplicate_of,
                )
                .await,
                "permanent" => delete_issue_permanently(&client, &token, &repo, issue_number).await,
                other => Err(format!("Unsupported GitHub delete mode '{}'", other)),
            }
        })
    }

    fn mutate_subtask<'a>(
        &'a self,
        _ctx: &'a ProviderContext,
        _req: SubtaskMutationRequest,
    ) -> BoxFuture<'a, Result<Option<SubtaskItem>, String>> {
        Box::pin(async { Err("GitHub issues do not support subtask mutations".to_string()) })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_github_issue_extracts_deadline_and_prefix() {
        let issue = GHIssue {
            id: 404,
            number: 18,
            title: "Ship provider seam".to_string(),
            state: "open".to_string(),
            body: Some("Details\n> ⏱️ **Widkanban Deadline**: 2026-11-20T23:59:59Z <!-- Widkanban: {\"due\":\"2026-11-20T23:59:59Z\",\"type\":\"review\"} -->".to_string()),
            html_url: "https://github.com/Dowiw/widkanban/pull/18".to_string(),
            comments: Some(2),
            updated_at: Some("2026-11-16T10:00:00Z".to_string()),
            user: None,
            assignees: None,
            labels: Some(vec![GHLabel {
                name: "in-progress".to_string(),
                color: "d93f0b".to_string(),
                description: None,
            }]),
            milestone: None,
            pull_request: Some(GHPullRequestRef {
                url: None,
                html_url: None,
            }),
        };

        let unified = normalize_github_issue(issue, None);
        assert_eq!(unified.id, "gh_404");
        assert_eq!(unified.source, "github");
        assert_eq!(unified.status, "in_progress");
        assert_eq!(unified.source_meta.repo.as_deref(), Some("Dowiw/widkanban"));
        assert_eq!(unified.source_meta.is_pull_request, Some(true));
        assert_eq!(
            unified.source_meta.due_date.as_deref(),
            Some("2026-11-20T23:59:59Z")
        );
        assert_eq!(unified.source_meta.deadline_type.as_deref(), Some("review"));
    }
}
