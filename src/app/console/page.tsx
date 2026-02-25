import { useState, useRef, useEffect, useMemo } from "react";
import {
  Pause,
  Play,
  RotateCcw,
  Square,
  Download,
  Send,
  Clock,
  Cpu,
  DollarSign,
  GitBranch,
  CheckCircle2,
  AlertCircle,
  Bot,
  Monitor,
  Loader2,
  User,
  ChevronRight,
  ChevronDown,
  Lightbulb,
} from "lucide-react";
import { Avatar, Badge, ProgressBar, EmptyState, MarkdownContent } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useParams, useNavigate } from "react-router";
import {
  useTask,
  useTaskSteps,
  useTaskRuns,
  useExecutionMessages,
  useCreateExecutionMessage,
  useUpdateTaskStatus,
  useTasks,
  useStartTaskExecution,
} from "@/hooks/useTasks";
import { useAgents } from "@/hooks/useAgents";
import { useStreamStore } from "@/stores/useStreamStore";
import type { Agent, TaskStep } from "@/types";

const AGENT_STATUS_STYLE = {
  done: { dot: "bg-success", ring: "ring-success/20" },
  active: { dot: "bg-primary animate-pulse", ring: "ring-primary/20" },
  waiting: { dot: "bg-border", ring: "ring-border/20" },
};

const NODE_STYLE = {
  done: { dot: "bg-success", text: "text-text" },
  active: { dot: "bg-primary animate-pulse", text: "text-primary font-medium" },
  pending: { dot: "bg-border", text: "text-text-muted" },
};

type AgentStatus = "done" | "active" | "waiting";
type NodeStatus = "done" | "active" | "pending";

const CONSOLE_STATUSES = new Set(["running", "completed", "failed", "paused"]);

function stepStatusToAgentStatus(status: string | null): AgentStatus {
  if (status === "completed") return "done";
  if (status === "running") return "active";
  return "waiting";
}

function stepStatusToNodeStatus(status: string | null): NodeStatus {
  if (status === "completed") return "done";
  if (status === "running") return "active";
  return "pending";
}

function taskStatusToBadge(status: string): { variant: BadgeVariant; label: string } {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    running: { variant: "running", label: "执行中" },
    completed: { variant: "completed", label: "已完成" },
    failed: { variant: "failed", label: "已失败" },
    draft: { variant: "draft", label: "草稿" },
    paused: { variant: "paused", label: "已暂停" },
    blocked: { variant: "blocked", label: "已阻塞" },
    archived: { variant: "archived", label: "已归档" },
  };
  return map[status] ?? { variant: "draft", label: status };
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr.endsWith("Z") ? isoStr : isoStr + "Z");
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

function formatDuration(startIso: string, endIso?: string | null): string {
  const start = new Date(startIso.endsWith("Z") ? startIso : startIso + "Z").getTime();
  const end = endIso ? new Date(endIso.endsWith("Z") ? endIso : endIso + "Z").getTime() : Date.now();
  const secs = Math.max(0, Math.floor((end - start) / 1000));
  const h = String(Math.floor(secs / 3600)).padStart(2, "0");
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function formatDurationSeconds(secs: number | null): string {
  if (secs == null || secs <= 0) return "-";
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m${secs % 60}s`;
}

function tryParseTable(content: string): { headers: string[]; rows: string[][] } | null {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed.headers) && Array.isArray(parsed.rows)) return parsed;
  } catch {
    /* not a table */
  }
  return null;
}

function findAgent(agents: Agent[] | undefined, id: string | null): Agent | null {
  if (!agents || !id) return null;
  return agents.find((a) => a.id === id) ?? null;
}

function tryParseMetadata(json: string | null): Record<string, unknown> | null {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function ThinkingSection({ thinking }: { thinking: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-2 border-t border-border-light/50 pt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[0.68rem] text-text-muted hover:text-text transition-colors cursor-pointer"
      >
        <ChevronRight size={12} className={cn("transition-transform duration-200", expanded && "rotate-90")} />
        <Lightbulb size={12} />
        <span>思考过程</span>
      </button>
      {expanded && (
        <div className="mt-1.5 px-3 py-2 bg-bg-alt/50 rounded-md text-[0.72rem] text-text-muted leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto">
          {thinking}
        </div>
      )}
    </div>
  );
}

export default function ConsolePage() {
  const { id: routeId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: allTasks } = useTasks();

  const consoleTasks = useMemo(() => {
    if (!allTasks) return [];
    return allTasks
      .filter((t) => CONSOLE_STATUSES.has(t.status))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }, [allTasks]);

  const taskId = useMemo(() => {
    if (routeId) return routeId;
    if (consoleTasks.length > 0) return consoleTasks[0].id;
    return undefined;
  }, [routeId, consoleTasks]);

  useEffect(() => {
    if (!routeId && taskId) {
      navigate(`/tasks/${taskId}/console`, { replace: true });
    }
  }, [routeId, taskId, navigate]);

  const { data: task, isLoading: taskLoading } = useTask(taskId);
  const { data: taskRuns } = useTaskRuns(taskId);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [runSelectorOpen, setRunSelectorOpen] = useState(false);
  const runSelectorRef = useRef<HTMLDivElement>(null);

  const latestRunId = useMemo(() => {
    if (!taskRuns || taskRuns.length === 0) return null;
    return taskRuns[taskRuns.length - 1].id;
  }, [taskRuns]);

  const activeRunId = selectedRunId ?? latestRunId;

  const { data: steps } = useTaskSteps(taskId, activeRunId);
  const { data: messages } = useExecutionMessages(taskId, { runId: activeRunId });
  const { data: agents } = useAgents();

  const createMessage = useCreateExecutionMessage();
  const updateStatus = useUpdateTaskStatus();
  const startExecution = useStartTaskExecution();

  const streamingData = useStreamStore((s) => (taskId ? s.streams[taskId] : undefined)) ?? null;

  const activeRun = useMemo(() => {
    if (!taskRuns || !activeRunId) return null;
    return taskRuns.find((r) => r.id === activeRunId) ?? null;
  }, [taskRuns, activeRunId]);

  const isViewingLatest = activeRunId === latestRunId;

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [taskSelectorOpen, setTaskSelectorOpen] = useState(false);
  const streamRef = useRef<HTMLDivElement>(null);
  const prevMsgCount = useRef(0);
  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages && messages.length > prevMsgCount.current && streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
    prevMsgCount.current = messages?.length ?? 0;
  }, [messages]);

  useEffect(() => {
    if (streamingData && streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [streamingData]);

  useEffect(() => {
    setSelectedRunId(null);
  }, [taskId]);

  useEffect(() => {
    if (!taskSelectorOpen && !runSelectorOpen) return;
    function handleClick(e: MouseEvent) {
      if (taskSelectorOpen && selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setTaskSelectorOpen(false);
      }
      if (runSelectorOpen && runSelectorRef.current && !runSelectorRef.current.contains(e.target as Node)) {
        setRunSelectorOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [taskSelectorOpen, runSelectorOpen]);

  const agentEntries = useMemo(() => {
    if (!steps) return [];
    const seen = new Map<string, TaskStep>();
    for (const step of steps) {
      if (!step.agent_id) continue;
      const existing = seen.get(step.agent_id);
      if (!existing || stepStatusToAgentStatus(step.status) === "active") {
        seen.set(step.agent_id, step);
      }
    }
    return Array.from(seen.entries()).map(([agentId, step]) => {
      const agent = findAgent(agents, agentId);
      const totalTokens = steps
        .filter((s) => s.agent_id === agentId)
        .reduce((sum, s) => sum + (s.tokens_used ?? 0), 0);
      const totalDuration = steps
        .filter((s) => s.agent_id === agentId)
        .reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0);
      return {
        id: agentId,
        char: agent?.avatar_char ?? agentId.charAt(0).toUpperCase(),
        color: agent?.avatar_color ?? "bg-primary",
        name: agent?.name ?? `Agent ${agentId.slice(0, 6)}`,
        role: agent?.role_description ?? "",
        status: stepStatusToAgentStatus(step.status),
        tokens: totalTokens,
        duration: formatDurationSeconds(totalDuration),
      };
    });
  }, [steps, agents]);

  useEffect(() => {
    if (agentEntries.length > 0 && !selectedAgentId) {
      const active = agentEntries.find((a) => a.status === "active");
      setSelectedAgentId(active?.id ?? agentEntries[0].id);
    }
  }, [agentEntries, selectedAgentId]);

  const nodes = useMemo(() => {
    if (!steps) return [];
    return [...steps]
      .sort((a, b) => a.step_order - b.step_order)
      .map((step) => ({
        id: step.id,
        label: step.name,
        status: stepStatusToNodeStatus(step.status),
      }));
  }, [steps]);

  const completedSteps = nodes.filter((n) => n.status === "done").length;
  const totalSteps = nodes.length;

  const isRunning = task?.status === "running";
  const isPaused = task?.status === "paused";
  const isActive = isRunning || isPaused;

  const statusBadge = task ? taskStatusToBadge(task.status) : null;

  const [elapsed, setElapsed] = useState("00:00:00");
  useEffect(() => {
    if (!task) return;
    const startIso = activeRun?.started_at ?? task.created_at;
    const endIso = activeRun?.completed_at ?? task.completed_at;
    const runStatus = activeRun?.status ?? task.status;
    if (runStatus !== "running") {
      setElapsed(formatDuration(startIso, endIso ?? task.updated_at));
      return;
    }
    const tick = () => setElapsed(formatDuration(startIso));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [task, activeRun]);

  function handleSend() {
    const text = inputValue.trim();
    if (!text || !taskId) return;
    createMessage.mutate({
      taskId,
      senderType: "human",
      senderName: "用户",
      content: text,
      contentType: "text",
    });
    setInputValue("");
  }

  function handleTogglePause() {
    if (!taskId) return;
    if (isPaused) {
      startExecution.mutate({ taskId });
    } else {
      updateStatus.mutate({ taskId, status: "paused" });
    }
  }

  function handleTerminate() {
    if (!taskId) return;
    updateStatus.mutate({ taskId, status: "failed" });
  }

  if (!routeId && consoleTasks.length === 0 && !taskLoading) {
    return (
      <div className="-m-6 flex h-[calc(100vh-var(--topbar-height))] items-center justify-center bg-bg/30">
        <EmptyState
          icon={Monitor}
          title="暂无可查看的任务"
          description="从任务中心启动一个任务后，执行过程与对话记录将在这里展示"
        />
      </div>
    );
  }

  if (taskLoading || !task) {
    return (
      <div className="-m-6 flex h-[calc(100vh-var(--topbar-height))] items-center justify-center bg-bg/30">
        <Loader2 size={28} className="animate-spin text-text-muted" />
      </div>
    );
  }

  const runTokens = activeRun?.total_tokens ?? task.total_tokens ?? 0;
  const runCost = activeRun?.total_cost ?? task.total_cost ?? 0;

  const tokenProgress = runTokens && task.timeout_minutes
    ? Math.min(100, Math.round((runTokens / (task.timeout_minutes * 10000)) * 100))
    : runTokens
      ? Math.min(100, Math.round((runTokens / 50000) * 100))
      : 0;


  return (
    <div className="-m-6 flex h-[calc(100vh-var(--topbar-height))]">
      {/* Left column — Agent panel */}
      <div className="w-[210px] border-r border-border-light bg-surface flex flex-col shrink-0">
        <div className="px-4 pt-4 pb-3">
          <h3 className="text-[0.82rem] font-semibold text-text">参与 Agent</h3>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
          {agentEntries.map((agent, i) => {
            const style = AGENT_STATUS_STYLE[agent.status];
            const isSelected = selectedAgentId === agent.id;
            return (
              <div
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                className={cn(
                  "rounded-lg p-2.5 cursor-pointer transition-all",
                  isSelected ? "bg-primary-subtle border border-primary/20" : "hover:bg-bg/70 border border-transparent"
                )}
                style={{ animation: `fade-in 0.25s ease ${i * 0.06}s both` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="relative">
                    <Avatar char={agent.char} color={agent.color} size="sm" />
                    <span className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface", style.dot)} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[0.75rem] font-medium text-text truncate">{agent.name}</div>
                    <div className="text-[0.62rem] text-text-muted">{agent.role}</div>
                  </div>
                </div>
                {agent.status !== "waiting" && (
                  <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                    <div className="bg-bg/80 rounded-md px-2 py-1">
                      <div className="text-[0.58rem] text-text-muted">Token</div>
                      <div className="text-[0.68rem] font-mono font-medium text-text">{agent.tokens.toLocaleString()}</div>
                    </div>
                    <div className="bg-bg/80 rounded-md px-2 py-1">
                      <div className="text-[0.58rem] text-text-muted">耗时</div>
                      <div className="text-[0.68rem] font-mono font-medium text-text">{agent.duration}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Center column — Message stream */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="relative z-10 px-4 py-2.5 border-b border-border-light flex items-center gap-2 bg-surface/80 backdrop-blur-sm">
          {isActive && (
            <>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleTogglePause}
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
                    isPaused ? "bg-primary-light text-primary" : "text-text-muted hover:bg-bg-alt hover:text-text"
                  )}
                  title={isPaused ? "继续" : "暂停"}
                >
                  {isPaused ? <Play size={14} /> : <Pause size={14} />}
                </button>
                <button className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:bg-bg-alt hover:text-text transition-colors cursor-pointer" title="重试">
                  <RotateCcw size={14} />
                </button>
                <button
                  onClick={handleTerminate}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:bg-danger-light hover:text-danger transition-colors cursor-pointer"
                  title="终止"
                >
                  <Square size={14} />
                </button>
              </div>
              <div className="h-4 w-px bg-border-light mx-1" />
            </>
          )}
          <div ref={selectorRef} className="relative flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={() => setTaskSelectorOpen(!taskSelectorOpen)}
              className="flex items-center gap-1.5 text-[0.8rem] font-medium text-text hover:text-primary transition-colors cursor-pointer truncate max-w-[320px]"
            >
              <span className="truncate">{task.title}</span>
              <ChevronDown size={13} className={cn("text-text-muted shrink-0 transition-transform", taskSelectorOpen && "rotate-180")} />
            </button>
            {statusBadge && <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>}

            {taskRuns && taskRuns.length > 1 && (
              <div ref={runSelectorRef} className="relative ml-1">
                <button
                  onClick={() => setRunSelectorOpen(!runSelectorOpen)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.7rem] font-medium bg-bg-alt border border-border-light text-text-secondary hover:text-text transition-colors cursor-pointer"
                >
                  <span>v{activeRun?.run_number ?? 1}</span>
                  <ChevronDown size={11} className={cn("text-text-muted transition-transform", runSelectorOpen && "rotate-180")} />
                </button>
                {runSelectorOpen && (
                  <div className="absolute top-full left-0 mt-1 w-[200px] max-h-[280px] overflow-y-auto bg-surface border border-border-light rounded-lg shadow-lg z-50">
                    <div className="px-2.5 pt-2 pb-1">
                      <span className="text-[0.65rem] font-medium text-text-muted">执行版本</span>
                    </div>
                    {[...taskRuns].reverse().map((run) => {
                      const isCurrent = run.id === activeRunId;
                      const runTime = new Date(run.started_at.endsWith("Z") ? run.started_at : run.started_at + "Z");
                      return (
                        <button
                          key={run.id}
                          onClick={() => {
                            setSelectedRunId(run.id);
                            setRunSelectorOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between px-2.5 py-2 text-left hover:bg-bg-alt transition-colors cursor-pointer",
                            isCurrent && "bg-primary-subtle"
                          )}
                        >
                          <div>
                            <span className={cn("text-[0.75rem] font-medium", isCurrent ? "text-primary" : "text-text")}>
                              v{run.run_number}
                            </span>
                            <div className="text-[0.62rem] text-text-muted">
                              {runTime.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                          <Badge variant={run.status as BadgeVariant}>
                            {taskStatusToBadge(run.status).label}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {taskSelectorOpen && consoleTasks.length > 0 && (
              <div className="absolute top-full left-0 mt-1.5 w-[380px] max-h-[420px] overflow-y-auto bg-surface border border-border-light rounded-xl shadow-lg z-50">
                <div className="px-3 pt-2.5 pb-1.5">
                  <span className="text-[0.68rem] font-medium text-text-muted">切换任务</span>
                </div>
                {consoleTasks.map((t) => {
                  const badge = taskStatusToBadge(t.status);
                  const isCurrent = t.id === taskId;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        navigate(`/tasks/${t.id}/console`);
                        setTaskSelectorOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-bg-alt transition-colors cursor-pointer",
                        isCurrent && "bg-primary-subtle"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className={cn("text-[0.78rem] font-medium truncate", isCurrent ? "text-primary" : "text-text")}>
                          {t.title}
                        </div>
                        <div className="text-[0.65rem] text-text-muted mt-0.5">
                          {formatRelativeTime(t.updated_at)}
                        </div>
                      </div>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:bg-bg-alt hover:text-text transition-colors cursor-pointer shrink-0" title="导出">
            <Download size={14} />
          </button>
        </div>

        {/* Message stream */}
        <div ref={streamRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-bg/30">
          {messages?.map((msg, i) => {
            if (msg.sender_type === "system") {
              return (
                <div
                  key={msg.id}
                  className="flex items-center justify-center gap-2 py-1.5"
                  style={{ animation: `fade-in 0.25s ease ${i * 0.04}s both` }}
                >
                  <div className="h-px flex-1 bg-border-light/60" />
                  <span className="flex items-center gap-1.5 text-[0.7rem] text-text-muted shrink-0 px-2">
                    {msg.content.includes("完成") ? (
                      <CheckCircle2 size={12} className="text-success" />
                    ) : msg.content.includes("开始") ? (
                      <AlertCircle size={12} className="text-primary" />
                    ) : (
                      <Bot size={12} />
                    )}
                    {msg.content}
                    <span className="text-text-muted/60 ml-1">{formatTime(msg.created_at)}</span>
                  </span>
                  <div className="h-px flex-1 bg-border-light/60" />
                </div>
              );
            }

            if (msg.sender_type === "human") {
              return (
                <div
                  key={msg.id}
                  className="flex items-start gap-3 max-w-[680px] ml-auto flex-row-reverse"
                  style={{ animation: `fade-in 0.25s ease ${i * 0.04}s both` }}
                >
                  <div className="w-7 h-7 rounded-full bg-lavender-light flex items-center justify-center mt-0.5 shrink-0">
                    <User size={14} className="text-lavender" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 justify-end">
                      <span className="text-[0.62rem] text-text-muted">{formatTime(msg.created_at)}</span>
                      <span className="text-[0.75rem] font-medium text-text">{msg.sender_name ?? "用户"}</span>
                    </div>
                    <div className="bg-primary-light rounded-xl rounded-tr-sm px-4 py-3 border border-primary/10">
                      <p className="text-[0.78rem] text-text-secondary leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                </div>
              );
            }

            const agent = findAgent(agents, msg.sender_id);
            const avatarChar = agent?.avatar_char ?? msg.sender_name?.charAt(0) ?? "A";
            const avatarColor = agent?.avatar_color ?? "bg-primary";
            const table = msg.content_type === "table" ? tryParseTable(msg.content) : null;
            const metadata = tryParseMetadata(msg.metadata_json);
            const thinkingText = metadata?.thinking as string | undefined;

            return (
              <div
                key={msg.id}
                className="flex items-start gap-3 max-w-[680px]"
                style={{ animation: `fade-in 0.25s ease ${i * 0.04}s both` }}
              >
                <Avatar char={avatarChar} color={avatarColor} size="sm" className="mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[0.75rem] font-medium text-text">{msg.sender_name ?? "Agent"}</span>
                    <span className="text-[0.62rem] text-text-muted">{formatTime(msg.created_at)}</span>
                  </div>
                  <div className="bg-surface rounded-xl rounded-tl-sm px-4 py-3 border border-border-light">
                    {!table && (
                      <MarkdownContent
                        content={msg.content}
                        className="text-[0.78rem] text-text-secondary leading-relaxed"
                      />
                    )}
                    {table && (
                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full text-[0.72rem] border-collapse">
                          <thead>
                            <tr>
                              {table.headers.map((h) => (
                                <th key={h} className="text-left px-2.5 py-1.5 bg-bg-alt text-text-muted font-medium border-b border-border-light first:rounded-tl-md last:rounded-tr-md">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {table.rows.map((row, ri) => (
                              <tr key={ri} className="border-b border-border-light/50 last:border-b-0">
                                {row.map((cell, ci) => (
                                  <td key={ci} className="px-2.5 py-1.5 text-text-secondary">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {thinkingText && <ThinkingSection thinking={thinkingText} />}
                    {metadata && (metadata.model || metadata.tokens_input != null) && (
                      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border-light/30 text-[0.62rem] text-text-muted">
                        {metadata.model != null && <span>{String(metadata.model)}</span>}
                        {metadata.tokens_input != null && (
                          <span>{(Number(metadata.tokens_input) + Number(metadata.tokens_output ?? 0)).toLocaleString()} tokens</span>
                        )}
                        {metadata.duration_ms != null && (
                          <span>{(Number(metadata.duration_ms) / 1000).toFixed(1)}s</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {isViewingLatest && streamingData && (streamingData.content || streamingData.thinking) && (
            <div className="flex items-start gap-3 max-w-[680px]" style={{ animation: "fade-in 0.25s ease both" }}>
              <Avatar
                char={findAgent(agents, streamingData.agentId)?.avatar_char ?? streamingData.agentName.charAt(0)}
                color={findAgent(agents, streamingData.agentId)?.avatar_color ?? "bg-primary"}
                size="sm"
                className="mt-0.5 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[0.75rem] font-medium text-text">{streamingData.agentName}</span>
                  <span className="text-[0.62rem] text-primary animate-pulse">
                    {streamingData.content ? "输出中..." : "思考中..."}
                  </span>
                </div>
                {streamingData.thinking && (
                  <div className="bg-bg-alt/50 rounded-xl rounded-tl-sm px-4 py-3 border border-border-light/50 mb-2">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Lightbulb size={12} className="text-text-muted" />
                      <span className="text-[0.68rem] text-text-muted">思考中</span>
                    </div>
                    <div className="text-[0.72rem] text-text-muted leading-relaxed">
                      <MarkdownContent content={streamingData.thinking} />
                      {!streamingData.content && (
                        <span className="inline-block w-1.5 h-3.5 bg-text-muted/40 ml-0.5 animate-pulse" />
                      )}
                    </div>
                  </div>
                )}
                {streamingData.content && (
                  <div className="bg-surface rounded-xl rounded-tl-sm px-4 py-3 border border-border-light">
                    <div className="text-[0.78rem] text-text-secondary leading-relaxed">
                      <MarkdownContent content={streamingData.content} />
                      <span className="inline-block w-1.5 h-4 bg-primary/60 ml-0.5 animate-pulse" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {isViewingLatest && isRunning && !streamingData && (
            <div className="flex items-start gap-3 max-w-[680px]" style={{ animation: "fade-in 0.25s ease both" }}>
              <Avatar char="…" color="bg-primary" size="sm" className="mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="bg-surface rounded-xl rounded-tl-sm px-4 py-3 border border-border-light">
                  <div className="flex items-center gap-1.5 py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-text-muted" style={{ animation: "pulse-dot 1.2s ease-in-out infinite" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-text-muted" style={{ animation: "pulse-dot 1.2s ease-in-out 0.2s infinite" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-text-muted" style={{ animation: "pulse-dot 1.2s ease-in-out 0.4s infinite" }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom input */}
        {isActive ? (
          <div className="px-4 py-3 border-t border-border-light bg-surface/80 backdrop-blur-sm">
            <div className="flex items-center gap-2 max-w-[680px]">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="输入消息，向 Agent 发送指令..."
                className="flex-1 px-3.5 py-2 rounded-lg border border-border-light bg-bg text-[0.82rem] text-text placeholder:text-text-muted focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10 transition-all"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                onClick={handleSend}
                className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center cursor-pointer hover:bg-primary-hover transition-colors shrink-0"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 py-2.5 border-t border-border-light bg-surface/60 text-center">
            <span className="text-[0.75rem] text-text-muted">
              任务已{task.status === "completed" ? "完成" : "结束"}，对话记录仅供查看
            </span>
          </div>
        )}
      </div>

      {/* Right column — Metrics panel */}
      <div className="w-[228px] border-l border-border-light bg-surface flex flex-col shrink-0">
        <div className="px-4 pt-4 pb-3">
          <h3 className="text-[0.82rem] font-semibold text-text">运行指标</h3>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
          {[
            {
              icon: Clock,
              label: "总耗时",
              value: elapsed,
              iconColor: "text-primary",
              iconBg: "bg-primary-light",
            },
            {
              icon: Cpu,
              label: "Token 消耗",
              value: `${runTokens.toLocaleString()} / 50,000`,
              iconColor: "text-sage",
              iconBg: "bg-sage-light",
              progress: tokenProgress,
            },
            {
              icon: DollarSign,
              label: "预估费用",
              value: `¥${runCost.toFixed(2)}`,
              iconColor: "text-sand",
              iconBg: "bg-sand-light",
            },
            {
              icon: GitBranch,
              label: "节点进度",
              value: `${completedSteps} / ${totalSteps}`,
              iconColor: "text-lavender",
              iconBg: "bg-lavender-light",
            },
          ].map((metric, i) => (
            <div
              key={metric.label}
              className="rounded-lg border border-border-light p-3"
              style={{ animation: `fade-in 0.25s ease ${i * 0.06}s both` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("w-7 h-7 rounded-md flex items-center justify-center", metric.iconBg)}>
                  <metric.icon size={14} className={metric.iconColor} />
                </div>
                <span className="text-[0.68rem] text-text-muted">{metric.label}</span>
              </div>
              <div className="text-[0.95rem] font-bold font-mono text-text tracking-tight">
                {metric.value}
              </div>
              {metric.progress !== undefined && (
                <div className="mt-2">
                  <ProgressBar value={metric.progress} variant="primary" size="sm" />
                </div>
              )}
            </div>
          ))}

          {/* Node status list */}
          <div className="rounded-lg border border-border-light p-3" style={{ animation: "fade-in 0.25s ease 0.3s both" }}>
            <h4 className="text-[0.72rem] font-medium text-text-muted mb-3">节点状态</h4>
            <div className="space-y-0">
              {nodes.map((node, i) => {
                const style = NODE_STYLE[node.status];
                return (
                  <div key={node.id} className="relative flex items-center gap-2.5 py-1.5">
                    {i < nodes.length - 1 && (
                      <div className="absolute left-[5px] top-[22px] w-0.5 h-[calc(100%-6px)] bg-border-light" />
                    )}
                    <span className={cn("w-2.5 h-2.5 rounded-full shrink-0 z-10", style.dot)} />
                    <span className={cn("text-[0.72rem]", style.text)}>{node.label}</span>
                    {node.status === "done" && (
                      <CheckCircle2 size={11} className="text-success ml-auto" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
