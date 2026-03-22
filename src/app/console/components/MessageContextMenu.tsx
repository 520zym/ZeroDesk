import { useState } from "react";
import { Reply, Copy, BookmarkPlus, ListPlus, Info } from "lucide-react";
import { ExecutionMessage } from "@/types";

interface MessageContextMenuProps {
  position: { x: number; y: number };
  msg: ExecutionMessage;
  onClose: () => void;
  onReply: () => void;
  onCopy: () => void;
  onSaveKnowledge: () => void;
  onCreateTask: () => void;
  onViewMetadata: (pos: { x: number; y: number }) => void;
}

// 控制台消息右键菜单组件
export default function MessageContextMenu({
  position,
  msg,
  onClose,
  onReply,
  onCopy,
  onSaveKnowledge,
  onCreateTask,
  onViewMetadata,
}: MessageContextMenuProps) {
  const [copied, setCopied] = useState(false);

  const isHumanOrAgent =
    msg.sender_type === "human" || msg.sender_type === "agent";
  const isAgent = msg.sender_type === "agent";
  const hasMetadata = msg.metadata_json != null;

  // 判断第二条分隔线是否需要显示（"创建为任务"或"查看详情"至少一项可见）
  const showSecondDivider = isAgent;

  // 处理复制内容：延迟 300ms 后关闭菜单，期间显示"已复制 ✓"
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    onCopy();
    setTimeout(() => {
      onClose();
    }, 300);
  };

  // 通用菜单项点击处理：阻止冒泡，执行回调，关闭菜单
  const handleMenuAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
    onClose();
  };

  // 查看详情：传递当前菜单位置
  const handleViewMetadata = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewMetadata(position);
    onClose();
  };

  return (
    <div
      className="fixed z-[100] bg-surface border border-border-light rounded-lg shadow-lg py-1 min-w-[140px]"
      style={{ left: position.x, top: position.y }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 回复：human + agent 显示 */}
      {isHumanOrAgent && (
        <button
          className="w-full flex items-center gap-2 px-3 py-2 text-[0.78rem] text-text hover:bg-bg-alt transition-colors cursor-pointer"
          onClick={(e) => handleMenuAction(e, onReply)}
        >
          <Reply size={14} className="text-text-muted" />
          回复
        </button>
      )}

      {/* 复制内容：human + agent 显示 */}
      {isHumanOrAgent && (
        <button
          className="w-full flex items-center gap-2 px-3 py-2 text-[0.78rem] text-text hover:bg-bg-alt transition-colors cursor-pointer"
          onClick={handleCopy}
        >
          <Copy size={14} className="text-text-muted" />
          {copied ? "已复制 ✓" : "复制内容"}
        </button>
      )}

      {/* 第一条分隔线 */}
      {isHumanOrAgent && <div className="h-px bg-border-light/60 my-1" />}

      {/* 存入知识库：human + agent 显示 */}
      {isHumanOrAgent && (
        <button
          className="w-full flex items-center gap-2 px-3 py-2 text-[0.78rem] text-text hover:bg-bg-alt transition-colors cursor-pointer"
          onClick={(e) => handleMenuAction(e, onSaveKnowledge)}
        >
          <BookmarkPlus size={14} className="text-text-muted" />
          存入知识库
        </button>
      )}

      {/* 创建为任务：仅 agent 显示 */}
      {isAgent && (
        <button
          className="w-full flex items-center gap-2 px-3 py-2 text-[0.78rem] text-text hover:bg-bg-alt transition-colors cursor-pointer"
          onClick={(e) => handleMenuAction(e, onCreateTask)}
        >
          <ListPlus size={14} className="text-text-muted" />
          创建为任务
        </button>
      )}

      {/* 第二条分隔线：仅当"创建为任务"和"查看详情"至少一项可见时显示 */}
      {showSecondDivider && <div className="h-px bg-border-light/60 my-1" />}

      {/* 查看详情：仅 agent 且 metadata_json 不为 null 时显示 */}
      {isAgent && hasMetadata && (
        <button
          className="w-full flex items-center gap-2 px-3 py-2 text-[0.78rem] text-text hover:bg-bg-alt transition-colors cursor-pointer"
          onClick={handleViewMetadata}
        >
          <Info size={14} className="text-text-muted" />
          查看详情
        </button>
      )}
    </div>
  );
}
