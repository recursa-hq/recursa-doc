import { handleUserQuery } from './core/loop.js';
import { logger } from './lib/logger.js';
import { loadAndValidateConfig } from './config.js';
import { FastMCP, UserError } from 'fastmcp';
import { z } from 'zod';

const main = async () => {
  logger.info('Starting Recursa MCP Server...');

  try {
    // 1. Load configuration
    const config = await loadAndValidateConfig();

    // 2. Create FastMCP server
    const server = new FastMCP({
      name: 'recursa-server',
      version: '0.1.0',
      authenticate: async (request) => {
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.startsWith('Bearer ')
          ? authHeader.slice(7)
          : null;

        if (!token || token !== config.recursaApiKey) {
          logger.warn('Authentication failed', {
            remoteAddress: (
              request as { socket?: { remoteAddress?: string } }
            ).socket?.remoteAddress, // Best effort IP logging
          });
          throw new Response(null, {
            status: 401,
            statusText: 'Unauthorized',
          });
        }

        // Return an empty object for success, as we don't need to store user data in the session context itself
        return {};
      },
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
      }),
      annotations: {
        streamingHint: true,
      },
      execute: async (args, { log, sessionId, requestId, streamContent }) => {
        if (!sessionId) {
          throw new UserError(
            'Session ID is missing. This tool requires a session.'
          );
        }
        if (!requestId) {
          throw new UserError(
            'Request ID is missing. This tool requires a request ID.'
          );
        }

        try {
          const finalReply = await handleUserQuery(
            args.query,
            config,
            sessionId,
            requestId,
            streamContent
          );

          return finalReply;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          log.error(`Error in process_query: ${errorMessage}`, error instanceof Error ? error : new Error(errorMessage));
          throw new UserError(errorMessage);
        }
      },
    });

    // 5. Start the server
    await server.start({
      transportType: 'httpStream',
      httpStream: { port: config.httpPort },
    });

    logger.info(
      `Recursa MCP Server is running and listening on http://localhost:${config.httpPort}`
    );
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
};

main();