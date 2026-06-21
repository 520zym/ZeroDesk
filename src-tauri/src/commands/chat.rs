use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::time::Instant;
use tauri::{AppHandle, Emitter, State};

use crate::db::DEFAULT_WORKSPACE_ID;
use crate::models::{ChatAttachment, ChatConversation, ChatConversationStats, ChatMessage, Model};

#[derive(Debug, Deserialize)]
pub struct UpdateChatConversationPayload {
    pub title: Option<String>,
    pub model_id: Option<String>,
    pub temperature: Option<f64>,
    pub max_output_tokens: Option<i64>,
    pub context_enabled: Option<bool>,
    pub system_prompt: Option<Option<String>>,
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

#[derive(Debug, Deserialize)]
pub struct ChatAttachmentInput {
    pub file_name: String,
    pub mime_type: Option<String>,
    pub size_bytes: i64,
    pub content_text: Option<String>,
    pub status: String,
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
    let system_prompt = match payload.system_prompt {
        Some(Some(prompt)) => {
            let trimmed = prompt.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            }
        }
        Some(None) => None,
        None => current.system_prompt,
    };

    sqlx::query(
        "UPDATE chat_conversations
         SET title = ?1, model_id = ?2, temperature = ?3, max_output_tokens = ?4,
             context_enabled = ?5, system_prompt = ?6, updated_at = datetime('now')
         WHERE id = ?7 AND workspace_id = ?8",
    )
    .bind(&title)
    .bind(&model_id)
    .bind(temperature)
    .bind(max_output_tokens)
    .bind(context_enabled)
    .bind(&system_prompt)
    .bind(&id)
    .bind(DEFAULT_WORKSPACE_ID)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    get_chat_conversation(pool.inner(), &id).await
}

#[tauri::command]
pub async fn delete_chat_conversation(
    pool: State<'_, SqlitePool>,
    id: String,
) -> Result<(), String> {
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
pub async fn list_chat_attachments(
    pool: State<'_, SqlitePool>,
    conversation_id: String,
) -> Result<Vec<ChatAttachment>, String> {
    ensure_conversation_exists(pool.inner(), &conversation_id).await?;
    sqlx::query_as::<_, ChatAttachment>(
        "SELECT * FROM chat_attachments
         WHERE conversation_id = ?1
         ORDER BY created_at ASC",
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
    let (message_count, total_tokens, average_tokens_per_second): (i64, i64, Option<f64>) =
        sqlx::query_as(
            "SELECT
                COUNT(*),
                COALESCE(SUM(tokens_used), 0),
                AVG(tokens_per_second)
             FROM chat_messages
             WHERE conversation_id = ?1",
        )
        .bind(&conversation_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(ChatConversationStats {
        conversation_id,
        message_count,
        total_tokens,
        average_tokens_per_second,
    })
}

#[tauri::command]
pub async fn send_chat_message(
    app: AppHandle,
    pool: State<'_, SqlitePool>,
    conversation_id: String,
    content: String,
    system_prompt: Option<String>,
    attachments: Option<Vec<ChatAttachmentInput>>,
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

    let attachment_inputs = attachments.unwrap_or_default();
    if !attachment_inputs.is_empty() {
        insert_chat_attachments(
            pool.inner(),
            &conversation_id,
            &user_message_id,
            &attachment_inputs,
        )
        .await?;
    }

    emit_chat_message(&app, &conversation_id);

    let effective_system_prompt = match system_prompt.as_deref() {
        Some(prompt) => prompt.trim().is_empty().then_some("").or(Some(prompt)),
        None => conversation.system_prompt.as_deref(),
    };
    let llm_messages = build_llm_messages(
        pool.inner(),
        &conversation_id,
        conversation.context_enabled == 1,
        effective_system_prompt,
    )
    .await?;
    let started_at = Instant::now();
    let result = call_chat_completion_streaming(
        &app,
        &conversation_id,
        &model,
        &llm_messages,
        conversation.temperature,
        conversation.max_output_tokens,
    )
    .await;
    let duration_ms = started_at.elapsed().as_millis().min(i64::MAX as u128) as i64;

    let assistant_message = match result {
        Ok((reply, tokens)) => {
            let tokens_per_second = estimate_tokens_per_second(tokens, duration_ms);
            let message = insert_assistant_message(
                pool.inner(),
                &conversation_id,
                &model_id,
                &reply,
                tokens,
                Some(duration_ms),
                tokens_per_second,
                None,
            )
            .await?;
            if conversation.title == "新对话" {
                let title = generate_conversation_title(&model, trimmed, &reply)
                    .await
                    .unwrap_or_else(|_| fallback_title(trimmed));
                update_conversation_title(pool.inner(), &conversation_id, &title).await?;
            }
            message
        }
        Err(error) => {
            emit_chat_chunk(&app, &conversation_id, "error", &error);
            insert_assistant_message(
                pool.inner(),
                &conversation_id,
                &model_id,
                &format!("生成失败：{}", error),
                None,
                Some(duration_ms),
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

async fn insert_chat_attachments(
    pool: &SqlitePool,
    conversation_id: &str,
    message_id: &str,
    attachments: &[ChatAttachmentInput],
) -> Result<(), String> {
    for attachment in attachments {
        let file_name = attachment.file_name.trim();
        if file_name.is_empty() {
            continue;
        }
        let status = normalize_attachment_status(&attachment.status);
        let content_text = attachment
            .content_text
            .as_deref()
            .map(str::trim)
            .filter(|text| !text.is_empty());
        sqlx::query(
            "INSERT INTO chat_attachments
             (id, conversation_id, message_id, file_name, mime_type, size_bytes, content_text, status)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        )
        .bind(uuid::Uuid::new_v4().to_string())
        .bind(conversation_id)
        .bind(message_id)
        .bind(file_name)
        .bind(attachment.mime_type.as_deref())
        .bind(attachment.size_bytes.max(0))
        .bind(content_text)
        .bind(status)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn normalize_attachment_status(status: &str) -> &'static str {
    match status {
        "ready" => "ready",
        "failed" => "failed",
        _ => "unsupported",
    }
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

async fn resolve_chat_model(
    pool: &SqlitePool,
    model_id: &str,
) -> Result<ResolvedChatModel, String> {
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
    system_prompt: Option<&str>,
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

    let selected_rows = rows
        .into_iter()
        .rev()
        .take(30)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect::<Vec<_>>();
    let attachments = list_chat_attachments_for_conversation(pool, conversation_id).await?;
    let mut messages = append_attachment_context_to_chat_rows(selected_rows, &attachments);

    if let Some(prompt) = system_prompt
        .map(str::trim)
        .filter(|prompt| !prompt.is_empty())
    {
        messages.insert(
            0,
            LlmMessage {
                role: "system".to_string(),
                content: prompt.to_string(),
            },
        );
    }

    Ok(messages)
}

async fn list_chat_attachments_for_conversation(
    pool: &SqlitePool,
    conversation_id: &str,
) -> Result<Vec<ChatAttachment>, String> {
    sqlx::query_as::<_, ChatAttachment>(
        "SELECT * FROM chat_attachments
         WHERE conversation_id = ?1
         ORDER BY created_at ASC",
    )
    .bind(conversation_id)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())
}

fn append_attachment_context_to_chat_rows(
    rows: Vec<ChatMessage>,
    attachments: &[ChatAttachment],
) -> Vec<LlmMessage> {
    rows.into_iter()
        .map(|msg| {
            let mut content = msg.content;
            if msg.role == "user" {
                let message_attachments = attachments
                    .iter()
                    .filter(|attachment| attachment.message_id == msg.id)
                    .collect::<Vec<_>>();
                if !message_attachments.is_empty() {
                    content = append_attachment_context(&content, &message_attachments);
                }
            }
            LlmMessage {
                role: msg.role,
                content,
            }
        })
        .collect()
}

#[cfg(test)]
fn append_attachment_context_to_llm_message(
    mut messages: Vec<LlmMessage>,
    attachments: &[ChatAttachment],
) -> Vec<LlmMessage> {
    if let Some(message) = messages.iter_mut().rev().find(|message| message.role == "user") {
        let attachment_refs = attachments.iter().collect::<Vec<_>>();
        message.content = append_attachment_context(&message.content, &attachment_refs);
    }
    messages
}

fn append_attachment_context(content: &str, attachments: &[&ChatAttachment]) -> String {
    let context = attachments
        .iter()
        .map(|attachment| format_attachment_context(attachment))
        .collect::<Vec<_>>()
        .join("\n\n");
    format!("{content}\n\n[附件上下文]\n{context}")
}

fn format_attachment_context(attachment: &ChatAttachment) -> String {
    let mime_type = attachment.mime_type.as_deref().unwrap_or("未知类型");
    let mut lines = vec![format!(
        "文件：{}\n类型：{}\n大小：{} bytes",
        attachment.file_name, mime_type, attachment.size_bytes
    )];
    if let Some(content) = attachment
        .content_text
        .as_deref()
        .map(str::trim)
        .filter(|content| !content.is_empty())
    {
        lines.push(format!("内容：\n{}", content));
    } else {
        lines.push("内容：暂未提取正文，仅提供文件名、类型和大小。".to_string());
    }
    lines.join("\n")
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

    let total_tokens = total_tokens.or_else(|| estimate_total_tokens(messages, &full_content));
    Ok((full_content, total_tokens))
}

async fn generate_conversation_title(
    model: &ResolvedChatModel,
    first_user_message: &str,
    first_assistant_reply: &str,
) -> Result<String, String> {
    let chat_url = format!("{}/chat/completions", model.base_url.trim_end_matches('/'));
    let user_content = format!(
        "用户第一句话：{}\n\nAI 回复摘要素材：{}\n\n请生成这个对话的标题。",
        first_user_message,
        first_assistant_reply.chars().take(600).collect::<String>()
    );
    let body = serde_json::json!({
        "model": model.name,
        "stream": false,
        "max_tokens": 32,
        "temperature": 0.2,
        "messages": [
            {
                "role": "system",
                "content": "你是对话标题生成器。请根据用户和 AI 的首轮内容生成一个简洁中文标题，8 到 18 个汉字或字符，不要引号，不要句号，不要解释。"
            },
            { "role": "user", "content": user_content }
        ]
    });

    let client = reqwest::Client::new();
    let resp = client
        .post(&chat_url)
        .header("Authorization", format!("Bearer {}", model.api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| format!("标题生成请求失败: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("标题生成返回错误 ({}): {}", status, text));
    }

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("解析标题响应失败: {}", e))?;
    let title = json
        .get("choices")
        .and_then(|c| c.get(0))
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(|v| v.as_str())
        .ok_or_else(|| "标题响应缺少内容".to_string())?;

    Ok(normalize_generated_title(title).unwrap_or_else(|| fallback_title(first_user_message)))
}

async fn insert_assistant_message(
    pool: &SqlitePool,
    conversation_id: &str,
    model_id: &str,
    content: &str,
    tokens_used: Option<i64>,
    duration_ms: Option<i64>,
    tokens_per_second: Option<f64>,
    error: Option<&str>,
) -> Result<ChatMessage, String> {
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO chat_messages (id, conversation_id, role, content, model_id, tokens_used, duration_ms, tokens_per_second, error)
         VALUES (?1, ?2, 'assistant', ?3, ?4, ?5, ?6, ?7, ?8)",
    )
    .bind(&id)
    .bind(conversation_id)
    .bind(content)
    .bind(model_id)
    .bind(tokens_used)
    .bind(duration_ms)
    .bind(tokens_per_second)
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

async fn update_conversation_title(
    pool: &SqlitePool,
    conversation_id: &str,
    title: &str,
) -> Result<(), String> {
    sqlx::query(
        "UPDATE chat_conversations SET title = ?1, updated_at = datetime('now') WHERE id = ?2",
    )
    .bind(title)
    .bind(conversation_id)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn fallback_title(content: &str) -> String {
    let trimmed = content.trim();
    let mut title: String = trimmed.chars().take(18).collect();
    if trimmed.chars().count() > 18 {
        title.push('…');
    }
    title
}

fn normalize_generated_title(title: &str) -> Option<String> {
    let trimmed = title
        .trim()
        .trim_matches([
            '"', '\'', '“', '”', '‘', '’', '《', '》', '。', '.', '：', ':',
        ])
        .trim();
    if trimmed.is_empty() {
        return None;
    }
    let mut normalized: String = trimmed.chars().take(24).collect();
    normalized = normalized
        .trim_matches([
            '"', '\'', '“', '”', '‘', '’', '《', '》', '。', '.', '：', ':',
        ])
        .trim()
        .to_string();
    if normalized.is_empty() {
        None
    } else {
        Some(normalized)
    }
}

fn estimate_total_tokens(messages: &[LlmMessage], reply: &str) -> Option<i64> {
    let input_chars: usize = messages.iter().map(|msg| msg.content.chars().count()).sum();
    let output_chars = reply.chars().count();
    let estimated = ((input_chars + output_chars) as f64 / 4.0).ceil() as i64;
    (estimated > 0).then_some(estimated)
}

fn estimate_tokens_per_second(tokens_used: Option<i64>, duration_ms: i64) -> Option<f64> {
    let tokens = tokens_used?;
    if tokens <= 0 || duration_ms <= 0 {
        return None;
    }
    Some(tokens as f64 / (duration_ms as f64 / 1000.0))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_generated_title() {
        assert_eq!(
            normalize_generated_title("《产品需求整理助手》。"),
            Some("产品需求整理助手".to_string())
        );
    }

    #[test]
    fn falls_back_to_first_message_prefix() {
        assert_eq!(
            fallback_title("帮我整理一个 AI 聊天客户端的核心需求清单"),
            "帮我整理一个 AI 聊天客户端的核心…"
        );
    }

    #[test]
    fn estimates_tokens_per_second_from_duration() {
        assert_eq!(estimate_tokens_per_second(Some(200), 5000), Some(40.0));
    }

    #[test]
    fn estimates_total_tokens_from_messages_and_reply() {
        let messages = vec![LlmMessage {
            role: "user".to_string(),
            content: "一二三四五六七八".to_string(),
        }];
        assert_eq!(estimate_total_tokens(&messages, "九十十一十二"), Some(4));
    }

    #[test]
    fn appends_text_attachment_context_to_user_llm_message() {
        let messages = vec![LlmMessage {
            role: "user".to_string(),
            content: "总结这个文件".to_string(),
        }];
        let attachments = vec![ChatAttachment {
            id: "att-1".to_string(),
            conversation_id: "conv-1".to_string(),
            message_id: "msg-1".to_string(),
            file_name: "notes.md".to_string(),
            mime_type: Some("text/markdown".to_string()),
            size_bytes: 42,
            content_text: Some("# 会议记录\n需要整理行动项".to_string()),
            status: "ready".to_string(),
            created_at: "2026-06-21 10:00:00".to_string(),
        }];

        let updated = append_attachment_context_to_llm_message(messages, &attachments);

        assert_eq!(updated[0].role, "user");
        assert!(updated[0].content.starts_with("总结这个文件\n\n[附件上下文]"));
        assert!(updated[0].content.contains("文件：notes.md"));
        assert!(updated[0].content.contains("# 会议记录"));
    }

    #[test]
    fn describes_unparsed_attachment_in_llm_context() {
        let messages = vec![LlmMessage {
            role: "user".to_string(),
            content: "看看这个附件".to_string(),
        }];
        let attachments = vec![ChatAttachment {
            id: "att-1".to_string(),
            conversation_id: "conv-1".to_string(),
            message_id: "msg-1".to_string(),
            file_name: "report.pdf".to_string(),
            mime_type: Some("application/pdf".to_string()),
            size_bytes: 2048,
            content_text: None,
            status: "unsupported".to_string(),
            created_at: "2026-06-21 10:00:00".to_string(),
        }];

        let updated = append_attachment_context_to_llm_message(messages, &attachments);

        assert!(updated[0].content.contains("文件：report.pdf"));
        assert!(updated[0].content.contains("暂未提取正文"));
    }
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
