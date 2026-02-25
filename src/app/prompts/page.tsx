import { FileText, Copy, Sparkles, FolderTree } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function PromptsPage() {
  return (
    <EmptyState
      icon={FileText}
      title="Prompt / 模板中心"
      description="管理可复用的 Prompt 资产与任务模板，加速新任务的创建"
      accentColor="text-coral"
      accentBg="bg-coral-light"
      badge="V0.2 规划"
      features={[
        { icon: Copy, title: "模板复用", desc: "一键复制为新任务" },
        { icon: Sparkles, title: "变量插值", desc: "动态参数化的 Prompt" },
        { icon: FolderTree, title: "分类管理", desc: "按场景与用途组织" },
      ]}
    />
  );
}
