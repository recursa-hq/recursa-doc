import { createMemAPI } from './core/MemAPI.js';
import { createMCPHandler } from './api/mcp.handler.js';
import { initGitRepo, configureGitUser, isGitRepo } from './services/Git.js';
import { createLLMClient, validateLLMConfig, createSystemPrompt } from './services/Llm.js';
import type { RecursaConfig, EnvironmentVariables } from './types/index.js';

const loadEnvironmentVariables = (): EnvironmentVariables => {
  const vars: EnvironmentVariables = {
    KNOWLEDGE_GRAPH_PATH: process.env.KNOWLEDGE_GRAPH_PATH || './knowledge-graph',
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
    LLM_TEMPERATURE: process.env.LLM_TEMPERATURE || '0.7',
    LLM_MAX_TOKENS: process.env.LLM_MAX_TOKENS || '4096',
    SANDBOX_TIMEOUT: process.env.SANDBOX_TIMEOUT || '30000',
    SANDBOX_MEMORY_LIMIT: process.env.SANDBOX_MEMORY_LIMIT || '100',
    GIT_USER_NAME: process.env.GIT_USER_NAME || 'Recursa Agent',
    GIT_USER_EMAIL: process.env.GIT_USER_EMAIL || 'recursa@local'
  };

  return vars;
};

const createConfig = (vars: EnvironmentVariables): RecursaConfig => {
  return {
    knowledgeGraphPath: vars.KNOWLEDGE_GRAPH_PATH,
    llm: {
      apiKey: vars.OPENROUTER_API_KEY,
      model: vars.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
      maxTokens: parseInt(vars.LLM_MAX_TOKENS, 10),
      temperature: parseFloat(vars.LLM_TEMPERATURE)
    },
    sandbox: {
      timeout: parseInt(vars.SANDBOX_TIMEOUT, 10),
      memoryLimit: parseInt(vars.SANDBOX_MEMORY_LIMIT, 10)
    },
    git: {
      userName: vars.GIT_USER_NAME || 'Recursa Agent',
      userEmail: vars.GIT_USER_EMAIL || 'recursa@local'
    }
  };
};

const initializeKnowledgeGraph = async (config: RecursaConfig): Promise<void> => {
  const { knowledgeGraphPath } = config;

  if (!isGitRepo(knowledgeGraphPath)) {
    initGitRepo(knowledgeGraphPath);
  }

  configureGitUser(config.git.userName, config.git.userEmail);
};

const validateConfiguration = (config: RecursaConfig): void => {
  if (!config.knowledgeGraphPath) {
    throw new Error('Knowledge graph path is required');
  }

  if (!config.llm.apiKey) {
    throw new Error('OpenRouter API key is required');
  }

  validateLLMConfig(config.llm);
};

const startServer = async (): Promise<void> => {
  try {
    console.log('Starting Recursa MCP Server...');

    const envVars = loadEnvironmentVariables();
    const config = createConfig(envVars);

    validateConfiguration(config);

    await initializeKnowledgeGraph(config);

    const memApi = createMemAPI(config.knowledgeGraphPath);

    const { server, transport } = createMCPHandler(
      memApi,
      config.knowledgeGraphPath
    );

    const llmClient = createLLMClient(config.llm);

    const systemPrompt = createSystemPrompt(config.knowledgeGraphPath);

    console.log(`Knowledge Graph Path: ${config.knowledgeGraphPath}`);
    console.log(`LLM Model: ${config.llm.model}`);
    console.log(`Sandbox Timeout: ${config.sandbox.timeout}ms`);
    console.log('Server ready. Connected to stdin/stdout.');

    await server.connect(transport);
    await server.run();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
