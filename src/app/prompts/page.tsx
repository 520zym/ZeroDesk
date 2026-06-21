import { useState, useCallback, useMemo } from "react";
import { diffLines } from "diff";
import {

  GitCompare,
  Eye,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Loader2,
  Pencil,
  BookOpen,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, Avatar, Badge } from "@/components/ui";
import { MarkdownContent } from "@/components/ui";
import { useAgents } from "@/hooks/useAgents";
import {
  usePromptVersions,
  useWorkflowTemplates,
  useCreatePromptVersion,
  useOptimizePrompt,
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
      <div
        className="shrink-0 flex items-center justify-between mb-5"
        style={{ animation: "fade-in 0.3s ease-out" }}
      >
        <p className="text-[0.82rem] text-text-secondary">
          管理可复用的 Prompt 资产与任务模板
        </p>
        <Tabs tabs={topTabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

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

/* ──────────────────── Versions View ──────────────────── */

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
  const createVersion = useCreatePromptVersion();
  const optimizePrompt = useOptimizePrompt();

  const latestVersion = versions[0] ?? null;
  const derivedContent =
    latestVersion?.content ?? selectedAgent?.system_prompt ?? "";

  const [viewMode, setViewMode] = useState<"preview" | "edit">("preview");
  const [userEdit, setUserEdit] = useState<{
    agentId: string;
    text: string;
  } | null>(null);
  const [saveNote, setSaveNote] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);

  const [viewingVersion, setViewingVersion] = useState<PromptVersion | null>(
    null,
  );
  const [diffVersion, setDiffVersion] = useState<PromptVersion | null>(null);

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

  const handleSaveVersion = useCallback(() => {
    if (!selectedAgent || !effectivePrompt.trim()) return;
    createVersion.mutate(
      {
        agentId: selectedAgent.id,
        content: effectivePrompt,
        note: saveNote.trim() || undefined,
      },
      {
        onSuccess: () => {
          setShowSaveForm(false);
          setSaveNote("");
          setUserEdit(null);
        },
      },
    );
  }, [selectedAgent, effectivePrompt, saveNote, createVersion]);

  const handleOptimize = useCallback(() => {
    if (!effectivePrompt.trim()) return;
    optimizePrompt.mutate(effectivePrompt, {
      onSuccess: (optimized) => {
        if (selectedAgent) {
          setUserEdit({ agentId: selectedAgent.id, text: optimized });
          setViewMode("edit");
        }
      },
    });
  }, [effectivePrompt, selectedAgent, optimizePrompt]);

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
    <>
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
            {/* Header */}
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
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleOptimize}
                  disabled={optimizePrompt.isPending || !effectivePrompt.trim()}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
                    "text-[0.75rem] font-medium transition-colors cursor-pointer",
                    "text-amber-600 bg-amber-50 hover:bg-amber-100",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                  )}
                >
                  {optimizePrompt.isPending ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Sparkles size={12} />
                  )}
                  AI 优化
                </button>
                <div className="flex items-center bg-bg rounded-lg p-0.5 border border-border-light">
                  <button
                    onClick={() => setViewMode("preview")}
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[0.72rem] font-medium transition-colors cursor-pointer",
                      viewMode === "preview"
                        ? "bg-primary-light text-primary-active"
                        : "text-text-muted hover:text-text",
                    )}
                  >
                    <BookOpen size={12} />
                    预览
                  </button>
                  <button
                    onClick={() => setViewMode("edit")}
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[0.72rem] font-medium transition-colors cursor-pointer",
                      viewMode === "edit"
                        ? "bg-primary-light text-primary-active"
                        : "text-text-muted hover:text-text",
                    )}
                  >
                    <Pencil size={12} />
                    编辑
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Prompt content */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[0.78rem] font-medium text-text">
                    当前 Prompt
                  </label>
                  {viewMode === "edit" && (
                    <div className="flex items-center gap-2">
                      {showSaveForm ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={saveNote}
                            onChange={(e) => setSaveNote(e.target.value)}
                            placeholder="版本备注（可选）"
                            className="h-7 w-48 rounded-md border border-border-light bg-bg px-2.5 text-[0.72rem] text-text focus:outline-none focus:border-primary"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveVersion();
                              if (e.key === "Escape") setShowSaveForm(false);
                            }}
                          />
                          <button
                            onClick={handleSaveVersion}
                            disabled={createVersion.isPending}
                            className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-1 rounded-md",
                              "text-[0.72rem] font-medium text-white bg-primary",
                              "hover:bg-primary-hover transition-colors cursor-pointer",
                              "disabled:opacity-50 disabled:cursor-not-allowed",
                            )}
                          >
                            {createVersion.isPending ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <Save size={11} />
                            )}
                            保存
                          </button>
                          <button
                            onClick={() => setShowSaveForm(false)}
                            className="p-1 text-text-muted hover:text-text transition-colors cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowSaveForm(true)}
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-md",
                            "text-[0.72rem] font-medium text-primary-active bg-primary-light",
                            "hover:bg-primary/10 transition-colors cursor-pointer",
                          )}
                        >
                          <Save size={11} />
                          保存为新版本
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {optimizePrompt.isPending && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-[0.75rem] text-amber-700">
                    <Loader2 size={14} className="animate-spin" />
                    AI 正在优化 Prompt，请稍候...
                  </div>
                )}

                {optimizePrompt.isError && (
                  <div className="mb-3 px-3 py-2 rounded-lg bg-danger-light border border-danger/20 text-[0.75rem] text-danger">
                    优化失败：{optimizePrompt.error?.message || "未知错误"}
                  </div>
                )}

                {viewMode === "preview" ? (
                  <div
                    className={cn(
                      "w-full rounded-lg border border-border-light bg-bg px-5 py-4",
                      "text-[0.78rem] text-text leading-relaxed",
                      "min-h-[200px] max-h-[50vh] overflow-y-auto",
                    )}
                  >
                    {effectivePrompt.trim() ? (
                      <MarkdownContent content={effectivePrompt} />
                    ) : (
                      <p className="text-text-muted italic">暂无 Prompt 内容</p>
                    )}
                  </div>
                ) : (
                  <textarea
                    value={effectivePrompt}
                    onChange={(e) => handlePromptChange(e.target.value)}
                    rows={12}
                    className={cn(
                      "w-full rounded-lg border border-border-light bg-bg px-4 py-3",
                      "text-[0.78rem] text-text leading-relaxed resize-none font-mono",
                      "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20",
                      "transition-colors",
                    )}
                  />
                )}
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
                        <VersionItem
                          key={v.id}
                          version={v}
                          index={i}
                          onView={() => setViewingVersion(v)}
                          onDiff={() => setDiffVersion(v)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-w-0 bg-surface border border-border-light rounded-xl flex items-center justify-center">
            <p className="text-[0.82rem] text-text-muted">
              选择一个 Agent 查看
            </p>
          </div>
        )}
      </div>

      {/* Version View Modal */}
      {viewingVersion && (
        <VersionViewModal
          version={viewingVersion}
          onClose={() => setViewingVersion(null)}
        />
      )}

      {/* Version Diff Modal */}
      {diffVersion && latestVersion && (
        <VersionDiffModal
          oldVersion={diffVersion}
          newVersion={latestVersion}
          onClose={() => setDiffVersion(null)}
        />
      )}
    </>
  );
}

/* ──────────────────── Version Item ──────────────────── */

function VersionItem({
  version: v,
  index: i,
  onView,
  onDiff,
}: {
  version: PromptVersion;
  index: number;
  onView: () => void;
  onDiff: () => void;
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
          <button
            onClick={onView}
            className="inline-flex items-center gap-1 text-[0.7rem] font-medium text-text-muted hover:text-primary transition-colors cursor-pointer"
          >
            <Eye size={12} />
            查看
          </button>
          {!isCurrent && (
            <button
              onClick={onDiff}
              className="inline-flex items-center gap-1 text-[0.7rem] font-medium text-text-muted hover:text-primary transition-colors cursor-pointer"
            >
              <GitCompare size={12} />
              对比
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────── Version View Modal ──────────────────── */

function VersionViewModal({
  version,
  onClose,
}: {
  version: PromptVersion;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-xl shadow-xl border border-border-light w-[720px] max-w-[90vw] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "fade-in 0.2s ease-out" }}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-light">
          <div className="flex items-center gap-2">
            <span className="text-[0.88rem] font-semibold text-text">
              v{version.version}
            </span>
            {version.is_stable === 1 && (
              <Badge variant="completed">stable</Badge>
            )}
            <span className="text-[0.72rem] text-text-muted">
              {version.created_at}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-bg-alt transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
        {version.note && (
          <div className="px-5 py-2 border-b border-border-light bg-bg-alt/50">
            <span className="text-[0.72rem] text-text-muted">备注：</span>
            <span className="text-[0.72rem] text-text-secondary">
              {version.note}
            </span>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <MarkdownContent
            content={version.content}
            className="text-[0.78rem] leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}

/* ──────────────────── Version Diff Modal ──────────────────── */

function VersionDiffModal({
  oldVersion,
  newVersion,
  onClose,
}: {
  oldVersion: PromptVersion;
  newVersion: PromptVersion;
  onClose: () => void;
}) {
  const diff = useMemo(
    () => diffLines(oldVersion.content, newVersion.content),
    [oldVersion.content, newVersion.content],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-xl shadow-xl border border-border-light w-[860px] max-w-[92vw] max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "fade-in 0.2s ease-out" }}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-light">
          <div className="flex items-center gap-3">
            <span className="text-[0.88rem] font-semibold text-text">
              版本对比
            </span>
            <div className="flex items-center gap-1.5 text-[0.72rem] text-text-muted">
              <span className="px-1.5 py-0.5 rounded bg-danger-light text-danger font-medium">
                v{oldVersion.version}
              </span>
              <ArrowRight size={12} />
              <span className="px-1.5 py-0.5 rounded bg-success-light text-success font-medium">
                v{newVersion.version}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-bg-alt transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-4 px-5 py-2 border-b border-border-light bg-bg-alt/30 text-[0.68rem] text-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-green-100 border border-green-300" />
            新增内容
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-100 border border-red-300" />
            删除内容
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="rounded-lg border border-border-light overflow-hidden font-mono text-[0.75rem] leading-relaxed">
            {diff.map((part, i) => {
              const lines = part.value.replace(/\n$/, "").split("\n");
              return lines.map((line, j) => (
                <div
                  key={`${i}-${j}`}
                  className={cn(
                    "px-4 py-0.5 border-b border-border-light/30 whitespace-pre-wrap break-all",
                    part.added
                      ? "bg-green-50 text-green-900"
                      : part.removed
                        ? "bg-red-50 text-red-900 line-through"
                        : "bg-transparent text-text-secondary",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block w-5 mr-3 text-right text-[0.65rem] select-none",
                      part.added
                        ? "text-green-500"
                        : part.removed
                          ? "text-red-400"
                          : "text-text-muted",
                    )}
                  >
                    {part.added ? "+" : part.removed ? "-" : " "}
                  </span>
                  {line || " "}
                </div>
              ));
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────── Templates View ──────────────────── */

function TemplatesView({ templates }: { templates: WorkflowTemplate[] }) {
  const [viewingTemplate, setViewingTemplate] = useState<WorkflowTemplate | null>(null);

  if (templates.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-[0.82rem] text-text-muted">暂无任务模板</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-1 pt-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {templates.map((t, i) => {
          const params = parseParams(t.parameters_json);
          return (
            <div
              key={t.id}
              className={cn(
                "group bg-surface border border-border-light rounded-xl p-5 cursor-pointer",
                "transition-all duration-200",
                "hover:border-primary hover:shadow-card-hover hover:-translate-y-0.5",
              )}
              onClick={() => setViewingTemplate(t)}
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
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewingTemplate(t);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg",
                    "text-[0.75rem] font-medium",
                    "bg-primary text-white",
                    "hover:bg-primary-hover active:bg-primary-active",
                    "transition-colors cursor-pointer shadow-sm",
                  )}
                >
                  查看详情
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {viewingTemplate && (
        <WorkflowTemplateModal
          template={viewingTemplate}
          onClose={() => setViewingTemplate(null)}
        />
      )}
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

function parseTemplateItems(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed.map((item, index) => stringifyTemplateItem(item, index));
    }
    return [stringifyTemplateItem(parsed, 0)];
  } catch {
    return [json];
  }
}

function stringifyTemplateItem(item: unknown, index: number): string {
  if (typeof item === "string") return item;
  if (typeof item === "number" || typeof item === "boolean") return String(item);
  if (item && typeof item === "object") {
    const obj = item as Record<string, unknown>;
    const title = obj.title ?? obj.name ?? obj.label ?? obj.step ?? `步骤 ${index + 1}`;
    const content = obj.prompt ?? obj.content ?? obj.description ?? obj.instruction;
    return content ? `${String(title)}：${String(content)}` : String(title);
  }
  return String(item ?? "");
}

function WorkflowTemplateModal({
  template,
  onClose,
}: {
  template: WorkflowTemplate;
  onClose: () => void;
}) {
  const params = parseTemplateItems(template.parameters_json);
  const steps = parseTemplateItems(template.steps_json);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-xl shadow-xl border border-border-light w-[760px] max-w-[90vw] max-h-[82vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "fade-in 0.2s ease-out" }}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border-light">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0",
                template.icon_bg || "bg-primary-light",
              )}
            >
              {template.icon_name || "📋"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[0.95rem] font-semibold text-text">{template.name}</h3>
                {template.category && <Badge variant="draft">{template.category}</Badge>}
              </div>
              <p className="mt-1 text-[0.76rem] leading-relaxed text-text-muted">
                {template.description || "暂无描述"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-bg-alt transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <section>
            <div className="mb-2 text-[0.78rem] font-semibold text-text">这是什么</div>
            <p className="rounded-lg border border-border-light bg-bg px-3 py-2.5 text-[0.78rem] leading-relaxed text-text-secondary">
              任务模板库保存的是可复用的任务/工作流提示模板，包含目标说明、需要用户补充的参数，以及建议执行步骤。聊天中引用它时，会把这些内容作为当前对话的系统提示词，让 AI 按模板组织回答。
            </p>
          </section>

          <section>
            <div className="mb-2 text-[0.78rem] font-semibold text-text">参数</div>
            {params.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {params.map((param) => (
                  <span
                    key={param}
                    className="rounded-lg border border-border-light bg-bg-alt px-2.5 py-1 text-[0.74rem] text-text-secondary"
                  >
                    {param}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[0.76rem] text-text-muted">暂无参数</p>
            )}
          </section>

          <section>
            <div className="mb-2 text-[0.78rem] font-semibold text-text">步骤</div>
            {steps.length > 0 ? (
              <ol className="space-y-2">
                {steps.map((step, index) => (
                  <li
                    key={`${index}-${step}`}
                    className="rounded-lg border border-border-light bg-bg px-3 py-2.5 text-[0.78rem] leading-relaxed text-text-secondary"
                  >
                    <span className="mr-2 font-semibold text-primary">{index + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-[0.76rem] text-text-muted">暂无步骤</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
