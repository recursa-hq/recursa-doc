import { Elysia, t } from 'elysia';
import { config } from './config';
import { handleUserQuery } from './core/loop';
import { logger } from './lib/logger';
import { randomUUID } from 'crypto';

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
        // A production implementation should use WebSockets or SSE to stream back <think> messages.
        const finalReply = await handleQuery(query, appConfig, sessionId);
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

// --- Main Execution Block ---
if (import.meta.main) {
  const app = createApp(handleUserQuery, config);

  app.listen(config.port, () => {
    logger.info(`🧠 Recursa server listening on http://localhost:${config.port}`);
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