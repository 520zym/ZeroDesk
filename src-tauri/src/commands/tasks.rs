use sqlx::SqlitePool;
use tauri::{Emitter, State};

use crate::db::DEFAULT_WORKSPACE_ID;
use crate::models::{Agent, ExecutionMessage, Task, TaskRun, TaskStats, TaskStep, TaskStepSummary};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct TaskPlanStep {
    name: String,
    description: String,
    agent_name: String,
    agent_avatar_char: String,
    agent_avatar_color: String,
    agent_role: String,
    agent_system_prompt: String,
    agent_tools: Vec<String>,
    agent_skills: Vec<String>,
    agent_model_id: Option<String>,
    agent_fallback_model_id: Option<String>,
    output_target: String,
    is_existing_agent: bool,
    existing_agent_id: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct TaskPlanResult {
    team_name: String,
    team_description: String,
    team_color: String,
    steps: Vec<TaskPlanStep>,
    shared_skills: Vec<String>,
}

#[derive(Debug, serde::Serialize)]
pub struct SmartPlanResult {
    pub steps: Vec<TaskStep>,
    pub thinking: Option<String>,
}

fn resolve_model_index_local(
    raw: &Option<String>,
    index_map: &[(String, String)],
) -> Option<String> {
    let val = raw.as_ref()?;
    let idx: usize = val.trim().parse::<usize>().ok()?.checked_sub(1)?;
    let (db_id, _display) = index_map.get(idx)?;
    Some(db_id.clone())
}

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
    run_id: Option<String>,
) -> Result<Vec<TaskStep>, String> {
    if let Some(rid) = run_id {
        sqlx::query_as::<_, TaskStep>(
            "SELECT * FROM task_steps WHERE task_id = ?1 AND run_id = ?2 ORDER BY step_order ASC",
        )
        .bind(&task_id)
        .bind(&rid)
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())
    } else {
        sqlx::query_as::<_, TaskStep>(
            "SELECT * FROM task_steps WHERE task_id = ?1 ORDER BY step_order ASC",
        )
        .bind(&task_id)
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())
    }
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
    run_id: Option<String>,
) -> Result<Vec<ExecutionMessage>, String> {
    if let Some(rid) = run_id {
        sqlx::query_as::<_, ExecutionMessage>(
            "SELECT * FROM execution_messages WHERE task_id = ?1 AND run_id = ?2 ORDER BY created_at ASC",
        )
        .bind(&task_id)
        .bind(&rid)
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())
    } else {
        sqlx::query_as::<_, ExecutionMessage>(
            "SELECT * FROM execution_messages WHERE task_id = ?1 ORDER BY created_at ASC",
        )
        .bind(&task_id)
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())
    }
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
    run_id: Option<String>,
) -> Result<ExecutionMessage, String> {
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO execution_messages (id, task_id, sender_type, sender_id, sender_name, content, content_type, metadata_json, run_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
    )
    .bind(&id)
    .bind(&task_id)
    .bind(&sender_type)
    .bind(&sender_id)
    .bind(&sender_name)
    .bind(&content)
    .bind(&content_type.unwrap_or_else(|| "text".into()))
    .bind(&metadata_json)
    .bind(&run_id)
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

#[tauri::command]
pub async fn list_task_step_summaries(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<TaskStepSummary>, String> {
    sqlx::query_as::<_, TaskStepSummary>(
        "SELECT task_id, COUNT(*) as total_steps, \
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_steps \
         FROM task_steps GROUP BY task_id",
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn initialize_task_from_team(
    pool: State<'_, SqlitePool>,
    task_id: String,
    team_id: String,
) -> Result<Vec<TaskStep>, String> {
    let agents: Vec<Agent> = sqlx::query_as(
        "SELECT a.* FROM agents a INNER JOIN team_members tm ON a.id = tm.agent_id WHERE tm.team_id = ?1",
    )
    .bind(&team_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    if agents.is_empty() {
        return Err("该团队没有成员，请先添加 Agent".to_string());
    }

    sqlx::query("DELETE FROM task_steps WHERE task_id = ?1")
        .bind(&task_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    for (i, agent) in agents.iter().enumerate() {
        let step_id = uuid::Uuid::new_v4().to_string();
        let step_name = agent
            .role_description
            .as_deref()
            .filter(|r| !r.is_empty())
            .unwrap_or(&agent.name);
        let output_target = if i < agents.len() - 1 {
            "next"
        } else {
            "report"
        };

        sqlx::query(
            "INSERT INTO task_steps (id, task_id, step_order, name, description, agent_id, output_target)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        )
        .bind(&step_id)
        .bind(&task_id)
        .bind((i + 1) as i64)
        .bind(step_name)
        .bind(agent.role_description.as_deref())
        .bind(&agent.id)
        .bind(output_target)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    }

    sqlx::query(
        "UPDATE tasks SET team_id = COALESCE(team_id, ?1), updated_at = datetime('now') WHERE id = ?2",
    )
    .bind(&team_id)
    .bind(&task_id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, TaskStep>(
        "SELECT * FROM task_steps WHERE task_id = ?1 ORDER BY step_order ASC",
    )
    .bind(&task_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn start_task_execution(
    app: tauri::AppHandle,
    pool: State<'_, SqlitePool>,
    task_id: String,
) -> Result<(), String> {
    let task: Task = sqlx::query_as("SELECT * FROM tasks WHERE id = ?1")
        .bind(&task_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| format!("任务不存在: {}", e))?;

    if task.status == "running" {
        return Err("任务已在执行中".into());
    }

    let step_count: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM task_steps WHERE task_id = ?1")
            .bind(&task_id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| e.to_string())?;

    if step_count.0 == 0 {
        return Err("任务没有执行步骤，请先规划任务".into());
    }

    // Ensure a run exists; create run_number=1 if none
    // Deduplicate: keep only the latest run per run_number
    let existing_run: Option<(String, String,)> = sqlx::query_as(
        "SELECT id, status FROM task_runs WHERE task_id = ?1 ORDER BY run_number DESC LIMIT 1",
    )
    .bind(&task_id)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let run_id = if let Some((rid, status)) = existing_run {
        if status == "running" {
            // Already running — just reuse
            rid
        } else {
            // Reset to running and update started_at
            sqlx::query("UPDATE task_runs SET status = 'running', started_at = datetime('now'), completed_at = NULL WHERE id = ?1")
                .bind(&rid)
                .execute(pool.inner())
                .await
                .map_err(|e| e.to_string())?;
            rid
        }
    } else {
        let rid = uuid::Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO task_runs (id, task_id, run_number, status) VALUES (?1, ?2, 1, 'running')",
        )
        .bind(&rid)
        .bind(&task_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
        // Link orphan steps (those without run_id) to this run
        sqlx::query("UPDATE task_steps SET run_id = ?1 WHERE task_id = ?2 AND run_id IS NULL")
            .bind(&rid)
            .bind(&task_id)
            .execute(pool.inner())
            .await
            .map_err(|e| e.to_string())?;
        rid
    };

    sqlx::query("UPDATE tasks SET status = 'running', updated_at = datetime('now') WHERE id = ?1")
        .bind(&task_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let pool_clone = pool.inner().clone();
    let task_id_clone = task_id.clone();

    tauri::async_runtime::spawn(async move {
        if let Err(e) =
            crate::engine::run_task(app, pool_clone.clone(), task_id_clone.clone(), Some(run_id)).await
        {
            tracing::error!("Task {} execution failed: {}", task_id_clone, e);
            let _ = sqlx::query(
                "UPDATE tasks SET status = CASE WHEN status = 'running' THEN 'failed' ELSE status END, updated_at = datetime('now') WHERE id = ?1",
            )
            .bind(&task_id_clone)
            .execute(&pool_clone)
            .await;
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn list_task_runs(
    pool: State<'_, SqlitePool>,
    task_id: String,
) -> Result<Vec<TaskRun>, String> {
    sqlx::query_as::<_, TaskRun>(
        "SELECT * FROM task_runs WHERE task_id = ?1 ORDER BY run_number ASC",
    )
    .bind(&task_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_all_latest_task_runs(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<TaskRun>, String> {
    sqlx::query_as::<_, TaskRun>(
        "SELECT tr.* FROM task_runs tr \
         INNER JOIN (SELECT task_id, MAX(run_number) as max_run FROM task_runs GROUP BY task_id) latest \
         ON tr.task_id = latest.task_id AND tr.run_number = latest.max_run \
         ORDER BY tr.started_at DESC",
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn rerun_task(
    app: tauri::AppHandle,
    pool: State<'_, SqlitePool>,
    task_id: String,
) -> Result<TaskRun, String> {
    let task: Task = sqlx::query_as("SELECT * FROM tasks WHERE id = ?1")
        .bind(&task_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| format!("任务不存在: {}", e))?;

    if task.status == "running" {
        return Err("任务正在执行中，无法重新执行".into());
    }

    let max_run: (i64,) = sqlx::query_as(
        "SELECT COALESCE(MAX(run_number), 0) FROM task_runs WHERE task_id = ?1",
    )
    .bind(&task_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let new_run_number = max_run.0 + 1;
    let run_id = uuid::Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO task_runs (id, task_id, run_number, status, total_tokens, total_cost, progress) \
         VALUES (?1, ?2, ?3, 'running', 0, 0, 0)",
    )
    .bind(&run_id)
    .bind(&task_id)
    .bind(new_run_number)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let source_steps: Vec<TaskStep> = if max_run.0 > 0 {
        let prev_run_id: Option<(String,)> = sqlx::query_as(
            "SELECT id FROM task_runs WHERE task_id = ?1 AND run_number = ?2",
        )
        .bind(&task_id)
        .bind(max_run.0)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

        if let Some((rid,)) = prev_run_id {
            sqlx::query_as::<_, TaskStep>(
                "SELECT * FROM task_steps WHERE task_id = ?1 AND run_id = ?2 ORDER BY step_order ASC",
            )
            .bind(&task_id)
            .bind(&rid)
            .fetch_all(pool.inner())
            .await
            .map_err(|e| e.to_string())?
        } else {
            sqlx::query_as::<_, TaskStep>(
                "SELECT * FROM task_steps WHERE task_id = ?1 ORDER BY step_order ASC",
            )
            .bind(&task_id)
            .fetch_all(pool.inner())
            .await
            .map_err(|e| e.to_string())?
        }
    } else {
        sqlx::query_as::<_, TaskStep>(
            "SELECT * FROM task_steps WHERE task_id = ?1 ORDER BY step_order ASC",
        )
        .bind(&task_id)
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?
    };

    if source_steps.is_empty() {
        return Err("任务没有执行步骤，请先规划任务".into());
    }

    for step in &source_steps {
        let new_step_id = uuid::Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO task_steps (id, task_id, step_order, name, description, agent_id, output_target, status, run_id) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'pending', ?8)",
        )
        .bind(&new_step_id)
        .bind(&task_id)
        .bind(step.step_order)
        .bind(&step.name)
        .bind(&step.description)
        .bind(&step.agent_id)
        .bind(&step.output_target)
        .bind(&run_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    }

    sqlx::query(
        "UPDATE tasks SET status = 'running', progress = 0, total_tokens = 0, total_cost = 0, completed_at = NULL, updated_at = datetime('now') WHERE id = ?1",
    )
    .bind(&task_id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let pool_clone = pool.inner().clone();
    let task_id_clone = task_id.clone();
    let run_id_clone = run_id.clone();

    tauri::async_runtime::spawn(async move {
        if let Err(e) =
            crate::engine::run_task(app, pool_clone.clone(), task_id_clone.clone(), Some(run_id_clone)).await
        {
            tracing::error!("Task {} rerun failed: {}", task_id_clone, e);
            let _ = sqlx::query(
                "UPDATE tasks SET status = CASE WHEN status = 'running' THEN 'failed' ELSE status END, updated_at = datetime('now') WHERE id = ?1",
            )
            .bind(&task_id_clone)
            .execute(&pool_clone)
            .await;
        }
    });

    sqlx::query_as::<_, TaskRun>("SELECT * FROM task_runs WHERE id = ?1")
        .bind(&run_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn smart_plan_task(
    pool: State<'_, SqlitePool>,
    task_id: String,
) -> Result<SmartPlanResult, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;

    let task: Task = sqlx::query_as("SELECT * FROM tasks WHERE id = ?1")
        .bind(&task_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let goal = task
        .goal
        .as_deref()
        .or(task.description.as_deref())
        .ok_or_else(|| "任务没有目标或描述，无法进行 AI 规划".to_string())?
        .to_string();

    let row = sqlx::query_as::<_, (String, String, String)>(
        "SELECT m.name, mp.base_url, mp.api_key_encrypted
         FROM system_model_assignments sma
         JOIN models m ON m.id = sma.model_id
         JOIN model_providers mp ON m.provider_id = mp.id
         WHERE sma.task_key = 'planning' AND sma.workspace_id = 'default'
         LIMIT 1",
    )
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let (model_name, base_url, api_key) = match row {
        Some(r) => r,
        None => {
            let fallback = sqlx::query_as::<_, (String, String, String)>(
                "SELECT m.name, mp.base_url, mp.api_key_encrypted
                 FROM models m
                 JOIN model_providers mp ON m.provider_id = mp.id
                 WHERE m.enabled = 1 AND mp.enabled = 1
                 ORDER BY mp.avg_latency_ms ASC NULLS LAST
                 LIMIT 1",
            )
            .fetch_optional(pool.inner())
            .await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| {
                "没有可用的模型。请在「模型与路由」页面配置任务规划模型，或启用至少一个模型"
                    .to_string()
            })?;
            fallback
        }
    };

    let agents: Vec<Agent> = sqlx::query_as("SELECT * FROM agents WHERE workspace_id = ?1")
        .bind(workspace_id)
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let skills: Vec<(String, Option<String>)> =
        sqlx::query_as("SELECT name, description FROM skills WHERE workspace_id = ?1")
            .bind(workspace_id)
            .fetch_all(pool.inner())
            .await
            .map_err(|e| e.to_string())?;

    let models_info: Vec<(String, String, String, Option<i64>, Option<String>, Option<f64>)> =
        sqlx::query_as(
            "SELECT m.id, m.name, mp.name, m.quality_rating, m.speed_tier, m.price_per_million_tokens \
             FROM models m \
             JOIN model_providers mp ON m.provider_id = mp.id \
             WHERE m.enabled = 1 AND mp.enabled = 1",
        )
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let model_index_map: Vec<(String, String)> = models_info
        .iter()
        .map(|(db_id, name, provider, _, _, _)| {
            (db_id.clone(), format!("{} ({})", name, provider))
        })
        .collect();

    let agents_ctx = if agents.is_empty() {
        "（无）".to_string()
    } else {
        agents
            .iter()
            .map(|a| {
                format!(
                    "- name: \"{}\", role: \"{}\", skills: {} (id: \"{}\")",
                    a.name,
                    a.role_description.as_deref().unwrap_or(""),
                    a.skills_json.as_deref().unwrap_or("[]"),
                    a.id
                )
            })
            .collect::<Vec<_>>()
            .join("\n")
    };

    let skills_ctx = if skills.is_empty() {
        "（无）".to_string()
    } else {
        skills
            .iter()
            .map(|(name, desc)| {
                format!(
                    "- name: \"{}\" - {}",
                    name,
                    desc.as_deref().unwrap_or("无描述")
                )
            })
            .collect::<Vec<_>>()
            .join("\n")
    };

    let models_ctx = if models_info.is_empty() {
        "（无）".to_string()
    } else {
        models_info
            .iter()
            .enumerate()
            .map(|(idx, (_db_id, name, provider, quality, speed, price))| {
                format!(
                    "- [{}] {} — 提供商: {} (quality: {}, speed: {}, price: {}/M tokens)",
                    idx + 1,
                    name,
                    provider,
                    quality.map_or("N/A".to_string(), |q| q.to_string()),
                    speed.as_deref().unwrap_or("N/A"),
                    price.map_or("N/A".to_string(), |p| format!("{:.2}", p))
                )
            })
            .collect::<Vec<_>>()
            .join("\n")
    };

    let system_prompt = format!(
        r#"你是一位专业的 AI 任务规划师。根据用户的任务目标，将其拆解为具体的执行步骤，并为每个步骤分配合适的 AI Agent。

你必须且只能输出一个合法的 JSON 对象，严格匹配以下结构：
{{{{
  "team_name": "团队名称（与任务相关）",
  "team_description": "团队描述",
  "team_color": "从可选列表中选择",
  "steps": [
    {{{{
      "name": "步骤名称（简洁明了）",
      "description": "步骤的详细描述，说明该步骤要完成什么",
      "agent_name": "负责此步骤的 Agent 名称",
      "agent_avatar_char": "Agent 名称首字符",
      "agent_avatar_color": "从可选列表中选择",
      "agent_role": "Agent 的角色描述",
      "agent_system_prompt": "完整的系统提示词",
      "agent_tools": ["从可选列表中选择"],
      "agent_skills": ["从已安装技能中选择"],
      "agent_model_id": "主模型的编号(数字)或null",
      "agent_fallback_model_id": "兜底模型的编号(数字)或null",
      "output_target": "next 或 report",
      "is_existing_agent": false,
      "existing_agent_id": null
    }}}}
  ],
  "shared_skills": ["团队共享技能"]
}}}}

规则：
1. team_color 只能从以下选项中选择：["primary","sage","coral","lavender","sand"]
2. agent_avatar_color 只能从以下选项中选择：["bg-primary","bg-sage","bg-coral","bg-lavender","bg-sand"]
3. agent_tools 只能从以下选项中选择：["search","file","exec"]
4. agent_skills 和 shared_skills 只能使用下方「已安装技能」列表中存在的技能名称
5. 如果某个已有 Agent 适合该步骤，设置 is_existing_agent: true 并填写 existing_agent_id
6. 对于新建的 Agent，is_existing_agent 为 false，existing_agent_id 为 null
7. agent_avatar_char 取 Agent 名称的第一个字符
8. agent_system_prompt 必须是完整且专业的系统提示词，与步骤任务相关
9. agent_model_id 和 agent_fallback_model_id 填写可用模型列表中方括号内的编号数字（如 1、2、3），不要填写模型名称
10. 模型分配策略：需要复杂推理的步骤分配 quality 更高的模型；简单任务分配 speed 更快的模型。如果只有一个可用模型，都填 1。如果没有可用模型，都填 null
11. 步骤应该是有序的，前一步的输出可以作为后一步的输入
12. 最后一个步骤的 output_target 应该是 "report"，其他步骤为 "next"
13. 步骤数量应该合理（通常 2-6 步），不要过多也不要过少
14. 同一个 Agent 可以负责多个步骤，但要确保角色匹配
15. 不要输出 JSON 以外的任何内容，不要包含 markdown 代码块标记

已有 Agent：
{agents_ctx}

已安装技能：
{skills_ctx}

可用模型：
{models_ctx}"#,
        agents_ctx = agents_ctx,
        skills_ctx = skills_ctx,
        models_ctx = models_ctx,
    );

    let chat_url = format!(
        "{}/chat/completions",
        base_url.trim_end_matches('/')
    );

    let body = serde_json::json!({
        "model": model_name,
        "max_tokens": 4000,
        "temperature": 0.7,
        "messages": [
            { "role": "system", "content": system_prompt },
            { "role": "user", "content": format!("请为以下任务目标生成执行计划：\n\n{}", goal) }
        ]
    });

    let client = reqwest::Client::new();
    let resp = client
        .post(&chat_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .timeout(std::time::Duration::from_secs(90))
        .send()
        .await
        .map_err(|e| format!("任务规划请求失败: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("任务规划服务返回错误 ({}): {}", status, text));
    }

    let json_resp: serde_json::Value = resp
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("解析任务规划结果失败: {}", e))?;

    let raw = json_resp
        .get("choices")
        .and_then(|c| c.get(0))
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(|c| c.as_str())
        .ok_or_else(|| "模型返回数据格式异常，无法提取任务计划".to_string())?;

    // Extract <think>...</think> reasoning content (produced by reasoning models like MiniMax M2.5)
    let thinking: Option<String> = if let (Some(s), Some(e)) = (raw.find("<think>"), raw.rfind("</think>")) {
        let t = raw[s + "<think>".len()..e].trim().to_string();
        if t.is_empty() { None } else { Some(t) }
    } else {
        None
    };

    // Strip the reasoning block so only the JSON remains
    let after_think = if let Some(end) = raw.rfind("</think>") {
        &raw[end + "</think>".len()..]
    } else {
        raw
    };

    let cleaned = after_think
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    let mut raw_value: serde_json::Value = serde_json::from_str(cleaned)
        .map_err(|e| format!("解析 AI 返回的任务计划失败: {}\n原始内容片段: {}", e, &cleaned.chars().take(200).collect::<String>()))?;

    if let Some(steps) = raw_value
        .get_mut("steps")
        .and_then(|s| s.as_array_mut())
    {
        for step in steps {
            for key in &["agent_model_id", "agent_fallback_model_id"] {
                if let Some(val) = step.get_mut(*key) {
                    if let Some(n) = val.as_i64() {
                        *val = serde_json::Value::String(n.to_string());
                    } else if let Some(n) = val.as_f64() {
                        *val = serde_json::Value::String((n as i64).to_string());
                    }
                }
            }
        }
    }

    let plan: TaskPlanResult = serde_json::from_value(raw_value)
        .map_err(|e| format!("解析 AI 返回的任务计划失败: {}", e))?;

    let team_id = uuid::Uuid::new_v4().to_string();
    let shared_skills_json =
        serde_json::to_string(&plan.shared_skills).map_err(|e| e.to_string())?;

    sqlx::query(
        "INSERT INTO teams (id, workspace_id, name, description, color, shared_skills_json)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    )
    .bind(&team_id)
    .bind(workspace_id)
    .bind(&plan.team_name)
    .bind(&plan.team_description)
    .bind(&plan.team_color)
    .bind(&shared_skills_json)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query("DELETE FROM task_steps WHERE task_id = ?1")
        .bind(&task_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let mut created_agents: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();

    for (i, step) in plan.steps.iter().enumerate() {
        let agent_id = if step.is_existing_agent {
            match &step.existing_agent_id {
                Some(id) => id.clone(),
                None => continue,
            }
        } else if let Some(existing_id) = created_agents.get(&step.agent_name) {
            existing_id.clone()
        } else {
            let id = uuid::Uuid::new_v4().to_string();
            let tools_json =
                serde_json::to_string(&step.agent_tools).map_err(|e| e.to_string())?;
            let skills_json =
                serde_json::to_string(&step.agent_skills).map_err(|e| e.to_string())?;

            let model_id =
                resolve_model_index_local(&step.agent_model_id, &model_index_map);
            let fallback_model_id =
                resolve_model_index_local(&step.agent_fallback_model_id, &model_index_map);

            sqlx::query(
                "INSERT INTO agents (id, workspace_id, name, avatar_char, avatar_color, role_description, system_prompt, model_id, fallback_model_id, tools_json, skills_json, is_template)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            )
            .bind(&id)
            .bind(workspace_id)
            .bind(&step.agent_name)
            .bind(&step.agent_avatar_char)
            .bind(&step.agent_avatar_color)
            .bind(&step.agent_role)
            .bind(&step.agent_system_prompt)
            .bind(&model_id)
            .bind(&fallback_model_id)
            .bind(&tools_json)
            .bind(&skills_json)
            .bind(0i64)
            .execute(pool.inner())
            .await
            .map_err(|e| e.to_string())?;

            created_agents.insert(step.agent_name.clone(), id.clone());
            id
        };

        sqlx::query(
            "INSERT OR IGNORE INTO team_members (team_id, agent_id) VALUES (?1, ?2)",
        )
        .bind(&team_id)
        .bind(&agent_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

        let step_id = uuid::Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO task_steps (id, task_id, step_order, name, description, agent_id, output_target)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        )
        .bind(&step_id)
        .bind(&task_id)
        .bind((i + 1) as i64)
        .bind(&step.name)
        .bind(&step.description)
        .bind(&agent_id)
        .bind(&step.output_target)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    }

    sqlx::query(
        "UPDATE tasks SET team_id = ?1, updated_at = datetime('now') WHERE id = ?2",
    )
    .bind(&team_id)
    .bind(&task_id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let steps = sqlx::query_as::<_, TaskStep>(
        "SELECT * FROM task_steps WHERE task_id = ?1 ORDER BY step_order ASC",
    )
    .bind(&task_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(SmartPlanResult { steps, thinking })
}

// ─── 多Agent对话：用户干预命令 ───────────────────────────────

/// 用户发送消息并暂停执行
#[tauri::command]
pub async fn send_user_message(
    pool: State<'_, SqlitePool>,
    app: tauri::AppHandle,
    task_id: String,
    run_id: String,
    content: String,
    mention_agent_id: Option<String>,
    reply_to_id: Option<String>,
) -> Result<serde_json::Value, String> {
    // 1. 暂停执行
    sqlx::query("UPDATE task_runs SET status = 'paused' WHERE id = ?1 AND status = 'running'")
        .bind(&run_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    // 2. 创建用户消息
    let msg_id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO execution_messages (id, task_id, run_id, sender_type, sender_name, content, content_type, reply_to_id)
         VALUES (?1, ?2, ?3, 'human', '你', ?4, 'text', ?5)"
    )
    .bind(&msg_id)
    .bind(&task_id)
    .bind(&run_id)
    .bind(&content)
    .bind(&reply_to_id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    // 3. 发出消息事件
    let _ = app.emit("execution:message", serde_json::json!({
        "id": &msg_id,
        "task_id": &task_id,
        "run_id": &run_id,
        "sender_type": "human",
        "content_type": "text",
        "reply_to_id": &reply_to_id,
    }));

    // 4. 如果 @了某个 Agent，异步触发回复
    if let Some(ref agent_id) = mention_agent_id {
        let agent: Option<Agent> = sqlx::query_as("SELECT * FROM agents WHERE id = ?1")
            .bind(agent_id)
            .fetch_optional(pool.inner())
            .await
            .map_err(|e| e.to_string())?;

        if let Some(agent) = agent {
            let pool_clone = pool.inner().clone();
            let app_clone = app.clone();
            let task_id_c = task_id.clone();
            let run_id_c = run_id.clone();
            let content_c = content.clone();
            let msg_id_c = msg_id.clone();

            tauri::async_runtime::spawn(async move {
                let resolve_result = crate::engine::resolve_model(&pool_clone, &Some(agent.clone())).await;
                let (model_name, base_url, api_key, _price) = match resolve_result {
                    Ok(info) => info,
                    Err(e) => {
                        tracing::error!("Agent reply model resolve failed: {}", e);
                        return;
                    }
                };

                let system_prompt = agent.system_prompt.as_deref().unwrap_or("你是一个专业的AI助手。");

                let recent: Vec<(String, String, Option<String>)> = sqlx::query_as(
                    "SELECT sender_type, content, sender_name FROM execution_messages
                     WHERE task_id = ?1 AND run_id = ?2 ORDER BY created_at DESC LIMIT 5"
                )
                .bind(&task_id_c)
                .bind(&run_id_c)
                .fetch_all(&pool_clone)
                .await
                .unwrap_or_default();

                let mut context_parts = Vec::new();
                for (st, c, sn) in recent.iter().rev() {
                    let name = sn.as_deref().unwrap_or(if st == "agent" { "Agent" } else { "用户" });
                    context_parts.push(format!("[{}] {}", name, c));
                }
                let user_prompt = format!(
                    "以下是最近的对话：\n{}\n\n用户现在对你说：{}\n\n请回复用户的问题。",
                    context_parts.join("\n"),
                    &content_c
                );

                let result = crate::engine::call_llm_streaming(
                    &app_clone, &task_id_c, "", &agent.id, &agent.name,
                    &model_name, &base_url, &api_key,
                    system_prompt, &user_prompt,
                ).await;

                match result {
                    Ok((reply_content, thinking, tok_in, tok_out)) => {
                        let reply_id = uuid::Uuid::new_v4().to_string();
                        let metadata = serde_json::json!({
                            "thinking": if thinking.is_empty() { serde_json::Value::Null } else { serde_json::Value::String(thinking) },
                            "model": &model_name,
                            "tokens_input": tok_in,
                            "tokens_output": tok_out,
                        });

                        let _ = sqlx::query(
                            "INSERT INTO execution_messages (id, task_id, run_id, sender_type, sender_id, sender_name, content, content_type, reply_to_id, metadata_json)
                             VALUES (?1, ?2, ?3, 'agent', ?4, ?5, ?6, 'text', ?7, ?8)"
                        )
                        .bind(&reply_id)
                        .bind(&task_id_c)
                        .bind(&run_id_c)
                        .bind(&agent.id)
                        .bind(&agent.name)
                        .bind(&reply_content)
                        .bind(&msg_id_c)
                        .bind(&metadata.to_string())
                        .execute(&pool_clone)
                        .await;

                        let _ = app_clone.emit("execution:message", serde_json::json!({
                            "id": &reply_id,
                            "task_id": &task_id_c,
                            "run_id": &run_id_c,
                            "sender_type": "agent",
                            "sender_id": &agent.id,
                            "sender_name": &agent.name,
                            "reply_to_id": &msg_id_c,
                            "content_type": "text",
                        }));
                        // 清除流式气泡，避免与持久化消息重复显示
                        let _ = app_clone.emit("execution:chunk", serde_json::json!({
                            "task_id": &task_id_c,
                            "step_id": "",
                            "agent_id": &agent.id,
                            "agent_name": &agent.name,
                            "chunk_type": "step_done",
                            "chunk": "",
                        }));
                    }
                    Err(e) => {
                        tracing::error!("Agent reply failed: {}", e);
                    }
                }
            });
        }
    }

    Ok(serde_json::json!({ "message_id": msg_id, "status": "paused" }))
}

/// 恢复执行
#[tauri::command]
pub async fn resume_execution(
    pool: State<'_, SqlitePool>,
    app: tauri::AppHandle,
    task_id: String,
    run_id: String,
) -> Result<serde_json::Value, String> {
    sqlx::query("UPDATE task_runs SET status = 'running' WHERE id = ?1 AND status = 'paused'")
        .bind(&run_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let msg_id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO execution_messages (id, task_id, run_id, sender_type, content, content_type)
         VALUES (?1, ?2, ?3, 'system', '执行已恢复', 'text')"
    )
    .bind(&msg_id)
    .bind(&task_id)
    .bind(&run_id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let _ = app.emit("execution:message", serde_json::json!({
        "id": &msg_id,
        "task_id": &task_id,
        "run_id": &run_id,
        "sender_type": "system",
        "content_type": "text",
    }));

    Ok(serde_json::json!({ "status": "running" }))
}

/// 调整方向 - 用户提供文字指示，注入后续步骤 prompt
#[tauri::command]
pub async fn adjust_direction(
    pool: State<'_, SqlitePool>,
    app: tauri::AppHandle,
    task_id: String,
    run_id: String,
    instruction: String,
) -> Result<serde_json::Value, String> {
    let msg_id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO execution_messages (id, task_id, run_id, sender_type, sender_name, content, content_type)
         VALUES (?1, ?2, ?3, 'human', '你', ?4, 'text')"
    )
    .bind(&msg_id)
    .bind(&task_id)
    .bind(&run_id)
    .bind(&format!("📌 方向调整：{}", &instruction))
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let sys_msg_id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO execution_messages (id, task_id, run_id, sender_type, content, content_type)
         VALUES (?1, ?2, ?3, 'system', ?4, 'text')"
    )
    .bind(&sys_msg_id)
    .bind(&task_id)
    .bind(&run_id)
    .bind(&format!("方向已调整，后续步骤将遵循新指示：{}", &instruction))
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query("UPDATE task_runs SET status = 'running' WHERE id = ?1 AND status = 'paused'")
        .bind(&run_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let _ = app.emit("execution:message", serde_json::json!({
        "id": &sys_msg_id,
        "task_id": &task_id,
        "run_id": &run_id,
        "sender_type": "system",
        "content_type": "text",
    }));

    Ok(serde_json::json!({ "status": "running", "instruction": instruction }))
}
