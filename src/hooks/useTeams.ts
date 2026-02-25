import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tauriInvoke } from "@/lib/tauri";
import type { Team, TeamMember } from "@/types";
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

export function useUpdateTeam() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      id: string;
      name?: string;
      description?: string;
      color?: string;
      sharedSkillsJson?: string;
    }) => tauriInvoke<Team>("update_team", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

export function useDeleteTeam() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string }) =>
      tauriInvoke<void>("delete_team", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
      qc.invalidateQueries({ queryKey: ["team-members"] });
    },
  });
}

export function useAllTeamMembers() {
  return useQuery({
    queryKey: ["all-team-members"],
    queryFn: () => tauriInvoke<TeamMember[]>("list_all_team_members"),
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

export function useAddTeamMember() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: { teamId: string; agentId: string }) =>
      tauriInvoke<void>("add_team_member", params),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["team-members", vars.teamId] });
      qc.invalidateQueries({ queryKey: ["all-team-members"] });
      qc.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

export function useRemoveTeamMember() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: { teamId: string; agentId: string }) =>
      tauriInvoke<void>("remove_team_member", params),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["team-members", vars.teamId] });
      qc.invalidateQueries({ queryKey: ["all-team-members"] });
      qc.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}
