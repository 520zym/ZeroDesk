import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tauriInvoke } from "@/lib/tauri";
import type { Task, TaskStats } from "@/types";

export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: () => tauriInvoke<Task[]>("list_tasks"),
  });
}

export function useTaskStats() {
  return useQuery({
    queryKey: ["task-stats"],
    queryFn: () => tauriInvoke<TaskStats>("get_task_stats"),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      title: string;
      description?: string;
      goal?: string;
      costTier?: string;
      planMode?: string;
      timeoutMinutes?: number;
    }) => tauriInvoke<Task>("create_task", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["task-stats"] });
    },
  });
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: { taskId: string; status: string }) =>
      tauriInvoke<Task>("update_task_status", {
        id: params.taskId,
        status: params.status,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["task-stats"] });
    },
  });
}
