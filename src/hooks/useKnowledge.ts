import { useQuery } from "@tanstack/react-query";
import { tauriInvoke } from "@/lib/tauri";
import type { KnowledgeItem, KnowledgeVersion } from "@/types";

export function useKnowledgeItems(workspaceId: string | null) {
  return useQuery({
    queryKey: ["knowledge-items", workspaceId],
    queryFn: () =>
      tauriInvoke<KnowledgeItem[]>("list_knowledge_items", {
        workspaceId: workspaceId!,
      }),
    enabled: !!workspaceId,
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
