// TODO: Implement a simple, structured logger.
// - It could use a library like `pino` or just `console` with formatting.
// - It should support different log levels (info, warn, error, debug).
// - Log entries should ideally be JSON for easier parsing by log collectors.
// - It should be a singleton or a set of HOFs to ensure consistent logging across the app.

// Example interface:
type Logger = {
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, error?: Error, context?: Record<string, unknown>) => void;
  debug: (message: string, context?: Record<string, unknown>) => void;
};

// export const createLogger = (): Logger => ({ ... });
// export const logger = createLogger();