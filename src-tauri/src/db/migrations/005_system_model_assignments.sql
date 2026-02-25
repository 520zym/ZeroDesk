CREATE TABLE IF NOT EXISTS system_model_assignments (
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    task_key TEXT NOT NULL CHECK(task_key IN ('planning','prompt','quality','summary')),
    model_id TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (workspace_id, task_key)
);
