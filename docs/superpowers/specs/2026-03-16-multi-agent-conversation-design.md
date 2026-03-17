# 多 Agent 对话协议设计文档

**日期**: 2026-03-16
**状态**: 已确认（审查修订版）
**范围**: 子系统 1 — 多 Agent 对话协议（含 UI、调度、上下文传递、人工干预）

---

## 1. 背景与问题

当前 ZeroDesk 的多 Agent 任务执行存在以下问题：

- Agent 之间没有真正的通信，各自独立执行，缺乏协作感
- 用户无法在执行过程中 @某个 Agent 进行干预
- 没有 Agent A 回复 Agent B 的引用关系，对话流不可追溯
- 执行过程缺乏透明度，用户无法理解 Agent 之间的上下文传递

## 2. 设计目标

1. 实现多 Agent 之间可追溯的对话流（群聊 + 引用回复）
2. 支持用户 @mention 任意 Agent 进行实时干预
3. 高效管理上下文传递，控制 token 消耗
4. 消息持久化，支持历史回顾

## 3. UI 设计

### 3.1 群聊风格对话流

在 Console 页面中，所有 Agent 和用户的消息呈现在同一个时间线上：

- **Agent 消息**：左对齐，圆形头像 + Agent 名称 + 主题色，消息气泡为深色背景（现有实现已支持，需增加引用块）
- **用户消息**：右对齐，紫色气泡（现有实现已支持 `sender_type === "human"`）
- **系统消息**：居中显示，灰色标签（现有实现已支持）

### 3.2 引用回复

当 Agent 回复另一个 Agent（或用户）的特定消息时：

- 消息气泡内顶部显示引用块
- 引用块左侧有 3px 彩色竖线，颜色 = 被引用 Agent 的主题色
- 引用块内容：被引用者头像 + 名称 + 内容摘要（截取，单行省略）
- 点击引用块可滚动到原消息（通过消息 ID 锚点定位 + `scrollIntoView`）

### 3.3 @Mention 输入

- 输入框中输入 `@` 弹出 Agent 选择列表，**仅显示当前任务绑定的 Agent**
- 输入框下方显示当前任务中所有 Agent 的快捷标签
- 支持 `@全部` 广播给所有 Agent
- 用户消息发送后**立即显示**（乐观更新），不等 DB 往返

### 3.4 暂停/继续控制

- 暂停时，输入区上方显示黄色状态条："执行已暂停 — 等待你的指示"
- 两个按钮：**继续执行** / **调整方向**
- "调整方向"弹出文本输入框，用户输入一段文字指示（如"改用方案 B"），协调者将此指示注入后续步骤的 prompt 中
- 不支持运行时增删/重排步骤（保持简单，后续迭代）

## 4. 调度策略：步骤顺序 + 协调者混合

### 4.1 默认流程：按步骤顺序执行

1. 任务拆解为有序步骤，每个步骤绑定一个 Agent
2. 执行引擎按步骤顺序依次调用对应 Agent
3. 上一步的输出自动作为下一步的输入上下文

### 4.2 协调者角色

协调者是执行引擎内部的概念，用户不直接感知：

- **代码逻辑为主**：按步骤分派 Agent、截取最近消息构造 prompt
- **LLM 辅助为辅**：当历史消息 token 数超过当前模型上下文窗口的 60% 时，触发一次 LLM 摘要压缩
- 摘要压缩的阈值（60%）可在 Settings 中配置
- **摘要使用的模型**：使用系统模型分配中的 `summarization` 角色（若未配置，使用当前 Agent 绑定的模型）
- **摘要失败兜底**：若 LLM 摘要调用失败（超时/错误），退回截断策略——保留最近 5 条消息原文，丢弃更早的历史

### 4.3 Agent 间 Side Conversation 规则

Agent 在回复中可 @其他 Agent，触发额外对话轮次。为防止无限循环和 token 浪费，执行以下硬性规则：

| 约束 | 值 | 说明 |
|------|-----|------|
| 最大嵌套深度 | 3 | A→B→C→D 时 D 不可再 @触发新 Agent |
| 单次 side conversation 最大轮次 | 5 | 超过 5 轮自动终止，回归主流程 |
| 总 side conversation 次数/步骤 | 3 | 每个步骤最多触发 3 次 side conversation |

终止时，协调者插入一条 system 消息："Side conversation 达到限制，回归主流程"，然后继续下一步骤。

## 5. 人工干预机制

### 5.1 流程

1. 用户在输入框中 @某个 Agent 发送消息
2. 执行引擎将 task_run 状态设为 `paused`
3. **注意**：暂停在当前 LLM 调用完成后生效（无法中断进行中的 HTTP 流），即用户看到当前 Agent 输出完毕后进入暂停
4. 被 @的 Agent 接收用户消息 + 当前上下文，生成回复
5. Agent 回复后，用户看到两个操作：
   - **继续执行**：恢复原流程，从下一步骤继续
   - **调整方向**：用户输入一段文字指示，注入后续步骤 prompt

### 5.2 暂停状态

- 暂停期间，UI 显示暂停状态指示器（黄色状态条）
- 已完成的步骤输出不受影响
- 用户可以连续发多条消息进行多轮对话，直到选择继续/调整

## 6. 上下文传递策略

### 6.1 默认模式（代码逻辑）

每个 Agent 收到的上下文包括：

1. 当前步骤的系统提示词（Agent 角色定义）
2. 任务描述 + 目标
3. 直接上游步骤的完整输出
4. 被引用消息的原文（如果有 reply_to）
5. 最近 N 条**非 system 类型**消息（N 可配置，默认 10），system 消息不计入 N

### 6.2 摘要压缩模式

当累计消息 token 数 > 模型上下文窗口 × 60% 时：

1. 协调者调用 LLM（使用 `summarization` 角色模型）生成对话摘要
2. 摘要替代历史消息，保留最近 3 条原文
3. 摘要作为 system message 插入并持久化，标注 `content_type = 'summary'`
4. 若摘要调用失败，退回截断策略：保留最近 5 条原文

### 6.3 上下文窗口感知

为支持 token 阈值计算，需要知道每个模型的上下文窗口大小。在 `models` 表新增 `context_window_tokens` 列（见 7.2 迁移）。

## 7. 数据模型

### 7.1 现有 execution_messages 表（保持不变）

```sql
-- 001_initial.sql 中已有
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

-- 010 迁移中已有
ALTER TABLE execution_messages ADD COLUMN run_id TEXT REFERENCES task_runs(id);
```

### 7.2 新增迁移（012_agent_conversation.sql）

```sql
-- 新增列：步骤关联
ALTER TABLE execution_messages ADD COLUMN step_id TEXT REFERENCES task_steps(id);

-- 新增列：引用回复
ALTER TABLE execution_messages ADD COLUMN reply_to_id TEXT REFERENCES execution_messages(id);

-- 扩展 content_type 约束以支持 summary 类型
-- SQLite 不支持 ALTER CHECK，通过应用层校验 'summary' 类型

-- 新增索引
CREATE INDEX IF NOT EXISTS idx_messages_task_run ON execution_messages(task_id, run_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON execution_messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_messages_step ON execution_messages(step_id);

-- models 表新增上下文窗口列
ALTER TABLE models ADD COLUMN context_window_tokens INTEGER DEFAULT 128000;
```

### 7.3 metadata_json 结构（保持兼容）

现有 metadata_json 结构不变，继续在此存储 thinking/model/tokens/duration：

```json
{
  "thinking": "reasoning content or null",
  "model": "model name",
  "tokens_input": 1234,
  "tokens_output": 567,
  "duration_ms": 3200
}
```

Token 计数继续从 `metadata_json.tokens_input + metadata_json.tokens_output` 获取，不新增顶层列。

## 8. 执行引擎改造

### 8.1 当前状态

现有 `engine.rs` 按步骤串行执行，每个步骤独立调用 LLM。`create_message` 函数已支持 task_id、run_id、sender_type/id/name、content、content_type、metadata_json。

### 8.2 改造要点

1. **消息驱动**：执行过程改为消息驱动，每次 LLM 调用的输入输出都作为消息存储，新增 `step_id` 和 `reply_to_id` 参数
2. **事件流**：
   - 保留现有 `execution:chunk` 事件用于流式输出
   - 新增 `execution:message` 事件，在消息写入 DB 后触发
   - Payload 结构：`{ id, task_id, run_id, step_id, sender_type, sender_id, sender_name, reply_to_id, content_type }`（不含 content，避免大消息阻塞事件通道）
   - 前端收到事件后，`useExecutionMessages` hook 立即 invalidate React Query cache，替代轮询
3. **暂停/恢复**：在 task_runs 表的 status 字段增加 `paused` 状态值，引擎在每个步骤开始前检查状态
4. **上下文构建器**：新增 `context_builder.rs` 模块：
   - `build_context(pool, task_id, run_id, step_id, model_context_window)` → 返回构造好的 messages 数组
   - 内部判断是否需要摘要压缩
5. **Side conversation 控制器**：在引擎中维护计数器，跟踪当前步骤的 side conversation 深度和轮次
6. **create_message 扩展**：增加 `step_id: Option<&str>` 和 `reply_to_id: Option<&str>` 参数

### 8.3 暂停机制的限制

暂停在当前 LLM 流式调用完成后才生效。不中断进行中的 HTTP 请求。这是有意为之：
- 中断流式请求会丢失部分输出，造成不完整的消息
- 用户仍然可以看到当前 Agent 完成输出，然后进入暂停状态
- 后续迭代可考虑通过 `tokio::select!` + `CancellationToken` 实现真正的中断

## 9. 前端改造

### 9.1 Console 页面

- 在现有消息渲染基础上增加引用块和 @mention 功能
- 保留现有 Agent/Human/System 消息的渲染逻辑
- 新增暂停/继续/调整方向的操作区

### 9.2 新增/修改组件

- `QuoteBlock` — 引用气泡子组件（新增）
- `ChatInput` — 输入框增加 @mention 补全功能（改造现有输入区）
- `PauseControl` — 暂停状态条 + 继续/调整按钮（新增）
- `AgentMentionPopover` — @mention 选择弹窗（新增）

### 9.3 数据层

- 改造现有 `useExecutionMessages` hook，增加 reply_to 消息的预加载
- 修改 `useStreamStore` 支持消息级别的事件刷新
- 新增 Tauri 命令：`send_user_message`（发送用户消息，触发暂停 + Agent 回复流程）
- 新增 Tauri 命令：`resume_execution`（继续执行）
- 新增 Tauri 命令：`adjust_direction`（调整方向，接收用户文字指示）

## 10. 不在此次范围内

- 知识库集成（子系统 3）
- Agent 长期记忆
- 并行步骤执行（当前仅串行）
- 消息搜索/过滤
- 运行时步骤增删/重排
- 中断进行中的 LLM 流式请求
