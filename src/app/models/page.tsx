import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Search,
  Filter,
  Settings,
  Zap,
  Star,
  ArrowDown,
  ChevronDown,
  Circle,
  AlertTriangle,
  Eye,
  EyeOff,
  Key,
  Brain,
  Sparkles,
  ShieldCheck,
  FileText,
  Globe,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressBar, Modal, Toggle } from "@/components/ui";

const PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    icon: "O",
    iconBg: "bg-[#10A37F]",
    status: "online" as const,
    statusLabel: "在线",
    latency: "98ms",
    models: 6,
    balance: "余额 $142.50",
    apiKey: "sk-proj-****...****7xKa",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    icon: "A",
    iconBg: "bg-[#D4A574]",
    status: "online" as const,
    statusLabel: "在线",
    latency: "125ms",
    models: 4,
    balance: "余额 $86.20",
    apiKey: "sk-ant-****...****9mBq",
  },
  {
    id: "aliyun",
    name: "阿里云百炼",
    icon: "阿",
    iconBg: "bg-[#FF6A00]",
    status: "degraded" as const,
    statusLabel: "降级",
    latency: "210ms",
    models: 3,
    balance: "余额 ¥500",
    apiKey: "sk-ali-****...****3nPw",
  },
];

const MODELS = [
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    quality: 5,
    speed: "fast",
    speedLabel: "快速",
    speedBg: "bg-sage-light text-[#5a7a6b]",
    price: "$5.00",
    status: "available" as const,
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o-mini",
    provider: "OpenAI",
    quality: 3,
    speed: "ultra",
    speedLabel: "极速",
    speedBg: "bg-lavender-light text-[#6f5f80]",
    price: "$0.15",
    status: "available" as const,
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    quality: 5,
    speed: "medium",
    speedLabel: "中速",
    speedBg: "bg-info-light text-primary-active",
    price: "$3.00",
    status: "available" as const,
  },
  {
    id: "anthropic/claude-3-haiku",
    name: "Claude 3 Haiku",
    provider: "Anthropic",
    quality: 3,
    speed: "ultra",
    speedLabel: "极速",
    speedBg: "bg-lavender-light text-[#6f5f80]",
    price: "$0.25",
    status: "available" as const,
  },
  {
    id: "aliyun/qwen-turbo",
    name: "Qwen-Turbo",
    provider: "阿里云百炼",
    quality: 3,
    speed: "fast",
    speedLabel: "快速",
    speedBg: "bg-sage-light text-[#5a7a6b]",
    price: "¥2.00",
    status: "available" as const,
  },
  {
    id: "aliyun/qwen-max",
    name: "Qwen-Max",
    provider: "阿里云百炼",
    quality: 4,
    speed: "medium",
    speedLabel: "中速",
    speedBg: "bg-info-light text-primary-active",
    price: "¥6.00",
    status: "offline" as const,
  },
];

const FALLBACK_CHAIN = [
  { name: "GPT-4o", role: "主力", bg: "bg-primary-light", border: "border-primary/20", text: "text-primary-active" },
  { name: "Claude 3.5", role: "对等备选", bg: "bg-sage-light", border: "border-sage/20", text: "text-[#5a7a6b]" },
  { name: "Qwen-Turbo", role: "降级", bg: "bg-sand-light", border: "border-sand/20", text: "text-[#92700c]" },
];

const FALLBACK_ARROWS = ["失败/超时", "继续失败"];

const statusDot: Record<string, string> = {
  online: "bg-success",
  degraded: "bg-warning",
  offline: "bg-danger",
};

const statusTextColor: Record<string, string> = {
  online: "text-success",
  degraded: "text-warning",
  offline: "text-danger",
};

function Stars({ count }: { count: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={12}
          className={i < count ? "text-sand fill-sand" : "text-border"}
          strokeWidth={2}
        />
      ))}
    </span>
  );
}

const SYSTEM_MODEL_TASKS = [
  { id: "planning", label: "任务规划", desc: "将用户目标拆解为可执行的子任务", icon: Brain, model: "openai/gpt-4o" },
  { id: "prompt", label: "Prompt 优化", desc: "自动优化 Agent 的系统提示词", icon: Sparkles, model: "anthropic/claude-3.5-sonnet" },
  { id: "quality", label: "质量评审", desc: "校验 Agent 输出的准确性与完整性", icon: ShieldCheck, model: "openai/gpt-4o" },
  { id: "summary", label: "智能摘要", desc: "任务完成后自动生成执行报告", icon: FileText, model: "aliyun/qwen-turbo" },
];

const PROVIDER_PRESETS = [
  { id: "openai", name: "OpenAI", icon: "O", iconBg: "bg-[#10A37F]", baseUrl: "https://api.openai.com/v1" },
  { id: "anthropic", name: "Anthropic", icon: "A", iconBg: "bg-[#D4A574]", baseUrl: "https://api.anthropic.com" },
  { id: "aliyun", name: "阿里云百炼", icon: "阿", iconBg: "bg-[#FF6A00]", baseUrl: "https://dashscope.aliyuncs.com" },
  { id: "deepseek", name: "DeepSeek", icon: "D", iconBg: "bg-[#4D6BFE]", baseUrl: "https://api.deepseek.com/v1" },
  { id: "moonshot", name: "Moonshot (Kimi)", icon: "M", iconBg: "bg-[#1A1A2E]", baseUrl: "https://api.moonshot.cn/v1" },
  { id: "zhipu", name: "智谱 AI", icon: "智", iconBg: "bg-[#3B5998]", baseUrl: "https://open.bigmodel.cn/api" },
];

export default function ModelsPage() {
  const [search, setSearch] = useState("");
  const [retries, setRetries] = useState("3");
  const [backoff, setBackoff] = useState("exponential");
  const [overBudget, setOverBudget] = useState("downgrade");
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [systemModels, setSystemModels] = useState<Record<string, string>>(
    Object.fromEntries(SYSTEM_MODEL_TASKS.map((t) => [t.id, t.model])),
  );
  const [addOpen, setAddOpen] = useState(false);
  const [addSelected, setAddSelected] = useState<string | null>(null);
  const [addApiKey, setAddApiKey] = useState("");
  const [addBaseUrl, setAddBaseUrl] = useState("");
  const [addCustomName, setAddCustomName] = useState("");
  const [addAutoDetect, setAddAutoDetect] = useState(true);

  const filteredModels = MODELS.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.provider.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      {/* Header */}
      <div
        className="flex items-center justify-between mb-6"
        style={{ animation: "fade-in 0.25s ease-out" }}
      >
        <p className="text-[0.82rem] text-text-secondary">管理模型供应商、模型池与调度策略</p>
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[0.82rem] font-medium bg-gradient-to-r from-primary to-lavender text-white border-none cursor-pointer transition-all hover:shadow-glow shadow-sm"
        >
          <Plus size={15} strokeWidth={2.5} />
          添加供应商
        </button>
      </div>

      {/* Provider cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        {PROVIDERS.map((p, i) => (
          <div
            key={p.name}
            className="bg-surface rounded-xl border border-border-light p-4 transition-all hover:shadow-card-hover hover:border-border-hover group"
            style={{ animation: `fade-in 0.3s ease-out ${i * 0.06}s both` }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-[0.85rem] shrink-0",
                  p.iconBg,
                )}
              >
                {p.icon}
              </div>
              <div className="min-w-0">
                <div className="text-[0.88rem] font-semibold text-text truncate">
                  {p.name}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      statusDot[p.status],
                      p.status === "online" &&
                        "animate-[pulse-dot_2s_ease-in-out_infinite]",
                    )}
                  />
                  <span
                    className={cn(
                      "text-[0.72rem] font-medium",
                      statusTextColor[p.status],
                    )}
                  >
                    {p.statusLabel}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-1.5 mb-3">
              <div className="flex items-center justify-between text-[0.75rem]">
                <span className="text-text-muted">延迟</span>
                <span className="text-text-secondary font-mono">
                  {p.latency}
                </span>
              </div>
              <div className="flex items-center justify-between text-[0.75rem]">
                <span className="text-text-muted">模型数</span>
                <span className="text-text-secondary font-mono">
                  {p.models}
                </span>
              </div>
              <div className="flex items-center justify-between text-[0.75rem]">
                <span className="text-text-muted">
                  {p.balance.split(" ")[0]}
                </span>
                <span className="text-text font-semibold font-mono text-[0.78rem]">
                  {p.balance.split(" ")[1]}
                </span>
              </div>
            </div>
            {/* API Key */}
            <div className="flex items-center gap-1.5 mb-3 px-2.5 py-2 rounded-lg bg-bg/80 border border-border-light/60">
              <Key size={11} className="text-text-muted shrink-0" />
              <span className="text-[0.68rem] text-text-muted font-mono truncate flex-1">
                {showKeys[p.id] ? "sk-real-key-would-be-here" : p.apiKey}
              </span>
              <button
                onClick={() => setShowKeys((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                className="w-5 h-5 flex items-center justify-center rounded text-text-muted hover:text-text transition-colors cursor-pointer shrink-0"
              >
                {showKeys[p.id] ? <EyeOff size={11} /> : <Eye size={11} />}
              </button>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-[0.75rem] font-medium bg-bg-alt text-text-secondary hover:text-text hover:bg-bg-deep transition-colors cursor-pointer border-none">
                <Settings size={12} />
                配置
              </button>
              <button className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-[0.75rem] font-medium bg-bg-alt text-text-secondary hover:text-text hover:bg-bg-deep transition-colors cursor-pointer border-none">
                <Zap size={12} />
                测试
              </button>
            </div>
          </div>
        ))}

        {/* Add provider card */}
        <div
          onClick={() => setAddOpen(true)}
          className="rounded-xl border-2 border-dashed border-border p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:border-primary/40 hover:bg-primary-light/30 group min-h-[180px]"
          style={{
            animation: `fade-in 0.3s ease-out ${PROVIDERS.length * 0.06}s both`,
          }}
        >
          <div className="w-10 h-10 rounded-xl bg-bg-alt flex items-center justify-center group-hover:bg-primary-light transition-colors">
            <Plus
              size={20}
              className="text-text-muted group-hover:text-primary transition-colors"
            />
          </div>
          <span className="text-[0.82rem] font-medium text-text-muted group-hover:text-primary transition-colors">
            添加供应商
          </span>
        </div>
      </div>

      {/* System Models */}
      <div
        className="bg-surface rounded-xl border border-border-light shadow-card mb-6"
        style={{ animation: "fade-in 0.35s ease-out 0.12s both" }}
      >
        <div className="px-5 py-3.5 border-b border-border-light flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-lavender to-primary flex items-center justify-center">
              <Zap size={13} className="text-white" />
            </div>
            <h3 className="text-[0.95rem] font-semibold text-text">系统内置模型</h3>
          </div>
          <span className="text-[0.72rem] text-text-muted">系统编排引擎使用的模型，不同于 Agent 执行模型</span>
        </div>
        <div className="divide-y divide-border-light/60">
          {SYSTEM_MODEL_TASKS.map((task) => (
            <div key={task.id} className="px-5 py-3.5 flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-bg-alt flex items-center justify-center shrink-0">
                <task.icon size={16} className="text-text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.84rem] font-medium text-text">{task.label}</div>
                <div className="text-[0.72rem] text-text-muted mt-0.5">{task.desc}</div>
              </div>
              <ModelPicker
                value={systemModels[task.id]}
                onChange={(id) => setSystemModels((prev) => ({ ...prev, [task.id]: id }))}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Agent Model Pool Table */}
      <div
        className="bg-surface rounded-xl border border-border-light shadow-card mb-6 overflow-hidden"
        style={{ animation: "fade-in 0.35s ease-out 0.15s both" }}
      >
        <div className="px-5 py-3.5 border-b border-border-light flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-[0.95rem] font-semibold text-text">Agent 模型池</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              />
              <input
                type="text"
                placeholder="搜索模型..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-bg text-[0.8rem] text-text border border-border-light focus:border-primary/40 focus:outline-none w-52 transition-colors placeholder:text-text-muted"
              />
            </div>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.78rem] font-medium bg-bg text-text-secondary border border-border-light hover:border-border-hover hover:text-text transition-colors cursor-pointer">
              <Filter size={13} />
              筛选
            </button>
          </div>
        </div>

        {/* Table header */}
        <div className="px-5 py-2.5 border-b border-border-light flex items-center gap-3 text-[0.72rem] font-medium text-text-muted uppercase tracking-wider">
          <span className="flex-1 min-w-[140px]">模型名称</span>
          <span className="w-24">供应商</span>
          <span className="w-24 text-center">质量评分</span>
          <span className="w-20 text-center">速度档位</span>
          <span className="w-24 text-right">价格 /M tokens</span>
          <span className="w-16 text-center">状态</span>
        </div>

        {/* Table rows */}
        {filteredModels.map((m, i) => (
          <div
            key={m.id}
            className="px-5 py-3 flex items-center gap-3 border-b border-border-light/50 last:border-b-0 hover:bg-bg/50 transition-colors cursor-pointer group"
            style={{ animation: `fade-in 0.2s ease-out ${i * 0.04}s both` }}
          >
            <div className="flex-1 min-w-[140px]">
              <span className="text-[0.84rem] font-medium text-text group-hover:text-primary transition-colors">
                {m.name}
              </span>
            </div>
            <div className="w-24 text-[0.78rem] text-text-secondary">
              {m.provider}
            </div>
            <div className="w-24 flex justify-center">
              <Stars count={m.quality} />
            </div>
            <div className="w-20 flex justify-center">
              <span
                className={cn(
                  "inline-flex px-2 py-0.5 rounded-full text-[0.7rem] font-medium",
                  m.speedBg,
                )}
              >
                {m.speedLabel}
              </span>
            </div>
            <div className="w-24 text-right text-[0.8rem] text-text font-mono">
              {m.price}
            </div>
            <div className="w-16 flex justify-center">
              {m.status === "available" ? (
                <span className="inline-flex items-center gap-1 text-[0.72rem] font-medium text-success">
                  <Circle size={6} className="fill-success" strokeWidth={0} />
                  可用
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[0.72rem] font-medium text-text-muted">
                  <Circle
                    size={6}
                    className="fill-text-muted"
                    strokeWidth={0}
                  />
                  离线
                </span>
              )}
            </div>
          </div>
        ))}

        {filteredModels.length === 0 && (
          <div className="px-5 py-10 text-center text-[0.82rem] text-text-muted">
            没有找到匹配的模型
          </div>
        )}
      </div>

      {/* Routing section */}
      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        style={{ animation: "fade-in 0.35s ease-out 0.2s both" }}
      >
        {/* Fallback Chain */}
        <div className="bg-surface rounded-xl border border-border-light p-5 shadow-card">
          <h3 className="text-[0.95rem] font-semibold text-text mb-4">
            Fallback 链
          </h3>
          <div className="flex flex-col items-center gap-0">
            {FALLBACK_CHAIN.map((node, idx) => (
              <div key={node.name} className="w-full flex flex-col items-center">
                {/* Node */}
                <div
                  className={cn(
                    "w-full rounded-xl border p-3.5 flex items-center gap-3 transition-all",
                    node.bg,
                    node.border,
                  )}
                  style={{
                    animation: `fade-in 0.3s ease-out ${0.1 + idx * 0.1}s both`,
                  }}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-[0.72rem] font-bold",
                      node.bg,
                      node.text,
                    )}
                    style={{
                      backgroundColor: "rgba(255,255,255,0.6)",
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <div className={cn("text-[0.84rem] font-semibold", node.text)}>
                      {node.name}
                    </div>
                    <div className="text-[0.72rem] text-text-muted">
                      {node.role}
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                {idx < FALLBACK_CHAIN.length - 1 && (
                  <div className="flex flex-col items-center py-1.5">
                    <div className="w-px h-3 bg-border" />
                    <div className="flex items-center gap-1.5 py-0.5">
                      <ArrowDown size={12} className="text-text-muted" />
                      <span className="text-[0.68rem] text-text-muted font-medium">
                        {FALLBACK_ARROWS[idx]}
                      </span>
                    </div>
                    <div className="w-px h-3 bg-border" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Fault tolerance settings */}
        <div className="bg-surface rounded-xl border border-border-light p-5 shadow-card">
          <h3 className="text-[0.95rem] font-semibold text-text mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-warning" />
            容错设置
          </h3>
          <div className="space-y-4">
            {/* Retries */}
            <div className="flex items-center justify-between">
              <label className="text-[0.82rem] text-text-secondary font-medium">
                重试次数
              </label>
              <div className="relative">
                <select
                  value={retries}
                  onChange={(e) => setRetries(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-1.5 rounded-lg bg-bg text-[0.8rem] text-text border border-border-light focus:border-primary/40 focus:outline-none cursor-pointer transition-colors"
                >
                  <option value="3">3 次</option>
                  <option value="2">2 次</option>
                  <option value="1">1 次</option>
                  <option value="0">不重试</option>
                </select>
                <ChevronDown
                  size={12}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                />
              </div>
            </div>

            {/* Backoff strategy */}
            <div className="flex items-center justify-between">
              <label className="text-[0.82rem] text-text-secondary font-medium">
                回退策略
              </label>
              <div className="relative">
                <select
                  value={backoff}
                  onChange={(e) => setBackoff(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-1.5 rounded-lg bg-bg text-[0.8rem] text-text border border-border-light focus:border-primary/40 focus:outline-none cursor-pointer transition-colors"
                >
                  <option value="exponential">指数退避</option>
                  <option value="linear">线性</option>
                  <option value="fixed">固定间隔</option>
                </select>
                <ChevronDown
                  size={12}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                />
              </div>
            </div>

            {/* Token budget */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[0.82rem] text-text-secondary font-medium">
                  Token 预算
                </label>
                <span className="text-[0.78rem] text-text font-mono font-semibold">
                  100,000
                </span>
              </div>
              <ProgressBar value={62} variant="primary" size="sm" />
              <div className="flex justify-between mt-1">
                <span className="text-[0.68rem] text-text-muted">
                  已用 62,000
                </span>
                <span className="text-[0.68rem] text-text-muted">
                  剩余 38,000
                </span>
              </div>
            </div>

            {/* Over budget */}
            <div className="flex items-center justify-between">
              <label className="text-[0.82rem] text-text-secondary font-medium">
                超预算处理
              </label>
              <div className="relative">
                <select
                  value={overBudget}
                  onChange={(e) => setOverBudget(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-1.5 rounded-lg bg-bg text-[0.8rem] text-text border border-border-light focus:border-primary/40 focus:outline-none cursor-pointer transition-colors"
                >
                  <option value="downgrade">降级确认</option>
                  <option value="reject">直接拒绝</option>
                </select>
                <ChevronDown
                  size={12}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Provider Modal */}
      <Modal
        open={addOpen}
        onClose={() => { setAddOpen(false); setAddSelected(null); setAddApiKey(""); setAddBaseUrl(""); setAddCustomName(""); }}
        title="添加模型供应商"
        width="560px"
      >
        <div className="space-y-5">
          {/* Preset grid */}
          <div>
            <label className="block text-[0.78rem] font-medium text-text mb-2.5">
              选择供应商
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PROVIDER_PRESETS.map((preset) => {
                const exists = PROVIDERS.some((p) => p.id === preset.id);
                const selected = addSelected === preset.id;
                return (
                  <button
                    key={preset.id}
                    disabled={exists}
                    onClick={() => {
                      setAddSelected(preset.id);
                      setAddBaseUrl(preset.baseUrl);
                      setAddCustomName("");
                    }}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all cursor-pointer",
                      exists
                        ? "border-border-light bg-bg-alt opacity-50 cursor-not-allowed"
                        : selected
                          ? "border-primary bg-primary-light"
                          : "border-border-light bg-surface hover:border-primary/40"
                    )}
                  >
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-[0.75rem] shrink-0", preset.iconBg)}>
                      {preset.icon}
                    </div>
                    <div className="min-w-0">
                      <div className={cn("text-[0.8rem] font-medium truncate", selected ? "text-primary" : "text-text")}>
                        {preset.name}
                      </div>
                      {exists && <div className="text-[0.65rem] text-text-muted">已添加</div>}
                    </div>
                  </button>
                );
              })}
              {/* Custom option */}
              <button
                onClick={() => {
                  setAddSelected("custom");
                  setAddBaseUrl("");
                  setAddCustomName("");
                }}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all cursor-pointer",
                  addSelected === "custom"
                    ? "border-primary bg-primary-light"
                    : "border-dashed border-border hover:border-primary/40"
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-bg-alt flex items-center justify-center shrink-0">
                  <Globe size={16} className={addSelected === "custom" ? "text-primary" : "text-text-muted"} />
                </div>
                <div className="text-[0.8rem] font-medium text-text">
                  自定义
                </div>
              </button>
            </div>
          </div>

          {/* Configuration fields */}
          {addSelected && (
            <div className="space-y-4" style={{ animation: "fade-in 0.2s ease-out" }}>
              {addSelected === "custom" && (
                <div>
                  <label className="block text-[0.78rem] font-medium text-text mb-1.5">
                    供应商名称
                  </label>
                  <input
                    type="text"
                    value={addCustomName}
                    onChange={(e) => setAddCustomName(e.target.value)}
                    placeholder="如：Azure OpenAI"
                    className={cn(
                      "w-full rounded-lg border border-border-light bg-bg px-3 py-2",
                      "text-[0.8rem] text-text placeholder:text-text-muted",
                      "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                    )}
                  />
                </div>
              )}
              <div>
                <label className="block text-[0.78rem] font-medium text-text mb-1.5">
                  API Key
                </label>
                <input
                  type="password"
                  value={addApiKey}
                  onChange={(e) => setAddApiKey(e.target.value)}
                  placeholder="sk-..."
                  className={cn(
                    "w-full rounded-lg border border-border-light bg-bg px-3 py-2",
                    "text-[0.8rem] text-text font-mono placeholder:text-text-muted",
                    "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                  )}
                />
              </div>
              <div>
                <label className="block text-[0.78rem] font-medium text-text mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Link2 size={13} />
                    Base URL
                  </span>
                </label>
                <input
                  type="text"
                  value={addBaseUrl}
                  onChange={(e) => setAddBaseUrl(e.target.value)}
                  placeholder="https://api.example.com/v1"
                  className={cn(
                    "w-full rounded-lg border border-border-light bg-bg px-3 py-2",
                    "text-[0.8rem] text-text font-mono placeholder:text-text-muted",
                    "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                  )}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border-light px-3 py-2.5">
                <div>
                  <div className="text-[0.78rem] font-medium text-text">自动检测可用模型</div>
                  <div className="text-[0.68rem] text-text-muted mt-0.5">连接后自动拉取供应商支持的模型列表</div>
                </div>
                <Toggle checked={addAutoDetect} onChange={setAddAutoDetect} />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              onClick={() => { setAddOpen(false); setAddSelected(null); setAddApiKey(""); setAddBaseUrl(""); setAddCustomName(""); }}
              className="px-4 py-2 rounded-lg text-[0.8rem] font-medium text-text-secondary hover:text-text hover:bg-bg-alt transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              disabled={!addSelected || !addApiKey}
              className={cn(
                "px-5 py-2 rounded-lg text-[0.8rem] font-medium transition-colors cursor-pointer shadow-sm",
                addSelected && addApiKey
                  ? "bg-primary text-white hover:bg-primary-hover active:bg-primary-active"
                  : "bg-bg-alt text-text-muted cursor-not-allowed"
              )}
            >
              连接并添加
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ModelPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
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
        ? { position: "fixed", bottom: window.innerHeight - rect.top + 6, right: window.innerWidth - rect.right, maxHeight: Math.min(320, rect.top - 20) }
        : { position: "fixed", top: rect.bottom + 6, right: window.innerWidth - rect.right, maxHeight: Math.min(320, spaceBelow - 20) }
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const handleToggle = () => {
    if (!open) updatePosition();
    setOpen((v) => !v);
  };

  const selected = MODELS.find((m) => m.id === value);
  const provider = selected ? PROVIDERS.find((p) => p.name === selected.provider) : null;

  return (
    <>
      <button
        ref={triggerRef}
        onClick={handleToggle}
        className={cn(
          "flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg border transition-all cursor-pointer shrink-0",
          open ? "border-primary bg-primary-light/40" : "border-border-light bg-bg hover:border-border-hover"
        )}
      >
        {provider && (
          <span className={cn("w-5 h-5 rounded flex items-center justify-center text-white text-[0.6rem] font-bold shrink-0", provider.iconBg)}>
            {provider.icon}
          </span>
        )}
        <span className="text-[0.78rem] font-medium text-text">{selected?.name ?? "选择模型"}</span>
        <ChevronDown size={12} className={cn("text-text-muted transition-transform", open && "rotate-180")} />
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          className="w-[260px] bg-surface border border-border-light rounded-xl shadow-xl z-[9999] overflow-y-auto overscroll-contain"
          style={{ ...style, animation: "scale-in 0.15s ease-out" }}
          onWheel={(e) => e.stopPropagation()}
        >
          {PROVIDERS.map((p) => {
            const providerModels = MODELS.filter((m) => m.provider === p.name && m.status === "available");
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
                      onClick={() => { onChange(m.id); setOpen(false); }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors cursor-pointer",
                        isSelected ? "bg-primary-light" : "hover:bg-bg-alt"
                      )}
                    >
                      <span className={cn("w-5 h-5 rounded flex items-center justify-center text-white text-[0.55rem] font-bold shrink-0", p.iconBg)}>
                        {p.icon}
                      </span>
                      <span className={cn("text-[0.78rem] flex-1", isSelected ? "font-semibold text-primary" : "text-text")}>
                        {m.name}
                      </span>
                      <span className="text-[0.65rem] text-text-muted font-mono">{m.price}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}
