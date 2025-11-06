export * from './mem.js';
export * from './git.js';
export * from './sandbox.js';
export * from './mcp.js';
export * from './llm.js';
export * from './loop.js';

export interface RecursaConfig {
  knowledgeGraphPath: string;
  llm: {
    apiKey: string;
    baseUrl?: string;
    model: string;
    maxTokens?: number;
    temperature?: number;
  };
  sandbox: {
    timeout: number;
    memoryLimit: number;
  };
  git: {
    userName: string;
    userEmail: string;
  };
}

export interface EnvironmentVariables {
  KNOWLEDGE_GRAPH_PATH: string;
  OPENROUTER_API_KEY: string;
  OPENROUTER_MODEL?: string;
  LLM_TEMPERATURE?: string;
  LLM_MAX_TOKENS?: string;
  SANDBOX_TIMEOUT?: string;
  SANDBOX_MEMORY_LIMIT?: string;
  GIT_USER_NAME?: string;
  GIT_USER_EMAIL?: string;
}
