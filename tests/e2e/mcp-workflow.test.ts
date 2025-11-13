import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import type { ChildProcessWithoutNullStreams } from 'child_process';
import {
  createTestHarness,
  cleanupTestHarness,
  type TestHarnessState,
} from '../lib/test-harness';
import {
  spawnServer,
  writeMCPRequest,
  readMCPMessages,
  type MCPMessage,
} from '../lib/test-util';
import type {
  MCPNotification,
  MCPResponse,
  AppConfig,
  ChatMessage,
  ListToolsResult,
} from '../../src/types';
import { queryLLMWithRetries } from '../../src/core/llm';

// Mock the entire LLM module to control agent behavior
jest.mock('../../src/core/llm', () => ({
  queryLLMWithRetries: jest.fn(),
}));

// Cast the mock for type safety in tests
const mockedQueryLLM = queryLLMWithRetries as jest.Mock<
  Promise<string>,
  [ChatMessage[], AppConfig]
>;

describe('MCP Workflow E2E Tests', () => {
  let harness: TestHarnessState;
  let serverProcess: ChildProcessWithoutNullStreams;

  beforeEach(async () => {
    harness = await createTestHarness();
    mockedQueryLLM.mockClear();
  });

  afterEach(async () => {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill();
    }
    await cleanupTestHarness(harness);
  });

  it('should initialize, list tools, and execute a simple query', async () => {
    // 1. Arrange
    mockedQueryLLM
      .mockResolvedValueOnce(
        `<think>Okay, creating the file.</think>
         <typescript>await mem.writeFile('hello.txt', 'world');</typescript>`
      )
      .mockResolvedValueOnce(
        `<think>Committing the file.</think>
         <typescript>await mem.commitChanges('feat: create hello.txt');</typescript>
         <reply>File created and committed.</reply>`
      );

    // 2. Act
    serverProcess = spawnServer(harness);
    const messages = readMCPMessages(serverProcess);

    // Handshake
    writeMCPRequest(serverProcess, {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { clientInfo: { name: 'test-client' } },
    });
    const initResponse = (await messages.next()).value as MCPResponse;
    expect(initResponse.id).toBe(1);
    expect(initResponse.result).toBeDefined();

    writeMCPRequest(serverProcess, {
      jsonrpc: '2.0',
      id: 2,
      method: 'list_tools',
    });
    const listToolsResponse = (await messages.next()).value as MCPResponse;
    expect(listToolsResponse.id).toBe(2);
    expect((listToolsResponse.result as ListToolsResult).tools).toHaveLength(1);

    // Execute
    writeMCPRequest(serverProcess, {
      jsonrpc: '2.0',
      id: 3,
      method: 'execute_tool',
      params: { name: 'process_query', args: { query: 'create file' } },
    });

    const notifications: MCPNotification[] = [];
    let finalResponse: MCPResponse | undefined;

    for await (const message of messages) {
      if ('id' in message) {
        finalResponse = message as MCPResponse;
        break;
      } else {
        notifications.push(message as MCPNotification);
      }
    }

    // 3. Assert
    expect(notifications.length).toBeGreaterThanOrEqual(2);
    expect(
      notifications.some((n) => n.method === 'mcp/log/info')
    ).toBeTruthy();

    expect(finalResponse).toBeDefined();
    expect(finalResponse?.id).toBe(3);
    const result: { reply: string } = JSON.parse(
      (finalResponse?.result as string) ?? '{}'
    );
    expect(result.reply).toBe('File created and committed.');

    // Verify side-effects
    expect(await harness.mem.fileExists('hello.txt')).toBe(true);
    const log = await harness.git.log();
    expect(log.latest?.message).toBe('feat: create hello.txt');
  });

  it('should correctly handle the Dr. Aris Thorne example', async () => {
    // 1. Arrange
    const turn1Response = `<think>Got it. I'll create pages for Dr. Aris Thorne and the AI Research Institute, and link them together.</think>
<typescript>
const orgPath = 'AI Research Institute.md';
if (!await mem.fileExists(orgPath)) {
  await mem.writeFile(orgPath, \`- # AI Research Institute
  - type:: organization\`);
}
await mem.writeFile('Dr. Aris Thorne.md', \`- # Dr. Aris Thorne
  - type:: person
  - affiliation:: [[AI Research Institute]]
  - field:: [[Symbolic Reasoning]]\`);
</typescript>`;
    const turn2Response = `<think>Okay, I'm saving those changes to your permanent knowledge base.</think>
<typescript>
await mem.commitChanges('feat: Add Dr. Aris Thorne and AI Research Institute entities');
</typescript>
<reply>Done. I've created pages for both Dr. Aris Thorne and the AI Research Institute and linked them.</reply>`;

    mockedQueryLLM
      .mockResolvedValueOnce(turn1Response)
      .mockResolvedValueOnce(turn2Response);

    // 2. Act
    serverProcess = spawnServer(harness);
    const messages = readMCPMessages(serverProcess);
    writeMCPRequest(serverProcess, {
      jsonrpc: '2.0',
      id: 1,
      method: 'execute_tool',
      params: {
        name: 'process_query',
        args: { query: 'Create Dr. Aris Thorne' },
      },
    });

    let finalResponse: MCPResponse | undefined;
    for await (const message of messages) {
      if ('id' in message) {
        finalResponse = message as MCPResponse;
        break;
      }
    }

    // 3. Assert
    const result: { reply: string } = JSON.parse(
      (finalResponse?.result as string) ?? '{}'
    );
    expect(result.reply).toBe(
      "Done. I've created pages for both Dr. Aris Thorne and the AI Research Institute and linked them."
    );

    const thorneContent = await harness.mem.readFile('Dr. Aris Thorne.md');
    expect(thorneContent).toContain('affiliation:: [[AI Research Institute]]');

    expect(await harness.mem.fileExists('AI Research Institute.md')).toBe(true);

    const log = await harness.git.log();
    expect(log.latest?.message).toBe(
      'feat: Add Dr. Aris Thorne and AI Research Institute entities'
    );
  });

  it('should save a checkpoint and successfully revert to it', async () => {
    // 1. Arrange
    mockedQueryLLM
      .mockResolvedValueOnce(
        `<think>Writing file 1.</think>
         <typescript>await mem.writeFile('file1.md', 'content1');</typescript>`
      )
      .mockResolvedValueOnce(
        `<think>Saving checkpoint.</think>
         <typescript>await mem.saveCheckpoint();</typescript>`
      )
      .mockResolvedValueOnce(
        `<think>Writing file 2.</think>
         <typescript>await mem.writeFile('file2.md', 'content2');</typescript>`
      )
      .mockResolvedValueOnce(
        `<think>Reverting to checkpoint.</think>
         <typescript>await mem.revertToLastCheckpoint();</typescript>`
      )
      .mockResolvedValueOnce(
        `<think>Committing.</think>
         <typescript>await mem.commitChanges('feat: add file1 only');</typescript>
         <reply>Reverted and committed.</reply>`
      );

    // 2. Act
    serverProcess = spawnServer(harness);
    const messages = readMCPMessages(serverProcess);
    writeMCPRequest(serverProcess, {
      jsonrpc: '2.0',
      id: 1,
      method: 'execute_tool',
      params: { name: 'process_query', args: { query: 'test checkpoints' } },
    });

    let finalResponse: MCPResponse | undefined;
    for await (const message of messages) {
      if ('id' in message) {
        finalResponse = message as MCPResponse;
        break;
      }
    }

    // 3. Assert
    const result: { reply: string } = JSON.parse(
      (finalResponse?.result as string) ?? '{}'
    );
    expect(result.reply).toBe('Reverted and committed.');
    expect(await harness.mem.fileExists('file1.md')).toBe(true);
    expect(await harness.mem.fileExists('file2.md')).toBe(false);

    const log = await harness.git.log();
    expect(log.latest?.message).toBe('feat: add file1 only');
  });

  it('should block and gracefully handle path traversal attempts', async () => {
    // 1. Arrange
    mockedQueryLLM
      .mockResolvedValueOnce(
        `<think>I will try to read a sensitive file.</think>
         <typescript>await mem.readFile('../../../../etc/hosts');</typescript>`
      )
      .mockResolvedValueOnce(
        `<think>The previous action failed as expected due to security. I will inform the user.</think>
         <reply>I was unable to access that file due to security restrictions.</reply>`
      );

    // 2. Act
    serverProcess = spawnServer(harness);
    const messages = readMCPMessages(serverProcess);
    writeMCPRequest(serverProcess, {
      jsonrpc: '2.0',
      id: 1,
      method: 'execute_tool',
      params: {
        name: 'process_query',
        args: { query: 'read sensitive file' },
      },
    });

    const notifications: MCPNotification[] = [];
    let finalResponse: MCPResponse | undefined;

    for await (const message of messages) {
      if ('id' in message) {
        finalResponse = message;
        break;
      }
      notifications.push(message as MCPNotification);
    }

    // 3. Assert
    const errorNotification = notifications.find(
      (n) => n.method === 'mcp/log/error'
    );
    expect(errorNotification).toBeDefined();
    expect((errorNotification?.params as { message: string }).message).toContain(
      'Path traversal attempt detected'
    );

    const result: { reply: string } = JSON.parse(
      (finalResponse?.result as string) ?? '{}'
    );
    expect(result.reply).toBe(
      'I was unable to access that file due to security restrictions.'
    );
  });
});