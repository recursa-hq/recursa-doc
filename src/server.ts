import { handleUserQuery } from './core/loop.js';
import { logger } from './lib/logger.js';
import { loadAndValidateConfig } from './config.js';
import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import type { StatusUpdate } from './types/loop.js';

const main = async () => {
  logger.info('Starting Recursa MCP Server...');

  try {
    // 1. Load configuration
    const config = await loadAndValidateConfig();

    // 2. Create FastMCP server
    const server = new FastMCP({
      name: 'recursa-server',
      version: '0.1.0',
    });

    // 3. Add resources
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

    // 4. Add tools
    server.addTool({
      name: 'process_query',
      description:
        'Processes a high-level user query by running the agent loop.',
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
              log.info(message, data as any);
              break;
            case 'error':
              log.error(message, data as any);
              break;
            default:
              log.debug(message, data as any);
          }
        };

        try {
          const finalReply = await handleUserQuery(
            args.query,
            config,
            args.sessionId,
            undefined,
            onStatusUpdate
          );

          return JSON.stringify({ reply: finalReply, runId: args.runId });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          log.error(`Error in process_query: ${errorMessage}`, {
            stack: error instanceof Error ? error.stack : undefined,
          });
          return JSON.stringify({
            error: errorMessage,
            runId: args.runId,
          });
        }
      },
    });

    // 5. Start the server
    await server.start({ transportType: 'stdio' });

    logger.info('Recursa MCP Server is running and listening on stdio.');
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
};

main();