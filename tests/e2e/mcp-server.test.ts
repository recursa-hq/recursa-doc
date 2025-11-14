import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from '@jest/globals';
import {
  createTestHarness,
  cleanupTestHarness,
  type TestHarnessState,
} from '../lib/test-harness';
import { spawn, type ChildProcess } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { memApiSchemas } from '../../src/mcp-schemas.js';
import path from 'path';
import { promises as fs } from 'fs';

// Helper function to wait for the server to be ready
const waitForServerReady = async (port: number) => {
  const url = `http://localhost:${port}/ready`;
  const maxRetries = 30; // ~15 seconds timeout
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Use global fetch
      const response = await fetch(url);
      if (response.ok) {
        console.log('MCP server is ready.');
        return;
      }
    } catch (error) {
      // Ignore connection errors (e.g., ECONNREFUSED) and retry
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Server did not become ready at ${url} within the timeout.`);
};

describe('MCP Server E2E Tests (Black Box)', () => {
  let harness: TestHarnessState;
  let serverProcess: ChildProcess;

  beforeAll(async () => {
    harness = await createTestHarness();

    const {
      recursaApiKey,
      knowledgeGraphPath,
      httpPort,
      openRouterApiKey,
    } = harness.mockConfig;

    serverProcess = spawn('tsx', ['src/server.ts'], {
      env: {
        ...process.env,
        RECURSA_API_KEY: recursaApiKey,
        KNOWLEDGE_GRAPH_PATH: knowledgeGraphPath,
        HTTP_PORT: String(httpPort),
        OPENROUTER_API_KEY: openRouterApiKey,
        // Ensure consistent git user for tests
        GIT_USER_NAME: harness.mockConfig.gitUserName,
        GIT_USER_EMAIL: harness.mockConfig.gitUserEmail,
      },
      // Uncomment for debugging server output:
      // stdio: 'inherit',
    });

    serverProcess.on('error', (err) => {
      console.error('Failed to start server process:', err);
    });

    await waitForServerReady(httpPort);
  }, 30000); // 30-second timeout for setup

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
    }
    if (harness) {
      await cleanupTestHarness(harness);
    }
  });

  const createTestClient = async (tenantId: string, apiKey?: string) => {
    const { httpPort, recursaApiKey } = harness.mockConfig;
    const finalApiKey = apiKey === undefined ? recursaApiKey : apiKey;

    const transport = new StreamableHTTPClientTransport(
      new URL(`http://localhost:${httpPort}/mcp`),
      {
        requestInit: {
          headers: {
            Authorization: `Bearer ${finalApiKey}`,
            'x-tenant-id': tenantId,
          },
        },
      },
    );

    const client = new Client({ name: 'e2e-test-client', version: '1.0.0' });
    await client.connect(transport);
    return client;
  };

  it('should fail to connect with an invalid API key', async () => {
    await expect(createTestClient('tenant-a', 'invalid-key')).rejects.toThrow(
      'Request failed with status 401 Unauthorized',
    );
  });

  it('should fail to connect without a tenant ID header', async () => {
    const { httpPort, recursaApiKey } = harness.mockConfig;
    const transport = new StreamableHTTPClientTransport(
      new URL(`http://localhost:${httpPort}/mcp`),
      {
        requestInit: {
          headers: { Authorization: `Bearer ${recursaApiKey}` }, // No tenant ID
        },
      },
    );
    const client = new Client({ name: 'e2e-test-client', version: '1.0.0' });
    await expect(client.connect(transport)).rejects.toThrow(
      'Request failed with status 400 Bad Request',
    );
  });

  it('should connect successfully and list all mem.* tools', async () => {
    const client = await createTestClient('default-tenant');
    const tools = await client.listTools();
    const toolNames = (tools as { name: string }[]).map(
      (t: { name: string }) => t.name,
    );

    const expectedToolNames = Object.keys(memApiSchemas).map(
      (key) => `mem.${key}`,
    );

    expect(toolNames).toEqual(expect.arrayContaining(expectedToolNames));
    expect(toolNames.length).toBe(expectedToolNames.length);
  });

  it('should execute a file write, commit, and log workflow', async () => {
    const client = await createTestClient('workflow-tenant');
    const filePath = 'test-file.txt';
    const content = 'hello from E2E test';
    const commitMessage = 'feat: add test file';

    // 1. Write file
    const writeResult = await client.callTool({
      name: 'mem.writeFile',
      arguments: { filePath, content },
    });
    expect(writeResult).toBe(true);

    // 2. Check if file exists
    const existsResult = await client.callTool({
      name: 'mem.fileExists',
      arguments: { filePath },
    });
    expect(existsResult).toBe(true);

    // 3. Commit changes
    const commitResult = await client.callTool({
      name: 'mem.commitChanges',
      arguments: { message: commitMessage },
    });
    expect(typeof commitResult).toBe('string'); // Returns commit hash
    expect(commitResult).toHaveLength(40);

    // 4. Check git log
    const logResult = await client.callTool({
      name: 'mem.gitLog',
      arguments: { maxCommits: 1 },
    });

    const log = logResult as Array<{ message: string }>;
    expect(log).toBeInstanceOf(Array);
    expect(log.length).toBeGreaterThan(0);
    expect(log[0]?.message).toBe(commitMessage);
  });

  it('should isolate file operations between tenants', async () => {
    const clientA = await createTestClient('tenant-a');
    const clientB = await createTestClient('tenant-b');

    // Tenant A creates a file
    await clientA.callTool({
      name: 'mem.writeFile',
      arguments: { filePath: 'file-a.txt', content: 'from tenant A' },
    });

    // Tenant B creates a file
    await clientB.callTool({
      name: 'mem.writeFile',
      arguments: { filePath: 'file-b.txt', content: 'from tenant B' },
    });

    // Tenant A should see its file, but not tenant B's
    expect(
      await clientA.callTool({
        name: 'mem.fileExists',
        arguments: { filePath: 'file-a.txt' },
      }),
    ).toBe(true);
    expect(
      await clientA.callTool({
        name: 'mem.fileExists',
        arguments: { filePath: 'file-b.txt' },
      }),
    ).toBe(false);

    // Tenant B should see its file, but not tenant A's
    expect(
      await clientB.callTool({
        name: 'mem.fileExists',
        arguments: { filePath: 'file-b.txt' },
      }),
    ).toBe(true);
    expect(
      await clientB.callTool({
        name: 'mem.fileExists',
        arguments: { filePath: 'file-a.txt' },
      }),
    ).toBe(false);

    // Verify on the actual filesystem
    const tenantAPath = path.join(
      harness.mockConfig.knowledgeGraphPath,
      'tenant-a',
      'file-a.txt',
    );
    const tenantBPath = path.join(
      harness.mockConfig.knowledgeGraphPath,
      'tenant-b',
      'file-b.txt',
    );

    await expect(fs.access(tenantAPath)).resolves.not.toThrow();
    await expect(fs.access(tenantBPath)).resolves.not.toThrow();

    const tenantAWrongPath = path.join(
      harness.mockConfig.knowledgeGraphPath,
      'tenant-a',
      'file-b.txt',
    );
    await expect(fs.access(tenantAWrongPath)).rejects.toThrow();
  });
});