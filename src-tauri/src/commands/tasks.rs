use sqlx::SqlitePool;
use tauri::State;

use crate::db::DEFAULT_WORKSPACE_ID;
use crate::models::{ExecutionMessage, Task, TaskStats, TaskStep};

#[tauri::command]
pub async fn list_tasks(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<Task>, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    sqlx::query_as::<_, Task>(
        "SELECT * FROM tasks WHERE workspace_id = ?1 ORDER BY updated_at DESC",
    )
    .bind(workspace_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_task(pool: State<'_, SqlitePool>, id: String) -> Result<Task, String> {
    sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_task(
    pool: State<'_, SqlitePool>,
    title: String,
    description: Option<String>,
    goal: Option<String>,
    cost_tier: Option<String>,
    plan_mode: Option<String>,
    timeout_minutes: Option<i64>,
    quality_gate: Option<String>,
    retry_policy: Option<String>,
    over_budget_policy: Option<String>,
    team_id: Option<String>,
) -> Result<Task, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO tasks (id, workspace_id, title, description, goal, cost_tier, plan_mode, timeout_minutes, quality_gate, retry_policy, over_budget_policy, team_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
    )
    .bind(&id)
    .bind(workspace_id)
    .bind(&title)
    .bind(&description)
    .bind(&goal)
    .bind(&cost_tier.unwrap_or_else(|| "standard".into()))
    .bind(&plan_mode.unwrap_or_else(|| "ai".into()))
    .bind(timeout_minutes)
    .bind(&quality_gate)
    .bind(&retry_policy)
    .bind(&over_budget_policy)
    .bind(&team_id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_task_status(
    pool: State<'_, SqlitePool>,
    id: String,
    status: String,
) -> Result<Task, String> {
    if status == "completed" {
        sqlx::query(
            "UPDATE tasks SET status = ?1, updated_at = datetime('now'), completed_at = datetime('now') WHERE id = ?2",
        )
        .bind(&status)
        .bind(&id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    } else {
        sqlx::query("UPDATE tasks SET status = ?1, updated_at = datetime('now') WHERE id = ?2")
            .bind(&status)
            .bind(&id)
            .execute(pool.inner())
            .await
            .map_err(|e| e.to_string())?;
    }

    sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_task_stats(
    pool: State<'_, SqlitePool>,
) -> Result<TaskStats, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;

    let total: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM tasks WHERE workspace_id = ?1")
            .bind(workspace_id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| e.to_string())?;

    let running: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM tasks WHERE workspace_id = ?1 AND status = 'running'",
    )
    .bind(workspace_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let completed: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM tasks WHERE workspace_id = ?1 AND status = 'completed'",
    )
    .bind(workspace_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let failed: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM tasks WHERE workspace_id = ?1 AND status = 'failed'",
    )
    .bind(workspace_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let draft: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM tasks WHERE workspace_id = ?1 AND status = 'draft'",
    )
    .bind(workspace_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(TaskStats {
        total: total.0,
        running: running.0,
        completed: completed.0,
        failed: failed.0,
        draft: draft.0,
    })
}

#[tauri::command]
pub async fn list_task_steps(
    pool: State<'_, SqlitePool>,
    task_id: String,
) -> Result<Vec<TaskStep>, String> {
    sqlx::query_as::<_, TaskStep>(
        "SELECT * FROM task_steps WHERE task_id = ?1 ORDER BY step_order ASC",
    )
    .bind(&task_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_task_step(
    pool: State<'_, SqlitePool>,
    task_id: String,
    step_order: i64,
    name: String,
    description: Option<String>,
    agent_id: Option<String>,
    output_target: Option<String>,
) -> Result<TaskStep, String> {
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO task_steps (id, task_id, step_order, name, description, agent_id, output_target)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
    )
    .bind(&id)
    .bind(&task_id)
    .bind(step_order)
    .bind(&name)
    .bind(&description)
    .bind(&agent_id)
    .bind(&output_target.unwrap_or_else(|| "next".into()))
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, TaskStep>("SELECT * FROM task_steps WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_execution_messages(
    pool: State<'_, SqlitePool>,
    task_id: String,
) -> Result<Vec<ExecutionMessage>, String> {
    sqlx::query_as::<_, ExecutionMessage>(
        "SELECT * FROM execution_messages WHERE task_id = ?1 ORDER BY created_at ASC",
    )
    .bind(&task_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_execution_message(
    pool: State<'_, SqlitePool>,
    task_id: String,
    sender_type: String,
    sender_id: Option<String>,
    sender_name: Option<String>,
    content: String,
    content_type: Option<String>,
    metadata_json: Option<String>,
) -> Result<ExecutionMessage, String> {
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO execution_messages (id, task_id, sender_type, sender_id, sender_name, content, content_type, metadata_json)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
    )
    .bind(&id)
    .bind(&task_id)
    .bind(&sender_type)
    .bind(&sender_id)
    .bind(&sender_name)
    .bind(&content)
    .bind(&content_type.unwrap_or_else(|| "text".into()))
    .bind(&metadata_json)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, ExecutionMessage>("SELECT * FROM execution_messages WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_task_step_status(
    pool: State<'_, SqlitePool>,
    id: String,
    status: String,
    tokens_used: Option<i64>,
    duration_seconds: Option<f64>,
) -> Result<TaskStep, String> {
    sqlx::query(
        "UPDATE task_steps SET status = ?1, tokens_used = COALESCE(?3, tokens_used), duration_seconds = COALESCE(?4, duration_seconds) WHERE id = ?2",
    )
    .bind(&status)
    .bind(&id)
    .bind(tokens_used)
    .bind(duration_seconds)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, TaskStep>("SELECT * FROM task_steps WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_task(
    pool: State<'_, SqlitePool>,
    id: String,
) -> Result<(), String> {
    sqlx::query("DELETE FROM tasks WHERE id = ?1")
        .bind(&id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn update_task(
    pool: State<'_, SqlitePool>,
    id: String,
    total_tokens: Option<i64>,
    total_cost: Option<f64>,
    progress: Option<i64>,
) -> Result<Task, String> {
    sqlx::query(
        "UPDATE tasks SET total_tokens = COALESCE(?2, total_tokens), total_cost = COALESCE(?3, total_cost), progress = COALESCE(?4, progress), updated_at = datetime('now') WHERE id = ?1",
    )
    .bind(&id)
    .bind(total_tokens)
    .bind(total_cost)
    .bind(progress)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_task_step(
    pool: State<'_, SqlitePool>,
    id: String,
    name: Option<String>,
    description: Option<String>,
    agent_id: Option<String>,
    output_target: Option<String>,
    step_order: Option<i64>,
) -> Result<TaskStep, String> {
    sqlx::query(
        "UPDATE task_steps SET name = COALESCE(?2, name), description = COALESCE(?3, description), agent_id = COALESCE(?4, agent_id), output_target = COALESCE(?5, output_target), step_order = COALESCE(?6, step_order) WHERE id = ?1",
    )
    .bind(&id)
    .bind(&name)
    .bind(&description)
    .bind(&agent_id)
    .bind(&output_target)
    .bind(step_order)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, TaskStep>("SELECT * FROM task_steps WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_task_step(
    pool: State<'_, SqlitePool>,
    id: String,
) -> Result<(), String> {
    sqlx::query("DELETE FROM task_steps WHERE id = ?1")
        .bind(&id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn reorder_task_steps(
    pool: State<'_, SqlitePool>,
    step_ids: Vec<String>,
) -> Result<(), String> {
    for (i, step_id) in step_ids.iter().enumerate() {
        sqlx::query("UPDATE task_steps SET step_order = ?1 WHERE id = ?2")
            .bind((i + 1) as i64)
            .bind(step_id)
            .execute(pool.inner())
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn list_running_tasks(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<Task>, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    sqlx::query_as::<_, Task>(
        "SELECT * FROM tasks WHERE workspace_id = ?1 AND status = 'running' ORDER BY updated_at DESC",
    )
    .bind(workspace_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}
