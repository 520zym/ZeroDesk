import { useState } from "react";
import {
  Plus,
  Copy,
  Archive,
  Pencil,
  Globe,
  FileText,
  Terminal,
  Sparkles,
  X,
  ChevronDown,
  Clock,
  Cpu,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, Modal, Toggle } from "@/components/ui";

interface Agent {
  id: string;
  name: string;
  char: string;
  color: string;
  role: string;
  model: string;
  modelBg: string;
  skills: number;
  tools: string;
  time: string;
}

const mockAgents: Agent[] = [
  { id: "a1", name: "信息检索员", char: "检", color: "bg-primary", role: "负责网络搜索与信息聚合", model: "GPT-4o", modelBg: "bg-primary-light text-primary-active", skills: 3, tools: "联网搜索 · 文件读写", time: "10 分钟前使用" },
  { id: "a2", name: "深度分析师", char: "析", color: "bg-sage", role: "负责结构化分析与逻辑推理", model: "Claude 3.5 Sonnet", modelBg: "bg-sage-light text-[#5a7a6b]", skills: 5, tools: "联网搜索 · 代码解释 · 知识库检索", time: "30 分钟前使用" },
  { id: "a3", name: "文案撰写员", char: "撰", color: "bg-coral", role: "负责报告撰写与内容生成", model: "Qwen-Turbo", modelBg: "bg-coral-light text-[#9a7058]", skills: 2, tools: "文件读写 · Markdown 渲染", time: "1 小时前使用" },
  { id: "a4", name: "质量审查员", char: "审", color: "bg-lavender", role: "负责输出验收与质量把关", model: "GPT-4o", modelBg: "bg-lavender-light text-[#6f5f80]", skills: 4, tools: "联网搜索 · 文件读写 · 逻辑校验", time: "2 小时前使用" },
  { id: "a5", name: "数据清洗员", char: "洗", color: "bg-sand", role: "负责数据格式化与清理", model: "Qwen-Turbo", modelBg: "bg-sand-light text-[#8a7b55]", skills: 2, tools: "文件读写 · 数据转换", time: "昨天使用" },
  { id: "a6", name: "代码评审员", char: "码", color: "bg-[#6A8D99]", role: "负责代码质量审查与建议", model: "Claude 3.5 Sonnet", modelBg: "bg-sage-light text-[#5a7a6b]", skills: 4, tools: "代码解释 · 命令执行 · 文件读写", time: "3 天前使用" },
];

const defaultTools = [
  { key: "search", label: "联网搜索", icon: Globe },
  { key: "file", label: "本地文件读写", icon: FileText },
  { key: "exec", label: "命令执行", icon: Terminal },
];

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [detailPrompt, setDetailPrompt] = useState("你是一个专业的信息检索助手，负责从互联网和本地知识库中搜索、筛选和聚合相关信息。你需要确保信息来源的可靠性，并以结构化的方式呈现结果。");
  const [detailTools, setDetailTools] = useState<Record<string, boolean>>({ search: true, file: true, exec: false });
  const [detailSkills] = useState(["网页解析", "PDF 提取", "知识图谱"]);

  const [createName, setCreateName] = useState("");
  const [createRole, setCreateRole] = useState("");
  const [createPrompt, setCreatePrompt] = useState("");
  const [createModel, setCreateModel] = useState("gpt-4o");
  const [createFallback, setCreateFallback] = useState("qwen-turbo");
  const [createTools, setCreateTools] = useState<Record<string, boolean>>({ search: true, file: false, exec: false });

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div
          className="shrink-0 px-6 pt-5 pb-4"
          style={{ animation: "fade-in 0.3s ease-out" }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[0.82rem] text-text-secondary">每个 Agent 是一个带有特定 Prompt 和权限的执行单元</p>
            <button
              onClick={() => setCreateOpen(true)}
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg",
                "bg-primary text-white text-[0.8rem] font-medium",
                "hover:bg-primary-hover active:bg-primary-active",
                "transition-colors cursor-pointer shadow-sm"
              )}
            >
              <Plus size={15} strokeWidth={2.2} />
              手动创建
            </button>
          </div>
        </div>

        {/* Agent Grid */}
        <div className="flex-1 overflow-y-auto px-6 pt-2 pb-6">
          <div className="grid grid-cols-3 gap-3.5">
            {mockAgents.map((agent, i) => (
              <button
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className={cn(
                  "group relative flex flex-col text-left rounded-xl border bg-surface p-4",
                  "transition-all duration-200 cursor-pointer",
                  selectedAgent?.id === agent.id
                    ? "border-primary shadow-card-hover"
                    : "border-border-light hover:border-primary hover:shadow-card-hover hover:-translate-y-0.5"
                )}
                style={{ animation: `fade-in 0.35s ease-out ${i * 60}ms both` }}
              >
                {/* Top */}
                <div className="flex items-start gap-3 mb-3">
                  <Avatar char={agent.char} color={agent.color} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[0.88rem] font-semibold text-text truncate">
                      {agent.name}
                    </div>
                    <div className="text-[0.73rem] text-text-muted mt-0.5 line-clamp-1">
                      {agent.role}
                    </div>
                  </div>
                </div>

                {/* Meta pills */}
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.68rem] font-medium", agent.modelBg)}>
                    <Cpu size={11} />
                    {agent.model}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.68rem] font-medium bg-bg-alt text-text-secondary">
                    <Wrench size={10} />
                    {agent.skills} Skills
                  </span>
                </div>

                {/* Tools */}
                <div className="text-[0.72rem] text-text-muted mb-3 truncate">
                  {agent.tools}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto pt-2.5 border-t border-border-light">
                  <span className="inline-flex items-center gap-1 text-[0.7rem] text-text-muted">
                    <Clock size={11} />
                    {agent.time}
                  </span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {[
                      { icon: Pencil, label: "编辑" },
                      { icon: Copy, label: "复制" },
                      { icon: Archive, label: "归档" },
                    ].map((action) => (
                      <span
                        key={action.label}
                        title={action.label}
                        onClick={(e) => e.stopPropagation()}
                        className="w-6 h-6 inline-flex items-center justify-center rounded-md text-text-muted hover:text-text hover:bg-bg-alt transition-colors"
                      >
                        <action.icon size={13} />
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Detail Panel */}
      {selectedAgent && (
        <div
          className="w-[340px] shrink-0 border-l border-border-light bg-surface flex flex-col overflow-hidden"
          style={{ animation: "slide-right 0.25s ease-out" }}
        >
          {/* Header */}
          <div className="shrink-0 px-5 py-4 border-b border-border-light">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar char={selectedAgent.char} color={selectedAgent.color} size="xl" />
                <div>
                  <div className="text-[0.95rem] font-semibold text-text">
                    {selectedAgent.name}
                  </div>
                  <div className="text-[0.75rem] text-text-muted mt-0.5">
                    {selectedAgent.role}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text hover:bg-bg-alt transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* System Prompt */}
            <section>
              <label className="block text-[0.78rem] font-medium text-text mb-2">
                系统提示词
              </label>
              <textarea
                value={detailPrompt}
                onChange={(e) => setDetailPrompt(e.target.value)}
                rows={5}
                className={cn(
                  "w-full rounded-lg border border-border-light bg-bg px-3 py-2.5",
                  "text-[0.78rem] text-text leading-relaxed resize-none",
                  "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20",
                  "transition-colors"
                )}
              />
            </section>

            {/* Default Model */}
            <section>
              <label className="block text-[0.78rem] font-medium text-text mb-2">
                默认模型
              </label>
              <div className="relative">
                <select
                  defaultValue={selectedAgent.model}
                  className={cn(
                    "w-full appearance-none rounded-lg border border-border-light bg-bg px-3 py-2",
                    "text-[0.78rem] text-text pr-8",
                    "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20",
                    "transition-colors cursor-pointer"
                  )}
                >
                  <option>GPT-4o</option>
                  <option>Claude 3.5 Sonnet</option>
                  <option>Qwen-Turbo</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
              <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[0.65rem] font-medium bg-success-light text-success">
                推荐
              </span>
            </section>

            {/* Tool Permissions */}
            <section>
              <label className="block text-[0.78rem] font-medium text-text mb-2">
                工具权限
              </label>
              <div className="space-y-2">
                {defaultTools.map((tool) => (
                  <div
                    key={tool.key}
                    className="flex items-center justify-between rounded-lg border border-border-light px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <tool.icon size={14} className="text-text-secondary" />
                      <span className="text-[0.78rem] text-text">{tool.label}</span>
                    </div>
                    <Toggle
                      checked={detailTools[tool.key]}
                      onChange={(v) => setDetailTools((prev) => ({ ...prev, [tool.key]: v }))}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Private Skills */}
            <section>
              <label className="block text-[0.78rem] font-medium text-text mb-2">
                私有 Skills
              </label>
              <div className="flex flex-wrap gap-1.5">
                {detailSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-medium bg-primary-light text-primary-active"
                  >
                    {skill}
                    <X size={12} className="cursor-pointer hover:text-danger transition-colors" />
                  </span>
                ))}
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="shrink-0 px-5 py-3.5 border-t border-border-light">
            <button
              className={cn(
                "w-full py-2 rounded-lg text-[0.8rem] font-medium",
                "border border-border-light text-text-secondary",
                "hover:bg-bg-alt hover:text-text transition-colors cursor-pointer"
              )}
            >
              保存为模板
            </button>
          </div>
        </div>
      )}

      {/* Create Agent Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="创建新 Agent"
        width="580px"
      >
        <div className="space-y-5">
          {/* Name + Role */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[0.78rem] font-medium text-text mb-1.5">
                Agent 名称
              </label>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="如：信息检索员"
                className={cn(
                  "w-full rounded-lg border border-border-light bg-bg px-3 py-2",
                  "text-[0.8rem] text-text placeholder:text-text-muted",
                  "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20",
                  "transition-colors"
                )}
              />
            </div>
            <div>
              <label className="block text-[0.78rem] font-medium text-text mb-1.5">
                角色描述
              </label>
              <input
                type="text"
                value={createRole}
                onChange={(e) => setCreateRole(e.target.value)}
                placeholder="如：负责网络搜索与信息聚合"
                className={cn(
                  "w-full rounded-lg border border-border-light bg-bg px-3 py-2",
                  "text-[0.8rem] text-text placeholder:text-text-muted",
                  "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20",
                  "transition-colors"
                )}
              />
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[0.78rem] font-medium text-text">
                系统提示词
              </label>
              <button className="inline-flex items-center gap-1 text-[0.72rem] font-medium text-primary hover:text-primary-hover transition-colors cursor-pointer">
                <Sparkles size={12} />
                AI 优化
              </button>
            </div>
            <textarea
              value={createPrompt}
              onChange={(e) => setCreatePrompt(e.target.value)}
              rows={4}
              placeholder="描述此 Agent 的行为规则和输出格式要求…"
              className={cn(
                "w-full rounded-lg border border-border-light bg-bg px-3 py-2.5",
                "text-[0.78rem] text-text leading-relaxed resize-none placeholder:text-text-muted",
                "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20",
                "transition-colors"
              )}
            />
          </div>

          {/* Model + Fallback */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[0.78rem] font-medium text-text mb-1.5">
                默认模型
              </label>
              <div className="relative">
                <select
                  value={createModel}
                  onChange={(e) => setCreateModel(e.target.value)}
                  className={cn(
                    "w-full appearance-none rounded-lg border border-border-light bg-bg px-3 py-2",
                    "text-[0.8rem] text-text pr-8",
                    "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20",
                    "transition-colors cursor-pointer"
                  )}
                >
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                  <option value="qwen-turbo">Qwen-Turbo</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-[0.78rem] font-medium text-text mb-1.5">
                兜底模型
              </label>
              <div className="relative">
                <select
                  value={createFallback}
                  onChange={(e) => setCreateFallback(e.target.value)}
                  className={cn(
                    "w-full appearance-none rounded-lg border border-border-light bg-bg px-3 py-2",
                    "text-[0.8rem] text-text pr-8",
                    "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20",
                    "transition-colors cursor-pointer"
                  )}
                >
                  <option value="qwen-turbo">Qwen-Turbo</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Tool Permissions */}
          <div>
            <label className="block text-[0.78rem] font-medium text-text mb-2">
              工具权限
            </label>
            <div className="space-y-2">
              {defaultTools.map((tool) => (
                <div
                  key={tool.key}
                  className="flex items-center justify-between rounded-lg border border-border-light px-3 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <tool.icon size={14} className="text-text-secondary" />
                    <span className="text-[0.78rem] text-text">{tool.label}</span>
                  </div>
                  <Toggle
                    checked={createTools[tool.key]}
                    onChange={(v) => setCreateTools((prev) => ({ ...prev, [tool.key]: v }))}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              onClick={() => setCreateOpen(false)}
              className={cn(
                "px-4 py-2 rounded-lg text-[0.8rem] font-medium",
                "text-text-secondary hover:text-text hover:bg-bg-alt",
                "transition-colors cursor-pointer"
              )}
            >
              取消
            </button>
            <button
              className={cn(
                "px-5 py-2 rounded-lg text-[0.8rem] font-medium",
                "bg-primary text-white",
                "hover:bg-primary-hover active:bg-primary-active",
                "transition-colors cursor-pointer shadow-sm"
              )}
            >
              创建 Agent
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
