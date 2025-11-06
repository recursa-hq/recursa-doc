import { VM, type VMOptions } from 'vm2';
import type { MemAPI } from '../types';
import { logger } from '../lib/logger';

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
  const vm = new VM({
    timeout: 10000, // 10 seconds
    sandbox: {
      mem: memApi,
    },
    eval: false,
    wasm: false,
    fixAsync: true,
    // Deny access to all node builtins by default.
    require: {
      builtin: [],
    },
  } as VMOptions);

  // Wrap the user code in an async IIFE to allow top-level await.
  const wrappedCode = `(async () => { ${code} })();`;

  try {
    logger.debug('Executing code in sandbox', { code: wrappedCode });
    const result = await vm.run(wrappedCode);
    logger.debug('Sandbox execution successful', { result });
    return result;
  } catch (error) {
    logger.error('Error executing sandboxed code', error as Error, {
      code,
    });
    // Re-throw a sanitized error to the agent loop
    throw new Error(`Sandbox execution failed: ${(error as Error).message}`);
  }
};
