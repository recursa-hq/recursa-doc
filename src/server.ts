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

          // Initialize git repository for tenant if it doesn't exist
          const gitRepoPath = path.join(tenantGraphRoot, '.git');
          try {
            await fs.access(gitRepoPath);
          } catch {
            // Git repository doesn't exist, initialize it
            const simpleGit = await import('simple-git');
            const tenantGit = simpleGit.default(tenantGraphRoot);
            await tenantGit.init();
            await tenantGit.addConfig('user.name', config.gitUserName || 'Recursa Agent');
            await tenantGit.addConfig('user.email', config.gitUserEmail || 'recursa@local');

            // Create a basic .gitignore
            await fs.writeFile(
              path.join(tenantGraphRoot, '.gitignore'),
              '*.log\nnode_modules/\n.env\n.DS_Store\n'
            );
            await tenantGit.add('.gitignore');
            await tenantGit.commit('Initial commit');
          }

          const tenantConfig = { ...config, knowledgeGraphPath: tenantGraphRoot };
          const mem = createMemAPI(tenantConfig);

          // Dynamically call the corresponding MemAPI function
          const fn = mem[toolName] as (...args: any[]) => Promise<any>;
          const result = await fn(...Object.values(args));

          // FastMCP handles serialization automatically for most types
          // Convert various types to string representation for FastMCP compatibility
          if (typeof result === 'string') {
            return result; // FastMCP will wrap this properly
          }

          if (typeof result === 'boolean') {
            return result ? 'true' : 'false';
          }

          if (typeof result === 'number') {
            return result.toString();
          }

          // Ensure array responses are properly formatted for FastMCP
          if (Array.isArray(result)) {
            return JSON.stringify(result);
          }

          // Ensure object responses are properly formatted
          if (typeof result === 'object' && result !== null) {
            return JSON.stringify(result);
          }

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

        if (!token) {
          logger.warn('Authentication failed: No Bearer token provided', {
            remoteAddress: request.socket?.remoteAddress, // Best effort IP logging
          });
          throw new Response(null, {
            status: 401,
            statusText: 'Unauthorized: Bearer token required',
          });
        }

        // Use the Bearer token as the tenant ID directly
        const tenantId = token.trim();

        if (!tenantId) {
          logger.warn('Tenant ID missing: Empty Bearer token', {
            remoteAddress: request.socket?.remoteAddress,
          });
          throw new Response(null, {
            status: 401,
            statusText: 'Unauthorized: Bearer token cannot be empty',
          });
        }

        logger.info('Authenticated request', {
          tenantId,
          remoteAddress: request.socket?.remoteAddress,
        });

        return {
          sessionId: `session-${tenantId}`, // FastMCP will manage real session IDs
          requestId: 'default-request', // FastMCP will manage real request IDs
          tenantId: tenantId,
          stream: { write: async () => {} }, // Placeholder, FastMCP provides implementation
        };
      },
    });

    registerMemAPITools(server, config);

    // 5. Start the server with enhanced error handling
    logger.info(`Attempting to start MCP server on port ${config.httpPort}...`);

    try {
      await server.start({
        transportType: 'httpStream',
        httpStream: { port: config.httpPort, endpoint: '/mcp', stateless: true },
      });

      logger.info(
        `✅ Recursa MCP Server is running and listening on http://localhost:${config.httpPort}/mcp`
      );
      logger.info(`📋 Configuration: HTTP_PORT=${config.httpPort}, KNOWLEDGE_GRAPH_PATH=${config.knowledgeGraphPath}`);
    } catch (startError) {
      logger.error('❌ Failed to start MCP server', startError as Error);
      logger.error(`💡 Port ${config.httpPort} may be in use or configuration is invalid`);
      logger.error(`🔧 Check environment variables and port availability`);

      if (startError instanceof Error) {
        if (startError.message.includes('EADDRINUSE')) {
          logger.error(`🚨 Port ${config.httpPort} is already in use. Please free the port or change HTTP_PORT environment variable.`);
        } else if (startError.message.includes('EACCES')) {
          logger.error(`🔒 Permission denied accessing port ${config.httpPort}. Try using a port > 1024 or run with elevated privileges.`);
        }
      }

      throw startError;
    }
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
};

main();