import { createContext, runInContext } from 'node:vm';
import type { MemAPI } from '../types/mem';
import { logger } from '../lib/logger';

/**
 * Preprocesses code to fix common syntax issues from LLM output.
 * This handles malformed strings, mismatched quotes, and other common issues.
 * @param code The raw TypeScript code from the LLM
 * @returns The preprocessed, syntactically valid code
 */
const preprocessCode = (code: string): string => {
  let processedCode = code;

  // Step 1: Fix mixed quote types (most critical issue)
  // Look for patterns where string starts with one quote type and ends with another
  // This handles cases like: 'string` or `string' or "string`
  const mixedQuotePattern = /(['"`])([^'"`\\]*?)(['"`])(?=\s|[;,.)\]}]|$)/g;
  processedCode = processedCode.replace(mixedQuotePattern, (match, startQuote, content, endQuote) => {
    if (startQuote !== endQuote) {
      // If quotes don't match, convert to backticks and escape content
      const escapedContent = content.replace(/`/g, '\\`');
      return `\`${escapedContent}\``;
    }
    return match;
  });

  // Step 2: Skip the simple malformed patterns as they conflict with other steps
  // The mixed quote pattern in Step 1 should handle these cases more carefully

  // Step 3: Fix multiline strings in single/double quotes (convert to template literals)
  const multilineStringPattern = /(['"])([^'"\\\n]*\n[^'"\\]*?)\1/g;
  processedCode = processedCode.replace(multilineStringPattern, (match, quote, content) => {
    const escapedContent = content.replace(/`/g, '\\`');
    return `\`${escapedContent}\``;
  });

  // Step 4: Fix unterminated strings - look for opening quotes without closing quotes
  // This is critical for the EOF errors we're seeing
  const unterminatedPatterns = [
    // Pattern: 'string without closing quote, followed by end of line or comma/semicolon
    { regex: /'([^'\n]*?)(?=\n|,|;|$)/g, replacement: (match: string, content: string) => `\`${content}\`` },
    // Pattern: `string without closing quote, followed by end of line or comma/semicolon  
    { regex: /`([^`\n]*?)(?=\n|,|;|$)/g, replacement: (match: string, content: string) => `\`${content}\`` },
    // Pattern: "string without closing quote, followed by end of line or comma/semicolon
    { regex: /"([^"\n]*?)(?=\n|,|;|$)/g, replacement: (match: string, content: string) => `\`${content}\`` },
  ];

  unterminatedPatterns.forEach(({ regex, replacement }) => {
    processedCode = processedCode.replace(regex, replacement);
  });

  // Step 5: Skip the aggressive replacements that are causing issues
  // The previous steps should handle most cases correctly

  return processedCode;
};

/**
 * Executes LLM-generated TypeScript code in a secure, isolated sandbox.
 * @param code The TypeScript code snippet to execute.
 * @param memApi The MemAPI instance to expose to the sandboxed code.
 * @returns The result of the code execution.
 */
export const runInSandbox = async (
  code: string,
  memApi: MemAPI
): Promise<unknown> => {
  // Simple preprocessing to fix only the most critical syntax errors
  // that prevent the code from running at all
  let preprocessedCode = code;
  
  // Fix multiline strings in single quotes - these cause EOF errors
  // Pattern: 'content\ncontent' -> `content\ncontent`
  const multilineStringPattern = /'([^']*\n[^']*)'/g;
  preprocessedCode = preprocessedCode.replace(multilineStringPattern, (match, content) => {
    // Escape any backticks in the content
    const escapedContent = content.replace(/`/g, '\\`');
    return `\`${escapedContent}\``;
  });
  
  // Fix the most common issue: mixed quotes in string literals
  // Pattern: 'content` or `content' -> `content`
  const mixedQuotePatterns = [
    // Single quote followed by backtick (more aggressive)
    {
      regex: /'([^'\n]+)`/g,
      replacement: (match: string, content: string) => {
        // Fix if it doesn't contain quotes
        if (content && !content.includes("'") && !content.includes("`")) {
          return `\`${content}\``;
        }
        return match;
      }
    },
    // Backtick followed by single quote (more aggressive)
    {
      regex: /`([^`\n]+)'/g,
      replacement: (match: string, content: string) => {
        if (content && !content.includes("'") && !content.includes("`")) {
          return `\`${content}\``;
        }
        return match;
      }
    },
    // Pattern: `content', (backtick, content, single quote, comma)
    {
      regex: /`([^`\n]+)',/g,
      replacement: (match: string, content: string) => {
        if (content && !content.includes("'") && !content.includes("`")) {
          return `\`${content}\`,`;
        }
        return match;
      }
    },
  ];
  
  mixedQuotePatterns.forEach(({ regex, replacement }) => {
    preprocessedCode = preprocessedCode.replace(regex, replacement);
  });

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
  const wrappedCode = `(async () => {
    ${preprocessedCode}
  })();`;

  try {
    logger.debug('Executing code in sandbox', { code: preprocessedCode });
    const result = await runInContext(wrappedCode, context, {
      timeout: 10000, // 10 seconds
      displayErrors: true,
    });
    logger.debug('Sandbox execution successful', { result, type: typeof result });
    return result;
  } catch (error) {
    logger.error('Error executing sandboxed code', error as Error, {
      code: preprocessedCode,
    });
    // Re-throw a sanitized error to the agent loop
    throw new Error(`Sandbox execution failed: ${(error as Error).message}`);
  }
};
