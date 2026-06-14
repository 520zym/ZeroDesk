use std::time::Instant;

use serde::Deserialize;
use sqlx::SqlitePool;
use tauri::State;

use crate::db::DEFAULT_WORKSPACE_ID;
use crate::models::{
    FallbackChainEntry, Model, ModelProvider, ResiliencePolicy, SystemModelAssignment,
    TestConnectionResult,
};

// ── OpenAI-compatible API response types ─────────────────────

#[derive(Deserialize)]
struct OpenAiModelsResponse {
    data: Vec<OpenAiModel>,
}

#[derive(Deserialize)]
struct OpenAiModel {
    id: String,
}

// ── Provider CRUD ────────────────────────────────────────────

#[tauri::command]
pub async fn list_providers(pool: State<'_, SqlitePool>) -> Result<Vec<ModelProvider>, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    sqlx::query_as::<_, ModelProvider>(
        "SELECT * FROM model_providers WHERE workspace_id = ?1 ORDER BY name ASC",
    )
    .bind(workspace_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_provider(
    pool: State<'_, SqlitePool>,
    name: String,
    base_url: String,
    api_key_encrypted: Option<String>,
    icon_color: Option<String>,
) -> Result<ModelProvider, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO model_providers (id, workspace_id, name, base_url, api_key_encrypted, icon_color)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    )
    .bind(&id)
    .bind(workspace_id)
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
pub async fn delete_provider(pool: State<'_, SqlitePool>, id: String) -> Result<(), String> {
    sqlx::query("DELETE FROM model_providers WHERE id = ?1")
        .bind(&id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn toggle_provider_enabled(
    pool: State<'_, SqlitePool>,
    id: String,
    enabled: bool,
) -> Result<ModelProvider, String> {
    sqlx::query(
        "UPDATE model_providers SET enabled = ?1, updated_at = datetime('now') WHERE id = ?2",
    )
    .bind(enabled as i64)
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

// ── Models ───────────────────────────────────────────────────

#[tauri::command]
pub async fn list_models(
    pool: State<'_, SqlitePool>,
    provider_id: String,
) -> Result<Vec<Model>, String> {
    sqlx::query_as::<_, Model>("SELECT * FROM models WHERE provider_id = ?1 ORDER BY name ASC")
        .bind(&provider_id)
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_workspace_models(pool: State<'_, SqlitePool>) -> Result<Vec<Model>, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    sqlx::query_as::<_, Model>(
        "SELECT m.* FROM models m \
         JOIN model_providers mp ON m.provider_id = mp.id \
         WHERE mp.workspace_id = ?1 AND mp.enabled = 1 AND m.enabled = 1 \
         ORDER BY m.name ASC",
    )
    .bind(workspace_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn toggle_model_enabled(
    pool: State<'_, SqlitePool>,
    id: String,
    enabled: bool,
) -> Result<Model, String> {
    sqlx::query("UPDATE models SET enabled = ?1 WHERE id = ?2")
        .bind(enabled as i64)
        .bind(&id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Model>("SELECT * FROM models WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_model_price(
    pool: State<'_, SqlitePool>,
    id: String,
    price_per_million_tokens: f64,
) -> Result<Model, String> {
    if !price_per_million_tokens.is_finite() || price_per_million_tokens < 0.0 {
        return Err("模型价格必须是不小于 0 的数字".to_string());
    }

    sqlx::query("UPDATE models SET price_per_million_tokens = ?1 WHERE id = ?2")
        .bind(price_per_million_tokens)
        .bind(&id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Model>("SELECT * FROM models WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn batch_toggle_models(
    pool: State<'_, SqlitePool>,
    ids: Vec<String>,
    enabled: bool,
) -> Result<(), String> {
    for id in &ids {
        sqlx::query("UPDATE models SET enabled = ?1 WHERE id = ?2")
            .bind(enabled as i64)
            .bind(id)
            .execute(pool.inner())
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ── Provider API interaction ─────────────────────────────────

fn build_models_url(base_url: &str) -> String {
    let trimmed = base_url.trim_end_matches('/');
    format!("{}/models", trimmed)
}

/// Built-in reference pricing (per million input tokens).
/// Only a best-effort approximation — users can override in the UI.
fn lookup_reference_price(model_name: &str) -> f64 {
    let id = model_name.to_lowercase();

    // ── OpenAI ──────────────────────────────────────────────
    if id.contains("gpt-5.5") {
        return 5.00;
    }
    if id.contains("gpt-5.4") {
        return 2.50;
    }
    if id.contains("gpt-4.1-nano") {
        return 0.10;
    }
    if id.contains("gpt-4.1-mini") {
        return 0.40;
    }
    if id.contains("gpt-4.1") {
        return 2.00;
    }
    if id.contains("gpt-4o-mini") {
        return 0.15;
    }
    if id.contains("gpt-4o") {
        return 2.50;
    }
    if id.contains("gpt-4-turbo") {
        return 10.0;
    }
    if id.contains("gpt-4") && !id.contains("gpt-4o") {
        return 30.0;
    }
    if id.contains("gpt-3.5") {
        return 0.50;
    }
    if id.contains("o3-mini") {
        return 1.10;
    }
    if id.contains("o3") && !id.contains("o3-mini") {
        return 10.0;
    }
    if id.contains("o1-mini") || id.contains("o1-preview") {
        return 3.00;
    }
    if id.contains("o1") && !id.contains("o1-mini") && !id.contains("o1-preview") {
        return 15.0;
    }

    // ── DeepSeek ────────────────────────────────────────────
    if id.contains("deepseek-v4-flash") || id.contains("v4-flash") {
        return 0.14;
    }
    if id.contains("deepseek-v4-pro") || id.contains("v4-pro") {
        return 0.435;
    }
    if id.contains("deepseek-v3") || id.contains("deepseek-chat") {
        return 0.27;
    }
    if id.contains("deepseek-r1") || id.contains("deepseek-reasoner") {
        return 0.55;
    }
    if id.contains("deepseek-coder") || id.contains("deepseek-v2.5") {
        return 0.14;
    }

    // ── Qwen ────────────────────────────────────────────────
    if id.contains("qwen2.5-72b") || id.contains("qwen2-72b") {
        return 0.90;
    }
    if id.contains("qwen-max") {
        return 2.40;
    }
    if id.contains("qwen-plus") {
        return 0.80;
    }
    if id.contains("qwen-turbo") {
        return 0.30;
    }
    if id.contains("qwen2.5-32b") || id.contains("qwen2.5-coder-32b") {
        return 0.56;
    }
    if id.contains("qwen2.5-14b") || id.contains("qwen2.5-coder-7b") {
        return 0.28;
    }
    if id.contains("qwen2.5-7b") || id.contains("qwen2-7b") {
        return 0.14;
    }
    if id.contains("qwen2.5-3b") || id.contains("qwen2.5-1.5b") || id.contains("qwen2.5-0.5b") {
        return 0.06;
    }
    if id.contains("qwq") {
        return 0.90;
    }

    // ── Claude ──────────────────────────────────────────────
    if id.contains("claude-opus-4") || id.contains("opus-4") {
        return 15.00;
    }
    if id.contains("claude-sonnet-4") || id.contains("sonnet-4") {
        return 3.00;
    }
    if id.contains("claude-3.5-sonnet") || id.contains("claude-3-5-sonnet") {
        return 3.00;
    }
    if id.contains("claude-3.5-haiku") || id.contains("claude-3-5-haiku") {
        return 0.80;
    }
    if id.contains("claude-3-haiku") {
        return 0.25;
    }
    if id.contains("claude-3-opus") {
        return 15.0;
    }
    if id.contains("claude-3-sonnet") {
        return 3.00;
    }

    // ── Gemini ──────────────────────────────────────────────
    if id.contains("gemini-2.5-pro") || id.contains("gemini 2.5 pro") {
        return 1.25;
    }
    if id.contains("gemini-2.5-flash-lite") || id.contains("flash-lite") {
        return 0.10;
    }
    if id.contains("gemini-2.5-flash") || id.contains("gemini 2.5 flash") {
        return 0.30;
    }

    // ── Kimi / Moonshot ─────────────────────────────────────
    if id.contains("kimi-k2") || id.contains("moonshot-v1") {
        return 4.00;
    }

    // ── MiniMax ─────────────────────────────────────────────
    if id.contains("minimax-m2.5") {
        return 5.00;
    }
    if id.contains("minimax-m2") {
        return 4.00;
    }

    // ── Llama ───────────────────────────────────────────────
    if id.contains("llama-3.3-70b") || id.contains("llama-3.1-70b") {
        return 0.59;
    }
    if id.contains("llama-3.1-405b") {
        return 2.10;
    }
    if id.contains("llama-3.1-8b") || id.contains("llama-3.2-3b") || id.contains("llama-3.2-1b") {
        return 0.06;
    }

    // ── GLM ─────────────────────────────────────────────────
    if id.contains("glm-4-9b") || id.contains("glm4-9b") {
        return 0.14;
    }
    if id.contains("glm-4") || id.contains("glm4") {
        return 1.00;
    }

    // ── Gemma ───────────────────────────────────────────────
    if id.contains("gemma-2-27b") {
        return 0.27;
    }
    if id.contains("gemma-2-9b") || id.contains("gemma-2-2b") {
        return 0.06;
    }

    // ── Yi ───────────────────────────────────────────────────
    if id.contains("yi-1.5-34b") || id.contains("yi-large") {
        return 0.90;
    }
    if id.contains("yi-1.5-9b") || id.contains("yi-1.5-6b") {
        return 0.14;
    }

    // ── Mistral / Mixtral ───────────────────────────────────
    if id.contains("mixtral-8x22b") {
        return 0.90;
    }
    if id.contains("mixtral-8x7b") || id.contains("mistral-7b") {
        return 0.14;
    }
    if id.contains("mistral-large") {
        return 2.00;
    }
    if id.contains("mistral-small") || id.contains("mistral-nemo") {
        return 0.15;
    }

    // ── InternLM ────────────────────────────────────────────
    if id.contains("internlm2") {
        return 0.14;
    }

    // ── MiniMax ──────────────────────────────────────────────
    if id.contains("minimax-m2.5-highspeed") {
        return 0.35;
    }
    if id.contains("minimax-m2.5") {
        return 0.70;
    }
    if id.contains("minimax-m2.1") {
        return 0.55;
    }
    if id.contains("minimax-m2") {
        return 0.40;
    }
    if id.contains("abab6.5s") || id.contains("abab6.5-chat") {
        return 1.00;
    }
    if id.contains("abab5.5s") || id.contains("abab5.5-chat") {
        return 0.36;
    }

    // ── Embedding models (much cheaper) ─────────────────────
    if id.contains("embedding") || id.contains("bge-") {
        return 0.02;
    }

    // ── Image / TTS / Whisper (not per-token, skip) ─────────
    if id.contains("dall-e")
        || id.contains("tts")
        || id.contains("whisper")
        || id.contains("stable-diffusion")
        || id.contains("flux")
    {
        return 0.0;
    }

    0.0
}

#[tauri::command]
pub async fn test_provider_connection(
    pool: State<'_, SqlitePool>,
    provider_id: String,
) -> Result<TestConnectionResult, String> {
    let provider =
        sqlx::query_as::<_, ModelProvider>("SELECT * FROM model_providers WHERE id = ?1")
            .bind(&provider_id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| e.to_string())?;

    let api_key = provider.api_key_encrypted.unwrap_or_default();
    let url = build_models_url(&provider.base_url);

    let client = reqwest::Client::new();
    let start = Instant::now();

    let resp = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .timeout(std::time::Duration::from_secs(15))
        .send()
        .await;

    let latency_ms = start.elapsed().as_millis() as i64;

    match resp {
        Ok(r) if r.status().is_success() => {
            let model_count = match r.json::<OpenAiModelsResponse>().await {
                Ok(body) => body.data.len() as i64,
                Err(_) => 0,
            };

            sqlx::query(
                "UPDATE model_providers SET status = 'online', avg_latency_ms = ?1, updated_at = datetime('now') WHERE id = ?2",
            )
            .bind(latency_ms)
            .bind(&provider_id)
            .execute(pool.inner())
            .await
            .ok();

            Ok(TestConnectionResult {
                success: true,
                latency_ms,
                model_count,
                error: None,
            })
        }
        Ok(r) => {
            let status = r.status().as_u16();

            // Some providers (e.g. MiniMax) don't expose GET /models.
            // If we get 404, fall back to a minimal chat completions probe.
            if status == 404 {
                let chat_url = format!(
                    "{}/chat/completions",
                    provider.base_url.trim_end_matches('/')
                );
                let probe_start = Instant::now();
                let probe = client
                    .post(&chat_url)
                    .header("Authorization", format!("Bearer {}", api_key))
                    .header("Content-Type", "application/json")
                    .body(r#"{"model":"test","messages":[{"role":"user","content":"hi"}],"max_tokens":1}"#)
                    .timeout(std::time::Duration::from_secs(15))
                    .send()
                    .await;
                let probe_latency = probe_start.elapsed().as_millis() as i64;

                if let Ok(pr) = probe {
                    let ps = pr.status().as_u16();
                    // Any HTTP response (even 400/401/422) means the server is reachable
                    if ps != 404 {
                        sqlx::query(
                            "UPDATE model_providers SET status = 'online', avg_latency_ms = ?1, updated_at = datetime('now') WHERE id = ?2",
                        )
                        .bind(probe_latency)
                        .bind(&provider_id)
                        .execute(pool.inner())
                        .await
                        .ok();

                        return Ok(TestConnectionResult {
                            success: true,
                            latency_ms: probe_latency,
                            model_count: 0,
                            error: None,
                        });
                    }
                }
            }

            let body = r.text().await.unwrap_or_default();
            let err_msg = format!(
                "HTTP {} - {}",
                status,
                body.chars().take(200).collect::<String>()
            );

            sqlx::query(
                "UPDATE model_providers SET status = 'degraded', avg_latency_ms = ?1, updated_at = datetime('now') WHERE id = ?2",
            )
            .bind(latency_ms)
            .bind(&provider_id)
            .execute(pool.inner())
            .await
            .ok();

            Ok(TestConnectionResult {
                success: false,
                latency_ms,
                model_count: 0,
                error: Some(err_msg),
            })
        }
        Err(e) => {
            sqlx::query(
                "UPDATE model_providers SET status = 'offline', updated_at = datetime('now') WHERE id = ?1",
            )
            .bind(&provider_id)
            .execute(pool.inner())
            .await
            .ok();

            Ok(TestConnectionResult {
                success: false,
                latency_ms,
                model_count: 0,
                error: Some(e.to_string()),
            })
        }
    }
}

/// MiniMax doesn't expose GET /models — return known models directly.
async fn fetch_minimax_models(pool: &SqlitePool, provider_id: &str) -> Result<Vec<Model>, String> {
    // (model_id, reference price per million input tokens, context_window)
    let minimax_models: &[(&str, f64, i32)] = &[
        ("MiniMax-M2.5", 5.00, 204800),
        ("MiniMax-M2.5-highspeed", 5.00, 204800),
        ("MiniMax-M2.1", 4.00, 204800),
        ("MiniMax-M2", 4.00, 204800),
    ];

    for (model_id, price, ctx) in minimax_models {
        sqlx::query(
            "INSERT INTO models (id, provider_id, name, price_per_million_tokens, context_window_tokens)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(id) DO UPDATE SET
               price_per_million_tokens = CASE
                 WHEN models.price_per_million_tokens IS NULL OR models.price_per_million_tokens = 0
                 THEN excluded.price_per_million_tokens
                 ELSE models.price_per_million_tokens
               END",
        )
        .bind(format!("{}:{}", provider_id, model_id))
        .bind(provider_id)
        .bind(model_id)
        .bind(price)
        .bind(ctx)
        .execute(pool)
        .await
        .ok();
    }

    sqlx::query(
        "UPDATE model_providers SET models_count = ?1, status = 'online', updated_at = datetime('now') WHERE id = ?2",
    )
    .bind(minimax_models.len() as i64)
    .bind(provider_id)
    .execute(pool)
    .await
    .ok();

    sqlx::query_as::<_, Model>("SELECT * FROM models WHERE provider_id = ?1 ORDER BY name ASC")
        .bind(provider_id)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn fetch_provider_models(
    pool: State<'_, SqlitePool>,
    provider_id: String,
) -> Result<Vec<Model>, String> {
    let provider =
        sqlx::query_as::<_, ModelProvider>("SELECT * FROM model_providers WHERE id = ?1")
            .bind(&provider_id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| e.to_string())?;

    // MiniMax doesn't have a /models endpoint (covers both minimaxi.com and minimax.chat)
    if provider.base_url.to_lowercase().contains("minimax") {
        return fetch_minimax_models(pool.inner(), &provider_id).await;
    }

    let api_key = provider.api_key_encrypted.unwrap_or_default();
    let url = build_models_url(&provider.base_url);

    let client = reqwest::Client::new();
    let resp = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status().as_u16();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!(
            "HTTP {} - {}",
            status,
            body.chars().take(300).collect::<String>()
        ));
    }

    let body: OpenAiModelsResponse = resp
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;

    for m in &body.data {
        let ref_price = lookup_reference_price(&m.id);
        sqlx::query(
            "INSERT INTO models (id, provider_id, name, price_per_million_tokens)
             VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(id) DO UPDATE SET
               price_per_million_tokens = CASE
                 WHEN models.price_per_million_tokens IS NULL OR models.price_per_million_tokens = 0
                 THEN excluded.price_per_million_tokens
                 ELSE models.price_per_million_tokens
               END",
        )
        .bind(&format!("{}:{}", provider_id, m.id))
        .bind(&provider_id)
        .bind(&m.id)
        .bind(ref_price)
        .execute(pool.inner())
        .await
        .ok();
    }

    sqlx::query(
        "UPDATE model_providers SET models_count = ?1, status = 'online', updated_at = datetime('now') WHERE id = ?2",
    )
    .bind(body.data.len() as i64)
    .bind(&provider_id)
    .execute(pool.inner())
    .await
    .ok();

    sqlx::query_as::<_, Model>("SELECT * FROM models WHERE provider_id = ?1 ORDER BY name ASC")
        .bind(&provider_id)
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

// ── System Model Assignments ─────────────────────────────────

#[tauri::command]
pub async fn get_system_model_assignments(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<SystemModelAssignment>, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    sqlx::query_as::<_, SystemModelAssignment>(
        "SELECT * FROM system_model_assignments WHERE workspace_id = ?1",
    )
    .bind(workspace_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_system_model_assignment(
    pool: State<'_, SqlitePool>,
    task_key: String,
    model_id: String,
) -> Result<Vec<SystemModelAssignment>, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    sqlx::query(
        "INSERT INTO system_model_assignments (workspace_id, task_key, model_id)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(workspace_id, task_key) DO UPDATE SET
           model_id = excluded.model_id,
           updated_at = datetime('now')",
    )
    .bind(workspace_id)
    .bind(&task_key)
    .bind(&model_id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    get_system_model_assignments(pool).await
}

// ── Fallback & Resilience ────────────────────────────────────

#[tauri::command]
pub async fn get_fallback_chain(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<FallbackChainEntry>, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    sqlx::query_as::<_, FallbackChainEntry>(
        "SELECT * FROM fallback_chains WHERE workspace_id = ?1 ORDER BY chain_order ASC",
    )
    .bind(workspace_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_resilience_policy(
    pool: State<'_, SqlitePool>,
) -> Result<ResiliencePolicy, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    let maybe = sqlx::query_as::<_, ResiliencePolicy>(
        "SELECT * FROM resilience_policies WHERE workspace_id = ?1",
    )
    .bind(workspace_id)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(maybe.unwrap_or(ResiliencePolicy {
        workspace_id: workspace_id.to_string(),
        retry_count: Some(3),
        backoff_strategy: Some("exponential".into()),
        token_budget: Some(100000),
        over_budget_action: Some("downgrade_confirm".into()),
    }))
}

#[tauri::command]
pub async fn update_resilience_policy(
    pool: State<'_, SqlitePool>,
    retry_count: Option<i64>,
    backoff_strategy: Option<String>,
    token_budget: Option<i64>,
    over_budget_action: Option<String>,
) -> Result<ResiliencePolicy, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    sqlx::query(
        "INSERT INTO resilience_policies (workspace_id, retry_count, backoff_strategy, token_budget, over_budget_action)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(workspace_id) DO UPDATE SET
           retry_count = COALESCE(?2, resilience_policies.retry_count),
           backoff_strategy = COALESCE(?3, resilience_policies.backoff_strategy),
           token_budget = COALESCE(?4, resilience_policies.token_budget),
           over_budget_action = COALESCE(?5, resilience_policies.over_budget_action)",
    )
    .bind(workspace_id)
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
    .bind(workspace_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())
}
