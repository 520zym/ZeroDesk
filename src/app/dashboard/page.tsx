import { useMemo } from "react";
import { ListChecks, Target, Coins, Zap, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/ui";
import {
  useDashboardKpis,
  useHistoryStats,
  useWeeklyTaskTrend,
  useAgentUsageRanking,
  useCostDistribution,
  useTaskDurationDistribution,
} from "@/hooks/useDashboard";

const CHART_COLORS = ["#635BFF", "#14B8A6", "#F59E0B", "#E879F9", "#94A3B8"];
const AGENT_COLORS: Record<string, string> = {
  "bg-primary": "bg-primary",
  "bg-sage": "bg-sage",
  "bg-coral": "bg-coral",
  "bg-lavender": "bg-lavender",
  "bg-sand": "bg-sand",
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden px-4 sm:px-6 pt-5 pb-6">
      <div
        className="shrink-0 mb-5"
        style={{ animation: "fade-in 0.3s ease-out" }}
      >
        <p className="text-[0.82rem] text-text-secondary">
          全局数据可视化与关键指标监控
        </p>
      </div>
      <DashboardView />
    </div>
  );
}

function DashboardView() {
  const { data: kpis, isLoading: kpisLoading } = useDashboardKpis();
  const { data: historyStats } = useHistoryStats();
  const { data: weeklyTrend = [] } = useWeeklyTaskTrend();
  const { data: agentUsage = [] } = useAgentUsageRanking();
  const { data: costDist = [] } = useCostDistribution();
  const { data: durationDist = [] } = useTaskDurationDistribution();

  const weeklyData = useMemo(() => {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - 6 + i);
      const dateStr = d.toISOString().split("T")[0];
      const found = weeklyTrend.find((t) => t.day === dateStr);
      return { day: dayNames[d.getDay()], value: found?.count ?? 0 };
    });
  }, [weeklyTrend]);

  const weeklyTotal = weeklyData.reduce((s, d) => s + d.value, 0);
  const totalCost = kpis?.total_cost ?? 0;

  if (kpisLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 size={24} className="animate-spin text-text-muted" />
      </div>
    );
  }

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
          value={String(weeklyTotal)}
          label="本周任务"
        />
        <StatCard
          icon={Target}
          iconColor="text-success"
          iconBg="bg-success-light"
          value={
            historyStats
              ? `${historyStats.success_rate.toFixed(1)}%`
              : "—"
          }
          label="成功率"
        />
        <StatCard
          icon={Zap}
          iconColor="text-lavender"
          iconBg="bg-lavender-light"
          value={formatTokens(kpis?.total_tokens ?? 0)}
          label="Token 消耗"
        />
        <StatCard
          icon={Coins}
          iconColor="text-sand"
          iconBg="bg-sand-light"
          value={`¥${totalCost.toFixed(2)}`}
          label="总费用"
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
            {weeklyData.map((d, i) => {
              const maxVal = Math.max(...weeklyData.map((t) => t.value), 1);
              const height = (d.value / maxVal) * 100;
              return (
                <div
                  key={d.day}
                  className="flex-1 flex flex-col items-center gap-1.5"
                  style={{
                    animation: `fade-in 0.3s ease-out ${i * 50}ms both`,
                  }}
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
          {agentUsage.length === 0 ? (
            <p className="text-[0.75rem] text-text-muted text-center py-8">
              暂无数据
            </p>
          ) : (
            <div className="space-y-3">
              {agentUsage.map((a, i) => {
                const maxVal = Math.max(
                  ...agentUsage.map((x) => x.usage_count),
                  1,
                );
                const width = (a.usage_count / maxVal) * 100;
                const colorClass =
                  AGENT_COLORS[a.avatar_color ?? ""] ?? "bg-primary";
                return (
                  <div
                    key={a.agent_id}
                    className="space-y-1"
                    style={{
                      animation: `fade-in 0.3s ease-out ${i * 60}ms both`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[0.75rem] text-text-secondary">
                        {a.agent_name}
                      </span>
                      <span className="text-[0.72rem] font-semibold text-text">
                        {a.usage_count}次
                      </span>
                    </div>
                    <div className="h-2 bg-bg-alt rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          colorClass,
                        )}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cost Distribution Donut */}
        <div className="bg-surface border border-border-light rounded-xl p-5">
          <h3 className="text-[0.82rem] font-semibold text-text mb-4">
            成本分布
          </h3>
          {costDist.length === 0 ? (
            <p className="text-[0.75rem] text-text-muted text-center py-8">
              暂无数据
            </p>
          ) : (
            <CostDonut items={costDist} totalCost={totalCost} />
          )}
        </div>

        {/* Task Duration Distribution */}
        <div className="bg-surface border border-border-light rounded-xl p-5">
          <h3 className="text-[0.82rem] font-semibold text-text mb-4">
            任务完成时间分布
          </h3>
          {durationDist.length === 0 ? (
            <p className="text-[0.75rem] text-text-muted text-center py-8">
              暂无数据
            </p>
          ) : (
            <div className="flex items-end justify-between gap-3 h-[140px]">
              {durationDist.map((b, i) => {
                const maxVal = Math.max(
                  ...durationDist.map((t) => t.count),
                  1,
                );
                const height = (b.count / maxVal) * 100;
                return (
                  <div
                    key={b.label}
                    className="flex-1 flex flex-col items-center gap-1.5"
                    style={{
                      animation: `fade-in 0.3s ease-out ${i * 50}ms both`,
                    }}
                  >
                    <span className="text-[0.65rem] font-semibold text-text">
                      {b.count}
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
          )}
        </div>
      </div>
    </div>
  );
}

function CostDonut({
  items,
  totalCost,
}: {
  items: { name: string; cost: number; percentage: number }[];
  totalCost: number;
}) {
  const gradientParts = useMemo(() => {
    let offset = 0;
    return items
      .map((item, i) => {
        const color = CHART_COLORS[i % CHART_COLORS.length];
        const start = offset;
        const end = start + item.percentage;
        offset = end;
        return `${color} ${start}% ${end}%`;
      })
      .join(", ");
  }, [items]);

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-[120px] h-[120px] shrink-0">
        <div
          className="w-full h-full rounded-full"
          style={{ background: `conic-gradient(${gradientParts})` }}
        >
          <div className="absolute inset-[25px] bg-surface rounded-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-[0.9rem] font-bold text-text">
                ¥{totalCost.toFixed(2)}
              </div>
              <div className="text-[0.6rem] text-text-muted">总费用</div>
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-2.5 flex-1">
        {items.map((item, i) => (
          <div
            key={item.name}
            className="flex items-center gap-2"
            style={{
              animation: `fade-in 0.3s ease-out ${i * 50}ms both`,
            }}
          >
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{
                backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
              }}
            />
            <span className="text-[0.75rem] text-text-secondary flex-1">
              {item.name}
            </span>
            <span className="text-[0.75rem] font-semibold text-text">
              {item.percentage.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
