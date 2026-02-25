import { useState, useCallback, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  RefreshCw,
  Target,
  Lightbulb,
  GripVertical,
  Pencil,
  Trash2,
  Plus,
  ChevronDown,
  Bot,
  FileOutput,
  Save,
  Rocket,
  Wrench,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Avatar, Badge, Modal } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  useTask,
  useTaskSteps,
  useUpdateTaskStatus,
  useCreateTaskStep,
  useUpdateTaskStep,
  useDeleteTaskStep,
  useDeleteTask,
} from "@/hooks/useTasks";
import { useAgents } from "@/hooks/useAgents";
import { useWorkspaceModels } from "@/hooks/useModels";
import type { Agent, TaskStep } from "@/types";

const STEP_COLORS = ["bg-primary", "bg-sage", "bg-lavender", "bg-coral", "bg-sand"];

const OUTPUT_OPTIONS = ["next", "report", "dataset", "json", "code"] as const;

const OUTPUT_LABELS: Record<string, string> = {
  next: "传递给下一步",
  report: "分析报告",
  dataset: "数据集",
  json: "结构化 JSON",
  code: "代码",
};

const COST_TIER_LABELS: Record<string, string> = {
  economy: "经济",
  standard: "标准",
  quality: "高质量",
  unlimited: "不限",
};

const QUALITY_LABELS: Record<string, string> = {
  loose: "宽松",
  standard: "标准",
  strict: "严格",
};

function parseToolsJson(toolsJson: string | null): string[] {
  if (!toolsJson) return [];
  try {
    const parsed = JSON.parse(toolsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function PlanPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: task, isLoading: taskLoading } = useTask(id);
  const { data: steps = [] } = useTaskSteps(id);
  const { data: agents = [] } = useAgents();
  const { data: models = [] } = useWorkspaceModels();

  const updateTaskStatus = useUpdateTaskStatus();
  const createTaskStep = useCreateTaskStep();
  const updateTaskStep = useUpdateTaskStep();
  const deleteTaskStep = useDeleteTaskStep();
  const deleteTask = useDeleteTask();

  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [addAgentModal, setAddAgentModal] = useState(false);

  const sortedSteps = useMemo(
    () => [...steps].sort((a, b) => a.step_order - b.step_order),
    [steps],
  );

  const agentMap = useMemo(
    () => new Map(agents.map((a) => [a.id, a])),
    [agents],
  );

  const modelMap = useMemo(
    () => new Map(models.map((m) => [m.id, m])),
    [models],
  );

  const uniqueAgentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const step of sortedSteps) {
      if (step.agent_id) ids.add(step.agent_id);
    }
    return ids;
  }, [sortedSteps]);

  const teamAgents = useMemo(
    () => agents.filter((a) => uniqueAgentIds.has(a.id)),
    [agents, uniqueAgentIds],
  );

  const getAgentForStep = useCallback(
    (step: TaskStep): { char: string; color: string; name: string } => {
      if (!step.agent_id) return { char: "—", color: "bg-text-muted", name: "待分配" };
      const agent = agentMap.get(step.agent_id);
      if (!agent) return { char: "?", color: "bg-text-muted", name: "未知 Agent" };
      return {
        char: agent.avatar_char || agent.name[0],
        color: agent.avatar_color || "bg-primary",
        name: agent.name,
      };
    },
    [agentMap],
  );

  const getModelName = useCallback(
    (modelId: string | null): string => {
      if (!modelId) return "—";
      return modelMap.get(modelId)?.name ?? "—";
    },
    [modelMap],
  );

  const toggleStepEdit = useCallback((stepId: string) => {
    setEditingStep((prev) => (prev === stepId ? null : stepId));
  }, []);

  const handleStepNameBlur = useCallback(
    (step: TaskStep, newName: string) => {
      if (newName && newName !== step.name) {
        updateTaskStep.mutate({ id: step.id, name: newName });
      }
    },
    [updateTaskStep],
  );

  const handleAgentChange = useCallback(
    (stepId: string, agentId: string) => {
      updateTaskStep.mutate({ id: stepId, agentId: agentId || undefined });
    },
    [updateTaskStep],
  );

  const handleOutputChange = useCallback(
    (stepId: string, outputTarget: string) => {
      updateTaskStep.mutate({ id: stepId, outputTarget });
    },
    [updateTaskStep],
  );

  const handleDeleteStep = useCallback(
    (stepId: string) => {
      deleteTaskStep.mutate(stepId);
      if (editingStep === stepId) setEditingStep(null);
    },
    [deleteTaskStep, editingStep],
  );

  const handleAddStep = useCallback(() => {
    if (!id) return;
    createTaskStep.mutate({
      taskId: id,
      stepOrder: sortedSteps.length + 1,
      name: `步骤 ${sortedSteps.length + 1}`,
    });
  }, [id, createTaskStep, sortedSteps.length]);

  const handleConfirmExecute = useCallback(() => {
    if (!id) return;
    updateTaskStatus.mutate(
      { taskId: id, status: "running" },
      { onSuccess: () => navigate(`/tasks/${id}/console`) },
    );
  }, [id, updateTaskStatus, navigate]);

  if (taskLoading) {
    return (
      <div className="-m-6 flex h-[calc(100vh-var(--topbar-height))] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-text-muted" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="-m-6 flex h-[calc(100vh-var(--topbar-height))] items-center justify-center flex-col gap-3">
        <AlertCircle size={32} className="text-text-muted" />
        <p className="text-[0.85rem] text-text-muted">任务不存在或已被删除</p>
        <Link
          to="/tasks"
          className="text-[0.8rem] text-primary hover:underline no-underline"
        >
          返回任务中心
        </Link>
      </div>
    );
  }

  return (
    <div className="-m-6 flex h-[calc(100vh-var(--topbar-height))]">
      {/* Left column */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-5" style={{ animation: "fade-in 0.2s ease" }}>
          <Link
            to="/tasks"
            className="inline-flex items-center gap-1.5 text-[0.82rem] font-medium text-text-secondary hover:text-primary transition-colors no-underline"
          >
            <ArrowLeft size={15} />
            返回任务中心
          </Link>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[0.78rem] font-medium bg-surface text-text-secondary border border-border-light hover:border-border-hover transition-all cursor-pointer">
              <RefreshCw size={13} />
              重新规划
            </button>
            <button
              onClick={() => {
                if (!id) return;
                deleteTask.mutate(id, { onSuccess: () => navigate("/tasks") });
              }}
              disabled={deleteTask.isPending}
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[0.78rem] font-medium text-danger border border-danger-light bg-danger-light/50 hover:bg-danger-light transition-all cursor-pointer",
                deleteTask.isPending && "opacity-50 cursor-not-allowed"
              )}
            >
              <Trash2 size={13} />
              删除任务
            </button>
          </div>
        </div>

        {/* Goal bar */}
        <div
          className="bg-surface rounded-xl border border-border-light p-4 mb-5 flex items-start gap-3"
          style={{ animation: "fade-in 0.25s ease 0.05s both" }}
        >
          <div className="w-9 h-9 rounded-lg bg-primary-light flex items-center justify-center shrink-0 mt-0.5">
            <Target size={16} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[0.85rem] font-medium text-text leading-relaxed">
              {task.goal || "暂无任务目标"}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary-light text-primary text-[0.68rem] font-medium">
                {COST_TIER_LABELS[task.cost_tier ?? ""] ?? task.cost_tier ?? "标准"}模式
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-bg-alt text-text-muted text-[0.68rem] font-medium">
                质量门禁：{QUALITY_LABELS[task.quality_gate ?? ""] ?? task.quality_gate ?? "标准"}
              </span>
            </div>
          </div>
        </div>

        {/* AI explanation */}
        <div
          className="bg-sand-light rounded-xl p-4 mb-5 flex items-start gap-3"
          style={{ animation: "fade-in 0.25s ease 0.1s both" }}
        >
          <Lightbulb size={16} className="text-sand shrink-0 mt-0.5" />
          <p className="text-[0.78rem] text-text-secondary leading-relaxed">
            {sortedSteps.length > 0
              ? `共 ${sortedSteps.length} 个执行步骤，涉及 ${uniqueAgentIds.size} 个 Agent`
              : "暂未生成执行计划，请手动添加步骤"}
          </p>
        </div>

        {/* Step list */}
        <div className="relative mb-5">
          {sortedSteps.map((step, i) => {
            const stepAgent = getAgentForStep(step);
            const stepColor = STEP_COLORS[step.step_order % 5];

            return (
              <div
                key={step.id}
                className="relative"
                style={{ animation: `fade-in 0.25s ease ${0.15 + i * 0.06}s both` }}
              >
                {i < sortedSteps.length - 1 && (
                  <div className="absolute left-[23px] top-[52px] w-0.5 h-[calc(100%-28px)] bg-border-light z-0" />
                )}

                <div className={cn(
                  "relative bg-surface rounded-xl border p-4 mb-0 transition-all group",
                  editingStep === step.id ? "border-primary/30 shadow-md" : "border-border-light hover:border-border-hover",
                  i > 0 && "mt-3"
                )}>
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <GripVertical size={14} className="text-text-muted/50 cursor-grab" />
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white text-[0.72rem] font-bold", stepColor)}>
                        {step.step_order}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      {editingStep === step.id ? (
                        <input
                          defaultValue={step.name}
                          onBlur={(e) => handleStepNameBlur(step, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                          }}
                          className="w-full text-[0.88rem] font-semibold text-text bg-transparent border-b border-primary/30 focus:outline-none mb-1 pb-0.5"
                        />
                      ) : (
                        <h4 className="text-[0.88rem] font-semibold text-text mb-1">{step.name}</h4>
                      )}
                      <p className="text-[0.75rem] text-text-secondary leading-relaxed mb-2.5">
                        {step.description || "暂无描述"}
                      </p>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-bg-alt text-[0.7rem] font-medium text-text-secondary">
                          <Bot size={11} />
                          {stepAgent.name}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-bg-alt text-[0.7rem] font-medium text-text-muted">
                          <FileOutput size={11} />
                          {OUTPUT_LABELS[step.output_target ?? ""] ?? step.output_target ?? "—"}
                        </span>
                      </div>

                      {editingStep === step.id && (
                        <div className="mt-3 pt-3 border-t border-border-light space-y-3" style={{ animation: "fade-in 0.2s ease" }}>
                          <div>
                            <label className="block text-[0.7rem] font-medium text-text-muted mb-1">选择 Agent</label>
                            <select
                              value={step.agent_id ?? ""}
                              onChange={(e) => handleAgentChange(step.id, e.target.value)}
                              className="w-full text-[0.75rem] bg-bg border border-border-light rounded-lg px-3 py-1.5 text-text focus:outline-none focus:border-primary/30"
                            >
                              <option value="">待分配</option>
                              {agents.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name} ({getModelName(a.model_id)})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[0.7rem] font-medium text-text-muted mb-1">输出类型</label>
                            <select
                              value={step.output_target ?? ""}
                              onChange={(e) => handleOutputChange(step.id, e.target.value)}
                              className="w-full text-[0.75rem] bg-bg border border-border-light rounded-lg px-3 py-1.5 text-text focus:outline-none focus:border-primary/30"
                            >
                              <option value="">未指定</option>
                              {OUTPUT_OPTIONS.map((key) => (
                                <option key={key} value={key}>{OUTPUT_LABELS[key]}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className={cn("flex items-center gap-1 shrink-0 transition-opacity", editingStep === step.id ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                      <button
                        onClick={() => toggleStepEdit(step.id)}
                        className={cn(
                          "w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer",
                          editingStep === step.id ? "bg-primary-light text-primary" : "text-text-muted hover:bg-bg-alt hover:text-text"
                        )}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteStep(step.id)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-text-muted hover:bg-danger-light hover:text-danger transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add step bar */}
        <button
          onClick={handleAddStep}
          className="w-full py-3 rounded-xl border-2 border-dashed border-border text-[0.78rem] font-medium text-text-muted hover:border-primary/40 hover:text-primary hover:bg-primary-subtle transition-all cursor-pointer flex items-center justify-center gap-1.5"
          style={{ animation: `fade-in 0.25s ease ${0.15 + sortedSteps.length * 0.06}s both` }}
        >
          <Plus size={15} />
          添加步骤
        </button>
      </div>

      {/* Right sidebar */}
      <div className="w-80 border-l border-border-light bg-surface overflow-y-auto p-5 flex flex-col gap-5">
        {/* Agent team card */}
        <div style={{ animation: "fade-in 0.25s ease 0.1s both" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[0.85rem] font-semibold text-text">Agent 团队</h3>
            <span className="text-[0.7rem] text-text-muted">{teamAgents.length} 个</span>
          </div>
          <div className="space-y-2">
            {teamAgents.map((agent, i) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                index={i}
                expanded={expandedAgent === agent.id}
                onToggle={() => setExpandedAgent(expandedAgent === agent.id ? null : agent.id)}
                getModelName={getModelName}
              />
            ))}
          </div>

          <button
            onClick={() => setAddAgentModal(true)}
            className="w-full mt-2 py-2 rounded-lg border border-dashed border-border text-[0.75rem] font-medium text-text-muted hover:border-primary/40 hover:text-primary hover:bg-primary-subtle transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Plus size={14} />
            添加 Agent
          </button>
        </div>

        {/* Cost estimate card */}
        <div
          className="rounded-xl border border-border-light p-4"
          style={{ animation: "fade-in 0.25s ease 0.25s both" }}
        >
          <h3 className="text-[0.82rem] font-semibold text-text mb-3">成本预估</h3>
          <div className="space-y-2.5">
            {[
              { label: "执行步骤", value: `${sortedSteps.length} 步` },
              { label: "Agent 数量", value: `${uniqueAgentIds.size}` },
              { label: "成本档位", value: COST_TIER_LABELS[task.cost_tier ?? ""] ?? task.cost_tier ?? "—" },
              { label: "预估 Token", value: "—" },
              { label: "预估费用", value: "—", highlight: true },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-[0.72rem] text-text-muted">{row.label}</span>
                <span className={cn("text-[0.75rem] font-medium", row.highlight ? "text-primary" : "text-text")}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Confirm area */}
        <div className="mt-auto space-y-2" style={{ animation: "fade-in 0.25s ease 0.3s both" }}>
          <button
            onClick={handleConfirmExecute}
            disabled={sortedSteps.length === 0 || updateTaskStatus.isPending}
            className={cn(
              "w-full py-2.5 rounded-lg text-[0.82rem] font-semibold bg-gradient-to-r from-primary to-lavender text-white cursor-pointer transition-all hover:shadow-glow shadow-sm flex items-center justify-center gap-1.5",
              (sortedSteps.length === 0 || updateTaskStatus.isPending) && "opacity-50 cursor-not-allowed",
            )}
          >
            {updateTaskStatus.isPending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Rocket size={15} />
            )}
            确认执行
          </button>
          <button
            onClick={() => navigate("/tasks")}
            className="w-full py-2.5 rounded-lg text-[0.78rem] font-medium text-text-secondary bg-transparent border border-border-light hover:border-border-hover hover:bg-bg/50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Save size={14} />
            保存草稿
          </button>
        </div>
      </div>

      {/* Add Agent Modal */}
      <Modal open={addAgentModal} onClose={() => setAddAgentModal(false)} title="添加 Agent">
        <div className="space-y-2">
          {agents.length === 0 ? (
            <p className="text-[0.78rem] text-text-muted py-4 text-center">暂无可用 Agent，请先在 Agent 管理页创建</p>
          ) : (
            agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => setAddAgentModal(false)}
                className="w-full flex items-center gap-2.5 p-3 rounded-lg border border-border-light hover:border-primary/30 hover:bg-primary-subtle transition-all cursor-pointer text-left"
              >
                <Avatar
                  char={agent.avatar_char || agent.name[0]}
                  color={agent.avatar_color || "bg-primary"}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[0.78rem] font-medium text-text truncate block">{agent.name}</span>
                  <span className="text-[0.68rem] text-text-muted">{getModelName(agent.model_id)}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}

function AgentCard({
  agent,
  index,
  expanded,
  onToggle,
  getModelName,
}: {
  agent: Agent;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  getModelName: (id: string | null) => string;
}) {
  const tools = parseToolsJson(agent.tools_json);
  const badgeVariant: BadgeVariant = "completed";

  return (
    <div
      className="rounded-lg border border-border-light overflow-hidden"
      style={{ animation: `fade-in 0.25s ease ${0.15 + index * 0.06}s both` }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 p-3 hover:bg-bg/50 transition-colors cursor-pointer text-left"
      >
        <Avatar
          char={agent.avatar_char || agent.name[0]}
          color={agent.avatar_color || "bg-primary"}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[0.78rem] font-medium text-text truncate">{agent.name}</span>
            <Badge variant={badgeVariant}>已有</Badge>
          </div>
          <div className="text-[0.68rem] text-text-muted mt-0.5">{getModelName(agent.model_id)}</div>
        </div>
        <ChevronDown size={14} className={cn("text-text-muted transition-transform shrink-0", expanded && "rotate-180")} />
      </button>

      {tools.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {tools.map((tool) => (
            <span key={tool} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-bg-alt text-[0.62rem] text-text-muted">
              <Wrench size={9} />
              {tool}
            </span>
          ))}
        </div>
      )}

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border-light space-y-2.5" style={{ animation: "fade-in 0.2s ease" }}>
          <div>
            <label className="block text-[0.68rem] font-medium text-text-muted mb-1">Prompt</label>
            <textarea
              readOnly
              value={agent.system_prompt ?? ""}
              className="w-full h-16 px-2.5 py-1.5 rounded-md border border-border-light bg-bg text-[0.72rem] text-text resize-none focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[0.68rem] font-medium text-text-muted mb-1">模型</label>
            <div className="text-[0.72rem] text-text px-2.5 py-1.5 rounded-md border border-border-light bg-bg">
              {getModelName(agent.model_id)}
            </div>
          </div>
          {tools.length > 0 && (
            <div>
              <label className="block text-[0.68rem] font-medium text-text-muted mb-1">工具</label>
              <div className="flex flex-wrap gap-1.5">
                {tools.map((tool) => (
                  <span key={tool} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-bg-alt text-[0.68rem] text-text-secondary">
                    <Wrench size={10} />
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
