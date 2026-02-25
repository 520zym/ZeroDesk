import { useQuery } from "@tanstack/react-query";
import { tauriInvoke } from "@/lib/tauri";
import type { DashboardKpi, HistoryStats, Task } from "@/types";

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
  status?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["history-tasks", filters],
    queryFn: () =>
      tauriInvoke<Task[]>("list_history_tasks", { ...filters }),
  });
}
