import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  RefreshCw,
  Target,
  Lightbulb,
  GripVertical,
  Pencil,
  Trash2,
  Plus,
  ChevronDown,
  Bot,
  FileOutput,
  Save,
  Rocket,
  BarChart3,
  FileText,
  Wrench,
  Globe,
  Code,
} from "lucide-react";
import { Avatar, Badge, Toggle, Modal } from "@/components/ui";
import { cn } from "@/lib/utils";

const MOCK_GOAL = "对 Cursor、Copilot、Windsurf 三款 AI 编程工具进行多维度对比分析，输出结构化分析报告";

const MOCK_STEPS = [
  {
    id: "s1",
    number: 1,
    name: "信息收集",
    description: "从官网、文档、社区收集三款工具的功能特性、定价、用户评价等信息",
    agent: { char: "检", color: "bg-primary", name: "信息采集员" },
    output: "原始数据集",
    color: "bg-primary",
  },
  {
    id: "s2",
    number: 2,
    name: "多维度对比分析",
    description: "从功能完整性、代码质量、响应速度、生态集成、定价等维度进行系统对比",
    agent: { char: "析", color: "bg-sage", name: "对比分析师" },
    output: "对比矩阵",
    color: "bg-sage",
  },
  {
    id: "s3",
    number: 3,
    name: "报告撰写",
    description: "基于对比数据撰写结构化分析报告，包含摘要、详细对比、推荐结论",
    agent: { char: "撰", color: "bg-lavender", name: "报告撰写员" },
    output: "分析报告",
    color: "bg-lavender",
  },
];

const MOCK_AGENTS = [
  {
    id: "a1",
    char: "检",
    color: "bg-primary",
    name: "信息采集员",
    model: "GPT-4o",
    tools: ["网页搜索", "文档解析"],
    badge: "复用",
    badgeVariant: "completed" as const,
    prompt: "你是一名专业的信息采集员，擅长从多个数据源收集、整理和验证信息...",
  },
  {
    id: "a2",
    char: "析",
    color: "bg-sage",
    name: "对比分析师",
    model: "Claude 3.5",
    tools: ["数据分析", "表格生成"],
    badge: "复用",
    badgeVariant: "completed" as const,
    prompt: "你是一名资深的数据分析师，擅长多维度对比分析和结构化输出...",
  },
  {
    id: "a3",
    char: "撰",
    color: "bg-lavender",
    name: "报告撰写员",
    model: "GPT-4o",
    tools: ["Markdown 编辑", "格式化"],
    badge: "新建",
    badgeVariant: "draft" as const,
    prompt: "你是一名专业的技术报告撰写员，擅长将分析结论转化为可读性强的报告...",
  },
];

const MODEL_OPTIONS = ["GPT-4o", "GPT-4o-mini", "Claude 3.5", "Claude 3 Haiku", "DeepSeek V3"];
const TOOL_OPTIONS = [
  { id: "web", label: "网页搜索", icon: Globe },
  { id: "doc", label: "文档解析", icon: FileText },
  { id: "data", label: "数据分析", icon: BarChart3 },
  { id: "table", label: "表格生成", icon: BarChart3 },
  { id: "code", label: "代码执行", icon: Code },
  { id: "md", label: "Markdown 编辑", icon: FileText },
];

export default function PlanPage() {
  const navigate = useNavigate();
  const [steps, setSteps] = useState(MOCK_STEPS);
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [addAgentModal, setAddAgentModal] = useState(false);

  const toggleStepEdit = useCallback((id: string) => {
    setEditingStep((prev) => (prev === id ? null : id));
  }, []);

  const removeStep = useCallback((id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const addStep = useCallback(() => {
    const num = steps.length + 1;
    setSteps((prev) => [
      ...prev,
      {
        id: `s${Date.now()}`,
        number: num,
        name: `步骤 ${num}`,
        description: "描述此步骤的目标...",
        agent: { char: "新", color: "bg-text-muted", name: "待分配" },
        output: "待定义",
        color: "bg-text-muted",
      },
    ]);
  }, [steps.length]);

  return (
    <div className="-m-6 flex h-[calc(100vh-var(--topbar-height))]">
      {/* Left column */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-5" style={{ animation: "fade-in 0.2s ease" }}>
          <Link
            to="/tasks"
            className="inline-flex items-center gap-1.5 text-[0.82rem] font-medium text-text-secondary hover:text-primary transition-colors no-underline"
          >
            <ArrowLeft size={15} />
            返回任务中心
          </Link>
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[0.78rem] font-medium bg-surface text-text-secondary border border-border-light hover:border-border-hover transition-all cursor-pointer">
            <RefreshCw size={13} />
            重新规划
          </button>
        </div>

        {/* Goal bar */}
        <div
          className="bg-surface rounded-xl border border-border-light p-4 mb-5 flex items-start gap-3"
          style={{ animation: "fade-in 0.25s ease 0.05s both" }}
        >
          <div className="w-9 h-9 rounded-lg bg-primary-light flex items-center justify-center shrink-0 mt-0.5">
            <Target size={16} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[0.85rem] font-medium text-text leading-relaxed">{MOCK_GOAL}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary-light text-primary text-[0.68rem] font-medium">
                标准模式
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-bg-alt text-text-muted text-[0.68rem] font-medium">
                质量门禁：标准
              </span>
            </div>
          </div>
        </div>

        {/* AI explanation */}
        <div
          className="bg-sand-light rounded-xl p-4 mb-5 flex items-start gap-3"
          style={{ animation: "fade-in 0.25s ease 0.1s both" }}
        >
          <Lightbulb size={16} className="text-sand shrink-0 mt-0.5" />
          <p className="text-[0.78rem] text-text-secondary leading-relaxed">
            基于目标分析，建议分三步执行：先收集三款工具的信息数据，再进行多维度系统对比，最后生成结构化报告。
            已为你匹配 2 个可复用 Agent，并新建 1 个报告撰写 Agent。
          </p>
        </div>

        {/* Step list */}
        <div className="relative mb-5">
          {steps.map((step, i) => (
            <div
              key={step.id}
              className="relative"
              style={{ animation: `fade-in 0.25s ease ${0.15 + i * 0.06}s both` }}
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="absolute left-[23px] top-[52px] w-0.5 h-[calc(100%-28px)] bg-border-light z-0" />
              )}

              <div className={cn(
                "relative bg-surface rounded-xl border p-4 mb-0 transition-all group",
                editingStep === step.id ? "border-primary/30 shadow-md" : "border-border-light hover:border-border-hover",
                i > 0 && "mt-3"
              )}>
                <div className="flex items-start gap-3">
                  {/* Left: drag handle + number */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <GripVertical size={14} className="text-text-muted/50 cursor-grab" />
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white text-[0.72rem] font-bold", step.color)}>
                      {step.number}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    {editingStep === step.id ? (
                      <input
                        value={step.name}
                        onChange={(e) => setSteps((prev) => prev.map((s) => s.id === step.id ? { ...s, name: e.target.value } : s))}
                        className="w-full text-[0.88rem] font-semibold text-text bg-transparent border-b border-primary/30 focus:outline-none mb-1 pb-0.5"
                      />
                    ) : (
                      <h4 className="text-[0.88rem] font-semibold text-text mb-1">{step.name}</h4>
                    )}
                    <p className="text-[0.75rem] text-text-secondary leading-relaxed mb-2.5">{step.description}</p>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-bg-alt text-[0.7rem] font-medium text-text-secondary">
                        <Bot size={11} />
                        {step.agent.name}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-bg-alt text-[0.7rem] font-medium text-text-muted">
                        <FileOutput size={11} />
                        {step.output}
                      </span>
                    </div>

                    {/* Editing panel */}
                    {editingStep === step.id && (
                      <div className="mt-3 pt-3 border-t border-border-light space-y-3" style={{ animation: "fade-in 0.2s ease" }}>
                        <div>
                          <label className="block text-[0.7rem] font-medium text-text-muted mb-1">选择 Agent</label>
                          <select className="w-full text-[0.75rem] bg-bg border border-border-light rounded-lg px-3 py-1.5 text-text focus:outline-none focus:border-primary/30">
                            {MOCK_AGENTS.map((a) => (
                              <option key={a.id}>{a.name} ({a.model})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[0.7rem] font-medium text-text-muted mb-1">输出类型</label>
                          <select className="w-full text-[0.75rem] bg-bg border border-border-light rounded-lg px-3 py-1.5 text-text focus:outline-none focus:border-primary/30">
                            <option>原始数据集</option>
                            <option>对比矩阵</option>
                            <option>分析报告</option>
                            <option>结构化 JSON</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className={cn("flex items-center gap-1 shrink-0 transition-opacity", editingStep === step.id ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                    <button
                      onClick={() => toggleStepEdit(step.id)}
                      className={cn(
                        "w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer",
                        editingStep === step.id ? "bg-primary-light text-primary" : "text-text-muted hover:bg-bg-alt hover:text-text"
                      )}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => removeStep(step.id)}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-text-muted hover:bg-danger-light hover:text-danger transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add step bar */}
        <button
          onClick={addStep}
          className="w-full py-3 rounded-xl border-2 border-dashed border-border text-[0.78rem] font-medium text-text-muted hover:border-primary/40 hover:text-primary hover:bg-primary-subtle transition-all cursor-pointer flex items-center justify-center gap-1.5"
          style={{ animation: `fade-in 0.25s ease ${0.15 + steps.length * 0.06}s both` }}
        >
          <Plus size={15} />
          添加步骤
        </button>
      </div>

      {/* Right sidebar */}
      <div className="w-80 border-l border-border-light bg-surface overflow-y-auto p-5 flex flex-col gap-5">
        {/* Agent team card */}
        <div style={{ animation: "fade-in 0.25s ease 0.1s both" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[0.85rem] font-semibold text-text">Agent 团队</h3>
            <span className="text-[0.7rem] text-text-muted">{MOCK_AGENTS.length} 个</span>
          </div>
          <div className="space-y-2">
            {MOCK_AGENTS.map((agent, i) => (
              <div
                key={agent.id}
                className="rounded-lg border border-border-light overflow-hidden"
                style={{ animation: `fade-in 0.25s ease ${0.15 + i * 0.06}s both` }}
              >
                <button
                  onClick={() => setExpandedAgent(expandedAgent === agent.id ? null : agent.id)}
                  className="w-full flex items-center gap-2.5 p-3 hover:bg-bg/50 transition-colors cursor-pointer text-left"
                >
                  <Avatar char={agent.char} color={agent.color} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[0.78rem] font-medium text-text truncate">{agent.name}</span>
                      <Badge variant={agent.badgeVariant}>{agent.badge}</Badge>
                    </div>
                    <div className="text-[0.68rem] text-text-muted mt-0.5">{agent.model}</div>
                  </div>
                  <ChevronDown size={14} className={cn("text-text-muted transition-transform shrink-0", expandedAgent === agent.id && "rotate-180")} />
                </button>

                {/* Tool tags */}
                <div className="px-3 pb-2 flex flex-wrap gap-1">
                  {agent.tools.map((tool) => (
                    <span key={tool} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-bg-alt text-[0.62rem] text-text-muted">
                      <Wrench size={9} />
                      {tool}
                    </span>
                  ))}
                </div>

                {/* Expanded edit panel */}
                {expandedAgent === agent.id && (
                  <div className="px-3 pb-3 pt-1 border-t border-border-light space-y-2.5" style={{ animation: "fade-in 0.2s ease" }}>
                    <div>
                      <label className="block text-[0.68rem] font-medium text-text-muted mb-1">Prompt</label>
                      <textarea
                        defaultValue={agent.prompt}
                        className="w-full h-16 px-2.5 py-1.5 rounded-md border border-border-light bg-bg text-[0.72rem] text-text resize-none focus:outline-none focus:border-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.68rem] font-medium text-text-muted mb-1">模型</label>
                      <select className="w-full text-[0.72rem] bg-bg border border-border-light rounded-md px-2.5 py-1.5 text-text focus:outline-none">
                        {MODEL_OPTIONS.map((m) => (
                          <option key={m} selected={m === agent.model}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[0.68rem] font-medium text-text-muted mb-1">工具</label>
                      <div className="space-y-1.5">
                        {TOOL_OPTIONS.map((tool) => (
                          <div key={tool.id} className="flex items-center justify-between">
                            <span className="text-[0.7rem] text-text-secondary flex items-center gap-1.5">
                              <tool.icon size={11} />
                              {tool.label}
                            </span>
                            <Toggle
                              checked={agent.tools.includes(tool.label)}
                              onChange={() => {}}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => setAddAgentModal(true)}
            className="w-full mt-2 py-2 rounded-lg border border-dashed border-border text-[0.75rem] font-medium text-text-muted hover:border-primary/40 hover:text-primary hover:bg-primary-subtle transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Plus size={14} />
            添加 Agent
          </button>
        </div>

        {/* Cost estimate card */}
        <div
          className="rounded-xl border border-border-light p-4"
          style={{ animation: "fade-in 0.25s ease 0.25s both" }}
        >
          <h3 className="text-[0.82rem] font-semibold text-text mb-3">成本预估</h3>
          <div className="space-y-2.5">
            {[
              { label: "执行步骤", value: "3 步" },
              { label: "复用 Agent", value: "2" },
              { label: "新建 Agent", value: "1" },
              { label: "预估 Token", value: "~15,000" },
              { label: "预估费用", value: "≈ ¥0.18", highlight: true },
              { label: "成本档位", value: "标准" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-[0.72rem] text-text-muted">{row.label}</span>
                <span className={cn("text-[0.75rem] font-medium", row.highlight ? "text-primary" : "text-text")}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Confirm area */}
        <div className="mt-auto space-y-2" style={{ animation: "fade-in 0.25s ease 0.3s both" }}>
          <button
            onClick={() => navigate("/tasks/t1/console")}
            className="w-full py-2.5 rounded-lg text-[0.82rem] font-semibold bg-gradient-to-r from-primary to-lavender text-white cursor-pointer transition-all hover:shadow-glow shadow-sm flex items-center justify-center gap-1.5"
          >
            <Rocket size={15} />
            确认执行
          </button>
          <button className="w-full py-2.5 rounded-lg text-[0.78rem] font-medium text-text-secondary bg-transparent border border-border-light hover:border-border-hover hover:bg-bg/50 transition-all cursor-pointer flex items-center justify-center gap-1.5">
            <Save size={14} />
            保存为团队模板
          </button>
        </div>
      </div>

      {/* Add Agent Modal */}
      <Modal open={addAgentModal} onClose={() => setAddAgentModal(false)} title="添加 Agent">
        <div className="space-y-4">
          <div>
            <label className="block text-[0.78rem] font-medium text-text mb-1.5">Agent 名称</label>
            <input
              placeholder="输入 Agent 名称..."
              className="w-full px-3 py-2 rounded-lg border border-border-light bg-bg text-[0.82rem] text-text placeholder:text-text-muted focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <div>
            <label className="block text-[0.78rem] font-medium text-text mb-1.5">Prompt</label>
            <textarea
              placeholder="描述 Agent 的角色和职责..."
              className="w-full h-24 px-3 py-2 rounded-lg border border-border-light bg-bg text-[0.82rem] text-text placeholder:text-text-muted resize-none focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <div>
            <label className="block text-[0.78rem] font-medium text-text mb-1.5">模型</label>
            <select className="w-full text-[0.82rem] bg-bg border border-border-light rounded-lg px-3 py-2 text-text focus:outline-none">
              {MODEL_OPTIONS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={() => setAddAgentModal(false)}
              className="px-4 py-2 rounded-lg text-[0.82rem] font-medium bg-primary text-white cursor-pointer hover:bg-primary-hover transition-colors"
            >
              确认添加
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
