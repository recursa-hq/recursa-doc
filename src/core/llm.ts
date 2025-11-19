import type { AppConfig } from '../config';
import { logger } from '../lib/logger.js';
import type { ChatMessage } from '../types';
import { promises as fs } from 'fs';

// Custom error class for HTTP errors with status code
class HttpError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseText?: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

const withRetry =
  <T extends (...args: unknown[]) => Promise<unknown>>(queryFn: T) =>
  async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const maxAttempts = 3;
    const initialDelay = 1000;
    const backoffFactor = 2;
    let lastError: Error;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return (await queryFn(...args)) as Awaited<ReturnType<T>>;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on non-retryable errors (4xx status codes)
        if (
          error instanceof HttpError &&
          error.statusCode >= 400 &&
          error.statusCode < 500
        ) {
          throw error;
        }

        // If this is the last attempt, throw the error
        if (attempt === maxAttempts - 1) {
          throw lastError;
        }

        // Calculate exponential backoff delay
        const delay = initialDelay * Math.pow(backoffFactor, attempt);
        logger.warn(
          `Retry attempt ${attempt + 1}/${maxAttempts} after ${delay}ms delay. Error: ${lastError.message}`
        );

        // Wait for the delay
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  };

export const queryLLM = async (
  history: ChatMessage[],
  config: AppConfig
): Promise<string> => {
  // Mock Engine: If using the special test key, bypass OpenRouter and read from the file queue.
  if (config.openRouterApiKey === 'TEST_MOCK_KEY') {
    const queueFile = config.mockQueueFile || process.env.MOCK_QUEUE_FILE;
    
    if (!queueFile) {
      throw new Error('TEST_MOCK_KEY is set, but MOCK_QUEUE_FILE is missing.');
    }

    try {
      const content = await fs.readFile(queueFile, 'utf-8');
      const queue = JSON.parse(content);

      if (!Array.isArray(queue) || queue.length === 0) {
        throw new Error('Mock response queue is empty.');
      }

      const response = queue.shift();
      
      // Write back updated queue for stateful multi-turn testing
      await fs.writeFile(queueFile, JSON.stringify(queue, null, 2));
      
      logger.info('Mock LLM: Using response from queue', { remaining: queue.length });
      return response;
    } catch (error) {
      throw new Error(`Mock LLM Engine failed: ${(error as Error).message}`);
    }
  }

  // OpenRouter API endpoint
  const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';

  // Create request body
  const requestBody = {
    model: config.llmModel,
    messages: history,
    temperature: config.llmTemperature,
    max_tokens: config.llmMaxTokens,
  };

  try {
    // Make POST request to OpenRouter API
    const response = await fetch(openRouterUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/rec/ursa', // Referer is required by OpenRouter
        'X-Title': 'Recursa',
      },
      body: JSON.stringify(requestBody),
    });

    // Check if response is successful
    if (!response.ok) {
      let errorDetails = 'Unknown error';
      try {
        const errorData = (await response.json()) as {
          error?: { message?: string };
        };
        errorDetails = errorData.error?.message || JSON.stringify(errorData);
      } catch {
        errorDetails = await response.text();
      }

      throw new HttpError(
        `OpenRouter API error: ${response.status} ${response.statusText}`,
        response.status,
        errorDetails
      );
    }

    // Parse JSON response
    const data = (await response.json()) as {
      choices: Array<{
        message: {
          content: string;
        };
      }>;
    };

    // Extract and validate content
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from OpenRouter API');
    }

    const content = data.choices[0].message.content;
    if (!content) {
      throw new Error('Empty content received from OpenRouter API');
    }

    return content;
  } catch (error) {
    // Re-throw HttpError instances
    if (error instanceof HttpError) {
      throw error;
    }

    // Wrap other errors
    throw new Error(
      `Failed to query OpenRouter API: ${(error as Error).message}`
    );
  }
};

export const queryLLMWithRetries = withRetry(
  queryLLM as (...args: unknown[]) => Promise<unknown>
);
