import { useQuery } from "@tanstack/react-query";
import { tauriInvoke } from "@/lib/tauri";
import type { Skill } from "@/types";

export function useSkills() {
  return useQuery({
    queryKey: ["skills"],
    queryFn: () => tauriInvoke<Skill[]>("list_skills"),
  });
}
