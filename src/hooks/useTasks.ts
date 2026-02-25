import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tauriInvoke } from "@/lib/tauri";
import type { Task, TaskRun, TaskStats, TaskStep, TaskStepSummary, ExecutionMessage } from "@/types";

export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: () => tauriInvoke<Task[]>("list_tasks"),
  });
}

export function useRunningTasks() {
  return useQuery({
    queryKey: ["tasks", "running"],
    queryFn: () => tauriInvoke<Task[]>("list_running_tasks"),
    refetchInterval: 3000,
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: ["task", id],
    queryFn: () => tauriInvoke<Task>("get_task", { id }),
    enabled: !!id,
    refetchInterval: 3000,
  });
}

export function useTaskStats() {
  return useQuery({
    queryKey: ["task-stats"],
    queryFn: () => tauriInvoke<TaskStats>("get_task_stats"),
  });
}

export function useTaskStepSummaries() {
  return useQuery({
    queryKey: ["task-step-summaries"],
    queryFn: () => tauriInvoke<TaskStepSummary[]>("list_task_step_summaries"),
  });
}

export function useLatestTaskRuns() {
  return useQuery({
    queryKey: ["latest-task-runs"],
    queryFn: () => tauriInvoke<TaskRun[]>("list_all_latest_task_runs"),
    refetchInterval: 5000,
  });
}

export function useTaskRuns(taskId: string | undefined) {
  return useQuery({
    queryKey: ["task-runs", taskId],
    queryFn: () => tauriInvoke<TaskRun[]>("list_task_runs", { taskId }),
    enabled: !!taskId,
    refetchInterval: 5000,
  });
}

export function useTaskSteps(taskId: string | undefined, runId?: string | null) {
  return useQuery({
    queryKey: ["task-steps", taskId, runId ?? "all"],
    queryFn: () =>
      tauriInvoke<TaskStep[]>("list_task_steps", {
        taskId,
        ...(runId ? { runId } : {}),
      }),
    enabled: !!taskId,
    refetchInterval: 3000,
  });
}

export function useExecutionMessages(
  taskId: string | undefined,
  options?: { refetchInterval?: number; runId?: string | null },
) {
  const runId = options?.runId;
  return useQuery({
    queryKey: ["execution-messages", taskId, runId ?? "all"],
    queryFn: () =>
      tauriInvoke<ExecutionMessage[]>("list_execution_messages", {
        taskId,
        ...(runId ? { runId } : {}),
      }),
    enabled: !!taskId,
    refetchInterval: options?.refetchInterval ?? 2000,
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
      qualityGate?: string;
      retryPolicy?: string;
      overBudgetPolicy?: string;
      teamId?: string;
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
      qc.invalidateQueries({ queryKey: ["task"] });
      qc.invalidateQueries({ queryKey: ["history-tasks"] });
      qc.invalidateQueries({ queryKey: ["history-stats"] });
    },
  });
}

export function useCreateExecutionMessage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      taskId: string;
      senderType: string;
      senderId?: string;
      senderName?: string;
      content: string;
      contentType?: string;
      metadataJson?: string;
    }) => tauriInvoke<ExecutionMessage>("create_execution_message", params),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["execution-messages", variables.taskId],
      });
    },
  });
}

export function useUpdateTaskStepStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      id: string;
      status: string;
      tokensUsed?: number;
      durationSeconds?: number;
    }) => tauriInvoke<TaskStep>("update_task_step_status", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-steps"] });
    },
  });
}

export function useCreateTaskStep() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      taskId: string;
      stepOrder: number;
      name: string;
      description?: string;
      agentId?: string;
      outputTarget?: string;
    }) => tauriInvoke<TaskStep>("create_task_step", params),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["task-steps", variables.taskId] });
    },
  });
}

export function useUpdateTaskStep() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      id: string;
      name?: string;
      description?: string;
      agentId?: string;
      outputTarget?: string;
      stepOrder?: number;
    }) => tauriInvoke<TaskStep>("update_task_step", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-steps"] });
    },
  });
}

export function useDeleteTaskStep() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tauriInvoke<void>("delete_task_step", { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-steps"] });
    },
  });
}

export function useReorderTaskSteps() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (stepIds: string[]) =>
      tauriInvoke<void>("reorder_task_steps", { stepIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-steps"] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tauriInvoke<void>("delete_task", { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["task-stats"] });
      qc.invalidateQueries({ queryKey: ["history-tasks"] });
      qc.invalidateQueries({ queryKey: ["history-stats"] });
    },
  });
}

export function useInitializeTaskFromTeam() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: { taskId: string; teamId: string }) =>
      tauriInvoke<TaskStep[]>("initialize_task_from_team", params),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["task-steps", variables.taskId] });
      qc.invalidateQueries({ queryKey: ["task", variables.taskId] });
      qc.invalidateQueries({ queryKey: ["agents"] });
      qc.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

export function useStartTaskExecution() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: { taskId: string }) =>
      tauriInvoke<void>("start_task_execution", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["task-stats"] });
      qc.invalidateQueries({ queryKey: ["task"] });
      qc.invalidateQueries({ queryKey: ["tasks", "running"] });
      qc.invalidateQueries({ queryKey: ["task-runs"] });
    },
  });
}

export function useRerunTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: { taskId: string }) =>
      tauriInvoke<TaskRun>("rerun_task", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["task-stats"] });
      qc.invalidateQueries({ queryKey: ["task"] });
      qc.invalidateQueries({ queryKey: ["tasks", "running"] });
      qc.invalidateQueries({ queryKey: ["task-runs"] });
      qc.invalidateQueries({ queryKey: ["task-steps"] });
      qc.invalidateQueries({ queryKey: ["execution-messages"] });
      qc.invalidateQueries({ queryKey: ["history-tasks"] });
      qc.invalidateQueries({ queryKey: ["history-stats"] });
    },
  });
}

export function useSmartPlanTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: { taskId: string }) =>
      tauriInvoke<TaskStep[]>("smart_plan_task", params),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["task-steps", variables.taskId] });
      qc.invalidateQueries({ queryKey: ["task", variables.taskId] });
      qc.invalidateQueries({ queryKey: ["agents"] });
      qc.invalidateQueries({ queryKey: ["teams"] });
      qc.invalidateQueries({ queryKey: ["all-team-members"] });
    },
  });
}
