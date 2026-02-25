import { useState } from "react";
import {
  ListChecks,
  Target,
  Coins,
  Zap,
  ChevronDown,
  Shield,
  Eye,
  EyeOff,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, StatCard, Toggle } from "@/components/ui";

const topTabs = [
  { id: "dashboard", label: "数据看板" },
  { id: "settings", label: "系统设置" },
];

const weeklyTasks = [
  { day: "Mon", value: 3 },
  { day: "Tue", value: 5 },
  { day: "Wed", value: 4 },
  { day: "Thu", value: 7 },
  { day: "Fri", value: 6 },
  { day: "Sat", value: 2 },
  { day: "Sun", value: 1 },
];

const agentUsage = [
  { name: "信息检索员", value: 45, color: "bg-primary" },
  { name: "深度分析师", value: 38, color: "bg-sage" },
  { name: "文案撰写员", value: 22, color: "bg-coral" },
  { name: "质量审查员", value: 18, color: "bg-lavender" },
];

const costDistribution = [
  { name: "GPT-4o", pct: 45, color: "#635BFF" },
  { name: "Claude", pct: 30, color: "#14B8A6" },
  { name: "Qwen", pct: 20, color: "#F59E0B" },
  { name: "其他", pct: 5, color: "#94A3B8" },
];

const timeBuckets = [
  { label: "<1m", value: 2 },
  { label: "1-3m", value: 8 },
  { label: "3-5m", value: 6 },
  { label: "5-10m", value: 4 },
  { label: ">10m", value: 2 },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="flex flex-col h-full overflow-hidden px-6 pt-5 pb-6">
      {/* Header */}
      <div
        className="shrink-0 flex items-center justify-between mb-5"
        style={{ animation: "fade-in 0.3s ease-out" }}
      >
        <p className="text-[0.82rem] text-text-secondary">
          {activeTab === "dashboard" ? "全局数据可视化与关键指标监控" : "全局参数配置与偏好管理"}
        </p>
        <Tabs tabs={topTabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {activeTab === "dashboard" ? <DashboardView /> : <SettingsView />}
    </div>
  );
}

function DashboardView() {
  return (
    <div className="flex-1 overflow-y-auto space-y-5">
      {/* KPI Row */}
      <div
        className="grid grid-cols-4 gap-4"
        style={{ animation: "fade-in 0.3s ease-out 60ms both" }}
      >
        <StatCard
          icon={ListChecks}
          iconColor="text-primary"
          iconBg="bg-primary-light"
          value="22"
          label="本周任务"
          change={{ value: "+18%", direction: "up" }}
        />
        <StatCard
          icon={Target}
          iconColor="text-success"
          iconBg="bg-success-light"
          value="86.4%"
          label="成功率"
          change={{ value: "+5.2%", direction: "up" }}
        />
        <StatCard
          icon={Zap}
          iconColor="text-lavender"
          iconBg="bg-lavender-light"
          value="58.9k"
          label="Token 消耗"
        />
        <StatCard
          icon={Coins}
          iconColor="text-sand"
          iconBg="bg-sand-light"
          value="¥12.80"
          label="总费用"
          change={{ value: "+22%", direction: "down" }}
        />
      </div>

      {/* Charts Grid */}
      <div
        className="grid grid-cols-2 gap-4"
        style={{ animation: "fade-in 0.35s ease-out 120ms both" }}
      >
        {/* Weekly Task Trend */}
        <div className="bg-surface border border-border-light rounded-xl p-5">
          <h3 className="text-[0.82rem] font-semibold text-text mb-4">
            本周任务趋势
          </h3>
          <div className="flex items-end justify-between gap-2 h-[140px]">
            {weeklyTasks.map((d, i) => {
              const maxVal = Math.max(...weeklyTasks.map((t) => t.value));
              const height = (d.value / maxVal) * 100;
              return (
                <div
                  key={d.day}
                  className="flex-1 flex flex-col items-center gap-1.5"
                  style={{ animation: `fade-in 0.3s ease-out ${i * 50}ms both` }}
                >
                  <span className="text-[0.65rem] font-semibold text-text">
                    {d.value}
                  </span>
                  <div className="w-full flex justify-center">
                    <div
                      className="w-8 rounded-t-md bg-primary/80 hover:bg-primary transition-colors"
                      style={{ height: `${height}%`, minHeight: "8px" }}
                    />
                  </div>
                  <span className="text-[0.65rem] text-text-muted">
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Agent Usage Ranking */}
        <div className="bg-surface border border-border-light rounded-xl p-5">
          <h3 className="text-[0.82rem] font-semibold text-text mb-4">
            Agent 使用排行
          </h3>
          <div className="space-y-3">
            {agentUsage.map((a, i) => {
              const maxVal = Math.max(...agentUsage.map((x) => x.value));
              const width = (a.value / maxVal) * 100;
              return (
                <div
                  key={a.name}
                  className="space-y-1"
                  style={{ animation: `fade-in 0.3s ease-out ${i * 60}ms both` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[0.75rem] text-text-secondary">
                      {a.name}
                    </span>
                    <span className="text-[0.72rem] font-semibold text-text">
                      {a.value}次
                    </span>
                  </div>
                  <div className="h-2 bg-bg-alt rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", a.color)}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cost Distribution Donut */}
        <div className="bg-surface border border-border-light rounded-xl p-5">
          <h3 className="text-[0.82rem] font-semibold text-text mb-4">
            成本分布
          </h3>
          <div className="flex items-center gap-6">
            <div className="relative w-[120px] h-[120px] shrink-0">
              <div
                className="w-full h-full rounded-full"
                style={{
                  background: `conic-gradient(${costDistribution
                    .reduce(
                      (acc, item) => {
                        const start = acc.offset;
                        const end = start + item.pct;
                        acc.parts.push(`${item.color} ${start}% ${end}%`);
                        acc.offset = end;
                        return acc;
                      },
                      { parts: [] as string[], offset: 0 }
                    )
                    .parts.join(", ")})`,
                }}
              >
                <div className="absolute inset-[25px] bg-surface rounded-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-[0.9rem] font-bold text-text">¥12.8</div>
                    <div className="text-[0.6rem] text-text-muted">总费用</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2.5 flex-1">
              {costDistribution.map((item, i) => (
                <div
                  key={item.name}
                  className="flex items-center gap-2"
                  style={{ animation: `fade-in 0.3s ease-out ${i * 50}ms both` }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[0.75rem] text-text-secondary flex-1">
                    {item.name}
                  </span>
                  <span className="text-[0.75rem] font-semibold text-text">
                    {item.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Task Duration Distribution */}
        <div className="bg-surface border border-border-light rounded-xl p-5">
          <h3 className="text-[0.82rem] font-semibold text-text mb-4">
            任务完成时间分布
          </h3>
          <div className="flex items-end justify-between gap-3 h-[140px]">
            {timeBuckets.map((b, i) => {
              const maxVal = Math.max(...timeBuckets.map((t) => t.value));
              const height = (b.value / maxVal) * 100;
              return (
                <div
                  key={b.label}
                  className="flex-1 flex flex-col items-center gap-1.5"
                  style={{ animation: `fade-in 0.3s ease-out ${i * 50}ms both` }}
                >
                  <span className="text-[0.65rem] font-semibold text-text">
                    {b.value}
                  </span>
                  <div className="w-full flex justify-center">
                    <div
                      className="w-10 rounded-t-md bg-sage/80 hover:bg-sage transition-colors"
                      style={{ height: `${height}%`, minHeight: "8px" }}
                    />
                  </div>
                  <span className="text-[0.65rem] text-text-muted">
                    {b.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsView() {
  const [theme, setTheme] = useState("light");
  const [language, setLanguage] = useState("zh-CN");
  const [encryption, setEncryption] = useState(true);
  const [taskNotify, setTaskNotify] = useState(true);
  const [failNotify, setFailNotify] = useState(true);
  const [budgetNotify, setBudgetNotify] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [costTier, setCostTier] = useState("medium");
  const [qualityGate, setQualityGate] = useState("standard");
  const [archiveDays, setArchiveDays] = useState("30");

  const toggleKeyVisibility = (key: string) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const apiKeys = [
    { provider: "OpenAI", key: "sk-proj-****...****7xKa", id: "openai" },
    { provider: "Anthropic", key: "sk-ant-****...****9mBq", id: "anthropic" },
    { provider: "阿里云", key: "sk-ali-****...****3nPw", id: "aliyun" },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[720px] space-y-6">
        {/* General Settings */}
        <SettingsSection
          title="常规设置"
          delay={60}
        >
          <SettingsRow label="界面语言">
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={cn(
                  "appearance-none rounded-lg border border-border-light bg-bg px-3 py-2 pr-8",
                  "text-[0.78rem] text-text",
                  "focus:outline-none focus:border-primary cursor-pointer"
                )}
              >
                <option value="zh-CN">简体中文</option>
                <option value="en-US">English</option>
                <option value="ja-JP">日本語</option>
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            </div>
          </SettingsRow>
          <SettingsRow label="主题模式">
            <div className="inline-flex items-center gap-1 bg-bg rounded-lg p-1">
              {[
                { id: "light", label: "浅色" },
                { id: "dark", label: "深色" },
                { id: "auto", label: "自动" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setTheme(opt.id)}
                  className={cn(
                    "px-3 py-1 rounded-md text-[0.75rem] font-medium transition-all cursor-pointer",
                    theme === opt.id
                      ? "bg-surface text-text shadow-sm"
                      : "text-text-muted hover:text-text-secondary"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </SettingsRow>
        </SettingsSection>

        {/* Security Settings */}
        <SettingsSection
          title="安全设置"
          icon={<Shield size={15} className="text-primary" />}
          delay={120}
        >
          <div className="mb-4">
            <h4 className="text-[0.75rem] font-medium text-text-secondary mb-3">
              API Key 管理
            </h4>
            <div className="space-y-2">
              {apiKeys.map((ak) => (
                <div
                  key={ak.id}
                  className="flex items-center justify-between rounded-lg border border-border-light px-3 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[0.78rem] font-medium text-text w-16">
                      {ak.provider}
                    </span>
                    <span className="text-[0.75rem] text-text-muted font-mono">
                      {showKeys[ak.id] ? "sk-real-key-would-be-here-abc123" : ak.key}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleKeyVisibility(ak.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text hover:bg-bg-alt transition-colors cursor-pointer"
                  >
                    {showKeys[ak.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
          <SettingsRow label="数据加密">
            <Toggle checked={encryption} onChange={setEncryption} />
          </SettingsRow>
        </SettingsSection>

        {/* Execution Settings */}
        <SettingsSection
          title="执行设置"
          icon={<Zap size={15} className="text-sand" />}
          delay={180}
        >
          <SettingsRow label="默认成本档位">
            <div className="relative">
              <select
                value={costTier}
                onChange={(e) => setCostTier(e.target.value)}
                className={cn(
                  "appearance-none rounded-lg border border-border-light bg-bg px-3 py-2 pr-8",
                  "text-[0.78rem] text-text",
                  "focus:outline-none focus:border-primary cursor-pointer"
                )}
              >
                <option value="low">低 — 优先成本</option>
                <option value="medium">中 — 平衡模式</option>
                <option value="high">高 — 优先质量</option>
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            </div>
          </SettingsRow>
          <SettingsRow label="默认质量门禁">
            <div className="relative">
              <select
                value={qualityGate}
                onChange={(e) => setQualityGate(e.target.value)}
                className={cn(
                  "appearance-none rounded-lg border border-border-light bg-bg px-3 py-2 pr-8",
                  "text-[0.78rem] text-text",
                  "focus:outline-none focus:border-primary cursor-pointer"
                )}
              >
                <option value="strict">严格 — 失败即停止</option>
                <option value="standard">标准 — 允许降级重试</option>
                <option value="loose">宽松 — 仅记录警告</option>
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            </div>
          </SettingsRow>
          <SettingsRow label="自动归档天数">
            <input
              type="number"
              value={archiveDays}
              onChange={(e) => setArchiveDays(e.target.value)}
              className={cn(
                "w-[100px] rounded-lg border border-border-light bg-bg px-3 py-2",
                "text-[0.78rem] text-text text-center",
                "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20",
                "transition-colors"
              )}
            />
          </SettingsRow>
        </SettingsSection>

        {/* Notification Settings */}
        <SettingsSection
          title="通知"
          icon={<Bell size={15} className="text-lavender" />}
          delay={240}
        >
          <SettingsRow label="任务完成通知">
            <Toggle checked={taskNotify} onChange={setTaskNotify} />
          </SettingsRow>
          <SettingsRow label="失败告警通知">
            <Toggle checked={failNotify} onChange={setFailNotify} />
          </SettingsRow>
          <SettingsRow label="超预算告警">
            <Toggle checked={budgetNotify} onChange={setBudgetNotify} />
          </SettingsRow>
        </SettingsSection>
      </div>
    </div>
  );
}

function SettingsSection({
  title,
  icon,
  delay = 0,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="bg-surface border border-border-light rounded-xl p-5"
      style={{ animation: `fade-in 0.3s ease-out ${delay}ms both` }}
    >
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border-light">
        {icon}
        <h3 className="text-[0.85rem] font-semibold text-text">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function SettingsRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[0.78rem] text-text-secondary">{label}</span>
      {children}
    </div>
  );
}
