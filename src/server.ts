import { createMCPHandler } from './api/mcp.handler.js';
import { handleUserQuery } from './core/loop.js';
import { logger } from './lib/logger.js';
import { loadAndValidateConfig } from './config.js';
import { createMemAPI } from './core/mem-api/index.js';
import { createEmitter } from './lib/events.js';
import type { StatusUpdate } from './types/loop.js';

const main = async () => {
  logger.info('Starting Recursa MCP Server...');

  try {
    // 1. Load configuration
    const config = await loadAndValidateConfig();

    // 2. Initialize dependencies
    const emitter = createEmitter<Record<string, StatusUpdate>>();
    const memApi = createMemAPI(config);

    // 3. Create the MCP handler, injecting dependencies
    const { server, transport } = createMCPHandler(
      memApi,
      config.knowledgeGraphPath,
      config,
      handleUserQuery,
      emitter
    );

    // 4. Start listening for requests over stdio
    await transport.start();
    await server.connect(transport);

    logger.info('Recursa MCP Server is running and listening on stdio.');
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
};

main();
