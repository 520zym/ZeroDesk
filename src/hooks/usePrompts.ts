import { useQuery } from "@tanstack/react-query";
import { tauriInvoke } from "@/lib/tauri";
import type { PromptVersion, WorkflowTemplate } from "@/types";

export function usePromptVersions(agentId: string | null) {
  return useQuery({
    queryKey: ["prompt-versions", agentId],
    queryFn: () =>
      tauriInvoke<PromptVersion[]>("list_prompt_versions", {
        agentId: agentId!,
      }),
    enabled: !!agentId,
  });
}

export function useWorkflowTemplates() {
  return useQuery({
    queryKey: ["workflow-templates"],
    queryFn: () =>
      tauriInvoke<WorkflowTemplate[]>("list_workflow_templates"),
  });
}
