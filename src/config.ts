import 'dotenv/config';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';

// TODO: Define a Zod schema for environment variables for robust validation.
const configSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1, 'OPENROUTER_API_KEY is required.'),
  KNOWLEDGE_GRAPH_PATH: z.string().min(1, 'KNOWLEDGE_GRAPH_PATH is required.'),
  LLM_MODEL: z.string().default('anthropic/claude-3-sonnet-20240229'),
  PORT: z.coerce.number().int().positive().default(3000),
});

// TODO: Define the final, typed configuration object.
export type AppConfig = {
  openRouterApiKey: string;
  knowledgeGraphPath: string;
  llmModel: string;
  port: number;
};

// TODO: Create a function to load, parse, and validate environment variables.
// export const loadAndValidateConfig = (): AppConfig => { ... }
// - Use `configSchema.safeParse(process.env)` to validate.
// - If validation fails, log the errors and exit the process.
// - After parsing, perform runtime checks:
//   - Ensure KNOWLEDGE_GRAPH_PATH is an absolute path. If not, resolve it.
//   - Ensure the path exists and is a directory. If not, throw a clear error.
// - Return a frozen, typed config object mapping the env vars to friendlier names.
//   (e.g., OPENROUTER_API_KEY -> openRouterApiKey)

// Example of final export:
// export const config: AppConfig = loadAndValidateConfig();