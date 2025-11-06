import type { AppConfig } from '../config';
import type { ExecutionContext, ChatMessage, StatusUpdate } from '../types';
import { logger } from '../lib/logger';
import { queryLLMWithRetries as defaultQueryLLM } from './llm';
import { parseLLMResponse } from './parser';
import { runInSandbox } from './Sandbox';
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
      path: path.resolve(process.cwd(), 'docs/system-prompt.md'),
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
  queryLLM: typeof defaultQueryLLM = defaultQueryLLM,
  // Optional callback for real-time status updates
  onStatusUpdate?: (update: StatusUpdate) => void
): Promise<string> => {
  // 1. **Initialization**
  const runId = randomUUID();
  const currentSessionId = sessionId || runId;
  logger.info('Starting user query handling', {
    runId,
    sessionId: currentSessionId,
  });

  const memAPI = createMemAPI(config.knowledgeGraphPath);

  // Initialize or retrieve session history
  if (!sessionHistories[currentSessionId]) {
    sessionHistories[currentSessionId] = [getSystemPrompt()];
  }
  
  const history = sessionHistories[currentSessionId];
  history.push({ role: 'user', content: query });

  const context: ExecutionContext = {
    history,
    memAPI,
    config,
    runId,
    onStatusUpdate,
  };

  // 2. **Execution Loop**
  const MAX_TURNS = 10;
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    logger.info(`Starting turn ${turn + 1}`, { runId, turn: turn + 1 });

    // **Call LLM**
    const llmResponseStr = (await queryLLM(context.history, config)) as string;
    context.history.push({ role: 'assistant', content: llmResponseStr });

    // **Parse**
    const parsedResponse = parseLLMResponse(llmResponseStr);
    
    // Debug logging to see what was parsed
    logger.info('Parsed LLM response', {
      runId,
      parsed: {
        think: !!parsedResponse.think,
        typescript: !!parsedResponse.typescript,
        reply: !!parsedResponse.reply,
      },
    });
    
    if (
      !parsedResponse.think &&
      !parsedResponse.typescript &&
      !parsedResponse.reply
    ) {
      logger.error('Failed to parse LLM response', undefined, {
        runId,
        llmResponseStr: llmResponseStr as string,
      });
      return 'Error: Could not understand the response from the AI.';
    }

    // **Think**
    if (parsedResponse.think) {
      logger.info('Agent is thinking', {
        runId,
        thought: parsedResponse.think,
      });

      // Send real-time status update via callback if available
      if (onStatusUpdate) {
        const thinkUpdate: StatusUpdate = {
          type: 'think',
          runId,
          timestamp: Date.now(),
          content: parsedResponse.think,
        };
        onStatusUpdate(thinkUpdate);
      }
    }

    // **Act**
    if (parsedResponse.typescript) {
      logger.info('Executing TypeScript code', { runId });
      
      // Send action status update via callback if available
      if (onStatusUpdate) {
        const actUpdate: StatusUpdate = {
          type: 'act',
          runId,
          timestamp: Date.now(),
          content: 'Executing code...',
          data: { code: parsedResponse.typescript },
        };
        onStatusUpdate(actUpdate);
      }

      try {
        logger.info('Running code in sandbox', { runId });
        const executionResult = await runInSandbox(
          parsedResponse.typescript,
          context.memAPI
        );
        logger.info('Code executed successfully', { runId, result: executionResult });
        const feedback = `[Execution Result]: Code executed successfully. Result: ${JSON.stringify(
          executionResult
        )}`;
        context.history.push({ role: 'user', content: feedback });

        // Send success status update
        if (onStatusUpdate) {
          const successUpdate: StatusUpdate = {
            type: 'act',
            runId,
            timestamp: Date.now(),
            content: 'Code executed successfully',
            data: { result: executionResult },
          };
          onStatusUpdate(successUpdate);
        }
      } catch (e) {
        logger.error('Code execution failed', e as Error, { runId });
        const feedback = `[Execution Error]: ${(e as Error).message}`;
        context.history.push({ role: 'user', content: feedback });

        // Send error status update
        if (onStatusUpdate) {
          const errorUpdate: StatusUpdate = {
            type: 'error',
            runId,
            timestamp: Date.now(),
            content: `Code execution failed: ${(e as Error).message}`,
          };
          onStatusUpdate(errorUpdate);
        }
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
