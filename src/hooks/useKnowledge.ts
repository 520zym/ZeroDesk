import { useQuery } from "@tanstack/react-query";
import { tauriInvoke } from "@/lib/tauri";
import type { KnowledgeItem, KnowledgeVersion } from "@/types";

export function useKnowledgeItems() {
  return useQuery({
    queryKey: ["knowledge-items"],
    queryFn: () => tauriInvoke<KnowledgeItem[]>("list_knowledge_items"),
  });
}

export function useKnowledgeItem(id: string | null) {
  return useQuery({
    queryKey: ["knowledge-item", id],
    queryFn: () =>
      tauriInvoke<KnowledgeItem>("get_knowledge_item", { id: id! }),
    enabled: !!id,
  });
}

export function useKnowledgeVersions(itemId: string | null) {
  return useQuery({
    queryKey: ["knowledge-versions", itemId],
    queryFn: () =>
      tauriInvoke<KnowledgeVersion[]>("list_knowledge_versions", {
        itemId: itemId!,
      }),
    enabled: !!itemId,
  });
}
