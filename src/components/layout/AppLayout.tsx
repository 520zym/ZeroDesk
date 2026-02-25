import { Outlet, useLocation } from "react-router";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

const PAGE_TITLES: Record<string, string> = {
  "/tasks": "任务中心",
  "/console": "执行控制台",
  "/history": "任务历史",
  "/agents": "Agent 管理",
  "/teams": "团队管理",
  "/models": "模型与路由",
  "/skills": "Skills 中心",
  "/knowledge": "知识库",
  "/prompts": "Prompt/模板中心",
  "/dashboard": "数据看板",
  "/settings": "系统设置",
};

function getTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(path)) return title;
  }
  return "ZeroDesk";
}

export function AppLayout() {
  const location = useLocation();
  const title = getTitle(location.pathname);

  return (
    <div className="flex h-screen w-screen bg-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6" style={{ animation: "fade-in 0.25s ease-out" }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
