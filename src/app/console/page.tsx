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
} from "lucide-react";
import { Avatar, Badge, ProgressBar, EmptyState } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useParams, useNavigate } from "react-router";
import {
  useTask,
  useTaskSteps,
  useExecutionMessages,
  useCreateExecutionMessage,
  useUpdateTaskStatus,
  useRunningTasks,
} from "@/hooks/useTasks";
import { useAgents } from "@/hooks/useAgents";
import type { Agent, TaskStep, ExecutionMessage } from "@/types";

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
  const d = new Date(isoStr);
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

function formatDuration(startIso: string, endIso?: string | null): string {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
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

export default function ConsolePage() {
  const { id: routeId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: runningTasks } = useRunningTasks();

  const taskId = useMemo(() => {
    if (routeId) return routeId;
    if (runningTasks && runningTasks.length > 0) return runningTasks[0].id;
    return undefined;
  }, [routeId, runningTasks]);

  useEffect(() => {
    if (!routeId && taskId) {
      navigate(`/tasks/${taskId}/console`, { replace: true });
    }
  }, [routeId, taskId, navigate]);

  const { data: task, isLoading: taskLoading } = useTask(taskId);
  const { data: steps } = useTaskSteps(taskId);
  const { data: messages } = useExecutionMessages(taskId);
  const { data: agents } = useAgents();

  const createMessage = useCreateExecutionMessage();
  const updateStatus = useUpdateTaskStatus();

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const streamRef = useRef<HTMLDivElement>(null);
  const prevMsgCount = useRef(0);

  useEffect(() => {
    if (messages && messages.length > prevMsgCount.current && streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
    prevMsgCount.current = messages?.length ?? 0;
  }, [messages]);

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

  const statusBadge = task ? taskStatusToBadge(task.status) : null;

  const [elapsed, setElapsed] = useState("00:00:00");
  useEffect(() => {
    if (!task) return;
    if (task.status !== "running") {
      setElapsed(formatDuration(task.created_at, task.completed_at ?? task.updated_at));
      return;
    }
    const tick = () => setElapsed(formatDuration(task.created_at));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [task]);

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
    updateStatus.mutate({
      taskId,
      status: isPaused ? "running" : "paused",
    });
  }

  function handleTerminate() {
    if (!taskId) return;
    updateStatus.mutate({ taskId, status: "failed" });
  }

  if (!routeId && (!runningTasks || runningTasks.length === 0) && !taskLoading) {
    return (
      <div className="-m-6 flex h-[calc(100vh-var(--topbar-height))] items-center justify-center bg-bg/30">
        <EmptyState
          icon={Monitor}
          title="没有正在执行的任务"
          description="从任务中心启动一个任务后，执行过程将在这里实时展示"
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

  const tokenProgress = task.total_tokens && task.timeout_minutes
    ? Math.min(100, Math.round((task.total_tokens / (task.timeout_minutes * 10000)) * 100))
    : task.total_tokens
      ? Math.min(100, Math.round((task.total_tokens / 50000) * 100))
      : 0;

  const showTyping = isRunning && messages && messages.length > 0 && messages[messages.length - 1].sender_type === "agent";

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
        <div className="px-4 py-2.5 border-b border-border-light flex items-center gap-2 bg-surface/80 backdrop-blur-sm">
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
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-[0.8rem] font-medium text-text truncate">{task.title}</span>
            {statusBadge && <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>}
          </div>
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:bg-bg-alt hover:text-text transition-colors cursor-pointer" title="导出">
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
                    <p className="text-[0.78rem] text-text-secondary leading-relaxed">{table ? "" : msg.content}</p>
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
                  </div>
                </div>
              </div>
            );
          })}

          {showTyping && (
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
              value: `${(task.total_tokens ?? 0).toLocaleString()} / 50,000`,
              iconColor: "text-sage",
              iconBg: "bg-sage-light",
              progress: tokenProgress,
            },
            {
              icon: DollarSign,
              label: "预估费用",
              value: `¥${(task.total_cost ?? 0).toFixed(2)}`,
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
