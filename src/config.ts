import 'dotenv/config';
import { z } from 'zod';
import path from 'path';
import { promises as fs } from 'fs';

const configSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1, 'OPENROUTER_API_KEY is required.'),
  KNOWLEDGE_GRAPH_PATH: z.string().min(1, 'KNOWLEDGE_GRAPH_PATH is required.'),
  LLM_MODEL: z
    .string()
    .default('anthropic/claude-3-haiku-20240307') // Sensible default for cost/speed
    .optional(),
  LLM_TEMPERATURE: z.coerce.number().default(0.7).optional(),
  LLM_MAX_TOKENS: z.coerce.number().default(4000).optional(),
  SANDBOX_TIMEOUT: z.coerce.number().default(10000).optional(),
  SANDBOX_MEMORY_LIMIT: z.coerce.number().default(100).optional(),
  GIT_USER_NAME: z.string().default('Recursa Agent').optional(),
  GIT_USER_EMAIL: z.string().default('recursa@local').optional(),
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
};

export const loadAndValidateConfig = async (): Promise<AppConfig> => {
  const parseResult = configSchema.safeParse(process.env);

  if (!parseResult.success) {
    // eslint-disable-next-line no-console
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
  } = parseResult.data;

  // Perform runtime checks
  let resolvedPath = KNOWLEDGE_GRAPH_PATH;
  if (!path.isAbsolute(resolvedPath)) {
    resolvedPath = path.resolve(process.cwd(), resolvedPath);
    // eslint-disable-next-line no-console
    console.warn(
      `KNOWLEDGE_GRAPH_PATH is not absolute. Resolved to: ${resolvedPath}`
    );
  }

  // In test environments, the path is created dynamically by the test runner,
  // so we should skip this check. `bun test` automatically sets NODE_ENV=test.
  if (process.env.NODE_ENV !== 'test') {
    try {
      const stats = await fs.stat(resolvedPath);
      if (!stats.isDirectory()) {
        throw new Error('is not a directory.');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        `❌ Error with KNOWLEDGE_GRAPH_PATH "${resolvedPath}": ${
          (error as Error).message
        }`
      );
      process.exit(1);
    }
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
  });
};
