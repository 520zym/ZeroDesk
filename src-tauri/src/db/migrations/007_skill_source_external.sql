-- Migration 007: Allow 'external' as a valid skill source
-- SQLite cannot ALTER CHECK constraints, so we recreate the table

DROP TABLE IF EXISTS _skills_backup;
CREATE TABLE _skills_backup AS SELECT * FROM skills;
DROP TABLE IF EXISTS skills;

CREATE TABLE skills (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    name TEXT NOT NULL,
    description TEXT,
    icon_name TEXT,
    icon_bg TEXT,
    version TEXT DEFAULT '1.0.0',
    scope TEXT DEFAULT 'global' CHECK(scope IN ('global','team','agent')),
    scope_id TEXT,
    status TEXT DEFAULT 'installed' CHECK(status IN ('installed','disabled','available')),
    permissions_json TEXT DEFAULT '[]',
    source TEXT DEFAULT 'local' CHECK(source IN ('local','marketplace','external')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO skills SELECT * FROM _skills_backup;
DROP TABLE IF EXISTS _skills_backup;
