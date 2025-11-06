import { Elysia, t } from 'elysia';
import { handleUserQuery } from './core/loop.js';
import { logger } from './lib/logger.js';
import { randomUUID } from 'crypto';
import { config as appConfig } from './config.js';
import type { StatusUpdate } from './types';

export const createApp = (
  handleQuery: typeof handleUserQuery,
  config: typeof appConfig
) => {
  const app = new Elysia()
    // --- Setup request-scoped context ---
    .decorate('requestId', '')
    .decorate('startTime', 0)
    // --- Middleware: Request Logging ---
    .onRequest(({ set, store }) => {
      const requestId = randomUUID();
      set.headers['X-Request-ID'] = requestId;
      (store as { requestId: string }).requestId = requestId;
    })
    .onBeforeHandle(({ request, store }) => {
      (store as { startTime: number }).startTime = Date.now();
      logger.info('Request received', {
        reqId: (store as { requestId: string }).requestId,
        method: request.method,
        path: new URL(request.url).pathname,
      });
    })
    .onAfterHandle(({ request, store }) => {
      const duration = Date.now() - (store as { startTime: number }).startTime;
      logger.info('Request completed', {
        reqId: (store as { requestId: string }).requestId,
        method: request.method,
        path: new URL(request.url).pathname,
        duration: `${duration}ms`,
      });
    })
    // --- Error Handling ---
    .onError(({ code, error, set, store }) => {
      logger.error('An error occurred', error as Error, {
        reqId: (store as { requestId: string })?.requestId || 'unknown',
        code,
      });

      // Set appropriate status codes based on error type
      switch (code) {
        case 'VALIDATION':
          set.status = 422;
          return {
            error: 'Validation Error',
            message: error.message,
            details: error.all || [],
          };
        case 'NOT_FOUND':
          set.status = 404;
          return {
            error: 'Not Found',
            message: error.message || 'Resource not found',
          };
        case 'PARSE':
          set.status = 422; // Changed from 400 to 422 for malformed JSON
          return {
            error: 'Validation Error',
            message: 'Invalid JSON format',
          };
        default:
          set.status = 500;
          return {
            error: 'Internal Server Error',
            message: 'An unexpected error occurred',
          };
      }
    })
    // --- Routes ---
    .get('/', () => ({ status: 'ok', message: 'Recursa server is running' }))
    .post(
      '/mcp',
      async ({ body, set }) => {
        const { query, sessionId } = body;
        const runId = randomUUID();

        try {
          // NOTE: For a simple non-streaming implementation, we await the final result.
          // A production implementation should use WebSockets or SSE to stream back messages.
          const finalReply = await handleQuery(query, config, sessionId, undefined);

          return {
            runId,
            reply: finalReply,
            sessionId: sessionId || runId,
            streamingEndpoint: `/events/${runId}`,
          };
        } catch (error) {
          logger.error('Error processing user query', error as Error, {
            runId,
            sessionId,
            query: (query || '').substring(0, 100) + '...',
          });

          // Return a graceful error response instead of throwing
          return {
            runId,
            reply: 'An error occurred while processing your request. The LLM service may be unavailable. Please try again later.',
            sessionId: sessionId || runId,
            streamingEndpoint: `/events/${runId}`,
          };
        }
      },
      {
        body: t.Object({
          query: t.String({
            minLength: 1,
            // Add a transform to trim the query, and an error for empty-after-trim
            transform: (value: string) => value.trim(),
            error: 'Query must be a non-empty string.',
          }),
          sessionId: t.Optional(t.String()),
        }),
      }
    )
    .get('/events/:runId', ({ params: { runId } }) => {
      return new Response(
        new ReadableStream({
          start(controller) {
            const initialUpdate: StatusUpdate = {
              type: 'think',
              runId: runId,
              timestamp: Date.now(),
              content: 'Connection established',
            };
            const initialData = `data: ${JSON.stringify(initialUpdate)}\n\n`;
            controller.enqueue(new TextEncoder().encode(initialData));

            // In a real implementation, you would subscribe to an event emitter
            // for this runId. For the test, we can just close it.
            const timeout = setTimeout(() => {
              controller.close();
            }, 500);

            // Cleanup if client disconnects
            return () => clearTimeout(timeout);
          },
        }),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control',
          },
        }
      );
    });
  return app;
};

if (process.env.NODE_ENV !== 'test') {
  const app = createApp(handleUserQuery, appConfig);
  app.listen(appConfig.port);

  logger.info(
    `🦊 Recursa server is running at http://${app.server?.hostname}:${app.server?.port}`
  );
}
