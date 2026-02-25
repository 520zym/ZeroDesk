import { useQuery } from "@tanstack/react-query";
import { tauriInvoke } from "@/lib/tauri";
import type {
  DashboardKpi,
  HistoryStats,
  Task,
  DailyTaskCount,
  AgentUsageRank,
  CostDistributionEntry,
  DurationBucket,
} from "@/types";

export function useDashboardKpis() {
  return useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: () => tauriInvoke<DashboardKpi>("get_dashboard_kpis"),
  });
}

export function useHistoryStats() {
  return useQuery({
    queryKey: ["history-stats"],
    queryFn: () => tauriInvoke<HistoryStats>("get_history_stats"),
  });
}

export function useHistoryTasks(filters?: {
  statusFilter?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["history-tasks", filters],
    queryFn: () => tauriInvoke<Task[]>("list_history_tasks", { ...filters }),
  });
}

export function useWeeklyTaskTrend() {
  return useQuery({
    queryKey: ["weekly-task-trend"],
    queryFn: () => tauriInvoke<DailyTaskCount[]>("get_weekly_task_trend"),
  });
}

export function useAgentUsageRanking() {
  return useQuery({
    queryKey: ["agent-usage-ranking"],
    queryFn: () => tauriInvoke<AgentUsageRank[]>("get_agent_usage_ranking"),
  });
}

export function useCostDistribution() {
  return useQuery({
    queryKey: ["cost-distribution"],
    queryFn: () =>
      tauriInvoke<CostDistributionEntry[]>("get_cost_distribution"),
  });
}

export function useTaskDurationDistribution() {
  return useQuery({
    queryKey: ["task-duration-distribution"],
    queryFn: () =>
      tauriInvoke<DurationBucket[]>("get_task_duration_distribution"),
  });
}
