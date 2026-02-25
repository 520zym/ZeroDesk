import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tauriInvoke } from "@/lib/tauri";
import type {
  ModelProvider,
  Model,
  FallbackChainEntry,
  ResiliencePolicy,
  TestConnectionResult,
} from "@/types";

export function useProviders() {
  return useQuery({
    queryKey: ["providers"],
    queryFn: () => tauriInvoke<ModelProvider[]>("list_providers"),
  });
}

export function useCreateProvider() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      name: string;
      baseUrl: string;
      apiKeyEncrypted?: string;
      iconColor?: string;
    }) => tauriInvoke<ModelProvider>("create_provider", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["providers"] });
      qc.invalidateQueries({ queryKey: ["workspace-models"] });
    },
  });
}

export function useUpdateProvider() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      id: string;
      name?: string;
      baseUrl?: string;
      apiKeyEncrypted?: string;
      iconColor?: string;
      status?: string;
    }) => tauriInvoke<ModelProvider>("update_provider", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["providers"] });
    },
  });
}

export function useDeleteProvider() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string }) =>
      tauriInvoke<void>("delete_provider", { id: params.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["providers"] });
      qc.invalidateQueries({ queryKey: ["workspace-models"] });
    },
  });
}

export function useToggleProviderEnabled() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string; enabled: boolean }) =>
      tauriInvoke<ModelProvider>("toggle_provider_enabled", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["providers"] });
      qc.invalidateQueries({ queryKey: ["workspace-models"] });
    },
  });
}

export function useTestProviderConnection() {
  return useMutation({
    mutationFn: (params: { providerId: string }) =>
      tauriInvoke<TestConnectionResult>("test_provider_connection", params),
  });
}

export function useFetchProviderModels() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: { providerId: string }) =>
      tauriInvoke<Model[]>("fetch_provider_models", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["providers"] });
      qc.invalidateQueries({ queryKey: ["workspace-models"] });
    },
  });
}

export function useToggleModelEnabled() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string; enabled: boolean }) =>
      tauriInvoke<Model>("toggle_model_enabled", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-models"] });
    },
  });
}

export function useBatchToggleModels() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: { ids: string[]; enabled: boolean }) =>
      tauriInvoke<void>("batch_toggle_models", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-models"] });
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

export function useWorkspaceModels() {
  return useQuery({
    queryKey: ["workspace-models"],
    queryFn: () => tauriInvoke<Model[]>("list_workspace_models"),
  });
}

export function useFallbackChain() {
  return useQuery({
    queryKey: ["fallback-chain"],
    queryFn: () => tauriInvoke<FallbackChainEntry[]>("get_fallback_chain"),
  });
}

export function useResiliencePolicy() {
  return useQuery({
    queryKey: ["resilience-policy"],
    queryFn: () => tauriInvoke<ResiliencePolicy>("get_resilience_policy"),
  });
}

export function useUpdateResiliencePolicy() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      retryCount?: number;
      backoffStrategy?: string;
      tokenBudget?: number;
      overBudgetAction?: string;
    }) => tauriInvoke<ResiliencePolicy>("update_resilience_policy", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resilience-policy"] });
    },
  });
}
