import { useQuery } from "@tanstack/react-query";
import { tauriInvoke } from "@/lib/tauri";
import type { DashboardKpi, HistoryStats, Task } from "@/types";

export function useDashboardKpis(workspaceId: string | null) {
  return useQuery({
    queryKey: ["dashboard-kpis", workspaceId],
    queryFn: () =>
      tauriInvoke<DashboardKpi>("get_dashboard_kpis", {
        workspaceId: workspaceId!,
      }),
    enabled: !!workspaceId,
  });
}

export function useHistoryStats(workspaceId: string | null) {
  return useQuery({
    queryKey: ["history-stats", workspaceId],
    queryFn: () =>
      tauriInvoke<HistoryStats[]>("get_history_stats", {
        workspaceId: workspaceId!,
      }),
    enabled: !!workspaceId,
  });
}

export function useHistoryTasks(
  workspaceId: string | null,
  filters?: { status?: string; search?: string },
) {
  return useQuery({
    queryKey: ["history-tasks", workspaceId, filters],
    queryFn: () =>
      tauriInvoke<Task[]>("list_history_tasks", {
        workspaceId: workspaceId!,
        ...filters,
      }),
    enabled: !!workspaceId,
  });
}
