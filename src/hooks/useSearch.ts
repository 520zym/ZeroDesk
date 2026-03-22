import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { tauriInvoke } from "@/lib/tauri";
import type { SearchResponse } from "@/types";

export function useGlobalSearch(query: string, entityTypes?: string[]) {
  return useQuery({
    queryKey: ["global-search", query, entityTypes],
    queryFn: () =>
      tauriInvoke<SearchResponse>("global_search", {
        query,
        entityTypes: entityTypes ?? null,
        limit: 20,
      }),
    enabled: query.trim().length > 0,
    placeholderData: keepPreviousData,
  });
}
