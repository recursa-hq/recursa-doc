import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { type ChildProcess, spawn } from 'child_process';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';

// MCP Protocol Types
interface MCPMessage {
  id: string;
  method: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface MCPInitializeRequest extends MCPMessage {
  method: 'initialize';
  params: {
    protocolVersion: string;
    clientInfo: {
      name: string;
      version: string;
    };
  };
}

interface MCPInitializeResponse extends MCPMessage {
  result: {
    serverInfo: {
      name: string;
      version: string;
    };
  };
}

interface MCPListToolsRequest extends MCPMessage {
  method: 'list-tools';
  params?: Record<string, unknown>;
}

interface MCPListToolsResponse extends MCPMessage {
  result: {
    tools: MCPTool[];
  };
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// Helper to read newline-delimited JSON from a stream
async function* readMessages(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<MCPMessage> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep the last partial line

    for (const line of lines) {
      if (line.trim()) {
        try {
          yield JSON.parse(line) as MCPMessage;
        } catch (e: unknown) {
          console.error('Failed to parse JSON line:', line);
        }
      }
    }
  }
}

describe('MCP Protocol E2E Test', () => {
  let tempDir: string;
  let proc: ChildProcess | undefined;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'recursa-mcp-e2e-'));
  });

  afterAll(async () => {
    if (tempDir) await fs.rm(tempDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Ensure the temp directory exists and is clean for the knowledge graph
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.mkdir(tempDir, { recursive: true });

    // Spawn the server as a child process for testing
    proc = spawn('tsx', ['src/server.ts'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        KNOWLEDGE_GRAPH_PATH: tempDir,
        OPENROUTER_API_KEY: 'mock-key-for-e2e-test',
      },
    });
  });

  afterEach(() => {
    // Ensure the child process is terminated after each test
    proc?.kill();
    proc = undefined;
  });

  it('should initialize and list tools correctly', async () => {
    if (!proc) throw new Error('Process not started');

    const writer = proc.stdin;
    if (!writer || !proc.stdout) {
      throw new Error('Process stdio not available');
    }
    const reader = readMessages(Readable.toWeb(proc.stdout) as ReadableStream);

    // 1. Send initialize request
    const initRequestId = randomUUID();
    const initRequest: MCPInitializeRequest = {
      id: initRequestId,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        clientInfo: { name: 'test-client', version: '1.0.0' },
      },
    };
    await writer.write(JSON.stringify(initRequest) + '\n');

    // 2. Await and verify initialize response
    const initResponse = await reader.next();
    expect(initResponse.done).toBe(false);
    const initResponseValue = initResponse.value as MCPInitializeResponse;
    expect(initResponseValue.id).toBe(initRequestId);
    expect(initResponseValue.result.serverInfo.name).toBe('recursa-server');

    // 3. Send list-tools request
    const listToolsRequestId = randomUUID();
    const listToolsRequest: MCPListToolsRequest = {
      id: listToolsRequestId,
      method: 'list-tools',
      params: {},
    };
    await writer.write(JSON.stringify(listToolsRequest) + '\n');

    // 4. Await and verify list-tools response
    const listToolsResponse = await reader.next();
    expect(listToolsResponse.done).toBe(false);
    const listToolsResponseValue =
      listToolsResponse.value as MCPListToolsResponse;
    expect(listToolsResponseValue.id).toBe(listToolsRequestId);
    expect(listToolsResponseValue.result.tools).toBeInstanceOf(Array);
    expect(listToolsResponseValue.result.tools.length).toBeGreaterThan(0);
    const processQueryTool = listToolsResponseValue.result.tools.find(
      (t: MCPTool) => t.name === 'process_query'
    );
    expect(processQueryTool).toBeDefined();
    expect(typeof processQueryTool.description).toBe('string');

    // NOTE: Testing the 'call-tool' for 'process_query' is intentionally omitted here.
    // A true process-level E2E test for the agent loop would require either:
    // a) A live network connection and a valid LLM API key, making the test non-isolated and dependent on external services.
    // b) A complex setup to inject a mock LLM into the child process, which is beyond the scope of this test suite.
    // The agent loop's functionality is thoroughly tested with a mock LLM in the integration tests (`tests/integration/workflow.test.ts`).
    // This E2E test focuses on verifying the MCP server's protocol compliance and basic request/response handling.

    await writer.end();
  }, 20000); // Increase timeout for spawning process
});
