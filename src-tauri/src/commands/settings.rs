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
    pub price_currency: Option<String>,
    pub usd_cny_rate: Option<f64>,
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
            price_currency = COALESCE(?11, price_currency),
            usd_cny_rate = COALESCE(?12, usd_cny_rate),
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
    .bind(payload.price_currency)
    .bind(payload.usd_cny_rate)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    get_settings(pool).await
}

#[derive(serde::Deserialize)]
struct FrankfurterResponse {
    rates: std::collections::HashMap<String, f64>,
}

#[tauri::command]
pub async fn refresh_exchange_rate(pool: State<'_, SqlitePool>) -> Result<SystemSettings, String> {
    let response = reqwest::get("https://api.frankfurter.app/latest?from=USD&to=CNY")
        .await
        .map_err(|e| format!("汇率查询失败: {e}"))?
        .error_for_status()
        .map_err(|e| format!("汇率服务返回错误: {e}"))?
        .json::<FrankfurterResponse>()
        .await
        .map_err(|e| format!("汇率响应解析失败: {e}"))?;

    let rate = response
        .rates
        .get("CNY")
        .copied()
        .filter(|rate| rate.is_finite() && *rate > 0.0)
        .ok_or_else(|| "汇率响应中没有有效的 CNY 汇率".to_string())?;

    sqlx::query(
        "UPDATE system_settings SET usd_cny_rate = ?1, exchange_rate_updated_at = datetime('now'), updated_at = datetime('now') WHERE id = 1",
    )
    .bind(rate)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    get_settings(pool).await
}

#[tauri::command]
pub async fn get_data_path(data_dir: State<'_, DataDir>) -> Result<String, String> {
    Ok(data_dir.0.display().to_string())
}
