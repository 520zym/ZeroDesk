use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tauri::{AppHandle, Emitter, State};

use crate::db::DEFAULT_WORKSPACE_ID;
use crate::models::{ChatConversation, ChatConversationStats, ChatMessage, Model};

#[derive(Debug, Deserialize)]
pub struct UpdateChatConversationPayload {
    pub title: Option<String>,
    pub model_id: Option<String>,
    pub temperature: Option<f64>,
    pub max_output_tokens: Option<i64>,
    pub context_enabled: Option<bool>,
}

#[derive(Debug, Deserialize, Serialize)]
struct LlmMessage {
    role: String,
    content: String,
}

#[derive(Debug, Clone, Serialize)]
struct ChatMessageEvent {
    conversation_id: String,
}

#[derive(Debug, Clone, Serialize)]
struct ChatChunkEvent {
    conversation_id: String,
    chunk_type: String,
    chunk: String,
}

#[tauri::command]
pub async fn list_chat_conversations(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<ChatConversation>, String> {
    sqlx::query_as::<_, ChatConversation>(
        "SELECT * FROM chat_conversations WHERE workspace_id = ?1 ORDER BY updated_at DESC",
    )
    .bind(DEFAULT_WORKSPACE_ID)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_chat_conversation(
    pool: State<'_, SqlitePool>,
    title: Option<String>,
    model_id: Option<String>,
) -> Result<ChatConversation, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let title = title
        .map(|t| t.trim().to_string())
        .filter(|t| !t.is_empty())
        .unwrap_or_else(|| "新对话".to_string());
    let selected_model_id = match model_id {
        Some(id) if !id.trim().is_empty() => Some(id),
        _ => get_default_model_id(pool.inner()).await?,
    };

    sqlx::query(
        "INSERT INTO chat_conversations (id, workspace_id, title, model_id)
         VALUES (?1, ?2, ?3, ?4)",
    )
    .bind(&id)
    .bind(DEFAULT_WORKSPACE_ID)
    .bind(&title)
    .bind(&selected_model_id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    get_chat_conversation(pool.inner(), &id).await
}

#[tauri::command]
pub async fn update_chat_conversation(
    pool: State<'_, SqlitePool>,
    id: String,
    payload: UpdateChatConversationPayload,
) -> Result<ChatConversation, String> {
    let current = get_chat_conversation(pool.inner(), &id).await?;
    let title = payload
        .title
        .map(|t| t.trim().to_string())
        .filter(|t| !t.is_empty())
        .unwrap_or(current.title);
    let model_id = payload.model_id.or(current.model_id);
    let temperature = payload
        .temperature
        .map(|v| v.clamp(0.0, 2.0))
        .unwrap_or(current.temperature);
    let max_output_tokens = payload
        .max_output_tokens
        .map(|v| v.clamp(256, 32000))
        .unwrap_or(current.max_output_tokens);
    let context_enabled = payload
        .context_enabled
        .map(|v| v as i64)
        .unwrap_or(current.context_enabled);

    sqlx::query(
        "UPDATE chat_conversations
         SET title = ?1, model_id = ?2, temperature = ?3, max_output_tokens = ?4,
             context_enabled = ?5, updated_at = datetime('now')
         WHERE id = ?6 AND workspace_id = ?7",
    )
    .bind(&title)
    .bind(&model_id)
    .bind(temperature)
    .bind(max_output_tokens)
    .bind(context_enabled)
    .bind(&id)
    .bind(DEFAULT_WORKSPACE_ID)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    get_chat_conversation(pool.inner(), &id).await
}

#[tauri::command]
pub async fn delete_chat_conversation(pool: State<'_, SqlitePool>, id: String) -> Result<(), String> {
    sqlx::query("DELETE FROM chat_conversations WHERE id = ?1 AND workspace_id = ?2")
        .bind(&id)
        .bind(DEFAULT_WORKSPACE_ID)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn list_chat_messages(
    pool: State<'_, SqlitePool>,
    conversation_id: String,
) -> Result<Vec<ChatMessage>, String> {
    ensure_conversation_exists(pool.inner(), &conversation_id).await?;
    sqlx::query_as::<_, ChatMessage>(
        "SELECT * FROM chat_messages WHERE conversation_id = ?1 ORDER BY created_at ASC",
    )
    .bind(&conversation_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn clear_chat_context(
    pool: State<'_, SqlitePool>,
    conversation_id: String,
) -> Result<(), String> {
    ensure_conversation_exists(pool.inner(), &conversation_id).await?;
    sqlx::query("DELETE FROM chat_messages WHERE conversation_id = ?1")
        .bind(&conversation_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    touch_conversation(pool.inner(), &conversation_id).await?;
    Ok(())
}

#[tauri::command]
pub async fn get_chat_conversation_stats(
    pool: State<'_, SqlitePool>,
    conversation_id: String,
) -> Result<ChatConversationStats, String> {
    ensure_conversation_exists(pool.inner(), &conversation_id).await?;
    let (message_count,): (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM chat_messages WHERE conversation_id = ?1")
            .bind(&conversation_id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| e.to_string())?;

    Ok(ChatConversationStats {
        conversation_id,
        message_count,
    })
}

#[tauri::command]
pub async fn send_chat_message(
    app: AppHandle,
    pool: State<'_, SqlitePool>,
    conversation_id: String,
    content: String,
) -> Result<ChatMessage, String> {
    let trimmed = content.trim();
    if trimmed.is_empty() {
        return Err("消息内容不能为空".into());
    }

    let conversation = get_chat_conversation(pool.inner(), &conversation_id).await?;
    let model_id = conversation
        .model_id
        .clone()
        .or(get_default_model_id(pool.inner()).await?)
        .ok_or_else(|| "请先在模型与路由中启用一个模型".to_string())?;
    let model = resolve_chat_model(pool.inner(), &model_id).await?;
    if model.api_key.trim().is_empty() {
        return Err("当前模型的 Provider 未配置 API Key".into());
    }

    let user_message_id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO chat_messages (id, conversation_id, role, content, model_id)
         VALUES (?1, ?2, 'user', ?3, ?4)",
    )
    .bind(&user_message_id)
    .bind(&conversation_id)
    .bind(trimmed)
    .bind(&model_id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    emit_chat_message(&app, &conversation_id);

    if conversation.title == "新对话" {
        let title = generate_title(trimmed);
        let _ = sqlx::query(
            "UPDATE chat_conversations SET title = ?1, updated_at = datetime('now') WHERE id = ?2",
        )
        .bind(title)
        .bind(&conversation_id)
        .execute(pool.inner())
        .await;
    }

    let llm_messages = build_llm_messages(pool.inner(), &conversation_id, conversation.context_enabled == 1).await?;
    let result = call_chat_completion_streaming(
        &app,
        &conversation_id,
        &model,
        &llm_messages,
        conversation.temperature,
        conversation.max_output_tokens,
    )
    .await;

    let assistant_message = match result {
        Ok((reply, tokens)) => {
            insert_assistant_message(pool.inner(), &conversation_id, &model_id, &reply, tokens, None).await?
        }
        Err(error) => {
            emit_chat_chunk(&app, &conversation_id, "error", &error);
            insert_assistant_message(
                pool.inner(),
                &conversation_id,
                &model_id,
                &format!("生成失败：{}", error),
                None,
                Some(&error),
            )
            .await?
        }
    };

    touch_conversation(pool.inner(), &conversation_id).await?;
    emit_chat_chunk(&app, &conversation_id, "done", "");
    emit_chat_message(&app, &conversation_id);
    Ok(assistant_message)
}

async fn get_chat_conversation(pool: &SqlitePool, id: &str) -> Result<ChatConversation, String> {
    sqlx::query_as::<_, ChatConversation>(
        "SELECT * FROM chat_conversations WHERE id = ?1 AND workspace_id = ?2",
    )
    .bind(id)
    .bind(DEFAULT_WORKSPACE_ID)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())
}

async fn ensure_conversation_exists(pool: &SqlitePool, id: &str) -> Result<(), String> {
    let (count,): (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM chat_conversations WHERE id = ?1 AND workspace_id = ?2",
    )
    .bind(id)
    .bind(DEFAULT_WORKSPACE_ID)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    if count == 0 {
        return Err("对话不存在".into());
    }
    Ok(())
}

async fn get_default_model_id(pool: &SqlitePool) -> Result<Option<String>, String> {
    let row: Option<(String,)> = sqlx::query_as(
        "SELECT m.id FROM models m
         JOIN model_providers mp ON m.provider_id = mp.id
         WHERE mp.workspace_id = ?1 AND mp.enabled = 1 AND m.enabled = 1
         ORDER BY m.name ASC
         LIMIT 1",
    )
    .bind(DEFAULT_WORKSPACE_ID)
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(row.map(|(id,)| id))
}

struct ResolvedChatModel {
    name: String,
    base_url: String,
    api_key: String,
}

async fn resolve_chat_model(pool: &SqlitePool, model_id: &str) -> Result<ResolvedChatModel, String> {
    let row: Option<(String, String, Option<String>)> = sqlx::query_as(
        "SELECT m.name, mp.base_url, mp.api_key_encrypted
         FROM models m
         JOIN model_providers mp ON m.provider_id = mp.id
         WHERE m.id = ?1 AND m.enabled = 1 AND mp.enabled = 1 AND mp.workspace_id = ?2",
    )
    .bind(model_id)
    .bind(DEFAULT_WORKSPACE_ID)
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?;

    let (name, base_url, api_key) = row.ok_or_else(|| "当前对话选择的模型不可用".to_string())?;
    Ok(ResolvedChatModel {
        name,
        base_url,
        api_key: api_key.unwrap_or_default(),
    })
}

async fn build_llm_messages(
    pool: &SqlitePool,
    conversation_id: &str,
    context_enabled: bool,
) -> Result<Vec<LlmMessage>, String> {
    let rows = if context_enabled {
        sqlx::query_as::<_, ChatMessage>(
            "SELECT * FROM chat_messages
             WHERE conversation_id = ?1 AND role IN ('user','assistant')
             ORDER BY created_at ASC",
        )
        .bind(conversation_id)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?
    } else {
        sqlx::query_as::<_, ChatMessage>(
            "SELECT * FROM chat_messages
             WHERE conversation_id = ?1 AND role = 'user'
             ORDER BY created_at DESC
             LIMIT 1",
        )
        .bind(conversation_id)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?
    };

    Ok(rows
        .into_iter()
        .rev()
        .take(30)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .map(|msg| LlmMessage {
            role: msg.role,
            content: msg.content,
        })
        .collect())
}

async fn call_chat_completion_streaming(
    app: &AppHandle,
    conversation_id: &str,
    model: &ResolvedChatModel,
    messages: &[LlmMessage],
    temperature: f64,
    max_output_tokens: i64,
) -> Result<(String, Option<i64>), String> {
    let chat_url = format!("{}/chat/completions", model.base_url.trim_end_matches('/'));
    let body = serde_json::json!({
        "model": model.name,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_output_tokens,
        "stream": true
    });

    let client = reqwest::Client::new();
    let mut resp = client
        .post(&chat_url)
        .header("Authorization", format!("Bearer {}", model.api_key))
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

    let mut buffer = String::new();
    let mut full_content = String::new();
    let mut total_tokens: Option<i64> = None;

    loop {
        let chunk = resp
            .chunk()
            .await
            .map_err(|e| format!("读取响应流失败: {}", e))?;
        let Some(bytes) = chunk else {
            break;
        };

        buffer.push_str(&String::from_utf8_lossy(&bytes));

        while let Some(pos) = buffer.find('\n') {
            let line = buffer[..pos].trim().to_string();
            buffer = buffer[pos + 1..].to_string();

            if line.is_empty() || line.starts_with(':') {
                continue;
            }

            let data = if let Some(d) = line.strip_prefix("data: ") {
                d
            } else if let Some(d) = line.strip_prefix("data:") {
                d
            } else {
                continue;
            };

            if data.trim() == "[DONE]" {
                continue;
            }

            let json: serde_json::Value = match serde_json::from_str(data) {
                Ok(v) => v,
                Err(_) => continue,
            };

            if let Some(usage) = json.get("usage") {
                total_tokens = usage.get("total_tokens").and_then(|v| v.as_i64());
            }

            let delta = json
                .get("choices")
                .and_then(|c| c.get(0))
                .and_then(|c| c.get("delta"));

            let content = delta
                .and_then(|d| d.get("content"))
                .and_then(|v| v.as_str())
                .or_else(|| {
                    json.get("choices")
                        .and_then(|c| c.get(0))
                        .and_then(|c| c.get("message"))
                        .and_then(|m| m.get("content"))
                        .and_then(|v| v.as_str())
                });

            if let Some(content) = content {
                if !content.is_empty() {
                    full_content.push_str(content);
                    emit_chat_chunk(app, conversation_id, "content", content);
                }
            }
        }
    }

    let full_content = full_content.trim().to_string();
    if full_content.is_empty() {
        return Err("模型返回数据格式异常，无法提取回复内容".into());
    }

    Ok((full_content, total_tokens))
}

async fn insert_assistant_message(
    pool: &SqlitePool,
    conversation_id: &str,
    model_id: &str,
    content: &str,
    tokens_used: Option<i64>,
    error: Option<&str>,
) -> Result<ChatMessage, String> {
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO chat_messages (id, conversation_id, role, content, model_id, tokens_used, error)
         VALUES (?1, ?2, 'assistant', ?3, ?4, ?5, ?6)",
    )
    .bind(&id)
    .bind(conversation_id)
    .bind(content)
    .bind(model_id)
    .bind(tokens_used)
    .bind(error)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, ChatMessage>("SELECT * FROM chat_messages WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())
}

async fn touch_conversation(pool: &SqlitePool, conversation_id: &str) -> Result<(), String> {
    sqlx::query("UPDATE chat_conversations SET updated_at = datetime('now') WHERE id = ?1")
        .bind(conversation_id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn generate_title(content: &str) -> String {
    let trimmed = content.trim();
    let mut title: String = trimmed.chars().take(18).collect();
    if trimmed.chars().count() > 18 {
        title.push('…');
    }
    title
}

fn emit_chat_message(app: &AppHandle, conversation_id: &str) {
    let _ = app.emit(
        "chat:message",
        ChatMessageEvent {
            conversation_id: conversation_id.to_string(),
        },
    );
}

fn emit_chat_chunk(app: &AppHandle, conversation_id: &str, chunk_type: &str, chunk: &str) {
    let _ = app.emit(
        "chat:chunk",
        ChatChunkEvent {
            conversation_id: conversation_id.to_string(),
            chunk_type: chunk_type.to_string(),
            chunk: chunk.to_string(),
        },
    );
}

#[allow(dead_code)]
async fn _list_enabled_models(pool: &SqlitePool) -> Result<Vec<Model>, String> {
    sqlx::query_as::<_, Model>(
        "SELECT m.* FROM models m
         JOIN model_providers mp ON m.provider_id = mp.id
         WHERE mp.workspace_id = ?1 AND mp.enabled = 1 AND m.enabled = 1
         ORDER BY m.name ASC",
    )
    .bind(DEFAULT_WORKSPACE_ID)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())
}
