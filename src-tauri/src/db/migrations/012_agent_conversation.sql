-- 多Agent对话协议：新增消息引用、步骤关联、上下文窗口支持

-- 新增列：步骤关联
ALTER TABLE execution_messages ADD COLUMN step_id TEXT REFERENCES task_steps(id);

-- 新增列：引用回复
ALTER TABLE execution_messages ADD COLUMN reply_to_id TEXT REFERENCES execution_messages(id);

-- 新增索引
CREATE INDEX IF NOT EXISTS idx_messages_task_run ON execution_messages(task_id, run_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON execution_messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_messages_step ON execution_messages(step_id);

-- models 表新增上下文窗口列
ALTER TABLE models ADD COLUMN context_window_tokens INTEGER DEFAULT 128000;

-- system_model_assignments 增加 summarization task_key
-- 遵循 006/008 的幂等模式：备份→重建→恢复
DROP TABLE IF EXISTS _sma_backup;
CREATE TABLE _sma_backup AS SELECT * FROM system_model_assignments;
DROP TABLE IF EXISTS system_model_assignments;
CREATE TABLE system_model_assignments (
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    task_key TEXT NOT NULL CHECK(task_key IN ('planning','prompt','quality','summary','translation','team_planning','summarization')),
    model_id TEXT NOT NULL REFERENCES models(id),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (workspace_id, task_key)
);
INSERT OR IGNORE INTO system_model_assignments SELECT * FROM _sma_backup;
DROP TABLE IF EXISTS _sma_backup;
