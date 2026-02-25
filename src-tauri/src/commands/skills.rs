use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::path::Path;
use tauri::State;

use crate::db::DEFAULT_WORKSPACE_ID;
use crate::models::Skill;
use crate::DataDir;

#[tauri::command]
pub async fn list_skills(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<Skill>, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    sqlx::query_as::<_, Skill>(
        "SELECT * FROM skills WHERE workspace_id = ?1 ORDER BY name ASC",
    )
    .bind(workspace_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_skill(
    pool: State<'_, SqlitePool>,
    name: String,
    description: Option<String>,
    icon_name: Option<String>,
    icon_bg: Option<String>,
    scope: Option<String>,
    scope_id: Option<String>,
    permissions_json: Option<String>,
    source: Option<String>,
) -> Result<Skill, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO skills (id, workspace_id, name, description, icon_name, icon_bg, scope, scope_id, permissions_json, source)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
    )
    .bind(&id)
    .bind(workspace_id)
    .bind(&name)
    .bind(&description)
    .bind(&icon_name)
    .bind(&icon_bg)
    .bind(&scope.unwrap_or_else(|| "global".into()))
    .bind(&scope_id)
    .bind(&permissions_json.unwrap_or_else(|| "[]".into()))
    .bind(&source.unwrap_or_else(|| "local".into()))
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Skill>("SELECT * FROM skills WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_skill(
    pool: State<'_, SqlitePool>,
    id: String,
    name: Option<String>,
    description: Option<String>,
    icon_name: Option<String>,
    icon_bg: Option<String>,
    status: Option<String>,
    permissions_json: Option<String>,
) -> Result<Skill, String> {
    let existing = sqlx::query_as::<_, Skill>("SELECT * FROM skills WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query(
        "UPDATE skills SET name = ?1, description = ?2, icon_name = ?3, icon_bg = ?4, status = ?5, permissions_json = ?6, updated_at = datetime('now') WHERE id = ?7",
    )
    .bind(name.unwrap_or(existing.name))
    .bind(description.or(existing.description))
    .bind(icon_name.or(existing.icon_name))
    .bind(icon_bg.or(existing.icon_bg))
    .bind(status.or(existing.status))
    .bind(permissions_json.or(existing.permissions_json))
    .bind(&id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Skill>("SELECT * FROM skills WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

// --- Delete skill ---

#[tauri::command]
pub async fn delete_skill(
    pool: State<'_, SqlitePool>,
    id: String,
) -> Result<(), String> {
    let skill = sqlx::query_as::<_, Skill>("SELECT * FROM skills WHERE id = ?1")
        .bind(&id)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Skill 不存在".to_string())?;

    if skill.source.as_deref() == Some("marketplace") {
        if let Some(ref pj) = skill.permissions_json {
            if let Ok(meta) = serde_json::from_str::<serde_json::Value>(pj) {
                if let Some(path) = meta.get("install_path").and_then(|v| v.as_str()) {
                    let p = std::path::PathBuf::from(path);
                    if p.exists() {
                        let _ = tokio::fs::remove_dir_all(&p).await;
                    }
                }
            }
        }
    }

    sqlx::query("DELETE FROM skills WHERE id = ?1")
        .bind(&id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

// --- Scan external skills ---

#[derive(Debug, Clone, Serialize)]
pub struct ScannedSkill {
    pub name: String,
    pub path: String,
    pub source_tool: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ScanPathInfo {
    pub tool: String,
    pub path: String,
    pub exists: bool,
    pub found: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct ScanResult {
    pub skills: Vec<ScannedSkill>,
    pub scanned_paths: Vec<ScanPathInfo>,
}

fn scan_dir_for_skills(dir: &Path, tool: &str) -> Vec<ScannedSkill> {
    let mut results = Vec::new();
    let Ok(entries) = std::fs::read_dir(dir) else { return results };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let name = entry.file_name().to_string_lossy().to_string();
        let has_skill_md = path.join("SKILL.md").exists();
        let has_rule_md = path.join("RULE.md").exists();
        let has_readme = path.join("README.md").exists();
        let has_mdc = std::fs::read_dir(&path)
            .ok()
            .map(|rd| rd.flatten().any(|e| {
                e.path().extension().map(|ext| ext == "mdc").unwrap_or(false)
            }))
            .unwrap_or(false);

        if has_skill_md || has_rule_md || has_mdc || has_readme {
            let desc = if has_skill_md {
                read_first_description(&path.join("SKILL.md"))
            } else if has_readme {
                read_first_description(&path.join("README.md"))
            } else {
                None
            };

            results.push(ScannedSkill {
                name,
                path: path.display().to_string(),
                source_tool: tool.to_string(),
                description: desc,
            });
        }
    }
    results
}

fn read_first_description(file: &Path) -> Option<String> {
    let content = std::fs::read_to_string(file).ok()?;
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') || trimmed.starts_with("---") {
            continue;
        }
        let desc = if trimmed.len() > 120 { &trimmed[..120] } else { trimmed };
        return Some(desc.to_string());
    }
    None
}

#[tauri::command]
pub async fn scan_external_skills(
    pool: State<'_, SqlitePool>,
) -> Result<ScanResult, String> {
    let home = dirs::home_dir().ok_or("无法获取用户主目录")?;
    let mut all: Vec<ScannedSkill> = Vec::new();
    let mut scanned_paths: Vec<ScanPathInfo> = Vec::new();

    let existing_paths: Vec<(Option<String>,)> = sqlx::query_as(
        "SELECT scope_id FROM skills WHERE workspace_id = 'default'"
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let installed_paths: std::collections::HashSet<String> = existing_paths
        .into_iter()
        .filter_map(|(p,)| p)
        .collect();

    let scan_targets: Vec<(&str, std::path::PathBuf)> = vec![
        ("Cursor Skills", home.join(".cursor").join("skills-cursor")),
        ("Cursor Skills (legacy)", home.join(".cursor").join("skills")),
        ("Cursor Rules", home.join(".cursor").join("rules")),
        ("Claude Code Skills", home.join(".claude").join("skills")),
        ("Claude Code Commands", home.join(".claude").join("commands")),
        ("Codex (agents)", home.join(".agents").join("skills")),
        ("Codex (local)", home.join(".codex").join("skills")),
        ("Antigravity", home.join(".gemini").join("antigravity").join("global_skills")),
        ("Windsurf", home.join(".windsurf")),
        ("ZeroDesk", home.join(".zerodesk").join("skills")),
    ];

    for (tool, dir) in &scan_targets {
        let exists = dir.exists();
        let source: &str = match *tool {
            "Cursor Skills" | "Cursor Skills (legacy)" | "Cursor Rules" => "Cursor",
            "Claude Code Skills" | "Claude Code Commands" => "Claude Code",
            "Codex (agents)" | "Codex (local)" => "Codex",
            other => other,
        };
        let mut found_skills = if exists {
            scan_dir_for_skills(dir, source)
        } else {
            Vec::new()
        };

        scanned_paths.push(ScanPathInfo {
            tool: tool.to_string(),
            path: dir.display().to_string(),
            exists,
            found: found_skills.len(),
        });

        all.append(&mut found_skills);
    }

    // CLAUDE.md special case
    let claude_md = home.join(".claude").join("CLAUDE.md");
    if claude_md.exists() {
        let claude_md_path = claude_md.display().to_string();
        if !installed_paths.contains(&claude_md_path) {
            all.push(ScannedSkill {
                name: "CLAUDE.md".to_string(),
                path: claude_md_path,
                source_tool: "Claude Code".to_string(),
                description: read_first_description(&claude_md),
            });
        }
    }

    all.retain(|s| !installed_paths.contains(&s.path));

    Ok(ScanResult {
        skills: all,
        scanned_paths,
    })
}

#[tauri::command]
pub async fn import_scanned_skill(
    pool: State<'_, SqlitePool>,
    name: String,
    path: String,
    source_tool: String,
    description: Option<String>,
) -> Result<Skill, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;

    let existing = sqlx::query_as::<_, Skill>(
        "SELECT * FROM skills WHERE workspace_id = ?1 AND scope_id = ?2",
    )
    .bind(workspace_id)
    .bind(&path)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    if let Some(s) = existing {
        return Err(format!("「{}」已导入", s.name));
    }

    let id = uuid::Uuid::new_v4().to_string();
    let meta = serde_json::json!({
        "source_tool": source_tool,
        "install_path": path,
    });

    sqlx::query(
        "INSERT INTO skills (id, workspace_id, name, description, icon_name, icon_bg, scope, scope_id, permissions_json, source)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'global', ?7, ?8, 'external')",
    )
    .bind(&id)
    .bind(workspace_id)
    .bind(&name)
    .bind(&description)
    .bind(&source_tool.chars().next().map(|c| c.to_uppercase().to_string()).unwrap_or_default())
    .bind(match source_tool.as_str() {
        "Cursor" => "#2ea043",
        "Claude Code" => "#d4a574",
        "Codex" => "#6f5f80",
        "Antigravity" => "#5b8def",
        _ => "#6C8FC7",
    })
    .bind(&path)
    .bind(meta.to_string())
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Skill>("SELECT * FROM skills WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

// --- Translation helper ---

fn contains_cjk(s: &str) -> bool {
    s.chars().any(|c| {
        let cp = c as u32;
        (0x4E00..=0x9FFF).contains(&cp)
            || (0x3400..=0x4DBF).contains(&cp)
            || (0x3000..=0x303F).contains(&cp)
            || (0xFF00..=0xFFEF).contains(&cp)
    })
}

async fn translate_to_english(
    pool: &SqlitePool,
    text: &str,
) -> Result<String, String> {
    let row = sqlx::query_as::<_, (String, String, String)>(
        "SELECT m.name, mp.base_url, mp.api_key_encrypted
         FROM system_model_assignments sma
         JOIN models m ON m.id = sma.model_id
         JOIN model_providers mp ON m.provider_id = mp.id
         WHERE sma.task_key = 'translation' AND sma.workspace_id = 'default'
         LIMIT 1",
    )
    .fetch_optional(pool)
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
            .fetch_optional(pool)
            .await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "没有可用的模型，无法翻译搜索词。请在模型与路由页面配置翻译模型".to_string())?;
            fallback
        }
    };

    let chat_url = format!(
        "{}/chat/completions",
        base_url.trim_end_matches('/')
    );

    let body = serde_json::json!({
        "model": model_name,
        "max_tokens": 100,
        "temperature": 0,
        "messages": [
            {
                "role": "system",
                "content": "You are a translator. Translate the user's input into English. Output ONLY the translated text, nothing else."
            },
            {
                "role": "user",
                "content": text
            }
        ]
    });

    let client = reqwest::Client::new();
    let resp = client
        .post(&chat_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .timeout(std::time::Duration::from_secs(15))
        .send()
        .await
        .map_err(|e| format!("翻译请求失败: {}", e))?;

    if !resp.status().is_success() {
        return Err("翻译服务不可用，将使用原文搜索".into());
    }

    let json: serde_json::Value = resp
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("解析翻译结果失败: {}", e))?;

    let translated = json
        .get("choices")
        .and_then(|c| c.get(0))
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(|c| c.as_str())
        .unwrap_or(text)
        .trim()
        .to_string();

    Ok(translated)
}

// --- SkillsMP Marketplace ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketplaceSkill {
    pub name: Option<String>,
    pub description: Option<String>,
    pub url: Option<String>,
    pub repo: Option<String>,
    pub stars: Option<i64>,
    pub category: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketplaceSearchResult {
    pub skills: Vec<MarketplaceSkill>,
    pub total: i64,
}

#[tauri::command]
pub async fn search_marketplace_skills(
    pool: State<'_, SqlitePool>,
    query: String,
) -> Result<MarketplaceSearchResult, String> {
    let row: (Option<String>,) =
        sqlx::query_as("SELECT skillsmp_api_key FROM system_settings WHERE id = 1")
            .fetch_one(pool.inner())
            .await
            .map_err(|e| e.to_string())?;

    let api_key = row.0.filter(|k| !k.is_empty()).ok_or_else(|| {
        "未配置 SkillsMP API Key，请在设置页面填写后重试".to_string()
    })?;

    let search_query = if contains_cjk(&query) {
        translate_to_english(pool.inner(), &query)
            .await
            .unwrap_or_else(|_| query.clone())
    } else {
        query.clone()
    };

    let url = format!(
        "https://skillsmp.com/api/v1/skills/ai-search?q={}",
        urlencoding::encode(&search_query),
    );

    let client = reqwest::Client::new();
    let resp = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| format!("请求 SkillsMP 失败: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body: String = resp.text().await.unwrap_or_default();

        let msg = if let Ok(err_json) = serde_json::from_str::<serde_json::Value>(&body) {
            err_json
                .get("error")
                .and_then(|e| e.get("message"))
                .and_then(|m| m.as_str())
                .unwrap_or(&body)
                .to_string()
        } else {
            body
        };

        return Err(format!("SkillsMP 错误 ({}): {}", status, msg));
    }

    let body: serde_json::Value = resp
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("解析 SkillsMP 响应失败: {}", e))?;

    let results_array = body
        .get("data")
        .and_then(|d| d.get("data"))
        .and_then(|d| d.as_array())
        .or_else(|| body.get("skills").and_then(|v| v.as_array()))
        .or_else(|| body.get("results").and_then(|v| v.as_array()));

    let skills: Vec<MarketplaceSkill> = results_array
        .map(|arr| {
            arr.iter().filter_map(|item| {
                let skill_obj = item.get("skill").unwrap_or(item);
                Some(MarketplaceSkill {
                    name: skill_obj.get("name").and_then(|v| v.as_str()).map(String::from),
                    description: skill_obj.get("description").and_then(|v| v.as_str()).map(String::from),
                    url: skill_obj.get("githubUrl").or_else(|| skill_obj.get("url")).and_then(|v| v.as_str()).map(String::from),
                    repo: skill_obj.get("githubUrl").or_else(|| skill_obj.get("repo")).and_then(|v| v.as_str()).map(String::from),
                    stars: skill_obj.get("stars").and_then(|v| v.as_i64()),
                    category: skill_obj.get("category").and_then(|v| v.as_str()).map(String::from),
                    updated_at: skill_obj.get("updatedAt").or_else(|| skill_obj.get("updated_at")).and_then(|v| v.as_str()).map(String::from),
                })
            }).collect()
        })
        .unwrap_or_default();

    let total: i64 = body
        .get("meta")
        .and_then(|m| m.get("total"))
        .and_then(|v| v.as_i64())
        .or_else(|| body.get("total").and_then(|v| v.as_i64()))
        .unwrap_or(skills.len() as i64);

    Ok(MarketplaceSearchResult {
        skills,
        total,
    })
}

// --- GitHub download helpers ---

struct GithubCoords {
    owner: String,
    repo: String,
    branch: String,
    path: String,
}

fn parse_github_url(url: &str) -> Option<GithubCoords> {
    let url = url.trim().trim_end_matches('/');

    // https://github.com/{owner}/{repo}/tree/{branch}/{path...}
    if let Some(rest) = url
        .strip_prefix("https://github.com/")
        .or_else(|| url.strip_prefix("http://github.com/"))
    {
        let parts: Vec<&str> = rest.splitn(5, '/').collect();
        if parts.len() >= 4 && parts[2] == "tree" {
            return Some(GithubCoords {
                owner: parts[0].to_string(),
                repo: parts[1].to_string(),
                branch: parts[3].to_string(),
                path: parts.get(4).unwrap_or(&"").to_string(),
            });
        }
        // https://github.com/{owner}/{repo} (root of default branch)
        if parts.len() >= 2 {
            return Some(GithubCoords {
                owner: parts[0].to_string(),
                repo: parts[1].to_string(),
                branch: "main".to_string(),
                path: String::new(),
            });
        }
    }
    None
}

async fn download_github_dir(
    client: &reqwest::Client,
    coords: &GithubCoords,
    sub_path: &str,
    local_dir: &Path,
) -> Result<usize, String> {
    let api_path = if sub_path.is_empty() {
        coords.path.clone()
    } else if coords.path.is_empty() {
        sub_path.to_string()
    } else {
        format!("{}/{}", coords.path, sub_path)
    };

    let api_url = if api_path.is_empty() {
        format!(
            "https://api.github.com/repos/{}/{}/contents?ref={}",
            coords.owner, coords.repo, coords.branch
        )
    } else {
        format!(
            "https://api.github.com/repos/{}/{}/contents/{}?ref={}",
            coords.owner,
            coords.repo,
            urlencoding::encode(&api_path),
            coords.branch
        )
    };

    let resp = client
        .get(&api_url)
        .header("User-Agent", "ZeroDesk/1.0")
        .header("Accept", "application/vnd.github.v3+json")
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| format!("GitHub API 请求失败: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API 错误 ({}): {}", status, &body[..body.len().min(200)]));
    }

    let entries: Vec<serde_json::Value> = resp
        .json()
        .await
        .map_err(|e| format!("解析 GitHub API 响应失败: {}", e))?;

    let mut count = 0usize;

    for entry in &entries {
        let entry_name = entry.get("name").and_then(|v| v.as_str()).unwrap_or("");
        let entry_type = entry.get("type").and_then(|v| v.as_str()).unwrap_or("");

        if entry_name.is_empty() {
            continue;
        }

        match entry_type {
            "file" => {
                let download_url = entry
                    .get("download_url")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| format!("文件 {} 没有 download_url", entry_name))?;

                let file_resp = client
                    .get(download_url)
                    .header("User-Agent", "ZeroDesk/1.0")
                    .timeout(std::time::Duration::from_secs(60))
                    .send()
                    .await
                    .map_err(|e| format!("下载 {} 失败: {}", entry_name, e))?;

                if !file_resp.status().is_success() {
                    return Err(format!("下载 {} 失败: HTTP {}", entry_name, file_resp.status()));
                }

                let bytes = file_resp
                    .bytes()
                    .await
                    .map_err(|e| format!("读取 {} 内容失败: {}", entry_name, e))?;

                let file_path = local_dir.join(entry_name);
                tokio::fs::write(&file_path, &bytes)
                    .await
                    .map_err(|e| format!("写入 {} 失败: {}", file_path.display(), e))?;

                count += 1;
            }
            "dir" => {
                let child_dir = local_dir.join(entry_name);
                tokio::fs::create_dir_all(&child_dir)
                    .await
                    .map_err(|e| format!("创建目录 {} 失败: {}", child_dir.display(), e))?;

                let child_path = if sub_path.is_empty() {
                    entry_name.to_string()
                } else {
                    format!("{}/{}", sub_path, entry_name)
                };

                count += Box::pin(download_github_dir(client, coords, &child_path, &child_dir)).await?;
            }
            _ => {}
        }
    }

    Ok(count)
}

fn sanitize_dir_name(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' || c == '.' { c } else { '-' })
        .collect::<String>()
        .trim_matches('-')
        .to_string()
}

// --- Install command ---

async fn resolve_skills_dir(pool: &SqlitePool, _fallback: &Path) -> std::path::PathBuf {
    let row: Option<(Option<String>,)> =
        sqlx::query_as("SELECT data_path FROM system_settings WHERE id = 1")
            .fetch_optional(pool)
            .await
            .ok()
            .flatten();

    let default_dir = dirs::home_dir()
        .expect("failed to resolve home directory")
        .join(".zerodesk");

    let base = row
        .and_then(|(p,)| p)
        .filter(|p| !p.is_empty())
        .map(std::path::PathBuf::from)
        .unwrap_or(default_dir);

    base.join("skills")
}

#[tauri::command]
pub async fn install_marketplace_skill(
    pool: State<'_, SqlitePool>,
    data_dir: State<'_, DataDir>,
    name: String,
    description: Option<String>,
    repo: Option<String>,
    category: Option<String>,
) -> Result<Skill, String> {
    let workspace_id = DEFAULT_WORKSPACE_ID;

    let repo_url = repo.as_deref().filter(|r| !r.is_empty())
        .ok_or_else(|| "该 Skill 没有提供仓库地址，无法安装".to_string())?;

    let existing = sqlx::query_as::<_, Skill>(
        "SELECT * FROM skills WHERE workspace_id = ?1 AND source = 'marketplace' AND name = ?2",
    )
    .bind(workspace_id)
    .bind(&name)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    if let Some(skill) = existing {
        return Err(format!("「{}」已安装", skill.name));
    }

    let coords = parse_github_url(repo_url)
        .ok_or_else(|| format!("无法解析 GitHub 地址: {}", repo_url))?;

    let skills_base = resolve_skills_dir(pool.inner(), &data_dir.0).await;
    let dir_name = sanitize_dir_name(&name);
    let skill_dir = skills_base.join(&dir_name);

    tokio::fs::create_dir_all(&skill_dir)
        .await
        .map_err(|e| format!("创建技能目录失败: {}", e))?;

    let client = reqwest::Client::new();
    let download_result = download_github_dir(&client, &coords, "", &skill_dir).await;

    match download_result {
        Ok(count) if count == 0 => {
            let _ = tokio::fs::remove_dir_all(&skill_dir).await;
            return Err("仓库目录为空，没有可下载的文件".to_string());
        }
        Err(e) => {
            let _ = tokio::fs::remove_dir_all(&skill_dir).await;
            return Err(format!("下载失败: {}", e));
        }
        Ok(_) => {}
    }

    let install_path = skill_dir.display().to_string();

    let id = uuid::Uuid::new_v4().to_string();
    let meta = serde_json::json!({
        "repo": repo_url,
        "install_path": install_path,
    });

    sqlx::query(
        "INSERT INTO skills (id, workspace_id, name, description, icon_name, icon_bg, scope, scope_id, permissions_json, source)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'global', ?7, ?8, 'marketplace')",
    )
    .bind(&id)
    .bind(workspace_id)
    .bind(&name)
    .bind(&description)
    .bind(category.as_deref().and_then(|c| c.chars().next()).map(|c| c.to_string()))
    .bind(category.as_deref().map(|_| "#6f5f80"))
    .bind(&install_path)
    .bind(meta.to_string())
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Skill>("SELECT * FROM skills WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())
}
