import type { MemAPI } from './mem.js';
import type { ChatMessage } from './llm.js';

// Real-time status update types
export type StatusUpdate = {
  type: 'think' | 'act' | 'error' | 'complete';
  runId: string;
  timestamp: number;
  content?: string;
  data?: Record<string, unknown>;
};

// The execution context passed through the agent loop.
export type ExecutionContext = {
  // The complete conversation history for this session.
  history: ChatMessage[];
  // The API implementation available to the sandbox.
  memAPI: MemAPI;
  // The application configuration.
  config: import('../config').AppConfig;
  // A unique ID for this execution run.
  runId: string;
  // Optional callback for real-time status updates
  onStatusUpdate?: (update: StatusUpdate) => void;
};
