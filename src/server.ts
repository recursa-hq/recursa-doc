import { Elysia, t } from 'elysia';
// import { config } from './config';
// import { handleUserQuery } from './core/loop';
// import { logger } from './lib/logger';

// TODO: Create the main application instance using a HOF pattern for dependency injection.
// export const createApp = (
//   handleQuery: typeof handleUserQuery,
//   appConfig: typeof config
// ) => {
//   const app = new Elysia();

//   // --- Middleware ---
//   // TODO: Add a request logger middleware.
//   // - Should log method, path, and a request ID.

//   // --- Error Handling ---
//   // TODO: Implement a global error handler.
//   // - It should catch any unhandled errors, log them, and return a
//   //   standardized JSON error response (e.g., { error: 'Internal Server Error' }).
//   // - Distinguish between expected errors (e.g., validation) and unexpected ones.

//   // --- Routes ---
//   // TODO: Define a health check endpoint.
//   app.get('/', () => ({ status: 'ok', message: 'Recursa server is running' }));

//   // TODO: Define the main MCP endpoint.
//   app.post(
//     '/mcp',
//     async ({ body }) => {
//       const { query, sessionId } = body;
//       // Note: This should ideally stream back <think> messages.
//       // For a simple non-streaming implementation, we just await the final result.
//       const finalReply = await handleQuery(query, appConfig, sessionId);
//       return { reply: finalReply };
//     },
//     {
//       // TODO: Add request body validation using Elysia's `t`.
//       body: t.Object({
//         query: t.String({ minLength: 1 }),
//         sessionId: t.Optional(t.String()),
//       }),
//     }
//   );

//   return app;
// };

// TODO: In the main execution block, start the server and handle graceful shutdown.
// const app = createApp(handleUserQuery, config);
// app.listen(config.port, () => {
//   logger.info(`🧠 Recursa server listening on http://localhost:${config.port}`);
// });

// // TODO: Implement graceful shutdown on SIGINT and SIGTERM.
// process.on('SIGINT', () => {
//   logger.info('SIGINT received. Shutting down gracefully.');
//   app.stop();
//   process.exit(0);
// });