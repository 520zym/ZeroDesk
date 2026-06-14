# Contributing

感谢你对 ZeroDesk 感兴趣。这里记录参与项目时需要遵守的基本约定。

## 参与方式

- 提交 bug report
- 提出功能建议
- 改进文档
- 提交 Pull Request

## 开发环境

```bash
pnpm install
pnpm tauri dev
```

提交 PR 前建议至少运行：

```bash
pnpm build
```

## 提交规范

Commit message 必须包含标题和正文描述两部分，且都使用中文。

标题使用 Conventional Commits 风格：

```text
feat(module): 中文标题
fix(module): 中文标题
docs(readme): 中文标题
ci(release): 中文标题
```

正文描述本次提交改了什么、为什么改。

如果提交包含 AI 生成或 AI 协作生成的代码、文档、设计或其他内容，请在提交正文末尾添加对应的 AI 协作者信息。可以添加一行或多行，按实际使用的工具填写：

```text
Co-Authored-By: {AI 工具或模型名称} <{该工具推荐或可用的 noreply 邮箱}>
```

例如：

```text
Co-Authored-By: Codex <noreply@openai.com>
```

如果某个 AI 工具没有明确的 co-author 邮箱，请至少在 PR 描述中说明使用了哪些 AI 工具参与。

## Pull Request

提交 PR 前请确认：

- 改动范围聚焦，避免混入无关重构
- 本地构建通过
- 没有提交日志、缓存、临时文件和本地工具状态
- 新增功能尽量补充说明或截图
- 如果涉及 UI，确认主要窗口尺寸下没有明显布局问题

## 行为准则

请保持友善、具体、尊重事实。讨论技术方案时优先说明问题、约束和权衡。
