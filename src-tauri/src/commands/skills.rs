use serde::{Deserialize, Serialize};
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

// --- Translation helper ---

fn contains_cjk(s: &str) -> bool {
    s.chars().any(|c| {
        let cp = c as u32;
        (0x4E00..=0x9FFF).contains(&cp)
            || (0x3400..=0x4DBF).contains(&cp)
            || (0x3000..=0x303F).contains(&cp)
            || (0xFF00..=0xFFEF).contains(&cp)
    })
}

async fn translate_to_english(
    pool: &SqlitePool,
    text: &str,
) -> Result<String, String> {
    let row = sqlx::query_as::<_, (String, String)>(
        "SELECT mp.base_url, mp.api_key_encrypted
         FROM models m
         JOIN model_providers mp ON m.provider_id = mp.id
         WHERE m.enabled = 1 AND mp.enabled = 1
         ORDER BY mp.avg_latency_ms ASC NULLS LAST
         LIMIT 1",
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?
    .ok_or_else(|| "没有可用的模型供应商，无法翻译搜索词".to_string())?;

    let (base_url, api_key) = row;
    let chat_url = format!(
        "{}/chat/completions",
        base_url.trim_end_matches('/')
    );

    let body = serde_json::json!({
        "model": "gpt-4o-mini",
        "max_tokens": 100,
        "temperature": 0,
        "messages": [
            {
                "role": "system",
                "content": "You are a translator. Translate the user's input into English. Output ONLY the translated text, nothing else."
            },
            {
                "role": "user",
                "content": text
            }
        ]
    });

    let client = reqwest::Client::new();
    let resp = client
        .post(&chat_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .timeout(std::time::Duration::from_secs(15))
        .send()
        .await
        .map_err(|e| format!("翻译请求失败: {}", e))?;

    if !resp.status().is_success() {
        return Err("翻译服务不可用，将使用原文搜索".into());
    }

    let json: serde_json::Value = resp
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("解析翻译结果失败: {}", e))?;

    let translated = json
        .get("choices")
        .and_then(|c| c.get(0))
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(|c| c.as_str())
        .unwrap_or(text)
        .trim()
        .to_string();

    Ok(translated)
}

// --- SkillsMP Marketplace ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketplaceSkill {
    pub name: Option<String>,
    pub description: Option<String>,
    pub url: Option<String>,
    pub repo: Option<String>,
    pub stars: Option<i64>,
    pub category: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketplaceSearchResult {
    pub skills: Vec<MarketplaceSkill>,
    pub total: i64,
}

#[tauri::command]
pub async fn search_marketplace_skills(
    pool: State<'_, SqlitePool>,
    query: String,
) -> Result<MarketplaceSearchResult, String> {
    let row: (Option<String>,) =
        sqlx::query_as("SELECT skillsmp_api_key FROM system_settings WHERE id = 1")
            .fetch_one(pool.inner())
            .await
            .map_err(|e| e.to_string())?;

    let api_key = row.0.filter(|k| !k.is_empty()).ok_or_else(|| {
        "未配置 SkillsMP API Key，请在设置页面填写后重试".to_string()
    })?;

    let search_query = if contains_cjk(&query) {
        translate_to_english(pool.inner(), &query)
            .await
            .unwrap_or_else(|_| query.clone())
    } else {
        query.clone()
    };

    let url = format!(
        "https://skillsmp.com/api/v1/skills/ai-search?q={}",
        urlencoding::encode(&search_query),
    );

    let client = reqwest::Client::new();
    let resp = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| format!("请求 SkillsMP 失败: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body: String = resp.text().await.unwrap_or_default();

        let msg = if let Ok(err_json) = serde_json::from_str::<serde_json::Value>(&body) {
            err_json
                .get("error")
                .and_then(|e| e.get("message"))
                .and_then(|m| m.as_str())
                .unwrap_or(&body)
                .to_string()
        } else {
            body
        };

        return Err(format!("SkillsMP 错误 ({}): {}", status, msg));
    }

    let body: serde_json::Value = resp
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("解析 SkillsMP 响应失败: {}", e))?;

    let skills: Vec<MarketplaceSkill> = body
        .get("data")
        .or_else(|| body.get("skills"))
        .or_else(|| body.get("results"))
        .and_then(|arr: &serde_json::Value| serde_json::from_value(arr.clone()).ok())
        .unwrap_or_default();

    let total: i64 = body
        .get("total")
        .and_then(|v: &serde_json::Value| v.as_i64())
        .unwrap_or(skills.len() as i64);

    Ok(MarketplaceSearchResult {
        skills,
        total,
    })
}
