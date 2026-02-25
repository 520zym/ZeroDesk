import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tauriInvoke } from "@/lib/tauri";
import type {
  ModelProvider,
  Model,
  FallbackChainEntry,
  ResiliencePolicy,
} from "@/types";

export function useProviders(workspaceId: string | null) {
  return useQuery({
    queryKey: ["providers", workspaceId],
    queryFn: () =>
      tauriInvoke<ModelProvider[]>("list_providers", {
        workspaceId: workspaceId!,
      }),
    enabled: !!workspaceId,
  });
}

export function useCreateProvider() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (
      payload: Pick<
        ModelProvider,
        "workspace_id" | "name" | "provider_type" | "base_url"
      > &
        Partial<Pick<ModelProvider, "api_key_encrypted" | "enabled">>,
    ) => tauriInvoke<ModelProvider>("create_provider", { payload }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["providers", variables.workspace_id],
      });
    },
  });
}

export function useModels(providerId: string | null) {
  return useQuery({
    queryKey: ["models", providerId],
    queryFn: () =>
      tauriInvoke<Model[]>("list_models", { providerId: providerId! }),
    enabled: !!providerId,
  });
}

export function useFallbackChain(workspaceId: string | null) {
  return useQuery({
    queryKey: ["fallback-chain", workspaceId],
    queryFn: () =>
      tauriInvoke<FallbackChainEntry[]>("get_fallback_chain", {
        workspaceId: workspaceId!,
      }),
    enabled: !!workspaceId,
  });
}

export function useResiliencePolicy(workspaceId: string | null) {
  return useQuery({
    queryKey: ["resilience-policy", workspaceId],
    queryFn: () =>
      tauriInvoke<ResiliencePolicy>("get_resilience_policy", {
        workspaceId: workspaceId!,
      }),
    enabled: !!workspaceId,
  });
}
