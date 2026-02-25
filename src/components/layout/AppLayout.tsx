import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { listen } from "@tauri-apps/api/event";
import { useQueryClient } from "@tanstack/react-query";
import { useStreamStore, type ExecutionChunkPayload } from "@/stores/useStreamStore";

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
  if (pathname.includes("/console")) return "执行控制台";
  if (pathname.includes("/plan")) return "任务规划";
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(path)) return title;
  }
  return "ZeroDesk";
}

export function AppLayout() {
  const location = useLocation();
  const title = getTitle(location.pathname);
  const queryClient = useQueryClient();

  useEffect(() => {
    const unlistenPromise = listen<ExecutionChunkPayload>("execution:chunk", (event) => {
      const p = event.payload;
      const taskId = p.task_id;
      const store = useStreamStore.getState();

      if (p.chunk_type === "content") {
        store.appendContent(taskId, p.step_id, p.agent_id, p.agent_name, p.chunk);
      } else if (p.chunk_type === "thinking") {
        store.appendThinking(taskId, p.step_id, p.agent_id, p.agent_name, p.chunk);
      } else if (p.chunk_type === "step_done" || p.chunk_type === "task_done") {
        store.clearStream(taskId);
        queryClient.invalidateQueries({ queryKey: ["execution-messages", taskId] });
        queryClient.invalidateQueries({ queryKey: ["task-steps", taskId] });
        queryClient.invalidateQueries({ queryKey: ["task", taskId] });
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["tasks", "running"] });
        queryClient.invalidateQueries({ queryKey: ["task-stats"] });
      } else if (p.chunk_type === "step_start") {
        queryClient.invalidateQueries({ queryKey: ["execution-messages", taskId] });
        queryClient.invalidateQueries({ queryKey: ["task-steps", taskId] });
      } else if (p.chunk_type === "error") {
        store.clearStream(taskId);
        queryClient.invalidateQueries({ queryKey: ["execution-messages", taskId] });
        queryClient.invalidateQueries({ queryKey: ["task-steps", taskId] });
        queryClient.invalidateQueries({ queryKey: ["task", taskId] });
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      }
    });

    return () => {
      unlistenPromise.then((fn) => fn());
    };
  }, [queryClient]);

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
