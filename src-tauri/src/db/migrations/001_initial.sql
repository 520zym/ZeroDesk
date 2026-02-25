-- Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Agents (before tasks/task_steps that reference it)
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    name TEXT NOT NULL,
    avatar_char TEXT,
    avatar_color TEXT,
    role_description TEXT,
    system_prompt TEXT,
    model_id TEXT,
    fallback_model_id TEXT,
    tools_json TEXT DEFAULT '[]',
    skills_json TEXT DEFAULT '[]',
    is_template INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_used_at TEXT
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    title TEXT NOT NULL,
    description TEXT,
    goal TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','ready','running','paused','blocked','failed','completed','archived')),
    cost_tier TEXT DEFAULT 'standard' CHECK(cost_tier IN ('economy','standard','quality','unlimited')),
    plan_mode TEXT DEFAULT 'ai' CHECK(plan_mode IN ('ai','reuse')),
    quality_gate TEXT DEFAULT 'standard',
    retry_policy TEXT DEFAULT 'auto_2',
    over_budget_policy TEXT DEFAULT 'downgrade',
    timeout_minutes INTEGER,
    total_tokens INTEGER DEFAULT 0,
    total_cost REAL DEFAULT 0,
    progress INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT
);

-- Task Steps
CREATE TABLE IF NOT EXISTS task_steps (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    agent_id TEXT REFERENCES agents(id),
    output_target TEXT DEFAULT 'next',
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','running','completed','failed','skipped')),
    tokens_used INTEGER DEFAULT 0,
    duration_seconds REAL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT 'primary',
    shared_skills_json TEXT DEFAULT '[]',
    task_count INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Team Members
CREATE TABLE IF NOT EXISTS team_members (
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, agent_id)
);

-- Model Providers
CREATE TABLE IF NOT EXISTS model_providers (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    name TEXT NOT NULL,
    base_url TEXT NOT NULL,
    api_key_encrypted TEXT,
    icon_color TEXT,
    status TEXT DEFAULT 'unknown' CHECK(status IN ('online','degraded','offline','unknown')),
    avg_latency_ms INTEGER,
    models_count INTEGER DEFAULT 0,
    balance_info TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Models
CREATE TABLE IF NOT EXISTS models (
    id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL REFERENCES model_providers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quality_rating INTEGER DEFAULT 3 CHECK(quality_rating BETWEEN 1 AND 5),
    speed_tier TEXT DEFAULT 'medium' CHECK(speed_tier IN ('slow','medium','fast','ultra')),
    price_per_million_tokens REAL DEFAULT 0,
    status TEXT DEFAULT 'available' CHECK(status IN ('available','offline','deprecated')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Fallback Chains
CREATE TABLE IF NOT EXISTS fallback_chains (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    chain_order INTEGER NOT NULL,
    model_id TEXT NOT NULL REFERENCES models(id),
    role TEXT DEFAULT 'primary' CHECK(role IN ('primary','peer','downgrade'))
);

-- Resilience Policies
CREATE TABLE IF NOT EXISTS resilience_policies (
    workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id),
    retry_count INTEGER DEFAULT 3,
    backoff_strategy TEXT DEFAULT 'exponential' CHECK(backoff_strategy IN ('exponential','linear','fixed')),
    token_budget INTEGER DEFAULT 100000,
    over_budget_action TEXT DEFAULT 'downgrade_confirm' CHECK(over_budget_action IN ('downgrade_confirm','reject'))
);

-- Skills
CREATE TABLE IF NOT EXISTS skills (
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
    source TEXT DEFAULT 'local' CHECK(source IN ('local','marketplace')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Knowledge Items
CREATE TABLE IF NOT EXISTS knowledge_items (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    folder TEXT DEFAULT 'root',
    title TEXT NOT NULL,
    content TEXT,
    content_type TEXT DEFAULT 'markdown' CHECK(content_type IN ('markdown','text','json')),
    tags_json TEXT DEFAULT '[]',
    visibility TEXT DEFAULT 'public' CHECK(visibility IN ('public','team','private')),
    version INTEGER DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Knowledge Versions
CREATE TABLE IF NOT EXISTS knowledge_versions (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    content TEXT,
    change_note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Prompt Versions
CREATE TABLE IF NOT EXISTS prompt_versions (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    content TEXT NOT NULL,
    note TEXT,
    is_stable INTEGER DEFAULT 0,
    quality_score REAL,
    cost_change REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Workflow Templates
CREATE TABLE IF NOT EXISTS workflow_templates (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    icon_name TEXT,
    icon_bg TEXT,
    parameters_json TEXT DEFAULT '[]',
    steps_json TEXT DEFAULT '[]',
    usage_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Execution Messages
CREATE TABLE IF NOT EXISTS execution_messages (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK(sender_type IN ('agent','human','system')),
    sender_id TEXT,
    sender_name TEXT,
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'text' CHECK(content_type IN ('text','table','code','error')),
    metadata_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
