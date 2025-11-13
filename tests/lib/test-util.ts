import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import type { TestHarnessState } from './test-harness';
import type {
  MCPRequest,
  MCPResponse,
  MCPNotification,
} from '../../src/types';

export const spawnServer = (
  harness: TestHarnessState
): ChildProcessWithoutNullStreams => {
  const serverProcess = spawn('node', ['dist/server.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      KNOWLEDGE_GRAPH_PATH: harness.mockConfig.knowledgeGraphPath,
      OPENROUTER_API_KEY: harness.mockConfig.openRouterApiKey,
    },
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`SERVER STDERR: ${data}`);
  });

  return serverProcess;
};

export const writeMCPRequest = (
  serverProcess: ChildProcessWithoutNullStreams,
  request: MCPRequest
): void => {
  const message = JSON.stringify(request) + '\n';
  serverProcess.stdin.write(message);
};

export type MCPMessage = MCPResponse | MCPNotification;

export async function* readMCPMessages(
  serverProcess: ChildProcessWithoutNullStreams
): AsyncGenerator<MCPMessage> {
  let buffer = '';
  for await (const chunk of serverProcess.stdout) {
    buffer += chunk.toString();
    let newlineIndex;
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      if (line.trim()) {
        try {
          const parsed = JSON.parse(line);
          yield parsed as MCPMessage;
        } catch {
          console.error('Failed to parse MCP message:', line);
        }
      }
    }
  }
}