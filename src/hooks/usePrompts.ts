import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

export function useCreatePromptVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      agentId: string;
      content: string;
      note?: string;
    }) => tauriInvoke<PromptVersion>("create_prompt_version", params),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["prompt-versions", variables.agentId] });
    },
  });
}

export function useCreateWorkflowTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      name: string;
      description?: string;
      category?: string;
      iconName?: string;
      iconBg?: string;
      parametersJson?: string;
      stepsJson?: string;
    }) => tauriInvoke<WorkflowTemplate>("create_workflow_template", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflow-templates"] });
    },
  });
}
