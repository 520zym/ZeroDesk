use sqlx::SqlitePool;
use tauri::State;

use crate::models::Workspace;

#[tauri::command]
pub async fn list_workspaces(pool: State<'_, SqlitePool>) -> Result<Vec<Workspace>, String> {
    sqlx::query_as::<_, Workspace>("SELECT * FROM workspaces ORDER BY updated_at DESC")
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_workspace(
    pool: State<'_, SqlitePool>,
    name: String,
    path: String,
) -> Result<Workspace, String> {
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO workspaces (id, name, path) VALUES (?1, ?2, ?3)",
    )
    .bind(&id)
    .bind(&name)
    .bind(&path)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Workspace>("SELECT * FROM workspaces WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_workspace(
    pool: State<'_, SqlitePool>,
    id: String,
) -> Result<Workspace, String> {
    sqlx::query_as::<_, Workspace>("SELECT * FROM workspaces WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}
