use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};

// ─── Credential Structures ──────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Default, Clone, Debug, PartialEq)]
pub struct StoredCredentials {
    pub github_token: Option<String>,
    pub google_token: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct AuthStatus {
    pub has_github: bool,
    pub has_google: bool,
}

// ─── Provider Specific Detailed Models ──────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq)]
pub struct GitHubLabel {
    pub name: String,
    pub color: String,
    pub description: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq)]
pub struct TaskUser {
    pub login: String,
    #[serde(rename = "avatarUrl")]
    pub avatar_url: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq)]
pub struct TaskMilestone {
    pub title: String,
    #[serde(rename = "dueOn")]
    pub due_on: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq)]
pub struct TaskLink {
    pub description: Option<String>,
    pub link: String,
    #[serde(rename = "linkType")]
    pub link_type: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq)]
pub struct SubtaskItem {
    pub id: String,
    pub title: String,
    pub status: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq)]
pub struct PRBranchInfo {
    #[serde(rename = "headRef")]
    pub head_ref: String,
    #[serde(rename = "baseRef")]
    pub base_ref: String,
    #[serde(rename = "isFork")]
    pub is_fork: Option<bool>,
    #[serde(rename = "headRepo")]
    pub head_repo: Option<String>,
    #[serde(rename = "isDraft")]
    pub is_draft: Option<bool>,
    pub additions: Option<u64>,
    pub deletions: Option<u64>,
    #[serde(rename = "changedFiles")]
    pub changed_files: Option<u64>,
}

// ─── UnifiedTask (mirrored for Rust serialization) ──────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq)]
pub struct SourceMeta {
    pub repo: Option<String>,
    #[serde(rename = "issueNumber")]
    pub issue_number: Option<u64>,
    pub labels: Option<Vec<GitHubLabel>>,
    #[serde(rename = "isPullRequest")]
    pub is_pull_request: Option<bool>,
    #[serde(rename = "commentsCount")]
    pub comments_count: Option<u64>,
    pub milestone: Option<TaskMilestone>,
    pub author: Option<TaskUser>,
    pub assignees: Option<Vec<TaskUser>>,
    #[serde(rename = "branchInfo")]
    pub branch_info: Option<PRBranchInfo>,
    #[serde(rename = "listId")]
    pub list_id: Option<String>,
    #[serde(rename = "listTitle")]
    pub list_title: Option<String>,
    pub notes: Option<String>,
    #[serde(rename = "dueDate")]
    pub due_date: Option<String>,
    #[serde(rename = "parentId")]
    pub parent_id: Option<String>,
    #[serde(rename = "hasSubtasks")]
    pub has_subtasks: Option<bool>,
    #[serde(rename = "subtaskCount")]
    pub subtask_count: Option<usize>,
    pub subtasks: Option<Vec<SubtaskItem>>,
    pub links: Option<Vec<TaskLink>>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct UnifiedTask {
    pub id: String,
    pub title: String,
    pub source: String,      // "github" | "google_tasks"
    pub status: String,      // "todo" | "in_progress" | "done"
    pub url: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    pub description: Option<String>,
    #[serde(rename = "sourceMeta")]
    pub source_meta: SourceMeta,
}

// ─── Google Tasks API Types ──────────────────────────────────────────────────

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
    status: Option<String>,       // "needsAction" | "completed"
    notes: Option<String>,
    due: Option<String>,
    updated: Option<String>,
    parent: Option<String>,
    links: Option<Vec<GTaskLink>>,
    #[serde(rename = "selfLink")]
    self_link: Option<String>,
}

#[derive(Deserialize, Debug)]
struct GTasksResponse {
    items: Option<Vec<GTask>>,
}

#[derive(Serialize)]
struct GTaskPatchPayload {
    status: String,
}

// ─── GitHub API Types ────────────────────────────────────────────────────────

#[derive(Deserialize, Debug)]
struct GHUser {
    login: String,
    avatar_url: Option<String>,
}

#[derive(Deserialize, Debug)]
struct GHLabel {
    name: String,
    color: String,
    description: Option<String>,
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
    state: String, // "open" | "closed"
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

// ─── Credential File Helpers ─────────────────────────────────────────────────

fn get_credentials_path(app_handle: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let mut dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {}", e))?;

    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;

    dir.push("credentials.json");
    Ok(dir)
}

fn read_credentials(app_handle: &tauri::AppHandle) -> StoredCredentials {
    if let Ok(path) = get_credentials_path(app_handle) {
        if path.exists() {
            if let Ok(contents) = std::fs::read_to_string(&path) {
                if let Ok(creds) = serde_json::from_str::<StoredCredentials>(&contents) {
                    return creds;
                }
            }
        }
    }
    StoredCredentials::default()
}

fn write_credentials(app_handle: &tauri::AppHandle, creds: &StoredCredentials) -> Result<(), String> {
    let path = get_credentials_path(app_handle)?;
    let serialized = serde_json::to_string_pretty(creds)
        .map_err(|e| format!("Failed to serialize credentials: {}", e))?;

    std::fs::write(&path, serialized)
        .map_err(|e| format!("Failed to write credentials file: {}", e))?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let permissions = std::fs::Permissions::from_mode(0o600);
        let _ = std::fs::set_permissions(&path, permissions);
    }

    Ok(())
}

// ─── Status & Helper Mappings ────────────────────────────────────────────────

fn google_status_to_task_status(gs: Option<&str>) -> String {
    match gs {
        Some("completed") => "done".to_string(),
        _ => "todo".to_string(),
    }
}

fn task_status_to_google_status(ts: &str) -> String {
    match ts {
        "done" => "completed".to_string(),
        _ => "needsAction".to_string(),
    }
}

fn parse_github_repo_from_url(url: &str) -> Option<String> {
    let parts: Vec<&str> = url.trim_end_matches('/').split('/').collect();
    if parts.len() >= 5 {
        let owner = parts[3];
        let repo = parts[4];
        if !owner.is_empty() && !repo.is_empty() {
            return Some(format!("{}/{}", owner, repo));
        }
    }
    None
}

fn github_issue_status(state: &str, labels: Option<&[GHLabel]>) -> String {
    if state == "closed" {
        return "done".to_string();
    }
    if let Some(labels) = labels {
        for label in labels {
            let lower = label.name.to_lowercase();
            if lower == "in-progress"
                || lower == "in progress"
                || lower == "in_progress"
                || lower == "wip"
                || lower == "doing"
            {
                return "in_progress".to_string();
            }
        }
    }
    "todo".to_string()
}

// ─── Tauri IPC Commands ───────────────────────────────────────────────────────

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to WidKanban desktop widget.", name)
}

#[tauri::command]
fn toggle_always_on_top(window: tauri::Window) -> Result<bool, String> {
    let is_on_top = window.is_always_on_top().unwrap_or(false);
    window.set_always_on_top(!is_on_top).map_err(|e| e.to_string())?;
    Ok(!is_on_top)
}

#[tauri::command]
fn minimize_window(window: tauri::Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
fn close_app(app_handle: tauri::AppHandle) {
    app_handle.exit(0);
}

#[tauri::command]
fn get_auth_status(app_handle: tauri::AppHandle) -> Result<AuthStatus, String> {
    let creds = read_credentials(&app_handle);
    Ok(AuthStatus {
        has_github: creds.github_token.as_ref().map_or(false, |t| !t.trim().is_empty()),
        has_google: creds.google_token.as_ref().map_or(false, |t| !t.trim().is_empty()),
    })
}

#[tauri::command]
fn save_credentials(
    app_handle: tauri::AppHandle,
    github_token: Option<String>,
    google_token: Option<String>,
) -> Result<AuthStatus, String> {
    let mut creds = read_credentials(&app_handle);
    if let Some(gh) = github_token {
        let trimmed = gh.trim().to_string();
        if trimmed.is_empty() {
            creds.github_token = None;
        } else {
            creds.github_token = Some(trimmed);
        }
    }
    if let Some(gt) = google_token {
        let trimmed = gt.trim().to_string();
        if trimmed.is_empty() {
            creds.google_token = None;
        } else {
            creds.google_token = Some(trimmed);
        }
    }
    write_credentials(&app_handle, &creds)?;

    Ok(AuthStatus {
        has_github: creds.github_token.as_ref().map_or(false, |t| !t.trim().is_empty()),
        has_google: creds.google_token.as_ref().map_or(false, |t| !t.trim().is_empty()),
    })
}

#[tauri::command]
fn clear_credentials(
    app_handle: tauri::AppHandle,
    provider: Option<String>,
) -> Result<AuthStatus, String> {
    let mut creds = read_credentials(&app_handle);
    match provider.as_deref() {
        Some("github") => creds.github_token = None,
        Some("google") => creds.google_token = None,
        _ => {
            creds.github_token = None;
            creds.google_token = None;
        }
    }
    write_credentials(&app_handle, &creds)?;

    Ok(AuthStatus {
        has_github: creds.github_token.as_ref().map_or(false, |t| !t.trim().is_empty()),
        has_google: creds.google_token.as_ref().map_or(false, |t| !t.trim().is_empty()),
    })
}

/// Fetch all Google Tasks across all task lists for the authenticated user,
/// resolving subtask hierarchy and deep links.
#[tauri::command]
async fn fetch_google_tasks(app_handle: tauri::AppHandle) -> Result<Vec<UnifiedTask>, String> {
    let creds = read_credentials(&app_handle);
    let token = creds
        .google_token
        .filter(|t| !t.trim().is_empty())
        .ok_or_else(|| "Google Tasks token not configured".to_string())?;

    let client = reqwest::Client::builder()
        .use_native_tls()
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    // 1. Fetch all task lists
    let lists_resp = client
        .get("https://tasks.googleapis.com/tasks/v1/users/@me/lists")
        .bearer_auth(&token)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch task lists: {}", e))?;

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

    struct RawTaskEntry {
        task: GTask,
        list_id: String,
        list_title: String,
    }

    let mut raw_entries: Vec<RawTaskEntry> = Vec::new();

    // 2. Fetch tasks from each list
    for list in &lists {
        let tasks_resp = client
            .get(format!(
                "https://tasks.googleapis.com/tasks/v1/lists/{}/tasks",
                list.id
            ))
            .query(&[
                ("showCompleted", "true"),
                ("showHidden", "false"),
                ("maxResults", "100"),
            ])
            .bearer_auth(&token)
            .send()
            .await
            .map_err(|e| format!("Failed to fetch tasks for list '{}': {}", list.title, e))?;

        if !tasks_resp.status().is_success() {
            continue;
        }

        let tasks_body: GTasksResponse = match tasks_resp.json().await {
            Ok(b) => b,
            Err(_) => continue,
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
    }

    // 3. Map parent task -> subtask items
    let mut subtasks_map: HashMap<String, Vec<SubtaskItem>> = HashMap::new();
    for entry in &raw_entries {
        if let Some(ref parent_id) = entry.task.parent {
            let status = google_status_to_task_status(entry.task.status.as_deref());
            let title = entry.task.title.clone().unwrap_or_default();
            subtasks_map
                .entry(parent_id.clone())
                .or_default()
                .push(SubtaskItem {
                    id: format!("gt_{}", entry.task.id),
                    title,
                    status,
                });
        }
    }

    let mut unified_tasks: Vec<UnifiedTask> = Vec::new();

    // 4. Construct UnifiedTask records
    for entry in raw_entries {
        let task = entry.task;
        let title = task.title.unwrap_or_default();
        let status = google_status_to_task_status(task.status.as_deref());
        let updated_at = task.updated.unwrap_or_else(|| chrono_now_iso());
        let url = task
            .self_link
            .unwrap_or_else(|| "https://tasks.google.com".to_string());

        let raw_id = task.id;
        let parent_id = task.parent.as_ref().map(|p| format!("gt_{}", p));

        let subtasks = subtasks_map.get(&raw_id).cloned();
        let has_subtasks = subtasks.as_ref().map(|s| !s.is_empty());
        let subtask_count = subtasks.as_ref().map(|s| s.len());

        let links: Option<Vec<TaskLink>> = task.links.map(|gls| {
            gls.into_iter()
                .filter_map(|l| {
                    let link = l.link?;
                    let link_type = if link.starts_with("mailto:") || link.contains("mail.google.com") {
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

        unified_tasks.push(UnifiedTask {
            id: format!("gt_{}", raw_id),
            title,
            source: "google_tasks".to_string(),
            status,
            url,
            updated_at,
            description: task.notes.clone(),
            source_meta: SourceMeta {
                repo: None,
                issue_number: None,
                labels: None,
                is_pull_request: None,
                comments_count: None,
                milestone: None,
                author: None,
                assignees: None,
                branch_info: None,
                list_id: Some(entry.list_id),
                list_title: Some(entry.list_title),
                notes: task.notes,
                due_date: task.due,
                parent_id,
                has_subtasks,
                subtask_count,
                subtasks,
                links,
            },
        });
    }

    Ok(unified_tasks)
}

/// Fetch assigned GitHub issues and pull requests with rich metadata.
#[tauri::command]
async fn fetch_github_tasks(app_handle: tauri::AppHandle) -> Result<Vec<UnifiedTask>, String> {
    let creds = read_credentials(&app_handle);
    let token = creds
        .github_token
        .filter(|t| !t.trim().is_empty())
        .ok_or_else(|| "GitHub token not configured".to_string())?;

    let client = reqwest::Client::builder()
        .use_native_tls()
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    let resp = client
        .get("https://api.github.com/user/issues?filter=all&state=open&per_page=100")
        .header("User-Agent", "WidKanban-Desktop")
        .header("Accept", "application/vnd.github.v3+json")
        .bearer_auth(&token)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch GitHub issues: {}", e))?;

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

        // If this issue is a pull request with an API URL, fetch branch and diff comparison info
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

        unified_tasks.push(UnifiedTask {
            id: format!("gh_{}", issue.id),
            title: issue.title,
            source: "github".to_string(),
            status,
            url: issue.html_url,
            updated_at: issue.updated_at.unwrap_or_else(|| chrono_now_iso()),
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
                list_id: None,
                list_title: None,
                notes: None,
                due_date: None,
                parent_id: None,
                has_subtasks: None,
                subtask_count: None,
                subtasks: None,
                links: None,
            },
        });
    }

    Ok(unified_tasks)
}

/// Update a single Google Task's completion status.
#[tauri::command]
async fn update_google_task(
    app_handle: tauri::AppHandle,
    task_id: String,
    list_id: String,
    new_status: String,
) -> Result<(), String> {
    let creds = read_credentials(&app_handle);
    let token = creds
        .google_token
        .filter(|t| !t.trim().is_empty())
        .ok_or_else(|| "Google Tasks token not configured".to_string())?;

    let google_status = task_status_to_google_status(&new_status);
    let payload = GTaskPatchPayload { status: google_status };

    let client = reqwest::Client::builder()
        .use_native_tls()
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    let resp = client
        .patch(format!(
            "https://tasks.googleapis.com/tasks/v1/lists/{}/tasks/{}",
            list_id, task_id
        ))
        .bearer_auth(&token)
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

/// Returns the current UTC time as an ISO 8601 string, without pulling in
/// the `chrono` crate — uses std::time instead.
fn chrono_now_iso() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    // Basic ISO-8601 formatter (seconds precision, UTC)
    let (y, mo, d, h, mi, s) = unix_to_ymd_hms(secs);
    format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z", y, mo, d, h, mi, s)
}

fn unix_to_ymd_hms(secs: u64) -> (u32, u32, u32, u32, u32, u32) {
    let s = secs % 60;
    let mins = secs / 60;
    let mi = mins % 60;
    let hours = mins / 60;
    let h = hours % 24;
    let days = hours / 24;

    // Gregorian calendar conversion
    let mut year = 1970u32;
    let mut remaining = days as u32;
    loop {
        let days_in_year = if is_leap(year) { 366 } else { 365 };
        if remaining < days_in_year {
            break;
        }
        remaining -= days_in_year;
        year += 1;
    }
    let months = [31, if is_leap(year) { 29 } else { 28 }, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let mut month = 1u32;
    for &m in &months {
        if remaining < m {
            break;
        }
        remaining -= m;
        month += 1;
    }
    (year, month, remaining + 1, h as u32, mi as u32, s as u32)
}

fn is_leap(y: u32) -> bool {
    (y % 4 == 0 && y % 100 != 0) || y % 400 == 0
}

// ─── Tauri Application Entry ──────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            toggle_always_on_top,
            minimize_window,
            close_app,
            get_auth_status,
            save_credentials,
            clear_credentials,
            fetch_google_tasks,
            fetch_github_tasks,
            update_google_task,
        ])
        .setup(|app| {
            let toggle_i = MenuItem::with_id(app, "toggle", "Show / Hide Widget", true, None::<&str>)?;
            let pin_i = MenuItem::with_id(app, "pin", "Toggle Always on Top", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit WidKanban", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&toggle_i, &pin_i, &quit_i])?;

            let mut builder = TrayIconBuilder::new()
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app_handle = tray.app_handle();
                        if let Some(window) = app_handle.get_webview_window("main") {
                            let is_visible = window.is_visible().unwrap_or(true);
                            if is_visible {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "toggle" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let is_visible = window.is_visible().unwrap_or(true);
                            if is_visible {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                    "pin" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let is_on_top = window.is_always_on_top().unwrap_or(false);
                            let _ = window.set_always_on_top(!is_on_top);
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                });

            if let Some(icon) = app.default_window_icon() {
                builder = builder.icon(icon.clone());
            }

            let _tray = builder.build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// ─── Unit Tests ───────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_greet_command() {
        let response = greet("Developer");
        assert!(response.contains("Hello, Developer!"));
        assert!(response.contains("WidKanban"));
    }

    #[test]
    fn test_stored_credentials_serialization() {
        let creds = StoredCredentials {
            github_token: Some("ghp_test123456789".to_string()),
            google_token: Some("ya29.test123".to_string()),
        };
        let serialized = serde_json::to_string(&creds).expect("Serialization failed");
        let deserialized: StoredCredentials =
            serde_json::from_str(&serialized).expect("Deserialization failed");

        assert_eq!(creds, deserialized);
    }

    #[test]
    fn test_auth_status_evaluation() {
        let creds = StoredCredentials {
            github_token: Some("ghp_test123".to_string()),
            google_token: Some("   ".to_string()),
        };
        let status = AuthStatus {
            has_github: creds.github_token.as_ref().map_or(false, |t| !t.trim().is_empty()),
            has_google: creds.google_token.as_ref().map_or(false, |t| !t.trim().is_empty()),
        };
        assert!(status.has_github);
        assert!(!status.has_google);
    }

    #[test]
    fn test_google_status_mapping_roundtrip() {
        assert_eq!(google_status_to_task_status(Some("completed")), "done");
        assert_eq!(google_status_to_task_status(Some("needsAction")), "todo");
        assert_eq!(google_status_to_task_status(None), "todo");

        assert_eq!(task_status_to_google_status("done"), "completed");
        assert_eq!(task_status_to_google_status("todo"), "needsAction");
        assert_eq!(task_status_to_google_status("in_progress"), "needsAction");
    }

    #[test]
    fn test_parse_github_repo_from_url() {
        assert_eq!(
            parse_github_repo_from_url("https://github.com/facebook/react/issues/123"),
            Some("facebook/react".to_string())
        );
        assert_eq!(
            parse_github_repo_from_url("https://github.com/org/widkanban/pull/45"),
            Some("org/widkanban".to_string())
        );
        assert_eq!(parse_github_repo_from_url("invalid-url"), None);
    }

    #[test]
    fn test_github_issue_status_mapping() {
        assert_eq!(github_issue_status("closed", None), "done");
        assert_eq!(github_issue_status("open", None), "todo");

        let in_progress_labels = vec![GHLabel {
            name: "in-progress".to_string(),
            color: "ededed".to_string(),
            description: None,
        }];
        assert_eq!(github_issue_status("open", Some(&in_progress_labels)), "in_progress");
    }

    #[test]
    fn test_chrono_now_iso_format() {
        let ts = chrono_now_iso();
        assert!(ts.ends_with('Z'), "timestamp must end with Z: {}", ts);
        assert_eq!(ts.len(), 20, "timestamp must be 20 chars: {}", ts);
        assert_eq!(&ts[4..5], "-");
        assert_eq!(&ts[7..8], "-");
        assert_eq!(&ts[10..11], "T");
    }

    #[test]
    fn test_is_leap_year() {
        assert!(is_leap(2000));
        assert!(is_leap(2024));
        assert!(!is_leap(1900));
        assert!(!is_leap(2023));
    }

    #[test]
    fn test_pr_branch_info_serialization() {
        let branch = PRBranchInfo {
            head_ref: "feature/auth".to_string(),
            base_ref: "main".to_string(),
            is_fork: Some(true),
            head_repo: Some("contributor/widkanban".to_string()),
            is_draft: Some(false),
            additions: Some(150),
            deletions: Some(40),
            changed_files: Some(5),
        };
        let serialized = serde_json::to_string(&branch).expect("Failed to serialize PRBranchInfo");
        let deserialized: PRBranchInfo =
            serde_json::from_str(&serialized).expect("Failed to deserialize PRBranchInfo");
        assert_eq!(branch, deserialized);
    }
}
