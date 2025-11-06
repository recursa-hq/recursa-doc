import { createMemAPI } from './core/MemAPI.js';
import { createMCPHandler } from './api/mcp.handler.js';
import { initGitRepo, configureGitUser, isGitRepo } from './services/Git.js';
import {
  createLLMClient,
  validateLLMConfig,
  createSystemPrompt,
} from './services/Llm.js';
import type { RecursaConfig, EnvironmentVariables } from './types/index.js';
import { Elysia, t } from 'elysia';
import { handleUserQuery } from './core/loop.js';
import { logger } from './lib/logger.js';
import { randomUUID } from 'crypto';
import { config as appConfig } from './config.js';

const loadEnvironmentVariables = (): EnvironmentVariables => {
  const vars: EnvironmentVariables = {
    KNOWLEDGE_GRAPH_PATH:
      process.env.KNOWLEDGE_GRAPH_PATH || './knowledge-graph',
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
    OPENROUTER_MODEL:
      process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
    LLM_TEMPERATURE: process.env.LLM_TEMPERATURE || '0.7',
    LLM_MAX_TOKENS: process.env.LLM_MAX_TOKENS || '4096',
    SANDBOX_TIMEOUT: process.env.SANDBOX_TIMEOUT || '30000',
    SANDBOX_MEMORY_LIMIT: process.env.SANDBOX_MEMORY_LIMIT || '100',
    GIT_USER_NAME: process.env.GIT_USER_NAME || 'Recursa Agent',
    GIT_USER_EMAIL: process.env.GIT_USER_EMAIL || 'recursa@local',
  };

  return vars;
};

const createConfig = (vars: EnvironmentVariables): RecursaConfig => {
  return {
    knowledgeGraphPath: vars.KNOWLEDGE_GRAPH_PATH,
    llm: {
      apiKey: vars.OPENROUTER_API_KEY,
      model: vars.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
      maxTokens: parseInt(vars.LLM_MAX_TOKENS, 10),
      temperature: parseFloat(vars.LLM_TEMPERATURE),
    },
    sandbox: {
      timeout: parseInt(vars.SANDBOX_TIMEOUT, 10),
      memoryLimit: parseInt(vars.SANDBOX_MEMORY_LIMIT, 10),
    },
    git: {
      userName: vars.GIT_USER_NAME || 'Recursa Agent',
      userEmail: vars.GIT_USER_EMAIL || 'recursa@local',
    },
  };
};

const initializeKnowledgeGraph = async (
  config: RecursaConfig
): Promise<void> => {
  const { knowledgeGraphPath } = config;

  if (!isGitRepo(knowledgeGraphPath)) {
    initGitRepo(knowledgeGraphPath);
  }

  configureGitUser(config.git.userName, config.git.userEmail);
};

const validateConfiguration = (config: RecursaConfig): void => {
  if (!config.knowledgeGraphPath) {
    throw new Error('Knowledge graph path is required');
  }

  if (!config.llm.apiKey) {
    throw new Error('OpenRouter API key is required');
  }

  validateLLMConfig(config.llm);
};

const startServer = async (): Promise<void> => {
  try {
    // eslint-disable-next-line no-console
    console.log('Starting Recursa MCP Server...');

    const envVars = loadEnvironmentVariables();
    const config = createConfig(envVars);

    validateConfiguration(config);

    await initializeKnowledgeGraph(config);

    const memApi = createMemAPI(config.knowledgeGraphPath);

    const { server, transport } = createMCPHandler(
      memApi,
      config.knowledgeGraphPath
    );

    const _llmClient = createLLMClient(config.llm);
    const _systemPrompt = createSystemPrompt(config.knowledgeGraphPath);

    // eslint-disable-next-line no-console
    console.log(`Knowledge Graph Path: ${config.knowledgeGraphPath}`);
    // eslint-disable-next-line no-console
    console.log(`LLM Model: ${config.llm.model}`);
    // eslint-disable-next-line no-console
    console.log(`Sandbox Timeout: ${config.sandbox.timeout}ms`);
    // eslint-disable-next-line no-console
    console.log('Server ready. Connected to stdin/stdout.');

    await server.connect(transport);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

export const createApp = (
  handleQuery: typeof handleUserQuery,
  config: typeof appConfig
) => {
  const app = new Elysia()
    // --- Middleware: Request Logging ---
    .onRequest(({ request }) => {
      request.headers.set('X-Request-ID', randomUUID());
    })
    .onBeforeHandle(({ request, store }) => {
      store.startTime = Date.now();
      logger.info('Request received', {
        reqId: request.headers.get('X-Request-ID'),
        method: request.method,
        path: new URL(request.url).pathname,
      });
    })
    .onAfterHandle(({ request, store }) => {
      const duration = Date.now() - (store.startTime as number);
      logger.info('Request completed', {
        reqId: request.headers.get('X-Request-ID'),
        method: request.method,
        path: new URL(request.url).pathname,
        duration: `${duration}ms`,
      });
    })
    // --- Error Handling ---
    .onError(({ code, error, set, request }) => {
      logger.error('An error occurred', error, {
        reqId: request.headers.get('X-Request-ID'),
        code,
      });
      set.status = 500;
      return { error: 'Internal Server Error' };
    })
    // --- Routes ---
    .get('/', () => ({ status: 'ok', message: 'Recursa server is running' }))
    .post(
      '/mcp',
      async ({ body }) => {
        const { query, sessionId } = body;
        // NOTE: For a simple non-streaming implementation, we await the final result.
        // A production implementation should use WebSockets or SSE to stream back messages.
        const finalReply = await handleQuery(query, config, sessionId);
        return { reply: finalReply };
      },
      {
        body: t.Object({
          query: t.String({ minLength: 1 }),
          sessionId: t.Optional(t.String()),
        }),
      }
    );

  return app;
};

export const createMCPApp = async () => {
  const envVars = loadEnvironmentVariables();
  const config = createConfig(envVars);

  validateConfiguration(config);
  await initializeKnowledgeGraph(config);

  const memApi = createMemAPI(config.knowledgeGraphPath);
  const { server, transport } = createMCPHandler(
    memApi,
    config.knowledgeGraphPath
  );

  return { server, transport, config, memApi };
};

export { startServer };
startServer();
