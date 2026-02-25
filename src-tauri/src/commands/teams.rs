use sqlx::SqlitePool;
use tauri::State;

use crate::db::DEFAULT_WORKSPACE_ID;
use crate::models::{Agent, Team, TeamMember};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AgentPlan {
    pub name: String,
    pub avatar_char: String,
    pub avatar_color: String,
    pub role_description: String,
    pub system_prompt: String,
    pub tools: Vec<String>,
    pub skills: Vec<String>,
    pub model_id: Option<String>,
    pub model_name: Option<String>,
    pub fallback_model_id: Option<String>,
    pub fallback_model_name: Option<String>,
    pub is_existing: bool,
    pub existing_agent_id: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TeamPlan {
    pub team_name: String,
    pub team_description: String,
    pub team_color: String,
    pub agents: Vec<AgentPlan>,
    pub shared_skills: Vec<String>,
}

#[tauri::command]
pub async fn list_teams(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<Team>, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    sqlx::query_as::<_, Team>(
        "SELECT * FROM teams WHERE workspace_id = ?1 ORDER BY updated_at DESC",
    )
    .bind(workspace_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_team(
    pool: State<'_, SqlitePool>,
    name: String,
    description: Option<String>,
    color: Option<String>,
) -> Result<Team, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO teams (id, workspace_id, name, description, color)
         VALUES (?1, ?2, ?3, ?4, ?5)",
    )
    .bind(&id)
    .bind(workspace_id)
    .bind(&name)
    .bind(&description)
    .bind(&color.unwrap_or_else(|| "primary".into()))
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Team>("SELECT * FROM teams WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_team(
    pool: State<'_, SqlitePool>,
    id: String,
    name: Option<String>,
    description: Option<String>,
    color: Option<String>,
    shared_skills_json: Option<String>,
) -> Result<Team, String> {
    let existing = sqlx::query_as::<_, Team>("SELECT * FROM teams WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query(
        "UPDATE teams SET name = ?1, description = ?2, color = ?3, shared_skills_json = ?4, updated_at = datetime('now') WHERE id = ?5",
    )
    .bind(name.unwrap_or(existing.name))
    .bind(description.or(existing.description))
    .bind(color.or(existing.color))
    .bind(shared_skills_json.or(existing.shared_skills_json))
    .bind(&id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Team>("SELECT * FROM teams WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_team(
    pool: State<'_, SqlitePool>,
    id: String,
) -> Result<(), String> {
    sqlx::query("DELETE FROM teams WHERE id = ?1")
        .bind(&id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn add_team_member(
    pool: State<'_, SqlitePool>,
    team_id: String,
    agent_id: String,
) -> Result<(), String> {
    sqlx::query("INSERT OR IGNORE INTO team_members (team_id, agent_id) VALUES (?1, ?2)")
        .bind(&team_id)
        .bind(&agent_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn remove_team_member(
    pool: State<'_, SqlitePool>,
    team_id: String,
    agent_id: String,
) -> Result<(), String> {
    sqlx::query("DELETE FROM team_members WHERE team_id = ?1 AND agent_id = ?2")
        .bind(&team_id)
        .bind(&agent_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn list_all_team_members(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<TeamMember>, String> {
    sqlx::query_as::<_, TeamMember>("SELECT * FROM team_members")
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_team_members(
    pool: State<'_, SqlitePool>,
    team_id: String,
) -> Result<Vec<Agent>, String> {
    sqlx::query_as::<_, Agent>(
        "SELECT a.* FROM agents a INNER JOIN team_members tm ON a.id = tm.agent_id WHERE tm.team_id = ?1",
    )
    .bind(&team_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

fn resolve_model_index<F>(
    raw: &Option<String>,
    index_map: &[(String, String)],
    mut on_found: F,
) -> Option<String>
where
    F: FnMut(&String, &String) -> String,
{
    let val = raw.as_ref()?;
    let idx: usize = val.trim().parse::<usize>().ok()?.checked_sub(1)?;
    let (db_id, display) = index_map.get(idx)?;
    Some(on_found(db_id, display))
}

#[tauri::command]
pub async fn smart_plan_team(
    pool: State<'_, SqlitePool>,
    user_input: String,
) -> Result<TeamPlan, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;

    let row = sqlx::query_as::<_, (String, String, String)>(
        "SELECT m.name, mp.base_url, mp.api_key_encrypted
         FROM system_model_assignments sma
         JOIN models m ON m.id = sma.model_id
         JOIN model_providers mp ON m.provider_id = mp.id
         WHERE sma.task_key = 'team_planning' AND sma.workspace_id = 'default'
         LIMIT 1",
    )
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let (model_name, base_url, api_key) = match row {
        Some(r) => r,
        None => {
            let fallback = sqlx::query_as::<_, (String, String, String)>(
                "SELECT m.name, mp.base_url, mp.api_key_encrypted
                 FROM models m
                 JOIN model_providers mp ON m.provider_id = mp.id
                 WHERE m.enabled = 1 AND mp.enabled = 1
                 ORDER BY mp.avg_latency_ms ASC NULLS LAST
                 LIMIT 1",
            )
            .fetch_optional(pool.inner())
            .await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| {
                "没有可用的模型。请在「模型与路由」页面配置团队规划模型，或启用至少一个模型"
                    .to_string()
            })?;
            fallback
        }
    };

    let agents: Vec<Agent> = sqlx::query_as("SELECT * FROM agents WHERE workspace_id = ?1")
        .bind(workspace_id)
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let skills: Vec<(String, Option<String>)> =
        sqlx::query_as("SELECT name, description FROM skills WHERE workspace_id = ?1")
            .bind(workspace_id)
            .fetch_all(pool.inner())
            .await
            .map_err(|e| e.to_string())?;

    let models_info: Vec<(String, String, String, Option<i64>, Option<String>, Option<f64>)> = sqlx::query_as(
        "SELECT m.id, m.name, mp.name, m.quality_rating, m.speed_tier, m.price_per_million_tokens \
         FROM models m \
         JOIN model_providers mp ON m.provider_id = mp.id \
         WHERE m.enabled = 1 AND mp.enabled = 1",
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    // index → (db_id, display_name)
    let model_index_map: Vec<(String, String)> = models_info
        .iter()
        .map(|(db_id, name, provider, _, _, _)| {
            (db_id.clone(), format!("{} ({})", name, provider))
        })
        .collect();

    let agents_ctx = agents
        .iter()
        .map(|a| {
            format!(
                "- name: \"{}\", role: \"{}\", skills: {} (id: \"{}\")",
                a.name,
                a.role_description.as_deref().unwrap_or(""),
                a.skills_json.as_deref().unwrap_or("[]"),
                a.id
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    let skills_ctx = skills
        .iter()
        .map(|(name, desc)| {
            format!(
                "- name: \"{}\" - {}",
                name,
                desc.as_deref().unwrap_or("无描述")
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    let models_ctx = models_info
        .iter()
        .enumerate()
        .map(|(idx, (_db_id, name, provider, quality, speed, price))| {
            format!(
                "- [{}] {} — 提供商: {} (quality: {}, speed: {}, price: {}/M tokens)",
                idx + 1,
                name,
                provider,
                quality.map_or("N/A".to_string(), |q| q.to_string()),
                speed.as_deref().unwrap_or("N/A"),
                price.map_or("N/A".to_string(), |p| format!("{:.2}", p))
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    let system_prompt = format!(
        r#"你是一位专业的 AI 团队规划师。根据用户的需求，规划一个完整的 AI Agent 团队方案。

你必须且只能输出一个合法的 JSON 对象，严格匹配以下结构：
{{
  "team_name": "团队名称",
  "team_description": "团队描述",
  "team_color": "从可选列表中选择",
  "agents": [
    {{
      "name": "Agent名称",
      "avatar_char": "名称首字符",
      "avatar_color": "从可选列表中选择",
      "role_description": "角色描述",
      "system_prompt": "完整的系统提示词",
      "tools": ["从可选列表中选择"],
      "skills": ["从已安装技能中选择"],
      "model_id": "主模型的编号(数字)或null",
      "fallback_model_id": "兜底模型的编号(数字)或null",
      "is_existing": false,
      "existing_agent_id": null
    }}
  ],
  "shared_skills": ["团队共享技能"]
}}

规则：
1. team_color 只能从以下选项中选择：["primary","sage","coral","lavender","sand"]
2. avatar_color 只能从以下选项中选择：["bg-primary","bg-sage","bg-coral","bg-lavender","bg-sand"]
3. tools 只能从以下选项中选择：["search","file","exec"]
4. skills 和 shared_skills 只能使用下方「已安装技能」列表中存在的技能名称
5. 如果某个已有 Agent 适合该角色，设置 is_existing: true 并填写 existing_agent_id
6. 对于新建的 Agent，is_existing 为 false，existing_agent_id 为 null
7. avatar_char 取 Agent 名称的第一个字符
8. system_prompt 必须是完整且专业的系统提示词
9. model_id 和 fallback_model_id 填写可用模型列表中方括号内的编号数字（如 1、2、3），不要填写模型名称
10. 模型分配策略：需要复杂推理的 Agent（如项目经理、架构师）分配 quality 更高的模型编号作为 model_id；执行简单任务的 Agent 可分配 speed 更快的模型。fallback_model_id 应选择一个比 model_id 更快或更便宜的备选模型编号。如果只有一个可用模型，两个字段都填 1。如果没有可用模型，两个字段都填 null
11. 不要输出 JSON 以外的任何内容，不要包含 markdown 代码块标记

已有 Agent：
{agents_ctx}

已安装技能：
{skills_ctx}

可用模型：
{models_ctx}"#,
        agents_ctx = if agents_ctx.is_empty() { "（无）".to_string() } else { agents_ctx },
        skills_ctx = if skills_ctx.is_empty() { "（无）".to_string() } else { skills_ctx },
        models_ctx = if models_ctx.is_empty() { "（无）".to_string() } else { models_ctx },
    );

    let chat_url = format!("{}/chat/completions", base_url.trim_end_matches('/'));

    let body = serde_json::json!({
        "model": model_name,
        "max_tokens": 4000,
        "temperature": 0.7,
        "messages": [
            { "role": "system", "content": system_prompt },
            { "role": "user", "content": user_input }
        ]
    });

    let client = reqwest::Client::new();
    let resp = client
        .post(&chat_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .timeout(std::time::Duration::from_secs(60))
        .send()
        .await
        .map_err(|e| format!("团队规划请求失败: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("团队规划服务返回错误 ({}): {}", status, text));
    }

    let json: serde_json::Value = resp
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("解析团队规划结果失败: {}", e))?;

    let raw = json
        .get("choices")
        .and_then(|c| c.get(0))
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(|c| c.as_str())
        .ok_or_else(|| "模型返回数据格式异常，无法提取团队方案".to_string())?;

    let cleaned = raw
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    // LLM may output model_id / fallback_model_id as integers instead of strings.
    // Normalize them to strings before deserializing into TeamPlan.
    let mut raw_value: serde_json::Value = serde_json::from_str(cleaned)
        .map_err(|e| format!("解析 AI 返回的团队方案失败: {}", e))?;
    if let Some(agents) = raw_value.get_mut("agents").and_then(|a| a.as_array_mut()) {
        for agent in agents {
            for key in &["model_id", "fallback_model_id"] {
                if let Some(val) = agent.get_mut(*key) {
                    if let Some(n) = val.as_i64() {
                        *val = serde_json::Value::String(n.to_string());
                    } else if let Some(n) = val.as_f64() {
                        *val = serde_json::Value::String((n as i64).to_string());
                    }
                }
            }
        }
    }
    let mut plan: TeamPlan = serde_json::from_value(raw_value)
        .map_err(|e| format!("解析 AI 返回的团队方案失败: {}", e))?;

    // Resolve model index numbers to actual database IDs and display names.
    // LLM outputs "1", "2", etc. — map to 0-based index into model_index_map.
    for agent in &mut plan.agents {
        agent.model_id = resolve_model_index(&agent.model_id, &model_index_map, |db_id, display| {
            agent.model_name = Some(display.clone());
            db_id.clone()
        });
        agent.fallback_model_id = resolve_model_index(&agent.fallback_model_id, &model_index_map, |db_id, display| {
            agent.fallback_model_name = Some(display.clone());
            db_id.clone()
        });
    }

    Ok(plan)
}

#[tauri::command]
pub async fn execute_team_plan(
    pool: State<'_, SqlitePool>,
    plan: TeamPlan,
) -> Result<Team, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    let team_id = uuid::Uuid::new_v4().to_string();
    let shared_skills_json = serde_json::to_string(&plan.shared_skills)
        .map_err(|e| e.to_string())?;

    sqlx::query(
        "INSERT INTO teams (id, workspace_id, name, description, color, shared_skills_json)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    )
    .bind(&team_id)
    .bind(workspace_id)
    .bind(&plan.team_name)
    .bind(&plan.team_description)
    .bind(&plan.team_color)
    .bind(&shared_skills_json)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    for agent in plan.agents {
        let agent_id = if agent.is_existing {
            match agent.existing_agent_id {
                Some(id) => id,
                None => continue,
            }
        } else {
            let id = uuid::Uuid::new_v4().to_string();
            let tools_json = serde_json::to_string(&agent.tools).map_err(|e| e.to_string())?;
            let skills_json = serde_json::to_string(&agent.skills).map_err(|e| e.to_string())?;

            sqlx::query(
                "INSERT INTO agents (id, workspace_id, name, avatar_char, avatar_color, role_description, system_prompt, model_id, fallback_model_id, tools_json, skills_json, is_template)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            )
            .bind(&id)
            .bind(workspace_id)
            .bind(&agent.name)
            .bind(&agent.avatar_char)
            .bind(&agent.avatar_color)
            .bind(&agent.role_description)
            .bind(&agent.system_prompt)
            .bind(&agent.model_id)
            .bind(&agent.fallback_model_id)
            .bind(&tools_json)
            .bind(&skills_json)
            .bind(0i64)
            .execute(pool.inner())
            .await
            .map_err(|e| e.to_string())?;

            id
        };

        sqlx::query("INSERT OR IGNORE INTO team_members (team_id, agent_id) VALUES (?1, ?2)")
            .bind(&team_id)
            .bind(&agent_id)
            .execute(pool.inner())
            .await
            .map_err(|e| e.to_string())?;
    }

    sqlx::query_as::<_, Team>("SELECT * FROM teams WHERE id = ?1")
        .bind(&team_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}
