import { useState, useCallback } from "react";
import {
  Play,
  RotateCcw,
  GitCompare,
  Eye,
  ArrowRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, Avatar, Badge } from "@/components/ui";

interface AgentPrompt {
  id: string;
  name: string;
  char: string;
  color: string;
  version: number;
  stable: boolean;
  prompt: string;
  history: VersionEntry[];
}

interface VersionEntry {
  version: string;
  note: string;
  date: string;
  current: boolean;
  metrics?: { label: string; value: string; direction: "up" | "down" }[];
}

interface TaskTemplate {
  name: string;
  icon: string;
  iconBg: string;
  desc: string;
  params: string;
  usage: number;
}

const mockAgentPrompts: AgentPrompt[] = [
  {
    id: "ap1",
    name: "信息检索员",
    char: "检",
    color: "bg-primary",
    version: 3,
    stable: true,
    prompt: `你是一个专业的信息检索助手。你的任务是从互联网和本地知识库中搜索、筛选和聚合相关信息。

## 核心要求
1. 确保信息来源的多样性（至少3个独立来源）
2. 对搜索结果进行可信度评估
3. 以结构化 Markdown 格式输出
4. 标注信息来源和时效性

## 输出格式
- 摘要（200字以内）
- 详细分析（按维度分段）
- 来源列表（含链接和可信度评分）`,
    history: [
      {
        version: "v3",
        note: "优化搜索策略，增加来源多样性约束",
        date: "今天 14:30",
        current: true,
        metrics: [
          { label: "质量", value: "+12%", direction: "up" },
          { label: "成本", value: "-8%", direction: "down" },
        ],
      },
      {
        version: "v2",
        note: "添加结构化输出约束",
        date: "2天前",
        current: false,
        metrics: [
          { label: "质量", value: "+5%", direction: "up" },
          { label: "成本", value: "+3%", direction: "up" },
        ],
      },
      {
        version: "v1",
        note: "初始版本",
        date: "1周前",
        current: false,
      },
    ],
  },
  {
    id: "ap2",
    name: "深度分析师",
    char: "析",
    color: "bg-sage",
    version: 2,
    stable: true,
    prompt: `你是一个结构化分析专家。你的任务是对给定主题进行深度分析，输出逻辑清晰、论据充分的分析报告。

## 分析框架
1. 背景梳理与问题定义
2. 多维度对比分析
3. 风险评估与建议`,
    history: [
      {
        version: "v2",
        note: "强化分析框架，增加风险评估模块",
        date: "昨天 09:20",
        current: true,
        metrics: [{ label: "质量", value: "+8%", direction: "up" }],
      },
      {
        version: "v1",
        note: "初始版本",
        date: "5天前",
        current: false,
      },
    ],
  },
  {
    id: "ap3",
    name: "文案撰写员",
    char: "撰",
    color: "bg-coral",
    version: 1,
    stable: false,
    prompt: `你是一个专业的文案撰写助手。根据给定的主题和要求，生成高质量的文案内容。

## 写作风格
- 简洁专业，避免冗余
- 段落清晰，逻辑连贯
- 适当使用数据和案例支撑观点`,
    history: [
      {
        version: "v1",
        note: "初始版本",
        date: "3天前",
        current: true,
      },
    ],
  },
];

const mockTemplates: TaskTemplate[] = [
  { name: "竞品分析", icon: "🔍", iconBg: "bg-primary-light", desc: "多维度竞品对比，输出差异化建议", params: "竞品列表, 分析维度", usage: 12 },
  { name: "技术调研", icon: "🔬", iconBg: "bg-sage-light", desc: "技术选型与 PoC 验证", params: "技术方向, 评估标准", usage: 8 },
  { name: "代码评审", icon: "📝", iconBg: "bg-lavender-light", desc: "代码质量审查与改进建议", params: "仓库地址, 审查范围", usage: 5 },
  { name: "运营复盘", icon: "📊", iconBg: "bg-coral-light", desc: "运营数据汇总与复盘分析", params: "数据源, 时间范围", usage: 3 },
];

const topTabs = [
  { id: "versions", label: "Prompt 版本管理" },
  { id: "templates", label: "任务模板库" },
];

export default function PromptsPage() {
  const [activeTab, setActiveTab] = useState("versions");
  const [selectedAgent, setSelectedAgent] = useState(mockAgentPrompts[0]);
  const [promptText, setPromptText] = useState(mockAgentPrompts[0].prompt);

  const selectAgent = useCallback((agent: AgentPrompt) => {
    setSelectedAgent(agent);
    setPromptText(agent.prompt);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden px-6 pt-5 pb-6">
      {/* Header */}
      <div
        className="shrink-0 flex items-center justify-between mb-5"
        style={{ animation: "fade-in 0.3s ease-out" }}
      >
        <p className="text-[0.82rem] text-text-secondary">管理可复用的 Prompt 资产与任务模板</p>
        <Tabs tabs={topTabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Tab Content */}
      {activeTab === "versions" ? (
        <VersionsView
          agents={mockAgentPrompts}
          selected={selectedAgent}
          promptText={promptText}
          onSelectAgent={selectAgent}
          onPromptChange={setPromptText}
        />
      ) : (
        <TemplatesView templates={mockTemplates} />
      )}
    </div>
  );
}

function VersionsView({
  agents,
  selected,
  promptText,
  onSelectAgent,
  onPromptChange,
}: {
  agents: AgentPrompt[];
  selected: AgentPrompt;
  promptText: string;
  onSelectAgent: (a: AgentPrompt) => void;
  onPromptChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-1 gap-5 min-h-0 overflow-hidden">
      {/* Left: Agent list */}
      <div
        className="w-[260px] shrink-0 bg-surface border border-border-light rounded-xl flex flex-col overflow-hidden"
        style={{ animation: "fade-in 0.3s ease-out 60ms both" }}
      >
        <div className="px-4 py-3 border-b border-border-light">
          <span className="text-[0.78rem] font-medium text-text-secondary">
            Agent 列表
          </span>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {agents.map((agent, i) => (
            <button
              key={agent.id}
              onClick={() => onSelectAgent(agent)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer",
                selected.id === agent.id
                  ? "bg-primary-light/50"
                  : "hover:bg-bg-alt"
              )}
              style={{ animation: `fade-in 0.3s ease-out ${i * 60}ms both` }}
            >
              <Avatar char={agent.char} color={agent.color} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[0.8rem] font-semibold text-text truncate">
                    {agent.name}
                  </span>
                  {agent.stable && <Badge variant="completed">stable</Badge>}
                </div>
                <span className="text-[0.7rem] text-text-muted">
                  v{agent.version}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Version detail */}
      <div
        className="flex-1 min-w-0 bg-surface border border-border-light rounded-xl flex flex-col overflow-hidden"
        style={{ animation: "fade-in 0.35s ease-out 120ms both" }}
      >
        <div className="shrink-0 px-5 py-3 border-b border-border-light flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar char={selected.char} color={selected.color} size="sm" />
            <span className="text-[0.88rem] font-semibold text-text">
              {selected.name}
            </span>
            <span className="text-[0.72rem] text-text-muted">
              v{selected.version}
            </span>
          </div>
          <button
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
              "text-[0.75rem] font-medium text-primary-active bg-primary-light",
              "hover:bg-primary/10 transition-colors cursor-pointer"
            )}
          >
            <Play size={12} />
            测试运行
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Prompt textarea */}
          <section>
            <label className="block text-[0.78rem] font-medium text-text mb-2">
              当前 Prompt
            </label>
            <textarea
              value={promptText}
              onChange={(e) => onPromptChange(e.target.value)}
              rows={10}
              className={cn(
                "w-full rounded-lg border border-border-light bg-bg px-4 py-3",
                "text-[0.78rem] text-text leading-relaxed resize-none font-mono",
                "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20",
                "transition-colors"
              )}
            />
          </section>

          {/* Version history */}
          <section>
            <label className="block text-[0.78rem] font-medium text-text mb-3">
              版本历史
            </label>
            <div className="relative">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
              <div className="space-y-4">
                {selected.history.map((v, i) => (
                  <div
                    key={v.version}
                    className="relative pl-7"
                    style={{ animation: `fade-in 0.3s ease-out ${i * 80}ms both` }}
                  >
                    <div
                      className={cn(
                        "absolute left-0 top-1 w-[15px] h-[15px] rounded-full border-2 bg-surface",
                        v.current ? "border-primary" : "border-border"
                      )}
                    >
                      {v.current && (
                        <div className="absolute inset-[3px] rounded-full bg-primary" />
                      )}
                    </div>
                    <div className="bg-bg rounded-lg px-4 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={cn(
                            "text-[0.78rem] font-semibold",
                            v.current ? "text-primary" : "text-text"
                          )}
                        >
                          {v.version}
                        </span>
                        {v.current && (
                          <span className="px-1.5 py-0.5 rounded text-[0.6rem] font-medium bg-primary-light text-primary">
                            当前
                          </span>
                        )}
                        <span className="text-[0.68rem] text-text-muted ml-auto">
                          {v.date}
                        </span>
                      </div>
                      <p className="text-[0.75rem] text-text-secondary mb-2">
                        {v.note}
                      </p>
                      {v.metrics && (
                        <div className="flex items-center gap-3 mb-2">
                          {v.metrics.map((m) => (
                            <span
                              key={m.label}
                              className={cn(
                                "inline-flex items-center gap-1 text-[0.68rem] font-medium px-1.5 py-0.5 rounded-md",
                                m.direction === "up" && m.label !== "成本"
                                  ? "text-success bg-success-light"
                                  : m.direction === "down" && m.label === "成本"
                                    ? "text-success bg-success-light"
                                    : "text-danger bg-danger-light"
                              )}
                            >
                              {m.direction === "up" ? (
                                <TrendingUp size={11} />
                              ) : (
                                <TrendingDown size={11} />
                              )}
                              {m.label} {m.value}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <button className="inline-flex items-center gap-1 text-[0.7rem] font-medium text-text-muted hover:text-primary transition-colors cursor-pointer">
                          <Eye size={12} />
                          查看
                        </button>
                        {!v.current && (
                          <>
                            <button className="inline-flex items-center gap-1 text-[0.7rem] font-medium text-text-muted hover:text-primary transition-colors cursor-pointer">
                              <RotateCcw size={12} />
                              回滚
                            </button>
                            <button className="inline-flex items-center gap-1 text-[0.7rem] font-medium text-text-muted hover:text-primary transition-colors cursor-pointer">
                              <GitCompare size={12} />
                              对比
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function TemplatesView({ templates }: { templates: TaskTemplate[] }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="grid grid-cols-3 gap-4">
        {templates.map((t, i) => (
          <div
            key={t.name}
            className={cn(
              "group bg-surface border border-border-light rounded-xl p-5",
              "transition-all duration-200",
              "hover:border-primary hover:shadow-card-hover hover:-translate-y-0.5"
            )}
            style={{ animation: `fade-in 0.35s ease-out ${i * 60}ms both` }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center text-lg",
                  t.iconBg
                )}
              >
                {t.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[0.88rem] font-semibold text-text">
                  {t.name}
                </h3>
                <p className="text-[0.75rem] text-text-muted mt-0.5">
                  {t.desc}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <span className="text-[0.7rem] text-text-muted">参数：</span>
              <span className="text-[0.7rem] text-text-secondary font-medium">
                {t.params}
              </span>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border-light">
              <span className="text-[0.7rem] text-text-muted">
                已使用 {t.usage} 次
              </span>
              <button
                className={cn(
                  "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg",
                  "text-[0.75rem] font-medium",
                  "bg-primary text-white",
                  "hover:bg-primary-hover active:bg-primary-active",
                  "transition-colors cursor-pointer shadow-sm"
                )}
              >
                使用模板
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
