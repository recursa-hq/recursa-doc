<<<<<<< HEAD
import { Elysia, t } from 'elysia';
import { config } from './config';
import { handleUserQuery } from './core/loop';
import { logger } from './lib/logger';
import { randomUUID } from 'crypto';
import type { StatusUpdate } from './types';

// Define store interface for timing
interface RequestStore {
  startTime?: number;
}

// Store active SSE connections by run ID
const sseConnections = new Map<string, Set<(data: string) => void>>();

// Helper function to broadcast status updates to connected clients
const broadcastStatusUpdate = (update: StatusUpdate) => {
  const connections = sseConnections.get(update.runId);
  if (connections) {
    const data = `data: ${JSON.stringify(update)}\n\n`;
    connections.forEach((send) => send(data));
  }
};

// Helper function to register a new SSE connection
const registerSSEConnection = (
  runId: string,
  sendFn: (data: string) => void
) => {
  if (!sseConnections.has(runId)) {
    sseConnections.set(runId, new Set());
  }
  sseConnections.get(runId)!.add(sendFn);

  // Send initial connection message
  const initialMessage: StatusUpdate = {
    type: 'think',
    runId,
    timestamp: Date.now(),
    content: 'Connection established',
  };
  sendFn(`data: ${JSON.stringify(initialMessage)}\n\n`);
};

// Helper function to unregister SSE connection
const unregisterSSEConnection = (
  runId: string,
  sendFn: (data: string) => void
) => {
  const connections = sseConnections.get(runId);
  if (connections) {
    connections.delete(sendFn);
    if (connections.size === 0) {
      sseConnections.delete(runId);
    }
  }
};

export const createApp = (
  handleQuery: typeof handleUserQuery,
  appConfig: typeof config
) => {
  const app = new Elysia()
    // --- Middleware: Request Logging ---
    .onRequest(({ request }) => {
      request.headers.set('X-Request-ID', randomUUID());
    })
    .onBeforeHandle(({ request, store }) => {
      (store as RequestStore).startTime = Date.now();
      logger.info('Request received', {
        reqId: request.headers.get('X-Request-ID'),
        method: request.method,
        path: new URL(request.url).pathname,
      });
    })
    .onAfterHandle(({ request, store }) => {
      const duration = Date.now() - ((store as RequestStore).startTime || 0);
      logger.info('Request completed', {
        reqId: request.headers.get('X-Request-ID'),
        method: request.method,
        path: new URL(request.url).pathname,
        duration: `${duration}ms`,
      });
    })
    // --- Error Handling ---
    .onError(({ code, error, set, request }) => {
      logger.error('An error occurred', error as Error, {
        reqId: request.headers.get('X-Request-ID'),
        code,
      });
      set.status = 500;
      return { error: 'Internal Server Error' };
    })
    // --- Routes ---
    .get('/', () => ({ status: 'ok', message: 'Recursa server is running' }))
    // SSE endpoint for real-time status updates
    .get('/events/:runId', async ({ params, set }) => {
      const { runId } = params;

      // Set SSE headers
      set.headers = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      };

      // Create a streaming response
      const stream = new ReadableStream({
        start(controller) {
          const sendFn = (data: string) => {
            try {
              controller.enqueue(new TextEncoder().encode(data));
            } catch (error) {
              logger.error('Failed to send SSE data', error as Error, {
                runId,
              });
            }
          };

          // Register the connection
          registerSSEConnection(runId, sendFn);

          // Handle connection close
          return () => {
            unregisterSSEConnection(runId, sendFn);
            controller.close();
          };
        },
        cancel() {
          unregisterSSEConnection(runId, () => {});
        },
      });

      return new Response(stream);
    })
    .post(
      '/mcp',
      async ({ body }) => {
        const { query, sessionId } = body;
        const runId = randomUUID();

        logger.info('Starting MCP request', {
          runId,
          sessionId,
          queryLength: query.length,
        });

        // Create a promise that will resolve with the final response
        let finalReply: string;
        let hasError = false;

        try {
          // Set up the status update callback to broadcast via SSE
          const onStatusUpdate = (update: StatusUpdate) => {
            logger.debug('Broadcasting status update', {
              runId,
              type: update.type,
            });
            broadcastStatusUpdate(update);
          };

          // Execute the query with streaming support
          finalReply = await handleQuery(
            query,
            appConfig,
            sessionId,
            undefined,
            onStatusUpdate
          );
        } catch (error) {
          hasError = true;
          logger.error('Error handling MCP request', error as Error, { runId });

          // Broadcast error via SSE
          const errorUpdate: StatusUpdate = {
            type: 'error',
            runId,
            timestamp: Date.now(),
            content:
              error instanceof Error ? error.message : 'Unknown error occurred',
          };
          broadcastStatusUpdate(errorUpdate);

          finalReply = 'An error occurred while processing your request.';
        }

        // Send completion status
        const completionUpdate: StatusUpdate = {
          type: 'complete',
          runId,
          timestamp: Date.now(),
          content: hasError
            ? 'Request completed with errors'
            : 'Request completed successfully',
          data: { reply: finalReply, hasError },
        };
        broadcastStatusUpdate(completionUpdate);

        return {
          runId,
          reply: finalReply,
          streamingEndpoint: `/events/${runId}`,
        };
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

// --- Main Execution Block ---
if (import.meta.main) {
  const app = createApp(handleUserQuery, config);

  app.listen(config.port, () => {
    logger.info(
      `🧠 Recursa server listening on http://localhost:${config.port}`
    );
  });

  // --- Graceful Shutdown ---
  process.on('SIGINT', () => {
    logger.info('SIGINT received. Shutting down gracefully.');
    app.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully.');
    app.stop();
    process.exit(0);
  });
}
=======
import { createMemAPI } from './core/MemAPI.js';
import { createMCPHandler } from './api/mcp.handler.js';
import { initGitRepo, configureGitUser, isGitRepo } from './services/Git.js';
import { createLLMClient, validateLLMConfig, createSystemPrompt } from './services/Llm.js';
import type { RecursaConfig, EnvironmentVariables } from './types/index.js';

const loadEnvironmentVariables = (): EnvironmentVariables => {
  const vars: EnvironmentVariables = {
    KNOWLEDGE_GRAPH_PATH: process.env.KNOWLEDGE_GRAPH_PATH || './knowledge-graph',
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
    LLM_TEMPERATURE: process.env.LLM_TEMPERATURE || '0.7',
    LLM_MAX_TOKENS: process.env.LLM_MAX_TOKENS || '4096',
    SANDBOX_TIMEOUT: process.env.SANDBOX_TIMEOUT || '30000',
    SANDBOX_MEMORY_LIMIT: process.env.SANDBOX_MEMORY_LIMIT || '100',
    GIT_USER_NAME: process.env.GIT_USER_NAME || 'Recursa Agent',
    GIT_USER_EMAIL: process.env.GIT_USER_EMAIL || 'recursa@local'
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
      temperature: parseFloat(vars.LLM_TEMPERATURE)
    },
    sandbox: {
      timeout: parseInt(vars.SANDBOX_TIMEOUT, 10),
      memoryLimit: parseInt(vars.SANDBOX_MEMORY_LIMIT, 10)
    },
    git: {
      userName: vars.GIT_USER_NAME || 'Recursa Agent',
      userEmail: vars.GIT_USER_EMAIL || 'recursa@local'
    }
  };
};

const initializeKnowledgeGraph = async (config: RecursaConfig): Promise<void> => {
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

    const llmClient = createLLMClient(config.llm);

    const systemPrompt = createSystemPrompt(config.knowledgeGraphPath);

    console.log(`Knowledge Graph Path: ${config.knowledgeGraphPath}`);
    console.log(`LLM Model: ${config.llm.model}`);
    console.log(`Sandbox Timeout: ${config.sandbox.timeout}ms`);
    console.log('Server ready. Connected to stdin/stdout.');

    await server.connect(transport);
    await server.run();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
>>>>>>> origin/job-93cf7fdc
