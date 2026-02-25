use sqlx::SqlitePool;
use tauri::State;

use crate::models::{FallbackChainEntry, Model, ModelProvider, ResiliencePolicy};

#[tauri::command]
pub async fn list_providers(
    pool: State<'_, SqlitePool>,
    workspace_id: String,
) -> Result<Vec<ModelProvider>, String> {
    sqlx::query_as::<_, ModelProvider>(
        "SELECT * FROM model_providers WHERE workspace_id = ?1 ORDER BY name ASC",
    )
    .bind(&workspace_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_provider(
    pool: State<'_, SqlitePool>,
    workspace_id: String,
    name: String,
    base_url: String,
    api_key_encrypted: Option<String>,
    icon_color: Option<String>,
) -> Result<ModelProvider, String> {
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO model_providers (id, workspace_id, name, base_url, api_key_encrypted, icon_color)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    )
    .bind(&id)
    .bind(&workspace_id)
    .bind(&name)
    .bind(&base_url)
    .bind(&api_key_encrypted)
    .bind(&icon_color)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, ModelProvider>("SELECT * FROM model_providers WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_provider(
    pool: State<'_, SqlitePool>,
    id: String,
    name: Option<String>,
    base_url: Option<String>,
    api_key_encrypted: Option<String>,
    icon_color: Option<String>,
    status: Option<String>,
) -> Result<ModelProvider, String> {
    let existing =
        sqlx::query_as::<_, ModelProvider>("SELECT * FROM model_providers WHERE id = ?1")
            .bind(&id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| e.to_string())?;

    sqlx::query(
        "UPDATE model_providers SET name = ?1, base_url = ?2, api_key_encrypted = ?3, icon_color = ?4, status = ?5, updated_at = datetime('now') WHERE id = ?6",
    )
    .bind(name.unwrap_or(existing.name))
    .bind(base_url.unwrap_or(existing.base_url))
    .bind(api_key_encrypted.or(existing.api_key_encrypted))
    .bind(icon_color.or(existing.icon_color))
    .bind(status.or(existing.status))
    .bind(&id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, ModelProvider>("SELECT * FROM model_providers WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_models(
    pool: State<'_, SqlitePool>,
    provider_id: String,
) -> Result<Vec<Model>, String> {
    sqlx::query_as::<_, Model>(
        "SELECT * FROM models WHERE provider_id = ?1 ORDER BY name ASC",
    )
    .bind(&provider_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_fallback_chain(
    pool: State<'_, SqlitePool>,
    workspace_id: String,
) -> Result<Vec<FallbackChainEntry>, String> {
    sqlx::query_as::<_, FallbackChainEntry>(
        "SELECT * FROM fallback_chains WHERE workspace_id = ?1 ORDER BY chain_order ASC",
    )
    .bind(&workspace_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_resilience_policy(
    pool: State<'_, SqlitePool>,
    workspace_id: String,
) -> Result<ResiliencePolicy, String> {
    let maybe = sqlx::query_as::<_, ResiliencePolicy>(
        "SELECT * FROM resilience_policies WHERE workspace_id = ?1",
    )
    .bind(&workspace_id)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(maybe.unwrap_or(ResiliencePolicy {
        workspace_id,
        retry_count: Some(3),
        backoff_strategy: Some("exponential".into()),
        token_budget: Some(100000),
        over_budget_action: Some("downgrade_confirm".into()),
    }))
}

#[tauri::command]
pub async fn update_resilience_policy(
    pool: State<'_, SqlitePool>,
    workspace_id: String,
    retry_count: Option<i64>,
    backoff_strategy: Option<String>,
    token_budget: Option<i64>,
    over_budget_action: Option<String>,
) -> Result<ResiliencePolicy, String> {
    sqlx::query(
        "INSERT INTO resilience_policies (workspace_id, retry_count, backoff_strategy, token_budget, over_budget_action)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(workspace_id) DO UPDATE SET
           retry_count = COALESCE(?2, resilience_policies.retry_count),
           backoff_strategy = COALESCE(?3, resilience_policies.backoff_strategy),
           token_budget = COALESCE(?4, resilience_policies.token_budget),
           over_budget_action = COALESCE(?5, resilience_policies.over_budget_action)",
    )
    .bind(&workspace_id)
    .bind(retry_count.unwrap_or(3))
    .bind(backoff_strategy.unwrap_or_else(|| "exponential".into()))
    .bind(token_budget.unwrap_or(100000))
    .bind(over_budget_action.unwrap_or_else(|| "downgrade_confirm".into()))
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, ResiliencePolicy>(
        "SELECT * FROM resilience_policies WHERE workspace_id = ?1",
    )
    .bind(&workspace_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())
}
