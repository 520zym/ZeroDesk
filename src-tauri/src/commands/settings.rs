use sqlx::SqlitePool;
use tauri::State;

use crate::models::SystemSettings;
use crate::DataDir;

#[tauri::command]
pub async fn get_settings(pool: State<'_, SqlitePool>) -> Result<SystemSettings, String> {
    sqlx::query_as::<_, SystemSettings>("SELECT * FROM system_settings WHERE id = 1")
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[derive(serde::Deserialize)]
pub struct UpdateSettingsPayload {
    pub theme: Option<String>,
    pub language: Option<String>,
    pub encryption: Option<bool>,
    pub archive_days: Option<i64>,
    pub task_notify: Option<bool>,
    pub fail_notify: Option<bool>,
    pub budget_notify: Option<bool>,
    pub data_path: Option<String>,
    pub skillsmp_api_key: Option<String>,
    pub skillsmp_api_base_url: Option<String>,
}

#[tauri::command]
pub async fn update_settings(
    pool: State<'_, SqlitePool>,
    payload: UpdateSettingsPayload,
) -> Result<SystemSettings, String> {
    sqlx::query(
        "UPDATE system_settings SET
            theme = COALESCE(?1, theme),
            language = COALESCE(?2, language),
            encryption = COALESCE(?3, encryption),
            archive_days = COALESCE(?4, archive_days),
            task_notify = COALESCE(?5, task_notify),
            fail_notify = COALESCE(?6, fail_notify),
            budget_notify = COALESCE(?7, budget_notify),
            data_path = COALESCE(?8, data_path),
            skillsmp_api_key = COALESCE(?9, skillsmp_api_key),
            skillsmp_api_base_url = COALESCE(NULLIF(?10, ''), skillsmp_api_base_url),
            updated_at = datetime('now')
        WHERE id = 1",
    )
    .bind(payload.theme)
    .bind(payload.language)
    .bind(payload.encryption.map(|v| v as i64))
    .bind(payload.archive_days)
    .bind(payload.task_notify.map(|v| v as i64))
    .bind(payload.fail_notify.map(|v| v as i64))
    .bind(payload.budget_notify.map(|v| v as i64))
    .bind(payload.data_path)
    .bind(payload.skillsmp_api_key)
    .bind(payload.skillsmp_api_base_url)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    get_settings(pool).await
}

#[tauri::command]
pub async fn get_data_path(data_dir: State<'_, DataDir>) -> Result<String, String> {
    Ok(data_dir.0.display().to_string())
}
