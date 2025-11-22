import { handleUserQuery } from './core/loop.js';
import { logger } from './lib/logger.js';
import { loadAndValidateConfig, type AppConfig } from './config.js';
import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import type { StatusUpdate } from './types/loop.js';
import type { ChatMessage } from './types/llm.js';
import { fileURLToPath } from 'url';
import simpleGit from 'simple-git';
import { promises as fs } from 'fs';

// Serializable value type for FastMCP logger
type SerializableValue =
  | boolean
  | null
  | number
  | string
  | undefined
  | SerializableValue[]
  | { [key: string]: SerializableValue };
import path from 'path';

/**
 * Factory function to create the MCP server instance.
 * Allows dependency injection for testing (e.g., mocking the LLM).
 */
export const createMcpServer = async (
  config: AppConfig,
  dependencies: {
    queryLLM?: (
      history: ChatMessage[],
      config: AppConfig
    ) => Promise<string | unknown>;
  } = {}
) => {
  // Create FastMCP server
  const server = new FastMCP({
    name: 'recursa-server',
    version: '0.1.0',
  });

  // Add resources
  server.addResource({
    uri: `file://${config.knowledgeGraphPath}`,
    name: 'Knowledge Graph Root',
    mimeType: 'text/directory',
    description: 'Root directory of the knowledge graph',
    async load() {
      return {
        text: `This resource represents the root of the knowledge graph at ${config.knowledgeGraphPath}. It cannot be loaded directly.`,
      };
    },
  });

  // Add tools
  server.addTool({
    name: 'process_query',
    description: 'Processes a high-level user query by running the agent loop.',
    parameters: z.object({
      query: z.string().describe('The user query to process.'),
      sessionId: z
        .string()
        .describe('An optional session ID to maintain context.')
        .optional(),
      runId: z
        .string()
        .describe(
          'A unique ID for this execution run, used for notifications.'
        ),
    }),
    execute: async (args, { log }) => {
      const onStatusUpdate = (update: StatusUpdate) => {
        // Map StatusUpdate to fastmcp logs, which are sent as notifications.
        const { type, content, data } = update;
        const message = `[${type}] ${content}`;

        switch (type) {
          case 'think':
            log.info(content || 'Thinking...');
            break;
          case 'act':
            log.info(message, data as SerializableValue);
            break;
          case 'error':
            log.error(message, data as SerializableValue);
            break;
          default:
            log.debug(message, data as SerializableValue);
        }
      };

      try {
        const finalReply = await handleUserQuery(
          args.query,
          config,
          args.sessionId,
          dependencies.queryLLM, // Inject the mock LLM if provided
          onStatusUpdate
        );

        return JSON.stringify({ reply: finalReply, runId: args.runId });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        log.error(
          `Error in process_query: ${errorMessage}`,
          (error instanceof Error
            ? { message: error.message, stack: error.stack, name: error.name }
            : {
              message: errorMessage,
              original: error,
            }) as SerializableValue
        );
        return JSON.stringify({
          error: errorMessage,
          runId: args.runId,
        });
      }
    },
  });

  return server;
};

/**
 * Ensures the knowledge graph is a valid git repository.
 */
const ensureGitRepo = async (config: AppConfig) => {
  // Initialize git in the knowledge graph directory specifically
  const git = simpleGit({ baseDir: config.knowledgeGraphPath });

  // 1. Check Git Binary
  try {
    await git.version();
  } catch (e) {
    logger.error('Git binary not found. Please install Git.', e as Error);
    throw new Error('Git binary not found. Please install Git to use Recursa.');
  }

  // 2. Detect Stale Lock Files
  const lockFile = path.join(config.knowledgeGraphPath, '.git', 'index.lock');
  try {
    await fs.access(lockFile);
    logger.warn('⚠️  Found .git/index.lock file. This indicates a previous crash or running process.');
    logger.warn('If no other git process is running, you may need to delete this file manually.');
  } catch {
    // File doesn't exist, which is normal
  }

  try {
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      logger.info('Initializing new Git repository...', { path: config.knowledgeGraphPath });
      // Initialize git repository specifically in the knowledge graph path
      await git.init({ '--initial-branch': 'main' });
      // Set local config for this repo to ensure commits work
      await git.addConfig('user.name', config.gitUserName);
      await git.addConfig('user.email', config.gitUserEmail);
      logger.info('Git repository initialized successfully.');
    }

    // 3. Force Initial Commit (Fix Headless state)
    try {
      // Check if HEAD exists by trying to get the log
      await git.log({ maxCount: 1 });
    } catch (error) {
      const msg = (error as Error).message;
      // If HEAD is invalid, this is a fresh repo. Error messages vary by git version.
      if (msg.includes("HEAD") || msg.includes("bad default revision") || msg.includes("does not have any commits")) {
        logger.info('Creating initial commit to establish HEAD...');
        const gitignorePath = path.join(config.knowledgeGraphPath, '.gitignore');
        try {
          await fs.access(gitignorePath);
        } catch {
          // Create a default .gitignore if it doesn't exist
          await fs.writeFile(gitignorePath, 'node_modules/\n.env\n.DS_Store\n*.log\n');
        }
        await git.add('.gitignore');
        await git.commit('root: initialize knowledge graph');
        logger.info('Initial commit created.');
      }
    }

    // 4. Warn on Dirty State
    const status = await git.status();
    if (!status.isClean()) {
      logger.warn('⚠️  Repository has uncommitted changes. The agent may commit these changes automatically.');
      logger.warn(`Dirty files: ${status.files.map(f => f.path).join(', ')}`);
    }
  } catch (error) {
    logger.error('Failed to initialize git repository', error as Error);
    throw error;
  }
};

export const main = async () => {
  logger.info('Starting Recursa MCP Server...');

  try {
    // 1. Load configuration
    const config = await loadAndValidateConfig();

    // 2. Ensure Git repository exists (with better error handling)
    try {
      await ensureGitRepo(config);
    } catch (gitError) {
      logger.error('Failed to initialize git repository', gitError as Error);
      // In test mode, we might want to continue even if git setup fails
      if (process.env.NODE_ENV !== 'test') {
        throw gitError;
      } else {
        logger.warn('Continuing in test mode despite git initialization failure');
      }
    }

    // 3. Create server instance
    const server = await createMcpServer(config);

    // 4. Start the server
    if (config.transportType === 'sse') {
      await server.start({
        transportType: 'httpStream',
        httpStream: {
          endpoint: '/sse',
          port: config.port,
        },
      });
      // Use stderr for this message to match what the test harness expects
      console.error(`[FastMCP info] server is running on SSE at http://localhost:${config.port}/sse`);
    } else {
      await server.start({ transportType: 'stdio' });
      logger.info('Recursa MCP Server is running on stdio.');
    }
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
};

// Only run main if this file is the entry point
if (typeof import.meta !== 'undefined' && process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}