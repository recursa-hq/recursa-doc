import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  InitializeRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { MemAPI } from '../types/mem.js';
import type { MCPTool, MCPResource } from '../types/mcp.js';
import type { AppConfig } from '../config.js';
import type { handleUserQuery } from '../core/loop.js';
import type { StatusUpdate } from '../types/loop.js';
import type { Emitter } from '../lib/events.js';

export const createMCPHandler = (
  memApi: MemAPI,
  knowledgeGraphPath: string,
  config: AppConfig,
  handleQuery: typeof handleUserQuery,
  emitter: Emitter<Record<string, StatusUpdate>>
) => {
  const server = new Server(
    {
      name: 'recursa-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {
          listChanged: true,
        },
        resources: {
          listChanged: true,
        },
      },
    }
  );

  const tools: MCPTool[] = [
    {
      name: 'process_query',
      description: 'Processes a high-level user query by running the agent loop.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The user query to process.',
          },
          sessionId: {
            type: 'string',
            description: 'An optional session ID to maintain context.',
          },
          runId: {
            type: 'string',
            description:
              'A unique ID for this execution run, used for notifications.',
          },
        },
        required: ['query', 'runId'],
      },
    },
  ];

  const resources: MCPResource[] = [
    {
      uri: `file://${knowledgeGraphPath}`,
      name: 'Knowledge Graph Root',
      mimeType: 'text/directory',
      description: 'Root directory of the knowledge graph',
    },
  ];

  server.setRequestHandler(InitializeRequestSchema, async (request) => {
    return {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {
          listChanged: true,
        },
        resources: {
          listChanged: true,
        },
      },
      serverInfo: {
        name: 'recursa-server',
        version: '0.1.0',
      },
    };
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools,
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params as {
      name: string;
      arguments: Record<string, unknown>;
    };

    try {
      switch (name) {
        case 'process_query': {
          const query = String(args.query);
          const runId = String(args.runId);
          const sessionId = args.sessionId ? String(args.sessionId) : undefined;

          // This callback will be passed to the agent loop to emit status updates.
          const onStatusUpdate = (update: StatusUpdate) => {
            emitter.emit(runId, update);
          };

          // This listener forwards emitted events as MCP notifications for this run.
          const listener = (update: StatusUpdate) => {
            server.notification({
              method: 'tool/status',
              params: {
                runId,
                status: update,
              },
            });
          };
          emitter.on(runId, listener);

          try {
            const finalReply = await handleQuery(
              query,
              config,
              sessionId,
              undefined,
              onStatusUpdate
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ reply: finalReply, runId }),
                },
              ],
            };
          } finally {
            // Ensure the listener is cleaned up regardless of success or failure.
            emitter.off(runId, listener);
          }
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
            }),
          },
        ],
        isError: true,
      };
    }
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources,
    };
  });

  return {
    server,
    transport: new StdioServerTransport(),
  };
};
