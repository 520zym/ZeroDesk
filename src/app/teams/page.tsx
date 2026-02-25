import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Users,
  CheckCircle2,
  Cpu,
  Loader2,
  UserPlus,
  UserMinus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, Modal } from "@/components/ui";
import {
  useTeams,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  useTeamMembers,
  useAllTeamMembers,
  useAddTeamMember,
  useRemoveTeamMember,
} from "@/hooks/useTeams";
import { useAgents } from "@/hooks/useAgents";
import type { Team, Agent } from "@/types";

const COLOR_OPTIONS = ["primary", "sage", "coral", "lavender", "sand"] as const;

const colorBorderMap: Record<string, string> = {
  primary: "border-l-primary",
  sage: "border-l-sage",
  coral: "border-l-coral",
  lavender: "border-l-lavender",
  sand: "border-l-sand",
};

const colorDotMap: Record<string, string> = {
  primary: "bg-primary",
  sage: "bg-sage",
  coral: "bg-coral",
  lavender: "bg-lavender",
  sand: "bg-sand",
};

const variantMap: Record<string, string> = {
  primary: "bg-primary-light text-primary-active",
  sage: "bg-sage-light text-[#5a7a6b]",
  coral: "bg-coral-light text-[#9a7058]",
  lavender: "bg-lavender-light text-[#6f5f80]",
  sand: "bg-sand-light text-[#8a7b55]",
};

function parseSharedSkills(json: string | null): string[] {
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

function skillVariant(index: number): string {
  const keys = Object.keys(variantMap);
  return keys[index % keys.length];
}

function formatStats(taskCount: number | null, successRate: number | null): string {
  const tc = taskCount ?? 0;
  const sr = successRate ?? 0;
  return `${tc} 次任务 · ${Math.round(sr * 100)}% 成功率`;
}

function agentChar(agent: Agent): string {
  return agent.avatar_char || agent.name.charAt(0);
}

function agentColor(agent: Agent): string {
  return agent.avatar_color || "bg-primary";
}

export default function TeamsPage() {
  const { data: teams = [], isLoading, error } = useTeams();
  const { data: agents = [] } = useAgents();
  const { data: allMemberships = [] } = useAllTeamMembers();

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const { data: selectedMembers = [] } = useTeamMembers(selectedTeamId);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState("primary");
  const [pickedAgentIds, setPickedAgentIds] = useState<Set<string>>(new Set());

  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editColor, setEditColor] = useState("primary");

  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();
  const addMember = useAddTeamMember();
  const removeMember = useRemoveTeamMember();

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) ?? null;

  const agentMap = new Map(agents.map((a) => [a.id, a]));

  const teamAgentsMap = new Map<string, Agent[]>();
  for (const m of allMemberships) {
    const agent = agentMap.get(m.agent_id);
    if (!agent) continue;
    const list = teamAgentsMap.get(m.team_id) ?? [];
    list.push(agent);
    teamAgentsMap.set(m.team_id, list);
  }

  const selectedMemberIds = new Set(selectedMembers.map((a) => a.id));
  const availableAgents = agents.filter((a) => !selectedMemberIds.has(a.id));

  function toggleAgentPick(id: string) {
    setPickedAgentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function resetCreateForm() {
    setNewName("");
    setNewDesc("");
    setNewColor("primary");
    setPickedAgentIds(new Set());
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      const team = await createTeam.mutateAsync({
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        color: newColor,
      });
      const picks = Array.from(pickedAgentIds);
      for (const agentId of picks) {
        await addMember.mutateAsync({ teamId: team.id, agentId });
      }
      resetCreateForm();
      setCreateOpen(false);
    } catch {
      /* handled by RQ */
    }
  }

  function openEdit(team: Team, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingTeam(team);
    setEditName(team.name);
    setEditDesc(team.description ?? "");
    setEditColor(team.color ?? "primary");
    setEditOpen(true);
  }

  async function handleEdit() {
    if (!editingTeam || !editName.trim()) return;
    try {
      await updateTeam.mutateAsync({
        id: editingTeam.id,
        name: editName.trim(),
        description: editDesc.trim() || undefined,
        color: editColor,
      });
      setEditOpen(false);
      setEditingTeam(null);
    } catch {
      /* handled */
    }
  }

  async function handleDelete(teamId: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await deleteTeam.mutateAsync({ id: teamId });
      if (selectedTeamId === teamId) setSelectedTeamId(null);
    } catch {
      /* handled */
    }
  }

  async function handleAddMember(agentId: string) {
    if (!selectedTeamId) return;
    await addMember.mutateAsync({ teamId: selectedTeamId, agentId });
  }

  async function handleRemoveMember(agentId: string) {
    if (!selectedTeamId) return;
    await removeMember.mutateAsync({ teamId: selectedTeamId, agentId });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="shrink-0 px-4 sm:px-6 pt-5 pb-4"
        style={{ animation: "fade-in 0.3s ease-out" }}
      >
        <div className="flex items-center justify-between">
          <p className="text-[0.82rem] text-text-secondary">
            组织多个 Agent 为协作团队，定义分配与协作策略
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                resetCreateForm();
                setCreateOpen(true);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg",
                "bg-primary text-white text-[0.8rem] font-medium",
                "hover:bg-primary-hover active:bg-primary-active",
                "transition-colors cursor-pointer shadow-sm",
              )}
            >
              <Plus size={15} strokeWidth={2.2} />
              组建新团队
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-2 pb-6 space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={28} className="text-text-muted animate-spin" />
            <span className="text-[0.82rem] text-text-muted">加载中…</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="text-[0.82rem] text-danger">
              加载失败：{String(error)}
            </span>
          </div>
        ) : teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-bg-alt flex items-center justify-center">
              <Users size={32} className="text-text-muted" />
            </div>
            <div className="text-center">
              <p className="text-[0.92rem] font-medium text-text mb-1">
                还没有团队
              </p>
              <p className="text-[0.78rem] text-text-muted">
                点击「组建新团队」来创建你的第一个协作团队
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Team Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {teams.map((team, i) => {
                const members = teamAgentsMap.get(team.id) ?? [];
                const skills = parseSharedSkills(team.shared_skills_json);
                const borderClass =
                  colorBorderMap[team.color ?? "primary"] ??
                  "border-l-primary";

                return (
                  <button
                    key={team.id}
                    onClick={() =>
                      setSelectedTeamId(
                        selectedTeamId === team.id ? null : team.id,
                      )
                    }
                    className={cn(
                      "group relative flex flex-col text-left rounded-xl border bg-surface overflow-hidden",
                      "transition-all duration-200 cursor-pointer",
                      selectedTeamId === team.id
                        ? "border-primary shadow-card-hover"
                        : "border-border-light hover:border-primary hover:shadow-card-hover hover:-translate-y-0.5",
                    )}
                    style={{
                      animation: `fade-in 0.35s ease-out ${i * 80}ms both`,
                    }}
                  >
                    <div
                      className={cn(
                        "flex flex-col p-5 border-l-[3px]",
                        borderClass,
                      )}
                    >
                      {/* Head */}
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[0.9rem] font-semibold text-text">
                          {team.name}
                        </h3>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.68rem] font-medium bg-bg-alt text-text-secondary group-hover:hidden">
                          <Users size={11} />
                          {members.length} 个 Agent
                        </span>
                        <div className="hidden group-hover:flex items-center gap-1">
                          <span
                            title="编辑"
                            onClick={(e) => openEdit(team, e)}
                            className="w-7 h-7 inline-flex items-center justify-center rounded-md text-text-muted hover:text-text hover:bg-bg-alt transition-colors"
                          >
                            <Pencil size={13} />
                          </span>
                          <span
                            title="删除"
                            onClick={(e) => handleDelete(team.id, e)}
                            className="w-7 h-7 inline-flex items-center justify-center rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                          >
                            <Trash2 size={13} />
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-[0.76rem] text-text-muted mb-4 line-clamp-2">
                        {team.description || "暂无描述"}
                      </p>

                      {/* Members */}
                      {members.length > 0 && (
                        <div className="flex items-center gap-3 mb-4">
                          {members.slice(0, 5).map((m) => (
                            <div
                              key={m.id}
                              className="flex flex-col items-center gap-1"
                            >
                              <Avatar
                                char={agentChar(m)}
                                color={agentColor(m)}
                                size="md"
                              />
                              <span className="text-[0.65rem] text-text-muted truncate max-w-[60px]">
                                {m.name}
                              </span>
                            </div>
                          ))}
                          {members.length > 5 && (
                            <span className="text-[0.68rem] text-text-muted">
                              +{members.length - 5}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Stats + Skills */}
                      <div className="flex items-center justify-between pt-3 border-t border-border-light">
                        <span className="text-[0.72rem] text-text-muted flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          {formatStats(team.task_count, team.success_rate)}
                        </span>
                        <div className="flex items-center gap-1">
                          {skills.map((s, si) => (
                            <span
                              key={s}
                              className={cn(
                                "px-2 py-0.5 rounded-full text-[0.65rem] font-medium",
                                variantMap[skillVariant(si)] ??
                                  "bg-bg-alt text-text-secondary",
                              )}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Team Builder Section */}
            {selectedTeam && (
              <div
                className="rounded-xl border border-primary/20 bg-primary-light/40 p-6"
                style={{ animation: "fade-in-up 0.3s ease-out" }}
              >
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-[0.95rem] font-semibold text-text">
                    {selectedTeam.name}
                  </h2>
                  <button
                    onClick={() => setSelectedTeamId(null)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text hover:bg-surface transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
                <p className="text-[0.78rem] text-text-secondary mb-5">
                  {selectedTeam.description || "暂无描述"}
                </p>

                {/* Team Members */}
                <div className="mb-5">
                  <h3 className="text-[0.78rem] font-medium text-text mb-3">
                    团队成员
                  </h3>
                  <div className="flex items-start gap-3 flex-wrap">
                    {selectedMembers.map((m) => (
                      <div
                        key={m.id}
                        className="group/member relative flex flex-col items-center gap-1.5 p-3 rounded-xl bg-surface border border-border-light min-w-[88px]"
                      >
                        <Avatar
                          char={agentChar(m)}
                          color={agentColor(m)}
                          size="lg"
                        />
                        <span className="text-[0.75rem] font-medium text-text truncate max-w-[72px]">
                          {m.name}
                        </span>
                        <span className="flex items-center gap-1 text-[0.65rem] text-text-muted">
                          <Cpu size={10} />
                          {m.model_id ? "已配置" : "未指定"}
                        </span>
                        <button
                          onClick={() => handleRemoveMember(m.id)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger text-white flex items-center justify-center opacity-0 group-hover/member:opacity-100 transition-opacity cursor-pointer"
                          title="移除成员"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setAddMemberOpen(true)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl min-w-[88px] min-h-[100px]",
                        "border-2 border-dashed border-border-light",
                        "text-text-muted hover:text-primary hover:border-primary/40",
                        "transition-colors cursor-pointer",
                      )}
                    >
                      <Plus size={18} />
                      <span className="text-[0.7rem] font-medium">
                        添加 Agent
                      </span>
                    </button>
                  </div>
                </div>

                {/* Shared Skills */}
                <div className="mb-5">
                  <h3 className="text-[0.78rem] font-medium text-text mb-2">
                    共享 Skills
                  </h3>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {parseSharedSkills(selectedTeam.shared_skills_json).map(
                      (s, si) => (
                        <span
                          key={s}
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-medium",
                            variantMap[skillVariant(si)] ??
                              "bg-bg-alt text-text-secondary",
                          )}
                        >
                          {s}
                        </span>
                      ),
                    )}
                    {parseSharedSkills(selectedTeam.shared_skills_json)
                      .length === 0 && (
                      <span className="text-[0.72rem] text-text-muted">
                        暂无共享 Skills
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-primary/10">
                  <button
                    onClick={() => setSelectedTeamId(null)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[0.8rem] font-medium",
                      "text-text-secondary hover:text-text hover:bg-surface",
                      "transition-colors cursor-pointer",
                    )}
                  >
                    关闭
                  </button>
                  <button
                    onClick={(e) => openEdit(selectedTeam, e)}
                    className={cn(
                      "px-5 py-2 rounded-lg text-[0.8rem] font-medium",
                      "bg-primary text-white",
                      "hover:bg-primary-hover active:bg-primary-active",
                      "transition-colors cursor-pointer shadow-sm",
                    )}
                  >
                    编辑团队
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Team Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="组建新团队"
        width="520px"
      >
        <div className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-[0.78rem] font-medium text-text mb-1.5">
              团队名称
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="如：竞品分析小队"
              className={cn(
                "w-full rounded-lg border border-border-light bg-bg px-3 py-2",
                "text-[0.8rem] text-text placeholder:text-text-muted",
                "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20",
                "transition-colors",
              )}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[0.78rem] font-medium text-text mb-1.5">
              团队描述
            </label>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={3}
              placeholder="描述团队的目标与协作方式…"
              className={cn(
                "w-full rounded-lg border border-border-light bg-bg px-3 py-2.5",
                "text-[0.78rem] text-text leading-relaxed resize-none placeholder:text-text-muted",
                "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20",
                "transition-colors",
              )}
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-[0.78rem] font-medium text-text mb-2">
              主题色
            </label>
            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all cursor-pointer",
                    colorDotMap[c],
                    newColor === c
                      ? "ring-2 ring-offset-2 ring-primary scale-110"
                      : "opacity-60 hover:opacity-100",
                  )}
                />
              ))}
            </div>
          </div>

          {/* Agent Picker */}
          <div>
            <label className="block text-[0.78rem] font-medium text-text mb-2">
              选择 Agent 成员
            </label>
            {agents.length === 0 ? (
              <p className="text-[0.76rem] text-text-muted">
                暂无可用 Agent，请先在 Agent 管理页面创建
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {agents.map((agent) => {
                  const selected = pickedAgentIds.has(agent.id);
                  return (
                    <button
                      key={agent.id}
                      onClick={() => toggleAgentPick(agent.id)}
                      className={cn(
                        "inline-flex items-center gap-2 px-3 py-2 rounded-lg border",
                        "text-[0.78rem] font-medium transition-all cursor-pointer",
                        selected
                          ? "border-primary bg-primary-light text-primary-active"
                          : "border-border-light bg-surface text-text-secondary hover:border-primary/40 hover:bg-primary-light/30",
                      )}
                    >
                      <Avatar
                        char={agentChar(agent)}
                        color={agentColor(agent)}
                        size="xs"
                      />
                      {agent.name}
                      {selected && (
                        <CheckCircle2 size={14} className="text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              onClick={() => setCreateOpen(false)}
              className={cn(
                "px-4 py-2 rounded-lg text-[0.8rem] font-medium",
                "text-text-secondary hover:text-text hover:bg-bg-alt",
                "transition-colors cursor-pointer",
              )}
            >
              取消
            </button>
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || createTeam.isPending}
              className={cn(
                "px-5 py-2 rounded-lg text-[0.8rem] font-medium",
                "bg-primary text-white",
                "hover:bg-primary-hover active:bg-primary-active",
                "transition-colors cursor-pointer shadow-sm",
                (!newName.trim() || createTeam.isPending) &&
                  "opacity-50 cursor-not-allowed",
              )}
            >
              {createTeam.isPending ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 size={14} className="animate-spin" />
                  创建中…
                </span>
              ) : (
                "创建团队"
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Team Modal */}
      <Modal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditingTeam(null);
        }}
        title="编辑团队"
        width="520px"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-[0.78rem] font-medium text-text mb-1.5">
              团队名称
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className={cn(
                "w-full rounded-lg border border-border-light bg-bg px-3 py-2",
                "text-[0.8rem] text-text placeholder:text-text-muted",
                "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20",
                "transition-colors",
              )}
            />
          </div>

          <div>
            <label className="block text-[0.78rem] font-medium text-text mb-1.5">
              团队描述
            </label>
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={3}
              className={cn(
                "w-full rounded-lg border border-border-light bg-bg px-3 py-2.5",
                "text-[0.78rem] text-text leading-relaxed resize-none placeholder:text-text-muted",
                "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20",
                "transition-colors",
              )}
            />
          </div>

          <div>
            <label className="block text-[0.78rem] font-medium text-text mb-2">
              主题色
            </label>
            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setEditColor(c)}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all cursor-pointer",
                    colorDotMap[c],
                    editColor === c
                      ? "ring-2 ring-offset-2 ring-primary scale-110"
                      : "opacity-60 hover:opacity-100",
                  )}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              onClick={() => {
                setEditOpen(false);
                setEditingTeam(null);
              }}
              className={cn(
                "px-4 py-2 rounded-lg text-[0.8rem] font-medium",
                "text-text-secondary hover:text-text hover:bg-bg-alt",
                "transition-colors cursor-pointer",
              )}
            >
              取消
            </button>
            <button
              onClick={handleEdit}
              disabled={!editName.trim() || updateTeam.isPending}
              className={cn(
                "px-5 py-2 rounded-lg text-[0.8rem] font-medium",
                "bg-primary text-white",
                "hover:bg-primary-hover active:bg-primary-active",
                "transition-colors cursor-pointer shadow-sm",
                (!editName.trim() || updateTeam.isPending) &&
                  "opacity-50 cursor-not-allowed",
              )}
            >
              {updateTeam.isPending ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 size={14} className="animate-spin" />
                  保存中…
                </span>
              ) : (
                "保存修改"
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Member Modal */}
      <Modal
        open={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        title="添加团队成员"
        width="480px"
      >
        <div className="space-y-4">
          {availableAgents.length === 0 ? (
            <p className="text-[0.78rem] text-text-muted text-center py-6">
              {agents.length === 0
                ? "暂无可用 Agent，请先创建"
                : "所有 Agent 均已加入该团队"}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={async () => {
                    await handleAddMember(agent.id);
                  }}
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border",
                    "border-border-light bg-surface text-text-secondary",
                    "text-[0.78rem] font-medium transition-all cursor-pointer",
                    "hover:border-primary/40 hover:bg-primary-light/30 hover:text-text",
                  )}
                >
                  <Avatar
                    char={agentChar(agent)}
                    color={agentColor(agent)}
                    size="xs"
                  />
                  {agent.name}
                  <UserPlus size={14} className="text-text-muted" />
                </button>
              ))}
            </div>
          )}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => setAddMemberOpen(false)}
              className={cn(
                "px-4 py-2 rounded-lg text-[0.8rem] font-medium",
                "text-text-secondary hover:text-text hover:bg-bg-alt",
                "transition-colors cursor-pointer",
              )}
            >
              关闭
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
