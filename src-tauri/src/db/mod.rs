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

    for sql in [MIGRATION_SQL, MIGRATION_002_SQL, MIGRATION_003_SQL, MIGRATION_004_SQL, MIGRATION_005_SQL] {
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
