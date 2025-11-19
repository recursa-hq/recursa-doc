import { handleUserQuery } from './core/loop.js';
import { logger } from './lib/logger.js';
import { loadAndValidateConfig, type AppConfig } from './config.js';
import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import type { StatusUpdate, ChatMessage } from './types/loop.js';
import { fileURLToPath } from 'url';

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
            log.info(message, data);
            break;
          case 'error':
            log.error(message, undefined, data);
            break;
          default:
            log.debug(message, data);
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
          error instanceof Error ? error : new Error(errorMessage)
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

const main = async () => {
  logger.info('Starting Recursa MCP Server...');

  try {
    // 1. Load configuration
    const config = await loadAndValidateConfig();

    // 2. Create server instance
    const server = await createMcpServer(config);

    // 3. Start the server
    await server.start({ transportType: 'stdio' });

    logger.info('Recursa MCP Server is running and listening on stdio.');
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
};

// Only run main if this file is the entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}