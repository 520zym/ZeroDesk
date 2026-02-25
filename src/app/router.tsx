import { createBrowserRouter, Navigate } from "react-router";
import { AppLayout } from "@/components/layout";

import TasksPage from "./tasks/page";
import PlanPage from "./plan/page";
import ConsolePage from "./console/page";
import AgentsPage from "./agents/page";
import TeamsPage from "./teams/page";
import ModelsPage from "./models/page";
import SkillsPage from "./skills/page";
import KnowledgePage from "./knowledge/page";
import PromptsPage from "./prompts/page";
import HistoryPage from "./history/page";
import DashboardPage from "./dashboard/page";
import SettingsPage from "./settings/page";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/tasks" replace /> },
      { path: "tasks", element: <TasksPage /> },
      { path: "tasks/:id/plan", element: <PlanPage /> },
      { path: "tasks/:id/console", element: <ConsolePage /> },
      { path: "console", element: <ConsolePage /> },
      { path: "agents", element: <AgentsPage /> },
      { path: "teams", element: <TeamsPage /> },
      { path: "models", element: <ModelsPage /> },
      { path: "skills", element: <SkillsPage /> },
      { path: "knowledge", element: <KnowledgePage /> },
      { path: "prompts", element: <PromptsPage /> },
      { path: "history", element: <HistoryPage /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
