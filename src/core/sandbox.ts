import { createContext, runInContext } from 'node:vm';
import type { MemAPI } from '../types/mem';
import { logger } from '../lib/logger.js';

/**
 * Executes LLM-generated TypeScript code in a secure, isolated sandbox.
 * @param code The TypeScript code snippet to execute.
 * @param memApi The MemAPI instance to expose to the sandboxed code.
 * @returns The result of the code execution.
 */
export const runInSandbox = async (
  code: string,
  memApi: MemAPI,
  timeout = 10000
): Promise<unknown> => {
  // Create a sandboxed context with the mem API and only essential globals
  const context = createContext({
    mem: memApi,
    // Essential JavaScript globals
    console: {
      log: (...args: unknown[]) =>
        logger.info('Sandbox console.log', { arguments: args }),
      error: (...args: unknown[]) =>
        logger.error('Sandbox console.error', undefined, {
          arguments: args,
        }),
      warn: (...args: unknown[]) =>
        logger.warn('Sandbox console.warn', { arguments: args }),
    },
    // Promise and async support
    Promise,
    setTimeout: (fn: () => void, delay: number) => {
      if (delay > 1000) {
        throw new Error('Timeout too long');
      }
      return setTimeout(fn, Math.min(delay, 10000));
    },
    clearTimeout,
    // Basic types and constructors
    Array,
    Object,
    String,
    Number,
    Boolean,
    Date,
    Math,
    JSON,
    RegExp,
    Error,
  });

  // Wrap the user code in an async IIFE to allow top-level await.
  // Ensure the code is properly formatted and doesn't have syntax errors
  const wrappedCode = `(async () => {
${code}
  })();`;

  try {
    logger.debug('Executing code in sandbox', { code, timeout });
    const result = await runInContext(wrappedCode, context, {
      timeout, // Use provided timeout
      displayErrors: true,
    });
    logger.debug('Sandbox execution successful', {
      result,
      type: typeof result,
    });
    return result;
  } catch (error) {
    const errorMessage = (error as Error).message;
    logger.error('Error executing sandboxed code', error as Error, { 
      code,
      wrappedCode: wrappedCode.substring(0, 800) + '...' // Log first 800 chars for debugging
    });
    
    // Provide more specific error messages for common issues
    if (errorMessage.includes('Invalid or unexpected token')) {
      throw new Error(`Sandbox execution failed: Syntax error in code. This usually indicates unescaped quotes or malformed JavaScript. Original error: ${errorMessage}`);
    } else if (errorMessage.includes('timeout')) {
      throw new Error(`Sandbox execution failed: Code execution timed out after ${timeout}ms`);
    } else {
      throw new Error(`Sandbox execution failed: ${errorMessage}`);
    }
  }
};
