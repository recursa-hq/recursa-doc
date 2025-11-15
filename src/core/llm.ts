import { generateText } from 'ai';
import { openrouter } from '@openrouter/ai-sdk-provider';
import type { AppConfig } from '../config';
import { logger } from '../lib/logger.js';
import type { ChatMessage } from '../types';

export const queryLLM = async (
  history: ChatMessage[],
  config: AppConfig
): Promise<string> => {
  try {
    // Set environment variables for the default openrouter provider
    process.env.OPENROUTER_API_KEY = config.openRouterApiKey;
    process.env['HTTP-REFERER'] = 'https://github.com/rec/ursa';
    process.env['X-TITLE'] = 'Recursa';

    const model = openrouter(config.llmModel);

    // 2. Separate system prompt from the rest of the message history
    const systemPrompt = history.find((m) => m.role === 'system')?.content;
    const messages = history.filter(
      (m) => m.role === 'user' || m.role === 'assistant'
    );

    // 3. Call the AI SDK's generateText function
    const { text } = await generateText({
      model,
      system: systemPrompt,
      messages,
      temperature: config.llmTemperature,
      maxTokens: config.llmMaxTokens,
    });

    // 4. Validate and return the response
    if (!text) {
      throw new Error('Empty content received from OpenRouter API');
    }

    return text;
  } catch (error) {
    logger.error('Failed to query OpenRouter API', error as Error);
    // Re-throw the error to be handled by the agent loop
    throw new Error(
      `Failed to query OpenRouter API: ${(error as Error).message}`
    );
  }
};

// The AI SDK's underlying `fetch` implementation (`ofetch`) has built-in retry logic
// for transient network errors and 5xx server errors, so our custom `withRetry` HOF is no longer needed.
// We export `queryLLM` as `queryLLMWithRetries` to maintain the same interface for the agent loop.
export const queryLLMWithRetries = queryLLM as (
  ...args: unknown[]
) => Promise<unknown>;