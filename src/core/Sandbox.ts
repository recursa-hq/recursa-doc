import { VM } from 'vm2';
import type {
  SandboxOptions,
  SandboxResult,
  SandboxCode,
} from '../types/sandbox.js';
import type { MemAPI } from '../types/mem.js';

export const createSandbox = (memApi: MemAPI, options?: SandboxOptions) => {
  const timeout = options?.timeout || 30000;
  const _allowedGlobals = options?.allowedGlobals || [
    'console',
    'JSON',
    'Math',
    'Date',
  ];
  const _forbiddenGlobals = options?.forbiddenGlobals || [
    'require',
    'import',
    'eval',
    'Function',
    'process',
    'Buffer',
    'global',
    'globalThis',
    'window',
    'document',
  ];

  const createExecutionContext = (): Record<string, unknown> => ({
    mem: memApi,
    console: {
      log: (...args: unknown[]) => {
        // eslint-disable-next-line no-console
        console.log('[Sandbox]', ...args);
      },
      error: (...args: unknown[]) => {
        // eslint-disable-next-line no-console
        console.error('[Sandbox Error]', ...args);
      },
      warn: (...args: unknown[]) => {
        // eslint-disable-next-line no-console
        console.warn('[Sandbox Warn]', ...args);
      },
    },
    JSON,
    Math,
    Date,
    Promise,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Map,
    Set,
    URL,
    URLSearchParams,
  });

  const validateCode = (code: SandboxCode): void => {
    if (typeof code !== 'string') {
      throw new Error('Code must be a string');
    }

    if (code.length === 0) {
      throw new Error('Code cannot be empty');
    }

    if (code.length > 100000) {
      throw new Error('Code exceeds maximum length');
    }

    const forbiddenPatterns = [
      /require\s*\(/,
      /import\s+/,
      /eval\s*\(/,
      /Function\s*\(/,
      /process\./,
      /child_process/,
      /fs\.read/,
      /fs\.write/,
      /fs\.exec/,
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(code)) {
        throw new Error(`Code contains forbidden pattern: ${pattern}`);
      }
    }
  };

  const executeCode = async (code: SandboxCode): Promise<SandboxResult> => {
    const startTime = Date.now();
    validateCode(code);

    const vm = new VM({
      timeout,
      sandbox: createExecutionContext(),
      eval: false,
      wasm: false,
    });

    try {
      const wrappedCode = `
        (async () => {
          ${code}
        })()
      `;

      const result = vm.run(wrappedCode);
      const executionTime = Date.now() - startTime;

      if (result instanceof Promise) {
        const resolved = await result;
        return {
          success: true,
          result: resolved,
          executionTime,
        };
      }

      return {
        success: true,
        result,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      };
    }
  };

  const executeCodeSync = (code: SandboxCode): SandboxResult => {
    const startTime = Date.now();
    validateCode(code);

    const vm = new VM({
      timeout,
      sandbox: createExecutionContext(),
      eval: false,
      wasm: false,
    });

    try {
      const result = vm.run(code);
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      };
    }
  };

  return {
    execute: executeCode,
    executeSync: executeCodeSync,
  };
};

export const runInSandbox = async (
  code: string,
  memApi: MemAPI
): Promise<unknown> => {
  const sandbox = createSandbox(memApi);
  return sandbox.execute(code);
};

export const sanitizeCode = (
  code: SandboxCode,
  options?: SandboxOptions
): SandboxCode => {
  let sanitized = code;
  const forbiddenGlobals = options?.forbiddenGlobals || [
    'require',
    'import',
    'eval',
    'Function',
    'process',
    'Buffer',
    'global',
    'globalThis',
    'window',
    'document',
  ];

  forbiddenGlobals.forEach((global: string) => {
    const pattern = new RegExp(`\\b${global}\\b`, 'g');
    sanitized = sanitized.replace(pattern, '[FORBIDDEN]');
  });

  return sanitized;
};

export const estimateExecutionTime = (code: SandboxCode): number => {
  const lines = code.split('\n').length;
  const complexity = code.length / 100;
  return Math.min(lines * 10 + complexity, 30000);
};
