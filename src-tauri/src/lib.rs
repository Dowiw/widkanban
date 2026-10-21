use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
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
    #[serde(default)]
    pub google_refresh_token: Option<String>,
    #[serde(default)]
    pub google_client_id: Option<String>,
    #[serde(default)]
    pub google_client_secret: Option<String>,
    #[serde(default)]
    pub google_token_expiry: Option<u64>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct AuthStatus {
    pub has_github: bool,
    pub has_google: bool,
    #[serde(default)]
    pub github_from_env: bool,
    #[serde(default)]
    pub google_from_env: bool,
    #[serde(default)]
    pub google_has_refresh_token: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProviderHealth {
    pub connected: bool,
    pub rate_limit_remaining: Option<u32>,
    pub rate_limit_limit: Option<u32>,
    pub rate_limit_reset: Option<u64>,
    pub token_expires_at: Option<String>,
    pub is_expiring_soon: Option<bool>,
    pub is_rate_limited: Option<bool>,
    pub last_checked: Option<u64>,
    pub error_message: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ApiHealthState {
    pub github: ProviderHealth,
    pub google: ProviderHealth,
}

fn current_epoch_seconds() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn get_health_store() -> &'static Mutex<ApiHealthState> {
    static STORE: std::sync::OnceLock<Mutex<ApiHealthState>> = std::sync::OnceLock::new();
    STORE.get_or_init(|| Mutex::new(ApiHealthState::default()))
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
    #[serde(default)]
    pub priority: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct UnifiedTask {
    pub id: String,
    pub title: String,
    pub source: String,      // "github" | "google_tasks"
    pub status: String,      // "todo" | "in_progress" | "done"
    #[serde(default)]
    pub priority: Option<String>,
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RepoLabelsResult {
    pub repo: String,
    pub actual_todo_label: String,
    pub actual_in_progress_label: String,
    pub created_labels: Vec<String>,
}

#[derive(Serialize)]
struct CreateLabelPayload<'a> {
    name: &'a str,
    color: &'a str,
    description: &'a str,
}

#[derive(Serialize)]
struct AddLabelsPayload<'a> {
    labels: Vec<&'a str>,
}

#[derive(Serialize)]
struct CreateCommentPayload<'a> {
    body: &'a str,
}

fn url_encode(input: &str) -> String {
    let mut encoded = String::new();
    for b in input.bytes() {
        match b {
            b'a'..=b'z' | b'A'..=b'Z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(b as char);
            }
            _ => {
                encoded.push_str(&format!("%{:02X}", b));
            }
        }
    }
    encoded
}

fn find_matching_label(existing: &[GHLabel], target: &str, synonyms: &[&str]) -> Option<String> {
    let target_trim = target.trim();
    if !target_trim.is_empty() {
        for l in existing {
            if l.name.eq_ignore_ascii_case(target_trim) {
                return Some(l.name.clone());
            }
        }
    }
    for syn in synonyms {
        for l in existing {
            if l.name.eq_ignore_ascii_case(syn) {
                return Some(l.name.clone());
            }
        }
    }
    None
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

fn get_env_credential(keys: &[&str]) -> Option<String> {
    for key in keys {
        if let Ok(val) = std::env::var(key) {
            let trimmed = val.trim().to_string();
            if !trimmed.is_empty() {
                return Some(trimmed);
            }
        }
    }
    None
}

fn read_stored_credentials_file(app_handle: &tauri::AppHandle) -> StoredCredentials {
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

fn read_credentials(app_handle: &tauri::AppHandle) -> StoredCredentials {
    let mut creds = read_stored_credentials_file(app_handle);

    // Overlay developer environment variable overrides
    if let Some(gh) = get_env_credential(&["WIDKANBAN_GITHUB_TOKEN", "GITHUB_TOKEN"]) {
        creds.github_token = Some(gh);
    }
    if let Some(gt) = get_env_credential(&["WIDKANBAN_GOOGLE_TASKS_TOKEN", "GOOGLE_TASKS_TOKEN"]) {
        creds.google_token = Some(gt);
    }
    if let Some(gr) = get_env_credential(&["WIDKANBAN_GOOGLE_REFRESH_TOKEN", "GOOGLE_REFRESH_TOKEN"]) {
        creds.google_refresh_token = Some(gr);
    }
    if let Some(cid) = get_env_credential(&["WIDKANBAN_GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_ID"]) {
        creds.google_client_id = Some(cid);
    }
    if let Some(sec) = get_env_credential(&["WIDKANBAN_GOOGLE_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET"]) {
        creds.google_client_secret = Some(sec);
    }

    creds
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
async fn get_api_health(app_handle: tauri::AppHandle) -> Result<ApiHealthState, String> {
    let creds = read_credentials(&app_handle);
    let mut health = get_health_store().lock().map(|h| h.clone()).unwrap_or_default();

    if let Some(token) = creds.github_token.as_ref().filter(|t| !t.trim().is_empty()) {
        health.github.connected = true;
        let now = current_epoch_seconds();
        let should_check = health.github.last_checked.map_or(true, |t| now.saturating_sub(t) > 60);

        if should_check {
            if let Ok(client) = reqwest::Client::builder().use_native_tls().build() {
                if let Ok(resp) = client
                    .get("https://api.github.com/rate_limit")
                    .header("User-Agent", "WidKanban-Desktop")
                    .header("Accept", "application/vnd.github.v3+json")
                    .bearer_auth(token)
                    .send()
                    .await
                {
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

                    let updated = ProviderHealth {
                        connected: resp.status().is_success(),
                        rate_limit_remaining,
                        rate_limit_limit,
                        rate_limit_reset,
                        token_expires_at,
                        is_expiring_soon: Some(false),
                        is_rate_limited: Some(is_rate_limited),
                        last_checked: Some(now),
                        error_message: if resp.status().is_success() {
                            None
                        } else {
                            Some(format!("HTTP {}", resp.status()))
                        },
                    };

                    if let Ok(mut store) = get_health_store().lock() {
                        store.github = updated.clone();
                    }
                    health.github = updated;
                }
            }
        }
    } else {
        health.github.connected = false;
    }

    if let Some(token) = creds.google_token.as_ref().filter(|t| !t.trim().is_empty()) {
        health.google.connected = true;
        let now = current_epoch_seconds();
        let should_check = health.google.last_checked.map_or(true, |t| now.saturating_sub(t) > 60);

        if should_check {
            if let Ok(client) = reqwest::Client::builder().use_native_tls().build() {
                if let Ok(resp) = client
                    .get(format!("https://oauth2.googleapis.com/tokeninfo?access_token={}", token))
                    .header("User-Agent", "WidKanban-Desktop")
                    .send()
                    .await
                {
                    if resp.status().is_success() {
                        if let Ok(info) = resp.json::<serde_json::Value>().await {
                            let expires_in = info
                                .get("expires_in")
                                .and_then(|v| v.as_str().and_then(|s| s.parse::<u64>().ok()).or_else(|| v.as_u64()));

                            let token_expires_at = expires_in.map(|secs| chrono_epoch_to_iso(now + secs));
                            let is_expiring_soon = expires_in.map(|secs| secs < 300).unwrap_or(false);

                            let updated = ProviderHealth {
                                connected: true,
                                rate_limit_remaining: None,
                                rate_limit_limit: None,
                                rate_limit_reset: None,
                                token_expires_at,
                                is_expiring_soon: Some(is_expiring_soon),
                                is_rate_limited: Some(false),
                                last_checked: Some(now),
                                error_message: None,
                            };

                            if let Ok(mut store) = get_health_store().lock() {
                                store.google = updated.clone();
                            }
                            health.google = updated;
                        }
                    } else {
                        let is_invalid = resp.status().as_u16() == 400;
                        let updated = ProviderHealth {
                            connected: false,
                            rate_limit_remaining: None,
                            rate_limit_limit: None,
                            rate_limit_reset: None,
                            token_expires_at: Some("Expired".to_string()),
                            is_expiring_soon: Some(true),
                            is_rate_limited: Some(false),
                            last_checked: Some(now),
                            error_message: if is_invalid {
                                Some("Google OAuth access token has expired (1 hour lifetime)".to_string())
                            } else {
                                Some(format!("HTTP {}", resp.status()))
                            },
                        };

                        if let Ok(mut store) = get_health_store().lock() {
                            store.google = updated.clone();
                        }
                        health.google = updated;
                    }
                }
            }
        }
    } else {
        health.google.connected = false;
    }

    Ok(health)
}

#[tauri::command]
fn send_desktop_notification(title: String, body: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let escaped_title = title.replace('\'', "''").replace('"', "`\"");
        let escaped_body = body.replace('\'', "''").replace('"', "`\"");
        let script = format!(
            "[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null; \
             $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02); \
             $textNodes = $template.GetElementsByTagName('text'); \
             $textNodes.Item(0).AppendChild($template.CreateTextNode('{}')) > $null; \
             $textNodes.Item(1).AppendChild($template.CreateTextNode('{}')) > $null; \
             $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('WidKanban'); \
             $notification = [Windows.UI.Notifications.ToastNotification]::new($template); \
             $notifier.Show($notification);",
            escaped_title,
            escaped_body
        );
        let _ = std::process::Command::new("powershell")
            .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &script])
            .spawn();
    }
    #[cfg(target_os = "linux")]
    {
        let _ = std::process::Command::new("notify-send")
            .args([&title, &body])
            .spawn();
    }
    Ok(())
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
    let env_github = get_env_credential(&["WIDKANBAN_GITHUB_TOKEN", "GITHUB_TOKEN"]);
    let env_google = get_env_credential(&["WIDKANBAN_GOOGLE_TASKS_TOKEN", "GOOGLE_TASKS_TOKEN"]);
    let env_google_refresh = get_env_credential(&["WIDKANBAN_GOOGLE_REFRESH_TOKEN", "GOOGLE_REFRESH_TOKEN"]);
    let has_google_token = creds.google_token.as_ref().map_or(false, |t| !t.trim().is_empty());
    let has_refresh_token = creds.google_refresh_token.as_ref().map_or(false, |t| !t.trim().is_empty());

    Ok(AuthStatus {
        has_github: creds.github_token.as_ref().map_or(false, |t| !t.trim().is_empty()),
        has_google: has_google_token || has_refresh_token,
        github_from_env: env_github.is_some(),
        google_from_env: env_google.is_some() || env_google_refresh.is_some(),
        google_has_refresh_token: has_refresh_token,
    })
}

#[tauri::command]
fn save_credentials(
    app_handle: tauri::AppHandle,
    github_token: Option<String>,
    google_token: Option<String>,
    google_refresh_token: Option<String>,
    google_client_id: Option<String>,
    google_client_secret: Option<String>,
) -> Result<AuthStatus, String> {
    let mut creds = read_stored_credentials_file(&app_handle);
    if let Some(gh) = github_token.as_ref() {
        let trimmed = gh.trim().to_string();
        if trimmed.is_empty() {
            creds.github_token = None;
        } else {
            creds.github_token = Some(trimmed);
        }
    }
    if let Some(gt) = google_token.as_ref() {
        let trimmed = gt.trim().to_string();
        if trimmed.is_empty() {
            creds.google_token = None;
        } else {
            creds.google_token = Some(trimmed);
        }
    }
    if let Some(gr) = google_refresh_token.as_ref() {
        let trimmed = gr.trim().to_string();
        if trimmed.is_empty() {
            creds.google_refresh_token = None;
        } else {
            creds.google_refresh_token = Some(trimmed);
        }
    }
    if let Some(cid) = google_client_id.as_ref() {
        let trimmed = cid.trim().to_string();
        if trimmed.is_empty() {
            creds.google_client_id = None;
        } else {
            creds.google_client_id = Some(trimmed);
        }
    }
    if let Some(cs) = google_client_secret.as_ref() {
        let trimmed = cs.trim().to_string();
        if trimmed.is_empty() {
            creds.google_client_secret = None;
        } else {
            creds.google_client_secret = Some(trimmed);
        }
    }
    write_credentials(&app_handle, &creds)?;

    let full_creds = read_credentials(&app_handle);
    if let Ok(mut health) = get_health_store().lock() {
        if github_token.is_some() {
            health.github.connected = full_creds.github_token.is_some();
            health.github.error_message = None;
        }
        if google_token.is_some() || google_refresh_token.is_some() {
            health.google.connected = full_creds.google_token.is_some() || full_creds.google_refresh_token.is_some();
            health.google.error_message = None;
        }
    }

    get_auth_status(app_handle)
}

#[tauri::command]
fn clear_credentials(
    app_handle: tauri::AppHandle,
    provider: Option<String>,
) -> Result<AuthStatus, String> {
    let mut creds = read_stored_credentials_file(&app_handle);
    match provider.as_deref() {
        Some("github") => creds.github_token = None,
        Some("google") => {
            creds.google_token = None;
            creds.google_refresh_token = None;
            creds.google_token_expiry = None;
        }
        _ => {
            creds.github_token = None;
            creds.google_token = None;
            creds.google_refresh_token = None;
            creds.google_token_expiry = None;
        }
    }
    write_credentials(&app_handle, &creds)?;

    let full_creds = read_credentials(&app_handle);
    if let Ok(mut health) = get_health_store().lock() {
        if provider.as_deref() == Some("github") || provider.is_none() {
            health.github = ProviderHealth {
                connected: full_creds.github_token.is_some(),
                ..Default::default()
            };
        }
        if provider.as_deref() == Some("google") || provider.is_none() {
            health.google = ProviderHealth {
                connected: full_creds.google_token.is_some() || full_creds.google_refresh_token.is_some(),
                ..Default::default()
            };
        }
    }

    get_auth_status(app_handle)
}

/// Ensures that a valid Google access token is available.
/// If the current access token is expired (or will expire in < 5 minutes)
/// and a refresh token is available, automatically requests a new access token
/// from Google's OAuth 2.0 token endpoint and updates stored credentials.
async fn ensure_valid_google_token(app_handle: &tauri::AppHandle) -> Result<String, String> {
    let creds = read_credentials(app_handle);
    let now = current_epoch_seconds();

    // Check if current token is still valid (has > 300s remaining)
    let is_still_valid = match (creds.google_token.as_ref(), creds.google_token_expiry) {
        (Some(tok), Some(expiry)) => !tok.trim().is_empty() && expiry > now + 300,
        (Some(tok), None) => !tok.trim().is_empty(), // Legacy or manual token without known expiry
        _ => false,
    };

    if is_still_valid {
        if let Some(tok) = creds.google_token {
            return Ok(tok);
        }
    }

    // If we have a refresh token, attempt silent background refresh
    if let Some(refresh_tok) = creds.google_refresh_token.as_ref().filter(|t| !t.trim().is_empty()) {
        let client_id = creds.google_client_id.as_deref().unwrap_or("");
        let client_secret = creds.google_client_secret.as_deref().unwrap_or("");

        if !client_id.is_empty() {
            let client = reqwest::Client::builder()
                .use_native_tls()
                .build()
                .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

            let mut params = vec![
                ("client_id", client_id),
                ("refresh_token", refresh_tok.as_str()),
                ("grant_type", "refresh_token"),
            ];
            if !client_secret.is_empty() {
                params.push(("client_secret", client_secret));
            }

            let resp = client
                .post("https://oauth2.googleapis.com/token")
                .form(&params)
                .header("User-Agent", "WidKanban-Desktop")
                .send()
                .await
                .map_err(|e| format!("Failed to send token refresh request: {}", e))?;

            if resp.status().is_success() {
                if let Ok(data) = resp.json::<serde_json::Value>().await {
                    if let Some(new_access_token) = data.get("access_token").and_then(|v| v.as_str()) {
                        let expires_in = data
                            .get("expires_in")
                            .and_then(|v| v.as_u64())
                            .or_else(|| data.get("expires_in").and_then(|v| v.as_str()).and_then(|s| s.parse::<u64>().ok()))
                            .unwrap_or(3600);

                        let mut stored = read_stored_credentials_file(app_handle);
                        stored.google_token = Some(new_access_token.to_string());
                        stored.google_token_expiry = Some(now + expires_in);
                        let _ = write_credentials(app_handle, &stored);

                        // Update in-memory health
                        if let Ok(mut health) = get_health_store().lock() {
                            health.google = ProviderHealth {
                                connected: true,
                                rate_limit_remaining: None,
                                rate_limit_limit: None,
                                rate_limit_reset: None,
                                token_expires_at: Some(chrono_epoch_to_iso(now + expires_in)),
                                is_expiring_soon: Some(false),
                                is_rate_limited: Some(false),
                                last_checked: Some(now),
                                error_message: None,
                            };
                        }

                        return Ok(new_access_token.to_string());
                    }
                }
            } else {
                let err_body = resp.text().await.unwrap_or_default();
                if let Ok(mut health) = get_health_store().lock() {
                    health.google.connected = false;
                    health.google.token_expires_at = Some("Expired".to_string());
                    health.google.error_message = Some("Google token expired. Please re-authenticate.".to_string());
                }
                return Err(format!("Google token refresh failed: {}", err_body));
            }
        }
    }

    // Fall back to existing token if present
    if let Some(tok) = creds.google_token {
        if !tok.trim().is_empty() {
            return Ok(tok);
        }
    }

    Err("Google Tasks token not configured or expired. Please sign in with Google or enter a valid token in Settings.".to_string())
}

/// Start an in-app "Sign in with Google" OAuth loopback flow.
/// Listens on an ephemeral localhost port, launches the browser, captures the auth code,
/// exchanges it for both access and refresh tokens, and saves them securely in native credentials.
#[tauri::command]
async fn start_google_oauth_flow(
    app_handle: tauri::AppHandle,
    client_id: Option<String>,
    client_secret: Option<String>,
) -> Result<AuthStatus, String> {
    let creds = read_credentials(&app_handle);
    let resolved_client_id = client_id
        .filter(|s| !s.trim().is_empty())
        .or(creds.google_client_id)
        .or_else(|| get_env_credential(&["WIDKANBAN_GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_ID"]))
        .ok_or_else(|| "Google Client ID is required to start the OAuth flow. Please enter your OAuth Client ID in Settings.".to_string())?;

    let resolved_client_secret = client_secret
        .filter(|s| !s.trim().is_empty())
        .or(creds.google_client_secret)
        .or_else(|| get_env_credential(&["WIDKANBAN_GOOGLE_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET"]))
        .unwrap_or_default();

    // 1. Bind TCP listener on ephemeral port (127.0.0.1:0)
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| format!("Failed to start local OAuth loopback server: {}", e))?;

    let port = listener
        .local_addr()
        .map_err(|e| format!("Failed to get local port: {}", e))?
        .port();

    let redirect_uri = format!("http://127.0.0.1:{}", port);
    let state = format!("widkanban_{}", current_epoch_seconds());

    // 2. Build Google authorization URL
    let auth_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?\
        client_id={}&\
        redirect_uri={}&\
        response_type=code&\
        scope={}&\
        access_type=offline&\
        prompt=consent&\
        state={}",
        url_encode(&resolved_client_id),
        url_encode(&redirect_uri),
        url_encode("https://www.googleapis.com/auth/tasks"),
        url_encode(&state),
    );

    // 3. Open browser
    #[cfg(target_os = "windows")]
    {
        let escaped_url = auth_url.replace('\'', "''");
        let script = format!("Start-Process '{}'", escaped_url);
        let _ = std::process::Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", &script])
            .spawn();
    }
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open").arg(&auth_url).spawn();
    }
    #[cfg(target_os = "linux")]
    {
        let _ = std::process::Command::new("xdg-open").arg(&auth_url).spawn();
    }

    // 4. Wait for incoming redirect with 120-second timeout
    let timeout_duration = std::time::Duration::from_secs(120);
    let code = match tokio::time::timeout(timeout_duration, async {
        loop {
            let (mut socket, _) = listener.accept().await.map_err(|e| e.to_string())?;
            let mut buf = [0u8; 4096];
            use tokio::io::{AsyncReadExt, AsyncWriteExt};
            let n = socket.read(&mut buf).await.map_err(|e| e.to_string())?;
            let req_str = String::from_utf8_lossy(&buf[..n]);

            if let Some(first_line) = req_str.lines().next() {
                let parts: Vec<&str> = first_line.split_whitespace().collect();
                if parts.len() >= 2 && parts[0] == "GET" {
                    let path = parts[1];
                    let query = path.split('?').nth(1).unwrap_or("");
                    let mut code_val: Option<String> = None;
                    let mut error_val: Option<String> = None;

                    for param in query.split('&') {
                        let mut kv = param.split('=');
                        if let (Some(k), Some(v)) = (kv.next(), kv.next()) {
                            if k == "code" {
                                code_val = Some(v.to_string());
                            } else if k == "error" {
                                error_val = Some(v.to_string());
                            }
                        }
                    }

                    let (html_body, status_line) = if code_val.is_some() {
                        (
                            "<!DOCTYPE html><html><head><meta charset='utf-8'><title>WidKanban Auth</title></head>\
                            <body style='background:#0f172a;color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;text-align:center;padding-top:80px;margin:0;'>\
                            <div style='max-width:420px;margin:auto;background:#1e293b;padding:36px;border-radius:16px;border:1px solid #334155;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);'>\
                              <div style='width:52px;height:52px;background:rgba(16,185,129,0.2);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;'>\
                                <span style='font-size:28px;color:#10b981;'>&#10003;</span>\
                              </div>\
                              <h2 style='margin:0 0 10px;font-size:22px;color:#38bdf8;'>WidKanban</h2>\
                              <p style='color:#10b981;font-size:16px;font-weight:600;margin:0 0 8px;'>Authentication Successful!</p>\
                              <p style='color:#94a3b8;font-size:13px;line-height:1.5;margin:0 0 24px;'>Your Google account is now connected with offline auto-refresh enabled. You can safely close this browser window and return to WidKanban.</p>\
                              <button onclick='window.close()' style='background:#3b82f6;color:white;font-weight:600;font-size:13px;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;'>Close Tab</button>\
                            </div>\
                            <script>setTimeout(() => window.close(), 1800);</script>\
                            </body></html>",
                            "HTTP/1.1 200 OK",
                        )
                    } else {
                        (
                            "<!DOCTYPE html><html><body style='background:#0f172a;color:#f8fafc;font-family:sans-serif;text-align:center;padding-top:80px;'>\
                            <div style='max-width:400px;margin:auto;background:#1e293b;padding:32px;border-radius:12px;'>\
                              <h2 style='color:#ef4444;'>Authentication Cancelled or Failed</h2>\
                              <p style='color:#94a3b8;'>Please return to WidKanban and try again.</p>\
                            </div></body></html>",
                            "HTTP/1.1 400 Bad Request",
                        )
                    };

                    let response = format!(
                        "{}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                        status_line,
                        html_body.len(),
                        html_body
                    );
                    let _ = socket.write_all(response.as_bytes()).await;
                    let _ = socket.flush().await;

                    if let Some(err) = error_val {
                        return Err(format!("Google OAuth authorization error: {}", err));
                    }
                    if let Some(c) = code_val {
                        return Ok(c);
                    }
                }
            }
        }
    }).await {
        Ok(res) => res?,
        Err(_) => return Err("Google OAuth flow timed out (2 minutes elapsed). Please try again.".to_string()),
    };

    // 5. Exchange code for access & refresh tokens
    let client = reqwest::Client::builder()
        .use_native_tls()
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    let mut token_params = vec![
        ("client_id", resolved_client_id.as_str()),
        ("code", code.as_str()),
        ("grant_type", "authorization_code"),
        ("redirect_uri", redirect_uri.as_str()),
    ];
    if !resolved_client_secret.is_empty() {
        token_params.push(("client_secret", resolved_client_secret.as_str()));
    }

    let token_resp = client
        .post("https://oauth2.googleapis.com/token")
        .form(&token_params)
        .header("User-Agent", "WidKanban-Desktop")
        .send()
        .await
        .map_err(|e| format!("Failed to exchange authorization code: {}", e))?;

    if !token_resp.status().is_success() {
        let err_body = token_resp.text().await.unwrap_or_default();
        return Err(format!("Failed to retrieve Google tokens: {}", err_body));
    }

    let token_data: serde_json::Value = token_resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse token response: {}", e))?;

    let access_token = token_data
        .get("access_token")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Google token response did not contain an access_token".to_string())?
        .to_string();

    let refresh_token = token_data
        .get("refresh_token")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let expires_in = token_data
        .get("expires_in")
        .and_then(|v| v.as_u64())
        .or_else(|| token_data.get("expires_in").and_then(|v| v.as_str()).and_then(|s| s.parse::<u64>().ok()))
        .unwrap_or(3600);

    let now = current_epoch_seconds();

    // 6. Save in native OS credentials
    let mut stored = read_stored_credentials_file(&app_handle);
    stored.google_token = Some(access_token);
    if refresh_token.is_some() {
        stored.google_refresh_token = refresh_token;
    }
    stored.google_client_id = Some(resolved_client_id);
    if !resolved_client_secret.is_empty() {
        stored.google_client_secret = Some(resolved_client_secret);
    }
    stored.google_token_expiry = Some(now + expires_in);
    write_credentials(&app_handle, &stored)?;

    // 7. Update health state
    if let Ok(mut health) = get_health_store().lock() {
        health.google = ProviderHealth {
            connected: true,
            rate_limit_remaining: None,
            rate_limit_limit: None,
            rate_limit_reset: None,
            token_expires_at: Some(chrono_epoch_to_iso(now + expires_in)),
            is_expiring_soon: Some(false),
            is_rate_limited: Some(false),
            last_checked: Some(now),
            error_message: None,
        };
    }

    get_auth_status(app_handle)
}

/// Fetch all Google Tasks across all task lists for the authenticated user,
/// resolving subtask hierarchy and deep links.
#[tauri::command]
async fn fetch_google_tasks(app_handle: tauri::AppHandle) -> Result<Vec<UnifiedTask>, String> {
    let token = match ensure_valid_google_token(&app_handle).await {
        Ok(t) => t,
        Err(e) => {
            if let Ok(mut health) = get_health_store().lock() {
                health.google.connected = false;
                health.google.error_message = Some(e.clone());
            }
            return Err(e);
        }
    };

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
        .map_err(|e| {
            if let Ok(mut health) = get_health_store().lock() {
                health.google.connected = false;
                health.google.error_message = Some(format!("Network error: {}", e));
            }
            format!("Failed to fetch task lists: {}", e)
        })?;

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
                Some("Google OAuth access token has expired (1 hour lifetime). Please generate a new access token.".to_string())
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
            priority: None,
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
                priority: None,
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
        .ok_or_else(|| {
            if let Ok(mut health) = get_health_store().lock() {
                health.github.connected = false;
                health.github.error_message = Some("GitHub token not configured".to_string());
            }
            "GitHub token not configured".to_string()
        })?;

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

    if let Ok(mut health) = get_health_store().lock() {
        health.github = ProviderHealth {
            connected: resp.status().is_success(),
            rate_limit_remaining,
            rate_limit_limit,
            rate_limit_reset,
            token_expires_at,
            is_expiring_soon: Some(false),
            is_rate_limited: Some(is_rate_limited),
            last_checked: Some(now),
            error_message: if resp.status().is_success() {
                None
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
            priority: None,
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
                priority: None,
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
    let token = ensure_valid_google_token(&app_handle).await?;

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

/// Discover or create To-Do and In-Progress labels on a GitHub repository.
#[tauri::command]
async fn setup_github_repo_labels(
    app_handle: tauri::AppHandle,
    repo: String,
    todo_label: String,
    in_progress_label: String,
) -> Result<RepoLabelsResult, String> {
    let creds = read_credentials(&app_handle);
    let token = creds
        .github_token
        .filter(|t| !t.trim().is_empty())
        .ok_or_else(|| "GitHub token not configured".to_string())?;

    let client = reqwest::Client::builder()
        .use_native_tls()
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    // 1. Fetch existing labels for repository
    let labels_url = format!("https://api.github.com/repos/{}/labels?per_page=100", repo);
    let resp = client
        .get(&labels_url)
        .header("User-Agent", "WidKanban-Desktop")
        .header("Accept", "application/vnd.github.v3+json")
        .bearer_auth(&token)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch labels for {}: {}", repo, e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error fetching labels for {} ({}): {}", repo, status, body));
    }

    let existing_labels: Vec<GHLabel> = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse labels response for {}: {}", repo, e))?;

    let todo_synonyms = &["to-do", "todo", "to do"];
    let in_progress_synonyms = &["in-progress", "in progress", "in_progress", "doing", "wip"];

    let mut created_labels: Vec<String> = Vec::new();

    // 2. Resolve To-Do label
    let todo_trim = todo_label.trim();
    let mut actual_todo_label = String::new();
    if !todo_trim.is_empty() {
        if let Some(matched) = find_matching_label(&existing_labels, todo_trim, todo_synonyms) {
            actual_todo_label = matched;
        } else {
            let payload = CreateLabelPayload {
                name: todo_trim,
                color: "0075ca",
                description: "Tasks ready to be worked on (managed by WidKanban)",
            };
            let create_resp = client
                .post(format!("https://api.github.com/repos/{}/labels", repo))
                .header("User-Agent", "WidKanban-Desktop")
                .header("Accept", "application/vnd.github.v3+json")
                .bearer_auth(&token)
                .json(&payload)
                .send()
                .await;

            match create_resp {
                Ok(res) if res.status().is_success() => {
                    created_labels.push(todo_trim.to_string());
                    actual_todo_label = todo_trim.to_string();
                }
                Ok(res) if res.status() == reqwest::StatusCode::UNPROCESSABLE_ENTITY => {
                    // Already exists (concurrent creation or subtle case discrepancy)
                    actual_todo_label = todo_trim.to_string();
                }
                Ok(res) => {
                    let status = res.status();
                    let body = res.text().await.unwrap_or_default();
                    return Err(format!("Failed to create label '{}' on {}: {} - {}", todo_trim, repo, status, body));
                }
                Err(e) => return Err(format!("Network error creating label '{}': {}", todo_trim, e)),
            }
        }
    }

    // 3. Resolve In-Progress label
    let in_progress_trim = in_progress_label.trim();
    let mut actual_in_progress_label = String::new();
    if !in_progress_trim.is_empty() {
        if let Some(matched) = find_matching_label(&existing_labels, in_progress_trim, in_progress_synonyms) {
            actual_in_progress_label = matched;
        } else {
            let payload = CreateLabelPayload {
                name: in_progress_trim,
                color: "d93f0b",
                description: "Work currently in progress (managed by WidKanban)",
            };
            let create_resp = client
                .post(format!("https://api.github.com/repos/{}/labels", repo))
                .header("User-Agent", "WidKanban-Desktop")
                .header("Accept", "application/vnd.github.v3+json")
                .bearer_auth(&token)
                .json(&payload)
                .send()
                .await;

            match create_resp {
                Ok(res) if res.status().is_success() => {
                    created_labels.push(in_progress_trim.to_string());
                    actual_in_progress_label = in_progress_trim.to_string();
                }
                Ok(res) if res.status() == reqwest::StatusCode::UNPROCESSABLE_ENTITY => {
                    actual_in_progress_label = in_progress_trim.to_string();
                }
                Ok(res) => {
                    let status = res.status();
                    let body = res.text().await.unwrap_or_default();
                    return Err(format!("Failed to create label '{}' on {}: {} - {}", in_progress_trim, repo, status, body));
                }
                Err(e) => return Err(format!("Network error creating label '{}': {}", in_progress_trim, e)),
            }
        }
    }

    Ok(RepoLabelsResult {
        repo,
        actual_todo_label,
        actual_in_progress_label,
        created_labels,
    })
}

/// Update labels on a GitHub issue or pull request when moved between To-Do and In-Progress.
#[tauri::command]
async fn update_github_issue_labels(
    app_handle: tauri::AppHandle,
    repo: String,
    issue_number: u64,
    target_label: Option<String>,
    opposing_label: Option<String>,
    post_comment_fallback: bool,
) -> Result<(), String> {
    let creds = read_credentials(&app_handle);
    let token = creds
        .github_token
        .filter(|t| !t.trim().is_empty())
        .ok_or_else(|| "GitHub token not configured".to_string())?;

    let client = reqwest::Client::builder()
        .use_native_tls()
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    // 1. Remove opposing label if specified
    if let Some(ref opp) = opposing_label {
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

    // 2. Add target label if specified
    let target_trim = target_label.as_deref().unwrap_or("").trim();
    if !target_trim.is_empty() {
        let add_url = format!("https://api.github.com/repos/{}/issues/{}/labels", repo, issue_number);
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
            if post_comment_fallback {
                // Attempt comment fallback
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

/// Close a GitHub issue as "not_planned", with optional reason and duplicate reference comments.
#[tauri::command]
async fn close_github_issue(
    app_handle: tauri::AppHandle,
    repo: String,
    issue_number: u64,
    reason: Option<String>,
    duplicate_of: Option<u64>,
) -> Result<(), String> {
    let creds = read_credentials(&app_handle);
    let token = creds
        .github_token
        .filter(|t| !t.trim().is_empty())
        .ok_or_else(|| "GitHub token not configured".to_string())?;

    let client = reqwest::Client::builder()
        .use_native_tls()
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    // 1. If duplicate or reason specified, post comment first
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
            .bearer_auth(&token)
            .json(&comment_payload)
            .send()
            .await;
    }

    // 2. Close issue as not_planned
    let patch_url = format!("https://api.github.com/repos/{}/issues/{}", repo, issue_number);
    let patch_payload = CloseIssuePayload {
        state: "closed",
        state_reason: "not_planned",
    };

    let resp = client
        .patch(&patch_url)
        .header("User-Agent", "WidKanban-Desktop")
        .header("Accept", "application/vnd.github.v3+json")
        .bearer_auth(&token)
        .json(&patch_payload)
        .send()
        .await
        .map_err(|e| format!("Network error closing issue: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Failed to close issue {}#{} ({}): {}", repo, issue_number, status, body));
    }

    Ok(())
}

/// Permanently delete an issue on GitHub via GraphQL (requires Repository Admin/Owner permissions).
#[tauri::command]
async fn delete_github_issue_permanently(
    app_handle: tauri::AppHandle,
    repo: String,
    issue_number: u64,
) -> Result<(), String> {
    let creds = read_credentials(&app_handle);
    let token = creds
        .github_token
        .filter(|t| !t.trim().is_empty())
        .ok_or_else(|| "GitHub token not configured".to_string())?;

    let parts: Vec<&str> = repo.split('/').collect();
    if parts.len() != 2 {
        return Err(format!("Invalid repository format '{}', expected 'owner/repo'", repo));
    }
    let owner = parts[0];
    let name = parts[1];

    let client = reqwest::Client::builder()
        .use_native_tls()
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    // Step 1: Query issue Node ID
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
        .bearer_auth(&token)
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

    // Step 2: Call deleteIssue mutation
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
        .bearer_auth(&token)
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

fn chrono_epoch_to_iso(secs: u64) -> String {
    let (y, mo, d, h, mi, s) = unix_to_ymd_hms(secs);
    format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z", y, mo, d, h, mi, s)
}

/// Returns the current UTC time as an ISO 8601 string, without pulling in
/// the `chrono` crate — uses std::time instead.
fn chrono_now_iso() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    chrono_epoch_to_iso(secs)
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

#[tauri::command]
fn set_window_resizable(app: tauri::AppHandle, resizable: bool) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.set_resizable(resizable).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn set_window_size(app: tauri::AppHandle, width: f64, height: f64) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window
            .set_size(tauri::Size::Logical(tauri::LogicalSize { width, height }))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn reset_window_geometry(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window
            .set_size(tauri::Size::Logical(tauri::LogicalSize {
                width: 380.0,
                height: 680.0,
            }))
            .map_err(|e| e.to_string())?;
        window.center().map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ─── Tauri Application Entry ──────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Load developer environment variables from .env / .env.local
    let _ = dotenvy::dotenv();
    let _ = dotenvy::from_filename(".env.local");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_api_health,
            send_desktop_notification,
            toggle_always_on_top,
            minimize_window,
            close_app,
            set_window_resizable,
            set_window_size,
            reset_window_geometry,
            get_auth_status,
            save_credentials,
            clear_credentials,
            start_google_oauth_flow,
            fetch_google_tasks,
            fetch_github_tasks,
            update_google_task,
            setup_github_repo_labels,
            update_github_issue_labels,
            close_github_issue,
            delete_github_issue_permanently,
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
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_icon(icon.clone());
                }
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
            google_refresh_token: Some("1//refresh_token_test".to_string()),
            google_client_id: Some("12345.apps.googleusercontent.com".to_string()),
            google_client_secret: Some("GOCSPX-secret".to_string()),
            google_token_expiry: Some(1792615000),
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
            google_refresh_token: Some("1//valid_refresh".to_string()),
            google_client_id: None,
            google_client_secret: None,
            google_token_expiry: None,
        };
        let status = AuthStatus {
            has_github: creds.github_token.as_ref().map_or(false, |t| !t.trim().is_empty()),
            has_google: creds.google_refresh_token.as_ref().map_or(false, |t| !t.trim().is_empty()),
            github_from_env: false,
            google_from_env: false,
            google_has_refresh_token: true,
        };
        assert!(status.has_github);
        assert!(status.has_google);
        assert!(status.google_has_refresh_token);
        assert!(!status.github_from_env);
        assert!(!status.google_from_env);
    }

    #[test]
    fn test_auth_status_serialization_with_env_flags() {
        let status = AuthStatus {
            has_github: true,
            has_google: false,
            github_from_env: true,
            google_from_env: false,
            google_has_refresh_token: false,
        };
        let json = serde_json::to_string(&status).expect("Serialization failed");
        assert!(json.contains("github_from_env"));
        assert!(json.contains("google_has_refresh_token"));
        let deserialized: AuthStatus = serde_json::from_str(&json).expect("Deserialization failed");
        assert_eq!(status, deserialized);
    }

    #[test]
    fn test_get_env_credential_helper() {
        std::env::set_var("TEST_WIDKANBAN_KEY_A", "  test_token_123  ");
        assert_eq!(
            get_env_credential(&["NON_EXISTENT_KEY", "TEST_WIDKANBAN_KEY_A"]),
            Some("test_token_123".to_string())
        );
        assert_eq!(get_env_credential(&["NON_EXISTENT_KEY"]), None);
        std::env::remove_var("TEST_WIDKANBAN_KEY_A");
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

    #[test]
    fn test_url_encode() {
        assert_eq!(url_encode("in-progress"), "in-progress");
        assert_eq!(url_encode("To Do"), "To%20Do");
        assert_eq!(url_encode("status:wip"), "status%3Awip");
    }

    #[test]
    fn test_find_matching_label() {
        let existing = vec![
            GHLabel {
                name: "TODO".to_string(),
                color: "000".to_string(),
                description: None,
            },
            GHLabel {
                name: "In Progress".to_string(),
                color: "111".to_string(),
                description: None,
            },
        ];

        let todo_synonyms = &["to-do", "todo", "to do"];
        let in_progress_synonyms = &["in-progress", "in progress", "wip", "doing"];

        // Should match existing "TODO" even though target is "to-do"
        assert_eq!(
            find_matching_label(&existing, "to-do", todo_synonyms),
            Some("TODO".to_string())
        );

        // Should match existing "In Progress" with exact casing from repo
        assert_eq!(
            find_matching_label(&existing, "in-progress", in_progress_synonyms),
            Some("In Progress".to_string())
        );

        // Should return None for unmatched
        assert_eq!(
            find_matching_label(&existing, "blocked", &["blocked", "waiting"]),
            None
        );
    }

    #[test]
    fn test_repo_labels_result_serialization() {
        let res = RepoLabelsResult {
            repo: "owner/repo".to_string(),
            actual_todo_label: "TODO".to_string(),
            actual_in_progress_label: "In Progress".to_string(),
            created_labels: vec!["TODO".to_string()],
        };
        let serialized = serde_json::to_string(&res).expect("serialization failed");
        assert!(serialized.contains("actualTodoLabel"));
        assert!(serialized.contains("actualInProgressLabel"));
        assert!(serialized.contains("createdLabels"));
        let deserialized: RepoLabelsResult = serde_json::from_str(&serialized).expect("deserialization failed");
        assert_eq!(res, deserialized);
    }

    #[test]
    fn test_close_issue_payload_serialization() {
        let payload = CloseIssuePayload {
            state: "closed",
            state_reason: "not_planned",
        };
        let serialized = serde_json::to_string(&payload).expect("serialization failed");
        assert!(serialized.contains(r#""state":"closed""#));
        assert!(serialized.contains(r#""state_reason":"not_planned""#));
    }

    #[test]
    fn test_graphql_request_serialization() {
        let payload = GraphQLRequest {
            query: "query { viewer { login } }",
            variables: serde_json::json!({ "foo": "bar" }),
        };
        let serialized = serde_json::to_string(&payload).expect("serialization failed");
        assert!(serialized.contains("query"));
        assert!(serialized.contains("variables"));
        assert!(serialized.contains("foo"));
    }

    #[test]
    fn test_api_health_state_serialization() {
        let health = ApiHealthState {
            github: ProviderHealth {
                connected: true,
                rate_limit_remaining: Some(4950),
                rate_limit_limit: Some(5000),
                rate_limit_reset: Some(1792529000),
                token_expires_at: Some("2026-11-20 00:00:00 UTC".to_string()),
                is_expiring_soon: Some(false),
                is_rate_limited: Some(false),
                last_checked: Some(1792520000),
                error_message: None,
            },
            google: ProviderHealth {
                connected: false,
                rate_limit_remaining: None,
                rate_limit_limit: None,
                rate_limit_reset: None,
                token_expires_at: None,
                is_expiring_soon: Some(false),
                is_rate_limited: Some(false),
                last_checked: None,
                error_message: Some("Google Tasks token not configured".to_string()),
            },
        };
        let serialized = serde_json::to_string(&health).expect("serialization failed");
        assert!(serialized.contains("rateLimitRemaining"));
        assert!(serialized.contains("4950"));
        assert!(serialized.contains("tokenExpiresAt"));
        assert!(serialized.contains("errorMessage"));
        let deserialized: ApiHealthState = serde_json::from_str(&serialized).expect("deserialization failed");
        assert_eq!(health, deserialized);
    }
}



