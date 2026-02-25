use sqlx::SqlitePool;
use tauri::State;

use crate::db::DEFAULT_WORKSPACE_ID;
use crate::models::Skill;

#[tauri::command]
pub async fn list_skills(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<Skill>, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    sqlx::query_as::<_, Skill>(
        "SELECT * FROM skills WHERE workspace_id = ?1 ORDER BY name ASC",
    )
    .bind(workspace_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_skill(
    pool: State<'_, SqlitePool>,
    name: String,
    description: Option<String>,
    icon_name: Option<String>,
    icon_bg: Option<String>,
    scope: Option<String>,
    scope_id: Option<String>,
    permissions_json: Option<String>,
    source: Option<String>,
) -> Result<Skill, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO skills (id, workspace_id, name, description, icon_name, icon_bg, scope, scope_id, permissions_json, source)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
    )
    .bind(&id)
    .bind(workspace_id)
    .bind(&name)
    .bind(&description)
    .bind(&icon_name)
    .bind(&icon_bg)
    .bind(&scope.unwrap_or_else(|| "global".into()))
    .bind(&scope_id)
    .bind(&permissions_json.unwrap_or_else(|| "[]".into()))
    .bind(&source.unwrap_or_else(|| "local".into()))
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Skill>("SELECT * FROM skills WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_skill(
    pool: State<'_, SqlitePool>,
    id: String,
    name: Option<String>,
    description: Option<String>,
    icon_name: Option<String>,
    icon_bg: Option<String>,
    status: Option<String>,
    permissions_json: Option<String>,
) -> Result<Skill, String> {
    let existing = sqlx::query_as::<_, Skill>("SELECT * FROM skills WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query(
        "UPDATE skills SET name = ?1, description = ?2, icon_name = ?3, icon_bg = ?4, status = ?5, permissions_json = ?6, updated_at = datetime('now') WHERE id = ?7",
    )
    .bind(name.unwrap_or(existing.name))
    .bind(description.or(existing.description))
    .bind(icon_name.or(existing.icon_name))
    .bind(icon_bg.or(existing.icon_bg))
    .bind(status.or(existing.status))
    .bind(permissions_json.or(existing.permissions_json))
    .bind(&id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Skill>("SELECT * FROM skills WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}
