-- System Settings (singleton row)
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    theme TEXT NOT NULL DEFAULT 'light' CHECK(theme IN ('light','dark','auto')),
    language TEXT NOT NULL DEFAULT 'zh-CN',
    encryption INTEGER NOT NULL DEFAULT 1,
    archive_days INTEGER NOT NULL DEFAULT 30,
    task_notify INTEGER NOT NULL DEFAULT 1,
    fail_notify INTEGER NOT NULL DEFAULT 1,
    budget_notify INTEGER NOT NULL DEFAULT 0,
    data_path TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO system_settings (id) VALUES (1);
