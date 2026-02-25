import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tauriInvoke } from "@/lib/tauri";
import type { KnowledgeFolder, KnowledgeItem } from "@/types";

// ─── Folder queries & mutations ─────────────────────────────

export function useKnowledgeFolders() {
  return useQuery({
    queryKey: ["knowledge-folders"],
    queryFn: () => tauriInvoke<KnowledgeFolder[]>("list_knowledge_folders"),
  });
}

export function useCreateKnowledgeFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { name: string }) =>
      tauriInvoke<KnowledgeFolder>("create_knowledge_folder", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knowledge-folders"] });
    },
  });
}

export function useRenameKnowledgeFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; name: string }) =>
      tauriInvoke<KnowledgeFolder>("rename_knowledge_folder", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knowledge-folders"] });
    },
  });
}

export function useDeleteKnowledgeFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string }) =>
      tauriInvoke<void>("delete_knowledge_folder", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knowledge-folders"] });
      qc.invalidateQueries({ queryKey: ["knowledge-items"] });
    },
  });
}

// ─── Item queries & mutations ───────────────────────────────

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

export function useCreateKnowledgeItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      title: string;
      content?: string;
      folder?: string;
      contentType?: string;
      tagsJson?: string;
      visibility?: string;
    }) => tauriInvoke<KnowledgeItem>("create_knowledge_item", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knowledge-items"] });
    },
  });
}

export function useUpdateKnowledgeItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      id: string;
      title?: string;
      content?: string;
      folder?: string;
      tagsJson?: string;
      visibility?: string;
    }) => tauriInvoke<KnowledgeItem>("update_knowledge_item", params),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["knowledge-items"] });
      qc.invalidateQueries({ queryKey: ["knowledge-item", variables.id] });
    },
  });
}

export function useDeleteKnowledgeItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string }) =>
      tauriInvoke<void>("delete_knowledge_item", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knowledge-items"] });
    },
  });
}

export function useMoveKnowledgeItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; folderId?: string }) =>
      tauriInvoke<KnowledgeItem>("move_knowledge_item", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knowledge-items"] });
    },
  });
}
