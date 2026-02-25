use sqlx::SqlitePool;
use tauri::State;

use crate::models::{DashboardKpi, HistoryStats, Task};

#[tauri::command]
pub async fn get_dashboard_kpis(
    pool: State<'_, SqlitePool>,
    workspace_id: String,
) -> Result<DashboardKpi, String> {
    let total_tasks: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM tasks WHERE workspace_id = ?1")
            .bind(&workspace_id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| e.to_string())?;

    let running_tasks: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM tasks WHERE workspace_id = ?1 AND status = 'running'",
    )
    .bind(&workspace_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let completed_tasks: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM tasks WHERE workspace_id = ?1 AND status = 'completed'",
    )
    .bind(&workspace_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let failed_tasks: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM tasks WHERE workspace_id = ?1 AND status = 'failed'",
    )
    .bind(&workspace_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let total_agents: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM agents WHERE workspace_id = ?1")
            .bind(&workspace_id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| e.to_string())?;

    let total_teams: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM teams WHERE workspace_id = ?1")
            .bind(&workspace_id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| e.to_string())?;

    let token_cost: (i64, f64) = sqlx::query_as(
        "SELECT COALESCE(SUM(total_tokens), 0), COALESCE(SUM(total_cost), 0.0) FROM tasks WHERE workspace_id = ?1",
    )
    .bind(&workspace_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(DashboardKpi {
        total_tasks: total_tasks.0,
        running_tasks: running_tasks.0,
        completed_tasks: completed_tasks.0,
        failed_tasks: failed_tasks.0,
        total_agents: total_agents.0,
        total_teams: total_teams.0,
        total_tokens: token_cost.0,
        total_cost: token_cost.1,
    })
}

#[tauri::command]
pub async fn get_history_stats(
    pool: State<'_, SqlitePool>,
    workspace_id: String,
) -> Result<HistoryStats, String> {
    let total: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM tasks WHERE workspace_id = ?1 AND status IN ('completed','failed')",
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

    let cost: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(total_cost), 0.0) FROM tasks WHERE workspace_id = ?1 AND status IN ('completed','failed')",
    )
    .bind(&workspace_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(HistoryStats {
        total: total.0,
        completed: completed.0,
        failed: failed.0,
        avg_duration_seconds: 0.0,
        total_cost: cost.0,
    })
}

#[tauri::command]
pub async fn list_history_tasks(
    pool: State<'_, SqlitePool>,
    workspace_id: String,
    status_filter: Option<String>,
) -> Result<Vec<Task>, String> {
    if let Some(status) = status_filter {
        sqlx::query_as::<_, Task>(
            "SELECT * FROM tasks WHERE workspace_id = ?1 AND status = ?2 ORDER BY updated_at DESC",
        )
        .bind(&workspace_id)
        .bind(&status)
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())
    } else {
        sqlx::query_as::<_, Task>(
            "SELECT * FROM tasks WHERE workspace_id = ?1 AND status IN ('completed','failed','archived') ORDER BY updated_at DESC",
        )
        .bind(&workspace_id)
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())
    }
}
