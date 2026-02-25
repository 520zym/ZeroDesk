import { User, Settings, Shield, Puzzle } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AgentsPage() {
  return (
    <EmptyState
      icon={User}
      title="Agent 管理"
      description="每个 Agent 是一个可配置的 LLM 调用单元，具有独立的 Prompt、模型和权限设置"
      accentColor="text-coral"
      accentBg="bg-coral-light"
      features={[
        { icon: Settings, title: "角色配置", desc: "自定义 Prompt 与行为" },
        { icon: Shield, title: "权限控制", desc: "精细化的工具访问权限" },
        { icon: Puzzle, title: "Skill 绑定", desc: "为 Agent 挂载可用技能" },
      ]}
    />
  );
}
