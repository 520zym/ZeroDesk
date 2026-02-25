import { Clock, RotateCcw, TrendingUp, FileSearch } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function HistoryPage() {
  return (
    <EmptyState
      icon={Clock}
      title="任务历史与复盘"
      description="查看历史执行记录，进行故障复盘，并支持一键重执行"
      accentColor="text-lavender"
      accentBg="bg-lavender-light"
      features={[
        { icon: FileSearch, title: "执行回溯", desc: "查看每步操作与结果" },
        { icon: RotateCcw, title: "一键重跑", desc: "基于历史配置重新执行" },
        { icon: TrendingUp, title: "趋势分析", desc: "成功率与耗时趋势" },
      ]}
    />
  );
}
