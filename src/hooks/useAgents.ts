import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tauriInvoke } from "@/lib/tauri";
import type { Agent } from "@/types";

export function useAgents() {
  return useQuery({
    queryKey: ["agents"],
    queryFn: () => tauriInvoke<Agent[]>("list_agents"),
  });
}

export function useCreateAgent() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      name: string;
      avatarChar?: string;
      avatarColor?: string;
      roleDescription?: string;
      systemPrompt?: string;
      modelId?: string;
      fallbackModelId?: string;
      toolsJson?: string;
      skillsJson?: string;
      isTemplate?: boolean;
    }) => tauriInvoke<Agent>("create_agent", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents"] });
    },
  });
}

export function useUpdateAgent() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      id: string;
      name?: string;
      avatarChar?: string;
      avatarColor?: string;
      roleDescription?: string;
      systemPrompt?: string;
      modelId?: string;
      fallbackModelId?: string;
      toolsJson?: string;
      skillsJson?: string;
    }) => tauriInvoke<Agent>("update_agent", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents"] });
    },
  });
}

export function useDeleteAgent() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string }) =>
      tauriInvoke<void>("delete_agent", { id: params.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents"] });
    },
  });
}

export function useOptimizePrompt() {
  return useMutation({
    mutationFn: (params: {
      agentName: string;
      roleDescription: string;
      currentPrompt: string;
    }) => tauriInvoke<string>("optimize_prompt", params),
  });
}
