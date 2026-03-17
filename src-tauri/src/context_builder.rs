use sqlx::SqlitePool;

/// 上下文消息，用于构建 LLM prompt
#[derive(Debug, Clone)]
pub struct ContextMessage {
    pub role: String,
    pub content: String,
}

/// 构建 Agent 执行时的上下文消息列表
pub async fn build_context(
    pool: &SqlitePool,
    task_id: &str,
    run_id: &str,
    current_step_id: &str,
    agent_system_prompt: &str,
    task_goal: &str,
    context_window: i32,
    threshold_ratio: f64,
) -> Result<Vec<ContextMessage>, String> {
    let mut messages = Vec::new();

    // 1. 系统提示词
    messages.push(ContextMessage {
        role: "system".to_string(),
        content: agent_system_prompt.to_string(),
    });

    // 2. 任务目标
    messages.push(ContextMessage {
        role: "system".to_string(),
        content: format!("任务目标：{}", task_goal),
    });

    // 3. 获取上游步骤输出
    if let Some(output) = get_upstream_step_output(pool, task_id, run_id, current_step_id).await? {
        messages.push(ContextMessage {
            role: "user".to_string(),
            content: format!("上一步骤输出：\n{}", output),
        });
    }

    // 4. 获取最近 N 条非 system 消息
    let recent_messages = get_recent_messages(pool, task_id, run_id, 10).await?;

    // 5. 估算 token 数（粗略：平均 3 字符/token）
    let total_chars: usize = messages.iter().map(|m| m.content.len()).sum::<usize>()
        + recent_messages.iter().map(|m| m.content.len()).sum::<usize>();
    let estimated_tokens = (total_chars / 3) as i32;
    let threshold = (context_window as f64 * threshold_ratio) as i32;

    if estimated_tokens > threshold {
        // 触发摘要压缩（当前为简单截断，后续可接入 LLM）
        let summary = try_summarize(&recent_messages);
        messages.push(ContextMessage {
            role: "system".to_string(),
            content: format!("以下为之前对话的摘要：\n{}", summary),
        });
        // 保留最近 3 条原文
        for msg in recent_messages.iter().rev().take(3).rev() {
            messages.push(msg.clone());
        }
    } else {
        for msg in &recent_messages {
            messages.push(msg.clone());
        }
    }

    Ok(messages)
}

/// 获取上游步骤的 Agent 输出
async fn get_upstream_step_output(
    pool: &SqlitePool,
    task_id: &str,
    run_id: &str,
    current_step_id: &str,
) -> Result<Option<String>, String> {
    let current_order: Option<(i64,)> = sqlx::query_as(
        "SELECT step_order FROM task_steps WHERE id = ?"
    )
    .bind(current_step_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?;

    let current_order = match current_order {
        Some((order,)) => order,
        None => return Ok(None),
    };

    if current_order <= 1 {
        return Ok(None);
    }

    let prev_msg: Option<(String,)> = sqlx::query_as(
        "SELECT em.content FROM execution_messages em
         JOIN task_steps ts ON em.step_id = ts.id
         WHERE em.task_id = ? AND em.run_id = ?
         AND ts.step_order = ? AND em.sender_type = 'agent'
         ORDER BY em.created_at DESC LIMIT 1"
    )
    .bind(task_id)
    .bind(run_id)
    .bind(current_order - 1)
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(prev_msg.map(|(content,)| content))
}

/// 获取最近 N 条非 system 消息，转换为 ContextMessage
async fn get_recent_messages(
    pool: &SqlitePool,
    task_id: &str,
    run_id: &str,
    limit: i32,
) -> Result<Vec<ContextMessage>, String> {
    let rows: Vec<(String, String, Option<String>)> = sqlx::query_as(
        "SELECT sender_type, content, sender_name FROM execution_messages
         WHERE task_id = ? AND run_id = ? AND sender_type != 'system'
         ORDER BY created_at DESC LIMIT ?"
    )
    .bind(task_id)
    .bind(run_id)
    .bind(limit)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    let messages: Vec<ContextMessage> = rows.iter().rev().map(|(sender_type, content, sender_name)| {
        let role = match sender_type.as_str() {
            "agent" => "assistant".to_string(),
            "human" => "user".to_string(),
            _ => "system".to_string(),
        };
        let prefix = match sender_name {
            Some(name) => format!("[{}] ", name),
            None => String::new(),
        };
        ContextMessage {
            role,
            content: format!("{}{}", prefix, content),
        }
    }).collect();

    Ok(messages)
}

/// 生成简单摘要（截断式，后续可替换为 LLM 调用）
fn try_summarize(messages: &[ContextMessage]) -> String {
    let summary: String = messages.iter()
        .map(|m| {
            let preview: String = m.content.chars().take(100).collect();
            format!("- {}", preview)
        })
        .collect::<Vec<_>>()
        .join("\n");
    format!("对话摘要（{}条消息）：\n{}", messages.len(), summary)
}

/// 计算消息的 token 总数（从 metadata_json 中提取）
pub async fn get_total_tokens_for_run(
    pool: &SqlitePool,
    task_id: &str,
    run_id: &str,
) -> Result<i64, String> {
    let rows: Vec<(Option<String>,)> = sqlx::query_as(
        "SELECT metadata_json FROM execution_messages
         WHERE task_id = ? AND run_id = ? AND metadata_json IS NOT NULL"
    )
    .bind(task_id)
    .bind(run_id)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut total: i64 = 0;
    for (metadata,) in rows {
        if let Some(meta_str) = metadata {
            if let Ok(meta) = serde_json::from_str::<serde_json::Value>(&meta_str) {
                let input = meta.get("tokens_input").and_then(|v| v.as_i64()).unwrap_or(0);
                let output = meta.get("tokens_output").and_then(|v| v.as_i64()).unwrap_or(0);
                total += input + output;
            }
        }
    }
    Ok(total)
}
