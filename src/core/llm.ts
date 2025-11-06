import type { AppConfig } from '../config';

import type { ChatMessage } from '../types';

const withRetry =
  <T extends (...args: any[]) => Promise<any>>(queryFn: T) =>
  async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    // Cheatsheet for implementation:
    // 1. Define retry options (e.g., maxAttempts = 3, initialDelay = 1000ms, backoffFactor = 2).
    // 2. Use a for-loop for attempts from 0 to maxAttempts - 1.
    // 3. Inside the loop, use a try/catch block to call `await queryFn(...args)`.
    // 4. On success, return the result immediately.
    // 5. In catch, inspect the error. If it's a non-retryable error (e.g., a custom error with a 4xx HTTP status), re-throw.
    // 6. For retryable errors (network issues, 5xx), log a warning. If it's the last attempt, re-throw the error.
    // 7. Calculate the next delay using exponential backoff: `const delay = initialDelay * Math.pow(backoffFactor, attempt);`
    // 8. Wait for the delay: `await new Promise(resolve => setTimeout(resolve, delay));`
    // 9. If the loop completes without a successful return, throw the last error caught.
    throw new Error('Retry logic not implemented');
  };

export const queryLLM = async (
  history: ChatMessage[],
  config: AppConfig
): Promise<string> => {
  // Cheatsheet for implementation:
  // 1. Define the OpenRouter API endpoint URL.
  // 2. Create the request body: `{ model: config.llmModel, messages: history }`.
  //    - Consider adding other standard parameters like `temperature`, `max_tokens` if needed.
  //    - OpenRouter also supports advanced routing via `route: "fallback"` or specific model lists.
  // 3. Use `fetch` to make a POST request.
  // 4. Set required headers:
  //    - 'Authorization': `Bearer ${config.openRouterApiKey}`
  //    - 'Content-Type': 'application/json'
  //    - Recommended: 'HTTP-Referer': `http://localhost:${config.port}` (or your app's URL from config)
  //    - Recommended: 'X-Title': 'Recursa' (your app's name)
  // 5. Check if `response.ok`. If not, `await response.json()` to get error details.
  //    - Create a custom error object (e.g., class HttpError extends Error) that includes the status code and the error message from the body.
  //    - Throw this custom error. This is crucial for the retry logic to inspect the status code.
  // 6. Parse the JSON response: `const data = await response.json();`.
  // 7. Extract content: `data.choices[0].message.content`. Handle potential empty or malformed responses.
  throw new Error('Not implemented');
};

export const queryLLMWithRetries = withRetry(queryLLM);