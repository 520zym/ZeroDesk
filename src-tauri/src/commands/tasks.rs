use sqlx::SqlitePool;
use tauri::State;

use crate::models::{ExecutionMessage, Task, TaskStats, TaskStep};

#[tauri::command]
pub async fn list_tasks(
    pool: State<'_, SqlitePool>,
    workspace_id: String,
) -> Result<Vec<Task>, String> {
    sqlx::query_as::<_, Task>(
        "SELECT * FROM tasks WHERE workspace_id = ?1 ORDER BY updated_at DESC",
    )
    .bind(&workspace_id)
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
    workspace_id: String,
    title: String,
    description: Option<String>,
    goal: Option<String>,
    cost_tier: Option<String>,
    plan_mode: Option<String>,
    timeout_minutes: Option<i64>,
) -> Result<Task, String> {
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO tasks (id, workspace_id, title, description, goal, cost_tier, plan_mode, timeout_minutes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
    )
    .bind(&id)
    .bind(&workspace_id)
    .bind(&title)
    .bind(&description)
    .bind(&goal)
    .bind(&cost_tier.unwrap_or_else(|| "standard".into()))
    .bind(&plan_mode.unwrap_or_else(|| "ai".into()))
    .bind(timeout_minutes)
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
    let completed_at = if status == "completed" {
        Some("datetime('now')".to_string())
    } else {
        None
    };

    if completed_at.is_some() {
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
    workspace_id: String,
) -> Result<TaskStats, String> {
    let total: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM tasks WHERE workspace_id = ?1")
            .bind(&workspace_id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| e.to_string())?;

    let running: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM tasks WHERE workspace_id = ?1 AND status = 'running'",
    )
    .bind(&workspace_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let completed: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM tasks WHERE workspace_id = ?1 AND status = 'completed'",
    )
    .bind(&workspace_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let failed: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM tasks WHERE workspace_id = ?1 AND status = 'failed'",
    )
    .bind(&workspace_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let draft: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM tasks WHERE workspace_id = ?1 AND status = 'draft'",
    )
    .bind(&workspace_id)
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
