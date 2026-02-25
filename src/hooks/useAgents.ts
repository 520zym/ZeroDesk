import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tauriInvoke } from "@/lib/tauri";
import type { Agent } from "@/types";

export function useAgents(workspaceId: string | null) {
  return useQuery({
    queryKey: ["agents", workspaceId],
    queryFn: () =>
      tauriInvoke<Agent[]>("list_agents", { workspaceId: workspaceId! }),
    enabled: !!workspaceId,
  });
}

export function useCreateAgent() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (
      payload: Pick<Agent, "workspace_id" | "name" | "role"> &
        Partial<
          Pick<Agent, "system_prompt" | "model_id" | "temperature" | "max_tokens">
        >,
    ) => tauriInvoke<Agent>("create_agent", { payload }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["agents", variables.workspace_id] });
    },
  });
}

export function useUpdateAgent() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      agentId: string;
      workspaceId: string;
      payload: Partial<
        Pick<
          Agent,
          | "name"
          | "role"
          | "system_prompt"
          | "model_id"
          | "temperature"
          | "max_tokens"
          | "enabled"
        >
      >;
    }) =>
      tauriInvoke<Agent>("update_agent", {
        agentId: params.agentId,
        payload: params.payload,
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["agents", variables.workspaceId] });
    },
  });
}

export function useDeleteAgent() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: { agentId: string; workspaceId: string }) =>
      tauriInvoke<void>("delete_agent", { agentId: params.agentId }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["agents", variables.workspaceId] });
    },
  });
}
