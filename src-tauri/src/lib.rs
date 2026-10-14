use serde::{Deserialize, Serialize};
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

// ─── Google Tasks API Types ──────────────────────────────────────────────────

/// Raw task list from `GET /tasks/v1/users/@me/lists`
#[derive(Deserialize, Debug)]
struct GTaskList {
    id: String,
    title: String,
}

#[derive(Deserialize, Debug)]
struct GTaskListsResponse {
    items: Option<Vec<GTaskList>>,
}

/// Raw task item from `GET /tasks/v1/lists/{listId}/tasks`
#[derive(Deserialize, Debug)]
struct GTask {
    id: String,
    title: Option<String>,
    status: Option<String>,       // "needsAction" | "completed"
    notes: Option<String>,
    due: Option<String>,
    updated: Option<String>,
    #[serde(rename = "selfLink")]
    self_link: Option<String>,
}

#[derive(Deserialize, Debug)]
struct GTasksResponse {
    items: Option<Vec<GTask>>,
}

/// Payload for PATCH to update a Google Task's status
#[derive(Serialize)]
struct GTaskPatchPayload {
    status: String,
}

// ─── UnifiedTask (mirrored for Rust serialization) ──────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SourceMeta {
    pub repo: Option<String>,
    pub issue_number: Option<u64>,
    pub labels: Option<Vec<String>>,
    pub list_id: Option<String>,
    pub list_title: Option<String>,
    pub notes: Option<String>,
    pub due_date: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UnifiedTask {
    pub id: String,
    pub title: String,
    pub source: String,      // "github" | "google_tasks"
    pub status: String,      // "todo" | "in_progress" | "done"
    pub url: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    #[serde(rename = "sourceMeta")]
    pub source_meta: SourceMeta,
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

// ─── Google Tasks Status Mapping ─────────────────────────────────────────────

/// Map Google Tasks API status string to WidKanban TaskStatus.
/// Google only has "needsAction" and "completed" — we map:
///   "completed"   → "done"
///   "needsAction" → "todo"  (no direct "in_progress" equivalent in Google Tasks)
fn google_status_to_task_status(gs: Option<&str>) -> String {
    match gs {
        Some("completed") => "done".to_string(),
        _ => "todo".to_string(),
    }
}

/// Map WidKanban TaskStatus back to Google Tasks API status string.
/// "done" → "completed", everything else → "needsAction"
fn task_status_to_google_status(ts: &str) -> String {
    match ts {
        "done" => "completed".to_string(),
        _ => "needsAction".to_string(),
    }
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

/// Fetch all Google Tasks across all task lists for the authenticated user.
///
/// Flow:
///   1. GET /tasks/v1/users/@me/lists  → list IDs
///   2. For each list: GET /tasks/v1/lists/{listId}/tasks?showCompleted=true&showHidden=false
///   3. Normalize each GTask → UnifiedTask and return the flattened vec.
///
/// Returns an error string if the token is missing or the API call fails.
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
    let mut unified_tasks: Vec<UnifiedTask> = Vec::new();

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
            // Skip lists that we can't read rather than aborting everything
            continue;
        }

        let tasks_body: GTasksResponse = match tasks_resp.json().await {
            Ok(b) => b,
            Err(_) => continue,
        };

        for task in tasks_body.items.unwrap_or_default() {
            // Skip deleted / hidden tasks that have no title
            let title = match task.title {
                Some(ref t) if !t.trim().is_empty() => t.clone(),
                _ => continue,
            };

            let status = google_status_to_task_status(task.status.as_deref());
            let updated_at = task
                .updated
                .unwrap_or_else(|| chrono_now_iso());

            // Build a web URL: direct deep-link not available from the API,
            // so we use the selfLink URL (tasks.googleapis.com/…) as a fallback.
            let url = task
                .self_link
                .unwrap_or_else(|| "https://tasks.google.com".to_string());

            unified_tasks.push(UnifiedTask {
                id: format!("gt_{}", task.id),
                title,
                source: "google_tasks".to_string(),
                status,
                url,
                updated_at,
                source_meta: SourceMeta {
                    repo: None,
                    issue_number: None,
                    labels: None,
                    list_id: Some(list.id.clone()),
                    list_title: Some(list.title.clone()),
                    notes: task.notes,
                    due_date: task.due,
                },
            });
        }
    }

    Ok(unified_tasks)
}

/// Update a single Google Task's completion status.
///
/// `task_id`   – the raw Google Tasks API task ID (without the "gt_" prefix)
/// `list_id`   – the task list ID the task belongs to
/// `new_status`– WidKanban TaskStatus: "todo" | "in_progress" | "done"
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
    fn test_chrono_now_iso_format() {
        let ts = chrono_now_iso();
        // Should look like "2024-10-14T19:00:00Z"
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
}
