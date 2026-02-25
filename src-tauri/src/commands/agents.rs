use sqlx::SqlitePool;
use tauri::State;

use crate::db::DEFAULT_WORKSPACE_ID;
use crate::models::Agent;

#[tauri::command]
pub async fn list_agents(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<Agent>, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    sqlx::query_as::<_, Agent>(
        "SELECT * FROM agents WHERE workspace_id = ?1 ORDER BY updated_at DESC",
    )
    .bind(workspace_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_agent(pool: State<'_, SqlitePool>, id: String) -> Result<Agent, String> {
    sqlx::query_as::<_, Agent>("SELECT * FROM agents WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_agent(
    pool: State<'_, SqlitePool>,
    name: String,
    avatar_char: Option<String>,
    avatar_color: Option<String>,
    role_description: Option<String>,
    system_prompt: Option<String>,
    model_id: Option<String>,
    fallback_model_id: Option<String>,
    tools_json: Option<String>,
    skills_json: Option<String>,
    is_template: Option<bool>,
) -> Result<Agent, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO agents (id, workspace_id, name, avatar_char, avatar_color, role_description, system_prompt, model_id, fallback_model_id, tools_json, skills_json, is_template)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
    )
    .bind(&id)
    .bind(workspace_id)
    .bind(&name)
    .bind(&avatar_char)
    .bind(&avatar_color)
    .bind(&role_description)
    .bind(&system_prompt)
    .bind(&model_id)
    .bind(&fallback_model_id)
    .bind(&tools_json.unwrap_or_else(|| "[]".into()))
    .bind(&skills_json.unwrap_or_else(|| "[]".into()))
    .bind(is_template.unwrap_or(false) as i64)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Agent>("SELECT * FROM agents WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_agent(
    pool: State<'_, SqlitePool>,
    id: String,
    name: Option<String>,
    avatar_char: Option<String>,
    avatar_color: Option<String>,
    role_description: Option<String>,
    system_prompt: Option<String>,
    model_id: Option<String>,
    fallback_model_id: Option<String>,
    tools_json: Option<String>,
    skills_json: Option<String>,
) -> Result<Agent, String> {
    let existing = sqlx::query_as::<_, Agent>("SELECT * FROM agents WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query(
        "UPDATE agents SET name = ?1, avatar_char = ?2, avatar_color = ?3, role_description = ?4, system_prompt = ?5, model_id = ?6, fallback_model_id = ?7, tools_json = ?8, skills_json = ?9, updated_at = datetime('now') WHERE id = ?10",
    )
    .bind(name.unwrap_or(existing.name))
    .bind(avatar_char.or(existing.avatar_char))
    .bind(avatar_color.or(existing.avatar_color))
    .bind(role_description.or(existing.role_description))
    .bind(system_prompt.or(existing.system_prompt))
    .bind(model_id.or(existing.model_id))
    .bind(fallback_model_id.or(existing.fallback_model_id))
    .bind(tools_json.or(existing.tools_json))
    .bind(skills_json.or(existing.skills_json))
    .bind(&id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Agent>("SELECT * FROM agents WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_agent(pool: State<'_, SqlitePool>, id: String) -> Result<(), String> {
    sqlx::query("DELETE FROM agents WHERE id = ?1")
        .bind(&id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}
