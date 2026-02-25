import { Users, Network, Share2, Workflow } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function TeamsPage() {
  return (
    <EmptyState
      icon={Users}
      title="团队管理"
      description="组织多个 Agent 为协作团队，定义通信拓扑与任务分配策略"
      accentColor="text-lavender"
      accentBg="bg-lavender-light"
      features={[
        { icon: Network, title: "组织结构", desc: "可视化团队拓扑关系" },
        { icon: Share2, title: "能力共享", desc: "团队内 Skill 与知识共享" },
        { icon: Workflow, title: "协作模式", desc: "串行/并行/投票等模式" },
      ]}
    />
  );
}
