import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'bun:test';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type { Subprocess } from 'bun';
import { randomUUID } from 'crypto';

// Helper to read newline-delimited JSON from a stream
async function* readMessages(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<any> {
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
          yield JSON.parse(line);
        } catch (e) {
          console.error('Failed to parse JSON line:', line);
        }
      }
    }
  }
}

describe('MCP Protocol E2E Test', () => {
  let tempDir: string;
  let proc: Subprocess | undefined;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'recursa-mcp-e2e-'));
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Ensure the temp directory exists and is clean for the knowledge graph
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.mkdir(tempDir, { recursive: true });

    // Spawn the server as a child process for testing
    proc = Bun.spawn(['bun', 'run', 'src/server.ts'], {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
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
    const reader = readMessages(proc.stdout);

    // 1. Send initialize request
    const initRequestId = randomUUID();
    const initRequest = {
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
    expect(initResponse.value.id).toBe(initRequestId);
    expect(initResponse.value.result.serverInfo.name).toBe('recursa-server');

    // 3. Send list-tools request
    const listToolsRequestId = randomUUID();
    const listToolsRequest = {
      id: listToolsRequestId,
      method: 'list-tools',
      params: {},
    };
    await writer.write(JSON.stringify(listToolsRequest) + '\n');

    // 4. Await and verify list-tools response
    const listToolsResponse = await reader.next();
    expect(listToolsResponse.done).toBe(false);
    expect(listToolsResponse.value.id).toBe(listToolsRequestId);
    expect(listToolsResponse.value.result.tools).toBeArray();
    expect(listToolsResponse.value.result.tools.length).toBeGreaterThan(0);
    const processQueryTool = listToolsResponse.value.result.tools.find(
      (t: any) => t.name === 'process_query'
    );
    expect(processQueryTool).toBeDefined();
    expect(processQueryTool.description).toBeString();

    // NOTE: Testing the 'call-tool' for 'process_query' is intentionally omitted here.
    // A true process-level E2E test for the agent loop would require either:
    // a) A live network connection and a valid LLM API key, making the test non-isolated and dependent on external services.
    // b) A complex setup to inject a mock LLM into the child process, which is beyond the scope of this test suite.
    // The agent loop's functionality is thoroughly tested with a mock LLM in the integration tests (`tests/integration/workflow.test.ts`).
    // This E2E test focuses on verifying the MCP server's protocol compliance and basic request/response handling.

    await writer.end();
  }, 20000); // Increase timeout for spawning process
});