import { useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Bot,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { Avatar, Badge, EmptyState, ProgressBar } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useAgents } from "@/hooks/useAgents";
import { useTeams } from "@/hooks/useTeams";
import { useRerunTask, useStartTaskExecution, useTask, useTaskRuns, useTaskSteps } from "@/hooks/useTasks";

const STATUS_META: Record<string, { label: string; variant: BadgeVariant }> = {
  running: { label: "执行中", variant: "running" },
  completed: { label: "已完成", variant: "completed" },
  failed: { label: "失败", variant: "failed" },
  draft: { label: "草稿", variant: "draft" },
  pending: { label: "待执行", variant: "draft" },
  paused: { label: "已暂停", variant: "paused" },
};

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: task, isLoading } = useTask(id);
  const { data: steps = [] } = useTaskSteps(id);
  const { data: runs = [] } = useTaskRuns(id);
  const { data: agents = [] } = useAgents();
  const { data: teams = [] } = useTeams();
  const startExecution = useStartTaskExecution();
  const rerunTask = useRerunTask();

  const team = useMemo(() => teams.find((t) => t.id === task?.team_id), [teams, task?.team_id]);
  const agentMap = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);
  const taskAgents = useMemo(() => {
    const ids = Array.from(new Set(steps.map((step) => step.agent_id).filter(Boolean))) as string[];
    return ids.map((agentId) => agentMap.get(agentId)).filter(Boolean);
  }, [agentMap, steps]);

  if (isLoading || !task) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-text-muted" />
      </div>
    );
  }

  const status = STATUS_META[task.status] ?? { label: task.status, variant: "draft" as BadgeVariant };
  const canPlan = task.status === "pending" || task.status === "draft";
  const canStart = canPlan && steps.length > 0;
  const canRerun = task.status === "completed" || task.status === "failed";

  const handleStart = () => {
    if (!id) return;
    startExecution.mutate(
      { taskId: id },
      { onSuccess: () => navigate(`/tasks/${id}/console`) },
    );
  };

  const handleRerun = () => {
    if (!id) return;
    rerunTask.mutate(
      { taskId: id },
      { onSuccess: () => navigate(`/tasks/${id}/console`) },
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => navigate("/tasks")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border-light bg-surface px-3 py-2 text-[0.78rem] font-medium text-text-secondary transition-colors hover:text-text"
        >
          <ArrowLeft size={14} />
          返回任务中心
        </button>
        <div className="flex items-center gap-2">
          {canPlan && (
            <button
              onClick={() => navigate(`/tasks/${task.id}/plan`)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-light bg-surface px-3.5 py-2 text-[0.78rem] font-medium text-text-secondary transition-colors hover:text-text"
            >
              <Sparkles size={14} />
              调整计划
            </button>
          )}
          {canStart && (
            <button
              onClick={handleStart}
              disabled={startExecution.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-[0.78rem] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {startExecution.isPending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              开始执行
            </button>
          )}
          {canRerun && (
            <button
              onClick={handleRerun}
              disabled={rerunTask.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sage px-3.5 py-2 text-[0.78rem] font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {rerunTask.isPending ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
              重新执行
            </button>
          )}
          <button
            onClick={() => navigate(`/tasks/${task.id}/console`)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-light bg-surface px-3.5 py-2 text-[0.78rem] font-medium text-primary transition-colors hover:text-primary-hover"
          >
            <ExternalLink size={14} />
            执行控制台
          </button>
        </div>
      </div>

      <section className="rounded-xl border border-border-light bg-surface p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <Badge variant={status.variant}>{status.label}</Badge>
              <span className="text-[0.72rem] text-text-muted">更新于 {formatRelativeTime(task.updated_at)}</span>
            </div>
            <h2 className="text-xl font-semibold text-text">{task.title}</h2>
          </div>
          <div className="min-w-[180px]">
            <ProgressBar value={task.progress ?? 0} variant={task.status === "failed" ? "danger" : "primary"} size="sm" />
            <div className="mt-1 text-right text-[0.68rem] font-mono text-text-muted">{task.progress ?? 0}%</div>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <InfoBlock icon={Target} label="任务目标" value={task.goal || task.description || "暂无任务目标"} />
          <InfoBlock icon={Users} label="执行团队" value={team?.name || "未绑定团队"} />
          <InfoBlock icon={Clock} label="运行次数" value={`${runs.length || 0} 次`} />
          <InfoBlock icon={FileText} label="执行计划" value={`${steps.length} 个步骤`} />
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-border-light bg-surface p-5">
          <h3 className="mb-4 text-[0.9rem] font-semibold text-text">执行步骤</h3>
          {steps.length === 0 ? (
            <EmptyState icon={FileText} title="还没有执行步骤" description="进入计划页生成或编辑任务步骤" />
          ) : (
            <div className="space-y-3">
              {steps.map((step, index) => {
                const agent = step.agent_id ? agentMap.get(step.agent_id) : null;
                return (
                  <div key={step.id} className="rounded-lg border border-border-light bg-bg/40 p-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-light text-[0.68rem] font-semibold text-primary">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-[0.82rem] font-medium text-text">{step.name}</h4>
                          {step.status && <Badge variant={STATUS_META[step.status]?.variant ?? "draft"}>{STATUS_META[step.status]?.label ?? step.status}</Badge>}
                        </div>
                        <p className="mt-1 text-[0.75rem] leading-relaxed text-text-secondary">{step.description || "暂无步骤说明"}</p>
                      </div>
                      {agent && (
                        <div className="flex shrink-0 items-center gap-2 rounded-lg bg-surface px-2 py-1">
                          <Avatar char={agent.avatar_char || agent.name[0]} color={agent.avatar_color || "bg-primary"} size="xs" />
                          <span className="max-w-[120px] truncate text-[0.7rem] font-medium text-text-secondary">{agent.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border-light bg-surface p-5">
          <h3 className="mb-4 text-[0.9rem] font-semibold text-text">包含 Agent</h3>
          {taskAgents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border-light p-5 text-center">
              <Bot size={22} className="mx-auto mb-2 text-text-muted" />
              <p className="text-[0.75rem] text-text-muted">暂无已分配 Agent</p>
            </div>
          ) : (
            <div className="space-y-2">
              {taskAgents.map((agent) => (
                <div key={agent!.id} className="flex items-center gap-2 rounded-lg border border-border-light bg-bg/40 p-2.5">
                  <Avatar char={agent!.avatar_char || agent!.name[0]} color={agent!.avatar_color || "bg-primary"} size="sm" />
                  <div className="min-w-0">
                    <div className="truncate text-[0.78rem] font-medium text-text">{agent!.name}</div>
                    <div className="truncate text-[0.65rem] text-text-muted">{agent!.role_description || "未设置角色描述"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function InfoBlock({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border-light bg-bg/40 p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[0.68rem] font-medium text-text-muted">
        <Icon size={13} />
        {label}
      </div>
      <div className={cn("text-[0.8rem] leading-relaxed text-text", label === "任务目标" && "whitespace-pre-wrap")}>{value}</div>
    </div>
  );
}
