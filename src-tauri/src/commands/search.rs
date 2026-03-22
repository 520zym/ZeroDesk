use sqlx::SqlitePool;
use tauri::State;
use serde::{Deserialize, Serialize};

use crate::db::DEFAULT_WORKSPACE_ID;

/// 单条搜索结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResultItem {
    /// 实体 ID（原表的 id 字段）
    pub id: String,
    /// 实体类型：knowledge | task | agent | team | skill | model | workflow
    pub entity_type: String,
    /// 显示标题
    pub title: String,
    /// 副标题/描述（可选）
    pub subtitle: Option<String>,
    /// 匹配片段，带 <mark> 标签高亮（知识库 content 的 snippet）
    pub snippet: Option<String>,
    /// FTS5 BM25 rank 分数（越小越相关）
    pub rank: f64,
}

/// 搜索响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResponse {
    pub results: Vec<SearchResultItem>,
    pub total: usize,
}

/// 将用户输入转换为 FTS5 前缀匹配查询语法
/// 例如："机器学习" -> "\"机\"* \"器\"* \"学\"* \"习\"*"（按空白分词，每词加前缀 *）
/// 对于整个词组，如果没有空格则直接加 *
fn build_fts_query(query: &str) -> String {
    let query = query.trim();
    if query.is_empty() {
        return String::new();
    }
    // 按空白分词，每个词加前缀匹配
    let terms: Vec<String> = query
        .split_whitespace()
        .map(|w| {
            // 转义双引号防止 FTS5 语法错误
            let escaped = w.replace('"', "\"\"");
            format!("\"{}\"*", escaped)
        })
        .collect();
    terms.join(" ")
}

/// 全局搜索接口
/// 支持知识库、任务、Agent、团队、技能、模型、工作流的全文搜索
/// 结果按 BM25 相关性排序，知识库结果附带内容摘要高亮
#[tauri::command]
pub async fn global_search(
    pool: State<'_, SqlitePool>,
    query: String,
    entity_types: Option<Vec<String>>,
    limit: Option<i64>,
) -> Result<SearchResponse, String> {
    let query = query.trim().to_string();
    if query.is_empty() {
        return Ok(SearchResponse { results: vec![], total: 0 });
    }

    let fts_query = build_fts_query(&query);
    let max_results = limit.unwrap_or(20);
    let workspace_id = DEFAULT_WORKSPACE_ID;

    // 判断要搜索哪些类型（None 表示搜索全部）
    let search_all = entity_types.is_none();
    let types = entity_types.unwrap_or_default();

    let mut all_results: Vec<SearchResultItem> = Vec::new();

    // ─── 知识库搜索（带 snippet 高亮） ───────────────────────────
    if search_all || types.contains(&"knowledge".to_string()) {
        let rows = sqlx::query_as::<_, (String, String, Option<String>, Option<String>, f64)>(
            "SELECT k.id, k.title, k.tags_json,
                    snippet(fts_knowledge_items, 1, '<mark>', '</mark>', '...', 32) as snip,
                    fts_knowledge_items.rank
             FROM fts_knowledge_items
             JOIN knowledge_items k ON k.rowid = fts_knowledge_items.rowid
             WHERE fts_knowledge_items MATCH ?1
               AND k.workspace_id = ?2
             ORDER BY fts_knowledge_items.rank
             LIMIT ?3"
        )
        .bind(&fts_query)
        .bind(workspace_id)
        .bind(max_results)
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

        for (id, title, tags, snippet, rank) in rows {
            all_results.push(SearchResultItem {
                id,
                entity_type: "knowledge".into(),
                title,
                subtitle: tags,
                snippet,
                rank,
            });
        }
    }

    // ─── 任务搜索 ───────────────────────────────────────────────
    if search_all || types.contains(&"task".to_string()) {
        let rows = sqlx::query_as::<_, (String, String, Option<String>, f64)>(
            "SELECT t.id, t.title, t.description, fts_tasks.rank
             FROM fts_tasks
             JOIN tasks t ON t.rowid = fts_tasks.rowid
             WHERE fts_tasks MATCH ?1
               AND t.workspace_id = ?2
             ORDER BY fts_tasks.rank
             LIMIT ?3"
        )
        .bind(&fts_query)
        .bind(workspace_id)
        .bind(max_results)
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

        for (id, title, desc, rank) in rows {
            all_results.push(SearchResultItem {
                id,
                entity_type: "task".into(),
                title,
                subtitle: desc,
                snippet: None,
                rank,
            });
        }
    }

    // ─── Agent 搜索 ─────────────────────────────────────────────
    if search_all || types.contains(&"agent".to_string()) {
        let rows = sqlx::query_as::<_, (String, String, Option<String>, f64)>(
            "SELECT a.id, a.name, a.role_description, fts_agents.rank
             FROM fts_agents
             JOIN agents a ON a.rowid = fts_agents.rowid
             WHERE fts_agents MATCH ?1
               AND a.workspace_id = ?2
             ORDER BY fts_agents.rank
             LIMIT ?3"
        )
        .bind(&fts_query)
        .bind(workspace_id)
        .bind(max_results)
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

        for (id, name, desc, rank) in rows {
            all_results.push(SearchResultItem {
                id,
                entity_type: "agent".into(),
                title: name,
                subtitle: desc,
                snippet: None,
                rank,
            });
        }
    }

    // ─── 团队搜索 ───────────────────────────────────────────────
    if search_all || types.contains(&"team".to_string()) {
        let rows = sqlx::query_as::<_, (String, String, Option<String>, f64)>(
            "SELECT t.id, t.name, t.description, fts_teams.rank
             FROM fts_teams
             JOIN teams t ON t.rowid = fts_teams.rowid
             WHERE fts_teams MATCH ?1
               AND t.workspace_id = ?2
             ORDER BY fts_teams.rank
             LIMIT ?3"
        )
        .bind(&fts_query)
        .bind(workspace_id)
        .bind(max_results)
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

        for (id, name, desc, rank) in rows {
            all_results.push(SearchResultItem {
                id,
                entity_type: "team".into(),
                title: name,
                subtitle: desc,
                snippet: None,
                rank,
            });
        }
    }

    // ─── 技能搜索 ───────────────────────────────────────────────
    if search_all || types.contains(&"skill".to_string()) {
        let rows = sqlx::query_as::<_, (String, String, Option<String>, f64)>(
            "SELECT s.id, s.name, s.description, fts_skills.rank
             FROM fts_skills
             JOIN skills s ON s.rowid = fts_skills.rowid
             WHERE fts_skills MATCH ?1
               AND s.workspace_id = ?2
             ORDER BY fts_skills.rank
             LIMIT ?3"
        )
        .bind(&fts_query)
        .bind(workspace_id)
        .bind(max_results)
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

        for (id, name, desc, rank) in rows {
            all_results.push(SearchResultItem {
                id,
                entity_type: "skill".into(),
                title: name,
                subtitle: desc,
                snippet: None,
                rank,
            });
        }
    }

    // ─── 模型搜索（JOIN provider 获取供应商名作为副标题） ─────────
    if search_all || types.contains(&"model".to_string()) {
        let rows = sqlx::query_as::<_, (String, String, Option<String>, f64)>(
            "SELECT m.id, m.name, p.name as provider_name, fts_models.rank
             FROM fts_models
             JOIN models m ON m.rowid = fts_models.rowid
             JOIN model_providers p ON p.id = m.provider_id
             WHERE fts_models MATCH ?1
               AND p.workspace_id = ?2
             ORDER BY fts_models.rank
             LIMIT ?3"
        )
        .bind(&fts_query)
        .bind(workspace_id)
        .bind(max_results)
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

        for (id, name, provider, rank) in rows {
            all_results.push(SearchResultItem {
                id,
                entity_type: "model".into(),
                title: name,
                subtitle: provider,
                snippet: None,
                rank,
            });
        }
    }

    // ─── 工作流模板搜索 ─────────────────────────────────────────
    if search_all || types.contains(&"workflow".to_string()) {
        let rows = sqlx::query_as::<_, (String, String, Option<String>, f64)>(
            "SELECT w.id, w.name, w.description, fts_workflow_templates.rank
             FROM fts_workflow_templates
             JOIN workflow_templates w ON w.rowid = fts_workflow_templates.rowid
             WHERE fts_workflow_templates MATCH ?1
               AND w.workspace_id = ?2
             ORDER BY fts_workflow_templates.rank
             LIMIT ?3"
        )
        .bind(&fts_query)
        .bind(workspace_id)
        .bind(max_results)
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

        for (id, name, desc, rank) in rows {
            all_results.push(SearchResultItem {
                id,
                entity_type: "workflow".into(),
                title: name,
                subtitle: desc,
                snippet: None,
                rank,
            });
        }
    }

    // 按 BM25 rank 排序（越小越相关）
    all_results.sort_by(|a, b| {
        a.rank.partial_cmp(&b.rank).unwrap_or(std::cmp::Ordering::Equal)
    });

    let total = all_results.len();
    // 全局截断到 max_results 条
    all_results.truncate(max_results as usize);

    Ok(SearchResponse { results: all_results, total })
}
