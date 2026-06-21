import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tauriInvoke } from "@/lib/tauri";
import type {
  ChatAttachment,
  ChatAttachmentInput,
  ChatConversation,
  ChatConversationStats,
  ChatMessage,
} from "@/types";

export function useChatConversations() {
  return useQuery({
    queryKey: ["chat-conversations"],
    queryFn: () => tauriInvoke<ChatConversation[]>("list_chat_conversations"),
  });
}

export function useCreateChatConversation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params?: { title?: string; modelId?: string | null }) =>
      tauriInvoke<ChatConversation>("create_chat_conversation", {
        title: params?.title,
        modelId: params?.modelId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
  });
}

export function useUpdateChatConversation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      id: string;
      title?: string;
      modelId?: string | null;
      temperature?: number;
      maxOutputTokens?: number;
      contextEnabled?: boolean;
      systemPrompt?: string | null;
    }) =>
      tauriInvoke<ChatConversation>("update_chat_conversation", {
        id: params.id,
        payload: {
          title: params.title,
          model_id: params.modelId,
          temperature: params.temperature,
          max_output_tokens: params.maxOutputTokens,
          context_enabled: params.contextEnabled,
          system_prompt: params.systemPrompt,
        },
      }),
    onSuccess: (conversation) => {
      qc.invalidateQueries({ queryKey: ["chat-conversations"] });
      qc.invalidateQueries({ queryKey: ["chat-conversation-stats", conversation.id] });
    },
  });
}

export function useDeleteChatConversation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tauriInvoke<void>("delete_chat_conversation", { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat-conversations"] });
      qc.invalidateQueries({ queryKey: ["chat-messages"] });
      qc.invalidateQueries({ queryKey: ["chat-attachments"] });
      qc.invalidateQueries({ queryKey: ["chat-conversation-stats"] });
    },
  });
}

export function useChatMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ["chat-messages", conversationId],
    queryFn: () =>
      tauriInvoke<ChatMessage[]>("list_chat_messages", {
        conversationId,
      }),
    enabled: !!conversationId,
  });
}

export function useChatAttachments(conversationId: string | undefined) {
  return useQuery({
    queryKey: ["chat-attachments", conversationId],
    queryFn: () =>
      tauriInvoke<ChatAttachment[]>("list_chat_attachments", {
        conversationId,
      }),
    enabled: !!conversationId,
  });
}

export function useChatConversationStats(conversationId: string | undefined) {
  return useQuery({
    queryKey: ["chat-conversation-stats", conversationId],
    queryFn: () =>
      tauriInvoke<ChatConversationStats>("get_chat_conversation_stats", {
        conversationId,
      }),
    enabled: !!conversationId,
  });
}

export function useClearChatContext() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      tauriInvoke<void>("clear_chat_context", { conversationId }),
    onSuccess: (_data, conversationId) => {
      qc.invalidateQueries({ queryKey: ["chat-conversations"] });
      qc.invalidateQueries({ queryKey: ["chat-messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["chat-attachments", conversationId] });
      qc.invalidateQueries({ queryKey: ["chat-conversation-stats", conversationId] });
    },
  });
}

export function useSendChatMessage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      conversationId: string;
      content: string;
      systemPrompt?: string | null;
      attachments?: ChatAttachmentInput[];
    }) =>
      tauriInvoke<ChatMessage>("send_chat_message", params),
    onSuccess: (_message, variables) => {
      qc.invalidateQueries({ queryKey: ["chat-conversations"] });
      qc.invalidateQueries({ queryKey: ["chat-messages", variables.conversationId] });
      qc.invalidateQueries({ queryKey: ["chat-attachments", variables.conversationId] });
      qc.invalidateQueries({
        queryKey: ["chat-conversation-stats", variables.conversationId],
      });
    },
  });
}
