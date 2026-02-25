import { Wrench, Package, Globe, Code } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function SkillsPage() {
  return (
    <EmptyState
      icon={Wrench}
      title="Skills 中心"
      description="统一管理本地与在线 Skills，为 Agent 提供可调用的外部能力"
      accentColor="text-sage"
      accentBg="bg-sage-light"
      badge="V0.2 规划"
      features={[
        { icon: Package, title: "内置技能", desc: "文件、浏览器、Shell 等" },
        { icon: Globe, title: "在线服务", desc: "接入第三方 API 服务" },
        { icon: Code, title: "自定义", desc: "编写自定义 Skill 脚本" },
      ]}
    />
  );
}
