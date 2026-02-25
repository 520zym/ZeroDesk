-- Migration 006: recreate system_model_assignments with 'translation' in task_key CHECK
DROP TABLE IF EXISTS _sma_backup;

CREATE TABLE _sma_backup AS SELECT * FROM system_model_assignments;

DROP TABLE IF EXISTS system_model_assignments;

CREATE TABLE system_model_assignments (
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    task_key TEXT NOT NULL CHECK(task_key IN ('planning','prompt','quality','summary','translation')),
    model_id TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (workspace_id, task_key)
);

INSERT OR IGNORE INTO system_model_assignments SELECT * FROM _sma_backup;

DROP TABLE IF EXISTS _sma_backup;
