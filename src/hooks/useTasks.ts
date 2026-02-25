import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tauriInvoke } from "@/lib/tauri";
import type { Task, TaskStats } from "@/types";

export function useTasks(workspaceId: string | null) {
  return useQuery({
    queryKey: ["tasks", workspaceId],
    queryFn: () =>
      tauriInvoke<Task[]>("list_tasks", { workspaceId: workspaceId! }),
    enabled: !!workspaceId,
  });
}

export function useTaskStats(workspaceId: string | null) {
  return useQuery({
    queryKey: ["task-stats", workspaceId],
    queryFn: () =>
      tauriInvoke<TaskStats>("get_task_stats", { workspaceId: workspaceId! }),
    enabled: !!workspaceId,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (
      payload: Pick<Task, "workspace_id" | "title"> &
        Partial<Pick<Task, "description" | "goal" | "cost_tier" | "plan_mode">>,
    ) => tauriInvoke<Task>("create_task", { payload }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["tasks", variables.workspace_id] });
      qc.invalidateQueries({
        queryKey: ["task-stats", variables.workspace_id],
      });
    },
  });
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      taskId: string;
      status: string;
      workspaceId: string;
    }) =>
      tauriInvoke<Task>("update_task_status", {
        taskId: params.taskId,
        status: params.status,
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["tasks", variables.workspaceId] });
      qc.invalidateQueries({
        queryKey: ["task-stats", variables.workspaceId],
      });
    },
  });
}
