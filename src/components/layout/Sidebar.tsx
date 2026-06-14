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
  PanelLeftClose,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTaskStats } from "@/hooks/useTasks";
import { useAppStore } from "@/stores/useAppStore";

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
  const { sidebarCollapsed, toggleSidebar } = useAppStore();

  return (
    <aside
      className={cn(
        "bg-surface flex flex-col h-screen overflow-hidden select-none border-r border-border-light transition-[width,min-width] duration-200 ease-out",
        sidebarCollapsed
          ? "w-[76px] min-w-[76px]"
          : "w-[var(--sidebar-width)] min-w-[var(--sidebar-width)]",
      )}
    >
      {/* Logo */}
      <div
        onClick={sidebarCollapsed ? toggleSidebar : undefined}
        title={sidebarCollapsed ? "展开侧边栏" : undefined}
        className={cn(
          "relative pt-5 pb-4 flex items-center",
          sidebarCollapsed
            ? "justify-center px-3 cursor-pointer"
            : "gap-3 px-5",
        )}
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-lavender flex items-center justify-center shadow-md shadow-primary/20">
          <Zap size={16} className="text-white" strokeWidth={2.5} />
        </div>
        {!sidebarCollapsed && (
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-[0.95rem] font-bold text-text tracking-tight leading-none">
              ZeroDesk
            </span>
            <span className="text-[0.65rem] text-text-muted font-medium tracking-wider uppercase mt-0.5">
              Agent Workbench
            </span>
          </div>
        )}
        {!sidebarCollapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            title="收起侧边栏"
            className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted/70 transition-colors hover:bg-bg-alt hover:text-text-secondary cursor-pointer"
          >
            <PanelLeftClose size={15} strokeWidth={1.9} />
          </button>
        )}
      </div>

      {/* Divider */}
      <div className={cn("h-px bg-border-light", sidebarCollapsed ? "mx-3" : "mx-4")} />

      {/* Navigation */}
      <nav
        className={cn(
          "flex-1 overflow-y-auto py-3",
          sidebarCollapsed ? "px-2 space-y-3" : "px-3 space-y-5",
        )}
      >
        {navGroups.map((group) => (
          <div key={group.label}>
            {!sidebarCollapsed && (
              <div className="px-2 pb-2 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-text-muted/70">
                {group.label}
              </div>
            )}
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
                    title={sidebarCollapsed ? item.label : undefined}
                    className={cn(
                      "group relative flex items-center rounded-lg text-[0.85rem] transition-all duration-150 no-underline cursor-pointer",
                      sidebarCollapsed
                        ? "h-10 justify-center px-0"
                        : "gap-2.5 px-2.5 py-[8px]",
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
                    {!sidebarCollapsed && (
                      <span className="flex-1 truncate">{item.label}</span>
                    )}
                    {item.badge && (
                      <span
                        className={cn(
                          "text-[0.65rem] font-semibold min-w-[18px] h-[18px] rounded-full flex items-center justify-center leading-none",
                          sidebarCollapsed && "absolute right-1 top-1 h-2 min-w-2 text-[0] p-0",
                          item.badgeColor || "bg-bg-alt text-text-muted"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isActive && !sidebarCollapsed && (
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
      <div className={cn("py-3", sidebarCollapsed ? "px-2" : "px-3")}>
        <NavLink
          to="/settings"
          title={sidebarCollapsed ? "系统设置" : undefined}
          className={cn(
            "relative flex items-center rounded-lg transition-all duration-150 no-underline cursor-pointer",
            sidebarCollapsed ? "h-10 justify-center px-0" : "gap-2.5 px-2.5 py-2",
            location.pathname === "/settings"
              ? "bg-primary-light text-primary font-semibold"
              : "text-text-secondary hover:bg-bg-alt hover:text-text"
          )}
        >
          {location.pathname === "/settings" && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-gradient-to-b from-primary to-lavender" />
          )}
          <Settings
            size={18}
            strokeWidth={location.pathname === "/settings" ? 2.2 : 1.8}
            className={cn(
              "shrink-0 transition-colors duration-150",
              location.pathname === "/settings" ? "text-primary" : "text-text-muted"
            )}
          />
          {!sidebarCollapsed && <span className="text-[0.85rem]">系统设置</span>}
        </NavLink>
      </div>
    </aside>
  );
}
