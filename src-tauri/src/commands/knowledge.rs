use sqlx::SqlitePool;
use tauri::State;

use crate::db::DEFAULT_WORKSPACE_ID;
use crate::models::{KnowledgeFolder, KnowledgeItem, KnowledgeVersion};

#[tauri::command]
pub async fn list_knowledge_folders(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<KnowledgeFolder>, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    sqlx::query_as::<_, KnowledgeFolder>(
        "SELECT * FROM knowledge_folders WHERE workspace_id = ?1 ORDER BY name ASC",
    )
    .bind(workspace_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_knowledge_folder(
    pool: State<'_, SqlitePool>,
    name: String,
) -> Result<KnowledgeFolder, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO knowledge_folders (id, workspace_id, name) VALUES (?1, ?2, ?3)",
    )
    .bind(&id)
    .bind(workspace_id)
    .bind(&name)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, KnowledgeFolder>("SELECT * FROM knowledge_folders WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn rename_knowledge_folder(
    pool: State<'_, SqlitePool>,
    id: String,
    name: String,
) -> Result<KnowledgeFolder, String> {
    sqlx::query("UPDATE knowledge_folders SET name = ?1 WHERE id = ?2")
        .bind(&name)
        .bind(&id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, KnowledgeFolder>("SELECT * FROM knowledge_folders WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_knowledge_folder(
    pool: State<'_, SqlitePool>,
    id: String,
) -> Result<(), String> {
    sqlx::query("DELETE FROM knowledge_items WHERE folder = ?1")
        .bind(&id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("DELETE FROM knowledge_folders WHERE id = ?1")
        .bind(&id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_knowledge_item(
    pool: State<'_, SqlitePool>,
    id: String,
) -> Result<(), String> {
    sqlx::query("DELETE FROM knowledge_items WHERE id = ?1")
        .bind(&id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn move_knowledge_item(
    pool: State<'_, SqlitePool>,
    id: String,
    folder_id: Option<String>,
) -> Result<KnowledgeItem, String> {
    let folder_val = folder_id.unwrap_or_default();
    sqlx::query(
        "UPDATE knowledge_items SET folder = ?1, updated_at = datetime('now') WHERE id = ?2",
    )
    .bind(&folder_val)
    .bind(&id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, KnowledgeItem>("SELECT * FROM knowledge_items WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

// ─── Existing commands ──────────────────────────────────────

#[tauri::command]
pub async fn list_knowledge_items(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<KnowledgeItem>, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    sqlx::query_as::<_, KnowledgeItem>(
        "SELECT * FROM knowledge_items WHERE workspace_id = ?1 ORDER BY updated_at DESC",
    )
    .bind(workspace_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_knowledge_item(
    pool: State<'_, SqlitePool>,
    id: String,
) -> Result<KnowledgeItem, String> {
    sqlx::query_as::<_, KnowledgeItem>("SELECT * FROM knowledge_items WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_knowledge_item(
    pool: State<'_, SqlitePool>,
    title: String,
    content: Option<String>,
    folder: Option<String>,
    content_type: Option<String>,
    tags_json: Option<String>,
    visibility: Option<String>,
) -> Result<KnowledgeItem, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO knowledge_items (id, workspace_id, title, content, folder, content_type, tags_json, visibility)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
    )
    .bind(&id)
    .bind(workspace_id)
    .bind(&title)
    .bind(&content)
    .bind(&folder.unwrap_or_default())
    .bind(&content_type.unwrap_or_else(|| "markdown".into()))
    .bind(&tags_json.unwrap_or_else(|| "[]".into()))
    .bind(&visibility.unwrap_or_else(|| "public".into()))
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, KnowledgeItem>("SELECT * FROM knowledge_items WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_knowledge_item(
    pool: State<'_, SqlitePool>,
    id: String,
    title: Option<String>,
    content: Option<String>,
    folder: Option<String>,
    tags_json: Option<String>,
    visibility: Option<String>,
) -> Result<KnowledgeItem, String> {
    let existing =
        sqlx::query_as::<_, KnowledgeItem>("SELECT * FROM knowledge_items WHERE id = ?1")
            .bind(&id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| e.to_string())?;

    let new_version = existing.version.unwrap_or(1) + 1;

    sqlx::query(
        "UPDATE knowledge_items SET title = ?1, content = ?2, folder = ?3, tags_json = ?4, visibility = ?5, version = ?6, updated_at = datetime('now') WHERE id = ?7",
    )
    .bind(title.unwrap_or(existing.title))
    .bind(content.or(existing.content))
    .bind(folder.or(existing.folder))
    .bind(tags_json.or(existing.tags_json))
    .bind(visibility.or(existing.visibility))
    .bind(new_version)
    .bind(&id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, KnowledgeItem>("SELECT * FROM knowledge_items WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_knowledge_versions(
    pool: State<'_, SqlitePool>,
    item_id: String,
) -> Result<Vec<KnowledgeVersion>, String> {
    sqlx::query_as::<_, KnowledgeVersion>(
        "SELECT * FROM knowledge_versions WHERE item_id = ?1 ORDER BY version DESC",
    )
    .bind(&item_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}
