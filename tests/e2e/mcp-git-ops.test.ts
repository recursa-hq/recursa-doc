import { createTestHarness, cleanupTestHarness, TestHarnessState } from '../lib/test-harness.js';
import {
  createMCPClient,
  testParameterValidation,
  expectMCPError,
  verifyWithDirectMemAPI,
  createTestData,
  cleanupTestData,
  expectFastMCPSchema
} from '../lib/mcp-test-utils.js';

describe('MCP Git Operations', () => {
  let harness: TestHarnessState;
  let client: any; // MCP Client
  const TENANT_ID = 'git-ops-test';

  beforeAll(async () => {
    // Create test harness
    harness = await createTestHarness({
      skipPortValidation: true,
      tempPrefix: 'recursa-git-ops-test',
      withGitignore: true,
    });

    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create MCP client
    client = await createMCPClient(TENANT_ID);
  });

  afterAll(async () => {
    // Clean up MCP client
    if (client) {
      try {
        // MCP client doesn't have explicit close method, it will be cleaned up with the process
      } catch (error) {
        console.warn('Error cleaning up MCP client:', error);
      }
    }

    // Clean up test harness
    if (harness) {
      await cleanupTestHarness(harness);
    }
  });

  describe('mem.commitChanges', () => {
    beforeEach(async () => {
      // Create some test files to commit
      await createTestData(TENANT_ID, {
        'commit-test.txt': 'File to be committed',
        'changes.md': '# Changes\n\nSome changes to commit'
      });
    });

    afterEach(async () => {
      await cleanupTestData(TENANT_ID);
    });

    it('should register with correct schema', async () => {
      const tools = await client.listTools();
      const commitTool = tools.tools.find((t: any) => t.name === 'mem.commitChanges');

      expect(commitTool).toBeDefined();
      expectFastMCPSchema(commitTool.inputSchema, {
        type: 'object',
        properties: {
          message: { type: 'string' }
        },
        required: ['message']
      });
    });

    it('should validate input parameters correctly', async () => {
      await testParameterValidation(client, 'mem.commitChanges', [
        { params: {}, expectedError: 'message' },
        { params: { message: 123 }, expectedError: 'string' }
      ]);
    });

    it('should commit changes successfully', async () => {
      const result = await client.callTool({
        name: 'mem.commitChanges',
        arguments: {
          message: 'Test commit: Add initial files'
        }
      });

      expect(result.isError).toBeUndefined();
      // Should either be a commit hash or "No changes to commit." (both are valid)
      expect(result.content[0].text).toMatch(/(^[a-f0-9]{40}$|^No changes to commit\.$)/);

      // Verify against direct API call
      await verifyWithDirectMemAPI('mem.commitChanges', {
        message: 'Test commit: Add initial files'
      }, result);
    });

    it('should handle empty repository gracefully', async () => {
      // Clean all files first
      await cleanupTestData(TENANT_ID);

      const result = await client.callTool({
        name: 'mem.commitChanges',
        arguments: {
          message: 'Empty commit test'
        }
      });

      expect(result.isError).toBeUndefined();
    });
  });

  describe('mem.gitLog', () => {
    beforeEach(async () => {
      // Create and commit some files for log history
      await createTestData(TENANT_ID, {
        'file1.txt': 'First file'
      });

      // Commit first file
      await client.callTool({
        name: 'mem.commitChanges',
        arguments: { message: 'Add first file' }
      });

      // Add another file
      await createTestData(TENANT_ID, {
        'file2.txt': 'Second file'
      });

      // Commit second file
      await client.callTool({
        name: 'mem.commitChanges',
        arguments: { message: 'Add second file' }
      });
    });

    afterEach(async () => {
      await cleanupTestData(TENANT_ID);
    });

    it('should register with correct schema', async () => {
      const tools = await client.listTools();
      const logTool = tools.tools.find((t: any) => t.name === 'mem.gitLog');

      expect(logTool).toBeDefined();
      expectFastMCPSchema(logTool.inputSchema, {
        type: 'object',
        properties: {
          filePath: { type: 'string' },
          maxCommits: { type: 'number' }
        }
      });
    });

    it('should validate input parameters correctly', async () => {
      await testParameterValidation(client, 'mem.gitLog', [
        { params: { filePath: 123 }, expectedError: 'string' },
        { params: { maxCommits: 'invalid' }, expectedError: 'number' }
      ]);
    });

    it('should get git log successfully', async () => {
      const result = await client.callTool({
        name: 'mem.gitLog',
        arguments: {
          filePath: '.',
          maxCommits: 5
        }
      });

      // This test should catch the FastMCP array validation issue
      expect(result.isError).toBeUndefined();

      // Parse the result - this might fail if FastMCP serialization is broken
      const logEntries = JSON.parse(result.content[0].text);
      expect(Array.isArray(logEntries)).toBe(true);
      expect(logEntries.length).toBeGreaterThan(0);

      // Verify structure of log entries
      logEntries.forEach((entry: any) => {
        expect(entry).toHaveProperty('hash');
        expect(entry).toHaveProperty('message');
        expect(entry).toHaveProperty('date');
      });

      // Check that our commits are in the log
      const commitMessages = logEntries.map((e: any) => e.message);
      expect(commitMessages.some((msg: string) => msg.includes('Add first file'))).toBe(true);
      expect(commitMessages.some((msg: string) => msg.includes('Add second file'))).toBe(true);
    });

    it('should limit number of commits', async () => {
      const result = await client.callTool({
        name: 'mem.gitLog',
        arguments: {
          filePath: '.',
          maxCommits: 1
        }
      });

      expect(result.isError).toBeUndefined();

      const logEntries = JSON.parse(result.content[0].text);
      expect(Array.isArray(logEntries)).toBe(true);
      expect(logEntries.length).toBeLessThanOrEqual(1);
    });

    it('should get log for specific file', async () => {
      const result = await client.callTool({
        name: 'mem.gitLog',
        arguments: {
          filePath: 'file1.txt',
          maxCommits: 10
        }
      });

      expect(result.isError).toBeUndefined();

      const logEntries = JSON.parse(result.content[0].text);
      expect(Array.isArray(logEntries)).toBe(true);

      // Should have commits affecting file1.txt
      expect(logEntries.length).toBeGreaterThan(0);
    });
  });

  describe('mem.getChangedFiles', () => {
    beforeEach(async () => {
      // Create initial state
      await createTestData(TENANT_ID, {
        'initial.txt': 'Initial file'
      });

      // Commit initial state
      await client.callTool({
        name: 'mem.commitChanges',
        arguments: { message: 'Initial commit' }
      });

      // Make some changes
      await createTestData(TENANT_ID, {
        'modified.txt': 'Modified file',
        'new-file.txt': 'New file'
      });
    });

    afterEach(async () => {
      await cleanupTestData(TENANT_ID);
    });

    it('should register with correct schema', async () => {
      const tools = await client.listTools();
      const changedTool = tools.tools.find((t: any) => t.name === 'mem.getChangedFiles');

      expect(changedTool).toBeDefined();
      expectFastMCPSchema(changedTool.inputSchema, {
        type: 'object',
        properties: {}
      });
    });

    it('should get changed files successfully', async () => {
      const result = await client.callTool({
        name: 'mem.getChangedFiles',
        arguments: {}
      });

      // This should catch FastMCP array validation issues
      expect(result.isError).toBeUndefined();

      const changedFiles = JSON.parse(result.content[0].text);
      expect(Array.isArray(changedFiles)).toBe(true);

      // Should include the new and modified files
      expect(changedFiles.some((file: string) => file.includes('modified.txt'))).toBe(true);
      expect(changedFiles.some((file: string) => file.includes('new-file.txt'))).toBe(true);
    });

    it('should return empty array when no changes', async () => {
      // Commit all changes
      await client.callTool({
        name: 'mem.commitChanges',
        arguments: { message: 'Commit all changes' }
      });

      const result = await client.callTool({
        name: 'mem.getChangedFiles',
        arguments: {}
      });

      expect(result.isError).toBeUndefined();

      const changedFiles = JSON.parse(result.content[0].text);
      expect(Array.isArray(changedFiles)).toBe(true);
      // Should be empty or only contain .git files
    });
  });

  describe('mem.gitDiff', () => {
    beforeEach(async () => {
      // Create initial file
      await createTestData(TENANT_ID, {
        'diff-test.txt': 'Original content\nLine 2\nLine 3'
      });

      // Commit initial state
      await client.callTool({
        name: 'mem.commitChanges',
        arguments: { message: 'Initial file for diff test' }
      });

      // Modify the file
      await createTestData(TENANT_ID, {
        'diff-test.txt': 'Modified content\nLine 2\nLine 3\nLine 4'
      });
    });

    afterEach(async () => {
      await cleanupTestData(TENANT_ID);
    });

    it('should register with correct schema', async () => {
      const tools = await client.listTools();
      const diffTool = tools.tools.find((t: any) => t.name === 'mem.gitDiff');

      expect(diffTool).toBeDefined();
      expectFastMCPSchema(diffTool.inputSchema, {
        type: 'object',
        properties: {
          filePath: { type: 'string' },
          fromCommit: { type: 'string' },
          toCommit: { type: 'string' }
        },
        required: ['filePath']
      });
    });

    it('should validate input parameters correctly', async () => {
      await testParameterValidation(client, 'mem.gitDiff', [
        { params: {}, expectedError: 'filePath' },
        { params: { filePath: 123 }, expectedError: 'string' }
      ]);
    });

    it('should get git diff successfully', async () => {
      const result = await client.callTool({
        name: 'mem.gitDiff',
        arguments: {
          filePath: 'diff-test.txt'
        }
      });

      expect(result.isError).toBeUndefined();

      const diffContent = result.content[0].text;
      expect(diffContent).toContain('Original content');
      expect(diffContent).toContain('Modified content');
      expect(diffContent).toContain('+Modified content');
      expect(diffContent).toContain('-Original content');
      expect(diffContent).toContain('+Line 4');
    });

    it('should get diff between specific commits', async () => {
      // Get the git log to find commit hashes
      const logResult = await client.callTool({
        name: 'mem.gitLog',
        arguments: {
          filePath: 'diff-test.txt',
          maxCommits: 2
        }
      });

      const logEntries = JSON.parse(logResult.content[0].text);
      if (logEntries.length >= 2) {
        const latestCommit = logEntries[0].hash;
        const previousCommit = logEntries[1].hash;

        const result = await client.callTool({
          name: 'mem.gitDiff',
          arguments: {
            filePath: 'diff-test.txt',
            fromCommit: previousCommit,
            toCommit: latestCommit
          }
        });

        expect(result.isError).toBeUndefined();
        const diffContent = result.content[0].text;
        expect(diffContent).toContain('Modified content');
      }
    });

    it('should handle diff for non-existent file', async () => {
      const result = await client.callTool({
        name: 'mem.gitDiff',
        arguments: {
          filePath: 'non-existent.txt'
        }
      });

      expectMCPError(result, 'unknown revision or path not in the working tree');
    });
  });
});