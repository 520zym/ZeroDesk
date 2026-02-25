import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tauriInvoke } from "@/lib/tauri";
import type { Team, TeamPlan } from "@/types";

export function useSmartPlanTeam() {
  return useMutation({
    mutationFn: (params: { userInput: string }) =>
      tauriInvoke<TeamPlan>("smart_plan_team", params),
  });
}

export function useExecuteTeamPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { plan: TeamPlan }) =>
      tauriInvoke<Team>("execute_team_plan", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
      qc.invalidateQueries({ queryKey: ["agents"] });
      qc.invalidateQueries({ queryKey: ["all-team-members"] });
    },
  });
}
