import { createMCPHandler } from './api/mcp.handler.js';
import { handleUserQuery } from './core/loop.js';
import { logger } from './lib/logger.js';
import { config } from './config.js';
import { createMemAPI } from './core/mem-api/index.js';
import { EventEmitter } from './lib/event-emitter.js';
import type { StatusUpdate } from './types/loop.js';

const main = async () => {
  logger.info('Starting Recursa MCP Server...');

  // 1. Initialize dependencies
  const emitter = new EventEmitter<Record<string, StatusUpdate>>();
  const memApi = createMemAPI(config);

  // 2. Create the MCP handler, injecting dependencies
  const { server, transport } = createMCPHandler(
    memApi,
    config.knowledgeGraphPath,
    config,
    handleUserQuery,
    emitter
  );

  // 3. Start listening for requests over stdio
  await transport.start();
  await server.connect(transport);

  logger.info('Recursa MCP Server is running and listening on stdio.');
};

main();