use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions};
use sqlx::SqlitePool;
use std::path::Path;
use std::str::FromStr;

pub const DEFAULT_WORKSPACE_ID: &str = "default";

const MIGRATION_SQL: &str = include_str!("migrations/001_initial.sql");
const MIGRATION_002_SQL: &str = include_str!("migrations/002_system_settings.sql");
const MIGRATION_003_SQL: &str = include_str!("migrations/003_provider_model_enabled.sql");
const MIGRATION_004_SQL: &str = include_str!("migrations/004_skillsmp_api_key.sql");
const MIGRATION_005_SQL: &str = include_str!("migrations/005_system_model_assignments.sql");
const MIGRATION_006_SQL: &str = include_str!("migrations/006_translation_task_key.sql");
const MIGRATION_007_SQL: &str = include_str!("migrations/007_skill_source_external.sql");
const MIGRATION_008_SQL: &str = include_str!("migrations/008_team_planning_task_key.sql");
const MIGRATION_009_SQL: &str = include_str!("migrations/009_task_team_id.sql");
const MIGRATION_010_SQL: &str = include_str!("migrations/010_task_runs.sql");
const MIGRATION_011_SQL: &str = include_str!("migrations/011_knowledge_folders.sql");
const MIGRATION_012_SQL: &str = include_str!("migrations/012_agent_conversation.sql");
const MIGRATION_013_SQL: &str = include_str!("migrations/013_fix_duplicate_runs.sql");
const MIGRATION_014_SQL: &str = include_str!("migrations/014_global_search_fts.sql");
const MIGRATION_015_SQL: &str = include_str!("migrations/015_regenerate.sql");
const MIGRATION_016_SQL: &str = include_str!("migrations/016_skillsmp_api_base_url.sql");

pub async fn init_db(app_data_dir: &Path) -> Result<SqlitePool, sqlx::Error> {
    std::fs::create_dir_all(app_data_dir).ok();

    let db_path = app_data_dir.join("zerodesk.db");
    let db_url = format!("sqlite:{}?mode=rwc", db_path.display());

    let options = SqliteConnectOptions::from_str(&db_url)?
        .journal_mode(SqliteJournalMode::Wal)
        .create_if_missing(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await?;

    sqlx::query("PRAGMA foreign_keys = ON;")
        .execute(&pool)
        .await?;

    // 001-013 迁移：按分号分割逐条执行（无触发器，安全）
    for sql in [MIGRATION_SQL, MIGRATION_002_SQL, MIGRATION_003_SQL, MIGRATION_004_SQL, MIGRATION_005_SQL, MIGRATION_006_SQL, MIGRATION_007_SQL, MIGRATION_008_SQL, MIGRATION_009_SQL, MIGRATION_010_SQL, MIGRATION_011_SQL, MIGRATION_012_SQL, MIGRATION_013_SQL] {
        let stripped: String = sql
            .lines()
            .filter(|line| !line.trim_start().starts_with("--"))
            .collect::<Vec<_>>()
            .join("\n");
        for statement in stripped.split(';') {
            let trimmed = statement.trim();
            if !trimmed.is_empty() {
                match sqlx::query(trimmed).execute(&pool).await {
                    Ok(_) => {}
                    Err(e) if e.to_string().contains("duplicate column") => {
                        tracing::debug!("Skipping already-applied migration: {}", e);
                    }
                    Err(e) => return Err(e),
                }
            }
        }
    }

    // 015-016 迁移：简单 ALTER TABLE
    for sql in [MIGRATION_015_SQL, MIGRATION_016_SQL] {
        let stripped: String = sql
            .lines()
            .filter(|line| !line.trim_start().starts_with("--"))
            .collect::<Vec<_>>()
            .join("\n");
        for statement in stripped.split(';') {
            let trimmed = statement.trim();
            if !trimmed.is_empty() {
                match sqlx::query(trimmed).execute(&pool).await {
                    Ok(_) => {}
                    Err(e) if e.to_string().contains("duplicate column") || e.to_string().contains("already exists") => {
                        tracing::debug!("Migration 015 already applied: {}", e);
                    }
                    Err(e) => return Err(e),
                }
            }
        }
    }

    // 014 迁移：包含触发器（BEGIN...END 内有分号），必须整体执行
    // sqlx::raw_sql 将 SQL 字符串直接交给 SQLite 的 sqlite3_exec 解析，正确处理多语句和触发器
    {
        use sqlx::Executor;
        let mut conn = pool.acquire().await?;
        if let Err(e) = conn.execute(sqlx::raw_sql(MIGRATION_014_SQL)).await {
            let msg = e.to_string();
            if !msg.contains("already exists") {
                return Err(e);
            }
            tracing::debug!("FTS migration already applied, skipping: {}", msg);
        }
    }

    // 填充已有数据到 FTS 索引（rebuild 从 content= 指向的原表重建索引）
    for rebuild_sql in [
        "INSERT INTO fts_knowledge_items(fts_knowledge_items) VALUES('rebuild')",
        "INSERT INTO fts_tasks(fts_tasks) VALUES('rebuild')",
        "INSERT INTO fts_agents(fts_agents) VALUES('rebuild')",
        "INSERT INTO fts_teams(fts_teams) VALUES('rebuild')",
        "INSERT INTO fts_skills(fts_skills) VALUES('rebuild')",
        "INSERT INTO fts_models(fts_models) VALUES('rebuild')",
        "INSERT INTO fts_workflow_templates(fts_workflow_templates) VALUES('rebuild')",
    ] {
        if let Err(e) = sqlx::query(rebuild_sql).execute(&pool).await {
            tracing::warn!("FTS rebuild warning (non-fatal): {}", e);
        }
    }

    sqlx::query(
        "INSERT OR IGNORE INTO workspaces (id, name, path) VALUES (?1, ?2, ?3)",
    )
    .bind(DEFAULT_WORKSPACE_ID)
    .bind("默认")
    .bind(".")
    .execute(&pool)
    .await?;

    tracing::info!("Database initialized at {}", db_path.display());
    Ok(pool)
}
