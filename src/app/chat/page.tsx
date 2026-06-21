import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { listen } from "@tauri-apps/api/event";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Box,
  Check,
  ChevronDown,
  Clipboard,
  FileText,
  Loader2,
  Maximize2,
  MessageSquare,
  Paperclip,
  PencilLine,
  Plus,
  Send,
  Settings2,
  SlidersHorizontal,
  Trash2,
  User,
  X,
} from "lucide-react";
import { EmptyState, MarkdownContent, Modal, Tabs } from "@/components/ui";
import {
  SUPPORTED_ATTACHMENT_ACCEPT,
  buildChatAttachmentInput,
} from "@/lib/fileContent";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  useChatConversationStats,
  useChatConversations,
  useChatAttachments,
  useChatMessages,
  useClearChatContext,
  useCreateChatConversation,
  useDeleteChatConversation,
  useSendChatMessage,
  useUpdateChatConversation,
} from "@/hooks/useChat";
import { useProviders, useWorkspaceModels } from "@/hooks/useModels";
import { usePromptTemplates } from "@/hooks/usePrompts";
import type {
  ChatConversation,
  ChatAttachment,
  ChatAttachmentInput,
  ChatConversationStats,
  ChatMessage,
  Model,
  ModelProvider,
  PromptTemplateEntry,
} from "@/types";

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

interface PendingAttachment extends ChatAttachmentInput {
  id: string;
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

function formatTokenCount(value: number | null | undefined): string {
  if (!value || value <= 0) return "-";
  return value.toLocaleString("zh-CN");
}

function formatTokenSpeed(value: number | null | undefined): string {
  if (!value || value <= 0) return "-";
  return `${value.toFixed(value >= 10 ? 0 : 1)} tok/s`;
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function attachmentStatusLabel(status: ChatAttachment["status"] | PendingAttachment["status"]) {
  if (status === "ready") return "已读取";
  if (status === "failed") return "读取失败";
  return "仅记录";
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
  onRename,
  onDelete,
}: {
  conversation: ChatConversation;
  active: boolean;
  preview: string;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(conversation.title);

  useEffect(() => {
    setTitle(conversation.title);
  }, [conversation.title]);

  function commitTitle() {
    const next = title.trim();
    if (next && next !== conversation.title) {
      onRename(next);
    } else {
      setTitle(conversation.title);
    }
    setEditing(false);
  }

  return (
    <div
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
            {editing ? (
              <input
                value={title}
                autoFocus
                onChange={(e) => setTitle(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitTitle();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setTitle(conversation.title);
                    setEditing(false);
                  }
                }}
                className="min-w-0 flex-1 rounded-md border border-primary/30 bg-surface px-2 py-1 text-[0.82rem] font-semibold text-text outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={onSelect}
                onDoubleClick={() => setEditing(true)}
                className="min-w-0 flex-1 truncate rounded-md px-1 py-0.5 text-left text-[0.86rem] font-semibold transition-colors hover:bg-bg-alt hover:text-primary"
                title="点击选择，双击修改标题"
              >
                {conversation.title}
              </button>
            )}
            <span className="ml-auto shrink-0 text-[0.66rem] font-normal text-text-muted">
              {formatRelativeTime(conversation.updated_at)}
            </span>
          </div>
          <button
            type="button"
            onClick={onSelect}
            className="mt-1 block w-full text-left"
          >
            <p className="line-clamp-1 text-[0.74rem] leading-relaxed text-text-muted">
            {preview || "暂无消息"}
            </p>
          </button>
        </div>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              setEditing(true);
            }
          }}
          className="mt-0.5 hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-primary-light hover:text-primary group-hover:flex"
          title="修改标题"
        >
          <PencilLine size={14} />
        </span>
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
    </div>
  );
}

function MessageBubble({
  message,
  model,
  provider,
  attachments = [],
}: {
  message: ChatMessage;
  model?: Model;
  provider?: ModelProvider;
  attachments?: ChatAttachment[];
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
          {attachments.length > 0 && (
            <div className="mt-3 flex flex-col gap-2 border-t border-white/20 pt-3">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className={cn(
                    "flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[0.76rem]",
                    isUser
                      ? "border-white/20 bg-white/10 text-white"
                      : "border-border-light bg-bg text-text-secondary",
                  )}
                  title={attachment.file_name}
                >
                  <FileText size={14} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{attachment.file_name}</div>
                    <div className={cn("mt-0.5 text-[0.68rem]", isUser ? "text-white/70" : "text-text-muted")}>
                      {formatFileSize(attachment.size_bytes)} · {attachmentStatusLabel(attachment.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div
          className={cn(
            "mt-1 flex items-center gap-1 text-[0.68rem] text-text-muted opacity-0 transition-opacity group-hover:opacity-100",
            isUser && "justify-end",
          )}
        >
          <span>{formatDateTime(message.created_at)}</span>
          {!isUser && message.tokens_used && (
            <>
              <span>·</span>
              <span>{formatTokenCount(message.tokens_used)} tokens</span>
            </>
          )}
          {!isUser && message.tokens_per_second && (
            <>
              <span>·</span>
              <span>{formatTokenSpeed(message.tokens_per_second)}</span>
            </>
          )}
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

function ComposerModelSelect({
  value,
  models,
  providers,
  onChange,
}: {
  value: string | null | undefined;
  models: Model[] | undefined;
  providers: Map<string, ModelProvider>;
  onChange: (modelId: string) => void;
}) {
  const selectedModel = models?.find((model) => model.id === value);
  const logo = modelLogo(selectedModel, providers.get(selectedModel?.provider_id ?? ""));

  return (
    <div className="relative inline-flex h-8 max-w-[180px] shrink-0 items-center gap-2 rounded-lg px-2 text-[0.76rem] font-medium text-text transition-colors hover:bg-bg-alt">
      <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-md bg-bg-alt">
        {logo.src ? (
          <img
            src={logo.src}
            alt={logo.title}
            className="h-3.5 w-3.5 object-contain"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="text-[0.54rem] font-bold text-text-muted">{logo.label}</span>
        )}
      </div>
      <span className="truncate">{selectedModel?.name ?? "选择模型"}</span>
      <ChevronDown size={13} className="shrink-0 text-text-muted" />
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
        title="选择模型"
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
    </div>
  );
}

function ComposerIconButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg-alt hover:text-text"
      title={title}
    >
      {children}
    </button>
  );
}

function SettingsPanel({
  conversation,
  models,
  stats,
  messageCount,
  onUpdate,
  onClear,
  clearing,
  onDelete,
  deleting,
}: {
  conversation: ChatConversation;
  models: Model[] | undefined;
  stats?: ChatConversationStats;
  messageCount: number;
  onUpdate: (values: {
    title?: string;
    modelId?: string | null;
    temperature?: number;
    maxOutputTokens?: number;
    contextEnabled?: boolean;
    systemPrompt?: string | null;
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
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-[0.78rem] font-semibold text-text">
              <SlidersHorizontal size={14} />
              参数设置
            </div>
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
          <InfoRow label="累计 Tokens" value={formatTokenCount(stats?.total_tokens)} />
          <InfoRow
            label="平均速度"
            value={formatTokenSpeed(stats?.average_tokens_per_second)}
          />
          <InfoRow
            label="Prompt 模板"
            value={conversation.system_prompt?.trim() ? "已启用" : "未启用"}
          />
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
  const { data: promptTemplates = [] } = usePromptTemplates();
  const createConversation = useCreateChatConversation();
  const updateConversation = useUpdateChatConversation();
  const deleteConversation = useDeleteChatConversation();
  const sendMessage = useSendChatMessage();
  const clearContext = useClearChatContext();

  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [renameValue, setRenameValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [promptPickerOpen, setPromptPickerOpen] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [promptOverrides, setPromptOverrides] = useState<Record<string, string | null>>({});
  const [streamingReplies, setStreamingReplies] = useState<Record<string, StreamingReply>>({});
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedId) ?? conversations[0],
    [conversations, selectedId],
  );

  const { data: messages = [], isLoading: messagesLoading } = useChatMessages(
    selectedConversation?.id,
  );
  const { data: chatAttachments = [] } = useChatAttachments(selectedConversation?.id);
  const { data: stats } = useChatConversationStats(selectedConversation?.id);
  const activeStreamingReply = selectedConversation
    ? streamingReplies[selectedConversation.id]
    : undefined;

  useEffect(() => {
    const unlistenMessage = listen<ChatMessageEventPayload>("chat:message", (event) => {
      const conversationId = event.payload.conversation_id;
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["chat-messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["chat-attachments", conversationId] });
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
        queryClient.invalidateQueries({ queryKey: ["chat-attachments", payload.conversation_id] });
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
    setAttachments([]);
  }, [selectedConversation?.id]);

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
    if (!selectedConversation || (!draft.trim() && attachments.length === 0) || sendMessage.isPending) return;
    setError(null);
    const content = draft.trim() || "请阅读并处理附件内容。";
    const systemPrompt = getEffectiveSystemPrompt(selectedConversation);
    const sendingAttachments = attachments;
    setDraft("");
    setAttachments([]);
    try {
      await sendMessage.mutateAsync({
        conversationId: selectedConversation.id,
        content,
        systemPrompt: systemPrompt ?? "",
        attachments: sendingAttachments.map(({ id: _id, ...attachment }) => attachment),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setDraft(content);
      setAttachments(sendingAttachments);
    }
  }

  function updateSelected(values: {
    title?: string;
    modelId?: string | null;
    temperature?: number;
    maxOutputTokens?: number;
    contextEnabled?: boolean;
    systemPrompt?: string | null;
  }) {
    if (!selectedConversation) return;
    if (Object.prototype.hasOwnProperty.call(values, "systemPrompt")) {
      setPromptOverrides((current) => ({
        ...current,
        [selectedConversation.id]: values.systemPrompt ?? null,
      }));
    }
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

  async function handleAttachFile(file: File | undefined) {
    if (!file) return;
    try {
      const extracted = await buildChatAttachmentInput(file);
      setAttachments((current) => {
        const next = current.filter(
          (attachment) => !(attachment.file_name === file.name && attachment.size_bytes === file.size),
        );
        return [
          ...next,
          {
            id: `${file.name}-${file.size}-${file.lastModified}`,
            ...extracted,
          },
        ];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function applyPromptTemplate(template: PromptTemplateEntry) {
    if (!selectedConversation) return;
    updateSelected({ systemPrompt: template.prompt_content });
    setPromptPickerOpen(false);
    setTemplateSearch("");
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
  function getEffectiveSystemPrompt(conversation: ChatConversation | undefined): string | null {
    if (!conversation) return null;
    if (Object.prototype.hasOwnProperty.call(promptOverrides, conversation.id)) {
      return promptOverrides[conversation.id]?.trim() || null;
    }
    return conversation.system_prompt?.trim() || null;
  }
  const effectiveSystemPrompt = getEffectiveSystemPrompt(selectedConversation);
  const selectedPromptTemplate = useMemo(() => {
    const prompt = effectiveSystemPrompt;
    if (!prompt) return undefined;
    return promptTemplates.find((template) => template.prompt_content.trim() === prompt);
  }, [promptTemplates, effectiveSystemPrompt]);
  const selectedPromptLabel = effectiveSystemPrompt
    ? (selectedPromptTemplate?.agent_name ?? "自定义 Prompt")
    : null;
  const filteredPromptTemplates = useMemo(() => {
    const keyword = templateSearch.trim().toLowerCase();
    if (!keyword) return promptTemplates;
    return promptTemplates.filter((template) => {
      const text = `${template.agent_name} ${template.role_description ?? ""} ${template.note ?? ""} ${template.prompt_content}`.toLowerCase();
      return text.includes(keyword);
    });
  }, [promptTemplates, templateSearch]);
  const attachmentsByMessageId = useMemo(() => {
    const grouped = new Map<string, ChatAttachment[]>();
    for (const attachment of chatAttachments) {
      const list = grouped.get(attachment.message_id) ?? [];
      list.push(attachment);
      grouped.set(attachment.message_id, list);
    }
    return grouped;
  }, [chatAttachments]);

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
                onRename={(title) =>
                  updateConversation.mutate({
                    id: conversation.id,
                    title,
                  })
                }
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
                  {modelLabel(models, selectedConversation.model_id)} · {stats?.message_count ?? messages.length} 条消息 · {formatTokenCount(stats?.total_tokens)} tokens
                </p>
              </div>
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
                      attachments={attachmentsByMessageId.get(message.id)}
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
                        duration_ms: null,
                        tokens_per_second: null,
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
              <div className="mx-auto flex max-w-[880px] flex-col gap-2 rounded-xl border border-border-light bg-bg px-3 py-3 shadow-xs">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={SUPPORTED_ATTACHMENT_ACCEPT}
                  onChange={(e) => handleAttachFile(e.target.files?.[0])}
                />
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex max-w-[260px] items-center gap-2 rounded-lg border border-border-light bg-surface px-2.5 py-2 text-[0.76rem] text-text-secondary"
                        title={attachment.file_name}
                      >
                        <FileText size={14} className="shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-text">{attachment.file_name}</div>
                          <div className="mt-0.5 text-[0.68rem] text-text-muted">
                            {formatFileSize(attachment.size_bytes)} · {attachmentStatusLabel(attachment.status)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setAttachments((current) =>
                              current.filter((item) => item.id !== attachment.id),
                            )
                          }
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-alt hover:text-text"
                          title="移除附件"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                  className="max-h-36 min-h-[42px] w-full resize-none bg-transparent py-2 text-[0.88rem] text-text outline-none placeholder:text-text-muted"
                />
                <div className="flex min-h-10 items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-1">
                    <ComposerIconButton
                      title="添加文本附件"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip size={17} />
                    </ComposerIconButton>
                    <ComposerIconButton
                      title="选择 Prompt 模板"
                      onClick={() => setPromptPickerOpen(true)}
                    >
                      <Box size={17} />
                    </ComposerIconButton>
                    {selectedPromptLabel && (
                      <div
                        className="ml-1 flex h-8 max-w-[220px] shrink-0 items-center rounded-lg border border-primary/20 bg-primary-light/50 text-primary"
                        title={`当前 Prompt 模板：${selectedPromptLabel}`}
                      >
                        <button
                          type="button"
                          onClick={() => setPromptPickerOpen(true)}
                          className="flex min-w-0 items-center gap-1.5 px-2 text-[0.74rem] font-medium"
                        >
                          <FileText size={13} className="shrink-0" />
                          <span className="truncate">Prompt: {selectedPromptLabel}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSelected({ systemPrompt: null })}
                          className="mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-primary/70 transition-colors hover:bg-primary/10 hover:text-primary"
                          title="清除 Prompt 模板"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    <ComposerModelSelect
                      value={selectedConversation.model_id}
                      models={models}
                      providers={providerMap}
                      onChange={(modelId) => updateSelected({ modelId })}
                    />
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <ComposerIconButton title="展开输入框">
                      <Maximize2 size={16} />
                    </ComposerIconButton>
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={
                        (!draft.trim() && attachments.length === 0) ||
                        sendMessage.isPending ||
                        models.length === 0
                      }
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
          stats={stats}
          messageCount={stats?.message_count ?? messages.length}
          onUpdate={updateSelected}
          onClear={() => clearContext.mutate(selectedConversation.id)}
          clearing={clearContext.isPending}
          onDelete={() => handleDelete(selectedConversation.id)}
          deleting={deleteConversation.isPending}
        />
      )}

      <Modal
        open={promptPickerOpen}
        onClose={() => setPromptPickerOpen(false)}
        title="引用 Agent Prompt 模板"
        width="680px"
      >
        <div className="space-y-4">
          <input
            value={templateSearch}
            onChange={(e) => setTemplateSearch(e.target.value)}
            placeholder="搜索 Agent、角色或提示词内容"
            className="h-10 w-full rounded-lg border border-border-light bg-bg px-3 text-[0.84rem] text-text outline-none focus:border-primary/50"
          />
          <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
            {filteredPromptTemplates.length === 0 ? (
              <div className="rounded-lg border border-border-light px-4 py-8 text-center text-[0.82rem] text-text-muted">
                暂无可用 Agent Prompt 模板
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPromptTemplates.map((template) => (
                      <button
                        key={`${template.agent_id}-${template.version}`}
                        type="button"
                        onClick={() => applyPromptTemplate(template)}
                        className={cn(
                          "w-full rounded-lg border border-border-light bg-bg px-4 py-3 text-left transition-colors",
                          "hover:border-primary/30 hover:bg-primary-light/40",
                          effectiveSystemPrompt === template.prompt_content.trim() &&
                            "border-primary/30 bg-primary-light/50",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[0.78rem] font-semibold text-white"
                            style={{ backgroundColor: template.avatar_color ?? "#635BFF" }}
                          >
                            {template.avatar_char ?? template.agent_name.slice(0, 1)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-[0.86rem] font-semibold text-text">
                                {template.agent_name}
                              </span>
                              <span className="shrink-0 rounded-md bg-bg-alt px-1.5 py-0.5 text-[0.66rem] text-text-muted">
                                {template.version > 0 ? `v${template.version}` : "系统提示词"}
                              </span>
                            </div>
                            <p className="mt-1 line-clamp-1 text-[0.74rem] text-text-muted">
                              {template.role_description ?? template.note ?? "无描述"}
                            </p>
                            <p className="mt-2 line-clamp-2 text-[0.76rem] leading-relaxed text-text-secondary">
                              {template.prompt_content}
                            </p>
                          </div>
                        </div>
                      </button>
                ))}
              </div>
            )}
          </div>
          {effectiveSystemPrompt && (
            <button
              type="button"
              onClick={() => {
                updateSelected({ systemPrompt: null });
                setPromptPickerOpen(false);
              }}
              className="flex h-9 w-full items-center justify-center rounded-lg border border-border-light text-[0.8rem] font-medium text-text-secondary transition-colors hover:bg-bg-alt hover:text-text"
            >
              清除当前 Prompt 模板
            </button>
          )}
        </div>
      </Modal>
    </div>
  );
}
