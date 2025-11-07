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
});

export type AppConfig = {
  openRouterApiKey: string;
  knowledgeGraphPath: string;
  llmModel: string;
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

  const { OPENROUTER_API_KEY, KNOWLEDGE_GRAPH_PATH, LLM_MODEL } =
    parseResult.data;

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
  });
};
