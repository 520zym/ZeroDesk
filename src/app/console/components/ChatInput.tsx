import { useState, useRef, useCallback, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import type { Agent } from '@/types';
import AgentMentionPopover from './AgentMentionPopover';
import { getAgentColor } from './QuoteBlock';

interface ChatInputProps {
  agents: Agent[];
  disabled?: boolean;
  placeholder?: string;
  onSend: (content: string, mentionAgentId: string | null) => void;
}

export default function ChatInput({ agents, disabled, placeholder, onSend }: ChatInputProps) {
  const [text, setText] = useState('');
  const [showMention, setShowMention] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (value: string) => {
    setText(value);

    // 检测 @ 触发
    const lastAt = value.lastIndexOf('@');
    if (lastAt >= 0 && (lastAt === 0 || value[lastAt - 1] === ' ')) {
      const afterAt = value.slice(lastAt + 1);
      if (!afterAt.includes(' ')) {
        setShowMention(true);
        setMentionSearch(afterAt);
        return;
      }
    }
    setShowMention(false);
  };

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    const lastAt = text.lastIndexOf('@');
    const newText = text.slice(0, lastAt) + `@${agent.name} `;
    setText(newText);
    setShowMention(false);
    inputRef.current?.focus();
  };

  const handleSelectAll = () => {
    setSelectedAgent(null);
    const lastAt = text.lastIndexOf('@');
    const newText = text.slice(0, lastAt) + '@全部 ';
    setText(newText);
    setShowMention(false);
    inputRef.current?.focus();
  };

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed, selectedAgent?.id ?? null);
    setText('');
    setSelectedAgent(null);
  }, [text, disabled, selectedAgent, onSend]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative border-t border-border-light bg-surface/80 backdrop-blur-sm px-4 py-3">
      <AgentMentionPopover
        agents={agents}
        visible={showMention}
        searchText={mentionSearch}
        onSelect={handleSelectAgent}
        onSelectAll={handleSelectAll}
      />
      <div className="flex w-full items-center gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-xl bg-bg border border-border-light px-4 py-2 focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
          <textarea
            ref={inputRef}
            value={text}
            onChange={e => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? '输入消息，@ 可指定 Agent ...'}
            disabled={disabled}
            rows={1}
            className="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent text-[0.82rem] text-text outline-none placeholder:text-text-muted disabled:opacity-50"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center cursor-pointer hover:bg-primary-hover transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Send size={15} />
        </button>
      </div>
      {/* Agent 快捷标签 */}
      {agents.length > 0 && (
        <div className="mt-2 flex w-full flex-wrap gap-1.5">
          {agents.map(agent => (
            <button
              key={agent.id}
              onClick={() => {
                setText(prev => `${prev}@${agent.name} `);
                setSelectedAgent(agent);
                inputRef.current?.focus();
              }}
              className="rounded-full px-2.5 py-0.5 text-[10px] transition-colors hover:opacity-80 cursor-pointer"
              style={{
                backgroundColor: `${getAgentColor(agent.id)}15`,
                color: getAgentColor(agent.id),
              }}
            >
              @{agent.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
