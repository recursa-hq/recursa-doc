import 'dotenv/config';
import { z } from 'zod';
import path from 'path';
import { promises as fs } from 'fs';
import platform from './lib/platform.js';

// Platform-specific default values
const getPlatformDefaults = () => {
  const resourceLimits = platform.getResourceLimits();

  return {
    // Conservative defaults for mobile/limited environments
    LLM_MODEL: 'anthropic/claude-3-haiku-20240307',
    LLM_TEMPERATURE: platform.isTermux ? 0.5 : 0.7,
    LLM_MAX_TOKENS: platform.isTermux ? 2000 : 4000,
    SANDBOX_TIMEOUT: Math.min(resourceLimits.maxCpuTime, 10000),
    SANDBOX_MEMORY_LIMIT: Math.floor(resourceLimits.maxMemory / 1024 / 1024), // Convert to MB
    GIT_USER_NAME: 'Recursa Agent',
    GIT_USER_EMAIL: 'recursa@local'
  };
};

const configSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1, 'OPENROUTER_API_KEY is required.'),
  KNOWLEDGE_GRAPH_PATH: z.string().optional(),
  LLM_MODEL: z.string().default(getPlatformDefaults().LLM_MODEL).optional(),
  LLM_TEMPERATURE: z.coerce.number().default(getPlatformDefaults().LLM_TEMPERATURE).optional(),
  LLM_MAX_TOKENS: z.coerce.number().default(getPlatformDefaults().LLM_MAX_TOKENS).optional(),
  SANDBOX_TIMEOUT: z.coerce.number().default(getPlatformDefaults().SANDBOX_TIMEOUT).optional(),
  SANDBOX_MEMORY_LIMIT: z.coerce.number().default(getPlatformDefaults().SANDBOX_MEMORY_LIMIT).optional(),
  GIT_USER_NAME: z.string().default(getPlatformDefaults().GIT_USER_NAME).optional(),
  GIT_USER_EMAIL: z.string().default(getPlatformDefaults().GIT_USER_EMAIL).optional(),
  TRANSPORT_TYPE: z.enum(['stdio', 'sse']).default('stdio').optional(),
  PORT: z.coerce.number().default(3000).optional(),
  MOCK_QUEUE_FILE: z.string().optional(),
});

export type AppConfig = {
  openRouterApiKey: string;
  knowledgeGraphPath: string;
  llmModel: string;
  llmTemperature: number;
  llmMaxTokens: number;
  sandboxTimeout: number;
  sandboxMemoryLimit: number;
  gitUserName: string;
  gitUserEmail: string;
  transportType: 'stdio' | 'sse';
  port: number;
  mockQueueFile?: string;
};

/**
 * Normalize environment variable keys for cross-platform compatibility
 */
const normalizeEnvVars = () => {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      const normalizedKey = platform.normalizeEnvVar(key);
      normalized[normalizedKey] = value;
    }
  }

  return { ...process.env, ...normalized };
};

/**
 * Resolve and validate the knowledge graph path with platform awareness
 */
const resolveKnowledgeGraphPath = (basePath?: string): string => {
  // Default to .recursa in CWD if not provided
  if (!basePath) {
    return path.join(process.cwd(), '.recursa');
  }

  // Normalize path separators for the current platform
  let resolvedPath = platform.normalizePath(basePath);

  // Handle relative paths
  if (!platform.isAbsolute(resolvedPath)) {
    resolvedPath = platform.normalizePath(path.resolve(process.cwd(), resolvedPath));
     
    console.warn(
      `KNOWLEDGE_GRAPH_PATH is not absolute. Resolved to: ${resolvedPath}`
    );
  }

  // Handle platform-specific path requirements
  if (platform.isWindows) {
    // Ensure Windows paths are properly formatted
    if (!/^[A-Za-z]:\\/.test(resolvedPath) && !resolvedPath.startsWith('\\\\')) {
      // Add current drive letter if missing
      const cwd = process.cwd();
      const drive = cwd.substring(0, 2); // e.g., "C:"
      resolvedPath = drive + resolvedPath;
    }
  }

  return resolvedPath;
};

/**
 * Ensure that the knowledge graph directory exists and is accessible
 */
const ensureKnowledgeGraphPath = async (resolvedPath: string): Promise<void> => {
  // Skip validation in test environments
  if (process.env.NODE_ENV === 'test') {
    // In tests, we might want to ensure it exists or let the harness handle it.
    // The harness handles creation, so we skip here.
    return;
  }

  try {
    const stats = await fs.stat(resolvedPath);
    if (!stats.isDirectory()) {
      throw new Error('Path exists but is not a directory.');
    }
  } catch (error) {
    if ((error as Error & { code?: string }).code === 'ENOENT') {
      // Directory doesn't exist, create it
      console.error(`Creating knowledge graph directory at: ${resolvedPath}`);
      await fs.mkdir(resolvedPath, { recursive: true });
      return; // Created successfully
    }
    throw error;
  }

  // Test write permissions in a cross-platform way
  const testFile = path.join(resolvedPath, '.recursa-write-test');
  try {
    await fs.writeFile(testFile, 'test');
    await fs.unlink(testFile);
  } catch {
    if (platform.isWindows) {
      throw new Error('Directory is not writable. Check folder permissions.');
    } else if (platform.isTermux) {
      throw new Error('Directory is not writable. Check Termux storage permissions.');
    } else {
      throw new Error('Directory is not writable. Check file permissions.');
    }
  }
};

export const loadAndValidateConfig = async (): Promise<AppConfig> => {
  // Use normalized environment variables
  const normalizedEnv = normalizeEnvVars();
  const parseResult = configSchema.safeParse(normalizedEnv);

  if (!parseResult.success) {
     
    console.error(
      '❌ Invalid environment variables:',
      parseResult.error.flatten().fieldErrors
    );
    process.exit(1);
  }

  const {
    OPENROUTER_API_KEY,
    KNOWLEDGE_GRAPH_PATH,
    LLM_MODEL,
    LLM_TEMPERATURE,
    LLM_MAX_TOKENS,
    SANDBOX_TIMEOUT,
    SANDBOX_MEMORY_LIMIT,
    GIT_USER_NAME,
    GIT_USER_EMAIL,
    TRANSPORT_TYPE,
    PORT,
    MOCK_QUEUE_FILE,
  } = parseResult.data;

  // Resolve and validate the knowledge graph path
  const resolvedPath = resolveKnowledgeGraphPath(KNOWLEDGE_GRAPH_PATH);
  await ensureKnowledgeGraphPath(resolvedPath);

  // Log platform-specific information
  console.error(`🔧 Platform: ${platform.platformString}`);
  if (platform.isTermux) {
    console.error('📱 Running in Termux/Android environment');
    console.error(`⚡ Memory limit: ${SANDBOX_MEMORY_LIMIT}MB, Timeout: ${SANDBOX_TIMEOUT}ms`);
  }

  return Object.freeze({
    openRouterApiKey: OPENROUTER_API_KEY,
    knowledgeGraphPath: resolvedPath,
    llmModel: LLM_MODEL!,
    llmTemperature: LLM_TEMPERATURE!,
    llmMaxTokens: LLM_MAX_TOKENS!,
    sandboxTimeout: SANDBOX_TIMEOUT!,
    sandboxMemoryLimit: SANDBOX_MEMORY_LIMIT!,
    gitUserName: GIT_USER_NAME!,
    gitUserEmail: GIT_USER_EMAIL!,
    transportType: TRANSPORT_TYPE!,
    port: PORT!,
    mockQueueFile: MOCK_QUEUE_FILE,
  });
};
