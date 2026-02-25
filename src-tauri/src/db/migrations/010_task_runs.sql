-- Task Runs: each execution of a task
CREATE TABLE IF NOT EXISTS task_runs (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    run_number INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running','paused','completed','failed')),
    total_tokens INTEGER DEFAULT 0,
    total_cost REAL DEFAULT 0,
    progress INTEGER DEFAULT 0,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT
);

-- Add run_id to task_steps and execution_messages
ALTER TABLE task_steps ADD COLUMN run_id TEXT REFERENCES task_runs(id);
ALTER TABLE execution_messages ADD COLUMN run_id TEXT REFERENCES task_runs(id);

-- Migrate existing data: create run records for tasks that have steps
INSERT OR IGNORE INTO task_runs (id, task_id, run_number, status, total_tokens, total_cost, progress, started_at, completed_at)
SELECT
    t.id || '_run1',
    t.id,
    1,
    CASE WHEN t.status IN ('completed','failed','running','paused') THEN t.status ELSE 'completed' END,
    COALESCE(t.total_tokens, 0),
    COALESCE(t.total_cost, 0),
    COALESCE(t.progress, 0),
    t.created_at,
    t.completed_at
FROM tasks t
WHERE EXISTS (SELECT 1 FROM task_steps ts WHERE ts.task_id = t.id);

-- Link existing steps to their run
UPDATE task_steps SET run_id = (
    SELECT tr.id FROM task_runs tr WHERE tr.task_id = task_steps.task_id ORDER BY tr.run_number DESC LIMIT 1
) WHERE run_id IS NULL AND EXISTS (
    SELECT 1 FROM task_runs tr WHERE tr.task_id = task_steps.task_id
);

-- Link existing messages to their run
UPDATE execution_messages SET run_id = (
    SELECT tr.id FROM task_runs tr WHERE tr.task_id = execution_messages.task_id ORDER BY tr.run_number DESC LIMIT 1
) WHERE run_id IS NULL AND EXISTS (
    SELECT 1 FROM task_runs tr WHERE tr.task_id = execution_messages.task_id
);
