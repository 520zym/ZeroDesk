import {
  Play,
  CheckCircle2,
  XCircle,
  FileEdit,
  type LucideIcon,
} from "lucide-react";

export interface TaskStat {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  ring: string;
}

export const TASK_STATS: TaskStat[] = [
  {
    label: "进行中",
    value: "3",
    icon: Play,
    color: "text-primary",
    bg: "bg-primary-light",
    ring: "ring-primary/10",
  },
  {
    label: "已完成",
    value: "12",
    icon: CheckCircle2,
    color: "text-success",
    bg: "bg-success-light",
    ring: "ring-success/10",
  },
  {
    label: "失败",
    value: "2",
    icon: XCircle,
    color: "text-danger",
    bg: "bg-danger-light",
    ring: "ring-danger/10",
  },
  {
    label: "草稿",
    value: "5",
    icon: FileEdit,
    color: "text-sand",
    bg: "bg-sand-light",
    ring: "ring-sand/10",
  },
];

export type TaskStatus = "running" | "done" | "failed" | "draft";

export interface MockTask {
  id: string;
  title: string;
  status: TaskStatus;
  agents: number;
  progress: number;
  time: string;
}

export const MOCK_TASKS: MockTask[] = [
  {
    id: "1",
    title: "竞品分析报告 — 梳理 Top 5 竞品功能矩阵",
    status: "running",
    agents: 3,
    progress: 65,
    time: "12 分钟前",
  },
  {
    id: "2",
    title: "技术调研 — LLM Router 方案选型与 PoC",
    status: "running",
    agents: 2,
    progress: 40,
    time: "28 分钟前",
  },
  {
    id: "3",
    title: "运营周报自动化 — 数据采集与摘要生成",
    status: "running",
    agents: 4,
    progress: 88,
    time: "1 小时前",
  },
  {
    id: "4",
    title: "用户反馈分析 — Q4 NPS 报告整理",
    status: "done",
    agents: 2,
    progress: 100,
    time: "昨天",
  },
  {
    id: "5",
    title: "API 文档生成 — 自动从代码注释生成 OpenAPI Spec",
    status: "failed",
    agents: 1,
    progress: 30,
    time: "2 天前",
  },
];

export const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; dotClass: string; textClass: string }
> = {
  running: {
    label: "运行中",
    dotClass: "bg-primary animate-pulse",
    textClass: "text-primary",
  },
  done: {
    label: "已完成",
    dotClass: "bg-success",
    textClass: "text-success",
  },
  failed: {
    label: "失败",
    dotClass: "bg-danger",
    textClass: "text-danger",
  },
  draft: {
    label: "草稿",
    dotClass: "bg-sand",
    textClass: "text-sand",
  },
};
