import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/ui";

const PROVIDERS = [
  {
    name: "OpenAI",
    icon: "O",
    iconBg: "bg-[#10A37F]",
    status: "online" as const,
    statusLabel: "在线",
    latency: "98ms",
    models: 6,
    balance: "余额 $142.50",
  },
  {
    name: "Anthropic",
    icon: "A",
    iconBg: "bg-[#D4A574]",
    status: "online" as const,
    statusLabel: "在线",
    latency: "125ms",
    models: 4,
    balance: "余额 $86.20",
  },
  {
    name: "阿里云百炼",
    icon: "阿",
    iconBg: "bg-[#FF6A00]",
    status: "degraded" as const,
    statusLabel: "降级",
    latency: "210ms",
    models: 3,
    balance: "余额 ¥500",
  },
];

const MODELS = [
  {
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

export default function ModelsPage() {
  const [search, setSearch] = useState("");
  const [retries, setRetries] = useState("3");
  const [backoff, setBackoff] = useState("exponential");
  const [overBudget, setOverBudget] = useState("downgrade");

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
        <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[0.82rem] font-medium bg-gradient-to-r from-primary to-lavender text-white border-none cursor-pointer transition-all hover:shadow-glow shadow-sm">
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

      {/* Model Pool Table */}
      <div
        className="bg-surface rounded-xl border border-border-light shadow-card mb-6 overflow-hidden"
        style={{ animation: "fade-in 0.35s ease-out 0.15s both" }}
      >
        <div className="px-5 py-3.5 border-b border-border-light flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-[0.95rem] font-semibold text-text">模型池</h3>
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
            key={m.name}
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
    </div>
  );
}
