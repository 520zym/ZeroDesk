import { useState, useCallback } from "react";
import {
  Download,
  Trash2,
  Search,
  ChevronDown,
  ListChecks,
  Target,
  Clock,
  Coins,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
  Lightbulb,
  X,
  FileSearch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatCard, Badge } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";

interface HistoryRow {
  id: string;
  name: string;
  team: string;
  status: BadgeVariant;
  statusLabel: string;
  nodes: string;
  tokens: string;
  duration: string;
  time: string;
  actions: boolean;
}

const statusLabels: Record<string, string> = {
  completed: "已完成",
  failed: "失败",
  archived: "已归档",
};

const mockRows: HistoryRow[] = [
  { id: "h1", name: "竞品分析：AI 编程工具对比", team: "竞品分析小队", status: "completed", statusLabel: "已完成", nodes: "4/4", tokens: "15,247", duration: "4m 12s", time: "今天 14:32", actions: true },
  { id: "h2", name: "周报数据汇总与可视化", team: "数据组", status: "completed", statusLabel: "已完成", nodes: "3/3", tokens: "8,102", duration: "2m 48s", time: "今天 11:20", actions: true },
  { id: "h3", name: "API 接口文档自动生成", team: "文档组", status: "failed", statusLabel: "失败", nodes: "1/3", tokens: "3,421", duration: "1m 05s", time: "昨天 16:45", actions: true },
  { id: "h4", name: "用户反馈分析", team: "反馈小队", status: "completed", statusLabel: "已完成", nodes: "3/3", tokens: "12,088", duration: "5m 33s", time: "昨天 10:15", actions: true },
  { id: "h5", name: "技术方案评审", team: "评审组", status: "failed", statusLabel: "失败", nodes: "2/4", tokens: "6,721", duration: "3m 12s", time: "2天前", actions: true },
  { id: "h6", name: "Q4 NPS 报告", team: "反馈小队", status: "archived", statusLabel: "已归档", nodes: "3/3", tokens: "9,450", duration: "4m 50s", time: "3天前", actions: false },
];

const filterPills = ["全部", "今天", "本周", "本月"];

export default function HistoryPage() {
  const [activeFilter, setActiveFilter] = useState("全部");
  const [searchQuery, setSearchQuery] = useState("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const toggleReview = useCallback((id: string) => {
    setReviewingId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden px-4 sm:px-6 pt-5 pb-6">
      {/* Header */}
      <div
        className="shrink-0 flex items-center justify-between mb-5"
        style={{ animation: "fade-in 0.3s ease-out" }}
      >
        <p className="text-[0.82rem] text-text-secondary">查看历史执行记录，进行故障复盘与一键重执行</p>
        <div className="flex items-center gap-2">
          <button
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg",
              "text-[0.78rem] font-medium text-text-secondary",
              "border border-border-light bg-surface",
              "hover:bg-bg-alt hover:text-text transition-colors cursor-pointer"
            )}
          >
            <Download size={14} />
            导出
          </button>
          <button
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg",
              "text-[0.78rem] font-medium text-danger",
              "border border-danger-light bg-danger-light/50",
              "hover:bg-danger-light transition-colors cursor-pointer"
            )}
          >
            <Trash2 size={14} />
            清理
          </button>
        </div>
      </div>

      {/* Stats */}
      <div
        className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5"
        style={{ animation: "fade-in 0.3s ease-out 60ms both" }}
      >
        <StatCard
          icon={ListChecks}
          iconColor="text-primary"
          iconBg="bg-primary-light"
          value="22"
          label="总任务"
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
          icon={Clock}
          iconColor="text-lavender"
          iconBg="bg-lavender-light"
          value="4m 32s"
          label="平均耗时"
        />
        <StatCard
          icon={Coins}
          iconColor="text-sand"
          iconBg="bg-sand-light"
          value="¥12.80"
          label="总消耗"
        />
      </div>

      {/* Filter bar */}
      <div
        className="shrink-0 flex items-center gap-3 mb-4"
        style={{ animation: "fade-in 0.3s ease-out 120ms both" }}
      >
        <div className="inline-flex items-center gap-1 bg-bg rounded-lg p-1">
          {filterPills.map((pill) => (
            <button
              key={pill}
              onClick={() => setActiveFilter(pill)}
              className={cn(
                "px-3 py-1 rounded-md text-[0.75rem] font-medium transition-all cursor-pointer",
                activeFilter === pill
                  ? "bg-surface text-text shadow-sm"
                  : "text-text-muted hover:text-text-secondary"
              )}
            >
              {pill}
            </button>
          ))}
        </div>

        <div className="relative">
          <select
            className={cn(
              "appearance-none rounded-lg border border-border-light bg-surface px-3 py-1.5 pr-7",
              "text-[0.75rem] text-text-secondary",
              "focus:outline-none focus:border-primary cursor-pointer"
            )}
          >
            <option>全部团队</option>
            <option>竞品分析小队</option>
            <option>数据组</option>
            <option>文档组</option>
            <option>反馈小队</option>
            <option>评审组</option>
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        </div>

        <div className="relative ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="搜索任务..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-[220px] rounded-lg border border-border-light bg-surface pl-8 pr-3 py-1.5",
              "text-[0.75rem] text-text placeholder:text-text-muted",
              "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20",
              "transition-colors"
            )}
          />
        </div>
      </div>

      {/* Table */}
      <div
        className="flex-1 min-h-0 bg-surface border border-border-light rounded-xl overflow-hidden flex flex-col"
        style={{ animation: "fade-in 0.35s ease-out 180ms both" }}
      >
        <div className="overflow-y-auto flex-1">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-light bg-bg-alt/50">
                {["任务名称", "团队", "状态", "节点进度", "Token 用量", "耗时", "时间", "操作"].map(
                  (col) => (
                    <th
                      key={col}
                      className="text-left px-4 py-2.5 text-[0.7rem] font-semibold text-text-muted uppercase tracking-wide"
                    >
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {mockRows.map((row, i) => (
                <>
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-border-light transition-colors",
                      row.status === "failed"
                        ? "bg-danger-light/30"
                        : "hover:bg-bg-alt/30"
                    )}
                    style={{ animation: `fade-in 0.3s ease-out ${180 + i * 50}ms both` }}
                  >
                    <td className="px-4 py-3">
                      <span className="text-[0.78rem] font-medium text-text">
                        {row.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[0.75rem] text-text-secondary">
                        {row.team}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={row.status}>
                        {statusLabels[row.status] || row.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[0.75rem] text-text-secondary font-mono">
                        {row.nodes}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[0.75rem] text-text-secondary font-mono">
                        {row.tokens}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[0.75rem] text-text-secondary">
                        {row.duration}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[0.72rem] text-text-muted">
                        {row.time}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.actions && (
                        <div className="flex items-center gap-2">
                          <button className="inline-flex items-center gap-1 text-[0.72rem] font-medium text-primary hover:text-primary-hover transition-colors cursor-pointer">
                            <ExternalLink size={11} />
                            详情
                          </button>
                          {row.status === "failed" ? (
                            <button
                              onClick={() => toggleReview(row.id)}
                              className={cn(
                                "inline-flex items-center gap-1 text-[0.72rem] font-medium transition-colors cursor-pointer",
                                reviewingId === row.id
                                  ? "text-danger"
                                  : "text-danger hover:text-danger"
                              )}
                            >
                              <FileSearch size={11} />
                              复盘
                            </button>
                          ) : row.status === "completed" ? (
                            <button className="inline-flex items-center gap-1 text-[0.72rem] font-medium text-sage hover:text-sage transition-colors cursor-pointer">
                              <RotateCcw size={11} />
                              重新执行
                            </button>
                          ) : null}
                        </div>
                      )}
                    </td>
                  </tr>
                  {reviewingId === row.id && row.status === "failed" && (
                    <tr key={`${row.id}-review`}>
                      <td colSpan={8} className="p-0">
                        <FailureReviewPanel onClose={() => setReviewingId(null)} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FailureReviewPanel({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="mx-4 my-3 bg-danger-light/40 border border-danger/15 rounded-xl p-5"
      style={{ animation: "fade-in 0.25s ease-out" }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-danger" />
          <h3 className="text-[0.85rem] font-semibold text-text">故障复盘</h3>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-md text-text-muted hover:text-text hover:bg-bg-alt transition-colors cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex gap-3">
          <span className="shrink-0 text-[0.75rem] font-medium text-danger w-16">
            错误
          </span>
          <span className="text-[0.78rem] text-text">
            第 2 步执行超时
          </span>
        </div>
        <div className="flex gap-3">
          <span className="shrink-0 text-[0.75rem] font-medium text-text-secondary w-16">
            根因
          </span>
          <span className="text-[0.78rem] text-text-secondary">
            Claude 3.5 Sonnet 响应延迟过高（&gt;60s），触发超时保护
          </span>
        </div>
        <div className="flex gap-3">
          <span className="shrink-0 text-[0.75rem] font-medium text-text-secondary w-16 flex items-center gap-1">
            <Lightbulb size={12} className="text-sand" />
            建议
          </span>
          <div className="text-[0.78rem] text-text-secondary">
            <ol className="list-decimal list-inside space-y-1">
              <li>启用模型降级策略</li>
              <li>增加超时阈值</li>
              <li>拆分长步骤</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-danger/10">
        <button
          className={cn(
            "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg",
            "text-[0.78rem] font-medium bg-primary text-white",
            "hover:bg-primary-hover transition-colors cursor-pointer shadow-sm"
          )}
        >
          <Lightbulb size={13} />
          应用建议
        </button>
        <button
          onClick={onClose}
          className={cn(
            "px-4 py-2 rounded-lg text-[0.78rem] font-medium",
            "text-text-secondary hover:text-text hover:bg-bg-alt",
            "transition-colors cursor-pointer"
          )}
        >
          关闭
        </button>
      </div>
    </div>
  );
}
