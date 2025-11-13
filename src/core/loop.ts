import type { AppConfig } from '../config';
import type { ExecutionContext, ChatMessage } from '../types';
import { logger } from '../lib/logger.js';
import { queryLLMWithRetries as defaultQueryLLM } from './llm.js';
import { parseLLMResponse } from './parser.js';
import { runInSandbox } from './sandbox.js';
import { createMemAPI } from './mem-api/index.js';
import { sanitizeTenantId } from './mem-api/secure-path.js';
import { promises as fs } from 'fs';
import path from 'path';

// Helper functions for session management
const getSessionPath = async (
  sessionId: string,
  graphRoot: string,
): Promise<string> => {
  const sessionDir = path.join(graphRoot, '.sessions');
  // Ensure the session directory exists
  await fs.mkdir(sessionDir, { recursive: true });
  return path.join(sessionDir, `${sessionId}.json`);
};

const loadSessionHistory = async (
  sessionId: string,
  graphRoot: string,
): Promise<ChatMessage[] | null> => {
  const sessionFile = await getSessionPath(sessionId, graphRoot);
  try {
    const data = await fs.readFile(sessionFile, 'utf-8');
    return JSON.parse(data) as ChatMessage[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null; // File doesn't exist, new session
    }
    throw error; // Other errors should be thrown
  }
};

const saveSessionHistory = async (
  sessionId: string,
  graphRoot: string,
  history: ChatMessage[],
): Promise<void> => {
  const sessionFile = await getSessionPath(sessionId, graphRoot);
  await fs.writeFile(sessionFile, JSON.stringify(history, null, 2), 'utf-8');
};

let systemPromptMessage: ChatMessage | null = null;

const getSystemPrompt = async (): Promise<ChatMessage> => {
  // This function reads the system prompt from disk on its first call and caches it.
  // This is a form of lazy-loading and ensures the file is read only once.
  if (systemPromptMessage) {
    return systemPromptMessage;
  }

  try {
    // Resolve the path to 'docs/system-prompt.md' from the project root.
    const promptPath = path.resolve(process.cwd(), 'docs/system-prompt.md');

    // Read the file content asynchronously.
    const systemPromptContent = await fs.readFile(promptPath, 'utf-8');

    // Create the ChatMessage object and store it in `systemPromptMessage`.
    systemPromptMessage = {
      role: 'system',
      content: systemPromptContent.trim(),
    };

    logger.info('System prompt loaded successfully', { path: promptPath });
    return systemPromptMessage;
  } catch (error) {
    // If file read fails, log a critical error and exit, as the agent cannot run without it.
    const errorMessage = 'Failed to load system prompt file';
    logger.error(errorMessage, error as Error, {
      path: path.resolve(process.cwd(), 'docs/system-prompt.md'),
    });

    // Throw an error to be caught by the server's main function
    throw new Error(errorMessage, { cause: error });
  }
};

export const handleUserQuery = async (
  query: string,
  config: AppConfig,
  sessionId: string,
  runId: string,
  // Allow overriding the LLM query function (with its retry logic) for testing purposes
  queryLLM: ((
    history: ChatMessage[],
    config: AppConfig
  ) => Promise<string | unknown>) = defaultQueryLLM,
  streamContent: (content: { type: 'text'; text: string }) => Promise<void>,
  tenantId?: string
): Promise<string> => {
  // 1. **Initialization**
  logger.info('Starting user query handling', {
    runId,
    sessionId: sessionId,
    tenantId,
  });

  // Determine the graph root for this request (tenant-specific or global)
  let graphRoot: string;
  if (tenantId) {
    const sanitizedId = sanitizeTenantId(tenantId);
    graphRoot = path.join(config.knowledgeGraphPath, sanitizedId);
    // Ensure the tenant directory exists
    await fs.mkdir(graphRoot, { recursive: true });
  } else {
    graphRoot = config.knowledgeGraphPath;
  }

  // The MemAPI is now created per-request with a tenant-aware config.
  const memAPI = createMemAPI({ ...config, knowledgeGraphPath: graphRoot });

  // Initialize or retrieve session history
  const loadedHistory = await loadSessionHistory(sessionId, graphRoot);
  const history = loadedHistory || [await getSystemPrompt()];
  history.push({ role: 'user', content: query });

  const context: ExecutionContext = {
    history,
    memAPI,
    // Pass the potentially tenant-scoped config to the context
    config: { ...config, knowledgeGraphPath: graphRoot },
    runId,
    streamContent,
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

      // Stream the "thought" back to the client.
      await streamContent({ type: 'text', text: `> ${parsedResponse.think}\n\n` });
    }

    // **Act**
    if (parsedResponse.typescript) {
      logger.info('Executing TypeScript code', { runId });

      try {
        logger.info('Running code in sandbox', { runId });
        const executionResult = await runInSandbox(
          parsedResponse.typescript,
          context.memAPI,
          config.sandboxTimeout
        );
        logger.info('Code executed successfully', {
          runId,
          // Safely serialize result for logging
          result: JSON.stringify(executionResult, null, 2),
        });
        const feedback = `[Execution Result]: Code executed successfully. Result: ${JSON.stringify(executionResult)}`;
        context.history.push({ role: 'user', content: feedback });
      } catch (e) {
        logger.error('Code execution failed', e as Error, { runId });
        const feedback = `[Execution Error]: Your code failed to execute. Error: ${
          (e as Error).message
        }. You must analyze this error and correct your code in the next turn.`;
        context.history.push({ role: 'user', content: feedback });
      }
    }

    // Persist history at the end of the turn
    await saveSessionHistory(sessionId, graphRoot, context.history);

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
