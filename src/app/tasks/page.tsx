import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  Play,
  CheckCircle2,
  XCircle,
  FileEdit,
  Plus,
  History,
  Zap,
  Filter,
  Target,
  Users,
  Cpu,
  ChevronDown,
  Sparkles,
  Settings2,
  Rocket,
} from "lucide-react";
import { StatCard, Badge, Tabs, Modal, AvatarStack, ProgressBar } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";
import { cn } from "@/lib/utils";

const MOCK_TASKS = [
  { id: "t1", title: "竞品分析：AI 编程工具对比", status: "running" as BadgeVariant, desc: "对 Cursor、Copilot、Windsurf 三款工具进行多维度对比分析", progress: 65, team: "竞品分析小队", avatars: [{ char: "检", color: "bg-primary" }, { char: "析", color: "bg-sage" }, { char: "审", color: "bg-coral" }], time: "10 分钟前" },
  { id: "t2", title: "周报数据汇总与可视化", status: "running" as BadgeVariant, desc: "从多个数据源拉取本周运营数据，自动生成结构化周报", progress: 40, team: "数据组", avatars: [{ char: "拉", color: "bg-lavender" }, { char: "汇", color: "bg-sand" }], time: "25 分钟前" },
  { id: "t3", title: "API 接口文档自动生成", status: "paused" as BadgeVariant, desc: "读取后端代码仓库，提取接口定义并自动生成 OpenAPI 规范文档", progress: 30, team: "文档组", avatars: [{ char: "读", color: "bg-[#6A8D99]" }, { char: "写", color: "bg-[#C49A84]" }], time: "1 小时前" },
  { id: "t4", title: "用户反馈分析与优先级排序", status: "completed" as BadgeVariant, desc: "整理最近两周的用户反馈，分类归纳后按影响面和紧急度排序", progress: 100, team: "反馈小队", avatars: [{ char: "整", color: "bg-sage" }, { char: "排", color: "bg-lavender" }], time: "昨天" },
  { id: "t5", title: "技术方案评审：缓存架构", status: "failed" as BadgeVariant, desc: "评审新版缓存架构设计文档，从性能、可靠性、成本三个维度给出建议", progress: 55, team: "评审组", avatars: [{ char: "评", color: "bg-danger" }], time: "2 天前" },
];

const STATUS_LABELS: Record<string, string> = {
  running: "进行中",
  completed: "已完成",
  failed: "失败",
  draft: "草稿",
  paused: "已暂停",
};

const TEMPLATES = ["竞品分析", "技术调研", "代码评审", "运营复盘", "文档整理", "方案生成"];

const FILTER_TABS = [
  { id: "all", label: "全部" },
  { id: "running", label: "进行中" },
  { id: "completed", label: "已完成" },
  { id: "failed", label: "失败" },
  { id: "draft", label: "草稿" },
];

const TEAMS = [
  { id: "team1", name: "竞品分析小队", count: 3 },
  { id: "team2", name: "数据组", count: 2 },
  { id: "team3", name: "文档组", count: 2 },
  { id: "team4", name: "评审组", count: 1 },
];

const COST_TIERS = [
  { id: "economy", label: "经济", desc: "成本最低", icon: "💰" },
  { id: "standard", label: "标准", desc: "均衡推荐", icon: "⚖️" },
  { id: "quality", label: "高质量", desc: "效果优先", icon: "✨" },
  { id: "unlimited", label: "不限", desc: "不设上限", icon: "🚀" },
];

function progressVariant(status: string): "primary" | "success" | "danger" | "warning" {
  if (status === "completed") return "success";
  if (status === "failed") return "danger";
  if (status === "paused") return "warning";
  return "primary";
}

export default function TasksPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [goal, setGoal] = useState("");
  const [planMode, setPlanMode] = useState<"ai" | "team">("ai");
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [costTier, setCostTier] = useState("standard");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const openModal = useCallback((prefill?: string) => {
    setGoal(prefill ? `${prefill}：` : "");
    setPlanMode("ai");
    setSelectedTeam(null);
    setCostTier("standard");
    setShowAdvanced(false);
    setModalOpen(true);
  }, []);

  const filteredTasks = activeTab === "all"
    ? MOCK_TASKS
    : MOCK_TASKS.filter((t) => t.status === activeTab);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <p className="text-[0.82rem] text-text-secondary">管理所有任务，追踪 Agent 执行进度</p>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/history")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[0.82rem] font-medium bg-surface text-text-secondary border border-border-light cursor-pointer transition-all hover:border-border-hover hover:text-text shadow-xs"
          >
            <History size={14} />
            历史
          </button>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[0.82rem] font-medium bg-gradient-to-r from-primary to-lavender text-white border-none cursor-pointer transition-all hover:shadow-glow shadow-sm"
          >
            <Plus size={15} strokeWidth={2.5} />
            新建任务
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Play} iconColor="text-primary" iconBg="bg-primary-light" value="3" label="进行中" change={{ value: "+1", direction: "up" }} ring="ring-1 ring-primary/10" />
        <StatCard icon={CheckCircle2} iconColor="text-success" iconBg="bg-success-light" value="12" label="已完成" change={{ value: "+3", direction: "up" }} />
        <StatCard icon={XCircle} iconColor="text-danger" iconBg="bg-danger-light" value="2" label="失败" />
        <StatCard icon={FileEdit} iconColor="text-text-muted" iconBg="bg-bg-alt" value="5" label="草稿" />
      </div>

      {/* Template bar */}
      <div
        className="bg-surface rounded-xl border border-border-light p-4 mb-5 flex items-center gap-3"
        style={{ animation: "fade-in 0.3s ease-out 0.1s both" }}
      >
        <div className="w-8 h-8 rounded-lg bg-sand-light flex items-center justify-center shrink-0">
          <Zap size={15} className="text-sand" />
        </div>
        <span className="text-[0.8rem] font-medium text-text-secondary shrink-0">快速模板</span>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {TEMPLATES.map((t) => (
            <button
              key={t}
              onClick={() => openModal(t)}
              className="shrink-0 px-3 py-1.5 rounded-full text-[0.75rem] font-medium bg-bg-alt text-text-secondary border border-border-light hover:border-primary/30 hover:text-primary hover:bg-primary-light transition-all cursor-pointer"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div
        className="flex items-center gap-3 mb-5"
        style={{ animation: "fade-in 0.3s ease-out 0.15s both" }}
      >
        <Tabs tabs={FILTER_TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        <button className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.75rem] font-medium text-text-muted hover:text-text-secondary hover:bg-surface border border-transparent hover:border-border-light transition-all cursor-pointer">
          <Filter size={13} />
          筛选
        </button>
      </div>

      {/* Task card grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredTasks.map((task, i) => (
          <div
            key={task.id}
            onClick={() => navigate(task.status === "running" ? `/tasks/${task.id}/console` : `/tasks/${task.id}/plan`)}
            className="bg-surface rounded-xl border border-border-light p-5 cursor-pointer transition-all hover:shadow-card-hover hover:border-primary/15 group"
            style={{ animation: `fade-in 0.25s ease ${i * 0.06}s both` }}
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-[0.9rem] font-semibold text-text group-hover:text-primary transition-colors leading-snug">
                {task.title}
              </h3>
              <Badge variant={task.status}>{STATUS_LABELS[task.status]}</Badge>
            </div>
            <p className="text-[0.78rem] text-text-secondary leading-relaxed mb-4 line-clamp-2">
              {task.desc}
            </p>
            <div className="flex items-center gap-2 mb-4">
              <ProgressBar value={task.progress} variant={progressVariant(task.status)} size="sm" />
              <span className="text-[0.7rem] text-text-muted font-mono shrink-0">{task.progress}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AvatarStack avatars={task.avatars} size="xs" />
                <span className="text-[0.72rem] text-text-muted">{task.team}</span>
              </div>
              <span className="text-[0.7rem] text-text-muted">{task.time}</span>
            </div>
          </div>
        ))}

        {/* Create new task placeholder */}
        <div
          onClick={() => openModal()}
          className="rounded-xl border-2 border-dashed border-border p-5 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:border-primary/40 hover:bg-primary-subtle min-h-[180px] group"
          style={{ animation: `fade-in 0.25s ease ${filteredTasks.length * 0.06}s both` }}
        >
          <div className="w-10 h-10 rounded-full bg-bg-alt flex items-center justify-center group-hover:bg-primary-light transition-colors">
            <Plus size={18} className="text-text-muted group-hover:text-primary transition-colors" />
          </div>
          <span className="text-[0.82rem] font-medium text-text-muted group-hover:text-primary transition-colors">
            创建新任务
          </span>
        </div>
      </div>

      {/* New Task Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="新建任务" width="600px">
        <div className="space-y-5">
          {/* Goal textarea */}
          <div>
            <label className="block text-[0.78rem] font-medium text-text mb-1.5">任务目标</label>
            <div className="relative">
              <Target size={15} className="absolute left-3 top-3 text-text-muted" />
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="用自然语言描述你的任务目标..."
                className="w-full h-24 pl-9 pr-4 py-2.5 rounded-lg border border-border-light bg-bg text-[0.82rem] text-text placeholder:text-text-muted resize-none focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
              />
            </div>
          </div>

          {/* Plan mode selector */}
          <div>
            <label className="block text-[0.78rem] font-medium text-text mb-2">规划方式</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPlanMode("ai")}
                className={cn(
                  "flex items-start gap-3 p-3.5 rounded-lg border-2 transition-all cursor-pointer text-left",
                  planMode === "ai"
                    ? "border-primary bg-primary-subtle"
                    : "border-border-light bg-surface hover:border-border-hover"
                )}
              >
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", planMode === "ai" ? "bg-primary-light" : "bg-bg-alt")}>
                  <Sparkles size={15} className={planMode === "ai" ? "text-primary" : "text-text-muted"} />
                </div>
                <div>
                  <div className="text-[0.82rem] font-semibold text-text">AI 智能规划</div>
                  <div className="text-[0.7rem] text-text-muted mt-0.5">自动分析目标并生成执行计划</div>
                </div>
              </button>
              <button
                onClick={() => setPlanMode("team")}
                className={cn(
                  "flex items-start gap-3 p-3.5 rounded-lg border-2 transition-all cursor-pointer text-left",
                  planMode === "team"
                    ? "border-primary bg-primary-subtle"
                    : "border-border-light bg-surface hover:border-border-hover"
                )}
              >
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", planMode === "team" ? "bg-primary-light" : "bg-bg-alt")}>
                  <Users size={15} className={planMode === "team" ? "text-primary" : "text-text-muted"} />
                </div>
                <div>
                  <div className="text-[0.82rem] font-semibold text-text">复用已有团队</div>
                  <div className="text-[0.7rem] text-text-muted mt-0.5">选择已有的团队配置执行</div>
                </div>
              </button>
            </div>
          </div>

          {/* Team chips (when team mode) */}
          {planMode === "team" && (
            <div style={{ animation: "fade-in 0.2s ease" }}>
              <label className="block text-[0.78rem] font-medium text-text mb-2">选择团队</label>
              <div className="flex flex-wrap gap-2">
                {TEAMS.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeam(team.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.75rem] font-medium border transition-all cursor-pointer",
                      selectedTeam === team.id
                        ? "border-primary bg-primary-light text-primary"
                        : "border-border-light bg-bg-alt text-text-secondary hover:border-border-hover"
                    )}
                  >
                    <Users size={12} />
                    {team.name}
                    <span className="text-[0.65rem] text-text-muted">({team.count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cost tier selector */}
          <div>
            <label className="block text-[0.78rem] font-medium text-text mb-2">成本档位</label>
            <div className="grid grid-cols-4 gap-2">
              {COST_TIERS.map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => setCostTier(tier.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all cursor-pointer",
                    costTier === tier.id
                      ? "border-primary bg-primary-subtle"
                      : "border-border-light bg-surface hover:border-border-hover"
                  )}
                >
                  <span className="text-base">{tier.icon}</span>
                  <span className="text-[0.78rem] font-semibold text-text">{tier.label}</span>
                  <span className="text-[0.65rem] text-text-muted">{tier.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced settings toggle */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="inline-flex items-center gap-1.5 text-[0.78rem] font-medium text-text-secondary hover:text-text transition-colors cursor-pointer"
            >
              <Settings2 size={14} />
              高级设置
              <ChevronDown size={13} className={cn("transition-transform", showAdvanced && "rotate-180")} />
            </button>

            {showAdvanced && (
              <div className="mt-3 grid grid-cols-2 gap-3" style={{ animation: "fade-in 0.2s ease" }}>
                <div className="flex items-center justify-between p-3 rounded-lg bg-bg border border-border-light">
                  <div>
                    <div className="text-[0.75rem] font-medium text-text">质量门禁</div>
                    <div className="text-[0.65rem] text-text-muted">标准</div>
                  </div>
                  <select className="text-[0.72rem] bg-surface border border-border-light rounded-md px-2 py-1 text-text-secondary cursor-pointer focus:outline-none">
                    <option>宽松</option>
                    <option>标准</option>
                    <option>严格</option>
                  </select>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-bg border border-border-light">
                  <div>
                    <div className="text-[0.75rem] font-medium text-text">失败重试</div>
                    <div className="text-[0.65rem] text-text-muted">最多 3 次</div>
                  </div>
                  <select className="text-[0.72rem] bg-surface border border-border-light rounded-md px-2 py-1 text-text-secondary cursor-pointer focus:outline-none">
                    <option>不重试</option>
                    <option>1 次</option>
                    <option>3 次</option>
                    <option>5 次</option>
                  </select>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-bg border border-border-light">
                  <div>
                    <div className="text-[0.75rem] font-medium text-text">超预算处理</div>
                    <div className="text-[0.65rem] text-text-muted">暂停确认</div>
                  </div>
                  <select className="text-[0.72rem] bg-surface border border-border-light rounded-md px-2 py-1 text-text-secondary cursor-pointer focus:outline-none">
                    <option>暂停确认</option>
                    <option>自动终止</option>
                    <option>继续执行</option>
                  </select>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-bg border border-border-light">
                  <div>
                    <div className="text-[0.75rem] font-medium text-text">超时设置</div>
                    <div className="text-[0.65rem] text-text-muted">30 分钟</div>
                  </div>
                  <select className="text-[0.72rem] bg-surface border border-border-light rounded-md px-2 py-1 text-text-secondary cursor-pointer focus:outline-none">
                    <option>10 分钟</option>
                    <option>30 分钟</option>
                    <option>1 小时</option>
                    <option>不限</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border-light">
            <div className="flex items-center gap-1.5 text-[0.72rem] text-text-muted">
              <Cpu size={13} />
              <span>预估消耗 ~15,000 Token ≈ ¥0.18</span>
            </div>
            <button
              onClick={() => {
                setModalOpen(false);
                navigate("/tasks/t1/plan");
              }}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-[0.82rem] font-semibold bg-gradient-to-r from-primary to-lavender text-white border-none cursor-pointer transition-all hover:shadow-glow shadow-sm"
            >
              <Rocket size={15} />
              启动任务
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
