use sqlx::SqlitePool;
use tauri::State;

use crate::db::DEFAULT_WORKSPACE_ID;
use crate::models::{Agent, Team, TeamMember};

#[tauri::command]
pub async fn list_teams(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<Team>, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    sqlx::query_as::<_, Team>(
        "SELECT * FROM teams WHERE workspace_id = ?1 ORDER BY updated_at DESC",
    )
    .bind(workspace_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_team(
    pool: State<'_, SqlitePool>,
    name: String,
    description: Option<String>,
    color: Option<String>,
) -> Result<Team, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO teams (id, workspace_id, name, description, color)
         VALUES (?1, ?2, ?3, ?4, ?5)",
    )
    .bind(&id)
    .bind(workspace_id)
    .bind(&name)
    .bind(&description)
    .bind(&color.unwrap_or_else(|| "primary".into()))
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Team>("SELECT * FROM teams WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_team(
    pool: State<'_, SqlitePool>,
    id: String,
    name: Option<String>,
    description: Option<String>,
    color: Option<String>,
    shared_skills_json: Option<String>,
) -> Result<Team, String> {
    let existing = sqlx::query_as::<_, Team>("SELECT * FROM teams WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query(
        "UPDATE teams SET name = ?1, description = ?2, color = ?3, shared_skills_json = ?4, updated_at = datetime('now') WHERE id = ?5",
    )
    .bind(name.unwrap_or(existing.name))
    .bind(description.or(existing.description))
    .bind(color.or(existing.color))
    .bind(shared_skills_json.or(existing.shared_skills_json))
    .bind(&id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Team>("SELECT * FROM teams WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_team(
    pool: State<'_, SqlitePool>,
    id: String,
) -> Result<(), String> {
    sqlx::query("DELETE FROM teams WHERE id = ?1")
        .bind(&id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn add_team_member(
    pool: State<'_, SqlitePool>,
    team_id: String,
    agent_id: String,
) -> Result<(), String> {
    sqlx::query("INSERT OR IGNORE INTO team_members (team_id, agent_id) VALUES (?1, ?2)")
        .bind(&team_id)
        .bind(&agent_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn remove_team_member(
    pool: State<'_, SqlitePool>,
    team_id: String,
    agent_id: String,
) -> Result<(), String> {
    sqlx::query("DELETE FROM team_members WHERE team_id = ?1 AND agent_id = ?2")
        .bind(&team_id)
        .bind(&agent_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn list_all_team_members(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<TeamMember>, String> {
    sqlx::query_as::<_, TeamMember>("SELECT * FROM team_members")
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_team_members(
    pool: State<'_, SqlitePool>,
    team_id: String,
) -> Result<Vec<Agent>, String> {
    sqlx::query_as::<_, Agent>(
        "SELECT a.* FROM agents a INNER JOIN team_members tm ON a.id = tm.agent_id WHERE tm.team_id = ?1",
    )
    .bind(&team_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}
