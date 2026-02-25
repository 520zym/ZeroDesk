import { Plus, Filter, MoreHorizontal, Sparkles } from "lucide-react";
import { TASK_STATS, MOCK_TASKS, STATUS_CONFIG } from "@/mocks/tasks";

export default function TasksPage() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-[1.25rem] font-bold text-text tracking-tight">任务中心</h2>
          <p className="text-[0.82rem] text-text-secondary mt-0.5">
            管理所有任务，追踪 Agent 执行进度
          </p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[0.82rem] font-medium bg-surface text-text-secondary border border-border-light cursor-pointer transition-all hover:border-border-hover hover:text-text shadow-xs">
            <Filter size={14} />
            筛选
          </button>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[0.82rem] font-medium bg-gradient-to-r from-primary to-lavender text-white border-none cursor-pointer transition-all hover:shadow-glow shadow-sm">
            <Plus size={15} strokeWidth={2.5} />
            新建任务
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {TASK_STATS.map((stat) => (
          <div
            key={stat.label}
            className={`bg-surface rounded-xl border border-border-light px-4 py-3.5 flex items-center gap-3 ring-1 ${stat.ring} transition-all hover:shadow-md cursor-default`}
          >
            <div
              className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}
            >
              <stat.icon size={18} className={stat.color} strokeWidth={2} />
            </div>
            <div>
              <div className="text-[1.4rem] font-bold font-mono leading-none tracking-tight">
                {stat.value}
              </div>
              <div className="text-[0.72rem] text-text-muted mt-1 font-medium">
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Task list */}
      <div className="bg-surface rounded-xl border border-border-light overflow-hidden shadow-card">
        {/* List header */}
        <div className="px-5 py-3 border-b border-border-light flex items-center gap-3 text-[0.75rem] font-medium text-text-muted uppercase tracking-wider">
          <span className="flex-1">任务</span>
          <span className="w-20 text-center">状态</span>
          <span className="w-16 text-center">Agent</span>
          <span className="w-32">进度</span>
          <span className="w-20 text-right">时间</span>
          <span className="w-8" />
        </div>

        {/* List items */}
        {MOCK_TASKS.map((task, i) => {
          const config = STATUS_CONFIG[task.status];
          return (
            <div
              key={task.id}
              className="px-5 py-3.5 flex items-center gap-3 border-b border-border-light/50 last:border-b-0 hover:bg-bg/50 transition-colors cursor-pointer group"
              style={{ animation: `fade-in 0.2s ease-out ${i * 0.05}s both` }}
            >
              <div className="flex-1 min-w-0">
                <div className="text-[0.85rem] font-medium text-text truncate group-hover:text-primary transition-colors">
                  {task.title}
                </div>
              </div>
              <div className="w-20 flex justify-center">
                <span className="inline-flex items-center gap-1.5 text-[0.72rem] font-medium">
                  <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
                  <span className={config.textClass}>{config.label}</span>
                </span>
              </div>
              <div className="w-16 text-center text-[0.78rem] text-text-secondary font-mono">
                {task.agents}
              </div>
              <div className="w-32">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-bg-alt rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        task.status === "failed"
                          ? "bg-gradient-to-r from-danger to-coral"
                          : task.progress === 100
                            ? "bg-gradient-to-r from-success to-sage"
                            : "bg-gradient-to-r from-primary to-lavender"
                      }`}
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  <span className="text-[0.7rem] text-text-muted font-mono w-8 text-right">
                    {task.progress}%
                  </span>
                </div>
              </div>
              <div className="w-20 text-right text-[0.72rem] text-text-muted">
                {task.time}
              </div>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted opacity-0 group-hover:opacity-100 transition-all hover:bg-bg-alt hover:text-text cursor-pointer bg-transparent border-none">
                <MoreHorizontal size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Quick action hint */}
      <div className="mt-4 flex items-center justify-center gap-2 text-[0.75rem] text-text-muted">
        <Sparkles size={12} className="text-primary" />
        <span>提示：使用自然语言描述你想完成的任务，AI 会自动分解为执行计划</span>
      </div>
    </div>
  );
}
