import type { MemAPI } from './mem.js';
import type { ChatMessage } from './llm.js';

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
  // Function to stream content back to the client.
  streamContent: (content: { type: 'text'; text: string }) => Promise<void>;
};
