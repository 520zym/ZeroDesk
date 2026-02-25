export interface RecentWorkspace {
  name: string;
  path: string;
  time: string;
  tasks: number;
  status: "online" | "offline";
  color: string;
}

export const RECENT_WORKSPACES: RecentWorkspace[] = [
  {
    name: "竞品分析项目",
    path: "C:\\Projects\\CompetitorAnalysis",
    time: "2 小时前",
    tasks: 8,
    status: "online",
    color: "from-primary to-lavender",
  },
  {
    name: "技术调研 — LLM Router",
    path: "C:\\Projects\\LLMRouter",
    time: "昨天",
    tasks: 5,
    status: "online",
    color: "from-sage to-info",
  },
  {
    name: "运营周报自动化",
    path: "C:\\Projects\\WeeklyReport",
    time: "3 天前",
    tasks: 12,
    status: "offline",
    color: "from-coral to-sand",
  },
];
