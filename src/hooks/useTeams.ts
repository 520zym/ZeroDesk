import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tauriInvoke } from "@/lib/tauri";
import type { Team } from "@/types";
import type { Agent } from "@/types";

export function useTeams() {
  return useQuery({
    queryKey: ["teams"],
    queryFn: () => tauriInvoke<Team[]>("list_teams"),
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      name: string;
      description?: string;
      color?: string;
    }) => tauriInvoke<Team>("create_team", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

export function useTeamMembers(teamId: string | null) {
  return useQuery({
    queryKey: ["team-members", teamId],
    queryFn: () =>
      tauriInvoke<Agent[]>("get_team_members", { teamId: teamId! }),
    enabled: !!teamId,
  });
}
