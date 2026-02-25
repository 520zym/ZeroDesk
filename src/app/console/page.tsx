import { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import { Avatar, Badge, ProgressBar } from "@/components/ui";
import { cn } from "@/lib/utils";

const AGENTS = [
  { id: "ag1", char: "检", color: "bg-primary", name: "信息检索员", role: "数据采集", status: "done" as const, tokens: 1247, responseTime: "12s" },
  { id: "ag2", char: "析", color: "bg-sage", name: "分析师", role: "对比分析", status: "active" as const, tokens: 1832, responseTime: "18s" },
  { id: "ag3", char: "撰", color: "bg-lavender", name: "撰写员", role: "报告生成", status: "waiting" as const, tokens: 0, responseTime: "-" },
  { id: "ag4", char: "审", color: "bg-coral", name: "审查员", role: "质量审查", status: "waiting" as const, tokens: 0, responseTime: "-" },
];

const AGENT_STATUS_STYLE = {
  done: { dot: "bg-success", ring: "ring-success/20" },
  active: { dot: "bg-primary animate-pulse", ring: "ring-primary/20" },
  waiting: { dot: "bg-border", ring: "ring-border/20" },
};

type MsgType = "system" | "agent" | "typing";

interface Message {
  id: string;
  type: MsgType;
  agent?: { char: string; color: string; name: string };
  content: string;
  time?: string;
  table?: { headers: string[]; rows: string[][] };
}

const MOCK_MESSAGES: Message[] = [
  { id: "m1", type: "system", content: "任务开始执行", time: "14:23:01" },
  { id: "m2", type: "system", content: "节点 1：信息收集 开始", time: "14:23:02" },
  {
    id: "m3",
    type: "agent",
    agent: { char: "检", color: "bg-primary", name: "信息检索员" },
    content: "正在从 Cursor 官方文档和 GitHub 仓库中提取核心功能列表...",
    time: "14:23:05",
  },
  {
    id: "m4",
    type: "agent",
    agent: { char: "检", color: "bg-primary", name: "信息检索员" },
    content: "已完成三款工具的基础数据采集，共获取 47 个特征维度，正在进行数据清洗和格式化...",
    time: "14:24:18",
  },
  { id: "m5", type: "system", content: "节点 1 完成 ✓ — 用时 1 分 23 秒", time: "14:24:24" },
  { id: "m6", type: "system", content: "节点 2：多维度对比分析 开始", time: "14:24:25" },
  {
    id: "m7",
    type: "agent",
    agent: { char: "析", color: "bg-sage", name: "分析师" },
    content: "收到数据集，开始按维度构建对比矩阵。初步分析三款工具各有优势领域：",
    time: "14:24:30",
    table: {
      headers: ["维度", "Cursor", "Copilot", "Windsurf"],
      rows: [
        ["代码补全", "⭐⭐⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐⭐"],
        ["多文件编辑", "⭐⭐⭐⭐⭐", "⭐⭐⭐", "⭐⭐⭐⭐"],
        ["上下文理解", "⭐⭐⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐⭐⭐"],
        ["定价", "$$", "$", "$$$"],
      ],
    },
  },
  {
    id: "m8",
    type: "agent",
    agent: { char: "析", color: "bg-sage", name: "分析师" },
    content: "",
    time: "14:25:35",
  },
];

const NODES = [
  { id: "n1", label: "信息收集", status: "done" as const },
  { id: "n2", label: "对比分析", status: "active" as const },
  { id: "n3", label: "报告撰写", status: "pending" as const },
  { id: "n4", label: "质量审查", status: "pending" as const },
];

const NODE_STYLE = {
  done: { dot: "bg-success", text: "text-text" },
  active: { dot: "bg-primary animate-pulse", text: "text-primary font-medium" },
  pending: { dot: "bg-border", text: "text-text-muted" },
};

export default function ConsolePage() {
  const [selectedAgent, setSelectedAgent] = useState("ag2");
  const [isPaused, setIsPaused] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, []);

  return (
    <div className="-m-6 flex h-[calc(100vh-var(--topbar-height))]">
      {/* Left column — Agent panel */}
      <div className="w-[210px] border-r border-border-light bg-surface flex flex-col shrink-0">
        <div className="px-4 pt-4 pb-3">
          <h3 className="text-[0.82rem] font-semibold text-text">参与 Agent</h3>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
          {AGENTS.map((agent, i) => {
            const style = AGENT_STATUS_STYLE[agent.status];
            const isSelected = selectedAgent === agent.id;
            return (
              <div
                key={agent.id}
                onClick={() => setSelectedAgent(agent.id)}
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
                      <div className="text-[0.68rem] font-mono font-medium text-text">{agent.responseTime}</div>
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
              onClick={() => setIsPaused(!isPaused)}
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
            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:bg-danger-light hover:text-danger transition-colors cursor-pointer" title="终止">
              <Square size={14} />
            </button>
          </div>
          <div className="h-4 w-px bg-border-light mx-1" />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-[0.8rem] font-medium text-text truncate">竞品分析：AI 编程工具对比</span>
            <Badge variant="running">执行中</Badge>
          </div>
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:bg-bg-alt hover:text-text transition-colors cursor-pointer" title="导出">
            <Download size={14} />
          </button>
        </div>

        {/* Message stream */}
        <div ref={streamRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-bg/30">
          {MOCK_MESSAGES.map((msg, i) => {
            if (msg.type === "system") {
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
                    {msg.time && <span className="text-text-muted/60 ml-1">{msg.time}</span>}
                  </span>
                  <div className="h-px flex-1 bg-border-light/60" />
                </div>
              );
            }

            const isTyping = msg.type === "agent" && msg.content === "";

            return (
              <div
                key={msg.id}
                className="flex items-start gap-3 max-w-[680px]"
                style={{ animation: `fade-in 0.25s ease ${i * 0.04}s both` }}
              >
                <Avatar char={msg.agent!.char} color={msg.agent!.color} size="sm" className="mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[0.75rem] font-medium text-text">{msg.agent!.name}</span>
                    {msg.time && <span className="text-[0.62rem] text-text-muted">{msg.time}</span>}
                  </div>
                  <div className="bg-surface rounded-xl rounded-tl-sm px-4 py-3 border border-border-light">
                    {isTyping ? (
                      <div className="flex items-center gap-1.5 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-text-muted" style={{ animation: "pulse-dot 1.2s ease-in-out infinite" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-text-muted" style={{ animation: "pulse-dot 1.2s ease-in-out 0.2s infinite" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-text-muted" style={{ animation: "pulse-dot 1.2s ease-in-out 0.4s infinite" }} />
                      </div>
                    ) : (
                      <>
                        <p className="text-[0.78rem] text-text-secondary leading-relaxed">{msg.content}</p>
                        {msg.table && (
                          <div className="mt-3 overflow-x-auto">
                            <table className="w-full text-[0.72rem] border-collapse">
                              <thead>
                                <tr>
                                  {msg.table.headers.map((h) => (
                                    <th key={h} className="text-left px-2.5 py-1.5 bg-bg-alt text-text-muted font-medium border-b border-border-light first:rounded-tl-md last:rounded-tr-md">
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {msg.table.rows.map((row, ri) => (
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
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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
                  setInputValue("");
                }
              }}
            />
            <button
              onClick={() => setInputValue("")}
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
          {/* Metric cards */}
          {[
            { icon: Clock, label: "总耗时", value: "00:02:34", iconColor: "text-primary", iconBg: "bg-primary-light" },
            { icon: Cpu, label: "Token 消耗", value: "3,847 / 50,000", iconColor: "text-sage", iconBg: "bg-sage-light", progress: Math.round((3847 / 50000) * 100) },
            { icon: DollarSign, label: "预估费用", value: "¥0.42", iconColor: "text-sand", iconBg: "bg-sand-light" },
            { icon: GitBranch, label: "节点进度", value: "1 / 4", iconColor: "text-lavender", iconBg: "bg-lavender-light" },
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
              {NODES.map((node, i) => {
                const style = NODE_STYLE[node.status];
                return (
                  <div key={node.id} className="relative flex items-center gap-2.5 py-1.5">
                    {/* Connector line */}
                    {i < NODES.length - 1 && (
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
