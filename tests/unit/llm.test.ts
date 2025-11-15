import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { queryLLM } from '../../src/core/llm';
import { generateText } from 'ai';
import { openrouter } from '@openrouter/ai-sdk-provider';
import type { AppConfig } from '../../src/config';
import type { ChatMessage } from '../../src/types';
import type { GenerateTextResult } from 'ai';

// Mock the Vercel AI SDK and the OpenRouter provider
jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

jest.mock('@openrouter/ai-sdk-provider', () => ({
  openrouter: jest.fn((modelId: string) => ({
    modelId,
    provider: 'mockOpenRouterProvider',
  })),
}));

// Cast the mocked functions to Jest's mock type for type safety
const mockGenerateText = generateText as jest.MockedFunction<typeof generateText>;
const mockOpenRouter = openrouter as unknown as jest.Mock;

const mockConfig: AppConfig = {
  openRouterApiKey: 'test-api-key',
  knowledgeGraphPath: '/test/path',
  recursaApiKey: 'test-api-key',
  httpPort: 8080,
  llmModel: 'anthropic/claude-3-haiku-20240307',
  llmTemperature: 0.7,
  llmMaxTokens: 4000,
  sandboxTimeout: 10000,
  sandboxMemoryLimit: 100,
  gitUserName: 'Test User',
  gitUserEmail: 'test@example.com',
};

const mockHistory: ChatMessage[] = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello, world!' },
  { role: 'assistant', content: 'How can I help you?' },
];

beforeEach(() => {
  // Clear all mock history and implementations before each test
  jest.clearAllMocks();
});

describe('LLM Module with AI SDK', () => {
  it('should call generateText with correct parameters', async () => {
    // Arrange: Mock the successful response from the AI SDK
    mockGenerateText.mockResolvedValue({
      text: 'Test response from AI SDK',
      reasoning: undefined,
      files: [],
      reasoningDetails: [],
      sources: [],
      experimental_output: undefined as never,
      toolCalls: [],
      toolResults: [],
      finishReason: 'stop',
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
      warnings: undefined,
      steps: [],
      request: {
        body: '{}',
      },
      response: {
        id: 'test-response-id',
        timestamp: new Date(),
        modelId: 'anthropic/claude-3-haiku-20240307',
        headers: {},
        messages: [],
        body: undefined,
      },
      logprobs: undefined,
      experimental_providerMetadata: undefined,
    } as unknown as GenerateTextResult<{}, never>);

    // Act: Call our queryLLM function
    const response = await queryLLM(mockHistory, mockConfig);

    // Assert: Check the response and that our mocks were called correctly
    expect(response).toBe('Test response from AI SDK');

    // Verify openrouter was called with the correct model ID
    expect(mockOpenRouter).toHaveBeenCalledTimes(1);
    expect(mockOpenRouter).toHaveBeenCalledWith('anthropic/claude-3-haiku-20240307');

    // Verify generateText was called correctly
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: {
          modelId: 'anthropic/claude-3-haiku-20240307',
          provider: 'mockOpenRouterProvider',
        },
        system: 'You are a helpful assistant.',
        messages: [
          { role: 'user', content: 'Hello, world!' },
          { role: 'assistant', content: 'How can I help you?' },
        ],
        temperature: 0.7,
        maxTokens: 4000,
      })
    );
  });

  it('should handle API errors from generateText', async () => {
    // Arrange: Mock an error being thrown from the AI SDK
    const apiError = new Error('API request failed');
    mockGenerateText.mockRejectedValue(apiError);

    // Act & Assert: Expect our queryLLM function to reject with a specific error message
    await expect(queryLLM(mockHistory, mockConfig)).rejects.toThrow(
      'Failed to query OpenRouter API: API request failed'
    );
  });

  it('should handle empty content in the AI SDK response', async () => {
    // Arrange: Mock a response with an empty text field
    mockGenerateText.mockResolvedValue({
      text: '',
      reasoning: undefined,
      files: [],
      reasoningDetails: [],
      sources: [],
      experimental_output: undefined as never,
      toolCalls: [],
      toolResults: [],
      finishReason: 'stop',
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
      warnings: undefined,
      steps: [],
      request: {
        body: '{}',
      },
      response: {
        id: 'test-response-id',
        timestamp: new Date(),
        modelId: 'anthropic/claude-3-haiku-20240307',
        headers: {},
        messages: [],
        body: undefined,
      },
      logprobs: undefined,
      experimental_providerMetadata: undefined,
    } as unknown as GenerateTextResult<{}, never>);

    // Act & Assert: Expect an error for empty content
    await expect(queryLLM(mockHistory, mockConfig)).rejects.toThrow(
      'Failed to query OpenRouter API: Empty content received from OpenRouter API'
    );
  });
});