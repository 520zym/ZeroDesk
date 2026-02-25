import { Link } from "react-router";
import { Search, Pause, Bell, FolderOpen, Command } from "lucide-react";

interface TopbarProps {
  title: string;
}

export function Topbar({ title }: TopbarProps) {
  return (
    <header className="h-[var(--topbar-height)] min-h-[var(--topbar-height)] bg-surface/80 backdrop-blur-sm border-b border-border-light flex items-center px-6 gap-3 z-10">
      <h1 className="text-[0.95rem] font-semibold text-text mr-auto tracking-tight">
        {title}
      </h1>

      {/* Search */}
      <button
        className="flex items-center gap-2 bg-bg/80 border border-border-light rounded-lg px-3 py-1.5 w-[240px] transition-all hover:border-primary/30 hover:shadow-sm cursor-pointer group"
        title="搜索 (Ctrl+K)"
      >
        <Search size={14} className="text-text-muted shrink-0" />
        <span className="text-[0.8rem] text-text-muted flex-1 text-left">搜索...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[0.65rem] text-text-muted/70 bg-surface border border-border-light rounded px-1.5 py-0.5 font-mono">
          <Command size={10} />K
        </kbd>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-1 ml-1">
        <button
          className="w-8 h-8 rounded-lg border-none bg-transparent text-text-muted flex items-center justify-center cursor-pointer transition-all hover:bg-bg-alt hover:text-text"
          title="全局暂停"
        >
          <Pause size={16} />
        </button>
        <button
          className="w-8 h-8 rounded-lg border-none bg-transparent text-text-muted flex items-center justify-center cursor-pointer transition-all hover:bg-bg-alt hover:text-text relative"
          title="通知"
        >
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-coral rounded-full" />
        </button>
        <Link
          to="/workspace"
          className="w-8 h-8 rounded-lg bg-transparent text-text-muted flex items-center justify-center transition-all hover:bg-bg-alt hover:text-text"
          title="切换工作区"
        >
          <FolderOpen size={16} />
        </Link>
      </div>
    </header>
  );
}
