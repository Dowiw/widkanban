use serde::{Deserialize, Serialize};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};

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
            clear_credentials
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
}
