import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { queryLLM, queryLLMWithRetries } from '../../src/core/llm';
import type { AppConfig } from '../../src/config';
import type { ChatMessage } from '../../src/types';

// Mock fetch globally
const mockFetch = jest.fn<typeof fetch>();
global.fetch = mockFetch;

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
];

beforeEach(() => {
  mockFetch.mockClear();
  mockFetch.mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        choices: [{ message: { content: 'Test response from LLM' } }],
      }),
    status: 200,
    statusText: 'OK',
  } as Response);
});

describe('LLM Module', () => {
  describe('queryLLM', () => {
    it('should make a successful request to OpenRouter API', async () => {
      const response = await queryLLM(mockHistory, mockConfig);

      expect(response).toBe('Test response from LLM');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-api-key',
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/rec/ursa', // Referer is required by OpenRouter
            'X-Title': 'Recursa',
          },
          body: JSON.stringify({
            model: 'anthropic/claude-3-haiku-20240307',
            messages: mockHistory,
            temperature: 0.7,
            max_tokens: 4000,
          }),
        })
      );
    });

    it('should handle API errors properly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () =>
          Promise.resolve({
            error: { message: 'Invalid API key' },
          }),
      } as Response);

      await expect(queryLLM(mockHistory, mockConfig)).rejects.toThrow(
        'OpenRouter API error: 401 Unauthorized'
      );
    });

    it('should handle malformed API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' }),
      } as Response);

      await expect(queryLLM(mockHistory, mockConfig)).rejects.toThrow(
        'Invalid response format from OpenRouter API'
      );
    });

    it('should handle empty content in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: '' } }],
          }),
      } as Response);

      await expect(queryLLM(mockHistory, mockConfig)).rejects.toThrow(
        'Empty content received from OpenRouter API'
      );
    });
  });

  describe('queryLLMWithRetries', () => {
    it('should retry on retryable errors', async () => {
      // First call fails with server error
      // Second call succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.resolve({ error: 'Server error' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [{ message: { content: 'Success after retry' } }],
            }),
        } as Response);

      const response = await queryLLMWithRetries(mockHistory, mockConfig);

      expect(response).toBe('Success after retry');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors (4xx)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () =>
          Promise.resolve({
            error: { message: 'Bad request' },
          }),
      } as Response);

      await expect(
        queryLLMWithRetries(mockHistory, mockConfig)
      ).rejects.toThrow('OpenRouter API error: 400 Bad Request');
      expect(mockFetch).toHaveBeenCalledTimes(1); // Should not retry
    });
  });
});
