# ZeroDesk

## 项目概述
多 Agent 任务编排工作台（Multi-Agent Task Orchestration Workbench）。桌面端单用户应用，用于配置 LLM Agent、组建团队、创建任务并通过 AI 自动规划和执行，支持实时流式消息、知识库管理、Prompt 版本控制等功能。

## 技术栈
- **前端**：React 19 + TypeScript + Vite 7 + TailwindCSS 4 + React Router 7
- **状态管理**：Zustand（UI 状态）+ TanStack Query（数据层）
- **后端**：Rust + Tauri 2（桌面框架）+ SQLx（异步 SQLite）+ Tokio
- **数据库**：SQLite（WAL 模式，FTS5 全文检索）
- **包管理**：pnpm
- **富文本**：Tiptap（编辑器）、react-markdown + remark-gfm（渲染）
- **图标**：Lucide React
- **通知**：Sonner

## 构建与运行
```bash
pnpm install                # 安装前端依赖
pnpm dev                    # 启动 Vite dev server（端口 1520）
pnpm tauri dev              # 启动完整 Tauri 开发环境（前端 + Rust 后端）
pnpm build                  # TypeScript 检查 + Vite 构建
pnpm tauri build            # 构建生产包
```

## Git 提交规范
- Commit message 必须包含标题和正文描述两部分。
- 标题和正文描述都使用中文。
- 标题使用 Conventional Commits 风格：`type(moduleName): 中文标题`，例如 `feat(editor): 支持章节自动保存`。
- 正文描述说明本次提交改了什么、为什么改。
- 如果提交包含 AI 生成或 AI 协作生成的代码、文档或其他内容，正文末尾添加：`Co-Authored-By: Codex <noreply@openai.com>`。

## 项目结构
```
src/                          # 前端 React
├── app/{feature}/page.tsx    # 页面组件（tasks, console, agents, teams, models, skills, knowledge, prompts, dashboard, settings, history, plan）
├── components/
│   ├── layout/               # AppLayout, Sidebar, Topbar
│   ├── ui/                   # 通用 UI 组件（Modal, Badge, Tabs 等）
│   └── search/               # CommandPalette 全局搜索
├── hooks/                    # TanStack Query hooks（useTasks, useAgents 等）
├── stores/                   # Zustand stores（useAppStore, useStreamStore）
├── types/index.ts            # 全量 TypeScript 类型定义
└── lib/                      # tauri invoke 封装 + 工具函数

src-tauri/                    # Rust 后端
├── src/
│   ├── lib.rs                # 入口，注册 98 个 Tauri commands，手动创建主窗口
│   ├── commands/             # 按领域拆分的命令处理（tasks, agents, teams, models 等）
│   ├── engine.rs             # 任务执行引擎（run_task，步骤编排 + 恢复）
│   ├── context_builder.rs    # LLM 上下文组装 + token 估算
│   ├── models/mod.rs         # 数据模型（Serialize + FromRow）
│   └── db/
│       ├── mod.rs            # 数据库初始化 + 迁移执行
│       └── migrations/       # 15 个 SQL 迁移文件（001-015）
└── Cargo.toml
```

## 注意事项
- **UI 语言**：界面文案全中文硬编码，无 i18n 框架
- **CSP 已禁用**：`tauri.conf.json` 中 `csp: null`
- **pnpm 构建许可**：`pnpm-workspace.yaml` 允许 `esbuild` 运行构建脚本，避免安装后需要手动 approve-builds
- **迁移特殊处理**：014（FTS triggers）使用 `sqlx::raw_sql()` 而非按 `;` 分割
- **数据目录**：`~/.zerodesk/`
- **Workspace**：所有表有 `workspace_id` 列，默认值 `"default"`
- **FTS 重建**：每次启动自动执行 `INSERT INTO fts_*(...) VALUES('rebuild')`
- **右键菜单**：WebView 原生右键已在 `main.rs` 中禁用，使用自定义右键菜单
- **libsqlite3-sys**：使用 bundled 模式编译以确保 FTS5 可用
- **路径别名**：前端 `@` → `./src`
- **HMR 端口**：普通本地 dev 使用 Vite 默认 HMR；设置 `TAURI_DEV_HOST` 时 WebSocket 固定 1421（Tauri remote dev）
