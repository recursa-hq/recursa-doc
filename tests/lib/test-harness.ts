import { mock } from 'bun:test';
import type { AppConfig } from '../../src/config';
import type { ChatMessage } from '../../src/types';

/**
 * Creates a mock LLM query function for testing purposes.
 * This replaces the duplicate Mock LLM utilities found across different test files.
 * 
 * @param responses - Array of predefined responses to return in sequence
 * @returns A mock function that simulates LLM responses
 */
export const createMockQueryLLM = (responses: string[]) => {
  let callCount = 0;
  return async (
    _history: ChatMessage[],
    _config: AppConfig
  ): Promise<string> => {
    // Return the next pre-canned XML response from the `responses` array.
    const response = responses[callCount];
    if (!response) {
      throw new Error(
        `Mock LLM called more times than expected (${callCount}).`
      );
    }
    callCount++;
    return response;
  };
};

/**
 * Creates a mock LLM query function using Bun's mock for testing with spies.
 * This is useful when you need to track call counts, arguments, etc.
 * 
 * @param responses - Array of predefined responses to return in sequence
 * @returns A Bun mock function that simulates LLM responses
 */
export const createMockLLMQueryWithSpy = (responses: string[]) => {
  let callCount = 0;
  return mock(async (_history: unknown[], _config: unknown) => {
    const response = responses[callCount] || responses[responses.length - 1];
    callCount++;
    return response;
  });
};

/**
 * Default mock configuration for tests
 */
export const createMockConfig = (overrides: Partial<AppConfig> = {}): AppConfig => ({
  openRouterApiKey: 'test-api-key',
  knowledgeGraphPath: '/test/path',
  llmModel: 'anthropic/claude-3-haiku-20240307',
  ...overrides,
});

/**
 * Default mock chat history for tests
 */
export const createMockHistory = (customMessages: Partial<ChatMessage>[] = []): ChatMessage[] => [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello, world!' },
  ...customMessages.map(msg => ({
    role: msg.role || 'user',
    content: msg.content || '',
  } as ChatMessage)),
];
