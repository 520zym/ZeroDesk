import { NavLink, useLocation } from "react-router";
import {
  CheckSquare,
  Terminal,
  Clock,
  User,
  Users,
  Layers,
  Wrench,
  BookOpen,
  FileText,
  LayoutDashboard,
  Settings,
  type LucideIcon,
  ChevronRight,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTaskStats } from "@/hooks/useTasks";

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  badge?: string;
  badgeColor?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

function useNavGroups(): NavGroup[] {
  const { data: stats } = useTaskStats();
  const runningCount = stats?.running ?? 0;

  return [
    {
      label: "工作",
      items: [
        {
          to: "/tasks",
          icon: CheckSquare,
          label: "任务中心",
          ...(runningCount > 0 && {
            badge: String(runningCount),
            badgeColor: "bg-gradient-to-r from-primary to-lavender text-white",
          }),
        },
        { to: "/console", icon: Terminal, label: "执行控制台" },
        { to: "/history", icon: Clock, label: "任务历史" },
      ],
    },
    {
      label: "组织",
      items: [
        { to: "/agents", icon: User, label: "Agent 管理" },
        { to: "/teams", icon: Users, label: "团队管理" },
      ],
    },
    {
      label: "能力",
      items: [
        { to: "/models", icon: Layers, label: "模型与路由" },
        { to: "/skills", icon: Wrench, label: "Skills 中心" },
      ],
    },
    {
      label: "资产",
      items: [
        { to: "/knowledge", icon: BookOpen, label: "知识库" },
        { to: "/prompts", icon: FileText, label: "Prompt 模板" },
      ],
    },
    {
      label: "洞察",
      items: [
        { to: "/dashboard", icon: LayoutDashboard, label: "数据看板" },
      ],
    },
  ];
}

export function Sidebar() {
  const location = useLocation();
  const navGroups = useNavGroups();

  return (
    <aside className="w-[var(--sidebar-width)] min-w-[var(--sidebar-width)] bg-surface flex flex-col h-screen overflow-hidden select-none border-r border-border-light">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-lavender flex items-center justify-center shadow-md shadow-primary/20">
          <Zap size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col">
          <span className="text-[0.95rem] font-bold text-text tracking-tight leading-none">
            ZeroDesk
          </span>
          <span className="text-[0.65rem] text-text-muted font-medium tracking-wider uppercase mt-0.5">
            Agent Workbench
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-border-light" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="px-2 pb-2 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-text-muted/70">
              {group.label}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = (() => {
                  if (location.pathname === item.to) return true;
                  const taskSubPage = location.pathname.match(/^\/tasks\/[^/]+\/(\w+)/);
                  if (taskSubPage) {
                    return item.to === `/${taskSubPage[1]}`;
                  }
                  return location.pathname.startsWith(item.to + "/");
                })();
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "group relative flex items-center gap-2.5 px-2.5 py-[8px] rounded-lg text-[0.85rem] transition-all duration-150 no-underline cursor-pointer",
                      isActive
                        ? "bg-primary-light text-primary font-semibold"
                        : "text-text-secondary hover:bg-bg-alt hover:text-text"
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-gradient-to-b from-primary to-lavender" />
                    )}
                    <item.icon
                      size={18}
                      strokeWidth={isActive ? 2.2 : 1.8}
                      className={cn(
                        "shrink-0 transition-colors duration-150",
                        isActive ? "text-primary" : "text-text-muted group-hover:text-text-secondary"
                      )}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span
                        className={cn(
                          "text-[0.65rem] font-semibold min-w-[18px] h-[18px] rounded-full flex items-center justify-center leading-none",
                          item.badgeColor || "bg-bg-alt text-text-muted"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <ChevronRight size={14} className="text-primary/50 shrink-0" />
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="mx-3 h-px bg-border-light" />
      <div className="px-3 py-3">
        <NavLink
          to="/settings"
          className={cn(
            "flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-150 no-underline cursor-pointer",
            location.pathname === "/settings"
              ? "bg-primary-light text-primary font-semibold"
              : "text-text-secondary hover:bg-bg-alt hover:text-text"
          )}
        >
          <Settings
            size={18}
            strokeWidth={location.pathname === "/settings" ? 2.2 : 1.8}
            className={cn(
              "shrink-0 transition-colors duration-150",
              location.pathname === "/settings" ? "text-primary" : "text-text-muted"
            )}
          />
          <span className="text-[0.85rem]">系统设置</span>
        </NavLink>
      </div>
    </aside>
  );
}
