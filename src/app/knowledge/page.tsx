import { BookOpen, Database, Search, Brain } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function KnowledgePage() {
  return (
    <EmptyState
      icon={BookOpen}
      title="知识库"
      description="沉淀公共知识与步骤级记忆，支持检索注入 (RAG) 增强 Agent 能力"
      accentColor="text-sand"
      accentBg="bg-sand-light"
      badge="V0.2 规划"
      features={[
        { icon: Database, title: "知识管理", desc: "文档、笔记、规则录入" },
        { icon: Search, title: "语义检索", desc: "基于向量的智能搜索" },
        { icon: Brain, title: "自动记忆", desc: "从执行历史自动沉淀" },
      ]}
    />
  );
}
