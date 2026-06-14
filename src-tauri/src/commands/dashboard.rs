use sqlx::SqlitePool;
use tauri::State;

use crate::costing::recalculate_task_totals;
use crate::db::DEFAULT_WORKSPACE_ID;
use crate::models::{
    AgentUsageRank, CostDistributionEntry, DailyTaskCount, DashboardKpi, DurationBucket,
    HistoryStats, Task,
};

#[tauri::command]
pub async fn get_dashboard_kpis(pool: State<'_, SqlitePool>) -> Result<DashboardKpi, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;

    let total_tasks: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM tasks WHERE workspace_id = ?1")
        .bind(workspace_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let running_tasks: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM tasks WHERE workspace_id = ?1 AND status = 'running'")
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

    let failed_tasks: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM tasks WHERE workspace_id = ?1 AND status = 'failed'")
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

    let total_teams: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM teams WHERE workspace_id = ?1")
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
pub async fn get_history_stats(pool: State<'_, SqlitePool>) -> Result<HistoryStats, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;

    let total: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM tasks WHERE workspace_id = ?1 AND status IN ('running','completed','failed')",
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

    let failed: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM tasks WHERE workspace_id = ?1 AND status = 'failed'")
            .bind(workspace_id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| e.to_string())?;

    let task_ids: Vec<(String,)> = sqlx::query_as(
        "SELECT id FROM tasks WHERE workspace_id = ?1 AND status IN ('running','completed','failed')",
    )
    .bind(workspace_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;
    let mut total_cost = 0.0;
    for (task_id,) in task_ids {
        total_cost += recalculate_task_totals(pool.inner(), &task_id).await?.cost;
    }

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
        total_cost,
    })
}

#[tauri::command]
pub async fn list_history_tasks(
    pool: State<'_, SqlitePool>,
    status_filter: Option<String>,
    search: Option<String>,
) -> Result<Vec<Task>, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;

    let search_pattern = search.filter(|s| !s.is_empty()).map(|s| format!("%{}%", s));

    let mut tasks = match (&status_filter, &search_pattern) {
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
                "SELECT * FROM tasks WHERE workspace_id = ?1 AND status IN ('running','completed','failed','archived') AND title LIKE ?2 ORDER BY updated_at DESC",
            )
            .bind(workspace_id)
            .bind(pattern)
            .fetch_all(pool.inner())
            .await
            .map_err(|e| e.to_string())
        }
        (None, None) => {
            sqlx::query_as::<_, Task>(
                "SELECT * FROM tasks WHERE workspace_id = ?1 AND status IN ('running','completed','failed','archived') ORDER BY updated_at DESC",
            )
            .bind(workspace_id)
            .fetch_all(pool.inner())
            .await
            .map_err(|e| e.to_string())
        }
    }?;

    for task in &mut tasks {
        let usage = recalculate_task_totals(pool.inner(), &task.id).await?;
        task.total_tokens = Some(usage.tokens);
        task.total_cost = Some(usage.cost);
    }

    Ok(tasks)
}

#[tauri::command]
pub async fn get_weekly_task_trend(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<DailyTaskCount>, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    sqlx::query_as::<_, DailyTaskCount>(
        "SELECT date(created_at) as day, COUNT(*) as count \
         FROM tasks WHERE workspace_id = ?1 AND created_at >= date('now', '-6 days') \
         GROUP BY date(created_at) ORDER BY day ASC",
    )
    .bind(workspace_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_agent_usage_ranking(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<AgentUsageRank>, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    sqlx::query_as::<_, AgentUsageRank>(
        "SELECT a.id as agent_id, a.name as agent_name, a.avatar_char, a.avatar_color, \
         COUNT(ts.id) as usage_count \
         FROM agents a LEFT JOIN task_steps ts ON ts.agent_id = a.id \
         WHERE a.workspace_id = ?1 \
         GROUP BY a.id ORDER BY usage_count DESC LIMIT 10",
    )
    .bind(workspace_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_cost_distribution(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<CostDistributionEntry>, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;

    #[derive(sqlx::FromRow)]
    struct RawCost {
        name: String,
        cost: f64,
    }

    let rows = sqlx::query_as::<_, RawCost>(
        "SELECT mp.name, \
         COALESCE(SUM(CAST(ts.tokens_used AS REAL) * COALESCE(m.price_per_million_tokens, 0) / 1000000.0), 0) as cost \
         FROM task_steps ts \
         JOIN agents a ON ts.agent_id = a.id \
         JOIN models m ON a.model_id = m.id \
         JOIN model_providers mp ON m.provider_id = mp.id \
         WHERE a.workspace_id = ?1 \
         GROUP BY mp.id ORDER BY cost DESC",
    )
    .bind(workspace_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let total: f64 = rows.iter().map(|r| r.cost).sum();
    let result = rows
        .into_iter()
        .map(|r| CostDistributionEntry {
            percentage: if total > 0.0 {
                (r.cost / total) * 100.0
            } else {
                0.0
            },
            name: r.name,
            cost: r.cost,
        })
        .collect();

    Ok(result)
}

#[tauri::command]
pub async fn get_task_duration_distribution(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<DurationBucket>, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    sqlx::query_as::<_, DurationBucket>(
        "SELECT \
           CASE \
             WHEN (julianday(completed_at) - julianday(created_at)) * 1440 < 1 THEN '<1m' \
             WHEN (julianday(completed_at) - julianday(created_at)) * 1440 < 3 THEN '1-3m' \
             WHEN (julianday(completed_at) - julianday(created_at)) * 1440 < 5 THEN '3-5m' \
             WHEN (julianday(completed_at) - julianday(created_at)) * 1440 < 10 THEN '5-10m' \
             ELSE '>10m' \
           END as label, \
           COUNT(*) as count \
         FROM tasks \
         WHERE workspace_id = ?1 AND completed_at IS NOT NULL \
         GROUP BY label \
         ORDER BY CASE label \
           WHEN '<1m' THEN 1 WHEN '1-3m' THEN 2 WHEN '3-5m' THEN 3 \
           WHEN '5-10m' THEN 4 WHEN '>10m' THEN 5 END",
    )
    .bind(workspace_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}
