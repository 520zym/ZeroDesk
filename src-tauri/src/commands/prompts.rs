use sqlx::SqlitePool;
use tauri::State;

use crate::db::DEFAULT_WORKSPACE_ID;
use crate::models::{PromptVersion, WorkflowTemplate};

#[tauri::command]
pub async fn list_prompt_versions(
    pool: State<'_, SqlitePool>,
    agent_id: String,
) -> Result<Vec<PromptVersion>, String> {
    sqlx::query_as::<_, PromptVersion>(
        "SELECT * FROM prompt_versions WHERE agent_id = ?1 ORDER BY version DESC",
    )
    .bind(&agent_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_prompt_version(
    pool: State<'_, SqlitePool>,
    agent_id: String,
    content: String,
    note: Option<String>,
) -> Result<PromptVersion, String> {
    let max_ver: (i64,) = sqlx::query_as(
        "SELECT COALESCE(MAX(version), 0) FROM prompt_versions WHERE agent_id = ?1",
    )
    .bind(&agent_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let id = uuid::Uuid::new_v4().to_string();
    let version = max_ver.0 + 1;

    sqlx::query(
        "INSERT INTO prompt_versions (id, agent_id, version, content, note)
         VALUES (?1, ?2, ?3, ?4, ?5)",
    )
    .bind(&id)
    .bind(&agent_id)
    .bind(version)
    .bind(&content)
    .bind(&note)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, PromptVersion>("SELECT * FROM prompt_versions WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_workflow_templates(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<WorkflowTemplate>, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    sqlx::query_as::<_, WorkflowTemplate>(
        "SELECT * FROM workflow_templates WHERE workspace_id = ?1 ORDER BY name ASC",
    )
    .bind(workspace_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_workflow_template(
    pool: State<'_, SqlitePool>,
    name: String,
    description: Option<String>,
    category: Option<String>,
    icon_name: Option<String>,
    icon_bg: Option<String>,
    parameters_json: Option<String>,
    steps_json: Option<String>,
) -> Result<WorkflowTemplate, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO workflow_templates (id, workspace_id, name, description, category, icon_name, icon_bg, parameters_json, steps_json)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
    )
    .bind(&id)
    .bind(workspace_id)
    .bind(&name)
    .bind(&description)
    .bind(&category)
    .bind(&icon_name)
    .bind(&icon_bg)
    .bind(&parameters_json.unwrap_or_else(|| "[]".into()))
    .bind(&steps_json.unwrap_or_else(|| "[]".into()))
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, WorkflowTemplate>("SELECT * FROM workflow_templates WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}
