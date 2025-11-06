import type { AppConfig } from '../config';
import type { ExecutionContext, ChatMessage } from '../types';
import { logger } from '../lib/logger';
import { queryLLMWithRetries as defaultQueryLLM } from './llm';
import { parseLLMResponse } from './parser';
import { runInSandbox } from './sandbox';
import { createMemAPI } from './mem-api';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

// A mock in-memory session store. In a real app, this might be Redis, a DB, or a file store.
const sessionHistories: Record<string, ChatMessage[]> = {};

let systemPromptMessage: ChatMessage | null = null;

const getSystemPrompt = (): ChatMessage => {
  // This function reads the system prompt from disk on its first call and caches it.
  // This is a form of lazy-loading and ensures the file is read only once.
  if (systemPromptMessage) {
    return systemPromptMessage;
  }

  try {
    // Resolve the path to 'docs/system-prompt.md' from the project root.
    const promptPath = path.resolve(process.cwd(), 'docs/system-prompt.md');
    
    // Read the file content synchronously.
    const systemPromptContent = fs.readFileSync(promptPath, 'utf-8');
    
    // Create the ChatMessage object and store it in `systemPromptMessage`.
    systemPromptMessage = {
      role: 'system',
      content: systemPromptContent.trim(),
    };
    
    logger.info('System prompt loaded successfully', { path: promptPath });
    return systemPromptMessage;
  } catch (error) {
    // If file read fails, log a critical error and exit, as the agent cannot run without it.
    logger.error('Failed to load system prompt file', error as Error, { 
      path: path.resolve(process.cwd(), 'docs/system-prompt.md')
    });
    
    // Exit the process with a non-zero code to indicate failure
    process.exit(1);
  }
};

export const handleUserQuery = async (
  query: string,
  config: AppConfig,
  sessionId?: string,
  // Allow overriding the LLM query function (with its retry logic) for testing purposes
  queryLLM: typeof defaultQueryLLM = defaultQueryLLM
): Promise<string> => {
  // 1. **Initialization**
  const runId = randomUUID();
  const currentSessionId = sessionId || randomUUID();
  logger.info('Starting user query handling', { runId, sessionId: currentSessionId });

  const memAPI = createMemAPI(config);

  const history = sessionHistories[currentSessionId] ?? [getSystemPrompt()];
  if (!sessionHistories[currentSessionId]) {
    sessionHistories[currentSessionId] = history;
  }
  history.push({ role: 'user', content: query });

  const context: ExecutionContext = {
    history,
    memAPI,
    config,
    runId,
  };

  // 2. **Execution Loop**
  const MAX_TURNS = 10;
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    logger.info(`Starting turn ${turn + 1}`, { runId, turn: turn + 1 });

    // **Call LLM**
    const llmResponseStr = await queryLLM(context.history, config);
    context.history.push({ role: 'assistant', content: llmResponseStr });

    // **Parse**
    const parsedResponse = parseLLMResponse(llmResponseStr);
    if (!parsedResponse.think && !parsedResponse.typescript && !parsedResponse.reply) {
      logger.error('Failed to parse LLM response', undefined, { runId, llmResponseStr });
      return 'Error: Could not understand the response from the AI.';
    }

    // **Think**
    if (parsedResponse.think) {
      logger.info('Agent is thinking', { runId, thought: parsedResponse.think });
      // TODO: In a real app, this would be sent to the client via SSE or WebSocket.
    }

    // **Act**
    if (parsedResponse.typescript) {
      try {
        const executionResult = await runInSandbox(
          parsedResponse.typescript,
          context.memAPI
        );
        const feedback = `[Execution Result]: Code executed successfully. Result: ${JSON.stringify(
          executionResult
        )}`;
        context.history.push({ role: 'user', content: feedback });
      } catch (e) {
         const feedback = `[Execution Error]: ${(e as Error).message}`;
         context.history.push({ role: 'user', content: feedback });
      }
    }

    // **Reply**
    if (parsedResponse.reply) {
      logger.info('Agent replied', { runId, reply: parsedResponse.reply });
      return parsedResponse.reply;
    }
  }

  // 3. **Termination**
  logger.warn('Loop finished without a reply', { runId, turns: MAX_TURNS });
  return 'The agent finished its work without providing a final response.';
};