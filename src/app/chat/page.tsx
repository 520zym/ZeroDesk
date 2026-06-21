import { useEffect, useMemo, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Check,
  Clipboard,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Settings2,
  SlidersHorizontal,
  Trash2,
  User,
  X,
} from "lucide-react";
import { EmptyState, MarkdownContent, Tabs } from "@/components/ui";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  useChatConversationStats,
  useChatConversations,
  useChatMessages,
  useClearChatContext,
  useCreateChatConversation,
  useDeleteChatConversation,
  useSendChatMessage,
  useUpdateChatConversation,
} from "@/hooks/useChat";
import { useProviders, useWorkspaceModels } from "@/hooks/useModels";
import type { ChatConversation, ChatMessage, Model, ModelProvider } from "@/types";

interface ChatMessageEventPayload {
  conversation_id: string;
}

interface ChatChunkEventPayload {
  conversation_id: string;
  chunk_type: "content" | "done" | "error";
  chunk: string;
}

interface StreamingReply {
  content: string;
  error: string | null;
}

interface ModelLogoInfo {
  label: string;
  color: string;
  title: string;
  src?: string;
  imageClassName?: string;
}

const OFFICIAL_MODEL_LOGOS = {
  openai: "https://openai.com/favicon.ico",
  anthropic: "https://cdn.prod.website-files.com/67ce28cfec624e2b733f8a52/681d52619fec35886a7f1a70_favicon.png",
  deepseek: "https://www.deepseek.com/favicon.ico",
  qwen: "https://img.alicdn.com/tfs/TB1ugg7M9zqK1RjSZPxXXc4tVXa-32-32.png",
  gemini: "https://www.gstatic.com/lamda/images/gemini_sparkle_aurora_33f86dc0c0257da337c63.svg",
  kimi: "https://statics.moonshot.cn/moonshot-ai/favicon.ico",
  zhipu: "https://www.bigmodel.cn/img/icons/apple-touch-icon-152x152.png",
  minimax: "https://www.minimaxi.com/favicon.ico",
  siliconflow: "https://siliconflow.cn/favicon.ico",
} as const;

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value.endsWith("Z") ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function modelLabel(models: Model[] | undefined, modelId: string | null | undefined): string {
  if (!modelId) return "未选择模型";
  return models?.find((m) => m.id === modelId)?.name ?? "模型不可用";
}

function modelLogo(
  model: Model | undefined,
  provider: ModelProvider | undefined,
): ModelLogoInfo {
  const text = `${model?.name ?? ""} ${provider?.name ?? ""}`.toLowerCase();
  const providerColor = provider?.icon_color || "#635BFF";

  if (text.includes("gpt") || text.includes("openai")) {
    return {
      label: "GPT",
      color: providerColor || "#10A37F",
      title: model?.name ?? "OpenAI",
      src: OFFICIAL_MODEL_LOGOS.openai,
    };
  }
  if (text.includes("claude") || text.includes("anthropic")) {
    return {
      label: "A",
      color: providerColor || "#D4A574",
      title: model?.name ?? "Claude",
      src: OFFICIAL_MODEL_LOGOS.anthropic,
    };
  }
  if (text.includes("deepseek")) {
    return {
      label: "D",
      color: providerColor || "#4D6BFE",
      title: model?.name ?? "DeepSeek",
      src: OFFICIAL_MODEL_LOGOS.deepseek,
    };
  }
  if (text.includes("qwen") || text.includes("通义") || text.includes("dashscope") || text.includes("aliyun") || text.includes("阿里")) {
    return {
      label: "Q",
      color: providerColor || "#FF6A00",
      title: model?.name ?? "Qwen",
      src: OFFICIAL_MODEL_LOGOS.qwen,
    };
  }
  if (text.includes("gemini") || text.includes("google")) {
    return {
      label: "G",
      color: providerColor || "#4285F4",
      title: model?.name ?? "Gemini",
      src: OFFICIAL_MODEL_LOGOS.gemini,
    };
  }
  if (text.includes("kimi") || text.includes("moonshot")) {
    return {
      label: "K",
      color: providerColor || "#1A1A2E",
      title: model?.name ?? "Kimi",
      src: OFFICIAL_MODEL_LOGOS.kimi,
    };
  }
  if (text.includes("glm") || text.includes("zhipu") || text.includes("智谱")) {
    return {
      label: "智",
      color: providerColor || "#3B5998",
      title: model?.name ?? "智谱 AI",
      src: OFFICIAL_MODEL_LOGOS.zhipu,
    };
  }
  if (text.includes("minimax")) {
    return {
      label: "M",
      color: providerColor || "#FF6B35",
      title: model?.name ?? "MiniMax",
      src: OFFICIAL_MODEL_LOGOS.minimax,
    };
  }
  if (text.includes("siliconflow") || text.includes("硅基")) {
    return {
      label: "硅",
      color: providerColor || "#7C3AED",
      title: model?.name ?? "硅基流动",
      src: OFFICIAL_MODEL_LOGOS.siliconflow,
    };
  }

  const fallback = provider?.name?.trim()[0] || model?.name?.trim()[0] || "AI";
  return { label: fallback.toUpperCase(), color: providerColor, title: model?.name ?? "AI 模型" };
}

function ModelAvatar({ logo }: { logo: ModelLogoInfo }) {
  const [imageFailed, setImageFailed] = useState(false);

  if (logo.src && !imageFailed) {
    return (
      <div
        className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border-light bg-white p-1.5 shadow-sm"
        title={logo.title}
      >
        <img
          src={logo.src}
          alt={logo.title}
          className={cn("h-full w-full object-contain", logo.imageClassName)}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[0.58rem] font-bold text-white shadow-sm"
      style={{ backgroundColor: logo.color }}
      title={logo.title}
    >
      {logo.label}
    </div>
  );
}

function getMessageModel(
  message: ChatMessage,
  activeConversation: ChatConversation | undefined,
  models: Model[],
): Model | undefined {
  const modelId = message.model_id ?? activeConversation?.model_id;
  return models.find((model) => model.id === modelId);
}

function ConversationRow({
  conversation,
  active,
  preview,
  onSelect,
  onDelete,
}: {
  conversation: ChatConversation;
  active: boolean;
  preview: string;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group w-full rounded-lg border px-3 py-3 text-left transition-all",
        active
          ? "border-primary/20 bg-primary-light text-primary"
          : "border-transparent bg-transparent text-text hover:border-border-light hover:bg-surface",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[0.86rem] font-semibold">{conversation.title}</span>
            <span className="ml-auto shrink-0 text-[0.66rem] font-normal text-text-muted">
              {formatRelativeTime(conversation.updated_at)}
            </span>
          </div>
          <p className="mt-1 line-clamp-1 text-[0.74rem] leading-relaxed text-text-muted">
            {preview || "暂无消息"}
          </p>
        </div>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }
          }}
          className="mt-0.5 hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-danger-light hover:text-danger group-hover:flex"
          title="删除对话"
        >
          <Trash2 size={14} />
        </span>
      </div>
    </button>
  );
}

function MessageBubble({
  message,
  model,
  provider,
}: {
  message: ChatMessage;
  model?: Model;
  provider?: ModelProvider;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const logo = modelLogo(model, provider);

  async function copyMessage() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && <ModelAvatar logo={logo} />}
      <div className={cn("group max-w-[78%]", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "rounded-xl border px-4 py-3 text-[0.86rem] leading-relaxed",
            isUser
              ? "border-primary/20 bg-primary text-white shadow-sm shadow-primary/10"
              : message.error
                ? "border-danger/20 bg-danger-light/30 text-text"
                : "border-border-light bg-surface text-text shadow-xs",
          )}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <MarkdownContent content={message.content} />
          )}
        </div>
        <div
          className={cn(
            "mt-1 flex items-center gap-1 text-[0.68rem] text-text-muted opacity-0 transition-opacity group-hover:opacity-100",
            isUser && "justify-end",
          )}
        >
          <span>{formatDateTime(message.created_at)}</span>
          <button
            type="button"
            onClick={copyMessage}
            className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-bg-alt hover:text-text"
            title="复制消息"
          >
            {copied ? <Check size={13} /> : <Clipboard size={13} />}
          </button>
        </div>
      </div>
      {isUser && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-alt text-text-muted">
          <User size={16} />
        </div>
      )}
    </div>
  );
}

function ModelSelect({
  value,
  models,
  onChange,
  compact = false,
}: {
  value: string | null | undefined;
  models: Model[] | undefined;
  onChange: (modelId: string) => void;
  compact?: boolean;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "rounded-lg border border-border-light bg-surface text-text outline-none transition-colors hover:border-primary/30 focus:border-primary/50",
        compact ? "h-9 max-w-[220px] px-3 text-[0.78rem]" : "h-10 w-full px-3 text-[0.82rem]",
      )}
    >
      <option value="" disabled>
        选择模型
      </option>
      {(models ?? []).map((model) => (
        <option key={model.id} value={model.id}>
          {model.name}
        </option>
      ))}
    </select>
  );
}

function SettingsPanel({
  conversation,
  models,
  messageCount,
  onUpdate,
  onClear,
  clearing,
  onDelete,
  deleting,
}: {
  conversation: ChatConversation;
  models: Model[] | undefined;
  messageCount: number;
  onUpdate: (values: {
    title?: string;
    modelId?: string | null;
    temperature?: number;
    maxOutputTokens?: number;
    contextEnabled?: boolean;
  }) => void;
  onClear: () => void;
  clearing: boolean;
  onDelete: () => void;
  deleting: boolean;
}) {
  const [tab, setTab] = useState("settings");
  const [temperature, setTemperature] = useState(conversation.temperature);
  const [maxTokens, setMaxTokens] = useState(conversation.max_output_tokens);

  useEffect(() => {
    setTemperature(conversation.temperature);
    setMaxTokens(conversation.max_output_tokens);
  }, [conversation.id, conversation.temperature, conversation.max_output_tokens]);

  return (
    <aside className="hidden w-[300px] shrink-0 border-l border-border-light bg-surface xl:flex xl:flex-col">
      <div className="border-b border-border-light px-4 py-3">
        <Tabs
          tabs={[
            { id: "settings", label: "模型与设置" },
            { id: "info", label: "对话信息" },
          ]}
          activeTab={tab}
          onTabChange={setTab}
        />
      </div>

      {tab === "settings" ? (
        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <section>
            <div className="mb-2 flex items-center gap-2 text-[0.78rem] font-semibold text-text">
              <SlidersHorizontal size={14} />
              模型
            </div>
            <ModelSelect
              value={conversation.model_id}
              models={models}
              onChange={(modelId) => onUpdate({ modelId })}
            />
            <p className="mt-2 text-[0.72rem] leading-relaxed text-text-muted">
              当前对话会使用这个模型生成回复。
            </p>
          </section>

          <section className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[0.78rem] font-semibold text-text">温度</span>
                <span className="rounded-md bg-bg-alt px-2 py-0.5 text-[0.72rem] text-text-secondary">
                  {temperature.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                onMouseUp={() => onUpdate({ temperature })}
                onBlur={() => onUpdate({ temperature })}
                className="w-full accent-primary"
              />
              <p className="mt-1 text-[0.7rem] text-text-muted">低一些更稳定，高一些更发散。</p>
            </div>

            <div>
              <label className="mb-2 block text-[0.78rem] font-semibold text-text">
                最大输出 Tokens
              </label>
              <input
                type="number"
                min={256}
                max={32000}
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
                onBlur={() => onUpdate({ maxOutputTokens: maxTokens })}
                className="h-10 w-full rounded-lg border border-border-light bg-surface px-3 text-[0.82rem] text-text outline-none focus:border-primary/50"
              />
            </div>

            <label className="flex items-center justify-between rounded-lg border border-border-light px-3 py-3">
              <div>
                <div className="text-[0.78rem] font-semibold text-text">启用上下文</div>
                <div className="text-[0.7rem] text-text-muted">让模型参考本轮对话历史。</div>
              </div>
              <input
                type="checkbox"
                checked={conversation.context_enabled === 1}
                onChange={(e) => onUpdate({ contextEnabled: e.target.checked })}
                className="h-4 w-4 accent-primary"
              />
            </label>
          </section>

          <button
            type="button"
            disabled={clearing || messageCount === 0}
            onClick={onClear}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border-light bg-surface text-[0.8rem] font-medium text-text-secondary transition-colors hover:border-danger/30 hover:bg-danger-light/20 hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
          >
            {clearing ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
            清空上下文
          </button>
        </div>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <InfoRow label="标题" value={conversation.title} />
          <InfoRow label="模型" value={modelLabel(models, conversation.model_id)} />
          <InfoRow label="消息数" value={`${messageCount}`} />
          <InfoRow label="创建时间" value={formatDateTime(conversation.created_at)} />
          <InfoRow label="更新时间" value={formatDateTime(conversation.updated_at)} />
          <button
            type="button"
            disabled={deleting}
            onClick={onDelete}
            className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-danger/20 bg-danger-light/20 text-[0.8rem] font-medium text-danger transition-colors hover:bg-danger-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            删除对话
          </button>
        </div>
      )}
    </aside>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-light px-3 py-2.5">
      <div className="text-[0.68rem] text-text-muted">{label}</div>
      <div className="mt-1 break-words text-[0.82rem] font-medium text-text">{value}</div>
    </div>
  );
}

export default function ChatPage() {
  const queryClient = useQueryClient();
  const { data: conversations = [], isLoading: conversationsLoading } = useChatConversations();
  const { data: models = [] } = useWorkspaceModels();
  const { data: providers = [] } = useProviders();
  const createConversation = useCreateChatConversation();
  const updateConversation = useUpdateChatConversation();
  const deleteConversation = useDeleteChatConversation();
  const sendMessage = useSendChatMessage();
  const clearContext = useClearChatContext();

  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [draft, setDraft] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [streamingReplies, setStreamingReplies] = useState<Record<string, StreamingReply>>({});
  const endRef = useRef<HTMLDivElement>(null);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedId) ?? conversations[0],
    [conversations, selectedId],
  );

  const { data: messages = [], isLoading: messagesLoading } = useChatMessages(
    selectedConversation?.id,
  );
  const { data: stats } = useChatConversationStats(selectedConversation?.id);
  const activeStreamingReply = selectedConversation
    ? streamingReplies[selectedConversation.id]
    : undefined;

  useEffect(() => {
    const unlistenMessage = listen<ChatMessageEventPayload>("chat:message", (event) => {
      const conversationId = event.payload.conversation_id;
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["chat-messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["chat-conversation-stats", conversationId] });
    });

    const unlistenChunk = listen<ChatChunkEventPayload>("chat:chunk", (event) => {
      const payload = event.payload;
      if (payload.chunk_type === "content") {
        setStreamingReplies((current) => {
          const previous = current[payload.conversation_id] ?? { content: "", error: null };
          return {
            ...current,
            [payload.conversation_id]: {
              content: previous.content + payload.chunk,
              error: null,
            },
          };
        });
        return;
      }

      if (payload.chunk_type === "error") {
        setStreamingReplies((current) => ({
          ...current,
          [payload.conversation_id]: {
            content: current[payload.conversation_id]?.content ?? "",
            error: payload.chunk,
          },
        }));
        return;
      }

      if (payload.chunk_type === "done") {
        queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
        queryClient.invalidateQueries({ queryKey: ["chat-messages", payload.conversation_id] });
        queryClient.invalidateQueries({
          queryKey: ["chat-conversation-stats", payload.conversation_id],
        });
        window.setTimeout(() => {
          setStreamingReplies((current) => {
            const next = { ...current };
            delete next[payload.conversation_id];
            return next;
          });
        }, 250);
      }
    });

    return () => {
      unlistenMessage.then((fn) => fn());
      unlistenChunk.then((fn) => fn());
    };
  }, [queryClient]);

  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  useEffect(() => {
    setRenameValue(selectedConversation?.title ?? "");
  }, [selectedConversation?.id, selectedConversation?.title]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, sendMessage.isPending, activeStreamingReply?.content]);

  async function handleCreateConversation() {
    setError(null);
    const conversation = await createConversation.mutateAsync({
      modelId: models[0]?.id,
    });
    setSelectedId(conversation.id);
  }

  async function handleSend() {
    if (!selectedConversation || !draft.trim() || sendMessage.isPending) return;
    setError(null);
    const content = draft.trim();
    setDraft("");
    try {
      await sendMessage.mutateAsync({
        conversationId: selectedConversation.id,
        content,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setDraft(content);
    }
  }

  function updateSelected(values: {
    title?: string;
    modelId?: string | null;
    temperature?: number;
    maxOutputTokens?: number;
    contextEnabled?: boolean;
  }) {
    if (!selectedConversation) return;
    updateConversation.mutate({
      id: selectedConversation.id,
      ...values,
    });
  }

  async function handleDelete(conversationId: string) {
    await deleteConversation.mutateAsync(conversationId);
    if (conversationId === selectedConversation?.id) {
      const next = conversations.find((item) => item.id !== conversationId);
      setSelectedId(next?.id);
    }
  }

  const previews = useMemo(() => {
    if (!selectedConversation) return new Map<string, string>();
    return new Map([[selectedConversation.id, messages[messages.length - 1]?.content ?? ""]]);
  }, [messages, selectedConversation]);
  const providerMap = useMemo(
    () => new Map(providers.map((provider) => [provider.id, provider])),
    [providers],
  );
  const selectedModel = selectedConversation?.model_id
    ? models.find((model) => model.id === selectedConversation.model_id)
    : undefined;
  const selectedProvider = providerMap.get(selectedModel?.provider_id ?? "");

  return (
    <div className="flex h-[calc(100vh-var(--topbar-height)-3rem)] min-h-[620px] overflow-hidden rounded-lg border border-border-light bg-surface shadow-xs">
      <aside className="flex w-[280px] shrink-0 flex-col border-r border-border-light bg-bg/60">
        <div className="border-b border-border-light p-3">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-[0.95rem] font-semibold text-text">对话</h2>
              <p className="text-[0.72rem] text-text-muted">轻量 AI 聊天客户端</p>
            </div>
            <MessageSquare size={18} className="text-primary" />
          </div>
          <button
            type="button"
            onClick={handleCreateConversation}
            disabled={createConversation.isPending}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[0.84rem] font-semibold text-white shadow-sm shadow-primary/20 transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createConversation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            新建对话
          </button>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {conversationsLoading ? (
            <div className="flex h-24 items-center justify-center text-[0.78rem] text-text-muted">
              加载对话中...
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light text-primary">
                <MessageSquare size={18} />
              </div>
              <div className="text-[0.84rem] font-semibold text-text">还没有对话</div>
              <p className="mt-1 text-[0.72rem] leading-relaxed text-text-muted">
                创建一个对话，开始日常问答、写作或代码讨论。
              </p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                active={conversation.id === selectedConversation?.id}
                preview={previews.get(conversation.id) ?? ""}
                onSelect={() => setSelectedId(conversation.id)}
                onDelete={() => handleDelete(conversation.id)}
              />
            ))
          )}
        </div>

        <div className="border-t border-border-light p-3 text-[0.72rem] text-text-muted">
          共 {conversations.length} 个对话
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-bg">
        {selectedConversation ? (
          <>
            <header className="flex min-h-[64px] items-center gap-3 border-b border-border-light bg-surface px-5">
              <div className="min-w-0 flex-1">
                <input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => {
                    const title = renameValue.trim();
                    if (title && title !== selectedConversation.title) {
                      updateSelected({ title });
                    }
                  }}
                  className="w-full bg-transparent text-[0.95rem] font-semibold text-text outline-none"
                />
                <p className="text-[0.72rem] text-text-muted">
                  {modelLabel(models, selectedConversation.model_id)} · {stats?.message_count ?? messages.length} 条消息
                </p>
              </div>
              <ModelSelect
                compact
                value={selectedConversation.model_id}
                models={models}
                onChange={(modelId) => updateSelected({ modelId })}
              />
              <Settings2 size={18} className="text-text-muted xl:hidden" />
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {messagesLoading ? (
                <div className="flex h-full items-center justify-center text-text-muted">
                  加载消息中...
                </div>
              ) : messages.length === 0 && !activeStreamingReply && !sendMessage.isPending ? (
                <EmptyState
                  icon={Bot}
                  title="开始一个新对话"
                  description="可以问问题、整理思路、写代码或生成文本。当前第一版先专注基础聊天。"
                />
              ) : (
                <div className="mx-auto flex max-w-[880px] flex-col gap-5">
                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      model={getMessageModel(message, selectedConversation, models)}
                      provider={providerMap.get(
                        getMessageModel(message, selectedConversation, models)?.provider_id ?? "",
                      )}
                    />
                  ))}
                  {activeStreamingReply?.content && (
                    <MessageBubble
                      message={{
                        id: "streaming-assistant",
                        conversation_id: selectedConversation.id,
                        role: "assistant",
                        content: activeStreamingReply.content,
                        model_id: selectedConversation.model_id,
                        tokens_used: null,
                        error: activeStreamingReply.error,
                        created_at: new Date().toISOString(),
                      }}
                      model={selectedModel}
                      provider={selectedProvider}
                    />
                  )}
                  {sendMessage.isPending && !activeStreamingReply?.content && (
                    <div className="flex items-center gap-3 text-[0.82rem] text-text-muted">
                      <ModelAvatar logo={modelLogo(selectedModel, selectedProvider)} />
                      <Loader2 size={16} className="animate-spin" />
                      正在生成回复...
                    </div>
                  )}
                  <div ref={endRef} />
                </div>
              )}
            </div>

            <div className="border-t border-border-light bg-surface p-4">
              {error && (
                <div className="mx-auto mb-3 flex max-w-[880px] items-center justify-between rounded-lg border border-danger/20 bg-danger-light/30 px-3 py-2 text-[0.78rem] text-danger">
                  <span>{error}</span>
                  <button type="button" onClick={() => setError(null)}>
                    <X size={14} />
                  </button>
                </div>
              )}
              {models.length === 0 && (
                <div className="mx-auto mb-3 max-w-[880px] rounded-lg border border-warning/20 bg-warning-light/50 px-3 py-2 text-[0.78rem] text-text-secondary">
                  还没有启用模型。请先到「模型与路由」配置 Provider 并启用模型。
                </div>
              )}
              <div className="mx-auto flex max-w-[880px] items-end gap-3 rounded-xl border border-border-light bg-bg px-3 py-3 shadow-xs">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="输入消息，Enter 发送，Shift + Enter 换行"
                  rows={1}
                  className="max-h-36 min-h-[42px] flex-1 resize-none bg-transparent py-2 text-[0.88rem] text-text outline-none placeholder:text-text-muted"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!draft.trim() || sendMessage.isPending || models.length === 0}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-sm shadow-primary/20 transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                  title="发送"
                >
                  {sendMessage.isPending ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <Send size={17} />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              icon={MessageSquare}
              title="选择或新建一个对话"
              description="对话适合日常轻量问答；复杂工作仍然可以交给任务中心。"
            />
          </div>
        )}
      </section>

      {selectedConversation && (
        <SettingsPanel
          conversation={selectedConversation}
          models={models}
          messageCount={stats?.message_count ?? messages.length}
          onUpdate={updateSelected}
          onClear={() => clearContext.mutate(selectedConversation.id)}
          clearing={clearContext.isPending}
          onDelete={() => handleDelete(selectedConversation.id)}
          deleting={deleteConversation.isPending}
        />
      )}
    </div>
  );
}
