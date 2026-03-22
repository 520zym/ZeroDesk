import { ChevronLeft, ChevronRight } from "lucide-react";

interface RegenSwitcherProps {
  currentIndex: number; // 0-based，当前显示的是第几个版本
  total: number;        // 总版本数
  onSwitch: (index: number) => void;
}

// ChatGPT 风格的重新生成版本切换器
// 显示在 agent 消息气泡底部：← 1/3 →
export default function RegenSwitcher({ currentIndex, total, onSwitch }: RegenSwitcherProps) {
  if (total <= 1) return null;

  return (
    <div className="flex items-center gap-1 mt-1 select-none">
      <button
        className="p-0.5 rounded text-text-muted hover:text-text hover:bg-bg-alt transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        disabled={currentIndex === 0}
        onClick={() => onSwitch(currentIndex - 1)}
      >
        <ChevronLeft size={13} />
      </button>
      <span className="text-[0.7rem] text-text-muted tabular-nums">
        {currentIndex + 1}/{total}
      </span>
      <button
        className="p-0.5 rounded text-text-muted hover:text-text hover:bg-bg-alt transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        disabled={currentIndex === total - 1}
        onClick={() => onSwitch(currentIndex + 1)}
      >
        <ChevronRight size={13} />
      </button>
    </div>
  );
}
