import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Search,
  BookOpen,
  ListTodo,
  Bot,
  Users,
  Wrench,
  Cpu,
  GitBranch,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGlobalSearch } from "@/hooks/useSearch";
import type { SearchResultItem, SearchEntityType } from "@/types";

// 实体类型配置：图标、中文名、跳转路由
const ENTITY_CONFIG: Record<
  SearchEntityType,
  { icon: React.ElementType; label: string; path: string }
> = {
  knowledge: { icon: BookOpen, label: "知识库", path: "/knowledge" },
  task:      { icon: ListTodo, label: "任务",   path: "/tasks" },
  agent:     { icon: Bot,      label: "Agent",  path: "/agents" },
  team:      { icon: Users,    label: "团队",   path: "/teams" },
  skill:     { icon: Wrench,   label: "技能",   path: "/skills" },
  model:     { icon: Cpu,      label: "模型",   path: "/models" },
  workflow:  { icon: GitBranch, label: "工作流", path: "/prompts" },
};

// 实体类型显示顺序
const ENTITY_ORDER: SearchEntityType[] = [
  "knowledge", "task", "agent", "team", "skill", "model", "workflow",
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 300ms 防抖
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(inputValue), 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // 打开时自动聚焦，关闭时清空状态
  useEffect(() => {
    if (open) {
      setInputValue("");
      setDebouncedQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const { data, isLoading } = useGlobalSearch(debouncedQuery);

  // 按类型分组并保持顺序
  const grouped = useMemo(() => {
    if (!data?.results.length) return [];
    const map = new Map<SearchEntityType, SearchResultItem[]>();
    for (const item of data.results) {
      const list = map.get(item.entity_type) ?? [];
      list.push(item);
      map.set(item.entity_type, list);
    }
    return ENTITY_ORDER
      .filter((type) => map.has(type))
      .map((type) => ({ type, items: map.get(type)! }));
  }, [data]);

  // 展平结果用于键盘导航
  const flatResults = useMemo(
    () => grouped.flatMap((g) => g.items),
    [grouped]
  );

  const handleSelect = useCallback(
    (item: SearchResultItem) => {
      onClose();
      navigate(ENTITY_CONFIG[item.entity_type].path);
    },
    [navigate, onClose]
  );

  // 键盘导航（↑↓ Enter Escape）
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && flatResults[activeIndex]) {
        e.preventDefault();
        handleSelect(flatResults[activeIndex]);
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, flatResults, activeIndex, handleSelect, onClose]);

  // 选中项自动滚动到视图内
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // 输入时重置选中
  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQuery]);

  if (!open) return null;

  let flatIdx = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        style={{ animation: "fade-in 0.12s ease-out" }}
        onClick={onClose}
      />

      {/* 面板 */}
      <div
        className="relative bg-surface rounded-xl shadow-xl border border-border overflow-hidden w-[640px] max-w-[calc(100vw-32px)]"
        style={{ animation: "scale-in 0.15s ease-out" }}
      >
        {/* 搜索输入区 */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-light">
          <Search size={16} className="text-text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="搜索知识库、任务、Agent、技能..."
            className="flex-1 bg-transparent text-[0.9rem] text-text placeholder:text-text-muted outline-none border-none"
          />
          {inputValue && (
            <button
              onClick={() => setInputValue("")}
              className="text-text-muted hover:text-text transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center text-[0.65rem] text-text-muted/70 bg-bg-alt border border-border-light rounded px-1.5 py-0.5 font-mono shrink-0">
            ESC
          </kbd>
        </div>

        {/* 结果区 */}
        <div
          ref={listRef}
          className="overflow-y-auto"
          style={{ maxHeight: "420px" }}
        >
          {/* 加载状态 */}
          {isLoading && debouncedQuery && (
            <div className="flex items-center justify-center py-8 text-text-muted text-sm">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
              搜索中...
            </div>
          )}

          {/* 无结果 */}
          {!isLoading && debouncedQuery && grouped.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-text-muted">
              <Search size={32} className="mb-3 opacity-30" />
              <p className="text-sm">没有找到 "{debouncedQuery}" 的相关内容</p>
            </div>
          )}

          {/* 空状态（未输入） */}
          {!debouncedQuery && (
            <div className="py-6 px-5 text-center text-text-muted text-sm">
              输入关键词搜索所有数据...
            </div>
          )}

          {/* 分组结果 */}
          {grouped.map(({ type, items }) => {
            const config = ENTITY_CONFIG[type];
            const Icon = config.icon;
            return (
              <div key={type}>
                {/* 分组标题 */}
                <div className="flex items-center gap-2 px-4 py-2 bg-bg/60">
                  <Icon size={12} className="text-text-muted" />
                  <span className="text-[0.72rem] font-medium text-text-muted uppercase tracking-wider">
                    {config.label}
                  </span>
                </div>
                {/* 结果列表 */}
                {items.map((item) => {
                  const currentIdx = flatIdx++;
                  const isActive = activeIndex === currentIdx;
                  return (
                    <div
                      key={item.id}
                      data-idx={currentIdx}
                      className={cn(
                        "flex items-start gap-3 px-4 py-2.5 cursor-pointer transition-colors",
                        isActive
                          ? "bg-primary/8 border-l-2 border-primary"
                          : "hover:bg-bg-alt border-l-2 border-transparent"
                      )}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setActiveIndex(currentIdx)}
                    >
                      <Icon
                        size={14}
                        className={cn(
                          "mt-0.5 shrink-0",
                          isActive ? "text-primary" : "text-text-muted"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        {/* 标题 */}
                        <div className={cn(
                          "text-[0.85rem] font-medium truncate",
                          isActive ? "text-primary" : "text-text"
                        )}>
                          {item.title}
                        </div>
                        {/* 副标题 */}
                        {item.subtitle && !item.snippet && (
                          <div className="text-[0.75rem] text-text-muted truncate mt-0.5">
                            {item.subtitle}
                          </div>
                        )}
                        {/* 知识库 snippet 高亮 */}
                        {item.snippet && (
                          <div
                            className="text-[0.75rem] text-text-secondary mt-0.5 line-clamp-2 search-snippet"
                            dangerouslySetInnerHTML={{ __html: item.snippet }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* 底部提示栏 */}
        {flatResults.length > 0 && (
          <div className="flex items-center gap-4 px-4 py-2 border-t border-border-light bg-bg/40 text-[0.7rem] text-text-muted">
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-bg-alt border border-border-light rounded px-1">↑↓</kbd>
              导航
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-bg-alt border border-border-light rounded px-1">↵</kbd>
              跳转
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-bg-alt border border-border-light rounded px-1">ESC</kbd>
              关闭
            </span>
            <span className="ml-auto">{data?.total ?? 0} 条结果</span>
          </div>
        )}
      </div>
    </div>
  );
}
