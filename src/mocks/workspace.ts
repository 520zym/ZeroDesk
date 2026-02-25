export interface RecentTask {
  name: string;
  time: string;
  agents: number;
  color: string;
}

export const RECENT_TASKS: RecentTask[] = [
  {
    name: "竞品分析项目",
    time: "2 小时前",
    agents: 3,
    color: "from-primary to-lavender",
  },
  {
    name: "技术调研 — LLM Router",
    time: "昨天",
    agents: 2,
    color: "from-sage to-info",
  },
  {
    name: "运营周报自动化",
    time: "3 天前",
    agents: 4,
    color: "from-coral to-sand",
  },
];
