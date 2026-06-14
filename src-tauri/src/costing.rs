use serde_json::Value;
use sqlx::SqlitePool;

#[derive(Debug, Clone, Copy)]
pub struct ModelPrice {
    pub input: f64,
    pub output: f64,
}

#[derive(Debug, Clone, Copy)]
pub struct UsageCost {
    pub tokens: i64,
    pub cost: f64,
}

pub fn lookup_default_model_price(model_name: &str) -> Option<ModelPrice> {
    let id = model_name.to_lowercase();

    let price = if id.contains("deepseek-v4-flash") || id.contains("v4-flash") {
        ModelPrice {
            input: 0.14,
            output: 0.28,
        }
    } else if id.contains("deepseek-v4-pro") || id.contains("v4-pro") {
        ModelPrice {
            input: 0.435,
            output: 0.87,
        }
    } else if id.contains("deepseek-reasoner") || id.contains("deepseek-r1") {
        ModelPrice {
            input: 0.55,
            output: 2.19,
        }
    } else if id.contains("deepseek-chat") {
        ModelPrice {
            input: 0.27,
            output: 1.10,
        }
    } else if id.contains("deepseek-v3.2") {
        ModelPrice {
            input: 0.28,
            output: 0.42,
        }
    } else if id.contains("deepseek-v3.1") {
        ModelPrice {
            input: 0.55,
            output: 1.67,
        }
    } else if id.contains("deepseek-v3") {
        ModelPrice {
            input: 0.28,
            output: 1.11,
        }
    } else if id.contains("claude-fable-5") || id.contains("claude-mythos-5") {
        ModelPrice {
            input: 10.0,
            output: 50.0,
        }
    } else if id.contains("claude-opus-4-8")
        || id.contains("claude-opus-4-7")
        || id.contains("claude-opus-4-6")
        || id.contains("claude-opus-4-5")
    {
        ModelPrice {
            input: 5.0,
            output: 25.0,
        }
    } else if id.contains("claude-opus-4") {
        ModelPrice {
            input: 15.0,
            output: 75.0,
        }
    } else if id.contains("claude-sonnet-4") || id.contains("claude-3-5-sonnet") {
        ModelPrice {
            input: 3.0,
            output: 15.0,
        }
    } else if id.contains("claude-haiku-4-5") {
        ModelPrice {
            input: 1.0,
            output: 5.0,
        }
    } else if id.contains("claude-3-5-haiku") {
        ModelPrice {
            input: 0.8,
            output: 4.0,
        }
    } else if id.contains("gpt-5.5") {
        ModelPrice {
            input: 5.0,
            output: 30.0,
        }
    } else if id.contains("gpt-5.4-mini") {
        ModelPrice {
            input: 0.75,
            output: 4.5,
        }
    } else if id.contains("gpt-5.4-nano") {
        ModelPrice {
            input: 0.20,
            output: 1.25,
        }
    } else if id.contains("gpt-5.4") {
        ModelPrice {
            input: 2.5,
            output: 15.0,
        }
    } else if id.contains("gpt-5.2") || id.contains("gpt-5.3-codex") {
        ModelPrice {
            input: 1.75,
            output: 14.0,
        }
    } else if id.contains("gpt-5-mini") {
        ModelPrice {
            input: 0.25,
            output: 2.0,
        }
    } else if id.contains("gpt-5-nano") {
        ModelPrice {
            input: 0.05,
            output: 0.40,
        }
    } else if id.contains("gpt-5") {
        ModelPrice {
            input: 1.25,
            output: 10.0,
        }
    } else if id.contains("codex-mini") {
        ModelPrice {
            input: 0.75,
            output: 3.0,
        }
    } else if id.contains("gpt-4.1-nano") {
        ModelPrice {
            input: 0.10,
            output: 0.40,
        }
    } else if id.contains("gpt-4.1-mini") {
        ModelPrice {
            input: 0.40,
            output: 1.60,
        }
    } else if id.contains("gpt-4.1") {
        ModelPrice {
            input: 2.0,
            output: 8.0,
        }
    } else if id.contains("o3-pro") {
        ModelPrice {
            input: 20.0,
            output: 80.0,
        }
    } else if id.contains("o3-mini") || id.contains("o1-mini") {
        ModelPrice {
            input: 0.55,
            output: 2.20,
        }
    } else if id.contains("o4-mini") {
        ModelPrice {
            input: 1.10,
            output: 4.40,
        }
    } else if id.contains("o3") {
        ModelPrice {
            input: 2.0,
            output: 8.0,
        }
    } else if id.contains("o1") {
        ModelPrice {
            input: 15.0,
            output: 60.0,
        }
    } else if id.contains("gemini-3.5-flash") {
        ModelPrice {
            input: 1.50,
            output: 9.0,
        }
    } else if id.contains("gemini-3.1-pro-preview") || id.contains("gemini-3-pro-preview") {
        ModelPrice {
            input: 2.0,
            output: 12.0,
        }
    } else if id.contains("gemini-3.1-flash-lite") {
        ModelPrice {
            input: 0.25,
            output: 1.50,
        }
    } else if id.contains("gemini-3-flash-preview") {
        ModelPrice {
            input: 0.50,
            output: 3.0,
        }
    } else if id.contains("gemini-2.5-pro") {
        ModelPrice {
            input: 1.25,
            output: 10.0,
        }
    } else if id.contains("gemini-2.5-flash-lite") {
        ModelPrice {
            input: 0.10,
            output: 0.40,
        }
    } else if id.contains("gemini-2.5-flash") {
        ModelPrice {
            input: 0.30,
            output: 2.50,
        }
    } else if id.contains("gemini-2.0-flash") {
        ModelPrice {
            input: 0.10,
            output: 0.40,
        }
    } else if id.contains("step-3.7-flash") {
        ModelPrice {
            input: 0.19,
            output: 1.13,
        }
    } else if id.contains("step-3.5-flash") {
        ModelPrice {
            input: 0.10,
            output: 0.30,
        }
    } else if id.contains("doubao-seed-2-0-lite") {
        ModelPrice {
            input: 0.08,
            output: 0.50,
        }
    } else if id.contains("doubao-seed-2-0-mini") {
        ModelPrice {
            input: 0.03,
            output: 0.31,
        }
    } else if id.contains("doubao-seed-2-0-pro")
        || id.contains("doubao-seed-2-0-code")
        || id.contains("doubao-seed-2-0-code-preview")
    {
        ModelPrice {
            input: 0.47,
            output: 2.37,
        }
    } else if id.contains("doubao-seed-code") {
        ModelPrice {
            input: 0.17,
            output: 1.11,
        }
    } else if id.contains("kimi-k2-turbo") {
        ModelPrice {
            input: 1.11,
            output: 8.06,
        }
    } else if id.contains("kimi-k2.7-code") {
        ModelPrice {
            input: 0.95,
            output: 4.0,
        }
    } else if id.contains("kimi-k2.6") {
        ModelPrice {
            input: 0.95,
            output: 4.0,
        }
    } else if id.contains("kimi-k2.5") {
        ModelPrice {
            input: 0.60,
            output: 3.0,
        }
    } else if id.contains("kimi-k2") {
        ModelPrice {
            input: 0.55,
            output: 2.20,
        }
    } else if id.contains("minimax-m2.7-highspeed") {
        ModelPrice {
            input: 0.60,
            output: 2.40,
        }
    } else if id.contains("minimax-m2.7") {
        ModelPrice {
            input: 0.30,
            output: 1.20,
        }
    } else if id.contains("minimax-m3") {
        ModelPrice {
            input: 0.60,
            output: 2.40,
        }
    } else if id.contains("minimax-m2.5-lightning") {
        ModelPrice {
            input: 0.30,
            output: 2.40,
        }
    } else if id.contains("minimax-m2.5") {
        ModelPrice {
            input: 0.15,
            output: 0.95,
        }
    } else if id.contains("minimax-m2") {
        ModelPrice {
            input: 0.27,
            output: 0.95,
        }
    } else if id.contains("mimo-v2.5-pro") || id.contains("mimo-v2-pro") {
        ModelPrice {
            input: 0.435,
            output: 0.87,
        }
    } else if id.contains("mimo-v2.5") {
        ModelPrice {
            input: 0.14,
            output: 0.29,
        }
    } else if id.contains("mimo-v2-flash") {
        ModelPrice {
            input: 0.09,
            output: 0.29,
        }
    } else if id.contains("qwen3.7-max") {
        ModelPrice {
            input: 2.50,
            output: 7.50,
        }
    } else if id.contains("qwen3.7-plus") {
        ModelPrice {
            input: 0.40,
            output: 1.60,
        }
    } else if id.contains("qwen3.6-plus") {
        ModelPrice {
            input: 0.325,
            output: 1.95,
        }
    } else if id.contains("qwen3.5-plus") {
        ModelPrice {
            input: 0.26,
            output: 1.56,
        }
    } else if id.contains("qwen3-coder-plus") {
        ModelPrice {
            input: 0.65,
            output: 3.25,
        }
    } else if id.contains("qwen3-coder-flash") {
        ModelPrice {
            input: 0.195,
            output: 0.975,
        }
    } else if id.contains("qwen3-coder-next") {
        ModelPrice {
            input: 0.12,
            output: 0.75,
        }
    } else if id.contains("qwen3-coder-480b") {
        ModelPrice {
            input: 0.65,
            output: 3.25,
        }
    } else if id.contains("qwen3-235b-a22b") {
        ModelPrice {
            input: 0.70,
            output: 8.40,
        }
    } else if id.contains("qwen3-32b") {
        ModelPrice {
            input: 0.16,
            output: 0.64,
        }
    } else if id.contains("qwq-plus") {
        ModelPrice {
            input: 0.80,
            output: 2.40,
        }
    } else if id.contains("qwq-32b") {
        ModelPrice {
            input: 0.20,
            output: 0.60,
        }
    } else if id.contains("qwen3-max") {
        ModelPrice {
            input: 0.78,
            output: 3.90,
        }
    } else if id.contains("glm-5.1") {
        ModelPrice {
            input: 1.40,
            output: 4.40,
        }
    } else if id.contains("glm-5") {
        ModelPrice {
            input: 1.0,
            output: 3.20,
        }
    } else if id.contains("glm-4.7") || id.contains("glm-4.6") {
        ModelPrice {
            input: 0.60,
            output: 2.20,
        }
    } else if id.contains("grok-4.20") || id.contains("grok-4.3") {
        ModelPrice {
            input: 1.25,
            output: 2.50,
        }
    } else if id.contains("grok-4-1-fast") {
        ModelPrice {
            input: 0.20,
            output: 0.50,
        }
    } else if id.contains("grok-code-fast-1") || id.contains("grok-build-0.1") {
        ModelPrice {
            input: 1.0,
            output: 2.0,
        }
    } else if id.contains("grok-3-mini") {
        ModelPrice {
            input: 0.25,
            output: 0.50,
        }
    } else if id.contains("grok-4") || id.contains("grok-3") {
        ModelPrice {
            input: 3.0,
            output: 15.0,
        }
    } else if id.contains("mistral-medium-3.5") {
        ModelPrice {
            input: 1.50,
            output: 7.50,
        }
    } else if id.contains("mistral-small-4") || id.contains("devstral-small-2") {
        ModelPrice {
            input: 0.10,
            output: 0.30,
        }
    } else if id.contains("magistral-small") {
        ModelPrice {
            input: 0.50,
            output: 1.50,
        }
    } else if id.contains("codestral-2508") {
        ModelPrice {
            input: 0.30,
            output: 0.90,
        }
    } else if id.contains("devstral-small-1.1") {
        ModelPrice {
            input: 0.07,
            output: 0.28,
        }
    } else if id.contains("devstral-2") || id.contains("devstral-medium") {
        ModelPrice {
            input: 0.40,
            output: 2.0,
        }
    } else if id.contains("mistral-large-3") {
        ModelPrice {
            input: 0.50,
            output: 1.50,
        }
    } else if id.contains("mistral-medium-3.1") {
        ModelPrice {
            input: 0.40,
            output: 2.0,
        }
    } else if id.contains("mistral-small-3.2") {
        ModelPrice {
            input: 0.075,
            output: 0.20,
        }
    } else if id.contains("magistral-medium") {
        ModelPrice {
            input: 2.0,
            output: 5.0,
        }
    } else if id.contains("command-a") || id.contains("command-r-plus") {
        ModelPrice {
            input: 2.50,
            output: 10.0,
        }
    } else if id.contains("command-r") {
        ModelPrice {
            input: 0.15,
            output: 0.60,
        }
    } else {
        return None;
    };

    Some(price)
}

pub async fn effective_model_price(
    pool: &SqlitePool,
    model_name: &str,
    stored_input_price: Option<f64>,
) -> ModelPrice {
    let default = lookup_default_model_price(model_name).unwrap_or(ModelPrice {
        input: 0.0,
        output: 0.0,
    });

    if let Some(price) = stored_input_price.filter(|v| v.is_finite() && *v > 0.0) {
        return ModelPrice {
            input: price,
            output: if default.output > 0.0 {
                default.output
            } else {
                price
            },
        };
    }

    let db_price: Option<(Option<f64>,)> = sqlx::query_as(
        "SELECT price_per_million_tokens FROM models WHERE lower(name) = lower(?1) LIMIT 1",
    )
    .bind(model_name)
    .fetch_optional(pool)
    .await
    .ok()
    .flatten();

    if let Some((Some(price),)) =
        db_price.filter(|(p,)| p.is_some_and(|v| v.is_finite() && v > 0.0))
    {
        return ModelPrice {
            input: price,
            output: if default.output > 0.0 {
                default.output
            } else {
                price
            },
        };
    }

    default
}

pub fn calculate_cost(input_tokens: i64, output_tokens: i64, price: ModelPrice) -> f64 {
    (input_tokens.max(0) as f64 * price.input + output_tokens.max(0) as f64 * price.output)
        / 1_000_000.0
}

pub async fn calculate_task_usage_cost(
    pool: &SqlitePool,
    task_id: &str,
    run_id: Option<&str>,
) -> Result<UsageCost, String> {
    let messages: Vec<(Option<String>,)> = if let Some(run_id) = run_id {
        sqlx::query_as(
            "SELECT metadata_json FROM execution_messages \
             WHERE task_id = ?1 AND run_id = ?2 AND sender_type = 'agent' AND metadata_json IS NOT NULL",
        )
        .bind(task_id)
        .bind(run_id)
        .fetch_all(pool)
        .await
    } else {
        sqlx::query_as(
            "SELECT metadata_json FROM execution_messages \
             WHERE task_id = ?1 AND sender_type = 'agent' AND metadata_json IS NOT NULL",
        )
        .bind(task_id)
        .fetch_all(pool)
        .await
    }
    .map_err(|e| e.to_string())?;

    let mut usage = UsageCost {
        tokens: 0,
        cost: 0.0,
    };

    for (metadata_json,) in messages {
        let Some(metadata_json) = metadata_json else {
            continue;
        };
        let Ok(metadata) = serde_json::from_str::<Value>(&metadata_json) else {
            continue;
        };
        let model_name = metadata.get("model").and_then(Value::as_str).unwrap_or("");
        let input_tokens = metadata
            .get("tokens_input")
            .and_then(Value::as_i64)
            .unwrap_or(0);
        let output_tokens = metadata
            .get("tokens_output")
            .and_then(Value::as_i64)
            .unwrap_or(0);
        let price = effective_model_price(pool, model_name, None).await;
        usage.tokens += input_tokens.max(0) + output_tokens.max(0);
        usage.cost += calculate_cost(input_tokens, output_tokens, price);
    }

    if usage.tokens > 0 {
        return Ok(usage);
    }

    calculate_task_step_usage_cost(pool, task_id, run_id).await
}

async fn calculate_task_step_usage_cost(
    pool: &SqlitePool,
    task_id: &str,
    run_id: Option<&str>,
) -> Result<UsageCost, String> {
    let rows: Vec<(Option<i64>, Option<String>, Option<f64>)> = if let Some(run_id) = run_id {
        sqlx::query_as(
            "SELECT ts.tokens_used, m.name, m.price_per_million_tokens \
             FROM task_steps ts \
             LEFT JOIN agents a ON ts.agent_id = a.id \
             LEFT JOIN models m ON a.model_id = m.id \
             WHERE ts.task_id = ?1 AND ts.run_id = ?2",
        )
        .bind(task_id)
        .bind(run_id)
        .fetch_all(pool)
        .await
    } else {
        sqlx::query_as(
            "SELECT ts.tokens_used, m.name, m.price_per_million_tokens \
             FROM task_steps ts \
             LEFT JOIN agents a ON ts.agent_id = a.id \
             LEFT JOIN models m ON a.model_id = m.id \
             WHERE ts.task_id = ?1",
        )
        .bind(task_id)
        .fetch_all(pool)
        .await
    }
    .map_err(|e| e.to_string())?;

    let mut usage = UsageCost {
        tokens: 0,
        cost: 0.0,
    };
    for (tokens, model_name, stored_price) in rows {
        let tokens = tokens.unwrap_or(0).max(0);
        let model_name = model_name.unwrap_or_default();
        let price = effective_model_price(pool, &model_name, stored_price).await;
        usage.tokens += tokens;
        usage.cost += tokens as f64 * price.input / 1_000_000.0;
    }

    Ok(usage)
}

pub async fn recalculate_task_totals(
    pool: &SqlitePool,
    task_id: &str,
) -> Result<UsageCost, String> {
    let latest_run: Option<(String,)> = sqlx::query_as(
        "SELECT id FROM task_runs WHERE task_id = ?1 ORDER BY run_number DESC LIMIT 1",
    )
    .bind(task_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?;

    let usage =
        calculate_task_usage_cost(pool, task_id, latest_run.as_ref().map(|(id,)| id.as_str()))
            .await?;

    sqlx::query("UPDATE tasks SET total_tokens = ?1, total_cost = ?2 WHERE id = ?3")
        .bind(usage.tokens)
        .bind(usage.cost)
        .bind(task_id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

    if let Some((run_id,)) = latest_run {
        sqlx::query("UPDATE task_runs SET total_tokens = ?1, total_cost = ?2 WHERE id = ?3")
            .bind(usage.tokens)
            .bind(usage.cost)
            .bind(run_id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
    }

    Ok(usage)
}
