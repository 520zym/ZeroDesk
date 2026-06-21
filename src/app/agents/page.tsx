"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Copy,
  Trash2,
  Globe,
  FileText,
  Terminal,
  Sparkles,
  X,
  ChevronDown,
  Cpu,
  Wrench,
  Loader2,
  Bot,
  Search,
  CheckCircle2,
  Package,
  BookOpen,
  Eye,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatUsdPrice } from "@/lib/pricing";
import { Avatar, Modal, Toggle, MarkdownContent } from "@/components/ui";
import {
  useAgents,
  useCreateAgent,
  useUpdateAgent,
  useDeleteAgent,
  useOptimizePrompt,
} from "@/hooks/useAgents";
import { useWorkspaceModels, useProviders } from "@/hooks/useModels";
import { useSettings } from "@/hooks/useSettings";
import { usePromptTemplates } from "@/hooks/usePrompts";
import { useSkills } from "@/hooks/useSkills";
import type { Agent, Model, ModelProvider } from "@/types";

const AVATAR_COLORS = [
  "bg-primary",
  "bg-sage",
  "bg-coral",
  "bg-lavender",
  "bg-sand",
  "#6A8D99",
  "#7B68A8",
  "#5A9E6F",
  "#C47E5A",
  "#6B8FA3",
];

const defaultTools = [
  { key: "search", label: "联网搜索", description: "允许检索网络信息", icon: Globe },
  { key: "file", label: "本地文件读写", description: "支持文本与 Word .docx 正文读取", icon: FileText },
  { key: "exec", label: "命令执行", description: "允许执行本地命令", icon: Terminal },
];

function parseToolsJson(json: string | null): Record<string, boolean> {
  if (!json) return { search: false, file: false, exec: false };
  try {
    const arr: string[] = JSON.parse(json);
    return {
      search: arr.includes("search"),
      file: arr.includes("file"),
      exec: arr.includes("exec"),
    };
  } catch {
    return { search: false, file: false, exec: false };
  }
}

function toolsToJson(tools: Record<string, boolean>): string {
  return JSON.stringify(
    Object.entries(tools)
      .filter(([, v]) => v)
      .map(([k]) => k),
  );
}

function parseSkillsJson(json: string | null): string[] {
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

function getModelDisplay(
  modelId: string | null,
  models: Model[],
): { name: string; found: boolean } {
  if (!modelId) return { name: "未指定", found: false };
  const m = models.find((mod) => mod.id === modelId);
  return m ? { name: m.name, found: true } : { name: modelId, found: false };
}

const MODEL_BG_CLASSES = [
  "bg-primary-light text-primary-active",
  "bg-sage-light text-[#5a7a6b]",
  "bg-coral-light text-[#9a7058]",
  "bg-lavender-light text-[#6f5f80]",
  "bg-sand-light text-[#8a7b55]",
];

function modelBgClass(modelId: string | null): string {
  if (!modelId) return "bg-bg-alt text-text-secondary";
  let hash = 0;
  for (let i = 0; i < modelId.length; i++) {
    hash = (hash * 31 + modelId.charCodeAt(i)) | 0;
  }
  return MODEL_BG_CLASSES[Math.abs(hash) % MODEL_BG_CLASSES.length];
}

function ModelPicker({
  value,
  onChange,
  providers,
  models,
  placeholder = "选择模型",
}: {
  value: string;
  onChange: (id: string) => void;
  providers: ModelProvider[];
  models: Model[];
  placeholder?: string;
}) {
  const { data: settings } = useSettings();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropUp = spaceBelow < 340;
    setStyle(
      dropUp
        ? {
            position: "fixed",
            bottom: window.innerHeight - rect.top + 6,
            left: rect.left,
            maxHeight: Math.min(320, rect.top - 20),
          }
        : {
            position: "fixed",
            top: rect.bottom + 6,
            left: rect.left,
            maxHeight: Math.min(320, spaceBelow - 20),
          },
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const handleToggle = () => {
    if (!open) updatePosition();
    setOpen((v) => !v);
  };

  const selected = models.find((m) => m.id === value);
  const selectedProvider = selected
    ? providers.find((p) => p.id === selected.provider_id)
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        onClick={handleToggle}
        className={cn(
          "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all cursor-pointer",
          open
            ? "border-primary bg-primary-light/40"
            : "border-border-light bg-bg hover:border-border-hover",
        )}
      >
        {selectedProvider && (
          <span
            className="w-5 h-5 rounded flex items-center justify-center text-white text-[0.6rem] font-bold shrink-0"
            style={{
              backgroundColor: selectedProvider.icon_color || "#6B7280",
            }}
          >
            {selectedProvider.name.charAt(0)}
          </span>
        )}
        <span
          className={cn(
            "text-[0.78rem] flex-1 text-left truncate",
            selected ? "font-medium text-text" : "text-text-muted",
          )}
        >
          {selected?.name ?? placeholder}
        </span>
        <ChevronDown
          size={12}
          className={cn(
            "text-text-muted transition-transform shrink-0",
            open && "rotate-180",
          )}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            className="w-[260px] bg-surface border border-border-light rounded-xl shadow-xl z-[9999] overflow-y-auto overscroll-contain"
            style={{ ...style, animation: "scale-in 0.15s ease-out" }}
            onWheel={(e) => e.stopPropagation()}
          >
            {/* 清空选择 */}
            <button
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className={cn(
                "w-full px-3 py-2 text-left text-[0.78rem] text-text-muted hover:bg-bg-alt transition-colors cursor-pointer",
                !value && "bg-primary-light font-medium text-primary",
              )}
            >
              {placeholder}
            </button>
            <div className="border-t border-border-light/60" />
            {providers.length === 0 ? (
              <div className="px-3 py-4 text-center text-[0.78rem] text-text-muted">
                暂无可用模型
              </div>
            ) : (
              providers.map((p) => {
                const providerModels = models.filter(
                  (m) => m.provider_id === p.id,
                );
                if (providerModels.length === 0) return null;
                return (
                  <div key={p.id}>
                    <div className="px-3 pt-2.5 pb-1 text-[0.65rem] font-semibold text-text-muted uppercase tracking-wider">
                      {p.name}
                    </div>
                    {providerModels.map((m) => {
                      const isSelected = m.id === value;
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            onChange(m.id);
                            setOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors cursor-pointer",
                            isSelected
                              ? "bg-primary-light"
                              : "hover:bg-bg-alt",
                          )}
                        >
                          <span
                            className="w-5 h-5 rounded flex items-center justify-center text-white text-[0.55rem] font-bold shrink-0"
                            style={{
                              backgroundColor: p.icon_color || "#6B7280",
                            }}
                          >
                            {p.name.charAt(0)}
                          </span>
                          <span
                            className={cn(
                              "text-[0.78rem] flex-1 truncate",
                              isSelected
                                ? "font-semibold text-primary"
                                : "text-text",
                            )}
                          >
                            {m.name}
                          </span>
                          <span className="text-[0.65rem] text-text-muted font-mono shrink-0">
                            {formatUsdPrice(m.price_per_million_tokens, settings)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

export default function AgentsPage() {
  const { data: agents = [], isLoading, error } = useAgents();
  const { data: workspaceModels = [] } = useWorkspaceModels();
  const { data: providers = [] } = useProviders();
  const { data: installedSkills = [] } = useSkills();
  const { data: promptTemplates = [] } = usePromptTemplates();
  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent();
  const deleteAgent = useDeleteAgent();
  const optimizePrompt = useOptimizePrompt();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedAgent = agents.find((a) => a.id === selectedId) ?? null;

  const [createOpen, setCreateOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [skillSearch, setSkillSearch] = useState("");
  const [detailSkillNames, setDetailSkillNames] = useState<Set<string>>(new Set());
  const [templatePickerTarget, setTemplatePickerTarget] = useState<"create" | "detail" | null>(null);
  const [templateSearch, setTemplateSearch] = useState("");

  const [detailPromptView, setDetailPromptView] = useState<"preview" | "edit">("preview");
  const [createPromptView, setCreatePromptView] = useState<"preview" | "edit">("edit");

  // --- detail panel editable state ---
  const [detailName, setDetailName] = useState("");
  const [detailRole, setDetailRole] = useState("");
  const [detailPrompt, setDetailPrompt] = useState("");
  const [detailModel, setDetailModel] = useState("");
  const [detailFallback, setDetailFallback] = useState("");
  const [detailTools, setDetailTools] = useState<Record<string, boolean>>({
    search: false,
    file: false,
    exec: false,
  });
  const [detailDirty, setDetailDirty] = useState(false);

  useEffect(() => {
    if (selectedAgent) {
      setDetailName(selectedAgent.name);
      setDetailRole(selectedAgent.role_description ?? "");
      setDetailPrompt(selectedAgent.system_prompt ?? "");
      setDetailModel(selectedAgent.model_id ?? "");
      setDetailFallback(selectedAgent.fallback_model_id ?? "");
      setDetailTools(parseToolsJson(selectedAgent.tools_json));
      setDetailSkillNames(new Set(parseSkillsJson(selectedAgent.skills_json)));
      setDetailDirty(false);
      setDetailPromptView("preview");
    }
  }, [selectedAgent?.id, selectedAgent?.updated_at]);

  const handleDetailSave = useCallback(() => {
    if (!selectedAgent || !detailDirty) return;
    updateAgent.mutate(
      {
        id: selectedAgent.id,
        name: detailName.trim() || undefined,
        roleDescription: detailRole.trim() || undefined,
        systemPrompt: detailPrompt,
        modelId: detailModel || undefined,
        fallbackModelId: detailFallback || undefined,
        toolsJson: toolsToJson(detailTools),
        skillsJson: JSON.stringify(Array.from(detailSkillNames)),
      },
      {
        onSuccess: () => {
          setDetailDirty(false);
          setSelectedId(null);
        },
      },
    );
  }, [selectedAgent, detailName, detailRole, detailPrompt, detailModel, detailFallback, detailTools, detailSkillNames, detailDirty]);

  function openSkillsModal() {
    setSkillSearch("");
    setSkillsOpen(true);
  }

  function toggleSkillPick(name: string) {
    setDetailSkillNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
    setDetailDirty(true);
  }

  function removeSkill(name: string) {
    setDetailSkillNames((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
    setDetailDirty(true);
  }

  const filteredSkillsList = useMemo(() => {
    if (!skillSearch.trim()) return installedSkills;
    const q = skillSearch.toLowerCase();
    return installedSkills.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q),
    );
  }, [installedSkills, skillSearch]);

  // --- create form state ---
  const [createName, setCreateName] = useState("");
  const [createRole, setCreateRole] = useState("");
  const [createPrompt, setCreatePrompt] = useState("");
  const [createModel, setCreateModel] = useState("");
  const [createFallback, setCreateFallback] = useState("");
  const [createTools, setCreateTools] = useState<Record<string, boolean>>({
    search: true,
    file: false,
    exec: false,
  });

  const resetCreateForm = () => {
    setCreateName("");
    setCreateRole("");
    setCreatePrompt("");
    setCreateModel("");
    setCreateFallback("");
    setCreateTools({ search: true, file: false, exec: false });
    setCreatePromptView("edit");
  };

  const handleCreate = () => {
    if (!createName.trim()) return;
    const char = createName.trim().charAt(0);
    const color =
      AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    createAgent.mutate(
      {
        name: createName.trim(),
        avatarChar: char,
        avatarColor: color,
        roleDescription: createRole.trim() || undefined,
        systemPrompt: createPrompt.trim() || undefined,
        modelId: createModel || undefined,
        fallbackModelId: createFallback || undefined,
        toolsJson: toolsToJson(createTools),
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
          resetCreateForm();
        },
      },
    );
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteAgent.mutate(
      { id },
      {
        onSuccess: () => {
          if (selectedId === id) setSelectedId(null);
        },
      },
    );
  };

  const handleDuplicate = (agent: Agent, e: React.MouseEvent) => {
    e.stopPropagation();
    const color =
      AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    createAgent.mutate({
      name: `${agent.name} (副本)`,
      avatarChar: agent.avatar_char ?? agent.name.charAt(0),
      avatarColor: color,
      roleDescription: agent.role_description ?? undefined,
      systemPrompt: agent.system_prompt ?? undefined,
      modelId: agent.model_id ?? undefined,
      fallbackModelId: agent.fallback_model_id ?? undefined,
      toolsJson: agent.tools_json ?? "[]",
      skillsJson: agent.skills_json ?? "[]",
    });
  };

  const handleOptimizeCreate = () => {
    if (!createName.trim() && !createRole.trim()) return;
    optimizePrompt.mutate(
      {
        agentName: createName.trim(),
        roleDescription: createRole.trim(),
        currentPrompt: createPrompt.trim(),
      },
      {
        onSuccess: (result) => {
          setCreatePrompt(result);
          setCreatePromptView("preview");
        },
      },
    );
  };

  const handleOptimizeDetail = () => {
    if (!selectedAgent) return;
    optimizePrompt.mutate(
      {
        agentName: detailName.trim() || selectedAgent.name,
        roleDescription: detailRole.trim() || (selectedAgent.role_description ?? ""),
        currentPrompt: detailPrompt,
      },
      {
        onSuccess: (result) => {
          setDetailPrompt(result);
          setDetailDirty(true);
          setDetailPromptView("preview");
        },
      },
    );
  };

  const filteredTemplates = useMemo(() => {
    if (!templateSearch.trim()) return promptTemplates;
    const q = templateSearch.toLowerCase();
    return promptTemplates.filter(
      (t) =>
        t.agent_name.toLowerCase().includes(q) ||
        t.role_description?.toLowerCase().includes(q) ||
        t.prompt_content.toLowerCase().includes(q),
    );
  }, [promptTemplates, templateSearch]);

  function openTemplatePicker(target: "create" | "detail") {
    setTemplateSearch("");
    setTemplatePickerTarget(target);
  }

  function handleImportTemplate(prompt: string) {
    if (templatePickerTarget === "create") {
      setCreatePrompt(prompt);
      setCreatePromptView("preview");
    } else if (templatePickerTarget === "detail") {
      setDetailPrompt(prompt);
      setDetailDirty(true);
      setDetailPromptView("preview");
    }
    setTemplatePickerTarget(null);
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div
          className="shrink-0 px-4 sm:px-6 pt-5 pb-4"
          style={{ animation: "fade-in 0.3s ease-out" }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[0.82rem] text-text-secondary">
              每个 Agent 是一个带有特定 Prompt 和权限的执行单元
            </p>
            <button
              onClick={() => setCreateOpen(true)}
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg",
                "bg-primary text-white text-[0.8rem] font-medium",
                "hover:bg-primary-hover active:bg-primary-active",
                "transition-colors cursor-pointer shadow-sm",
              )}
            >
              <Plus size={15} strokeWidth={2.2} />
              手动创建
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-2 pb-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2
                size={28}
                className="text-text-muted animate-spin"
              />
              <span className="text-[0.82rem] text-text-muted">
                加载中…
              </span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <span className="text-[0.82rem] text-danger">
                加载失败：{String(error)}
              </span>
            </div>
          ) : agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-bg-alt flex items-center justify-center">
                <Bot size={32} className="text-text-muted" />
              </div>
              <div className="text-center">
                <p className="text-[0.92rem] font-medium text-text mb-1">
                  还没有 Agent
                </p>
                <p className="text-[0.78rem] text-text-muted">
                  点击右上角「手动创建」来添加你的第一个 Agent
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {agents.map((agent, i) => {
                const modelInfo = getModelDisplay(
                  agent.model_id,
                  workspaceModels,
                );
                const tools = parseToolsJson(agent.tools_json);
                const skills = parseSkillsJson(agent.skills_json);
                const toolLabels = defaultTools
                  .filter((t) => tools[t.key])
                  .map((t) => t.label)
                  .join(" · ");

                return (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedId(agent.id)}
                    className={cn(
                      "group relative flex flex-col text-left rounded-xl border bg-surface p-4",
                      "transition-all duration-200 cursor-pointer",
                      selectedId === agent.id
                        ? "border-primary shadow-card-hover"
                        : "border-border-light hover:border-primary hover:shadow-card-hover hover:-translate-y-0.5",
                    )}
                    style={{
                      animation: `fade-in 0.35s ease-out ${i * 60}ms both`,
                    }}
                  >
                    {/* Hover actions */}
                    <div className="absolute top-3 right-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span
                        title="复制"
                        onClick={(e) => handleDuplicate(agent, e)}
                        className="w-6 h-6 inline-flex items-center justify-center rounded-md text-text-muted hover:text-text hover:bg-bg-alt transition-colors"
                      >
                        <Copy size={13} />
                      </span>
                      <span
                        title="删除"
                        onClick={(e) => handleDelete(agent.id, e)}
                        className="w-6 h-6 inline-flex items-center justify-center rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                      >
                        <Trash2 size={13} />
                      </span>
                    </div>

                    {/* Top */}
                    <div className="flex items-start gap-3 mb-3">
                      <Avatar
                        char={agent.avatar_char ?? agent.name.charAt(0)}
                        color={agent.avatar_color ?? "bg-primary"}
                        size="lg"
                      />
                      <div className="min-w-0 flex-1 pr-8">
                        <div className="text-[0.88rem] font-semibold text-text truncate">
                          {agent.name}
                        </div>
                        <div className="text-[0.73rem] text-text-muted mt-0.5 line-clamp-1">
                          {agent.role_description || "暂无描述"}
                        </div>
                      </div>
                    </div>

                    {/* Meta pills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.68rem] font-medium",
                          modelBgClass(agent.model_id),
                        )}
                      >
                        <Cpu size={11} />
                        {modelInfo.name}
                      </span>
                      {skills.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.68rem] font-medium bg-bg-alt text-text-secondary">
                          <Wrench size={10} />
                          {skills.length} Skills
                        </span>
                      )}
                      {toolLabels && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.68rem] font-medium bg-bg-alt text-text-muted">
                          <Terminal size={10} />
                          {toolLabels}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        open={!!selectedAgent}
        onClose={() => setSelectedId(null)}
        title="编辑 Agent"
        width="580px"
      >
        {selectedAgent && (
          <div className="space-y-5">
            {/* Avatar + Name + Role */}
            <div className="flex items-start gap-3">
              <Avatar
                char={
                  detailName.trim().charAt(0) ||
                  (selectedAgent.avatar_char ??
                  selectedAgent.name.charAt(0))
                }
                color={selectedAgent.avatar_color ?? "bg-primary"}
                size="xl"
              />
              <div className="flex-1 min-w-0 space-y-2">
                <input
                  type="text"
                  value={detailName}
                  onChange={(e) => {
                    setDetailName(e.target.value);
                    setDetailDirty(true);
                  }}
                  placeholder="Agent 名称"
                  className={cn(
                    "w-full rounded-lg border border-border-light bg-bg px-3 py-2",
                    "text-[0.85rem] font-semibold text-text placeholder:text-text-muted",
                    "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20",
                    "transition-colors",
                  )}
                />
                <input
                  type="text"
                  value={detailRole}
                  onChange={(e) => {
                    setDetailRole(e.target.value);
                    setDetailDirty(true);
                  }}
                  placeholder="角色描述，如：负责网络搜索与信息聚合"
                  className={cn(
                    "w-full rounded-lg border border-border-light bg-bg px-3 py-1.5",
                    "text-[0.78rem] text-text-secondary placeholder:text-text-muted",
                    "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20",
                    "transition-colors",
                  )}
                />
              </div>
            </div>

            {/* System Prompt */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[0.78rem] font-medium text-text">
                  系统提示词
                </label>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => openTemplatePicker("detail")}
                    className="inline-flex items-center gap-1 text-[0.72rem] font-medium text-text-secondary hover:text-primary transition-colors cursor-pointer"
                  >
                    <BookOpen size={12} />
                    从模板导入
                  </button>
                  <span className="text-border-light text-[0.6rem]">|</span>
                  <button
                    onClick={handleOptimizeDetail}
                    disabled={optimizePrompt.isPending}
                    className="inline-flex items-center gap-1 text-[0.72rem] font-medium text-primary hover:text-primary-hover transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {optimizePrompt.isPending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Sparkles size={12} />
                    )}
                    AI 优化
                  </button>
                  <span className="text-border-light text-[0.6rem]">|</span>
                  <div className="flex items-center bg-bg rounded-md p-0.5 border border-border-light">
                    <button
                      onClick={() => setDetailPromptView("preview")}
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.68rem] font-medium transition-colors cursor-pointer",
                        detailPromptView === "preview"
                          ? "bg-primary-light text-primary-active"
                          : "text-text-muted hover:text-text",
                      )}
                    >
                      <Eye size={11} />
                      预览
                    </button>
                    <button
                      onClick={() => setDetailPromptView("edit")}
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.68rem] font-medium transition-colors cursor-pointer",
                        detailPromptView === "edit"
                          ? "bg-primary-light text-primary-active"
                          : "text-text-muted hover:text-text",
                      )}
                    >
                      <Pencil size={11} />
                      编辑
                    </button>
                  </div>
                </div>
              </div>
              {detailPromptView === "preview" ? (
                <div
                  className={cn(
                    "w-full rounded-lg border border-border-light bg-bg px-4 py-3",
                    "text-[0.78rem] text-text leading-relaxed",
                    "min-h-[120px] max-h-[240px] overflow-y-auto",
                  )}
                >
                  {detailPrompt.trim() ? (
                    <MarkdownContent content={detailPrompt} />
                  ) : (
                    <p className="text-text-muted italic">暂无提示词内容</p>
                  )}
                </div>
              ) : (
                <textarea
                  value={detailPrompt}
                  onChange={(e) => {
                    setDetailPrompt(e.target.value);
                    setDetailDirty(true);
                  }}
                  rows={5}
                  className={cn(
                    "w-full rounded-lg border border-border-light bg-bg px-3 py-2.5",
                    "text-[0.78rem] text-text leading-relaxed resize-none",
                    "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20",
                    "transition-colors",
                  )}
                />
              )}
            </div>

            {/* Model + Fallback */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[0.78rem] font-medium text-text mb-1.5">
                  默认模型
                </label>
                <ModelPicker
                  value={detailModel}
                  onChange={(v) => {
                    setDetailModel(v);
                    setDetailDirty(true);
                  }}
                  providers={providers}
                  models={workspaceModels}
                />
              </div>
              <div>
                <label className="block text-[0.78rem] font-medium text-text mb-1.5">
                  兜底模型
                </label>
                <ModelPicker
                  value={detailFallback}
                  onChange={(v) => {
                    setDetailFallback(v);
                    setDetailDirty(true);
                  }}
                  providers={providers}
                  models={workspaceModels}
                  placeholder="选择兜底模型"
                />
              </div>
            </div>

            {/* Tool Permissions */}
            <div>
              <label className="block text-[0.78rem] font-medium text-text mb-2">
                能力权限
              </label>
              <div className="space-y-2">
                {defaultTools.map((tool) => (
                  <div
                    key={tool.key}
                    className="flex items-center justify-between rounded-lg border border-border-light px-3 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <tool.icon
                        size={14}
                        className="shrink-0 text-text-secondary"
                      />
                      <div className="min-w-0">
                        <div className="text-[0.78rem] text-text">{tool.label}</div>
                        <div className="mt-0.5 truncate text-[0.68rem] text-text-muted">
                          {tool.description}
                        </div>
                      </div>
                    </div>
                    <Toggle
                      checked={detailTools[tool.key]}
                      onChange={(v) => {
                        setDetailTools((prev) => ({
                          ...prev,
                          [tool.key]: v,
                        }));
                        setDetailDirty(true);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Private Skills */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[0.78rem] font-medium text-text">
                  私有 Skills
                </label>
                <button
                  onClick={openSkillsModal}
                  className="inline-flex items-center gap-1 text-[0.72rem] font-medium text-primary hover:text-primary-hover transition-colors cursor-pointer"
                >
                  <Sparkles size={12} />
                  管理 Skills
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(detailSkillNames).map((skill) => (
                  <span
                    key={skill}
                    className="group/skill inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-medium bg-primary-light text-primary-active"
                  >
                    {skill}
                    <button
                      onClick={() => removeSkill(skill)}
                      className="w-3.5 h-3.5 rounded-full flex items-center justify-center opacity-0 group-hover/skill:opacity-100 hover:bg-primary/20 transition-all cursor-pointer"
                    >
                      <X size={8} />
                    </button>
                  </span>
                ))}
                {detailSkillNames.size === 0 && (
                  <button
                    onClick={openSkillsModal}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
                      "border-2 border-dashed border-border-light",
                      "text-[0.72rem] text-text-muted hover:text-primary hover:border-primary/40",
                      "transition-colors cursor-pointer",
                    )}
                  >
                    <Plus size={12} />
                    添加 Skills
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setSelectedId(null)}
                className={cn(
                  "px-4 py-2 rounded-lg text-[0.8rem] font-medium",
                  "text-text-secondary hover:text-text hover:bg-bg-alt",
                  "transition-colors cursor-pointer",
                )}
              >
                取消
              </button>
              <button
                onClick={handleDetailSave}
                disabled={!detailDirty || updateAgent.isPending}
                className={cn(
                  "px-5 py-2 rounded-lg text-[0.8rem] font-medium inline-flex items-center justify-center gap-1.5",
                  "transition-colors cursor-pointer shadow-sm",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  detailDirty
                    ? "bg-primary text-white hover:bg-primary-hover"
                    : "bg-primary/50 text-white",
                )}
              >
                {updateAgent.isPending && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                保存修改
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Agent Modal */}
      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          resetCreateForm();
        }}
        title="创建新 Agent"
        width="580px"
      >
        <div className="space-y-5">
          {/* Name + Role */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[0.78rem] font-medium text-text mb-1.5">
                Agent 名称
              </label>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="如：信息检索员"
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
                角色描述
              </label>
              <input
                type="text"
                value={createRole}
                onChange={(e) => setCreateRole(e.target.value)}
                placeholder="如：负责网络搜索与信息聚合"
                className={cn(
                  "w-full rounded-lg border border-border-light bg-bg px-3 py-2",
                  "text-[0.8rem] text-text placeholder:text-text-muted",
                  "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20",
                  "transition-colors",
                )}
              />
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[0.78rem] font-medium text-text">
                系统提示词
              </label>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => openTemplatePicker("create")}
                  className="inline-flex items-center gap-1 text-[0.72rem] font-medium text-text-secondary hover:text-primary transition-colors cursor-pointer"
                >
                  <BookOpen size={12} />
                  从模板导入
                </button>
                <span className="text-border-light text-[0.6rem]">|</span>
                <button
                  onClick={handleOptimizeCreate}
                  disabled={
                    optimizePrompt.isPending ||
                    (!createName.trim() && !createRole.trim())
                  }
                  className="inline-flex items-center gap-1 text-[0.72rem] font-medium text-primary hover:text-primary-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {optimizePrompt.isPending ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Sparkles size={12} />
                  )}
                  AI 优化
                </button>
                <span className="text-border-light text-[0.6rem]">|</span>
                <div className="flex items-center bg-bg rounded-md p-0.5 border border-border-light">
                  <button
                    onClick={() => setCreatePromptView("preview")}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.68rem] font-medium transition-colors cursor-pointer",
                      createPromptView === "preview"
                        ? "bg-primary-light text-primary-active"
                        : "text-text-muted hover:text-text",
                    )}
                  >
                    <Eye size={11} />
                    预览
                  </button>
                  <button
                    onClick={() => setCreatePromptView("edit")}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.68rem] font-medium transition-colors cursor-pointer",
                      createPromptView === "edit"
                        ? "bg-primary-light text-primary-active"
                        : "text-text-muted hover:text-text",
                    )}
                  >
                    <Pencil size={11} />
                    编辑
                  </button>
                </div>
              </div>
            </div>
            {createPromptView === "preview" ? (
              <div
                className={cn(
                  "w-full rounded-lg border border-border-light bg-bg px-4 py-3",
                  "text-[0.78rem] text-text leading-relaxed",
                  "min-h-[100px] max-h-[240px] overflow-y-auto",
                )}
              >
                {createPrompt.trim() ? (
                  <MarkdownContent content={createPrompt} />
                ) : (
                  <p className="text-text-muted italic">暂无提示词内容</p>
                )}
              </div>
            ) : (
              <textarea
                value={createPrompt}
                onChange={(e) => setCreatePrompt(e.target.value)}
                rows={4}
                placeholder="描述此 Agent 的行为规则和输出格式要求…"
                className={cn(
                  "w-full rounded-lg border border-border-light bg-bg px-3 py-2.5",
                  "text-[0.78rem] text-text leading-relaxed resize-none placeholder:text-text-muted",
                  "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20",
                  "transition-colors",
                )}
              />
            )}
            {optimizePrompt.isError && (
              <p className="mt-1 text-[0.72rem] text-danger">
                {String(optimizePrompt.error)}
              </p>
            )}
          </div>

          {/* Model + Fallback */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[0.78rem] font-medium text-text mb-1.5">
                默认模型
              </label>
              <ModelPicker
                value={createModel}
                onChange={setCreateModel}
                providers={providers}
                models={workspaceModels}
              />
            </div>
            <div>
              <label className="block text-[0.78rem] font-medium text-text mb-1.5">
                兜底模型
              </label>
              <ModelPicker
                value={createFallback}
                onChange={setCreateFallback}
                providers={providers}
                models={workspaceModels}
                placeholder="选择兜底模型"
              />
            </div>
          </div>

          {/* Tool Permissions */}
          <div>
            <label className="block text-[0.78rem] font-medium text-text mb-2">
              能力权限
            </label>
            <div className="space-y-2">
              {defaultTools.map((tool) => (
                <div
                  key={tool.key}
                  className="flex items-center justify-between rounded-lg border border-border-light px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <tool.icon
                      size={14}
                      className="shrink-0 text-text-secondary"
                    />
                    <div className="min-w-0">
                      <div className="text-[0.78rem] text-text">{tool.label}</div>
                      <div className="mt-0.5 truncate text-[0.68rem] text-text-muted">
                        {tool.description}
                      </div>
                    </div>
                  </div>
                  <Toggle
                    checked={createTools[tool.key]}
                    onChange={(v) =>
                      setCreateTools((prev) => ({
                        ...prev,
                        [tool.key]: v,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              onClick={() => {
                setCreateOpen(false);
                resetCreateForm();
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
              onClick={handleCreate}
              disabled={!createName.trim() || createAgent.isPending}
              className={cn(
                "px-5 py-2 rounded-lg text-[0.8rem] font-medium inline-flex items-center gap-1.5",
                "bg-primary text-white",
                "hover:bg-primary-hover active:bg-primary-active",
                "transition-colors cursor-pointer shadow-sm",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              {createAgent.isPending && (
                <Loader2 size={14} className="animate-spin" />
              )}
              创建 Agent
            </button>
          </div>
        </div>
      </Modal>

      {/* Skills Picker Modal */}
      <Modal
        open={skillsOpen}
        onClose={() => setSkillsOpen(false)}
        title={`管理私有 Skills · ${selectedAgent?.name ?? ""}`}
        width="560px"
      >
        <div className="space-y-4">
          <p className="text-[0.76rem] text-text-muted">
            为该 Agent 分配专属 Skills，勾选后点击外部「保存修改」生效
          </p>

          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <input
              type="text"
              placeholder="搜索 Skill..."
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
              className={cn(
                "w-full pl-8 pr-3 py-2 rounded-lg bg-bg text-[0.82rem] text-text",
                "border border-border-light focus:border-primary/40 focus:outline-none",
                "transition-colors placeholder:text-text-muted",
              )}
            />
          </div>

          {detailSkillNames.size > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[0.72rem] text-text-muted shrink-0">
                已选 {detailSkillNames.size} 个:
              </span>
              {Array.from(detailSkillNames).map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.68rem] font-medium bg-primary-light text-primary-active"
                >
                  {name}
                  <button
                    onClick={() => toggleSkillPick(name)}
                    className="w-3 h-3 rounded-full flex items-center justify-center hover:bg-primary/20 transition-colors cursor-pointer"
                  >
                    <X size={7} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="max-h-[340px] overflow-y-auto -mx-1 px-1 space-y-1">
            {installedSkills.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2">
                <Package size={28} className="text-text-muted/30" />
                <p className="text-[0.82rem] text-text-muted">暂无已安装的 Skill</p>
                <p className="text-[0.72rem] text-text-muted/60">
                  前往 Skills 管理页面安装
                </p>
              </div>
            ) : filteredSkillsList.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <Search size={22} className="text-text-muted/30" />
                <p className="text-[0.78rem] text-text-muted">未找到匹配的 Skill</p>
              </div>
            ) : (
              filteredSkillsList.map((skill) => {
                const selected = detailSkillNames.has(skill.name);
                return (
                  <button
                    key={skill.id}
                    onClick={() => toggleSkillPick(skill.name)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left",
                      "transition-all cursor-pointer",
                      selected
                        ? "border-primary bg-primary-light/40"
                        : "border-border-light/60 bg-bg/60 hover:border-primary/30 hover:bg-primary-light/20",
                    )}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[0.65rem] font-bold text-white shrink-0"
                      style={{ backgroundColor: skill.icon_bg ?? "#6C8FC7" }}
                    >
                      {skill.name.slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[0.8rem] font-semibold text-text truncate">
                          {skill.name}
                        </span>
                        {skill.version && (
                          <span className="text-[0.62rem] text-text-muted font-medium">
                            v{skill.version}
                          </span>
                        )}
                      </div>
                      {skill.description && (
                        <p className="text-[0.7rem] text-text-muted/70 mt-0.5 line-clamp-1">
                          {skill.description}
                        </p>
                      )}
                    </div>
                    <div
                      className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                        selected
                          ? "bg-primary border-primary"
                          : "border-border-light bg-transparent",
                      )}
                    >
                      {selected && (
                        <CheckCircle2 size={12} className="text-white" strokeWidth={3} />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border-light/60">
            <span className="text-[0.72rem] text-text-muted">
              共 {installedSkills.length} 个可用 Skill
            </span>
            <button
              onClick={() => setSkillsOpen(false)}
              className={cn(
                "px-4 py-2 rounded-lg text-[0.8rem] font-medium",
                "bg-primary text-white hover:bg-primary-hover",
                "transition-colors cursor-pointer shadow-sm",
              )}
            >
              完成
            </button>
          </div>
        </div>
      </Modal>

      {/* Prompt Template Picker Modal */}
      <Modal
        open={!!templatePickerTarget}
        onClose={() => setTemplatePickerTarget(null)}
        title="从 Agent 模板导入提示词"
        width="560px"
      >
        <div className="space-y-4">
          <p className="text-[0.76rem] text-text-muted">
            选择一个已有 Agent 的系统提示词作为模板导入，导入后可继续编辑
          </p>

          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <input
              type="text"
              placeholder="搜索 Agent 名称、角色或提示词..."
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              className={cn(
                "w-full pl-8 pr-3 py-2 rounded-lg bg-bg text-[0.82rem] text-text",
                "border border-border-light focus:border-primary/40 focus:outline-none",
                "transition-colors placeholder:text-text-muted",
              )}
            />
          </div>

          <div className="max-h-[380px] overflow-y-auto -mx-1 px-1 space-y-1.5">
            {filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2">
                <BookOpen size={28} className="text-text-muted/30" />
                <p className="text-[0.82rem] text-text-muted">
                  {promptTemplates.length === 0
                    ? "暂无 Prompt 模板"
                    : "没有匹配的模板"}
                </p>
                <p className="text-[0.72rem] text-text-muted/60">
                  {promptTemplates.length === 0
                    ? "前往 Prompt 管理页面为 Agent 保存 Prompt 版本"
                    : "尝试其他搜索关键词"}
                </p>
              </div>
            ) : (
              filteredTemplates.map((tpl) => (
                <button
                  key={tpl.agent_id}
                  onClick={() => handleImportTemplate(tpl.prompt_content)}
                  className={cn(
                    "w-full flex items-start gap-3 px-3 py-3 rounded-lg border text-left transition-all",
                    "border-border-light/60 bg-bg/60 hover:border-primary/40 hover:bg-primary-light/20 cursor-pointer",
                  )}
                >
                  <Avatar
                    char={tpl.avatar_char ?? tpl.agent_name.charAt(0)}
                    color={tpl.avatar_color ?? "bg-primary"}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[0.8rem] font-semibold text-text truncate">
                        {tpl.agent_name}
                      </span>
                      <span className="text-[0.62rem] text-text-muted font-medium shrink-0">
                        v{tpl.version}
                      </span>
                      {tpl.role_description && (
                        <span className="text-[0.68rem] text-text-muted truncate">
                          {tpl.role_description}
                        </span>
                      )}
                    </div>
                    <p className="text-[0.72rem] text-text-secondary mt-1 line-clamp-2 leading-relaxed">
                      {tpl.prompt_content}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border-light/60">
            <span className="text-[0.72rem] text-text-muted">
              共 {filteredTemplates.length} 个 Prompt 模板
            </span>
            <button
              onClick={() => setTemplatePickerTarget(null)}
              className={cn(
                "px-4 py-2 rounded-lg text-[0.8rem] font-medium",
                "text-text-secondary hover:text-text hover:bg-bg-alt",
                "transition-colors cursor-pointer",
              )}
            >
              取消
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
