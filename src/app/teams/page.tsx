import { useState } from "react";
import {
  Plus,
  Copy,
  Pencil,
  X,
  Users,
  CheckCircle2,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, Modal } from "@/components/ui";

interface TeamMember {
  char: string;
  color: string;
  name: string;
}

interface SkillTag {
  name: string;
  variant: string;
}

interface Team {
  id: string;
  name: string;
  color: string;
  desc: string;
  agents: number;
  members: TeamMember[];
  stats: string;
  skills: SkillTag[];
}

const variantMap: Record<string, string> = {
  primary: "bg-primary-light text-primary-active",
  sage: "bg-sage-light text-[#5a7a6b]",
  coral: "bg-coral-light text-[#9a7058]",
  lavender: "bg-lavender-light text-[#6f5f80]",
  sand: "bg-sand-light text-[#8a7b55]",
};

const mockTeams: Team[] = [
  {
    id: "t1",
    name: "竞品分析小队",
    color: "border-l-primary",
    desc: "负责竞品信息收集、分析对比与报告输出",
    agents: 3,
    members: [
      { char: "检", color: "bg-primary", name: "检索员" },
      { char: "析", color: "bg-sage", name: "分析师" },
      { char: "审", color: "bg-coral", name: "审核员" },
    ],
    stats: "5 次任务 · 89% 成功率",
    skills: [
      { name: "网页检索", variant: "sage" },
      { name: "报告生成", variant: "coral" },
    ],
  },
  {
    id: "t2",
    name: "数据报表组",
    color: "border-l-sage",
    desc: "从多数据源拉取指标，汇总生成可视化运营周报",
    agents: 2,
    members: [
      { char: "拉", color: "bg-lavender", name: "数据拉取" },
      { char: "汇", color: "bg-sand", name: "报表汇总" },
    ],
    stats: "3 次任务 · 100% 成功率",
    skills: [{ name: "数据可视化", variant: "primary" }],
  },
  {
    id: "t3",
    name: "技术评审团",
    color: "border-l-lavender",
    desc: "对技术方案进行多角度评估，输出结构化评审意见",
    agents: 3,
    members: [
      { char: "评", color: "bg-danger", name: "评估员" },
      { char: "审", color: "bg-lavender", name: "审核员" },
      { char: "码", color: "bg-primary-active", name: "代码审查" },
    ],
    stats: "2 次任务 · 50% 成功率",
    skills: [{ name: "代码分析", variant: "lavender" }],
  },
];

const allAgents = [
  { char: "检", color: "bg-primary", name: "信息检索员" },
  { char: "析", color: "bg-sage", name: "深度分析师" },
  { char: "撰", color: "bg-coral", name: "文案撰写员" },
  { char: "审", color: "bg-lavender", name: "质量审查员" },
  { char: "洗", color: "bg-sand", name: "数据清洗员" },
  { char: "码", color: "bg-[#6A8D99]", name: "代码评审员" },
];

export default function TeamsPage() {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [pickedAgents, setPickedAgents] = useState<Set<string>>(new Set());

  function toggleAgent(name: string) {
    setPickedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="shrink-0 px-4 sm:px-6 pt-5 pb-4"
        style={{ animation: "fade-in 0.3s ease-out" }}
      >
        <div className="flex items-center justify-between">
          <p className="text-[0.82rem] text-text-secondary">组织多个 Agent 为协作团队，定义分配与协作策略</p>
          <div className="flex items-center gap-2">
            <button
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg",
                "border border-border-light text-text-secondary text-[0.8rem] font-medium",
                "hover:bg-bg-alt hover:text-text transition-colors cursor-pointer"
              )}
            >
              从模板创建
            </button>
            <button
              onClick={() => setCreateOpen(true)}
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg",
                "bg-primary text-white text-[0.8rem] font-medium",
                "hover:bg-primary-hover active:bg-primary-active",
                "transition-colors cursor-pointer shadow-sm"
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
        {/* Team Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {mockTeams.map((team, i) => (
            <button
              key={team.id}
              onClick={() => setSelectedTeam(team)}
              className={cn(
                "group relative flex flex-col text-left rounded-xl border bg-surface overflow-hidden",
                "transition-all duration-200 cursor-pointer",
                selectedTeam?.id === team.id
                  ? "border-primary shadow-card-hover"
                  : "border-border-light hover:border-primary hover:shadow-card-hover hover:-translate-y-0.5"
              )}
              style={{ animation: `fade-in 0.35s ease-out ${i * 80}ms both` }}
            >
              <div className={cn("flex flex-col p-5 border-l-[3px]", team.color)}>
                {/* Head */}
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[0.9rem] font-semibold text-text">
                    {team.name}
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.68rem] font-medium bg-bg-alt text-text-secondary group-hover:hidden">
                    <Users size={11} />
                    {team.agents} 个 Agent
                  </span>
                  <div className="hidden group-hover:flex items-center gap-1">
                    {[
                      { icon: Pencil, label: "编辑" },
                      { icon: Copy, label: "复制" },
                    ].map((action) => (
                      <span
                        key={action.label}
                        title={action.label}
                        onClick={(e) => e.stopPropagation()}
                        className="w-7 h-7 inline-flex items-center justify-center rounded-md text-text-muted hover:text-text hover:bg-bg-alt transition-colors"
                      >
                        <action.icon size={13} />
                      </span>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <p className="text-[0.76rem] text-text-muted mb-4 line-clamp-2">
                  {team.desc}
                </p>

                {/* Members */}
                <div className="flex items-center gap-3 mb-4">
                  {team.members.map((m) => (
                    <div key={m.name} className="flex flex-col items-center gap-1">
                      <Avatar char={m.char} color={m.color} size="md" />
                      <span className="text-[0.65rem] text-text-muted">{m.name}</span>
                    </div>
                  ))}
                </div>

                {/* Stats + Skills */}
                <div className="flex items-center justify-between pt-3 border-t border-border-light">
                  <span className="text-[0.72rem] text-text-muted flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    {team.stats}
                  </span>
                  <div className="flex items-center gap-1">
                    {team.skills.map((s) => (
                      <span
                        key={s.name}
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[0.65rem] font-medium",
                          variantMap[s.variant] || "bg-bg-alt text-text-secondary"
                        )}
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>

              </div>
            </button>
          ))}
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
                onClick={() => setSelectedTeam(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text hover:bg-surface transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-[0.78rem] text-text-secondary mb-5">
              {selectedTeam.desc}
            </p>

            {/* Team Members */}
            <div className="mb-5">
              <h3 className="text-[0.78rem] font-medium text-text mb-3">
                团队成员
              </h3>
              <div className="flex items-start gap-3 flex-wrap">
                {selectedTeam.members.map((m) => (
                  <div
                    key={m.name}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-surface border border-border-light min-w-[88px]"
                  >
                    <Avatar char={m.char} color={m.color} size="lg" />
                    <span className="text-[0.75rem] font-medium text-text">
                      {m.name}
                    </span>
                    <span className="flex items-center gap-1 text-[0.65rem] text-text-muted">
                      <Cpu size={10} />
                      模型
                    </span>
                  </div>
                ))}
                <button
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl min-w-[88px] min-h-[100px]",
                    "border-2 border-dashed border-border-light",
                    "text-text-muted hover:text-primary hover:border-primary/40",
                    "transition-colors cursor-pointer"
                  )}
                >
                  <Plus size={18} />
                  <span className="text-[0.7rem] font-medium">添加 Agent</span>
                </button>
              </div>
            </div>

            {/* Shared Skills */}
            <div className="mb-5">
              <h3 className="text-[0.78rem] font-medium text-text mb-2">
                共享 Skills
              </h3>
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedTeam.skills.map((s) => (
                  <span
                    key={s.name}
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-medium",
                      variantMap[s.variant] || "bg-bg-alt text-text-secondary"
                    )}
                  >
                    {s.name}
                  </span>
                ))}
                <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-medium text-text-muted border border-dashed border-border-light hover:text-primary hover:border-primary/40 transition-colors cursor-pointer">
                  <Plus size={12} />
                  添加
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-primary/10">
              <button
                onClick={() => setSelectedTeam(null)}
                className={cn(
                  "px-4 py-2 rounded-lg text-[0.8rem] font-medium",
                  "text-text-secondary hover:text-text hover:bg-surface",
                  "transition-colors cursor-pointer"
                )}
              >
                取消
              </button>
              <button
                className={cn(
                  "px-5 py-2 rounded-lg text-[0.8rem] font-medium",
                  "bg-primary text-white",
                  "hover:bg-primary-hover active:bg-primary-active",
                  "transition-colors cursor-pointer shadow-sm"
                )}
              >
                保存团队模板
              </button>
            </div>
          </div>
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
                "transition-colors"
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
                "transition-colors"
              )}
            />
          </div>

          {/* Agent Picker */}
          <div>
            <label className="block text-[0.78rem] font-medium text-text mb-2">
              选择 Agent 成员
            </label>
            <div className="flex flex-wrap gap-2">
              {allAgents.map((agent) => {
                const selected = pickedAgents.has(agent.name);
                return (
                  <button
                    key={agent.name}
                    onClick={() => toggleAgent(agent.name)}
                    className={cn(
                      "inline-flex items-center gap-2 px-3 py-2 rounded-lg border",
                      "text-[0.78rem] font-medium transition-all cursor-pointer",
                      selected
                        ? "border-primary bg-primary-light text-primary-active"
                        : "border-border-light bg-surface text-text-secondary hover:border-primary/40 hover:bg-primary-light/30"
                    )}
                  >
                    <Avatar char={agent.char} color={agent.color} size="xs" />
                    {agent.name}
                    {selected && <CheckCircle2 size={14} className="text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              onClick={() => setCreateOpen(false)}
              className={cn(
                "px-4 py-2 rounded-lg text-[0.8rem] font-medium",
                "text-text-secondary hover:text-text hover:bg-bg-alt",
                "transition-colors cursor-pointer"
              )}
            >
              取消
            </button>
            <button
              className={cn(
                "px-5 py-2 rounded-lg text-[0.8rem] font-medium",
                "bg-primary text-white",
                "hover:bg-primary-hover active:bg-primary-active",
                "transition-colors cursor-pointer shadow-sm",
                pickedAgents.size === 0 && "opacity-50 cursor-not-allowed"
              )}
              disabled={pickedAgents.size === 0}
            >
              创建团队
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
