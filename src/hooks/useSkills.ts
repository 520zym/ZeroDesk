import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tauriInvoke } from "@/lib/tauri";
import type { Skill, MarketplaceSearchResult } from "@/types";

export interface ScannedSkill {
  name: string;
  path: string;
  source_tool: string;
  description: string | null;
}

export interface ScanPathInfo {
  tool: string;
  path: string;
  exists: boolean;
  found: number;
}

export interface ScanResult {
  skills: ScannedSkill[];
  scanned_paths: ScanPathInfo[];
}

export function useSkills() {
  return useQuery({
    queryKey: ["skills"],
    queryFn: () => tauriInvoke<Skill[]>("list_skills"),
  });
}

export function useDeleteSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tauriInvoke<void>("delete_skill", { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["skills"] });
    },
  });
}

export function useMarketplaceSearch(
  query: string,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: ["marketplace-skills", query],
    queryFn: () =>
      tauriInvoke<MarketplaceSearchResult>("search_marketplace_skills", {
        query,
      }),
    enabled: enabled && query.trim().length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useInstallMarketplaceSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      name: string;
      description?: string;
      repo?: string;
      category?: string;
    }) => tauriInvoke<Skill>("install_marketplace_skill", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["skills"] });
    },
  });
}

export function useScanExternalSkills() {
  return useMutation({
    mutationFn: () => tauriInvoke<ScanResult>("scan_external_skills"),
  });
}

export function useImportScannedSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      name: string;
      path: string;
      sourceTool: string;
      description?: string;
    }) => tauriInvoke<Skill>("import_scanned_skill", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["skills"] });
    },
  });
}
