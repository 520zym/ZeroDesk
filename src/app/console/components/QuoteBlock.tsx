import type { ExecutionMessage } from '@/types';

// Agent 主题色映射
const AGENT_COLORS: Record<string, string> = {};
let colorIndex = 0;
const COLOR_PALETTE = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#a855f7',
];

export function getAgentColor(agentId: string | undefined | null): string {
  if (!agentId) return '#635BFF';
  if (!AGENT_COLORS[agentId]) {
    AGENT_COLORS[agentId] = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
    colorIndex++;
  }
  return AGENT_COLORS[agentId];
}

interface QuoteBlockProps {
  quotedMessage: ExecutionMessage | undefined;
  onClickQuote?: (messageId: string) => void;
}

export default function QuoteBlock({ quotedMessage, onClickQuote }: QuoteBlockProps) {
  if (!quotedMessage) return null;

  const borderColor = quotedMessage.sender_type === 'human'
    ? '#635BFF'
    : getAgentColor(quotedMessage.sender_id);

  const senderLabel = quotedMessage.sender_type === 'human'
    ? '你'
    : quotedMessage.sender_name ?? 'Agent';

  const preview = quotedMessage.content.length > 80
    ? quotedMessage.content.slice(0, 80) + '...'
    : quotedMessage.content;

  return (
    <div
      className="mb-2 cursor-pointer rounded bg-bg-alt/50 px-3 py-2 text-xs transition-colors hover:bg-bg-alt/80"
      style={{ borderLeft: `3px solid ${borderColor}` }}
      onClick={() => onClickQuote?.(quotedMessage.id)}
    >
      <div className="mb-0.5 font-medium" style={{ color: borderColor }}>
        {senderLabel}
      </div>
      <div className="truncate text-text-tertiary">{preview}</div>
    </div>
  );
}
