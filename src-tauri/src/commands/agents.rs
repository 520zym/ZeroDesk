use sqlx::SqlitePool;
use tauri::State;

use crate::db::DEFAULT_WORKSPACE_ID;
use crate::models::Agent;

#[tauri::command]
pub async fn optimize_prompt(
    pool: State<'_, SqlitePool>,
    agent_name: String,
    role_description: String,
    current_prompt: String,
) -> Result<String, String> {
    let row = sqlx::query_as::<_, (String, String, String)>(
        "SELECT m.name, mp.base_url, mp.api_key_encrypted
         FROM system_model_assignments sma
         JOIN models m ON m.id = sma.model_id
         JOIN model_providers mp ON m.provider_id = mp.id
         WHERE sma.task_key = 'prompt' AND sma.workspace_id = 'default'
         LIMIT 1",
    )
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let (model_name, base_url, api_key) = match row {
        Some(r) => r,
        None => {
            let fallback = sqlx::query_as::<_, (String, String, String)>(
                "SELECT m.name, mp.base_url, mp.api_key_encrypted
                 FROM models m
                 JOIN model_providers mp ON m.provider_id = mp.id
                 WHERE m.enabled = 1 AND mp.enabled = 1
                 ORDER BY mp.avg_latency_ms ASC NULLS LAST
                 LIMIT 1",
            )
            .fetch_optional(pool.inner())
            .await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| {
                "没有可用的模型。请在「模型与路由」页面配置 Prompt 优化模型，或启用至少一个模型".to_string()
            })?;
            fallback
        }
    };

    let chat_url = format!("{}/chat/completions", base_url.trim_end_matches('/'));

    let user_msg = if current_prompt.is_empty() {
        format!(
            "请为一个名为「{}」的 AI Agent 生成系统提示词。\n角色描述：{}",
            agent_name, role_description
        )
    } else {
        format!(
            "请优化以下 AI Agent 的系统提示词。\nAgent 名称：{}\n角色描述：{}\n\n当前提示词：\n{}",
            agent_name, role_description, current_prompt
        )
    };

    let body = serde_json::json!({
        "model": model_name,
        "max_tokens": 2000,
        "temperature": 0.7,
        "messages": [
            {
                "role": "system",
                "content": "你是一位专业的 Prompt 工程师。你的任务是优化或生成 AI Agent 的系统提示词（System Prompt）。\n\n要求：\n1. 明确角色定位和能力边界\n2. 规定输出格式和质量标准\n3. 添加必要的约束条件和安全准则\n4. 语言简洁、结构清晰\n5. 直接输出优化后的提示词，不要添加任何解释或前缀"
            },
            {
                "role": "user",
                "content": user_msg
            }
        ]
    });

    let client = reqwest::Client::new();
    let resp = client
        .post(&chat_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| format!("Prompt 优化请求失败: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("Prompt 优化服务返回错误 ({}): {}", status, text));
    }

    let json: serde_json::Value = resp
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("解析优化结果失败: {}", e))?;

    let optimized = json
        .get("choices")
        .and_then(|c| c.get(0))
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(|c| c.as_str())
        .ok_or_else(|| "模型返回数据格式异常，无法提取优化后的提示词".to_string())?
        .trim()
        .to_string();

    Ok(optimized)
}

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
