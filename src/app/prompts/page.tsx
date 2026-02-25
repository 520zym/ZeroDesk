import { useState, useCallback, useMemo } from "react";
import {
  Play,
  RotateCcw,
  GitCompare,
  Eye,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, Avatar, Badge } from "@/components/ui";
import { useAgents } from "@/hooks/useAgents";
import {
  usePromptVersions,
  useWorkflowTemplates,
} from "@/hooks/usePrompts";
import type { Agent, PromptVersion, WorkflowTemplate } from "@/types";

const topTabs = [
  { id: "versions", label: "Prompt 版本管理" },
  { id: "templates", label: "任务模板库" },
];

export default function PromptsPage() {
  const [activeTab, setActiveTab] = useState("versions");
  const { data: agents = [], isLoading: agentsLoading } = useAgents();
  const { data: templates = [], isLoading: templatesLoading } =
    useWorkflowTemplates();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const effectiveAgentId = selectedAgentId || agents[0]?.id || null;
  const selectedAgent = agents.find((a) => a.id === effectiveAgentId) ?? null;

  return (
    <div className="flex flex-col h-full overflow-hidden px-4 sm:px-6 pt-5 pb-6">
      {/* Header */}
      <div
        className="shrink-0 flex items-center justify-between mb-5"
        style={{ animation: "fade-in 0.3s ease-out" }}
      >
        <p className="text-[0.82rem] text-text-secondary">
          管理可复用的 Prompt 资产与任务模板
        </p>
        <Tabs tabs={topTabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Tab Content */}
      {activeTab === "versions" ? (
        agentsLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 size={24} className="animate-spin text-text-muted" />
          </div>
        ) : (
          <VersionsView
            agents={agents}
            selectedAgent={selectedAgent}
            onSelectAgent={(a) => setSelectedAgentId(a.id)}
          />
        )
      ) : templatesLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 size={24} className="animate-spin text-text-muted" />
        </div>
      ) : (
        <TemplatesView templates={templates} />
      )}
    </div>
  );
}

function VersionsView({
  agents,
  selectedAgent,
  onSelectAgent,
}: {
  agents: Agent[];
  selectedAgent: Agent | null;
  onSelectAgent: (a: Agent) => void;
}) {
  const { data: versions = [], isLoading: versionsLoading } =
    usePromptVersions(selectedAgent?.id ?? null);

  const latestVersion = versions[0] ?? null;
  const derivedContent =
    latestVersion?.content ?? selectedAgent?.system_prompt ?? "";

  const [userEdit, setUserEdit] = useState<{
    agentId: string;
    text: string;
  } | null>(null);

  const effectivePrompt =
    userEdit && userEdit.agentId === selectedAgent?.id
      ? userEdit.text
      : derivedContent;

  const handlePromptChange = useCallback(
    (text: string) => {
      if (selectedAgent) {
        setUserEdit({ agentId: selectedAgent.id, text });
      }
    },
    [selectedAgent],
  );

  if (agents.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-[0.82rem] text-text-muted">
          暂无 Agent，请先在 Agent 页面创建
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 gap-5 min-h-0 overflow-hidden">
      {/* Left: Agent list */}
      <div
        className="w-[260px] shrink-0 bg-surface border border-border-light rounded-xl flex flex-col overflow-hidden"
        style={{ animation: "fade-in 0.3s ease-out 60ms both" }}
      >
        <div className="px-4 py-3 border-b border-border-light">
          <span className="text-[0.78rem] font-medium text-text-secondary">
            Agent 列表
          </span>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {agents.map((agent, i) => (
            <button
              key={agent.id}
              onClick={() => onSelectAgent(agent)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer",
                selectedAgent?.id === agent.id
                  ? "bg-primary-light/50"
                  : "hover:bg-bg-alt",
              )}
              style={{
                animation: `fade-in 0.3s ease-out ${i * 60}ms both`,
              }}
            >
              <Avatar
                char={agent.avatar_char || agent.name[0]}
                color={agent.avatar_color || "bg-primary"}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[0.8rem] font-semibold text-text truncate">
                    {agent.name}
                  </span>
                </div>
                <span className="text-[0.7rem] text-text-muted truncate block">
                  {agent.role_description || "无角色描述"}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Version detail */}
      {selectedAgent ? (
        <div
          className="flex-1 min-w-0 bg-surface border border-border-light rounded-xl flex flex-col overflow-hidden"
          style={{ animation: "fade-in 0.35s ease-out 120ms both" }}
        >
          <div className="shrink-0 px-5 py-3 border-b border-border-light flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar
                char={selectedAgent.avatar_char || selectedAgent.name[0]}
                color={selectedAgent.avatar_color || "bg-primary"}
                size="sm"
              />
              <span className="text-[0.88rem] font-semibold text-text">
                {selectedAgent.name}
              </span>
              {latestVersion && (
                <span className="text-[0.72rem] text-text-muted">
                  v{latestVersion.version}
                </span>
              )}
              {latestVersion?.is_stable === 1 && (
                <Badge variant="completed">stable</Badge>
              )}
            </div>
            <button
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
                "text-[0.75rem] font-medium text-primary-active bg-primary-light",
                "hover:bg-primary/10 transition-colors cursor-pointer",
              )}
            >
              <Play size={12} />
              测试运行
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Prompt textarea */}
            <section>
              <label className="block text-[0.78rem] font-medium text-text mb-2">
                当前 Prompt
              </label>
              <textarea
                value={effectivePrompt}
                onChange={(e) => handlePromptChange(e.target.value)}
                rows={10}
                className={cn(
                  "w-full rounded-lg border border-border-light bg-bg px-4 py-3",
                  "text-[0.78rem] text-text leading-relaxed resize-none font-mono",
                  "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20",
                  "transition-colors",
                )}
              />
            </section>

            {/* Version history */}
            <section>
              <label className="block text-[0.78rem] font-medium text-text mb-3">
                版本历史
              </label>
              {versionsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2
                    size={18}
                    className="animate-spin text-text-muted"
                  />
                </div>
              ) : versions.length === 0 ? (
                <p className="text-[0.75rem] text-text-muted text-center py-4">
                  暂无版本记录
                </p>
              ) : (
                <div className="relative">
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
                  <div className="space-y-4">
                    {versions.map((v, i) => (
                      <VersionItem key={v.id} version={v} index={i} />
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-w-0 bg-surface border border-border-light rounded-xl flex items-center justify-center">
          <p className="text-[0.82rem] text-text-muted">选择一个 Agent 查看</p>
        </div>
      )}
    </div>
  );
}

function VersionItem({
  version: v,
  index: i,
}: {
  version: PromptVersion;
  index: number;
}) {
  const isCurrent = i === 0;

  const metrics = useMemo(() => {
    const result: { label: string; value: string; direction: "up" | "down" }[] =
      [];
    if (v.quality_score != null && v.quality_score !== 0) {
      result.push({
        label: "质量",
        value: `${v.quality_score > 0 ? "+" : ""}${v.quality_score.toFixed(0)}%`,
        direction: v.quality_score > 0 ? "up" : "down",
      });
    }
    if (v.cost_change != null && v.cost_change !== 0) {
      result.push({
        label: "成本",
        value: `${v.cost_change > 0 ? "+" : ""}${v.cost_change.toFixed(0)}%`,
        direction: v.cost_change > 0 ? "up" : "down",
      });
    }
    return result;
  }, [v.quality_score, v.cost_change]);

  return (
    <div
      className="relative pl-7"
      style={{ animation: `fade-in 0.3s ease-out ${i * 80}ms both` }}
    >
      <div
        className={cn(
          "absolute left-0 top-1 w-[15px] h-[15px] rounded-full border-2 bg-surface",
          isCurrent ? "border-primary" : "border-border",
        )}
      >
        {isCurrent && (
          <div className="absolute inset-[3px] rounded-full bg-primary" />
        )}
      </div>
      <div className="bg-bg rounded-lg px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={cn(
              "text-[0.78rem] font-semibold",
              isCurrent ? "text-primary" : "text-text",
            )}
          >
            v{v.version}
          </span>
          {isCurrent && (
            <span className="px-1.5 py-0.5 rounded text-[0.6rem] font-medium bg-primary-light text-primary">
              当前
            </span>
          )}
          {v.is_stable === 1 && (
            <Badge variant="completed">stable</Badge>
          )}
          <span className="text-[0.68rem] text-text-muted ml-auto">
            {v.created_at}
          </span>
        </div>
        <p className="text-[0.75rem] text-text-secondary mb-2">
          {v.note || "无备注"}
        </p>
        {metrics.length > 0 && (
          <div className="flex items-center gap-3 mb-2">
            {metrics.map((m) => (
              <span
                key={m.label}
                className={cn(
                  "inline-flex items-center gap-1 text-[0.68rem] font-medium px-1.5 py-0.5 rounded-md",
                  m.direction === "up" && m.label !== "成本"
                    ? "text-success bg-success-light"
                    : m.direction === "down" && m.label === "成本"
                      ? "text-success bg-success-light"
                      : "text-danger bg-danger-light",
                )}
              >
                {m.direction === "up" ? (
                  <TrendingUp size={11} />
                ) : (
                  <TrendingDown size={11} />
                )}
                {m.label} {m.value}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1 text-[0.7rem] font-medium text-text-muted hover:text-primary transition-colors cursor-pointer">
            <Eye size={12} />
            查看
          </button>
          {!isCurrent && (
            <>
              <button className="inline-flex items-center gap-1 text-[0.7rem] font-medium text-text-muted hover:text-primary transition-colors cursor-pointer">
                <RotateCcw size={12} />
                回滚
              </button>
              <button className="inline-flex items-center gap-1 text-[0.7rem] font-medium text-text-muted hover:text-primary transition-colors cursor-pointer">
                <GitCompare size={12} />
                对比
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TemplatesView({ templates }: { templates: WorkflowTemplate[] }) {
  if (templates.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-[0.82rem] text-text-muted">暂无任务模板</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {templates.map((t, i) => {
          const params = parseParams(t.parameters_json);
          return (
            <div
              key={t.id}
              className={cn(
                "group bg-surface border border-border-light rounded-xl p-5",
                "transition-all duration-200",
                "hover:border-primary hover:shadow-card-hover hover:-translate-y-0.5",
              )}
              style={{
                animation: `fade-in 0.35s ease-out ${i * 60}ms both`,
              }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center text-lg",
                    t.icon_bg || "bg-primary-light",
                  )}
                >
                  {t.icon_name || "📋"}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[0.88rem] font-semibold text-text">
                    {t.name}
                  </h3>
                  <p className="text-[0.75rem] text-text-muted mt-0.5">
                    {t.description || "无描述"}
                  </p>
                </div>
              </div>

              {params && (
                <div className="mb-4">
                  <span className="text-[0.7rem] text-text-muted">参数：</span>
                  <span className="text-[0.7rem] text-text-secondary font-medium">
                    {params}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-border-light">
                <span className="text-[0.7rem] text-text-muted">
                  已使用 {t.usage_count ?? 0} 次
                </span>
                <button
                  className={cn(
                    "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg",
                    "text-[0.75rem] font-medium",
                    "bg-primary text-white",
                    "hover:bg-primary-hover active:bg-primary-active",
                    "transition-colors cursor-pointer shadow-sm",
                  )}
                >
                  使用模板
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function parseParams(json: string | null): string | null {
  if (!json) return null;
  try {
    const arr = JSON.parse(json);
    if (Array.isArray(arr)) return arr.join(", ");
    return json;
  } catch {
    return json;
  }
}
