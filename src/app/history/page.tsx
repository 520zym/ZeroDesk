import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Download,
  Trash2,
  Search,
  ChevronDown,
  ListChecks,
  Target,
  Clock,
  Coins,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
  Lightbulb,
  X,
  FileSearch,
  History,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { StatCard, Badge, EmptyState } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";
import { useHistoryStats, useHistoryTasks } from "@/hooks/useDashboard";
import { useTeams } from "@/hooks/useTeams";
import { useUpdateTaskStatus } from "@/hooks/useTasks";
import type { Task, Team } from "@/types";

const statusLabels: Record<string, string> = {
  completed: "已完成",
  failed: "失败",
  archived: "已归档",
};

const filterPills = ["全部", "今天", "本周", "本月"];

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function computeDurationSeconds(
  createdAt: string,
  completedAt: string | null
): number {
  if (!completedAt) return 0;
  return (
    (new Date(completedAt).getTime() - new Date(createdAt).getTime()) / 1000
  );
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isThisWeek(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(
    now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)
  );
  weekStart.setHours(0, 0, 0, 0);
  return d >= weekStart;
}

function isThisMonth(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function getTeamName(teamId: string | null, teams: Team[] | undefined): string {
  if (!teamId || !teams) return "—";
  return teams.find((t) => t.id === teamId)?.name ?? "—";
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("全部");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: stats, isLoading: statsLoading } = useHistoryStats();
  const { data: tasks, isLoading: tasksLoading } = useHistoryTasks(
    debouncedSearch || undefined
      ? {
          search: debouncedSearch || undefined,
        }
      : undefined
  );
  const { data: teams } = useTeams();
  const updateTaskStatus = useUpdateTaskStatus();

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    let result = tasks;

    if (activeFilter === "今天") {
      result = result.filter((t) => isToday(t.updated_at));
    } else if (activeFilter === "本周") {
      result = result.filter((t) => isThisWeek(t.updated_at));
    } else if (activeFilter === "本月") {
      result = result.filter((t) => isThisMonth(t.updated_at));
    }

    if (teamFilter) {
      result = result.filter((t) => t.team_id === teamFilter);
    }

    return result;
  }, [tasks, activeFilter, teamFilter]);

  const toggleReview = useCallback((id: string) => {
    setReviewingId((prev) => (prev === id ? null : id));
  }, []);

  const handleRerun = useCallback(
    (task: Task) => {
      updateTaskStatus.mutate(
        { taskId: task.id, status: "running" },
        { onSuccess: () => navigate(`/tasks/${task.id}/console`) }
      );
    },
    [updateTaskStatus, navigate]
  );

  const statsValue = (v: string | undefined, fallback = "0") => v ?? fallback;

  return (
    <div className="flex flex-col h-full overflow-hidden px-4 sm:px-6 pt-5 pb-6">
      {/* Header */}
      <div
        className="shrink-0 flex items-center justify-between mb-5"
        style={{ animation: "fade-in 0.3s ease-out" }}
      >
        <p className="text-[0.82rem] text-text-secondary">
          查看历史执行记录，进行故障复盘与一键重执行
        </p>
        <div className="flex items-center gap-2">
          <button
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg",
              "text-[0.78rem] font-medium text-text-secondary",
              "border border-border-light bg-surface",
              "hover:bg-bg-alt hover:text-text transition-colors cursor-pointer"
            )}
          >
            <Download size={14} />
            导出
          </button>
          <button
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg",
              "text-[0.78rem] font-medium text-danger",
              "border border-danger-light bg-danger-light/50",
              "hover:bg-danger-light transition-colors cursor-pointer"
            )}
          >
            <Trash2 size={14} />
            清理
          </button>
        </div>
      </div>

      {/* Stats */}
      <div
        className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5"
        style={{ animation: "fade-in 0.3s ease-out 60ms both" }}
      >
        <StatCard
          icon={ListChecks}
          iconColor="text-primary"
          iconBg="bg-primary-light"
          value={statsLoading ? "—" : String(stats?.total ?? 0)}
          label="总任务"
        />
        <StatCard
          icon={Target}
          iconColor="text-success"
          iconBg="bg-success-light"
          value={
            statsLoading
              ? "—"
              : `${(stats?.success_rate ?? 0).toFixed(1)}%`
          }
          label="成功率"
        />
        <StatCard
          icon={Clock}
          iconColor="text-lavender"
          iconBg="bg-lavender-light"
          value={
            statsLoading
              ? "—"
              : formatDuration(stats?.avg_duration_seconds ?? 0)
          }
          label="平均耗时"
        />
        <StatCard
          icon={Coins}
          iconColor="text-sand"
          iconBg="bg-sand-light"
          value={
            statsLoading
              ? "—"
              : `¥${(stats?.total_cost ?? 0).toFixed(2)}`
          }
          label="总消耗"
        />
      </div>

      {/* Filter bar */}
      <div
        className="shrink-0 flex items-center gap-3 mb-4"
        style={{ animation: "fade-in 0.3s ease-out 120ms both" }}
      >
        <div className="inline-flex items-center gap-1 bg-bg rounded-lg p-1">
          {filterPills.map((pill) => (
            <button
              key={pill}
              onClick={() => setActiveFilter(pill)}
              className={cn(
                "px-3 py-1 rounded-md text-[0.75rem] font-medium transition-all cursor-pointer",
                activeFilter === pill
                  ? "bg-surface text-text shadow-sm"
                  : "text-text-muted hover:text-text-secondary"
              )}
            >
              {pill}
            </button>
          ))}
        </div>

        <div className="relative">
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className={cn(
              "appearance-none rounded-lg border border-border-light bg-surface px-3 py-1.5 pr-7",
              "text-[0.75rem] text-text-secondary",
              "focus:outline-none focus:border-primary cursor-pointer"
            )}
          >
            <option value="">全部团队</option>
            {teams?.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          />
        </div>

        <div className="relative ml-auto">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            placeholder="搜索任务..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={cn(
              "w-[220px] rounded-lg border border-border-light bg-surface pl-8 pr-3 py-1.5",
              "text-[0.75rem] text-text placeholder:text-text-muted",
              "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20",
              "transition-colors"
            )}
          />
        </div>
      </div>

      {/* Table */}
      <div
        className="flex-1 min-h-0 bg-surface border border-border-light rounded-xl overflow-hidden flex flex-col"
        style={{ animation: "fade-in 0.35s ease-out 180ms both" }}
      >
        {tasksLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-[0.8rem] text-text-muted animate-pulse">
              加载中...
            </div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={History}
              title="暂无历史记录"
              description="完成的任务将在这里显示"
            />
          </div>
        ) : (
          <div className="overflow-y-auto flex-1">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-light bg-bg-alt/50">
                  {[
                    "任务名称",
                    "团队",
                    "状态",
                    "节点进度",
                    "Token 用量",
                    "耗时",
                    "时间",
                    "操作",
                  ].map((col) => (
                    <th
                      key={col}
                      className="text-left px-4 py-2.5 text-[0.7rem] font-semibold text-text-muted uppercase tracking-wide"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task, i) => (
                  <>
                    <tr
                      key={task.id}
                      className={cn(
                        "border-b border-border-light transition-colors",
                        task.status === "failed"
                          ? "bg-danger-light/30"
                          : "hover:bg-bg-alt/30"
                      )}
                      style={{
                        animation: `fade-in 0.3s ease-out ${180 + i * 50}ms both`,
                      }}
                    >
                      <td className="px-4 py-3">
                        <span className="text-[0.78rem] font-medium text-text">
                          {task.title}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[0.75rem] text-text-secondary">
                          {getTeamName(task.team_id, teams)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={task.status as BadgeVariant}>
                          {statusLabels[task.status] || task.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[0.75rem] text-text-secondary font-mono">
                          {task.progress != null ? `${task.progress}%` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[0.75rem] text-text-secondary font-mono">
                          {task.total_tokens?.toLocaleString() ?? "0"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[0.75rem] text-text-secondary">
                          {formatDuration(
                            computeDurationSeconds(
                              task.created_at,
                              task.completed_at
                            )
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[0.72rem] text-text-muted">
                          {formatRelativeTime(task.updated_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              navigate(`/tasks/${task.id}/console`)
                            }
                            className="inline-flex items-center gap-1 text-[0.72rem] font-medium text-primary hover:text-primary-hover transition-colors cursor-pointer"
                          >
                            <ExternalLink size={11} />
                            详情
                          </button>
                          {task.status === "failed" ? (
                            <button
                              onClick={() => toggleReview(task.id)}
                              className={cn(
                                "inline-flex items-center gap-1 text-[0.72rem] font-medium transition-colors cursor-pointer",
                                reviewingId === task.id
                                  ? "text-danger"
                                  : "text-danger hover:text-danger"
                              )}
                            >
                              <FileSearch size={11} />
                              复盘
                            </button>
                          ) : task.status === "completed" ? (
                            <button
                              onClick={() => handleRerun(task)}
                              className="inline-flex items-center gap-1 text-[0.72rem] font-medium text-sage hover:text-sage transition-colors cursor-pointer"
                            >
                              <RotateCcw size={11} />
                              重新执行
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    {reviewingId === task.id && task.status === "failed" && (
                      <tr key={`${task.id}-review`}>
                        <td colSpan={8} className="p-0">
                          <FailureReviewPanel
                            task={task}
                            onClose={() => setReviewingId(null)}
                            onNavigate={() =>
                              navigate(`/tasks/${task.id}/console`)
                            }
                          />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function FailureReviewPanel({
  task,
  onClose,
  onNavigate,
}: {
  task: Task;
  onClose: () => void;
  onNavigate: () => void;
}) {
  return (
    <div
      className="mx-4 my-3 bg-danger-light/40 border border-danger/15 rounded-xl p-5"
      style={{ animation: "fade-in 0.25s ease-out" }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-danger" />
          <h3 className="text-[0.85rem] font-semibold text-text">故障复盘</h3>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-md text-text-muted hover:text-text hover:bg-bg-alt transition-colors cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex gap-3">
          <span className="shrink-0 text-[0.75rem] font-medium text-danger w-16">
            错误
          </span>
          <span className="text-[0.78rem] text-text">任务执行失败</span>
        </div>
        <div className="flex gap-3">
          <span className="shrink-0 text-[0.75rem] font-medium text-text-secondary w-16">
            根因
          </span>
          <span className="text-[0.78rem] text-text-secondary">
            查看执行控制台获取详细失败信息
          </span>
        </div>
        <div className="flex gap-3">
          <span className="shrink-0 text-[0.75rem] font-medium text-text-secondary w-16 flex items-center gap-1">
            <Lightbulb size={12} className="text-sand" />
            建议
          </span>
          <div className="text-[0.78rem] text-text-secondary">
            <ol className="list-decimal list-inside space-y-1">
              <li>检查执行日志定位失败步骤</li>
              <li>确认模型配置与超时设置</li>
              <li>尝试拆分复杂任务</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-danger/10">
        <button
          onClick={onNavigate}
          className={cn(
            "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg",
            "text-[0.78rem] font-medium bg-primary text-white",
            "hover:bg-primary-hover transition-colors cursor-pointer shadow-sm"
          )}
        >
          <Lightbulb size={13} />
          应用建议
        </button>
        <button
          onClick={onClose}
          className={cn(
            "px-4 py-2 rounded-lg text-[0.78rem] font-medium",
            "text-text-secondary hover:text-text hover:bg-bg-alt",
            "transition-colors cursor-pointer"
          )}
        >
          关闭
        </button>
      </div>
    </div>
  );
}
