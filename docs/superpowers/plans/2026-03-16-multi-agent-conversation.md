# 多 Agent 对话协议 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现多 Agent 之间可追溯的群聊式对话流，支持引用回复、@mention 人工干预、上下文智能传递

**Architecture:** 在现有 Tauri (Rust) + React 架构上增量改造。后端新增 context_builder 模块负责上下文构建和摘要压缩，改造 engine.rs 支持消息驱动的执行流和暂停/恢复。前端在现有 Console 页面基础上增加引用气泡、@mention 输入和暂停控制。

**Tech Stack:** Rust (Tauri 2, sqlx, tokio, reqwest), React 19, TypeScript, Zustand, TanStack React Query, Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-03-16-multi-agent-conversation-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src-tauri/src/db/migrations/012_agent_conversation.sql` | DB schema changes: reply_to_id, step_id, context_window_tokens |
| `src-tauri/src/context_builder.rs` | 上下文构建：消息截取、token 计数、LLM 摘要压缩 |
| `src/app/console/components/QuoteBlock.tsx` | 引用气泡子组件 |
| `src/app/console/components/ChatMessage.tsx` | 单条消息渲染（抽取自 page.tsx） |
| `src/app/console/components/ChatInput.tsx` | @mention 输入框 |
| `src/app/console/components/PauseControl.tsx` | 暂停状态条 + 继续/调整按钮 |
| `src/app/console/components/AgentMentionPopover.tsx` | @mention Agent 选择弹窗 |

### Modified Files
| File | Changes |
|------|---------|
| `src-tauri/src/db/mod.rs` | 注册 migration 012 |
| `src-tauri/src/models/mod.rs` | ExecutionMessage 增加 step_id, reply_to_id；Model 增加 context_window_tokens |
| `src-tauri/src/engine.rs` | 消息驱动执行、暂停/恢复、side conversation、context builder 集成 |
| `src-tauri/src/commands/tasks.rs` | 新增 send_user_message、resume_execution、adjust_direction 命令 |
| `src-tauri/src/lib.rs` | 注册新命令、注册 context_builder 模块 |
| `src/types/index.ts` | ExecutionMessage 增加 step_id, reply_to_id；Model 增加 context_window_tokens |
| `src/hooks/useTasks.ts` | 新增 useSendUserMessage、useResumeExecution、useAdjustDirection hooks |
| `src/stores/useStreamStore.ts` | 支持 execution:message 事件驱动刷新 |
| `src/components/layout/AppLayout.tsx` | 监听 execution:message 事件 |
| `src/app/console/page.tsx` | 集成新组件，重构消息渲染 |

---

## Chunk 1: Database Migration + Rust Models

### Task 1: Database Migration

**Files:**
- Create: `src-tauri/src/db/migrations/012_agent_conversation.sql`
- Modify: `src-tauri/src/db/mod.rs:6-18` (add migration include)

- [ ] **Step 1: Write migration SQL**

```sql
-- 012_agent_conversation.sql

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

-- task_runs 增加 paused 状态支持（现有 CHECK 约束需重建）
-- SQLite 不支持 ALTER CHECK，通过应用层校验 paused 状态
-- task_runs.status 现有值: running/paused/completed/failed (paused 已在 CHECK 中)

-- system_model_assignments 增加 summarization task_key
-- 需重建表以更新 CHECK 约束
CREATE TABLE IF NOT EXISTS system_model_assignments_new (
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    task_key TEXT NOT NULL CHECK(task_key IN ('planning','prompt','quality','summary','translation','team_planning','summarization')),
    model_id TEXT NOT NULL REFERENCES models(id),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (workspace_id, task_key)
);
INSERT OR IGNORE INTO system_model_assignments_new SELECT * FROM system_model_assignments;
DROP TABLE IF EXISTS system_model_assignments;
ALTER TABLE system_model_assignments_new RENAME TO system_model_assignments;
```

- [ ] **Step 2: Register migration in db/mod.rs**

In `src-tauri/src/db/mod.rs`, add after the last migration include:

```rust
const MIGRATION_012: &str = include_str!("migrations/012_agent_conversation.sql");
```

Add to migrations array:

```rust
let migrations = [
    MIGRATION_001, MIGRATION_002, MIGRATION_003, MIGRATION_004,
    MIGRATION_005, MIGRATION_006, MIGRATION_007, MIGRATION_008,
    MIGRATION_009, MIGRATION_010, MIGRATION_011, MIGRATION_012,
];
```

- [ ] **Step 3: Verify migration compiles**

Run: `cd /Users/zhangyiming/Documents/Code/MyOwn/ZeroDesk && cargo check --manifest-path src-tauri/Cargo.toml`
Expected: Compiles without errors

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/db/migrations/012_agent_conversation.sql src-tauri/src/db/mod.rs
git commit -m "feat(db): 添加多Agent对话所需的数据库迁移

- execution_messages 新增 step_id 和 reply_to_id 列
- models 新增 context_window_tokens 列
- system_model_assignments 新增 summarization task_key
- 新增消息查询索引"
```

---

### Task 2: Update Rust Data Models

**Files:**
- Modify: `src-tauri/src/models/mod.rs:121-132` (Model struct)
- Modify: `src-tauri/src/models/mod.rs:245-257` (ExecutionMessage struct)

- [ ] **Step 1: Add context_window_tokens to Model struct**

In `Model` struct (around line 121), add field:

```rust
pub struct Model {
    pub id: String,
    pub provider_id: String,
    pub name: String,
    pub quality_rating: Option<i32>,
    pub speed_tier: Option<String>,
    pub price_per_million_tokens: Option<f64>,
    pub status: Option<String>,
    pub enabled: Option<i32>,
    pub context_window_tokens: Option<i32>,  // NEW
    pub created_at: Option<String>,
}
```

- [ ] **Step 2: Add step_id and reply_to_id to ExecutionMessage struct**

In `ExecutionMessage` struct (around line 245), add fields:

```rust
pub struct ExecutionMessage {
    pub id: String,
    pub task_id: String,
    pub run_id: Option<String>,
    pub step_id: Option<String>,          // NEW
    pub sender_type: String,
    pub sender_id: Option<String>,
    pub sender_name: Option<String>,
    pub content: String,
    pub content_type: Option<String>,
    pub reply_to_id: Option<String>,      // NEW
    pub metadata_json: Option<String>,
    pub created_at: String,
}
```

- [ ] **Step 3: Verify compilation**

Run: `cd /Users/zhangyiming/Documents/Code/MyOwn/ZeroDesk && cargo check --manifest-path src-tauri/Cargo.toml`
Expected: Compiles (may have warnings about unused fields, which is fine)

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/models/mod.rs
git commit -m "feat(models): ExecutionMessage 增加 step_id/reply_to_id，Model 增加 context_window_tokens"
```

---

### Task 3: Update Frontend Types

**Files:**
- Modify: `src/types/index.ts:296-309` (ExecutionMessage interface)
- Modify: `src/types/index.ts` (Model interface, around line 165)

- [ ] **Step 1: Update ExecutionMessage interface**

```typescript
export interface ExecutionMessage {
  id: string;
  task_id: string;
  run_id?: string;
  step_id?: string;          // NEW
  sender_type: 'agent' | 'human' | 'system';
  sender_id?: string;
  sender_name?: string;
  content: string;
  content_type?: string;
  reply_to_id?: string;      // NEW
  metadata_json?: string;
  created_at: string;
}
```

- [ ] **Step 2: Update Model interface**

Add to Model interface:

```typescript
context_window_tokens?: number;  // NEW
```

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): 前端类型同步 - ExecutionMessage 增加 step_id/reply_to_id"
```

---

## Chunk 2: Context Builder + Engine Refactoring

### Task 4: Context Builder Module

**Files:**
- Create: `src-tauri/src/context_builder.rs`
- Modify: `src-tauri/src/lib.rs:1-5` (add module declaration)

- [ ] **Step 1: Create context_builder.rs**

```rust
use sqlx::SqlitePool;
use serde_json;

/// 上下文消息，用于构建 LLM prompt
#[derive(Debug, Clone)]
pub struct ContextMessage {
    pub role: String,       // "system" | "user" | "assistant"
    pub content: String,
}

/// 构建 Agent 执行时的上下文消息列表
///
/// 策略：
/// 1. 系统提示词（Agent 角色定义）
/// 2. 任务描述 + 目标
/// 3. 直接上游步骤的完整输出
/// 4. 被引用消息的原文（如果有 reply_to）
/// 5. 最近 N 条非 system 消息
/// 6. 若 token 超过阈值，触发摘要压缩
pub async fn build_context(
    pool: &SqlitePool,
    task_id: &str,
    run_id: &str,
    current_step_id: &str,
    agent_system_prompt: &str,
    task_goal: &str,
    context_window: i32,
    threshold_ratio: f64,
) -> Result<Vec<ContextMessage>, String> {
    let mut messages = Vec::new();

    // 1. 系统提示词
    messages.push(ContextMessage {
        role: "system".to_string(),
        content: agent_system_prompt.to_string(),
    });

    // 2. 任务目标
    messages.push(ContextMessage {
        role: "system".to_string(),
        content: format!("任务目标：{}", task_goal),
    });

    // 3. 获取上游步骤输出
    let upstream_output = get_upstream_step_output(pool, task_id, run_id, current_step_id).await?;
    if let Some(output) = upstream_output {
        messages.push(ContextMessage {
            role: "user".to_string(),
            content: format!("上一步骤输出：\n{}", output),
        });
    }

    // 4. 获取最近 N 条非 system 消息
    let recent_messages = get_recent_messages(pool, task_id, run_id, 10).await?;

    // 5. 计算 token 估算（粗略：1 token ≈ 4 chars 英文 / 2 chars 中文，取平均 3）
    let total_chars: usize = messages.iter().map(|m| m.content.len()).sum::<usize>()
        + recent_messages.iter().map(|m| m.content.len()).sum::<usize>();
    let estimated_tokens = (total_chars / 3) as i32;
    let threshold = (context_window as f64 * threshold_ratio) as i32;

    if estimated_tokens > threshold {
        // 触发摘要压缩
        let summary = try_summarize(pool, task_id, run_id, &recent_messages).await;
        match summary {
            Ok(summary_text) => {
                messages.push(ContextMessage {
                    role: "system".to_string(),
                    content: format!("以下为之前对话的摘要：\n{}", summary_text),
                });
                // 保留最近 3 条原文
                for msg in recent_messages.iter().rev().take(3).rev() {
                    messages.push(msg.clone());
                }
            }
            Err(_) => {
                // 摘要失败，退回截断策略：保留最近 5 条
                for msg in recent_messages.iter().rev().take(5).rev() {
                    messages.push(msg.clone());
                }
            }
        }
    } else {
        // 正常传递所有最近消息
        for msg in &recent_messages {
            messages.push(msg.clone());
        }
    }

    Ok(messages)
}

/// 获取上游步骤的 Agent 输出
async fn get_upstream_step_output(
    pool: &SqlitePool,
    task_id: &str,
    run_id: &str,
    current_step_id: &str,
) -> Result<Option<String>, String> {
    // 获取当前步骤的 step_order
    let current_order: Option<(i32,)> = sqlx::query_as(
        "SELECT step_order FROM task_steps WHERE id = ?"
    )
    .bind(current_step_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?;

    let current_order = match current_order {
        Some((order,)) => order,
        None => return Ok(None),
    };

    if current_order <= 1 {
        return Ok(None);
    }

    // 获取上一步骤的最后一条 agent 消息
    let prev_msg: Option<(String,)> = sqlx::query_as(
        "SELECT em.content FROM execution_messages em
         JOIN task_steps ts ON em.step_id = ts.id
         WHERE em.task_id = ? AND em.run_id = ?
         AND ts.step_order = ? AND em.sender_type = 'agent'
         ORDER BY em.created_at DESC LIMIT 1"
    )
    .bind(task_id)
    .bind(run_id)
    .bind(current_order - 1)
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(prev_msg.map(|(content,)| content))
}

/// 获取最近 N 条非 system 消息，转换为 ContextMessage
async fn get_recent_messages(
    pool: &SqlitePool,
    task_id: &str,
    run_id: &str,
    limit: i32,
) -> Result<Vec<ContextMessage>, String> {
    let rows: Vec<(String, String, Option<String>)> = sqlx::query_as(
        "SELECT sender_type, content, sender_name FROM execution_messages
         WHERE task_id = ? AND run_id = ? AND sender_type != 'system'
         ORDER BY created_at DESC LIMIT ?"
    )
    .bind(task_id)
    .bind(run_id)
    .bind(limit)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut messages: Vec<ContextMessage> = rows.iter().rev().map(|(sender_type, content, sender_name)| {
        let role = match sender_type.as_str() {
            "agent" => "assistant".to_string(),
            "human" => "user".to_string(),
            _ => "system".to_string(),
        };
        let prefix = match sender_name {
            Some(name) => format!("[{}] ", name),
            None => String::new(),
        };
        ContextMessage {
            role,
            content: format!("{}{}", prefix, content),
        }
    }).collect();

    Ok(messages)
}

/// 尝试通过 LLM 生成对话摘要，失败时返回 Err
async fn try_summarize(
    _pool: &SqlitePool,
    _task_id: &str,
    _run_id: &str,
    messages: &[ContextMessage],
) -> Result<String, String> {
    // TODO: 在 Task 5 中实现 LLM 摘要调用
    // 暂时返回简单的截断摘要
    let summary: String = messages.iter()
        .map(|m| {
            let preview: String = m.content.chars().take(100).collect();
            format!("- {}", preview)
        })
        .collect::<Vec<_>>()
        .join("\n");
    Ok(format!("对话摘要（{}条消息）：\n{}", messages.len(), summary))
}

/// 计算消息的 token 总数（从 metadata_json 中提取）
pub async fn get_total_tokens_for_run(
    pool: &SqlitePool,
    task_id: &str,
    run_id: &str,
) -> Result<i64, String> {
    let rows: Vec<(Option<String>,)> = sqlx::query_as(
        "SELECT metadata_json FROM execution_messages
         WHERE task_id = ? AND run_id = ? AND metadata_json IS NOT NULL"
    )
    .bind(task_id)
    .bind(run_id)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut total: i64 = 0;
    for (metadata,) in rows {
        if let Some(meta_str) = metadata {
            if let Ok(meta) = serde_json::from_str::<serde_json::Value>(&meta_str) {
                let input = meta.get("tokens_input").and_then(|v| v.as_i64()).unwrap_or(0);
                let output = meta.get("tokens_output").and_then(|v| v.as_i64()).unwrap_or(0);
                total += input + output;
            }
        }
    }
    Ok(total)
}
```

- [ ] **Step 2: Register module in lib.rs**

In `src-tauri/src/lib.rs`, add module declaration:

```rust
mod context_builder;
```

- [ ] **Step 3: Verify compilation**

Run: `cd /Users/zhangyiming/Documents/Code/MyOwn/ZeroDesk && cargo check --manifest-path src-tauri/Cargo.toml`
Expected: Compiles (try_summarize has TODO, but returns placeholder)

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/context_builder.rs src-tauri/src/lib.rs
git commit -m "feat(engine): 新增 context_builder 模块 - 上下文构建与摘要压缩

- build_context: 按策略构建 Agent 执行上下文
- 支持上游步骤输出传递、最近消息截取
- token 阈值检测，超阈值触发摘要（LLM 摘要待后续实现）
- 摘要失败自动退回截断策略"
```

---

### Task 5: Engine Refactoring - Message-Driven Execution

**Files:**
- Modify: `src-tauri/src/engine.rs` (major refactoring)

- [ ] **Step 1: Update create_message to support step_id and reply_to_id**

Modify `create_message` function (line 647-676) to add new parameters:

```rust
async fn create_message(
    pool: &SqlitePool,
    task_id: &str,
    run_id: Option<&str>,
    step_id: Option<&str>,          // NEW
    sender_type: &str,
    sender_id: Option<&str>,
    sender_name: Option<&str>,
    content: &str,
    content_type: &str,
    reply_to_id: Option<&str>,      // NEW
    metadata_json: Option<&str>,
) -> Result<String, String> {
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO execution_messages (id, task_id, run_id, step_id, sender_type, sender_id, sender_name, content, content_type, reply_to_id, metadata_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(task_id)
    .bind(run_id)
    .bind(step_id)
    .bind(sender_type)
    .bind(sender_id)
    .bind(sender_name)
    .bind(content)
    .bind(content_type)
    .bind(reply_to_id)
    .bind(metadata_json)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(id)
}
```

- [ ] **Step 2: Update all create_message call sites in engine.rs**

Find every call to `create_message` in `run_task` (approximately 6-8 calls) and add the `step_id` and `reply_to_id` parameters. For existing calls:
- `step_id`: pass `Some(step.id.as_str())` when inside a step execution loop, `None` for task-level messages
- `reply_to_id`: pass `None` for all existing calls (only user intervention messages will use this)

- [ ] **Step 3: Add execution:message event emission**

After each `create_message` call, emit an event:

```rust
// After create_message returns the message id
let _ = app_handle.emit("execution:message", serde_json::json!({
    "id": &msg_id,
    "task_id": &task_id,
    "run_id": &run_id,
    "step_id": step_id_opt,
    "sender_type": sender_type,
    "sender_id": sender_id_opt,
    "sender_name": sender_name_opt,
    "reply_to_id": reply_to_id_opt,
    "content_type": content_type,
}));
```

- [ ] **Step 4: Add pause check in step execution loop**

In `run_task`, inside the step iteration loop (around line 116), add pause state check:

```rust
// At the start of each step iteration, check if paused
let run_status: Option<(String,)> = sqlx::query_as(
    "SELECT status FROM task_runs WHERE id = ?"
)
.bind(&run_id)
.fetch_optional(&*pool)
.await
.map_err(|e| e.to_string())?;

if let Some((status,)) = &run_status {
    if status == "paused" {
        // Wait for resume - check every 500ms
        loop {
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
            let check: Option<(String,)> = sqlx::query_as(
                "SELECT status FROM task_runs WHERE id = ?"
            )
            .bind(&run_id)
            .fetch_optional(&*pool)
            .await
            .map_err(|e| e.to_string())?;
            match check {
                Some((s,)) if s == "running" => break,
                Some((s,)) if s == "failed" || s == "completed" => return Ok(()),
                _ => continue,
            }
        }
    }
}
```

- [ ] **Step 5: Verify compilation**

Run: `cd /Users/zhangyiming/Documents/Code/MyOwn/ZeroDesk && cargo check --manifest-path src-tauri/Cargo.toml`
Expected: Compiles without errors

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/engine.rs
git commit -m "feat(engine): 消息驱动执行 - create_message 支持 step_id/reply_to_id

- create_message 返回消息 ID，支持 step_id 和 reply_to_id
- 每条消息写入后发出 execution:message 事件
- 步骤执行循环中检查暂停状态，暂停时轮询等待恢复"
```

---

### Task 6: New Tauri Commands

**Files:**
- Modify: `src-tauri/src/commands/tasks.rs` (add 3 new commands)
- Modify: `src-tauri/src/lib.rs` (register commands)

- [ ] **Step 1: Add send_user_message command**

Append to `commands/tasks.rs`:

```rust
/// 用户发送消息并暂停执行
#[tauri::command]
pub async fn send_user_message(
    pool: tauri::State<'_, SqlitePool>,
    app_handle: tauri::AppHandle,
    task_id: String,
    run_id: String,
    content: String,
    mention_agent_id: Option<String>,
    reply_to_id: Option<String>,
) -> Result<serde_json::Value, String> {
    // 1. 暂停执行
    sqlx::query("UPDATE task_runs SET status = 'paused' WHERE id = ? AND status = 'running'")
        .bind(&run_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    // 2. 创建用户消息
    let msg_id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO execution_messages (id, task_id, run_id, sender_type, sender_id, sender_name, content, content_type, reply_to_id)
         VALUES (?, ?, ?, 'human', NULL, '你', ?, 'text', ?)"
    )
    .bind(&msg_id)
    .bind(&task_id)
    .bind(&run_id)
    .bind(&content)
    .bind(&reply_to_id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    // 3. 发出消息事件
    let _ = app_handle.emit("execution:message", serde_json::json!({
        "id": &msg_id,
        "task_id": &task_id,
        "run_id": &run_id,
        "sender_type": "human",
        "content_type": "text",
        "reply_to_id": &reply_to_id,
    }));

    // 4. 如果 @了某个 Agent，触发该 Agent 回复
    if let Some(agent_id) = &mention_agent_id {
        // 获取 Agent 信息
        let agent: Option<crate::models::Agent> = sqlx::query_as(
            "SELECT * FROM agents WHERE id = ?"
        )
        .bind(agent_id)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

        if let Some(agent) = agent {
            // 获取模型信息
            let model_info = crate::engine::resolve_model(pool.inner(), &agent, None).await?;

            // 构建简单上下文：Agent system prompt + 最近 5 条消息 + 用户消息
            let recent: Vec<(String, String, Option<String>)> = sqlx::query_as(
                "SELECT sender_type, content, sender_name FROM execution_messages
                 WHERE task_id = ? AND run_id = ? ORDER BY created_at DESC LIMIT 5"
            )
            .bind(&task_id)
            .bind(&run_id)
            .fetch_all(pool.inner())
            .await
            .map_err(|e| e.to_string())?;

            let mut prompt_messages = Vec::new();

            // Agent 系统提示词
            if let Some(ref sp) = agent.system_prompt {
                prompt_messages.push(serde_json::json!({"role": "system", "content": sp}));
            }

            // 最近消息（逆序还原）
            for (st, c, sn) in recent.iter().rev() {
                let role = if st == "agent" { "assistant" } else { "user" };
                let prefix = sn.as_deref().map(|n| format!("[{}] ", n)).unwrap_or_default();
                prompt_messages.push(serde_json::json!({"role": role, "content": format!("{}{}", prefix, c)}));
            }

            // 调用 LLM（使用现有 call_llm_streaming 逻辑）
            let (base_url, api_key, model_name) = model_info;
            let result = crate::engine::call_llm_streaming(
                &app_handle, &task_id, &base_url, &api_key, &model_name,
                &agent.system_prompt.unwrap_or_default(),
                &content,
            ).await?;

            // 保存 Agent 回复
            let reply_id = uuid::Uuid::new_v4().to_string();
            let metadata = serde_json::json!({
                "thinking": if result.thinking.is_empty() { serde_json::Value::Null } else { serde_json::Value::String(result.thinking) },
                "model": &model_name,
                "tokens_input": result.tokens_input,
                "tokens_output": result.tokens_output,
                "duration_ms": result.duration_ms,
            });

            sqlx::query(
                "INSERT INTO execution_messages (id, task_id, run_id, sender_type, sender_id, sender_name, content, content_type, reply_to_id, metadata_json)
                 VALUES (?, ?, ?, 'agent', ?, ?, ?, 'text', ?, ?)"
            )
            .bind(&reply_id)
            .bind(&task_id)
            .bind(&run_id)
            .bind(&agent.id)
            .bind(&agent.name)
            .bind(&result.content)
            .bind(&msg_id)
            .bind(&metadata.to_string())
            .execute(pool.inner())
            .await
            .map_err(|e| e.to_string())?;

            let _ = app_handle.emit("execution:message", serde_json::json!({
                "id": &reply_id,
                "task_id": &task_id,
                "run_id": &run_id,
                "sender_type": "agent",
                "sender_id": &agent.id,
                "sender_name": &agent.name,
                "reply_to_id": &msg_id,
                "content_type": "text",
            }));
        }
    }

    Ok(serde_json::json!({ "message_id": msg_id, "status": "paused" }))
}
```

- [ ] **Step 2: Add resume_execution command**

```rust
/// 恢复执行
#[tauri::command]
pub async fn resume_execution(
    pool: tauri::State<'_, SqlitePool>,
    app_handle: tauri::AppHandle,
    task_id: String,
    run_id: String,
) -> Result<serde_json::Value, String> {
    sqlx::query("UPDATE task_runs SET status = 'running' WHERE id = ? AND status = 'paused'")
        .bind(&run_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    // 发出系统消息
    let msg_id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO execution_messages (id, task_id, run_id, sender_type, content, content_type)
         VALUES (?, ?, ?, 'system', '执行已恢复', 'text')"
    )
    .bind(&msg_id)
    .bind(&task_id)
    .bind(&run_id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let _ = app_handle.emit("execution:message", serde_json::json!({
        "id": &msg_id,
        "task_id": &task_id,
        "run_id": &run_id,
        "sender_type": "system",
        "content_type": "text",
    }));

    Ok(serde_json::json!({ "status": "running" }))
}
```

- [ ] **Step 3: Add adjust_direction command**

```rust
/// 调整方向 - 用户提供文字指示，注入后续步骤 prompt
#[tauri::command]
pub async fn adjust_direction(
    pool: tauri::State<'_, SqlitePool>,
    app_handle: tauri::AppHandle,
    task_id: String,
    run_id: String,
    instruction: String,
) -> Result<serde_json::Value, String> {
    // 1. 保存用户的调整指示为消息
    let msg_id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO execution_messages (id, task_id, run_id, sender_type, sender_name, content, content_type)
         VALUES (?, ?, ?, 'human', '你', ?, 'text')"
    )
    .bind(&msg_id)
    .bind(&task_id)
    .bind(&run_id)
    .bind(&format!("📌 方向调整：{}", &instruction))
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    // 2. 插入系统消息标记方向调整
    let sys_msg_id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO execution_messages (id, task_id, run_id, sender_type, content, content_type)
         VALUES (?, ?, ?, 'system', ?, 'text')"
    )
    .bind(&sys_msg_id)
    .bind(&task_id)
    .bind(&run_id)
    .bind(&format!("方向已调整，后续步骤将遵循新指示：{}", &instruction))
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    // 3. 恢复执行
    sqlx::query("UPDATE task_runs SET status = 'running' WHERE id = ? AND status = 'paused'")
        .bind(&run_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let _ = app_handle.emit("execution:message", serde_json::json!({
        "id": &sys_msg_id,
        "task_id": &task_id,
        "run_id": &run_id,
        "sender_type": "system",
        "content_type": "text",
    }));

    Ok(serde_json::json!({ "status": "running", "instruction": instruction }))
}
```

- [ ] **Step 4: Register new commands in lib.rs**

In `src-tauri/src/lib.rs`, add to the `.invoke_handler(tauri::generate_handler![...])`:

```rust
commands::tasks::send_user_message,
commands::tasks::resume_execution,
commands::tasks::adjust_direction,
```

- [ ] **Step 5: Verify compilation**

Run: `cd /Users/zhangyiming/Documents/Code/MyOwn/ZeroDesk && cargo check --manifest-path src-tauri/Cargo.toml`

Note: `call_llm_streaming` may need its visibility changed to `pub` in engine.rs, and its return type may need adjustment. The `resolve_model` function also needs `pub` visibility. Fix any compilation issues.

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/commands/tasks.rs src-tauri/src/lib.rs src-tauri/src/engine.rs
git commit -m "feat(commands): 新增 send_user_message/resume_execution/adjust_direction 命令

- send_user_message: 用户发消息暂停执行，@Agent 时触发即时回复
- resume_execution: 恢复暂停的执行
- adjust_direction: 用户调整方向，指示注入后续步骤 prompt"
```

---

## Chunk 3: Frontend - Console UI Components

### Task 7: QuoteBlock Component

**Files:**
- Create: `src/app/console/components/QuoteBlock.tsx`

- [ ] **Step 1: Create QuoteBlock component**

```tsx
import { ExecutionMessage } from '@/types';

// Agent 主题色映射
const AGENT_COLORS: Record<string, string> = {};
let colorIndex = 0;
const COLOR_PALETTE = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#a855f7',
];

export function getAgentColor(agentId: string | undefined): string {
  if (!agentId) return '#635BFF';
  if (!AGENT_COLORS[agentId]) {
    AGENT_COLORS[agentId] = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
    colorIndex++;
  }
  return AGENT_COLORS[agentId];
}

interface QuoteBlockProps {
  quotedMessage: ExecutionMessage | undefined;
  onClickQuote?: (messageId: string) => void;
}

export default function QuoteBlock({ quotedMessage, onClickQuote }: QuoteBlockProps) {
  if (!quotedMessage) return null;

  const borderColor = quotedMessage.sender_type === 'human'
    ? '#635BFF'
    : getAgentColor(quotedMessage.sender_id ?? undefined);

  const senderLabel = quotedMessage.sender_type === 'human'
    ? '你'
    : quotedMessage.sender_name ?? 'Agent';

  // 截取内容预览（最多 80 字）
  const preview = quotedMessage.content.length > 80
    ? quotedMessage.content.slice(0, 80) + '...'
    : quotedMessage.content;

  return (
    <div
      className="mb-2 cursor-pointer rounded bg-bg-alt/50 px-3 py-2 text-xs"
      style={{ borderLeft: `3px solid ${borderColor}` }}
      onClick={() => onClickQuote?.(quotedMessage.id)}
    >
      <div className="mb-0.5 font-medium" style={{ color: borderColor }}>
        {senderLabel}
      </div>
      <div className="truncate text-text-tertiary">{preview}</div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/console/components/QuoteBlock.tsx
git commit -m "feat(ui): 新增 QuoteBlock 引用气泡组件

- 左侧彩色竖线对应被引用者主题色
- 内容截取预览，点击可跳转原消息
- Agent 颜色自动分配"
```

---

### Task 8: AgentMentionPopover Component

**Files:**
- Create: `src/app/console/components/AgentMentionPopover.tsx`

- [ ] **Step 1: Create AgentMentionPopover component**

```tsx
import { Agent } from '@/types';

interface AgentMentionPopoverProps {
  agents: Agent[];
  visible: boolean;
  searchText: string;
  onSelect: (agent: Agent) => void;
  onSelectAll: () => void;
  position?: { top: number; left: number };
}

export default function AgentMentionPopover({
  agents,
  visible,
  searchText,
  onSelect,
  onSelectAll,
}: AgentMentionPopoverProps) {
  if (!visible || agents.length === 0) return null;

  const filtered = searchText
    ? agents.filter(a => a.name.toLowerCase().includes(searchText.toLowerCase()))
    : agents;

  return (
    <div className="absolute bottom-full left-0 z-50 mb-2 w-56 overflow-hidden rounded-lg border border-border bg-bg-secondary shadow-xl">
      <div className="px-3 py-2 text-xs text-text-tertiary">选择 Agent</div>
      <div className="max-h-48 overflow-y-auto">
        <button
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-bg-alt/50"
          onClick={onSelectAll}
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs text-primary">
            *
          </span>
          <span>@全部</span>
        </button>
        {filtered.map(agent => (
          <button
            key={agent.id}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-bg-alt/50"
            onClick={() => onSelect(agent)}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs">
              {agent.avatar || agent.name.charAt(0)}
            </span>
            <span>{agent.name}</span>
            {agent.role_description && (
              <span className="ml-auto truncate text-xs text-text-tertiary max-w-[100px]">
                {agent.role_description}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/console/components/AgentMentionPopover.tsx
git commit -m "feat(ui): 新增 AgentMentionPopover @mention 选择弹窗

- 输入 @ 时弹出当前任务绑定的 Agent 列表
- 支持搜索过滤和 @全部 选项"
```

---

### Task 9: ChatInput Component

**Files:**
- Create: `src/app/console/components/ChatInput.tsx`

- [ ] **Step 1: Create ChatInput component**

```tsx
import { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { Agent } from '@/types';
import AgentMentionPopover from './AgentMentionPopover';
import { getAgentColor } from './QuoteBlock';

interface ChatInputProps {
  agents: Agent[];
  disabled?: boolean;
  placeholder?: string;
  onSend: (content: string, mentionAgentId: string | null) => void;
}

export default function ChatInput({ agents, disabled, placeholder, onSend }: ChatInputProps) {
  const [text, setText] = useState('');
  const [showMention, setShowMention] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (value: string) => {
    setText(value);

    // 检测 @ 触发
    const lastAt = value.lastIndexOf('@');
    if (lastAt >= 0 && (lastAt === 0 || value[lastAt - 1] === ' ')) {
      const afterAt = value.slice(lastAt + 1);
      if (!afterAt.includes(' ')) {
        setShowMention(true);
        setMentionSearch(afterAt);
        return;
      }
    }
    setShowMention(false);
  };

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    // 替换 @xxx 为 @AgentName
    const lastAt = text.lastIndexOf('@');
    const newText = text.slice(0, lastAt) + `@${agent.name} `;
    setText(newText);
    setShowMention(false);
    inputRef.current?.focus();
  };

  const handleSelectAll = () => {
    setSelectedAgent(null);
    const lastAt = text.lastIndexOf('@');
    const newText = text.slice(0, lastAt) + '@全部 ';
    setText(newText);
    setShowMention(false);
    inputRef.current?.focus();
  };

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed, selectedAgent?.id ?? null);
    setText('');
    setSelectedAgent(null);
  }, [text, disabled, selectedAgent, onSend]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative border-t border-border bg-bg-secondary px-4 py-3">
      <AgentMentionPopover
        agents={agents}
        visible={showMention}
        searchText={mentionSearch}
        onSelect={handleSelectAgent}
        onSelectAll={handleSelectAll}
      />
      <div className="flex items-end gap-2 rounded-xl bg-bg-alt px-4 py-2">
        <textarea
          ref={inputRef}
          value={text}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? '输入消息，@ 可指定 Agent ...'}
          disabled={disabled}
          rows={1}
          className="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-primary transition-colors hover:bg-primary/10 disabled:opacity-30"
        >
          <Send size={16} />
        </button>
      </div>
      {/* Agent 快捷标签 */}
      <div className="mt-2 flex gap-1.5">
        {agents.map(agent => (
          <button
            key={agent.id}
            onClick={() => {
              setText(prev => `${prev}@${agent.name} `);
              setSelectedAgent(agent);
              inputRef.current?.focus();
            }}
            className="rounded-full px-2.5 py-0.5 text-[10px] transition-colors hover:opacity-80"
            style={{
              backgroundColor: `${getAgentColor(agent.id)}15`,
              color: getAgentColor(agent.id),
            }}
          >
            @{agent.name}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/console/components/ChatInput.tsx
git commit -m "feat(ui): 新增 ChatInput 输入组件 - @mention 补全与快捷标签

- @ 输入触发 Agent 选择弹窗
- 底部 Agent 快捷标签一键 @
- Enter 发送，Shift+Enter 换行"
```

---

### Task 10: PauseControl Component

**Files:**
- Create: `src/app/console/components/PauseControl.tsx`

- [ ] **Step 1: Create PauseControl component**

```tsx
import { useState } from 'react';
import { Play, GitBranch } from 'lucide-react';

interface PauseControlProps {
  visible: boolean;
  onResume: () => void;
  onAdjust: (instruction: string) => void;
}

export default function PauseControl({ visible, onResume, onAdjust }: PauseControlProps) {
  const [showAdjustInput, setShowAdjustInput] = useState(false);
  const [instruction, setInstruction] = useState('');

  if (!visible) return null;

  const handleAdjust = () => {
    if (!instruction.trim()) return;
    onAdjust(instruction.trim());
    setInstruction('');
    setShowAdjustInput(false);
  };

  return (
    <div className="border-t border-yellow-500/30 bg-yellow-500/5 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-yellow-500">
        <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
        执行已暂停 — 等待你的指示
      </div>
      {showAdjustInput ? (
        <div className="mt-2 flex gap-2">
          <input
            value={instruction}
            onChange={e => setInstruction(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdjust()}
            placeholder="输入新的方向指示..."
            className="flex-1 rounded-lg border border-border bg-bg-alt px-3 py-1.5 text-sm outline-none focus:border-primary"
            autoFocus
          />
          <button
            onClick={handleAdjust}
            disabled={!instruction.trim()}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            确认调整
          </button>
          <button
            onClick={() => setShowAdjustInput(false)}
            className="rounded-lg px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-bg-alt"
          >
            取消
          </button>
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <button
            onClick={onResume}
            className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-1.5 text-sm text-white transition-colors hover:bg-green-700"
          >
            <Play size={14} />
            继续执行
          </button>
          <button
            onClick={() => setShowAdjustInput(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-1.5 text-sm text-text-secondary transition-colors hover:bg-bg-alt"
          >
            <GitBranch size={14} />
            调整方向
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/console/components/PauseControl.tsx
git commit -m "feat(ui): 新增 PauseControl 暂停控制组件

- 黄色状态条提示执行已暂停
- 继续执行/调整方向两个操作
- 调整方向展开文字输入框"
```

---

## Chunk 4: Frontend Integration

### Task 11: React Query Hooks

**Files:**
- Modify: `src/hooks/useTasks.ts` (add 3 new hooks)

- [ ] **Step 1: Add useSendUserMessage hook**

Append to `useTasks.ts`:

```typescript
export function useSendUserMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      task_id: string;
      run_id: string;
      content: string;
      mention_agent_id: string | null;
      reply_to_id: string | null;
    }) => tauriInvoke('send_user_message', params),
    onMutate: async (params) => {
      // 乐观更新：立即显示用户消息
      const queryKey = ['execution-messages', params.task_id];
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData(queryKey);
      qc.setQueryData(queryKey, (old: ExecutionMessage[] | undefined) => [
        ...(old ?? []),
        {
          id: `optimistic-${Date.now()}`,
          task_id: params.task_id,
          run_id: params.run_id,
          sender_type: 'human' as const,
          sender_name: '你',
          content: params.content,
          content_type: 'text',
          reply_to_id: params.reply_to_id,
          created_at: new Date().toISOString(),
        },
      ]);
      return { previous };
    },
    onError: (_err, params, context) => {
      if (context?.previous) {
        qc.setQueryData(['execution-messages', params.task_id], context.previous);
      }
    },
    onSettled: (_data, _err, params) => {
      qc.invalidateQueries({ queryKey: ['execution-messages', params.task_id] });
      qc.invalidateQueries({ queryKey: ['task-runs'] });
    },
  });
}

export function useResumeExecution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { task_id: string; run_id: string }) =>
      tauriInvoke('resume_execution', params),
    onSettled: (_data, _err, params) => {
      qc.invalidateQueries({ queryKey: ['execution-messages', params.task_id] });
      qc.invalidateQueries({ queryKey: ['task-runs'] });
    },
  });
}

export function useAdjustDirection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { task_id: string; run_id: string; instruction: string }) =>
      tauriInvoke('adjust_direction', params),
    onSettled: (_data, _err, params) => {
      qc.invalidateQueries({ queryKey: ['execution-messages', params.task_id] });
      qc.invalidateQueries({ queryKey: ['task-runs'] });
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useTasks.ts
git commit -m "feat(hooks): 新增 useSendUserMessage/useResumeExecution/useAdjustDirection

- useSendUserMessage 支持乐观更新，消息即时显示
- useResumeExecution 恢复暂停的执行
- useAdjustDirection 调整方向并恢复执行"
```

---

### Task 12: AppLayout Event Listener Update

**Files:**
- Modify: `src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Add execution:message event listener**

In AppLayout's useEffect (the Tauri event listener), add a new listener for `execution:message`:

```typescript
const unlistenMsg = listen('execution:message', (event: any) => {
  const payload = event.payload;
  if (payload?.task_id) {
    queryClient.invalidateQueries({ queryKey: ['execution-messages', payload.task_id] });
    queryClient.invalidateQueries({ queryKey: ['task-runs'] });
  }
});
```

Add cleanup in the return function:

```typescript
return () => {
  unlisten.then(fn => fn());
  unlistenMsg.then(fn => fn());
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/AppLayout.tsx
git commit -m "feat(layout): 监听 execution:message 事件，实时刷新消息列表

- 收到 execution:message 事件后立即 invalidate React Query 缓存
- 替代轮询，实现更即时的消息更新"
```

---

### Task 13: Console Page Integration

**Files:**
- Modify: `src/app/console/page.tsx` (major integration)

- [ ] **Step 1: Add imports for new components**

At the top of `page.tsx`, add:

```typescript
import QuoteBlock from './components/QuoteBlock';
import ChatInput from './components/ChatInput';
import PauseControl from './components/PauseControl';
import {
  useSendUserMessage,
  useResumeExecution,
  useAdjustDirection,
} from '@/hooks/useTasks';
```

- [ ] **Step 2: Add hooks and state in ConsolePage component**

Inside the `ConsolePage` component (after existing hooks), add:

```typescript
const sendMessage = useSendUserMessage();
const resumeExecution = useResumeExecution();
const adjustDirection = useAdjustDirection();

// 构建消息 ID 到消息的映射，用于引用查找
const messageMap = useMemo(() => {
  const map = new Map<string, ExecutionMessage>();
  messages?.forEach(m => map.set(m.id, m));
  return map;
}, [messages]);

// 获取当前运行的 run 和暂停状态
const currentRun = runs?.[0];
const isPaused = currentRun?.status === 'paused';

// 获取当前任务绑定的 Agents
const taskAgents = useMemo(() => {
  if (!steps || !agents) return [];
  const agentIds = new Set(steps.map(s => s.agent_id).filter(Boolean));
  return agents.filter(a => agentIds.has(a.id));
}, [steps, agents]);

// 滚动到指定消息
const scrollToMessage = useCallback((messageId: string) => {
  const el = document.getElementById(`msg-${messageId}`);
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el?.classList.add('ring-2', 'ring-primary/50');
  setTimeout(() => el?.classList.remove('ring-2', 'ring-primary/50'), 2000);
}, []);
```

- [ ] **Step 3: Add QuoteBlock to message rendering**

In the Agent message rendering section (around line 622-689), add QuoteBlock before the message content:

```tsx
{/* 在消息气泡内顶部，content 之前 */}
{msg.reply_to_id && (
  <QuoteBlock
    quotedMessage={messageMap.get(msg.reply_to_id)}
    onClickQuote={scrollToMessage}
  />
)}
```

Do the same for Human message rendering section (around line 599-619).

Add `id={`msg-${msg.id}`}` to each message container div for scroll targeting.

- [ ] **Step 4: Add ChatInput and PauseControl at the bottom**

Replace the existing input area (if any) or add at the bottom of the message area:

```tsx
{/* 在消息列表之后，组件底部 */}
<PauseControl
  visible={isPaused}
  onResume={() => {
    if (currentRun) {
      resumeExecution.mutate({
        task_id: task.id,
        run_id: currentRun.id,
      });
    }
  }}
  onAdjust={(instruction) => {
    if (currentRun) {
      adjustDirection.mutate({
        task_id: task.id,
        run_id: currentRun.id,
        instruction,
      });
    }
  }}
/>
<ChatInput
  agents={taskAgents}
  disabled={!currentRun || currentRun.status === 'completed' || currentRun.status === 'failed'}
  onSend={(content, mentionAgentId) => {
    if (currentRun) {
      sendMessage.mutate({
        task_id: task.id,
        run_id: currentRun.id,
        content,
        mention_agent_id: mentionAgentId,
        reply_to_id: null,
      });
    }
  }}
/>
```

- [ ] **Step 5: Verify frontend compiles**

Run: `cd /Users/zhangyiming/Documents/Code/MyOwn/ZeroDesk && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 6: Commit**

```bash
git add src/app/console/page.tsx
git commit -m "feat(console): 集成群聊对话流 - 引用气泡、@mention输入、暂停控制

- 消息渲染增加 QuoteBlock 引用气泡
- 底部集成 ChatInput 支持 @mention
- PauseControl 暂停状态条 + 继续/调整操作
- 消息 ID 锚点定位，点击引用可跳转
- 乐观更新用户消息"
```

---

## Chunk 5: Final Integration & Verification

### Task 14: Full Build Verification

- [ ] **Step 1: Run Rust build**

Run: `cd /Users/zhangyiming/Documents/Code/MyOwn/ZeroDesk && cargo build --manifest-path src-tauri/Cargo.toml`
Expected: Builds successfully

- [ ] **Step 2: Run frontend build**

Run: `cd /Users/zhangyiming/Documents/Code/MyOwn/ZeroDesk && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Run Vite build**

Run: `cd /Users/zhangyiming/Documents/Code/MyOwn/ZeroDesk && pnpm build`
Expected: Builds successfully

- [ ] **Step 4: Fix any issues found**

Address compilation errors, type mismatches, or import issues.

- [ ] **Step 5: Final commit if fixes needed**

```bash
git add -A
git commit -m "fix: 修复多Agent对话协议集成后的编译问题"
```
