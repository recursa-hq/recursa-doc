import { logger } from './lib/logger.js';
import { loadAndValidateConfig, type AppConfig } from './config.js';
import { FastMCP, UserError, type Context } from 'fastmcp';
import { z } from 'zod';
import { IncomingMessage } from 'http';
import { createMemAPI } from './core/mem-api/index.js';
import { memApiSchemas } from './mcp-schemas.js';
import { sanitizeTenantId } from './core/mem-api/secure-path.js';
import path from 'path';
import { promises as fs } from 'fs';
import type { MemAPI } from './types/index.js';

interface SessionContext extends Record<string, unknown> {
  sessionId: string;
  requestId: string;
  tenantId: string;
  stream: {
    write: (content: { type: 'text'; text: string }) => Promise<void>;
  };
}

const registerMemAPITools = (
  server: FastMCP<SessionContext>,
  config: AppConfig
) => {
  const tempMemAPI = createMemAPI(config);
  const toolNames = Object.keys(tempMemAPI) as Array<keyof MemAPI>;

  for (const toolName of toolNames) {
    const schema = memApiSchemas[toolName];
    if (!schema) {
      logger.warn(`No schema found for tool: ${toolName}. Skipping registration.`);
      continue;
    }

    server.addTool({
      name: `mem.${toolName}`,
      description: `Knowledge graph operation: ${toolName}`,
      parameters: schema,
      execute: async (args, context: Context<SessionContext>) => {
        const { log, session } = context;
        const { tenantId } = session!;

        if (!tenantId) {
          throw new UserError(
            'tenantId is missing. All operations must be tenant-scoped.'
          );
        }

        try {
          // Create a tenant-specific, request-scoped MemAPI instance
          const tenantGraphRoot = path.join(
            config.knowledgeGraphPath,
            sanitizeTenantId(tenantId)
          );

          await fs.mkdir(tenantGraphRoot, { recursive: true });

          const tenantConfig = { ...config, knowledgeGraphPath: tenantGraphRoot };
          const mem = createMemAPI(tenantConfig);

          // Dynamically call the corresponding MemAPI function
          const fn = mem[toolName] as (...args: any[]) => Promise<any>;
          const result = await fn(...Object.values(args));

          // FastMCP handles serialization of common return types (string, boolean, array, object)
          return result;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          log.error(`Error in mem.${toolName}: ${errorMessage}`, {
            tool: toolName,
            args,
            error,
          });
          throw new UserError(errorMessage);
        }
      },
    });
  }
  logger.info(`Registered ${toolNames.length} MemAPI tools.`);
};

const main = async () => {
  logger.info('Starting Recursa MCP Server...');

  try {
    // 1. Load configuration
    const config = await loadAndValidateConfig();

    // 2. Create FastMCP server
    const server = new FastMCP<SessionContext>({
      name: 'recursa-server',
      version: '0.1.0',
      logger, // Integrate structured logger
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

        const tenantIdHeader = request.headers['x-tenant-id'];
        const tenantId = Array.isArray(tenantIdHeader)
          ? tenantIdHeader[0]
          : tenantIdHeader;

        if (!tenantId || !tenantId.trim()) {
          logger.warn('Tenant ID missing', {
            remoteAddress: request.socket?.remoteAddress,
          });
          throw new Response(null, {
            status: 400,
            statusText: 'Bad Request: x-tenant-id header is required.',
          });
        }

        return {
          sessionId: 'default-session', // FastMCP will manage real session IDs
          requestId: 'default-request', // FastMCP will manage real request IDs
          tenantId: tenantId.trim(),
          stream: { write: async () => {} }, // Placeholder, FastMCP provides implementation
        };
      },
    });

    registerMemAPITools(server, config);

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