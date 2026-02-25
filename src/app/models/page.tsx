import { Layers, Cpu, RefreshCw, BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ModelsPage() {
  return (
    <EmptyState
      icon={Layers}
      title="模型与路由"
      description="管理模型供应商与可用模型池，配置智能路由与容灾降级策略"
      accentColor="text-primary"
      accentBg="bg-primary-light"
      features={[
        { icon: Cpu, title: "模型池", desc: "统一管理多供应商模型" },
        { icon: RefreshCw, title: "容灾降级", desc: "自动切换备选模型" },
        { icon: BarChart3, title: "用量统计", desc: "Token 消耗与成本分析" },
      ]}
    />
  );
}
