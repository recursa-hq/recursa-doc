import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createSandbox } from '../core/Sandbox.js';
import type { MemAPI } from '../types/mem.js';
import type { MCPTool, MCPResource } from '../types/mcp.js';

export const createMCPHandler = (
  memApi: MemAPI,
  knowledgeGraphPath: string
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

  const sandbox = createSandbox(memApi, {
    timeout: 30000,
  });

  const tools: MCPTool[] = [
    {
      name: 'execute_code',
      description: 'Execute TypeScript code in the sandbox',
      inputSchema: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'TypeScript code to execute',
          },
        },
        required: ['code'],
      },
    },
    {
      name: 'read_file',
      description: 'Read a file from the knowledge graph',
      inputSchema: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Path to the file to read',
          },
        },
        required: ['filePath'],
      },
    },
    {
      name: 'write_file',
      description: 'Write content to a file in the knowledge graph',
      inputSchema: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Path to the file to write',
          },
          content: {
            type: 'string',
            description: 'Content to write to the file',
          },
        },
        required: ['filePath', 'content'],
      },
    },
    {
      name: 'update_file',
      description: 'Update a file in the knowledge graph',
      inputSchema: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Path to the file to update',
          },
          oldContent: {
            type: 'string',
            description: 'Content to replace',
          },
          newContent: {
            type: 'string',
            description: 'New content',
          },
        },
        required: ['filePath', 'oldContent', 'newContent'],
      },
    },
    {
      name: 'commit_changes',
      description: 'Commit changes to git',
      inputSchema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Commit message',
          },
        },
        required: ['message'],
      },
    },
    {
      name: 'query_graph',
      description: 'Query the knowledge graph',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Graph query string',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'search_global',
      description: 'Search across all files',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query',
          },
        },
        required: ['query'],
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

  server.setRequestHandler('initialize', async (_request) => {
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

  server.setRequestHandler('tools/list', async () => {
    return {
      tools,
    };
  });

  server.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params as {
      name: string;
      arguments: Record<string, unknown>;
    };

    try {
      switch (name) {
        case 'execute_code': {
          const code = String(args.code);
          const result = await sandbox.execute(code);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result),
              },
            ],
          };
        }

        case 'read_file': {
          const filePath = String(args.filePath);
          const content = await memApi.readFile(filePath);
          return {
            content: [
              {
                type: 'text',
                text: content,
              },
            ],
          };
        }

        case 'write_file': {
          const filePath = String(args.filePath);
          const content = String(args.content);
          const success = await memApi.writeFile(filePath, content);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success }),
              },
            ],
          };
        }

        case 'update_file': {
          const filePath = String(args.filePath);
          const oldContent = String(args.oldContent);
          const newContent = String(args.newContent);
          const success = await memApi.updateFile(
            filePath,
            oldContent,
            newContent
          );
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success }),
              },
            ],
          };
        }

        case 'commit_changes': {
          const message = String(args.message);
          const hash = await memApi.commitChanges(message);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ hash }),
              },
            ],
          };
        }

        case 'query_graph': {
          const query = String(args.query);
          const results = await memApi.queryGraph(query);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(results),
              },
            ],
          };
        }

        case 'search_global': {
          const query = String(args.query);
          const results = await memApi.searchGlobal(query);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(results),
              },
            ],
          };
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

  server.setRequestHandler('resources/list', async () => {
    return {
      resources,
    };
  });

  return {
    server,
    transport: new StdioServerTransport(),
  };
};
