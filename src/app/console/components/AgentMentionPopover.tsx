import type { Agent } from '@/types';

interface AgentMentionPopoverProps {
  agents: Agent[];
  visible: boolean;
  searchText: string;
  onSelect: (agent: Agent) => void;
  onSelectAll: () => void;
}

export default function AgentMentionPopover({
  agents,
  visible,
  searchText,
  onSelect,
  onSelectAll,
}: AgentMentionPopoverProps) {
  if (!visible || agents.length === 0) return null;

  const filtered = searchText
    ? agents.filter(a => a.name.toLowerCase().includes(searchText.toLowerCase()))
    : agents;

  return (
    <div className="absolute bottom-full left-0 z-50 mb-2 w-56 overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
      <div className="px-3 py-2 text-xs text-text-muted">选择 Agent</div>
      <div className="max-h-48 overflow-y-auto">
        <button
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-bg-alt/50 transition-colors cursor-pointer"
          onClick={onSelectAll}
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs text-primary">
            *
          </span>
          <span>@全部</span>
        </button>
        {filtered.map(agent => (
          <button
            key={agent.id}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-bg-alt/50 transition-colors cursor-pointer"
            onClick={() => onSelect(agent)}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs">
              {agent.avatar_char || agent.name.charAt(0)}
            </span>
            <span>{agent.name}</span>
            {agent.role_description && (
              <span className="ml-auto truncate text-xs text-text-muted max-w-[100px]">
                {agent.role_description}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
