import type { AppConfig } from '../config';

import type { ChatMessage } from '../types';

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
  <T extends (...args: any[]) => Promise<any>>(queryFn: T) =>
  async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const maxAttempts = 3;
    const initialDelay = 1000;
    const backoffFactor = 2;
    let lastError: Error;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await queryFn(...args);
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on non-retryable errors (4xx status codes)
        if (error instanceof HttpError && error.statusCode >= 400 && error.statusCode < 500) {
          throw error;
        }

        // If this is the last attempt, throw the error
        if (attempt === maxAttempts - 1) {
          throw lastError;
        }

        // Calculate exponential backoff delay
        const delay = initialDelay * Math.pow(backoffFactor, attempt);
        console.warn(`Retry attempt ${attempt + 1}/${maxAttempts} after ${delay}ms delay. Error: ${lastError.message}`);
        
        // Wait for the delay
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  };

export const queryLLM = async (
  history: ChatMessage[],
  config: AppConfig
): Promise<string> => {
  // OpenRouter API endpoint
  const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';

  // Create request body
  const requestBody = {
    model: config.llmModel,
    messages: history,
    temperature: 0.7,
    max_tokens: 4000,
  };

  try {
    // Make POST request to OpenRouter API
    const response = await fetch(openRouterUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': `http://localhost:${config.port}`,
        'X-Title': 'Recursa',
      },
      body: JSON.stringify(requestBody),
    });

    // Check if response is successful
    if (!response.ok) {
      let errorDetails = 'Unknown error';
      try {
        const errorData = await response.json() as any;
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
    const data = await response.json() as any;

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
    throw new Error(`Failed to query OpenRouter API: ${(error as Error).message}`);
  }
};

export const queryLLMWithRetries = withRetry(queryLLM);