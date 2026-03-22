import { useState } from "react";
import { Forward } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import type { ExecutionMessage, Agent } from "@/types";

interface ForwardMessageModalProps {
  msg: ExecutionMessage | null;
  agents: Agent[];          // 当前任务可用的 Agent 列表
  onClose: () => void;
  onForward: (agentId: string, instruction: string) => void;
}

// 转发消息弹窗：选择目标 Agent + 附加指令
export default function ForwardMessageModal({
  msg,
  agents,
  onClose,
  onForward,
}: ForwardMessageModalProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);

  if (!msg) return null;

  const handleConfirm = async () => {
    if (!selectedAgentId) return;
    setLoading(true);
    onForward(selectedAgentId, instruction);
    setLoading(false);
    onClose();
  };

  // 预览：截取原消息前 120 字符
  const preview = msg.content.length > 120
    ? msg.content.slice(0, 120) + "..."
    : msg.content;

  return (
    <Modal open={!!msg} onClose={onClose} title="转发给 Agent" width="480px">
      <div className="flex flex-col gap-4">
        {/* 原消息预览 */}
        <div>
          <div className="text-xs text-text-muted mb-1.5">原消息内容</div>
          <div className="bg-bg-alt rounded-lg px-3 py-2.5 text-xs text-text-muted leading-relaxed border border-border-light/60 line-clamp-4">
            {preview}
          </div>
        </div>

        {/* Agent 选择 */}
        <div>
          <div className="text-xs text-text-muted mb-1.5">
            转发给 <span className="text-red-400">*</span>
          </div>
          <div className="flex flex-col gap-1">
            {agents.length === 0 ? (
              <div className="text-xs text-text-muted py-2 text-center">暂无可用 Agent</div>
            ) : (
              agents.map((agent) => (
                <button
                  key={agent.id}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-colors cursor-pointer ${
                    selectedAgentId === agent.id
                      ? "border-primary bg-primary/5 text-text"
                      : "border-border-light hover:bg-bg-alt text-text-muted"
                  }`}
                  onClick={() => setSelectedAgentId(agent.id)}
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium shrink-0"
                    style={{ background: agent.avatar_color || "#635BFF20", color: agent.avatar_color || "#635BFF" }}
                  >
                    {agent.avatar_char || agent.name.charAt(0)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium leading-tight truncate" style={{ color: "inherit" }}>
                      {agent.name}
                    </div>
                    {agent.role_description && (
                      <div className="text-xs text-text-muted truncate">{agent.role_description}</div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* 附加指令 */}
        <div>
          <div className="text-xs text-text-muted mb-1.5">附加指令（可选）</div>
          <textarea
            className="w-full bg-bg-alt border border-border-light rounded-lg px-3 py-2 text-sm text-text resize-none focus:outline-none focus:border-primary/50 transition-colors placeholder:text-text-muted/50"
            rows={2}
            placeholder="告诉 Agent 应该如何处理这条消息..."
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            className="px-4 py-1.5 rounded-lg text-sm text-text-muted hover:bg-bg-alt transition-colors cursor-pointer"
            onClick={onClose}
          >
            取消
          </button>
          <button
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            onClick={handleConfirm}
            disabled={!selectedAgentId || loading}
          >
            <Forward size={13} />
            转发
          </button>
        </div>
      </div>
    </Modal>
  );
}
