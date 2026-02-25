import { Link } from "react-router";
import { CheckSquare, Plus, Download, ArrowRight, Zap } from "lucide-react";
import { RECENT_TASKS } from "@/mocks/workspace";

export default function WorkspacePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg overflow-auto p-8">
      <div className="max-w-[640px] w-full">
        {/* Brand */}
        <div className="text-center mb-10" style={{ animation: "fade-in-up 0.4s ease-out" }}>
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-lavender inline-flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
            <Zap size={26} className="text-white" strokeWidth={2} />
          </div>
          <h1 className="text-[1.75rem] font-bold text-text tracking-tight">
            ZeroDesk
          </h1>
          <p className="text-text-secondary text-[0.9rem] mt-1">
            Multi-Agent 团队工作台
          </p>
        </div>

        {/* Recent Tasks */}
        <div
          className="mb-8"
          style={{ animation: "fade-in-up 0.4s ease-out 0.1s both" }}
        >
          <div className="text-[0.72rem] font-semibold text-text-muted uppercase tracking-[0.08em] mb-2.5 px-1">
            最近任务
          </div>
          <div className="flex flex-col gap-2">
            {RECENT_TASKS.map((task, i) => (
              <Link
                key={task.name}
                to="/tasks"
                className="group bg-surface border border-border-light rounded-xl px-4 py-3.5 flex items-center gap-3.5 no-underline text-text transition-all hover:border-primary/30 hover:shadow-card-hover"
                style={{ animation: `fade-in 0.3s ease-out ${0.15 + i * 0.05}s both` }}
              >
                <div
                  className={`w-10 h-10 rounded-lg bg-gradient-to-br ${task.color} flex items-center justify-center shrink-0 shadow-sm`}
                >
                  <CheckSquare size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[0.88rem] font-semibold mb-0.5 group-hover:text-primary transition-colors">
                    {task.name}
                  </h3>
                  <div className="flex items-center gap-3 text-[0.72rem] text-text-muted">
                    <span>{task.agents} 个 Agent</span>
                    <span className="text-border">|</span>
                    <span>{task.time}</span>
                  </div>
                </div>
                <ArrowRight
                  size={14}
                  className="text-text-muted opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all shrink-0"
                />
              </Link>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex gap-2.5 mb-10"
          style={{ animation: "fade-in-up 0.4s ease-out 0.3s both" }}
        >
          <Link
            to="/tasks"
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-lavender text-white rounded-xl py-3 text-[0.88rem] font-medium no-underline transition-all hover:shadow-glow shadow-sm"
          >
            <Plus size={16} strokeWidth={2.5} />
            新建任务
          </Link>
          <button className="flex-1 flex items-center justify-center gap-2 bg-surface text-text-secondary border border-border-light rounded-xl py-3 text-[0.88rem] font-medium cursor-pointer transition-all hover:border-border-hover hover:text-text shadow-xs">
            <Download size={16} />
            导入任务
          </button>
        </div>

        {/* Footer */}
        <div
          className="text-center text-text-muted text-[0.72rem]"
          style={{ animation: "fade-in 0.4s ease-out 0.4s both" }}
        >
          ZeroDesk v0.1.0 · 本地优先 · 数据不离开你的电脑
        </div>
      </div>
    </div>
  );
}
