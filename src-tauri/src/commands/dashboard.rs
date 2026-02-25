use sqlx::SqlitePool;
use tauri::State;

use crate::db::DEFAULT_WORKSPACE_ID;
use crate::models::{DashboardKpi, HistoryStats, Task};

#[tauri::command]
pub async fn get_dashboard_kpis(
    pool: State<'_, SqlitePool>,
) -> Result<DashboardKpi, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;

    let total_tasks: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM tasks WHERE workspace_id = ?1")
            .bind(workspace_id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| e.to_string())?;

    let running_tasks: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM tasks WHERE workspace_id = ?1 AND status = 'running'",
    )
    .bind(workspace_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let completed_tasks: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM tasks WHERE workspace_id = ?1 AND status = 'completed'",
    )
    .bind(workspace_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let failed_tasks: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM tasks WHERE workspace_id = ?1 AND status = 'failed'",
    )
    .bind(workspace_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let total_agents: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM agents WHERE workspace_id = ?1")
            .bind(workspace_id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| e.to_string())?;

    let total_teams: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM teams WHERE workspace_id = ?1")
            .bind(workspace_id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| e.to_string())?;

    let token_cost: (i64, f64) = sqlx::query_as(
        "SELECT COALESCE(SUM(total_tokens), 0), COALESCE(SUM(total_cost), 0.0) FROM tasks WHERE workspace_id = ?1",
    )
    .bind(workspace_id)
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
) -> Result<HistoryStats, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;

    let total: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM tasks WHERE workspace_id = ?1 AND status IN ('completed','failed')",
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

    let cost: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(total_cost), 0.0) FROM tasks WHERE workspace_id = ?1 AND status IN ('completed','failed')",
    )
    .bind(workspace_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let avg_dur: (f64,) = sqlx::query_as(
        "SELECT COALESCE(AVG((julianday(completed_at) - julianday(created_at)) * 86400), 0.0) FROM tasks WHERE workspace_id = ?1 AND status IN ('completed','failed') AND completed_at IS NOT NULL",
    )
    .bind(workspace_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let success_rate = if total.0 > 0 {
        (completed.0 as f64 / total.0 as f64) * 100.0
    } else {
        0.0
    };

    Ok(HistoryStats {
        total: total.0,
        completed: completed.0,
        failed: failed.0,
        success_rate,
        avg_duration_seconds: avg_dur.0,
        total_cost: cost.0,
    })
}

#[tauri::command]
pub async fn list_history_tasks(
    pool: State<'_, SqlitePool>,
    status_filter: Option<String>,
    search: Option<String>,
) -> Result<Vec<Task>, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;

    let search_pattern = search
        .filter(|s| !s.is_empty())
        .map(|s| format!("%{}%", s));

    match (&status_filter, &search_pattern) {
        (Some(status), Some(pattern)) => {
            sqlx::query_as::<_, Task>(
                "SELECT * FROM tasks WHERE workspace_id = ?1 AND status = ?2 AND title LIKE ?3 ORDER BY updated_at DESC",
            )
            .bind(workspace_id)
            .bind(status)
            .bind(pattern)
            .fetch_all(pool.inner())
            .await
            .map_err(|e| e.to_string())
        }
        (Some(status), None) => {
            sqlx::query_as::<_, Task>(
                "SELECT * FROM tasks WHERE workspace_id = ?1 AND status = ?2 ORDER BY updated_at DESC",
            )
            .bind(workspace_id)
            .bind(status)
            .fetch_all(pool.inner())
            .await
            .map_err(|e| e.to_string())
        }
        (None, Some(pattern)) => {
            sqlx::query_as::<_, Task>(
                "SELECT * FROM tasks WHERE workspace_id = ?1 AND status IN ('completed','failed','archived') AND title LIKE ?2 ORDER BY updated_at DESC",
            )
            .bind(workspace_id)
            .bind(pattern)
            .fetch_all(pool.inner())
            .await
            .map_err(|e| e.to_string())
        }
        (None, None) => {
            sqlx::query_as::<_, Task>(
                "SELECT * FROM tasks WHERE workspace_id = ?1 AND status IN ('completed','failed','archived') ORDER BY updated_at DESC",
            )
            .bind(workspace_id)
            .fetch_all(pool.inner())
            .await
            .map_err(|e| e.to_string())
        }
    }
}
