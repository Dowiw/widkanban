pub mod github;
pub mod google_tasks;
pub mod microsoft;

use serde::{Deserialize, Serialize};
use std::future::Future;
use std::pin::Pin;

use crate::{SubtaskItem, UnifiedTask};

pub type BoxFuture<'a, T> = Pin<Box<dyn Future<Output = T> + Send + 'a>>;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TaskTransitionRequest {
    pub provider: String,
    pub task_id: String,
    pub new_status: String,
    pub container_id: Option<String>,
    pub issue_number: Option<u64>,
    pub target_label: Option<String>,
    pub opposing_label: Option<String>,
    #[serde(default)]
    pub post_comment_fallback: bool,
    #[serde(default)]
    pub remote_state: Option<String>,
    #[serde(default)]
    pub state_reason: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TaskDeadlineRequest {
    pub provider: String,
    pub task_id: String,
    pub container_id: Option<String>,
    pub issue_number: Option<u64>,
    #[serde(default)]
    pub is_pr: bool,
    pub due_date: Option<String>,
    pub deadline_type: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DeadlineUpdateResult {
    pub due_date: Option<String>,
    pub updated_description: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RemoteDeleteRequest {
    pub provider: String,
    pub task_id: String,
    pub container_id: Option<String>,
    pub issue_number: Option<u64>,
    pub mode: String, // "close" | "permanent"
    pub reason: Option<String>,
    pub duplicate_of: Option<u64>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SubtaskMutationRequest {
    pub provider: String,
    pub action: String, // "toggle" | "create" | "delete"
    pub container_id: String,
    pub task_id: String,
    pub subtask_id: Option<String>,
    pub new_status: Option<String>,
    pub title: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RepoSummary {
    pub name: String,
    pub is_owner: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct GoogleTaskListSummary {
    pub id: String,
    pub title: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MSToDoListSummary {
    pub id: String,
    pub title: String,
    pub is_owner: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct OrganizationRoles {
    pub teams_role: String,
}

pub struct ProviderContext {
    pub app_handle: tauri::AppHandle,
}

impl ProviderContext {
    pub fn new(app_handle: tauri::AppHandle) -> Self {
        Self { app_handle }
    }

    pub fn http_client(&self) -> Result<reqwest::Client, String> {
        reqwest::Client::builder()
            .use_native_tls()
            .build()
            .map_err(|e| format!("Failed to build HTTP client: {}", e))
    }
}

/// Unified seam for all external task provider adapters.
pub trait TaskProvider: Send + Sync {
    fn provider_id(&self) -> &'static str;

    fn fetch_tasks<'a>(
        &'a self,
        ctx: &'a ProviderContext,
    ) -> BoxFuture<'a, Result<Vec<UnifiedTask>, String>>;

    fn transition_status<'a>(
        &'a self,
        ctx: &'a ProviderContext,
        req: TaskTransitionRequest,
    ) -> BoxFuture<'a, Result<(), String>>;

    fn update_deadline<'a>(
        &'a self,
        ctx: &'a ProviderContext,
        req: TaskDeadlineRequest,
    ) -> BoxFuture<'a, Result<DeadlineUpdateResult, String>>;

    fn delete_remote<'a>(
        &'a self,
        ctx: &'a ProviderContext,
        req: RemoteDeleteRequest,
    ) -> BoxFuture<'a, Result<(), String>>;

    fn mutate_subtask<'a>(
        &'a self,
        ctx: &'a ProviderContext,
        req: SubtaskMutationRequest,
    ) -> BoxFuture<'a, Result<Option<SubtaskItem>, String>>;
}

pub fn resolve_provider(provider: &str) -> Result<Box<dyn TaskProvider>, String> {
    match provider {
        "github" => Ok(Box::new(github::GitHubProvider)),
        "google_tasks" => Ok(Box::new(google_tasks::GoogleTasksProvider)),
        "microsoft_teams" => Ok(Box::new(microsoft::MicrosoftProvider)),
        other => Err(format!("Unsupported task provider '{}'", other)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_provider_routes_all_supported_providers() {
        assert_eq!(
            resolve_provider("github").map(|p| p.provider_id()),
            Ok("github")
        );
        assert_eq!(
            resolve_provider("google_tasks").map(|p| p.provider_id()),
            Ok("google_tasks")
        );
        assert_eq!(
            resolve_provider("microsoft_teams").map(|p| p.provider_id()),
            Ok("microsoft_teams")
        );
        assert!(resolve_provider("unknown").is_err());
    }

    #[test]
    fn test_container_and_roles_serialization() {
        let repo = RepoSummary {
            name: "Dowiw/widkanban".to_string(),
            is_owner: true,
        };
        let repo_json = serde_json::to_string(&repo).unwrap();
        assert!(repo_json.contains(r#""isOwner":true"#));

        let g_list = GoogleTaskListSummary {
            id: "personal".to_string(),
            title: "Personal".to_string(),
        };
        let g_json = serde_json::to_string(&g_list).unwrap();
        assert!(g_json.contains(r#""title":"Personal""#));

        let ms = MSToDoListSummary {
            id: "tasks".to_string(),
            title: "Tasks".to_string(),
            is_owner: true,
        };
        let ms_json = serde_json::to_string(&ms).unwrap();
        assert!(ms_json.contains(r#""isOwner":true"#));

        let roles = OrganizationRoles {
            teams_role: "student".to_string(),
        };
        let roles_json = serde_json::to_string(&roles).unwrap();
        assert!(roles_json.contains(r#""teamsRole":"student""#));
    }
}
