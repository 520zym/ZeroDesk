-- 全局搜索 FTS5 索引
-- 使用 content='原表名' 模式，FTS 不冗余存储原文，通过 rowid 回查原表
-- tokenize='unicode61' 支持中文按字切分
-- 每张表配套 3 个触发器（INSERT/UPDATE/DELETE）自动同步索引

-- ═══ 知识库 FTS（最重要，content 字段包含长文本） ═══
CREATE VIRTUAL TABLE IF NOT EXISTS fts_knowledge_items USING fts5(
    title, content, tags_json,
    content='knowledge_items',
    content_rowid='rowid',
    tokenize='unicode61'
);

CREATE TRIGGER IF NOT EXISTS fts_ki_ai AFTER INSERT ON knowledge_items BEGIN
    INSERT INTO fts_knowledge_items(rowid, title, content, tags_json)
    VALUES (NEW.rowid, NEW.title, NEW.content, NEW.tags_json);
END;

CREATE TRIGGER IF NOT EXISTS fts_ki_ad AFTER DELETE ON knowledge_items BEGIN
    INSERT INTO fts_knowledge_items(fts_knowledge_items, rowid, title, content, tags_json)
    VALUES ('delete', OLD.rowid, OLD.title, OLD.content, OLD.tags_json);
END;

CREATE TRIGGER IF NOT EXISTS fts_ki_au AFTER UPDATE ON knowledge_items BEGIN
    INSERT INTO fts_knowledge_items(fts_knowledge_items, rowid, title, content, tags_json)
    VALUES ('delete', OLD.rowid, OLD.title, OLD.content, OLD.tags_json);
    INSERT INTO fts_knowledge_items(rowid, title, content, tags_json)
    VALUES (NEW.rowid, NEW.title, NEW.content, NEW.tags_json);
END;

-- ═══ 任务 FTS ═══
CREATE VIRTUAL TABLE IF NOT EXISTS fts_tasks USING fts5(
    title, description, goal,
    content='tasks',
    content_rowid='rowid',
    tokenize='unicode61'
);

CREATE TRIGGER IF NOT EXISTS fts_tasks_ai AFTER INSERT ON tasks BEGIN
    INSERT INTO fts_tasks(rowid, title, description, goal)
    VALUES (NEW.rowid, NEW.title, NEW.description, NEW.goal);
END;

CREATE TRIGGER IF NOT EXISTS fts_tasks_ad AFTER DELETE ON tasks BEGIN
    INSERT INTO fts_tasks(fts_tasks, rowid, title, description, goal)
    VALUES ('delete', OLD.rowid, OLD.title, OLD.description, OLD.goal);
END;

CREATE TRIGGER IF NOT EXISTS fts_tasks_au AFTER UPDATE ON tasks BEGIN
    INSERT INTO fts_tasks(fts_tasks, rowid, title, description, goal)
    VALUES ('delete', OLD.rowid, OLD.title, OLD.description, OLD.goal);
    INSERT INTO fts_tasks(rowid, title, description, goal)
    VALUES (NEW.rowid, NEW.title, NEW.description, NEW.goal);
END;

-- ═══ Agent FTS ═══
CREATE VIRTUAL TABLE IF NOT EXISTS fts_agents USING fts5(
    name, role_description,
    content='agents',
    content_rowid='rowid',
    tokenize='unicode61'
);

CREATE TRIGGER IF NOT EXISTS fts_agents_ai AFTER INSERT ON agents BEGIN
    INSERT INTO fts_agents(rowid, name, role_description)
    VALUES (NEW.rowid, NEW.name, NEW.role_description);
END;

CREATE TRIGGER IF NOT EXISTS fts_agents_ad AFTER DELETE ON agents BEGIN
    INSERT INTO fts_agents(fts_agents, rowid, name, role_description)
    VALUES ('delete', OLD.rowid, OLD.name, OLD.role_description);
END;

CREATE TRIGGER IF NOT EXISTS fts_agents_au AFTER UPDATE ON agents BEGIN
    INSERT INTO fts_agents(fts_agents, rowid, name, role_description)
    VALUES ('delete', OLD.rowid, OLD.name, OLD.role_description);
    INSERT INTO fts_agents(rowid, name, role_description)
    VALUES (NEW.rowid, NEW.name, NEW.role_description);
END;

-- ═══ 团队 FTS ═══
CREATE VIRTUAL TABLE IF NOT EXISTS fts_teams USING fts5(
    name, description,
    content='teams',
    content_rowid='rowid',
    tokenize='unicode61'
);

CREATE TRIGGER IF NOT EXISTS fts_teams_ai AFTER INSERT ON teams BEGIN
    INSERT INTO fts_teams(rowid, name, description)
    VALUES (NEW.rowid, NEW.name, NEW.description);
END;

CREATE TRIGGER IF NOT EXISTS fts_teams_ad AFTER DELETE ON teams BEGIN
    INSERT INTO fts_teams(fts_teams, rowid, name, description)
    VALUES ('delete', OLD.rowid, OLD.name, OLD.description);
END;

CREATE TRIGGER IF NOT EXISTS fts_teams_au AFTER UPDATE ON teams BEGIN
    INSERT INTO fts_teams(fts_teams, rowid, name, description)
    VALUES ('delete', OLD.rowid, OLD.name, OLD.description);
    INSERT INTO fts_teams(rowid, name, description)
    VALUES (NEW.rowid, NEW.name, NEW.description);
END;

-- ═══ 技能 FTS ═══
CREATE VIRTUAL TABLE IF NOT EXISTS fts_skills USING fts5(
    name, description,
    content='skills',
    content_rowid='rowid',
    tokenize='unicode61'
);

CREATE TRIGGER IF NOT EXISTS fts_skills_ai AFTER INSERT ON skills BEGIN
    INSERT INTO fts_skills(rowid, name, description)
    VALUES (NEW.rowid, NEW.name, NEW.description);
END;

CREATE TRIGGER IF NOT EXISTS fts_skills_ad AFTER DELETE ON skills BEGIN
    INSERT INTO fts_skills(fts_skills, rowid, name, description)
    VALUES ('delete', OLD.rowid, OLD.name, OLD.description);
END;

CREATE TRIGGER IF NOT EXISTS fts_skills_au AFTER UPDATE ON skills BEGIN
    INSERT INTO fts_skills(fts_skills, rowid, name, description)
    VALUES ('delete', OLD.rowid, OLD.name, OLD.description);
    INSERT INTO fts_skills(rowid, name, description)
    VALUES (NEW.rowid, NEW.name, NEW.description);
END;

-- ═══ 模型 FTS ═══
CREATE VIRTUAL TABLE IF NOT EXISTS fts_models USING fts5(
    name,
    content='models',
    content_rowid='rowid',
    tokenize='unicode61'
);

CREATE TRIGGER IF NOT EXISTS fts_models_ai AFTER INSERT ON models BEGIN
    INSERT INTO fts_models(rowid, name)
    VALUES (NEW.rowid, NEW.name);
END;

CREATE TRIGGER IF NOT EXISTS fts_models_ad AFTER DELETE ON models BEGIN
    INSERT INTO fts_models(fts_models, rowid, name)
    VALUES ('delete', OLD.rowid, OLD.name);
END;

CREATE TRIGGER IF NOT EXISTS fts_models_au AFTER UPDATE ON models BEGIN
    INSERT INTO fts_models(fts_models, rowid, name)
    VALUES ('delete', OLD.rowid, OLD.name);
    INSERT INTO fts_models(rowid, name)
    VALUES (NEW.rowid, NEW.name);
END;

-- ═══ 工作流模板 FTS ═══
CREATE VIRTUAL TABLE IF NOT EXISTS fts_workflow_templates USING fts5(
    name, description,
    content='workflow_templates',
    content_rowid='rowid',
    tokenize='unicode61'
);

CREATE TRIGGER IF NOT EXISTS fts_wf_ai AFTER INSERT ON workflow_templates BEGIN
    INSERT INTO fts_workflow_templates(rowid, name, description)
    VALUES (NEW.rowid, NEW.name, NEW.description);
END;

CREATE TRIGGER IF NOT EXISTS fts_wf_ad AFTER DELETE ON workflow_templates BEGIN
    INSERT INTO fts_workflow_templates(fts_workflow_templates, rowid, name, description)
    VALUES ('delete', OLD.rowid, OLD.name, OLD.description);
END;

CREATE TRIGGER IF NOT EXISTS fts_wf_au AFTER UPDATE ON workflow_templates BEGIN
    INSERT INTO fts_workflow_templates(fts_workflow_templates, rowid, name, description)
    VALUES ('delete', OLD.rowid, OLD.name, OLD.description);
    INSERT INTO fts_workflow_templates(rowid, name, description)
    VALUES (NEW.rowid, NEW.name, NEW.description);
END;
