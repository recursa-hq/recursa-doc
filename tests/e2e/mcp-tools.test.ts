import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { FastMCP } from 'fastmcp';
import {
  createTestHarness,
  cleanupTestHarness,
  createMockQueryLLM,
  type TestHarnessState,
} from '../lib/test-harness';
import { getFreePort } from '../lib/test-util';
import { createMcpServer } from '../../src/server';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
// Polyfill EventSource for Node.js environment
import EventSource from 'eventsource';

// @ts-ignore
global.EventSource = EventSource;

describe('MCP Tools E2E Tests (Real Client -> Server -> Agent)', () => {
  let harness: TestHarnessState;
  let server: FastMCP;
  let client: Client;
  let serverPort: number;

  beforeEach(async () => {
    harness = await createTestHarness();
  });

  afterEach(async () => {
    if (client) {
      await client.close();
    }
    if (server) {
      if (server.stop) await server.stop();
    }
    await cleanupTestHarness(harness);
  });

  const startServerAndConnectClient = async (mockLLM: ReturnType<typeof createMockQueryLLM>) => {
    // 1. Create Server with Mock LLM
    server = await createMcpServer(harness.mockConfig, {
      queryLLM: mockLLM,
    });

    // 2. Start Server on a free port using SSE
    serverPort = await getFreePort();
    
    await server.start({
      transportType: 'sse',
      sse: { endpoint: '/sse', port: serverPort },
    });

    // 3. Connect Client
    const transport = new SSEClientTransport(
      new URL(`http://localhost:${serverPort}/sse`)
    );
    client = new Client(
      {
        name: 'test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);
  };

  it('should perform file operations via MCP (Create & Read)', async () => {
    // Arrange: Mock LLM to write a file
    const mockLLM = createMockQueryLLM([
      `<think>Creating a test file via MCP.</think>
       <typescript>await mem.writeFile('mcp-test.txt', 'content from mcp');</typescript>
       <reply>File created.</reply>`,
    ]);

    await startServerAndConnectClient(mockLLM);

    // Act: Call the tool via MCP Client
    const result = await client.callTool({
      name: 'process_query',
      arguments: {
        query: 'Create a file named mcp-test.txt',
        runId: 'test-run-1',
      },
    });

    // Assert: Check result content
    if (!result || !result.content || !Array.isArray(result.content) || result.content.length === 0) {
        throw new Error('Invalid result structure');
    }
    const firstItem = result.content[0];
    if (firstItem.type !== 'text') {
        throw new Error('Expected text content');
    }
    const content = firstItem.text;
    const parsed = JSON.parse(content);
    expect(parsed.reply).toBe('File created.');

    // Assert: Check side-effects on filesystem
    const fileExists = await harness.mem.fileExists('mcp-test.txt');
    expect(fileExists).toBe(true);
    const fileContent = await harness.mem.readFile('mcp-test.txt');
    expect(fileContent).toBe('content from mcp');
  });

  it('should perform git operations via MCP (Commit & Log)', async () => {
    // Arrange: Mock LLM to commit changes
    const mockLLM = createMockQueryLLM([
      `<think>Committing changes.</think>
       <typescript>await mem.writeFile('git-test.txt', 'v1'); await mem.commitChanges('feat: mcp commit');</typescript>
       <reply>Committed.</reply>`,
    ]);

    await startServerAndConnectClient(mockLLM);

    // Act
    const result = await client.callTool({
      name: 'process_query',
      arguments: {
        query: 'Create and commit a file',
        runId: 'test-run-2',
      },
    });

    // Assert
    if (!result || !result.content || !Array.isArray(result.content) || result.content.length === 0) {
      throw new Error('Invalid result structure');
    }
    const firstItem = result.content[0];
    if (firstItem.type !== 'text') {
      throw new Error('Expected text content');
    }
    const parsed = JSON.parse(firstItem.text);
    expect(parsed.reply).toBe('Committed.');

    // Verify Git Log
    const log = await harness.git.log();
    expect(log.latest?.message).toBe('feat: mcp commit');
  });

  it('should perform graph operations via MCP (Query)', async () => {
    // Arrange: Create some files in the graph first
    await harness.mem.writeFile('Person.md', '- # Person\n  - type:: person\n  - name:: John Doe');
    await harness.mem.writeFile('Project.md', '- # Project\n  - type:: project\n  - lead:: [[John Doe]]');

    // Arrange: Mock LLM to query the graph
    const mockLLM = createMockQueryLLM([
      `<think>Querying the graph for persons.</think>
       <typescript>
         const results = await mem.queryGraph('(property type:: person)');
         const paths = results.map(r => r.filePath);
         console.log(paths);
       </typescript>
       <reply>Found persons.</reply>`,
    ]);

    await startServerAndConnectClient(mockLLM);

    // Act
    const result = await client.callTool({
      name: 'process_query',
      arguments: {
        query: 'Find all people',
        runId: 'test-run-graph',
      },
    });

    // Assert
    if (!result || !result.content || !Array.isArray(result.content) || result.content.length === 0) {
      throw new Error('Invalid result structure');
    }
    const firstItem = result.content[0];
    if (firstItem.type !== 'text') {
      throw new Error('Expected text content');
    }
    const parsed = JSON.parse(firstItem.text);
    expect(parsed.reply).toBe('Found persons.');
    // We rely on the fact that the agent ran successfully. 
    // In a real scenario, the agent would use the query results in its reply.
  });

  it('should perform state operations via MCP (Checkpoints)', async () => {
    // Arrange: Mock LLM to save and revert checkpoint
    const mockLLM = createMockQueryLLM([
      `<think>Testing checkpoints.</think>
       <typescript>
         await mem.writeFile('check.txt', 'initial');
         await mem.saveCheckpoint();
         await mem.writeFile('check.txt', 'modified');
         await mem.revertToLastCheckpoint();
       </typescript>
       <reply>Reverted.</reply>`,
    ]);

    await startServerAndConnectClient(mockLLM);

    // Act
    const result = await client.callTool({
      name: 'process_query',
      arguments: {
        query: 'Test checkpoints',
        runId: 'test-run-state',
      },
    });

    // Assert
    if (!result || !result.content || !Array.isArray(result.content) || result.content.length === 0) {
      throw new Error('Invalid result structure');
    }
    const firstItem = result.content[0];
    if (firstItem.type !== 'text') {
      throw new Error('Expected text content');
    }
    const parsed = JSON.parse(firstItem.text);
    expect(parsed.reply).toBe('Reverted.');

    // Verify file content was reverted
    const content = await harness.mem.readFile('check.txt');
    expect(content).toBe('initial');
  });

  it('should perform utility operations via MCP (Token Count)', async () => {
    // Arrange: Mock LLM to count tokens
    await harness.mem.writeFile('long.txt', 'word '.repeat(100));

    const mockLLM = createMockQueryLLM([
      `<think>Counting tokens.</think>
       <typescript>
         const count = await mem.getTokenCount('long.txt');
       </typescript>
       <reply>Counted tokens.</reply>`,
    ]);

    await startServerAndConnectClient(mockLLM);

    // Act
    const result = await client.callTool({
      name: 'process_query',
      arguments: {
        query: 'Count tokens',
        runId: 'test-run-util',
      },
    });

    // Assert
    if (!result || !result.content || !Array.isArray(result.content) || result.content.length === 0) {
      throw new Error('Invalid result structure');
    }
    const firstItem = result.content[0];
    if (firstItem.type !== 'text') {
      throw new Error('Expected text content');
    }
    const parsed = JSON.parse(firstItem.text);
    expect(parsed.reply).toBe('Counted tokens.');
  });

  it('should return error response via MCP when sandbox fails', async () => {
    // Arrange: Mock LLM to throw error
    const mockLLM = createMockQueryLLM([
      `<think>This will fail.</think>
       <typescript>throw new Error('Sandbox Explosion');</typescript>`,
       // The loop catches the error and feeds it back to LLM. 
       // The LLM normally tries to fix it. 
       // Let's make the LLM give up or explain the error in next turn.
       `<think>I see it failed.</think>
       <reply>Operation failed due to Sandbox Explosion.</reply>`
    ]);

    await startServerAndConnectClient(mockLLM);

    // Act
    const result = await client.callTool({
      name: 'process_query',
      arguments: {
        query: 'Make it crash',
        runId: 'test-run-error',
      },
    });

    // Assert
    if (!result || !result.content || !Array.isArray(result.content) || result.content.length === 0) {
      throw new Error('Invalid result structure');
    }
    const firstItem = result.content[0];
    if (firstItem.type !== 'text') {
      throw new Error('Expected text content');
    }
    const parsed = JSON.parse(firstItem.text);
    expect(parsed.reply).toBe('Operation failed due to Sandbox Explosion.');
  });
});