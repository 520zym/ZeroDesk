import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tauriInvoke } from "@/lib/tauri";
import type { Team, TeamMember } from "@/types";

export function useTeams(workspaceId: string | null) {
  return useQuery({
    queryKey: ["teams", workspaceId],
    queryFn: () =>
      tauriInvoke<Team[]>("list_teams", { workspaceId: workspaceId! }),
    enabled: !!workspaceId,
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (
      payload: Pick<Team, "workspace_id" | "name"> &
        Partial<Pick<Team, "description" | "strategy">>,
    ) => tauriInvoke<Team>("create_team", { payload }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["teams", variables.workspace_id] });
    },
  });
}

export function useTeamMembers(teamId: string | null) {
  return useQuery({
    queryKey: ["team-members", teamId],
    queryFn: () =>
      tauriInvoke<TeamMember[]>("list_team_members", { teamId: teamId! }),
    enabled: !!teamId,
  });
}
