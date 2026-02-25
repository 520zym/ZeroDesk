import { Terminal, Eye, Hand, Gauge } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ConsolePage() {
  return (
    <EmptyState
      icon={Terminal}
      title="执行控制台"
      description="实时观测 Agent 执行过程，查看日志输出，支持人工接管操作"
      accentColor="text-sage"
      accentBg="bg-sage-light"
      features={[
        { icon: Eye, title: "实时日志", desc: "查看每步执行的详细输出" },
        { icon: Hand, title: "人工接管", desc: "在关键节点插入人工决策" },
        { icon: Gauge, title: "资源监控", desc: "Token 用量与耗时统计" },
      ]}
    />
  );
}
