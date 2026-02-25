import { useQuery } from "@tanstack/react-query";
import { tauriInvoke } from "@/lib/tauri";
import type { Skill, MarketplaceSearchResult } from "@/types";

export function useSkills() {
  return useQuery({
    queryKey: ["skills"],
    queryFn: () => tauriInvoke<Skill[]>("list_skills"),
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
