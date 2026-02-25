import { create } from "zustand";

export interface StreamingData {
  stepId: string;
  agentId: string;
  agentName: string;
  content: string;
  thinking: string;
}

export interface ExecutionChunkPayload {
  task_id: string;
  step_id: string;
  agent_id: string;
  agent_name: string;
  chunk_type: string;
  chunk: string;
}

interface StreamState {
  streams: Record<string, StreamingData>;
  appendContent: (taskId: string, stepId: string, agentId: string, agentName: string, chunk: string) => void;
  appendThinking: (taskId: string, stepId: string, agentId: string, agentName: string, chunk: string) => void;
  clearStream: (taskId: string) => void;
}

export const useStreamStore = create<StreamState>((set) => ({
  streams: {},

  appendContent: (taskId, stepId, agentId, agentName, chunk) =>
    set((state) => {
      const prev = state.streams[taskId];
      if (prev?.stepId === stepId) {
        return {
          streams: { ...state.streams, [taskId]: { ...prev, content: prev.content + chunk } },
        };
      }
      return {
        streams: {
          ...state.streams,
          [taskId]: { stepId, agentId, agentName, content: chunk, thinking: "" },
        },
      };
    }),

  appendThinking: (taskId, stepId, agentId, agentName, chunk) =>
    set((state) => {
      const prev = state.streams[taskId];
      if (prev?.stepId === stepId) {
        return {
          streams: { ...state.streams, [taskId]: { ...prev, thinking: prev.thinking + chunk } },
        };
      }
      return {
        streams: {
          ...state.streams,
          [taskId]: { stepId, agentId, agentName, content: "", thinking: chunk },
        },
      };
    }),

  clearStream: (taskId) =>
    set((state) => {
      const { [taskId]: _, ...rest } = state.streams;
      return { streams: rest };
    }),
}));
