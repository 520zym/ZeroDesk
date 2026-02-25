import {
  ListChecks,
  Target,
  Coins,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/ui";

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
  return (
    <div className="flex flex-col h-full overflow-hidden px-4 sm:px-6 pt-5 pb-6">
      {/* Header */}
      <div
        className="shrink-0 mb-5"
        style={{ animation: "fade-in 0.3s ease-out" }}
      >
        <p className="text-[0.82rem] text-text-secondary">全局数据可视化与关键指标监控</p>
      </div>

      <DashboardView />
    </div>
  );
}

function DashboardView() {
  return (
    <div className="flex-1 overflow-y-auto space-y-5">
      {/* KPI Row */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
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
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
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

