use sqlx::SqlitePool;
use tauri::State;

use crate::db::DEFAULT_WORKSPACE_ID;
use crate::engine::resolve_model;
use crate::models::{PromptTemplateEntry, PromptVersion, WorkflowTemplate};

#[tauri::command]
pub async fn list_prompt_versions(
    pool: State<'_, SqlitePool>,
    agent_id: String,
) -> Result<Vec<PromptVersion>, String> {
    sqlx::query_as::<_, PromptVersion>(
        "SELECT * FROM prompt_versions WHERE agent_id = ?1 ORDER BY version DESC",
    )
    .bind(&agent_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_prompt_version(
    pool: State<'_, SqlitePool>,
    agent_id: String,
    content: String,
    note: Option<String>,
) -> Result<PromptVersion, String> {
    let max_ver: (i64,) = sqlx::query_as(
        "SELECT COALESCE(MAX(version), 0) FROM prompt_versions WHERE agent_id = ?1",
    )
    .bind(&agent_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let id = uuid::Uuid::new_v4().to_string();
    let version = max_ver.0 + 1;

    sqlx::query(
        "INSERT INTO prompt_versions (id, agent_id, version, content, note)
         VALUES (?1, ?2, ?3, ?4, ?5)",
    )
    .bind(&id)
    .bind(&agent_id)
    .bind(version)
    .bind(&content)
    .bind(&note)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, PromptVersion>("SELECT * FROM prompt_versions WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn refine_prompt(
    pool: State<'_, SqlitePool>,
    content: String,
) -> Result<String, String> {
    let (model_name, base_url, api_key, _price) =
        resolve_model(&pool, &None).await?;

    let chat_url = format!("{}/chat/completions", base_url.trim_end_matches('/'));

    let system_prompt = "\
你是一位资深的 Prompt 工程专家。请优化以下 Prompt，使其：
1. 结构更清晰（合理使用 Markdown 标题、列表等）
2. 指令更明确、无歧义
3. 包含必要的约束条件和输出格式要求
4. 保持原始意图和核心需求不变

直接输出优化后的 Prompt 全文，不要添加任何解释或前言。";

    let body = serde_json::json!({
        "model": model_name,
        "stream": false,
        "max_tokens": 4000,
        "temperature": 0.7,
        "messages": [
            { "role": "system", "content": system_prompt },
            { "role": "user", "content": content }
        ]
    });

    let client = reqwest::Client::new();
    let resp = client
        .post(&chat_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .timeout(std::time::Duration::from_secs(120))
        .send()
        .await
        .map_err(|e| format!("LLM 请求失败: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("LLM 返回错误 ({}): {}", status, text));
    }

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;

    let result = json
        .get("choices")
        .and_then(|c| c.get(0))
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    if result.is_empty() {
        return Err("AI 返回了空内容".into());
    }

    Ok(result)
}

#[tauri::command]
pub async fn list_prompt_templates(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<PromptTemplateEntry>, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    sqlx::query_as::<_, PromptTemplateEntry>(
        "SELECT
           a.id        AS agent_id,
           a.name      AS agent_name,
           a.avatar_char,
           a.avatar_color,
           a.role_description,
           pv.content  AS prompt_content,
           pv.version,
           pv.note,
           pv.created_at AS version_created_at
         FROM agents a
         INNER JOIN prompt_versions pv ON pv.agent_id = a.id
         WHERE a.workspace_id = ?1
           AND pv.version = (
             SELECT MAX(pv2.version)
             FROM prompt_versions pv2
             WHERE pv2.agent_id = a.id
           )
         ORDER BY a.name ASC",
    )
    .bind(workspace_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_workflow_templates(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<WorkflowTemplate>, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    sqlx::query_as::<_, WorkflowTemplate>(
        "SELECT * FROM workflow_templates WHERE workspace_id = ?1 ORDER BY name ASC",
    )
    .bind(workspace_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_workflow_template(
    pool: State<'_, SqlitePool>,
    name: String,
    description: Option<String>,
    category: Option<String>,
    icon_name: Option<String>,
    icon_bg: Option<String>,
    parameters_json: Option<String>,
    steps_json: Option<String>,
) -> Result<WorkflowTemplate, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO workflow_templates (id, workspace_id, name, description, category, icon_name, icon_bg, parameters_json, steps_json)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
    )
    .bind(&id)
    .bind(workspace_id)
    .bind(&name)
    .bind(&description)
    .bind(&category)
    .bind(&icon_name)
    .bind(&icon_bg)
    .bind(&parameters_json.unwrap_or_else(|| "[]".into()))
    .bind(&steps_json.unwrap_or_else(|| "[]".into()))
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, WorkflowTemplate>("SELECT * FROM workflow_templates WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}
