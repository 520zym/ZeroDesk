import { GitBranch, ListTree, Pencil, Play } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function PlanPage() {
  return (
    <EmptyState
      icon={GitBranch}
      title="执行计划视图"
      description="查看 AI 自动生成的分步执行计划，审核、调整后一键启动"
      accentColor="text-primary"
      accentBg="bg-primary-light"
      features={[
        { icon: ListTree, title: "计划分解", desc: "自动拆分为可执行步骤" },
        { icon: Pencil, title: "审核调整", desc: "编辑步骤顺序与参数" },
        { icon: Play, title: "一键执行", desc: "确认后启动 Agent 执行" },
      ]}
    />
  );
}
