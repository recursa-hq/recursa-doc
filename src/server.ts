import { handleUserQuery } from './core/loop.js';
import { logger } from './lib/logger.js';
import { loadAndValidateConfig } from './config.js';
import { FastMCP, UserError, type Context } from 'fastmcp';
import { z } from 'zod';
import { queryLLMWithRetries } from './core/llm.js';
import { IncomingMessage } from 'http';

interface SessionContext extends Record<string, unknown> {
  sessionId: string;
  requestId: string;
  stream: {
    write: (content: { type: 'text'; text: string }) => Promise<void>;
  };
}

const main = async () => {
  logger.info('Starting Recursa MCP Server...');

  try {
    // 1. Load configuration
    const config = await loadAndValidateConfig();

    // 2. Create FastMCP server
    const server = new FastMCP<SessionContext>({
      name: 'recursa-server',
      version: '0.1.0',
      authenticate: async (request: IncomingMessage) => {
        const authHeader = request.headers['authorization'];
        const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
          ? authHeader.slice(7)
          : null;

        if (!token || token !== config.recursaApiKey) {
          logger.warn('Authentication failed', {
            remoteAddress: request.socket?.remoteAddress, // Best effort IP logging
          });
          throw new Response(null, {
            status: 401,
            statusText: 'Unauthorized',
          });
        }

        // For simplicity, we'll create minimal session context
        // In a real implementation, you might extract more session info from the request
        return {
          sessionId: 'default-session', // You'd typically generate or extract this
          requestId: 'default-request', // You'd typically generate or extract this
          stream: {
            write: async () => {}, // Placeholder - actual stream will be provided by FastMCP
          },
        } as SessionContext;
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
        tenantId: z
          .string()
          .optional()
          .describe(
            'An optional ID to scope operations to a specific tenant workspace.'
          ),
      }),
      execute: async (args, context: Context<SessionContext>) => {
        const { log, session } = context;
        const { sessionId, requestId, stream } = session!;
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
        if (!stream) {
          throw new UserError('This tool requires a streaming connection.');
        }

        try {
          const streamContent = (content: { type: 'text'; text: string }) => {
            return stream.write(content);
          };

          const finalReply = await handleUserQuery(
            args.query,
            config,
            sessionId,
            requestId,
            queryLLMWithRetries,
            streamContent,
            args.tenantId
          );

          return finalReply;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const errorContext =
            error instanceof Error
              ? { message: error.message, stack: error.stack }
              : { message: errorMessage };
          log.error(`Error in process_query: ${errorMessage}`, errorContext);
          throw new UserError(errorMessage);
        }
      },
    });

    // 5. Start the server
    await server.start({
      transportType: 'httpStream',
      httpStream: { port: config.httpPort, endpoint: '/mcp' },
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