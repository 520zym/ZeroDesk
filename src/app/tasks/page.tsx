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
  ListTodo,
  Loader2,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { StatCard, Badge, Tabs, Modal, ProgressBar, EmptyState } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useTasks, useTaskStats, useCreateTask, useDeleteTask } from "@/hooks/useTasks";
import { useTeams } from "@/hooks/useTeams";
import type { Task } from "@/types";

const STATUS_LABELS: Record<string, string> = {
  running: "进行中",
  completed: "已完成",
  failed: "失败",
  draft: "草稿",
  paused: "已暂停",
  blocked: "已阻塞",
  archived: "已归档",
  ready: "就绪",
};

const TEMPLATES = ["竞品分析", "技术调研", "代码评审", "运营复盘", "文档整理", "方案生成"];

const FILTER_TABS = [
  { id: "all", label: "全部" },
  { id: "running", label: "进行中" },
  { id: "completed", label: "已完成" },
  { id: "failed", label: "失败" },
  { id: "draft", label: "草稿" },
];

const COST_TIERS = [
  { id: "economy", label: "经济", desc: "成本最低", icon: "💰" },
  { id: "standard", label: "标准", desc: "均衡推荐", icon: "⚖️" },
  { id: "quality", label: "高质量", desc: "效果优先", icon: "✨" },
  { id: "unlimited", label: "不限", desc: "不设上限", icon: "🚀" },
];

const QUALITY_OPTIONS = [
  { value: "loose", label: "宽松" },
  { value: "standard", label: "标准" },
  { value: "strict", label: "严格" },
];

const RETRY_OPTIONS = [
  { value: "none", label: "不重试" },
  { value: "auto_1", label: "1 次" },
  { value: "auto_2", label: "3 次" },
  { value: "auto_5", label: "5 次" },
];

const BUDGET_OPTIONS = [
  { value: "pause", label: "暂停确认" },
  { value: "abort", label: "自动终止" },
  { value: "downgrade", label: "降级继续" },
  { value: "continue", label: "继续执行" },
];

const TIMEOUT_OPTIONS = [
  { value: 10, label: "10 分钟" },
  { value: 30, label: "30 分钟" },
  { value: 60, label: "1 小时" },
  { value: 0, label: "不限" },
];

function progressVariant(status: string): "primary" | "success" | "danger" | "warning" {
  if (status === "completed") return "success";
  if (status === "failed") return "danger";
  if (status === "paused") return "warning";
  return "primary";
}

function isBadgeVariant(status: string): status is BadgeVariant {
  return ["running", "completed", "failed", "draft", "paused", "blocked", "archived"].includes(status);
}

const COST_TIER_LABELS: Record<string, string> = {
  economy: "经济",
  standard: "标准",
  quality: "高质量",
  unlimited: "不限",
};

export default function TasksPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [planMode, setPlanMode] = useState<"ai" | "reuse">("ai");
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [costTier, setCostTier] = useState("standard");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [qualityGate, setQualityGate] = useState("standard");
  const [retryPolicy, setRetryPolicy] = useState("auto_2");
  const [overBudgetPolicy, setOverBudgetPolicy] = useState("pause");
  const [timeoutMinutes, setTimeoutMinutes] = useState(30);

  const { data: tasks, isLoading: tasksLoading, error: tasksError } = useTasks();
  const { data: stats, isLoading: statsLoading } = useTaskStats();
  const { data: teams } = useTeams();
  const createTask = useCreateTask();
  const deleteTask = useDeleteTask();

  const resetModal = useCallback(() => {
    setTitle("");
    setGoal("");
    setPlanMode("ai");
    setSelectedTeam(null);
    setCostTier("standard");
    setShowAdvanced(false);
    setQualityGate("standard");
    setRetryPolicy("auto_2");
    setOverBudgetPolicy("pause");
    setTimeoutMinutes(30);
  }, []);

  const openModal = useCallback((prefill?: string) => {
    resetModal();
    if (prefill) setTitle(`${prefill}：`);
    setModalOpen(true);
  }, [resetModal]);

  const handleCreate = useCallback(async () => {
    const taskTitle = title.trim() || goal.trim().slice(0, 60) || "未命名任务";
    try {
      const created = await createTask.mutateAsync({
        title: taskTitle,
        description: goal.trim() || undefined,
        goal: goal.trim() || undefined,
        costTier: costTier,
        planMode: planMode,
        timeoutMinutes: timeoutMinutes || undefined,
        qualityGate,
        retryPolicy,
        overBudgetPolicy,
        teamId: selectedTeam ?? undefined,
      });
      setModalOpen(false);
      navigate(`/tasks/${created.id}/plan`);
    } catch {
      // mutation error is accessible via createTask.error
    }
  }, [title, goal, costTier, planMode, timeoutMinutes, qualityGate, retryPolicy, overBudgetPolicy, createTask, navigate]);

  const filteredTasks: Task[] = (() => {
    if (!tasks) return [];
    if (activeTab === "all") return tasks;
    return tasks.filter((t) => t.status === activeTab);
  })();

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
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border-light rounded-xl p-4 animate-pulse">
              <div className="w-9 h-9 rounded-lg bg-bg-alt mb-3" />
              <div className="h-6 w-10 bg-bg-alt rounded mb-1" />
              <div className="h-3 w-14 bg-bg-alt rounded" />
            </div>
          ))
        ) : (
          <>
            <StatCard icon={Play} iconColor="text-primary" iconBg="bg-primary-light" value={String(stats?.running ?? 0)} label="进行中" ring="ring-1 ring-primary/10" />
            <StatCard icon={CheckCircle2} iconColor="text-success" iconBg="bg-success-light" value={String(stats?.completed ?? 0)} label="已完成" />
            <StatCard icon={XCircle} iconColor="text-danger" iconBg="bg-danger-light" value={String(stats?.failed ?? 0)} label="失败" />
            <StatCard icon={FileEdit} iconColor="text-text-muted" iconBg="bg-bg-alt" value={String(stats?.draft ?? 0)} label="草稿" />
          </>
        )}
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

      {/* Content area */}
      {tasksLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-primary" />
          <span className="ml-2 text-[0.82rem] text-text-muted">加载任务列表...</span>
        </div>
      ) : tasksError ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-danger-light flex items-center justify-center mb-3">
            <AlertTriangle size={20} className="text-danger" />
          </div>
          <p className="text-[0.85rem] font-medium text-text mb-1">加载失败</p>
          <p className="text-[0.78rem] text-text-muted">{String(tasksError)}</p>
        </div>
      ) : filteredTasks.length === 0 && activeTab === "all" ? (
        <EmptyState
          icon={ListTodo}
          title="还没有任务"
          description="创建你的第一个任务，让 AI Agent 团队帮你完成复杂工作"
          features={[
            { icon: Target, title: "描述目标", desc: "用自然语言描述任务目标" },
            { icon: Sparkles, title: "AI 规划", desc: "自动拆解步骤并分配 Agent" },
            { icon: Rocket, title: "自动执行", desc: "Agent 协同执行并实时反馈" },
          ]}
        />
      ) : filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-[0.82rem] text-text-muted">当前筛选条件下没有任务</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTasks.map((task, i) => (
            <div
              key={task.id}
              onClick={() => navigate(task.status === "running" ? `/tasks/${task.id}/console` : `/tasks/${task.id}/plan`)}
              className="bg-surface rounded-xl border border-border-light p-5 cursor-pointer transition-all hover:shadow-card-hover hover:border-primary/15 group"
              style={{ animation: `fade-in 0.25s ease ${i * 0.06}s both` }}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-[0.9rem] font-semibold text-text group-hover:text-primary transition-colors leading-snug line-clamp-1">
                  {task.title}
                </h3>
                {isBadgeVariant(task.status) && (
                  <Badge variant={task.status}>{STATUS_LABELS[task.status] ?? task.status}</Badge>
                )}
              </div>
              <p className="text-[0.78rem] text-text-secondary leading-relaxed mb-4 line-clamp-2">
                {task.description || task.goal || "暂无描述"}
              </p>
              <div className="flex items-center gap-2 mb-4">
                <ProgressBar value={task.progress ?? 0} variant={progressVariant(task.status)} size="sm" />
                <span className="text-[0.7rem] text-text-muted font-mono shrink-0">{task.progress ?? 0}%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {task.cost_tier && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[0.65rem] font-medium bg-bg-alt text-text-muted border border-border-light">
                      {COST_TIER_LABELS[task.cost_tier] ?? task.cost_tier}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[0.7rem] text-text-muted">{formatRelativeTime(task.updated_at)}</span>
                  {task.status !== "running" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTask.mutate(task.id);
                      }}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-text-muted opacity-0 group-hover:opacity-100 hover:bg-danger-light hover:text-danger transition-all cursor-pointer"
                      title="删除任务"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
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
      )}

      {/* New Task Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="新建任务" width="600px">
        <div className="space-y-5">
          {/* Title input */}
          <div>
            <label className="block text-[0.78rem] font-medium text-text mb-1.5">任务标题</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给任务起个名字..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-border-light bg-bg text-[0.82rem] text-text placeholder:text-text-muted focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>

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
                onClick={() => setPlanMode("reuse")}
                className={cn(
                  "flex items-start gap-3 p-3.5 rounded-lg border-2 transition-all cursor-pointer text-left",
                  planMode === "reuse"
                    ? "border-primary bg-primary-subtle"
                    : "border-border-light bg-surface hover:border-border-hover"
                )}
              >
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", planMode === "reuse" ? "bg-primary-light" : "bg-bg-alt")}>
                  <Users size={15} className={planMode === "reuse" ? "text-primary" : "text-text-muted"} />
                </div>
                <div>
                  <div className="text-[0.82rem] font-semibold text-text">复用已有团队</div>
                  <div className="text-[0.7rem] text-text-muted mt-0.5">选择已有的团队配置执行</div>
                </div>
              </button>
            </div>
          </div>

          {/* Team chips (when reuse mode) */}
          {planMode === "reuse" && (
            <div style={{ animation: "fade-in 0.2s ease" }}>
              <label className="block text-[0.78rem] font-medium text-text mb-2">选择团队</label>
              <div className="flex flex-wrap gap-2">
                {!teams || teams.length === 0 ? (
                  <p className="text-[0.75rem] text-text-muted">暂无团队，请先在团队管理中创建</p>
                ) : (
                  teams.map((team) => (
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
                    </button>
                  ))
                )}
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
                    <div className="text-[0.65rem] text-text-muted">{QUALITY_OPTIONS.find((o) => o.value === qualityGate)?.label}</div>
                  </div>
                  <select
                    value={qualityGate}
                    onChange={(e) => setQualityGate(e.target.value)}
                    className="text-[0.72rem] bg-surface border border-border-light rounded-md px-2 py-1 text-text-secondary cursor-pointer focus:outline-none"
                  >
                    {QUALITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-bg border border-border-light">
                  <div>
                    <div className="text-[0.75rem] font-medium text-text">失败重试</div>
                    <div className="text-[0.65rem] text-text-muted">{RETRY_OPTIONS.find((o) => o.value === retryPolicy)?.label}</div>
                  </div>
                  <select
                    value={retryPolicy}
                    onChange={(e) => setRetryPolicy(e.target.value)}
                    className="text-[0.72rem] bg-surface border border-border-light rounded-md px-2 py-1 text-text-secondary cursor-pointer focus:outline-none"
                  >
                    {RETRY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-bg border border-border-light">
                  <div>
                    <div className="text-[0.75rem] font-medium text-text">超预算处理</div>
                    <div className="text-[0.65rem] text-text-muted">{BUDGET_OPTIONS.find((o) => o.value === overBudgetPolicy)?.label}</div>
                  </div>
                  <select
                    value={overBudgetPolicy}
                    onChange={(e) => setOverBudgetPolicy(e.target.value)}
                    className="text-[0.72rem] bg-surface border border-border-light rounded-md px-2 py-1 text-text-secondary cursor-pointer focus:outline-none"
                  >
                    {BUDGET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-bg border border-border-light">
                  <div>
                    <div className="text-[0.75rem] font-medium text-text">超时设置</div>
                    <div className="text-[0.65rem] text-text-muted">{TIMEOUT_OPTIONS.find((o) => o.value === timeoutMinutes)?.label}</div>
                  </div>
                  <select
                    value={timeoutMinutes}
                    onChange={(e) => setTimeoutMinutes(Number(e.target.value))}
                    className="text-[0.72rem] bg-surface border border-border-light rounded-md px-2 py-1 text-text-secondary cursor-pointer focus:outline-none"
                  >
                    {TIMEOUT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border-light">
            <div className="flex items-center gap-1.5 text-[0.72rem] text-text-muted">
              <Cpu size={13} />
              <span>成本档位：{COST_TIERS.find((t) => t.id === costTier)?.label ?? "标准"}</span>
            </div>
            <button
              onClick={handleCreate}
              disabled={createTask.isPending}
              className={cn(
                "inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-[0.82rem] font-semibold bg-gradient-to-r from-primary to-lavender text-white border-none cursor-pointer transition-all hover:shadow-glow shadow-sm",
                createTask.isPending && "opacity-60 cursor-not-allowed"
              )}
            >
              {createTask.isPending ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Rocket size={15} />
              )}
              {createTask.isPending ? "创建中..." : "启动任务"}
            </button>
          </div>

          {createTask.isError && (
            <p className="text-[0.75rem] text-danger mt-2">
              创建失败：{String(createTask.error)}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
