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
  Loader2,
  Check,
  X,
  Download,
  Users,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressBar, Modal, Toggle } from "@/components/ui";
import {
  useProviders,
  useCreateProvider,
  useUpdateProvider,
  useDeleteProvider,
  useWorkspaceModels,
  useFallbackChain,
  useResiliencePolicy,
  useUpdateResiliencePolicy,
  useModels,
  useToggleProviderEnabled,
  useTestProviderConnection,
  useFetchProviderModels,
  useToggleModelEnabled,
  useBatchToggleModels,
  useSystemModelAssignments,
  useSetSystemModelAssignment,
} from "@/hooks/useModels";
import type { ModelProvider, Model, TestConnectionResult } from "@/types";

const SPEED_TIER_MAP: Record<string, { label: string; bg: string }> = {
  slow: { label: "较慢", bg: "bg-coral-light text-[#9a7058]" },
  medium: { label: "中速", bg: "bg-info-light text-primary-active" },
  fast: { label: "快速", bg: "bg-sage-light text-[#5a7a6b]" },
  ultra: { label: "极速", bg: "bg-lavender-light text-[#6f5f80]" },
};

const STATUS_LABEL: Record<string, string> = {
  online: "在线",
  degraded: "降级",
  offline: "离线",
  unknown: "未知",
};

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

const ROLE_STYLE: Record<
  string,
  { label: string; bg: string; border: string; text: string }
> = {
  primary: {
    label: "主力",
    bg: "bg-primary-light",
    border: "border-primary/20",
    text: "text-primary-active",
  },
  peer: {
    label: "对等备选",
    bg: "bg-sage-light",
    border: "border-sage/20",
    text: "text-[#5a7a6b]",
  },
  downgrade: {
    label: "降级",
    bg: "bg-sand-light",
    border: "border-sand/20",
    text: "text-[#92700c]",
  },
};

const FALLBACK_ARROWS = ["失败/超时", "继续失败"];

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
  {
    id: "planning",
    label: "任务规划",
    desc: "将用户目标拆解为可执行的子任务",
    icon: Brain,
  },
  {
    id: "prompt",
    label: "Prompt 优化",
    desc: "自动优化 Agent 的系统提示词",
    icon: Sparkles,
  },
  {
    id: "quality",
    label: "质量评审",
    desc: "校验 Agent 输出的准确性与完整性",
    icon: ShieldCheck,
  },
  {
    id: "summary",
    label: "智能摘要",
    desc: "任务完成后自动生成执行报告",
    icon: FileText,
  },
  {
    id: "translation",
    label: "翻译",
    desc: "Skills 市场搜索时将中文翻译为英文",
    icon: Globe,
  },
  {
    id: "team_planning",
    label: "团队智能规划",
    desc: "根据用户需求智能规划 Agent 团队方案",
    icon: Users,
  },
];

const PROVIDER_PRESETS = [
  {
    id: "openai",
    name: "OpenAI",
    icon: "O",
    color: "#10A37F",
    baseUrl: "https://api.openai.com/v1",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    icon: "A",
    color: "#D4A574",
    baseUrl: "https://api.anthropic.com",
  },
  {
    id: "aliyun",
    name: "阿里云百炼",
    icon: "阿",
    color: "#FF6A00",
    baseUrl: "https://dashscope.aliyuncs.com",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    icon: "D",
    color: "#4D6BFE",
    baseUrl: "https://api.deepseek.com/v1",
  },
  {
    id: "moonshot",
    name: "Moonshot (Kimi)",
    icon: "M",
    color: "#1A1A2E",
    baseUrl: "https://api.moonshot.cn/v1",
  },
  {
    id: "zhipu",
    name: "智谱 AI",
    icon: "智",
    color: "#3B5998",
    baseUrl: "https://open.bigmodel.cn/api",
  },
  {
    id: "siliconflow",
    name: "硅基流动",
    icon: "硅",
    color: "#7C3AED",
    baseUrl: "https://api.siliconflow.cn/v1",
  },
  {
    id: "minimax",
    name: "MiniMax",
    icon: "M",
    color: "#FF6B35",
    baseUrl: "https://api.minimaxi.com/v1",
  },
];

function maskApiKey(key: string | null | undefined): string {
  if (!key) return "未设置";
  if (key.length <= 8) return "****";
  return key.slice(0, 5) + "****..." + key.slice(-4);
}

function formatPrice(price: number | null | undefined): string {
  if (price == null) return "-";
  return `$${price.toFixed(2)}`;
}

export default function ModelsPage() {
  const { data: providers = [], isLoading: loadingProviders } =
    useProviders();
  const { data: allModels = [], isLoading: loadingModels } =
    useWorkspaceModels();
  const { data: fallbackChain = [] } = useFallbackChain();
  const { data: resilience } = useResiliencePolicy();

  const createProvider = useCreateProvider();
  const updateResilience = useUpdateResiliencePolicy();
  const toggleProviderEnabled = useToggleProviderEnabled();
  const testConnection = useTestProviderConnection();


  const { data: systemAssignments = [] } = useSystemModelAssignments();
  const setSystemModelAssignment = useSetSystemModelAssignment();

  const systemModels: Record<string, string> = {};
  for (const a of systemAssignments) {
    systemModels[a.task_key] = a.model_id;
  }

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [configProvider, setConfigProvider] = useState<ModelProvider | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestConnectionResult>>({});
  const [retries, setRetries] = useState("3");
  const [backoff, setBackoff] = useState("exponential");
  const [overBudget, setOverBudget] = useState("downgrade_confirm");
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [addSelected, setAddSelected] = useState<string | null>(null);
  const [addApiKey, setAddApiKey] = useState("");
  const [addBaseUrl, setAddBaseUrl] = useState("");
  const [addCustomName, setAddCustomName] = useState("");
  const [addAutoDetect, setAddAutoDetect] = useState(true);

  useEffect(() => {
    if (resilience) {
      setRetries(String(resilience.retry_count ?? 3));
      setBackoff(resilience.backoff_strategy ?? "exponential");
      setOverBudget(resilience.over_budget_action ?? "downgrade_confirm");
    }
  }, [resilience]);

  const filteredModels = allModels.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (providers.find((p) => p.id === m.provider_id)?.name ?? "")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  const totalPages = Math.max(1, Math.ceil(filteredModels.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedModels = filteredModels.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const resetAddForm = () => {
    setAddOpen(false);
    setAddSelected(null);
    setAddApiKey("");
    setAddBaseUrl("");
    setAddCustomName("");
  };

  const handleAddProvider = () => {
    if (!addSelected || !addApiKey) return;
    const preset = PROVIDER_PRESETS.find((p) => p.id === addSelected);
    createProvider.mutate(
      {
        name:
          addSelected === "custom"
            ? addCustomName
            : (preset?.name ?? addCustomName),
        baseUrl: addBaseUrl || preset?.baseUrl || "",
        apiKeyEncrypted: addApiKey,
        iconColor: preset?.color,
      },
      { onSuccess: resetAddForm },
    );
  };

  const handleResilienceChange = (field: string, value: string) => {
    if (field === "retryCount") {
      setRetries(value);
      updateResilience.mutate({ retryCount: parseInt(value) });
    } else if (field === "backoffStrategy") {
      setBackoff(value);
      updateResilience.mutate({ backoffStrategy: value });
    } else if (field === "overBudgetAction") {
      setOverBudget(value);
      updateResilience.mutate({ overBudgetAction: value });
    }
  };

  const handleTestConnection = (providerId: string) => {
    setTestingId(providerId);
    testConnection.mutate(
      { providerId },
      {
        onSuccess: (result) => {
          setTestResults((prev) => ({ ...prev, [providerId]: result }));
          setTestingId(null);
        },
        onError: () => {
          setTestingId(null);
        },
      },
    );
  };

  const getProviderName = (providerId: string) =>
    providers.find((p) => p.id === providerId)?.name ?? "未知";

  return (
    <div>
      {/* Header */}
      <div
        className="flex items-center justify-between mb-6"
        style={{ animation: "fade-in 0.25s ease-out" }}
      >
        <p className="text-[0.82rem] text-text-secondary">
          管理模型供应商、模型池与调度策略
        </p>
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
        {loadingProviders
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-surface rounded-xl border border-border-light p-4 animate-pulse min-h-[180px]"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-bg-alt" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-bg-alt rounded w-24" />
                    <div className="h-3 bg-bg-alt rounded w-16" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-bg-alt rounded" />
                  <div className="h-3 bg-bg-alt rounded" />
                  <div className="h-3 bg-bg-alt rounded" />
                </div>
              </div>
            ))
          : providers.map((p, i) => {
              const st = p.status ?? "unknown";
              const disabled = !p.enabled;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "bg-surface rounded-xl border p-4 transition-all group",
                    disabled
                      ? "border-border-light/60 bg-bg-alt/40"
                      : "border-border-light hover:shadow-card-hover hover:border-border-hover",
                  )}
                  style={{
                    animation: `fade-in 0.3s ease-out ${i * 0.06}s both`,
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-[0.85rem] shrink-0",
                        disabled && "grayscale opacity-60",
                      )}
                      style={{
                        backgroundColor: p.icon_color || "#6B7280",
                      }}
                    >
                      {p.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={cn(
                        "text-[0.88rem] font-semibold truncate",
                        disabled ? "text-text-muted" : "text-text",
                      )}>
                        {p.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {disabled ? (
                          <span className="text-[0.72rem] font-medium text-text-muted">
                            已禁用
                          </span>
                        ) : (
                          <>
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full shrink-0",
                                statusDot[st] ?? "bg-text-muted",
                                st === "online" &&
                                  "animate-[pulse-dot_2s_ease-in-out_infinite]",
                              )}
                            />
                            <span
                              className={cn(
                                "text-[0.72rem] font-medium",
                                statusTextColor[st] ?? "text-text-muted",
                              )}
                            >
                              {STATUS_LABEL[st] ?? "未知"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {disabled && (
                      <span className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded bg-bg-alt text-text-muted border border-border-light/60 shrink-0 uppercase tracking-wider">
                        OFF
                      </span>
                    )}
                  </div>
                  <div className={cn("space-y-1.5 mb-3", disabled && "opacity-50")}>
                    <div className="flex items-center justify-between text-[0.75rem]">
                      <span className="text-text-muted">延迟</span>
                      <span className="text-text-secondary font-mono">
                        {p.avg_latency_ms != null
                          ? `${p.avg_latency_ms}ms`
                          : "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[0.75rem]">
                      <span className="text-text-muted">模型数</span>
                      <span className="text-text-secondary font-mono">
                        {p.models_count ?? 0}
                      </span>
                    </div>
                    {p.balance_info && (
                      <div className="flex items-center justify-between text-[0.75rem]">
                        <span className="text-text-muted">余额</span>
                        <span className="text-text font-semibold font-mono text-[0.78rem]">
                          {p.balance_info}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* API Key */}
                  <div className={cn("flex items-center gap-1.5 mb-3 px-2.5 py-2 rounded-lg bg-bg/80 border border-border-light/60", disabled && "opacity-50")}>
                    <Key size={11} className="text-text-muted shrink-0" />
                    <span className="text-[0.68rem] text-text-muted font-mono truncate flex-1">
                      {showKeys[p.id]
                        ? (p.api_key_encrypted ?? "未设置")
                        : maskApiKey(p.api_key_encrypted)}
                    </span>
                    <button
                      onClick={() =>
                        setShowKeys((prev) => ({
                          ...prev,
                          [p.id]: !prev[p.id],
                        }))
                      }
                      className="w-5 h-5 flex items-center justify-center rounded text-text-muted hover:text-text transition-colors cursor-pointer shrink-0"
                    >
                      {showKeys[p.id] ? (
                        <EyeOff size={11} />
                      ) : (
                        <Eye size={11} />
                      )}
                    </button>
                  </div>
                  {/* Test result inline */}
                  {testResults[p.id] && (
                    <div
                      className={cn(
                        "flex items-center gap-1.5 mb-2 px-2.5 py-1.5 rounded-lg text-[0.7rem] font-medium",
                        testResults[p.id].success
                          ? "bg-sage-light text-[#5a7a6b]"
                          : "bg-coral-light text-[#9a5858]",
                      )}
                    >
                      {testResults[p.id].success ? (
                        <>
                          <Check size={11} />
                          连接正常 · {testResults[p.id].latency_ms}ms · {testResults[p.id].model_count} 个模型
                        </>
                      ) : (
                        <>
                          <X size={11} />
                          <span className="truncate">{testResults[p.id].error ?? "连接失败"}</span>
                        </>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfigProvider(p)}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-[0.75rem] font-medium bg-bg-alt text-text-secondary hover:text-text hover:bg-bg-deep transition-colors cursor-pointer border-none"
                    >
                      <Settings size={12} />
                      配置
                    </button>
                    <button
                      onClick={() => handleTestConnection(p.id)}
                      disabled={testingId === p.id || disabled}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-[0.75rem] font-medium bg-bg-alt text-text-secondary hover:text-text hover:bg-bg-deep transition-colors cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-text-secondary disabled:hover:bg-bg-alt"
                    >
                      {testingId === p.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Zap size={12} />
                      )}
                      {testingId === p.id ? "测试中..." : "测试"}
                    </button>
                  </div>
                </div>
              );
            })}

        {/* Add provider card */}
        <div
          onClick={() => setAddOpen(true)}
          className="rounded-xl border-2 border-dashed border-border p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:border-primary/40 hover:bg-primary-light/30 group min-h-[180px]"
          style={{
            animation: `fade-in 0.3s ease-out ${providers.length * 0.06}s both`,
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
            <h3 className="text-[0.95rem] font-semibold text-text">
              系统内置模型
            </h3>
          </div>
          <span className="text-[0.72rem] text-text-muted">
            系统编排引擎使用的模型，不同于 Agent 执行模型
          </span>
        </div>
        <div className="divide-y divide-border-light/60">
          {SYSTEM_MODEL_TASKS.map((task) => (
            <div key={task.id} className="px-5 py-3.5 flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-bg-alt flex items-center justify-center shrink-0">
                <task.icon size={16} className="text-text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.84rem] font-medium text-text">
                  {task.label}
                </div>
                <div className="text-[0.72rem] text-text-muted mt-0.5">
                  {task.desc}
                </div>
              </div>
              <ModelPicker
                value={systemModels[task.id] ?? ""}
                onChange={(modelId) =>
                  setSystemModelAssignment.mutate({
                    taskKey: task.id,
                    modelId,
                  })
                }
                providers={providers}
                models={allModels}
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
          <h3 className="text-[0.95rem] font-semibold text-text">
            Agent 模型池
          </h3>
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
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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
        {loadingModels ? (
          <div className="px-5 py-10 flex items-center justify-center gap-2 text-[0.82rem] text-text-muted">
            <Loader2 size={16} className="animate-spin" />
            加载中...
          </div>
        ) : filteredModels.length === 0 ? (
          <div className="px-5 py-10 text-center text-[0.82rem] text-text-muted">
            {allModels.length === 0
              ? "暂无模型，请先添加供应商"
              : "没有找到匹配的模型"}
          </div>
        ) : (
          pagedModels.map((m, i) => {
            const speed =
              SPEED_TIER_MAP[m.speed_tier ?? "medium"] ?? SPEED_TIER_MAP.medium;
            return (
              <div
                key={m.id}
                className="px-5 py-3 flex items-center gap-3 border-b border-border-light/50 last:border-b-0 hover:bg-bg/50 transition-colors cursor-pointer group"
                style={{
                  animation: `fade-in 0.2s ease-out ${i * 0.03}s both`,
                }}
              >
                <div className="flex-1 min-w-[140px]">
                  <span className="text-[0.84rem] font-medium text-text group-hover:text-primary transition-colors">
                    {m.name}
                  </span>
                </div>
                <div className="w-24 text-[0.78rem] text-text-secondary">
                  {getProviderName(m.provider_id)}
                </div>
                <div className="w-24 flex justify-center">
                  <Stars count={m.quality_rating ?? 3} />
                </div>
                <div className="w-20 flex justify-center">
                  <span
                    className={cn(
                      "inline-flex px-2 py-0.5 rounded-full text-[0.7rem] font-medium",
                      speed.bg,
                    )}
                  >
                    {speed.label}
                  </span>
                </div>
                <div className="w-24 text-right text-[0.8rem] text-text font-mono">
                  {formatPrice(m.price_per_million_tokens)}
                </div>
                <div className="w-16 flex justify-center">
                  {m.status === "available" ? (
                    <span className="inline-flex items-center gap-1 text-[0.72rem] font-medium text-success">
                      <Circle
                        size={6}
                        className="fill-success"
                        strokeWidth={0}
                      />
                      可用
                    </span>
                  ) : m.status === "deprecated" ? (
                    <span className="inline-flex items-center gap-1 text-[0.72rem] font-medium text-warning">
                      <Circle
                        size={6}
                        className="fill-warning"
                        strokeWidth={0}
                      />
                      弃用
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
            );
          })
        )}

        {/* Pagination */}
        {filteredModels.length > 0 && (
          <div className="px-5 py-3 border-t border-border-light flex items-center justify-between gap-4 flex-wrap">
            {/* Left: info + page size */}
            <div className="flex items-center gap-3 text-[0.75rem] text-text-muted">
              <span>
                共 {filteredModels.length} 条
                {filteredModels.length !== allModels.length &&
                  `（筛选自 ${allModels.length} 条）`}
              </span>
              <span className="text-border-light">|</span>
              <span className="flex items-center gap-1.5">
                每页
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="appearance-none bg-bg border border-border-light rounded-md px-2 py-0.5 text-[0.75rem] text-text cursor-pointer focus:outline-none focus:border-primary/40 transition-colors"
                >
                  {[10, 20, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                条
              </span>
            </div>

            {/* Right: page navigation */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-[0.75rem] text-text-secondary hover:bg-bg-alt transition-colors cursor-pointer border-none bg-transparent disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (totalPages <= 7) return true;
                    if (p === 1 || p === totalPages) return true;
                    if (Math.abs(p - safePage) <= 1) return true;
                    return false;
                  })
                  .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1)
                      acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "..." ? (
                      <span
                        key={`dot-${idx}`}
                        className="w-7 h-7 flex items-center justify-center text-[0.7rem] text-text-muted"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setPage(item as number)}
                        className={cn(
                          "w-7 h-7 rounded-md flex items-center justify-center text-[0.75rem] font-medium transition-colors cursor-pointer border-none",
                          item === safePage
                            ? "bg-primary text-white"
                            : "bg-transparent text-text-secondary hover:bg-bg-alt",
                        )}
                      >
                        {item}
                      </button>
                    ),
                  )}
                <button
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(safePage + 1)}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-[0.75rem] text-text-secondary hover:bg-bg-alt transition-colors cursor-pointer border-none bg-transparent disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ›
                </button>
              </div>
            )}
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
          {fallbackChain.length === 0 ? (
            <div className="py-8 text-center text-[0.82rem] text-text-muted">
              未配置 Fallback 链
            </div>
          ) : (
            <div className="flex flex-col items-center gap-0">
              {fallbackChain.map((entry, idx) => {
                const model = allModels.find((m) => m.id === entry.model_id);
                const rs =
                  ROLE_STYLE[entry.role ?? "primary"] ?? ROLE_STYLE.primary;
                return (
                  <div
                    key={entry.id}
                    className="w-full flex flex-col items-center"
                  >
                    {/* Node */}
                    <div
                      className={cn(
                        "w-full rounded-xl border p-3.5 flex items-center gap-3 transition-all",
                        rs.bg,
                        rs.border,
                      )}
                      style={{
                        animation: `fade-in 0.3s ease-out ${0.1 + idx * 0.1}s both`,
                      }}
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-[0.72rem] font-bold",
                          rs.bg,
                          rs.text,
                        )}
                        style={{
                          backgroundColor: "rgba(255,255,255,0.6)",
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <div
                          className={cn(
                            "text-[0.84rem] font-semibold",
                            rs.text,
                          )}
                        >
                          {model?.name ?? "未知模型"}
                        </div>
                        <div className="text-[0.72rem] text-text-muted">
                          {rs.label}
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    {idx < fallbackChain.length - 1 && (
                      <div className="flex flex-col items-center py-1.5">
                        <div className="w-px h-3 bg-border" />
                        <div className="flex items-center gap-1.5 py-0.5">
                          <ArrowDown size={12} className="text-text-muted" />
                          <span className="text-[0.68rem] text-text-muted font-medium">
                            {FALLBACK_ARROWS[idx] ?? "继续失败"}
                          </span>
                        </div>
                        <div className="w-px h-3 bg-border" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
                  onChange={(e) =>
                    handleResilienceChange("retryCount", e.target.value)
                  }
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
                  onChange={(e) =>
                    handleResilienceChange("backoffStrategy", e.target.value)
                  }
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
                  {(resilience?.token_budget ?? 100000).toLocaleString()}
                </span>
              </div>
              <ProgressBar value={0} variant="primary" size="sm" />
              <div className="flex justify-between mt-1">
                <span className="text-[0.68rem] text-text-muted">
                  暂无用量数据
                </span>
                <span className="text-[0.68rem] text-text-muted">
                  预算{" "}
                  {(resilience?.token_budget ?? 100000).toLocaleString()}
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
                  onChange={(e) =>
                    handleResilienceChange("overBudgetAction", e.target.value)
                  }
                  className="appearance-none pl-3 pr-7 py-1.5 rounded-lg bg-bg text-[0.8rem] text-text border border-border-light focus:border-primary/40 focus:outline-none cursor-pointer transition-colors"
                >
                  <option value="downgrade_confirm">降级确认</option>
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
        onClose={resetAddForm}
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
                const exists = providers.some((p) => p.name === preset.name);
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
                          : "border-border-light bg-surface hover:border-primary/40",
                    )}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-[0.75rem] shrink-0"
                      style={{ backgroundColor: preset.color }}
                    >
                      {preset.icon}
                    </div>
                    <div className="min-w-0">
                      <div
                        className={cn(
                          "text-[0.8rem] font-medium truncate",
                          selected ? "text-primary" : "text-text",
                        )}
                      >
                        {preset.name}
                      </div>
                      {exists && (
                        <div className="text-[0.65rem] text-text-muted">
                          已添加
                        </div>
                      )}
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
                    : "border-dashed border-border hover:border-primary/40",
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-bg-alt flex items-center justify-center shrink-0">
                  <Globe
                    size={16}
                    className={
                      addSelected === "custom"
                        ? "text-primary"
                        : "text-text-muted"
                    }
                  />
                </div>
                <div className="text-[0.8rem] font-medium text-text">
                  自定义
                </div>
              </button>
            </div>
          </div>

          {/* Configuration fields */}
          {addSelected && (
            <div
              className="space-y-4"
              style={{ animation: "fade-in 0.2s ease-out" }}
            >
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
                      "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors",
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
                    "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors",
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
                    "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors",
                  )}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border-light px-3 py-2.5">
                <div>
                  <div className="text-[0.78rem] font-medium text-text">
                    自动检测可用模型
                  </div>
                  <div className="text-[0.68rem] text-text-muted mt-0.5">
                    连接后自动拉取供应商支持的模型列表
                  </div>
                </div>
                <Toggle checked={addAutoDetect} onChange={setAddAutoDetect} />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              onClick={resetAddForm}
              className="px-4 py-2 rounded-lg text-[0.8rem] font-medium text-text-secondary hover:text-text hover:bg-bg-alt transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              disabled={
                !addSelected || !addApiKey || createProvider.isPending
              }
              onClick={handleAddProvider}
              className={cn(
                "px-5 py-2 rounded-lg text-[0.8rem] font-medium transition-colors cursor-pointer shadow-sm inline-flex items-center gap-1.5",
                addSelected && addApiKey && !createProvider.isPending
                  ? "bg-primary text-white hover:bg-primary-hover active:bg-primary-active"
                  : "bg-bg-alt text-text-muted cursor-not-allowed",
              )}
            >
              {createProvider.isPending && (
                <Loader2 size={14} className="animate-spin" />
              )}
              连接并添加
            </button>
          </div>
        </div>
      </Modal>

      {/* Provider Config Modal */}
      {configProvider && (
        <ProviderConfigModal
          provider={configProvider}
          onClose={() => setConfigProvider(null)}
          onToggleProvider={(enabled) =>
            toggleProviderEnabled.mutate(
              { id: configProvider.id, enabled },
              {
                onSuccess: (updated) => setConfigProvider(updated),
              },
            )
          }
          onDelete={() => setConfigProvider(null)}
        />
      )}
    </div>
  );
}

// ── Model grouping utilities ─────────────────────────────────

function getModelGroup(name: string): string {
  if (name.includes("/")) return name.split("/")[0];
  const parts = name.split("-");
  if (parts.length <= 1) return name;
  if (parts[0].length <= 4) return parts.slice(0, 2).join("-");
  return parts[0];
}

function groupModels(models: Model[]): { key: string; label: string; models: Model[] }[] {
  const map = new Map<string, Model[]>();
  for (const m of models) {
    const key = getModelGroup(m.name);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .map(([key, items]) => ({ key, label: key, models: items }));
}

// ── Checkbox component ──────────────────────────────────────

function Checkbox({
  checked,
  indeterminate,
  onChange,
  size = 18,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  size?: number;
}) {
  return (
    <button
      onClick={(e) => { e.preventDefault(); onChange(); }}
      className={cn(
        "rounded-md border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer",
        checked || indeterminate
          ? "bg-primary border-primary"
          : "border-border-light bg-surface hover:border-primary/40",
      )}
      style={{ width: size, height: size }}
    >
      {checked && <Check size={size - 6} className="text-white" strokeWidth={3} />}
      {!checked && indeterminate && (
        <div className="bg-white rounded-sm" style={{ width: size - 10, height: 2 }} />
      )}
    </button>
  );
}

// ── Provider Configuration Modal ────────────────────────────

function ProviderConfigModal({
  provider,
  onClose,
  onToggleProvider,
  onDelete,
}: {
  provider: ModelProvider;
  onClose: () => void;
  onToggleProvider: (enabled: boolean) => void;
  onDelete: () => void;
}) {
  const { data: models = [], isLoading, refetch } = useModels(provider.id);
  const fetchModels = useFetchProviderModels();
  const toggleModel = useToggleModelEnabled();
  const batchToggle = useBatchToggleModels();
  const updateProvider = useUpdateProvider();
  const deleteProvider = useDeleteProvider();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Edit state
  const [editName, setEditName] = useState(provider.name);
  const [editApiKey, setEditApiKey] = useState(provider.api_key_encrypted ?? "");
  const [editBaseUrl, setEditBaseUrl] = useState(provider.base_url);
  const [showEditKey, setShowEditKey] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isDirty =
    editName !== provider.name ||
    editApiKey !== (provider.api_key_encrypted ?? "") ||
    editBaseUrl !== provider.base_url;

  const handleSave = () => {
    updateProvider.mutate({
      id: provider.id,
      name: editName || undefined,
      baseUrl: editBaseUrl || undefined,
      apiKeyEncrypted: editApiKey || undefined,
    });
  };

  const handleDelete = () => {
    deleteProvider.mutate({ id: provider.id }, { onSuccess: () => onDelete() });
  };

  const hasModels = models.length > 0;
  const groups = groupModels(models);
  const totalEnabled = models.filter((m) => m.enabled).length;

  const handleFetch = () => {
    fetchModels.mutate(
      { providerId: provider.id },
      { onSuccess: () => refetch() },
    );
  };

  const handleToggleAll = (enabled: boolean) => {
    const ids = models.map((m) => m.id);
    batchToggle.mutate({ ids, enabled }, { onSuccess: () => refetch() });
  };

  const handleToggleGroup = (group: { models: Model[] }, enabled: boolean) => {
    const ids = group.models.map((m) => m.id);
    batchToggle.mutate({ ids, enabled }, { onSuccess: () => refetch() });
  };

  const handleToggleOne = (m: Model) => {
    toggleModel.mutate(
      { id: m.id, enabled: !m.enabled },
      { onSuccess: () => refetch() },
    );
  };

  const isBusy = batchToggle.isPending || toggleModel.isPending;

  return (
    <Modal
      open
      onClose={onClose}
      title={`配置 · ${provider.name}`}
      width="560px"
    >
      <div className="space-y-5">
        {/* Edit basic info */}
        <div className="space-y-3 rounded-xl border border-border-light p-4">
          <div className="text-[0.78rem] font-semibold text-text mb-1">基本信息</div>
          <div>
            <label className="block text-[0.72rem] font-medium text-text-muted mb-1">
              供应商名称
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-lg border border-border-light bg-bg px-3 py-1.5 text-[0.8rem] text-text placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[0.72rem] font-medium text-text-muted mb-1">
              API Key
            </label>
            <div className="relative">
              <input
                type={showEditKey ? "text" : "password"}
                value={editApiKey}
                onChange={(e) => setEditApiKey(e.target.value)}
                className="w-full rounded-lg border border-border-light bg-bg px-3 py-1.5 pr-9 text-[0.8rem] text-text font-mono placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
              />
              <button
                onClick={() => setShowEditKey((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors cursor-pointer"
              >
                {showEditKey ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[0.72rem] font-medium text-text-muted mb-1">
              Base URL
            </label>
            <input
              type="text"
              value={editBaseUrl}
              onChange={(e) => setEditBaseUrl(e.target.value)}
              className="w-full rounded-lg border border-border-light bg-bg px-3 py-1.5 text-[0.8rem] text-text font-mono placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
            />
          </div>
          <div className="flex justify-end">
            <button
              disabled={!isDirty || updateProvider.isPending}
              onClick={handleSave}
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[0.78rem] font-medium transition-colors cursor-pointer border-none shadow-sm",
                isDirty && !updateProvider.isPending
                  ? "bg-primary text-white hover:bg-primary-hover"
                  : "bg-bg-alt text-text-muted cursor-not-allowed",
              )}
            >
              {updateProvider.isPending && <Loader2 size={12} className="animate-spin" />}
              {updateProvider.isPending ? "保存中..." : "保存修改"}
            </button>
          </div>
        </div>

        {/* Enable toggle */}
        <div className="flex items-center justify-between rounded-xl border border-border-light px-4 py-3">
          <div>
            <div className="text-[0.84rem] font-medium text-text">
              启用此供应商
            </div>
            <div className="text-[0.7rem] text-text-muted mt-0.5">
              关闭后，该供应商的模型不会出现在 Agent 模型池中
            </div>
          </div>
          <Toggle
            checked={!!provider.enabled}
            onChange={(v) => onToggleProvider(v)}
          />
        </div>

        {/* Models section */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-[0.82rem] font-semibold text-text">
              可用模型
            </label>
            <button
              onClick={handleFetch}
              disabled={fetchModels.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.75rem] font-medium bg-bg-alt text-text-secondary hover:text-text hover:bg-bg-deep transition-colors cursor-pointer border-none disabled:opacity-50"
            >
              {fetchModels.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Download size={12} />
              )}
              {fetchModels.isPending ? "拉取中..." : hasModels ? "刷新列表" : "拉取模型列表"}
            </button>
          </div>

          {isLoading ? (
            <div className="py-8 flex items-center justify-center gap-2 text-[0.8rem] text-text-muted">
              <Loader2 size={14} className="animate-spin" />
              加载中...
            </div>
          ) : !hasModels ? (
            <div className="py-8 text-center text-[0.8rem] text-text-muted rounded-xl border border-dashed border-border bg-bg/50">
              暂无模型数据，请点击「拉取模型列表」从供应商 API 获取
            </div>
          ) : (
            <>
              {/* Global actions */}
              <div className="flex items-center gap-3 mb-2">
                <Checkbox
                  checked={totalEnabled === models.length}
                  indeterminate={totalEnabled > 0 && totalEnabled < models.length}
                  onChange={() => handleToggleAll(totalEnabled < models.length)}
                />
                <span className="text-[0.78rem] text-text-secondary">
                  {totalEnabled === models.length
                    ? "取消全选"
                    : totalEnabled === 0
                      ? "全选"
                      : `已选 ${totalEnabled}/${models.length}`}
                </span>
                {isBusy && <Loader2 size={12} className="animate-spin text-text-muted" />}
              </div>

              {/* Grouped list */}
              <div className="max-h-[380px] overflow-y-auto rounded-xl border border-border-light">
                {groups.map((group, gi) => {
                  const groupEnabled = group.models.filter((m) => m.enabled).length;
                  const allChecked = groupEnabled === group.models.length;
                  const isCollapsed = collapsed[group.key];
                  const shortName = (name: string) =>
                    name.includes("/") ? name.split("/").slice(1).join("/") : name;

                  return (
                    <div
                      key={group.key}
                      className={cn(gi > 0 && "border-t border-border-light")}
                    >
                      {/* Group header */}
                      <div className="flex items-center gap-2.5 px-4 py-2 bg-bg/60 sticky top-0 z-[1]">
                        <Checkbox
                          checked={allChecked}
                          indeterminate={groupEnabled > 0 && !allChecked}
                          onChange={() => handleToggleGroup(group, !allChecked)}
                          size={16}
                        />
                        <button
                          onClick={() =>
                            setCollapsed((p) => ({
                              ...p,
                              [group.key]: !p[group.key],
                            }))
                          }
                          className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer bg-transparent border-none p-0 text-left"
                        >
                          <ChevronDown
                            size={12}
                            className={cn(
                              "text-text-muted transition-transform shrink-0",
                              isCollapsed && "-rotate-90",
                            )}
                          />
                          <span className="text-[0.78rem] font-semibold text-text truncate">
                            {group.label}
                          </span>
                          <span className="text-[0.68rem] text-text-muted font-mono shrink-0">
                            {groupEnabled}/{group.models.length}
                          </span>
                        </button>
                      </div>

                      {/* Group models */}
                      {!isCollapsed &&
                        group.models.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center gap-3 pl-10 pr-4 py-1.5 hover:bg-bg/40 transition-colors cursor-pointer"
                            onClick={() => handleToggleOne(m)}
                          >
                            <Checkbox
                              checked={!!m.enabled}
                              onChange={() => handleToggleOne(m)}
                              size={16}
                            />
                            <span
                              className={cn(
                                "text-[0.78rem] truncate flex-1",
                                m.enabled
                                  ? "text-text font-medium"
                                  : "text-text-muted",
                              )}
                            >
                              {shortName(m.name)}
                            </span>
                            {(m.price_per_million_tokens ?? 0) > 0 && (
                              <span className="text-[0.63rem] font-mono text-text-muted shrink-0">
                                ${m.price_per_million_tokens?.toFixed(2)}/M
                              </span>
                            )}
                            {m.speed_tier && (
                              <span
                                className={cn(
                                  "text-[0.63rem] px-1.5 py-0.5 rounded-full font-medium shrink-0",
                                  SPEED_TIER_MAP[m.speed_tier]?.bg ??
                                    "bg-bg-alt text-text-muted",
                                )}
                              >
                                {SPEED_TIER_MAP[m.speed_tier]?.label ??
                                  m.speed_tier}
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between mt-2 text-[0.7rem] text-text-muted">
                <span>{groups.length} 个分组 · 共 {models.length} 个模型</span>
                <span>已勾选 {totalEnabled} 个</span>
              </div>
            </>
          )}
        </div>

      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 bg-surface pt-3 pb-1 -mx-6 px-6 border-t border-border-light/60">
        {confirmDelete ? (
          <div className="flex items-center gap-3 mb-3 p-3 rounded-lg bg-coral-light border border-danger/20">
            <AlertTriangle size={14} className="text-danger shrink-0" />
            <span className="text-[0.78rem] text-danger flex-1">
              删除后，该供应商及其所有模型数据将永久移除，无法恢复。
            </span>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1 rounded-md text-[0.75rem] font-medium text-text-secondary hover:text-text bg-surface border border-border-light transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              disabled={deleteProvider.isPending}
              onClick={handleDelete}
              className="px-3 py-1 rounded-md text-[0.75rem] font-medium text-white bg-danger hover:bg-danger/80 transition-colors cursor-pointer inline-flex items-center gap-1 border-none"
            >
              {deleteProvider.isPending && <Loader2 size={11} className="animate-spin" />}
              确认删除
            </button>
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.78rem] font-medium text-danger hover:bg-coral-light transition-colors cursor-pointer border-none bg-transparent"
          >
            <Trash2 size={13} />
            删除供应商
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-[0.8rem] font-medium bg-primary text-white hover:bg-primary-hover active:bg-primary-active transition-colors cursor-pointer shadow-sm border-none"
          >
            完成
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ModelPicker({
  value,
  onChange,
  providers,
  models,
}: {
  value: string;
  onChange: (id: string) => void;
  providers: ModelProvider[];
  models: Model[];
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
        ? {
            position: "fixed",
            bottom: window.innerHeight - rect.top + 6,
            right: window.innerWidth - rect.right,
            maxHeight: Math.min(320, rect.top - 20),
          }
        : {
            position: "fixed",
            top: rect.bottom + 6,
            right: window.innerWidth - rect.right,
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
          "flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg border transition-all cursor-pointer shrink-0",
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
        <span className="text-[0.78rem] font-medium text-text">
          {selected?.name ?? "选择模型"}
        </span>
        <ChevronDown
          size={12}
          className={cn(
            "text-text-muted transition-transform",
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
            {providers.length === 0 ? (
              <div className="px-3 py-4 text-center text-[0.78rem] text-text-muted">
                暂无供应商
              </div>
            ) : (
              providers.map((p) => {
                const providerModels = models.filter(
                  (m) =>
                    m.provider_id === p.id && m.status === "available",
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
                              "text-[0.78rem] flex-1",
                              isSelected
                                ? "font-semibold text-primary"
                                : "text-text",
                            )}
                          >
                            {m.name}
                          </span>
                          <span className="text-[0.65rem] text-text-muted font-mono">
                            {formatPrice(m.price_per_million_tokens)}
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
