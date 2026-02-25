use serde::Serialize;
use sqlx::SqlitePool;
use tauri::{AppHandle, Emitter};

use crate::models::{Agent, Task, TaskStep};

#[derive(Clone, Serialize)]
pub struct ExecutionChunk {
    pub task_id: String,
    pub step_id: String,
    pub agent_id: String,
    pub agent_name: String,
    pub chunk_type: String,
    pub chunk: String,
}

pub async fn run_task(
    app: AppHandle,
    pool: SqlitePool,
    task_id: String,
    run_id: Option<String>,
) -> Result<(), String> {
    let task: Task = sqlx::query_as("SELECT * FROM tasks WHERE id = ?1")
        .bind(&task_id)
        .fetch_one(&pool)
        .await
        .map_err(|e| e.to_string())?;

    let goal = task
        .goal
        .as_deref()
        .or(task.description.as_deref())
        .unwrap_or(&task.title)
        .to_string();

    let steps: Vec<TaskStep> = if let Some(ref rid) = run_id {
        sqlx::query_as(
            "SELECT * FROM task_steps WHERE task_id = ?1 AND run_id = ?2 ORDER BY step_order ASC",
        )
        .bind(&task_id)
        .bind(rid)
        .fetch_all(&pool)
        .await
        .map_err(|e| e.to_string())?
    } else {
        sqlx::query_as(
            "SELECT * FROM task_steps WHERE task_id = ?1 ORDER BY step_order ASC",
        )
        .bind(&task_id)
        .fetch_all(&pool)
        .await
        .map_err(|e| e.to_string())?
    };

    if steps.is_empty() {
        create_message(
            &pool, &task_id, run_id.as_deref(), "system", None, None,
            "任务没有执行步骤，无法执行", "error", None,
        )
        .await?;
        set_task_status(&pool, &task_id, "failed").await?;
        if let Some(ref rid) = run_id {
            set_run_status(&pool, rid, "failed").await?;
        }
        return Ok(());
    }

    create_message(
        &pool, &task_id, run_id.as_deref(), "system", None, None,
        &format!("任务开始执行 — 共 {} 个步骤", steps.len()),
        "text", None,
    )
    .await?;

    // Resume support: skip completed steps, recover previous output
    let mut start_index = 0;
    for (i, step) in steps.iter().enumerate() {
        if step.status.as_deref() == Some("completed") {
            start_index = i + 1;
        } else {
            break;
        }
    }

    let mut previous_output = String::new();
    if start_index > 0 {
        let last_msg: Option<(String,)> = if let Some(ref rid) = run_id {
            sqlx::query_as(
                "SELECT content FROM execution_messages WHERE task_id = ?1 AND run_id = ?2 AND sender_type = 'agent' ORDER BY created_at DESC LIMIT 1",
            )
            .bind(&task_id)
            .bind(rid)
            .fetch_optional(&pool)
            .await
            .map_err(|e| e.to_string())?
        } else {
            sqlx::query_as(
                "SELECT content FROM execution_messages WHERE task_id = ?1 AND sender_type = 'agent' ORDER BY created_at DESC LIMIT 1",
            )
            .bind(&task_id)
            .fetch_optional(&pool)
            .await
            .map_err(|e| e.to_string())?
        };
        previous_output = last_msg.map(|(c,)| c).unwrap_or_default();
    }

    let mut total_tokens: i64 = if run_id.is_some() { 0 } else { task.total_tokens.unwrap_or(0) };
    let mut total_cost: f64 = if run_id.is_some() { 0.0 } else { task.total_cost.unwrap_or(0.0) };

    for (i, step) in steps.iter().enumerate() {
        if i < start_index {
            continue;
        }

        let current: Task = sqlx::query_as("SELECT * FROM tasks WHERE id = ?1")
            .bind(&task_id)
            .fetch_one(&pool)
            .await
            .map_err(|e| e.to_string())?;

        if current.status != "running" {
            let label = match current.status.as_str() {
                "paused" => "已暂停",
                _ => "已终止",
            };
            create_message(
                &pool, &task_id, run_id.as_deref(), "system", None, None,
                &format!("任务{}", label), "text", None,
            )
            .await?;
            return Ok(());
        }

        sqlx::query("UPDATE task_steps SET status = 'running' WHERE id = ?1")
            .bind(&step.id)
            .execute(&pool)
            .await
            .map_err(|e| e.to_string())?;

        let agent_id = step.agent_id.as_deref().unwrap_or("");
        let agent: Option<Agent> = if !agent_id.is_empty() {
            sqlx::query_as("SELECT * FROM agents WHERE id = ?1")
                .bind(agent_id)
                .fetch_optional(&pool)
                .await
                .map_err(|e| e.to_string())?
        } else {
            None
        };
        let agent_name = agent
            .as_ref()
            .map(|a| a.name.as_str())
            .unwrap_or("Agent");

        let _ = app.emit(
            "execution:chunk",
            ExecutionChunk {
                task_id: task_id.clone(),
                step_id: step.id.clone(),
                agent_id: agent_id.to_string(),
                agent_name: agent_name.to_string(),
                chunk_type: "step_start".into(),
                chunk: format!("步骤 {}/{} 开始: {}", i + 1, steps.len(), step.name),
            },
        );

        create_message(
            &pool, &task_id, run_id.as_deref(), "system", None, None,
            &format!(
                "▶ 步骤 {}/{} — {} ({})",
                i + 1,
                steps.len(),
                step.name,
                agent_name
            ),
            "text", None,
        )
        .await?;

        let (model_name, base_url, api_key, price_per_m) =
            match resolve_model(&pool, &agent).await {
                Ok(info) => info,
                Err(e) => {
                    create_message(
                        &pool, &task_id, run_id.as_deref(), "system", None, None,
                        &format!("无法解析模型: {}", e), "error", None,
                    )
                    .await?;
                    sqlx::query("UPDATE task_steps SET status = 'failed' WHERE id = ?1")
                        .bind(&step.id)
                        .execute(&pool)
                        .await
                        .ok();
                    set_task_status(&pool, &task_id, "failed").await?;
                    if let Some(ref rid) = run_id {
                        set_run_status(&pool, rid, "failed").await?;
                    }
                    let _ = app.emit(
                        "execution:chunk",
                        ExecutionChunk {
                            task_id: task_id.clone(),
                            step_id: step.id.clone(),
                            agent_id: agent_id.to_string(),
                            agent_name: agent_name.to_string(),
                            chunk_type: "error".into(),
                            chunk: e.clone(),
                        },
                    );
                    return Err(e);
                }
            };

        let system_prompt = agent
            .as_ref()
            .and_then(|a| a.system_prompt.as_deref())
            .filter(|s| !s.is_empty())
            .unwrap_or("你是一个专业的AI助手，请认真完成分配给你的任务。");

        let user_prompt = build_user_prompt(
            &goal,
            &step.name,
            step.description.as_deref(),
            &previous_output,
            i,
        );

        let start_time = std::time::Instant::now();

        match call_llm_streaming(
            &app, &task_id, &step.id, agent_id, agent_name,
            &model_name, &base_url, &api_key,
            system_prompt, &user_prompt,
        )
        .await
        {
            Ok((content, thinking, tok_in, tok_out)) => {
                let duration = start_time.elapsed();
                let step_tokens = tok_in + tok_out;
                let step_cost = if price_per_m > 0.0 {
                    step_tokens as f64 / 1_000_000.0 * price_per_m
                } else {
                    0.0
                };

                total_tokens += step_tokens;
                total_cost += step_cost;

                let metadata = serde_json::json!({
                    "thinking": if thinking.is_empty() { serde_json::Value::Null } else { serde_json::Value::String(thinking) },
                    "model": model_name,
                    "tokens_input": tok_in,
                    "tokens_output": tok_out,
                    "duration_ms": duration.as_millis() as i64,
                });

                create_message(
                    &pool, &task_id, run_id.as_deref(), "agent",
                    Some(agent_id), Some(agent_name),
                    &content, "text",
                    Some(&metadata.to_string()),
                )
                .await?;

                previous_output = content;

                sqlx::query(
                    "UPDATE task_steps SET status = 'completed', tokens_used = ?1, duration_seconds = ?2 WHERE id = ?3",
                )
                .bind(step_tokens)
                .bind(duration.as_secs_f64())
                .bind(&step.id)
                .execute(&pool)
                .await
                .map_err(|e| e.to_string())?;

                let progress = ((i + 1) as f64 / steps.len() as f64 * 100.0) as i64;
                sqlx::query(
                    "UPDATE tasks SET total_tokens = ?1, total_cost = ?2, progress = ?3, updated_at = datetime('now') WHERE id = ?4",
                )
                .bind(total_tokens)
                .bind(total_cost)
                .bind(progress)
                .bind(&task_id)
                .execute(&pool)
                .await
                .map_err(|e| e.to_string())?;

                if let Some(ref rid) = run_id {
                    sqlx::query(
                        "UPDATE task_runs SET total_tokens = ?1, total_cost = ?2, progress = ?3 WHERE id = ?4",
                    )
                    .bind(total_tokens)
                    .bind(total_cost)
                    .bind(progress)
                    .bind(rid)
                    .execute(&pool)
                    .await
                    .ok();
                }

                create_message(
                    &pool, &task_id, run_id.as_deref(), "system", None, None,
                    &format!(
                        "✓ 步骤 {}/{} 完成 — {} ({:.1}s, {} tokens)",
                        i + 1,
                        steps.len(),
                        step.name,
                        duration.as_secs_f64(),
                        step_tokens
                    ),
                    "text", None,
                )
                .await?;

                let _ = app.emit(
                    "execution:chunk",
                    ExecutionChunk {
                        task_id: task_id.clone(),
                        step_id: step.id.clone(),
                        agent_id: agent_id.to_string(),
                        agent_name: agent_name.to_string(),
                        chunk_type: "step_done".into(),
                        chunk: format!("步骤 {} 完成", i + 1),
                    },
                );
            }
            Err(e) => {
                create_message(
                    &pool, &task_id, run_id.as_deref(), "system", None, None,
                    &format!("✗ 步骤 {}/{} 失败: {}", i + 1, steps.len(), e),
                    "error", None,
                )
                .await?;

                sqlx::query("UPDATE task_steps SET status = 'failed' WHERE id = ?1")
                    .bind(&step.id)
                    .execute(&pool)
                    .await
                    .ok();

                set_task_status(&pool, &task_id, "failed").await?;
                if let Some(ref rid) = run_id {
                    set_run_status(&pool, rid, "failed").await?;
                }

                let _ = app.emit(
                    "execution:chunk",
                    ExecutionChunk {
                        task_id: task_id.clone(),
                        step_id: step.id.clone(),
                        agent_id: agent_id.to_string(),
                        agent_name: agent_name.to_string(),
                        chunk_type: "error".into(),
                        chunk: e.clone(),
                    },
                );

                return Err(e);
            }
        }
    }

    set_task_status_completed(&pool, &task_id).await?;
    if let Some(ref rid) = run_id {
        set_run_status_completed(&pool, rid).await?;
    }

    create_message(
        &pool, &task_id, run_id.as_deref(), "system", None, None,
        &format!(
            "任务执行完成 — 共 {} 步, {} tokens, ¥{:.4}",
            steps.len(),
            total_tokens,
            total_cost
        ),
        "text", None,
    )
    .await?;

    let _ = app.emit(
        "execution:chunk",
        ExecutionChunk {
            task_id: task_id.clone(),
            step_id: String::new(),
            agent_id: String::new(),
            agent_name: String::new(),
            chunk_type: "task_done".into(),
            chunk: "任务执行完成".into(),
        },
    );

    Ok(())
}

async fn resolve_model(
    pool: &SqlitePool,
    agent: &Option<Agent>,
) -> Result<(String, String, String, f64), String> {
    if let Some(agent) = agent {
        if let Some(ref model_id) = agent.model_id {
            if let Ok(info) = query_model_info(pool, model_id).await {
                return Ok(info);
            }
        }
        if let Some(ref fallback_id) = agent.fallback_model_id {
            if let Ok(info) = query_model_info(pool, fallback_id).await {
                return Ok(info);
            }
        }
    }

    let sys: Option<(String,)> = sqlx::query_as(
        "SELECT model_id FROM system_model_assignments \
         WHERE task_key = 'execution' AND workspace_id = 'default' LIMIT 1",
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?;

    if let Some((model_id,)) = sys {
        if let Ok(info) = query_model_info(pool, &model_id).await {
            return Ok(info);
        }
    }

    sqlx::query_as::<_, (String, String, String, Option<f64>)>(
        "SELECT m.name, mp.base_url, mp.api_key_encrypted, m.price_per_million_tokens \
         FROM models m JOIN model_providers mp ON m.provider_id = mp.id \
         WHERE m.enabled = 1 AND mp.enabled = 1 \
         ORDER BY mp.avg_latency_ms ASC NULLS LAST LIMIT 1",
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?
    .map(|(n, u, k, p)| (n, u, k, p.unwrap_or(0.0)))
    .ok_or_else(|| "没有可用的模型。请在「模型与路由」页面启用至少一个模型".into())
}

async fn query_model_info(
    pool: &SqlitePool,
    model_id: &str,
) -> Result<(String, String, String, f64), String> {
    sqlx::query_as::<_, (String, String, String, Option<f64>)>(
        "SELECT m.name, mp.base_url, mp.api_key_encrypted, m.price_per_million_tokens \
         FROM models m JOIN model_providers mp ON m.provider_id = mp.id \
         WHERE m.id = ?1 AND m.enabled = 1 AND mp.enabled = 1",
    )
    .bind(model_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?
    .map(|(n, u, k, p)| (n, u, k, p.unwrap_or(0.0)))
    .ok_or_else(|| format!("模型 {} 不可用", model_id))
}

fn build_user_prompt(
    goal: &str,
    step_name: &str,
    step_desc: Option<&str>,
    prev_output: &str,
    idx: usize,
) -> String {
    let mut p = format!(
        "## 任务目标\n{}\n\n## 当前步骤\n**步骤 {}**: {}",
        goal,
        idx + 1,
        step_name
    );

    if let Some(d) = step_desc {
        if !d.is_empty() {
            p.push_str(&format!("\n\n**步骤说明**: {}", d));
        }
    }

    if !prev_output.is_empty() {
        p.push_str(&format!("\n\n## 上一步输出\n{}", prev_output));
    }

    p.push_str("\n\n请根据以上信息完成当前步骤的任务。直接输出结果，不要重复任务描述。");
    p
}

async fn call_llm_streaming(
    app: &AppHandle,
    task_id: &str,
    step_id: &str,
    agent_id: &str,
    agent_name: &str,
    model_name: &str,
    base_url: &str,
    api_key: &str,
    system_prompt: &str,
    user_prompt: &str,
) -> Result<(String, String, i64, i64), String> {
    let chat_url = format!("{}/chat/completions", base_url.trim_end_matches('/'));

    let body = serde_json::json!({
        "model": model_name,
        "stream": true,
        "max_tokens": 4000,
        "temperature": 0.7,
        "messages": [
            { "role": "system", "content": system_prompt },
            { "role": "user", "content": user_prompt }
        ]
    });

    let client = reqwest::Client::new();
    let mut resp = client
        .post(&chat_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .timeout(std::time::Duration::from_secs(300))
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
    let mut full_thinking = String::new();
    let mut tokens_in: i64 = 0;
    let mut tokens_out: i64 = 0;

    loop {
        let chunk = resp
            .chunk()
            .await
            .map_err(|e| format!("读取响应流失败: {}", e))?;
        match chunk {
            Some(bytes) => {
                buffer.push_str(&String::from_utf8_lossy(&bytes));

                while let Some(pos) = buffer.find('\n') {
                    let line = buffer[..pos].trim_end().to_string();
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
                        if let Some(v) = usage.get("prompt_tokens").and_then(|v| v.as_i64()) {
                            tokens_in = v;
                        }
                        if let Some(v) =
                            usage.get("completion_tokens").and_then(|v| v.as_i64())
                        {
                            tokens_out = v;
                        }
                    }

                    if let Some(delta) = json
                        .get("choices")
                        .and_then(|c| c.get(0))
                        .and_then(|c| c.get("delta"))
                    {
                        if let Some(c) = delta.get("content").and_then(|v| v.as_str()) {
                            if !c.is_empty() {
                                full_content.push_str(c);
                                let _ = app.emit(
                                    "execution:chunk",
                                    ExecutionChunk {
                                        task_id: task_id.to_string(),
                                        step_id: step_id.to_string(),
                                        agent_id: agent_id.to_string(),
                                        agent_name: agent_name.to_string(),
                                        chunk_type: "content".into(),
                                        chunk: c.to_string(),
                                    },
                                );
                            }
                        }

                        if let Some(r) =
                            delta.get("reasoning_content").and_then(|v| v.as_str())
                        {
                            if !r.is_empty() {
                                full_thinking.push_str(r);
                                let _ = app.emit(
                                    "execution:chunk",
                                    ExecutionChunk {
                                        task_id: task_id.to_string(),
                                        step_id: step_id.to_string(),
                                        agent_id: agent_id.to_string(),
                                        agent_name: agent_name.to_string(),
                                        chunk_type: "thinking".into(),
                                        chunk: r.to_string(),
                                    },
                                );
                            }
                        }
                    }
                }
            }
            None => break,
        }
    }

    // Extract thinking from <think> tags if not already captured via reasoning_content
    if full_thinking.is_empty() {
        if let Some(start) = full_content.find("<think>") {
            if let Some(end) = full_content.find("</think>") {
                full_thinking = full_content[start + 7..end].trim().to_string();
                let before = &full_content[..start];
                let after = &full_content[end + 8..];
                full_content = format!("{}{}", before, after).trim().to_string();
            }
        }
    }

    if tokens_in == 0 {
        tokens_in = (system_prompt.len() + user_prompt.len()) as i64 / 4;
    }
    if tokens_out == 0 {
        tokens_out = (full_content.len() + full_thinking.len()) as i64 / 4;
    }

    Ok((full_content, full_thinking, tokens_in, tokens_out))
}

async fn create_message(
    pool: &SqlitePool,
    task_id: &str,
    run_id: Option<&str>,
    sender_type: &str,
    sender_id: Option<&str>,
    sender_name: Option<&str>,
    content: &str,
    content_type: &str,
    metadata_json: Option<&str>,
) -> Result<(), String> {
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO execution_messages (id, task_id, run_id, sender_type, sender_id, sender_name, content, content_type, metadata_json) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
    )
    .bind(&id)
    .bind(task_id)
    .bind(run_id)
    .bind(sender_type)
    .bind(sender_id)
    .bind(sender_name)
    .bind(content)
    .bind(content_type)
    .bind(metadata_json)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

async fn set_task_status(pool: &SqlitePool, task_id: &str, status: &str) -> Result<(), String> {
    sqlx::query("UPDATE tasks SET status = ?1, updated_at = datetime('now') WHERE id = ?2")
        .bind(status)
        .bind(task_id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

async fn set_task_status_completed(pool: &SqlitePool, task_id: &str) -> Result<(), String> {
    sqlx::query(
        "UPDATE tasks SET status = 'completed', progress = 100, \
         updated_at = datetime('now'), completed_at = datetime('now') WHERE id = ?1",
    )
    .bind(task_id)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

async fn set_run_status(pool: &SqlitePool, run_id: &str, status: &str) -> Result<(), String> {
    sqlx::query("UPDATE task_runs SET status = ?1 WHERE id = ?2")
        .bind(status)
        .bind(run_id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

async fn set_run_status_completed(pool: &SqlitePool, run_id: &str) -> Result<(), String> {
    sqlx::query(
        "UPDATE task_runs SET status = 'completed', progress = 100, completed_at = datetime('now') WHERE id = ?1",
    )
    .bind(run_id)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}
