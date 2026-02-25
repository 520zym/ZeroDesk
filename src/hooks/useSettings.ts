import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tauriInvoke } from "@/lib/tauri";
import type { SystemSettings } from "@/types";

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => tauriInvoke<SystemSettings>("get_settings"),
    staleTime: Infinity,
  });
}

interface UpdateSettingsPayload {
  theme?: string;
  language?: string;
  encryption?: boolean;
  archive_days?: number;
  task_notify?: boolean;
  fail_notify?: boolean;
  budget_notify?: boolean;
  data_path?: string;
  skillsmp_api_key?: string;
}

export function useDataPath() {
  return useQuery({
    queryKey: ["data_path"],
    queryFn: () => tauriInvoke<string>("get_data_path"),
    staleTime: Infinity,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateSettingsPayload) =>
      tauriInvoke<SystemSettings>("update_settings", { payload }),
    onSuccess: (data) => {
      qc.setQueryData(["settings"], data);
    },
  });
}
