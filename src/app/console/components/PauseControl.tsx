import { useState } from 'react';
import { Play, GitBranch } from 'lucide-react';

interface PauseControlProps {
  visible: boolean;
  onResume: () => void;
  onAdjust: (instruction: string) => void;
}

export default function PauseControl({ visible, onResume, onAdjust }: PauseControlProps) {
  const [showAdjustInput, setShowAdjustInput] = useState(false);
  const [instruction, setInstruction] = useState('');

  if (!visible) return null;

  const handleAdjust = () => {
    if (!instruction.trim()) return;
    onAdjust(instruction.trim());
    setInstruction('');
    setShowAdjustInput(false);
  };

  return (
    <div className="border-t border-yellow-500/30 bg-yellow-500/5 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
        <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
        执行已暂停 — 等待你的指示
      </div>
      {showAdjustInput ? (
        <div className="mt-2 flex gap-2 max-w-[680px]">
          <input
            value={instruction}
            onChange={e => setInstruction(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdjust()}
            placeholder="输入新的方向指示..."
            className="flex-1 rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-text outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10 transition-all"
            autoFocus
          />
          <button
            onClick={handleAdjust}
            disabled={!instruction.trim()}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm text-white transition-colors hover:bg-primary-hover disabled:opacity-50 cursor-pointer"
          >
            确认调整
          </button>
          <button
            onClick={() => setShowAdjustInput(false)}
            className="rounded-lg px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-bg-alt cursor-pointer"
          >
            取消
          </button>
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <button
            onClick={onResume}
            className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-1.5 text-sm text-white transition-colors hover:bg-green-700 cursor-pointer"
          >
            <Play size={14} />
            继续执行
          </button>
          <button
            onClick={() => setShowAdjustInput(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-1.5 text-sm text-text-secondary transition-colors hover:bg-bg-alt cursor-pointer"
          >
            <GitBranch size={14} />
            调整方向
          </button>
        </div>
      )}
    </div>
  );
}
