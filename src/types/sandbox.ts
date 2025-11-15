export interface SandboxOptions {
  timeout?: number;
  memoryLimit?: number;
  allowedGlobals?: string[];
  forbiddenGlobals?: string[];
}

export interface SandboxExecutionContext {
  mem: import('./mem.js').MemAPI;
  console: Console;
}

export interface SandboxResult {
  success: boolean;
  result?: unknown;
  error?: string;
  output?: string;
  executionTime: number;
}

export type SandboxCode = string;

export interface ExecutionConstraints {
  maxExecutionTime: number;
  maxMemoryBytes: number;
  allowedModules: string[];
  forbiddenAPIs: string[];
}
