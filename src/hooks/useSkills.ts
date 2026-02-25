import { useQuery } from "@tanstack/react-query";
import { tauriInvoke } from "@/lib/tauri";
import type { Skill } from "@/types";

export function useSkills(workspaceId: string | null) {
  return useQuery({
    queryKey: ["skills", workspaceId],
    queryFn: () =>
      tauriInvoke<Skill[]>("list_skills", { workspaceId: workspaceId! }),
    enabled: !!workspaceId,
  });
}
