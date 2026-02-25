import { LayoutDashboard, Activity, PieChart, Settings } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function DashboardPage() {
  return (
    <EmptyState
      icon={LayoutDashboard}
      title="数据看板"
      description="全局视角的数据可视化，监控系统运行状态与关键指标"
      accentColor="text-primary"
      accentBg="bg-primary-light"
      features={[
        { icon: Activity, title: "实时监控", desc: "系统健康度与资源" },
        { icon: PieChart, title: "数据图表", desc: "任务统计与趋势分析" },
        { icon: Settings, title: "系统设置", desc: "全局参数与偏好配置" },
      ]}
    />
  );
}
