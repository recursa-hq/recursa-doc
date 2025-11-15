import { createTestHarness, cleanupTestHarness, TestHarnessState } from '../lib/test-harness.js';
import {
  createMCPClient,
  testParameterValidation,
  expectMCPError,
  expectFastMCPSchema,
  verifyWithDirectMemAPI,
  createTestData,
  cleanupTestData,
  createMarkdownContent
} from '../lib/mcp-test-utils.js';

describe('MCP State Management', () => {
  let harness: TestHarnessState;
  let client: any; // MCP Client
  const TENANT_ID = 'state-ops-test';

  beforeAll(async () => {
    // Create test harness
    harness = await createTestHarness({
      skipPortValidation: true,
      tempPrefix: 'recursa-state-ops-test',
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

  describe('mem.saveCheckpoint', () => {
    beforeEach(async () => {
      // Create initial state
      await createTestData(TENANT_ID, {
        'checkpoint-test.txt': 'Initial state',
        'data.json': '{ "initial": true }'
      });

      // Commit initial state
      await client.callTool({
        name: 'mem.commitChanges',
        arguments: { message: 'Initial commit for checkpoint test' }
      });
    });

    afterEach(async () => {
      await cleanupTestData(TENANT_ID);
    });

    it('should register with correct schema', async () => {
      const tools = await client.listTools();
      const saveTool = tools.tools.find((t: any) => t.name === 'mem.saveCheckpoint');

      expect(saveTool).toBeDefined();
      expectFastMCPSchema(saveTool.inputSchema, {
        type: 'object',
        properties: {}
      });
    });

    it('should validate input parameters correctly', async () => {
      // saveCheckpoint takes no parameters, but we should test that extra params are handled
      const result = await client.callTool({
        name: 'mem.saveCheckpoint',
        arguments: { extra: 'param' }
      });

      // Should either succeed (ignoring extra params) or fail gracefully
      expect(result.content[0].text).toBeDefined();
    });

    it('should save checkpoint successfully', async () => {
      // Make some changes
      await createTestData(TENANT_ID, {
        'new-file.txt': 'New file after checkpoint',
        'checkpoint-test.txt': 'Modified state'
      });

      const result = await client.callTool({
        name: 'mem.saveCheckpoint',
        arguments: {}
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('true');

      // Verify against direct API call
      await verifyWithDirectMemAPI('mem.saveCheckpoint', {}, result);
    });

    it('should save checkpoint with no changes', async () => {
      const result = await client.callTool({
        name: 'mem.saveCheckpoint',
        arguments: {}
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('true');
    });

    it('should handle multiple checkpoints', async () => {
      // First checkpoint
      await createTestData(TENANT_ID, {
        'checkpoint1.txt': 'First checkpoint'
      });

      const result1 = await client.callTool({
        name: 'mem.saveCheckpoint',
        arguments: {}
      });

      expect(result1.isError).toBeUndefined();

      // Second checkpoint
      await createTestData(TENANT_ID, {
        'checkpoint2.txt': 'Second checkpoint'
      });

      const result2 = await client.callTool({
        name: 'mem.saveCheckpoint',
        arguments: {}
      });

      expect(result2.isError).toBeUndefined();
      expect(result2.content[0].text).toBe('true');
    });
  });

  describe('mem.revertToLastCheckpoint', () => {
    beforeEach(async () => {
      // Create initial state
      await createTestData(TENANT_ID, {
        'revert-test.txt': 'Initial state before checkpoint',
        'original.txt': 'Original file'
      });

      // Commit initial state
      await client.callTool({
        name: 'mem.commitChanges',
        arguments: { message: 'Initial commit for revert test' }
      });

      // Save checkpoint
      await createTestData(TENANT_ID, {
        'checkpoint-file.txt': 'File created for checkpoint'
      });

      await client.callTool({
        name: 'mem.saveCheckpoint',
        arguments: {}
      });
    });

    afterEach(async () => {
      await cleanupTestData(TENANT_ID);
    });

    it('should register with correct schema', async () => {
      const tools = await client.listTools();
      const revertTool = tools.tools.find((t: any) => t.name === 'mem.revertToLastCheckpoint');

      expect(revertTool).toBeDefined();
      expectFastMCPSchema(revertTool.inputSchema, {
        type: 'object',
        properties: {}
      });
    });

    it('should validate input parameters correctly', async () => {
      const result = await client.callTool({
        name: 'mem.revertToLastCheckpoint',
        arguments: { extra: 'param' }
      });

      // Should either succeed (ignoring extra params) or fail gracefully
      expect(result.content[0].text).toBeDefined();
    });

    it('should revert to last checkpoint successfully', async () => {
      // Make changes after checkpoint
      await createTestData(TENANT_ID, {
        'new-change.txt': 'This should be reverted',
        'revert-test.txt': 'Modified after checkpoint'
      });

      // Verify changes exist
      const existsBefore = await client.callTool({
        name: 'mem.fileExists',
        arguments: { filePath: 'new-change.txt' }
      });
      expect(existsBefore.content[0].text).toBe('true');

      // Revert to checkpoint
      const result = await client.callTool({
        name: 'mem.revertToLastCheckpoint',
        arguments: {}
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('true');

      // Verify against direct API call
      await verifyWithDirectMemAPI('mem.revertToLastCheckpoint', {}, result);

      // Verify changes were reverted
      const existsAfter = await client.callTool({
        name: 'mem.fileExists',
        arguments: { filePath: 'new-change.txt' }
      });
      expect(existsAfter.content[0].text).toBe('false');

      // Verify checkpoint state was restored
      const checkpointFileExists = await client.callTool({
        name: 'mem.fileExists',
        arguments: { filePath: 'checkpoint-file.txt' }
      });
      expect(checkpointFileExists.content[0].text).toBe('true');

      const originalFileExists = await client.callTool({
        name: 'mem.fileExists',
        arguments: { filePath: 'original.txt' }
      });
      expect(originalFileExists.content[0].text).toBe('true');
    });

    it('should handle revert with no checkpoint saved', async () => {
      // Clean tenant directory first
      await cleanupTestData(TENANT_ID);

      const result = await client.callTool({
        name: 'mem.revertToLastCheckpoint',
        arguments: {}
      });

      expect(result.isError).toBeUndefined();
      // Should handle gracefully - either succeed or provide meaningful error
      expect(result.content[0].text).toBeDefined();
    });

    it('should revert to correct checkpoint when multiple exist', async () => {
      // Create multiple checkpoints
      await createTestData(TENANT_ID, {
        'first-checkpoint.txt': 'First checkpoint file'
      });

      await client.callTool({
        name: 'mem.saveCheckpoint',
        arguments: {}
      });

      await createTestData(TENANT_ID, {
        'second-checkpoint.txt': 'Second checkpoint file'
      });

      await client.callTool({
        name: 'mem.saveCheckpoint',
        arguments: {}
      });

      // Add changes after last checkpoint
      await createTestData(TENANT_ID, {
        'post-checkpoint.txt': 'Should be reverted'
      });

      // Revert - should go to second checkpoint (most recent)
      const result = await client.callTool({
        name: 'mem.revertToLastCheckpoint',
        arguments: {}
      });

      expect(result.isError).toBeUndefined();

      // Verify state
      const firstCheckpointExists = await client.callTool({
        name: 'mem.fileExists',
        arguments: { filePath: 'first-checkpoint.txt' }
      });
      expect(firstCheckpointExists.content[0].text).toBe('true');

      const secondCheckpointExists = await client.callTool({
        name: 'mem.fileExists',
        arguments: { filePath: 'second-checkpoint.txt' }
      });
      expect(secondCheckpointExists.content[0].text).toBe('true');

      const postCheckpointExists = await client.callTool({
        name: 'mem.fileExists',
        arguments: { filePath: 'post-checkpoint.txt' }
      });
      expect(postCheckpointExists.content[0].text).toBe('false');
    });
  });

  describe('mem.discardChanges', () => {
    beforeEach(async () => {
      // Create initial committed state
      await createTestData(TENANT_ID, {
        'committed-file.txt': 'Committed content',
        'stable.txt': 'Stable content'
      });

      await client.callTool({
        name: 'mem.commitChanges',
        arguments: { message: 'Initial commit for discard test' }
      });
    });

    afterEach(async () => {
      await cleanupTestData(TENANT_ID);
    });

    it('should register with correct schema', async () => {
      const tools = await client.listTools();
      const discardTool = tools.tools.find((t: any) => t.name === 'mem.discardChanges');

      expect(discardTool).toBeDefined();
      expectFastMCPSchema(discardTool.inputSchema, {
        type: 'object',
        properties: {}
      });
    });

    it('should validate input parameters correctly', async () => {
      const result = await client.callTool({
        name: 'mem.discardChanges',
        arguments: { extra: 'param' }
      });

      // Should either succeed (ignoring extra params) or fail gracefully
      expect(result.content[0].text).toBeDefined();
    });

    it('should discard uncommitted changes successfully', async () => {
      // Make uncommitted changes
      await createTestData(TENANT_ID, {
        'uncommitted.txt': 'This should be discarded',
        'committed-file.txt': 'Modified uncommitted content'
      });

      // Verify changes exist
      const uncommittedExists = await client.callTool({
        name: 'mem.fileExists',
        arguments: { filePath: 'uncommitted.txt' }
      });
      expect(uncommittedExists.content[0].text).toBe('true');

      // Discard changes
      const result = await client.callTool({
        name: 'mem.discardChanges',
        arguments: {}
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('true');

      // Verify against direct API call
      await verifyWithDirectMemAPI('mem.discardChanges', {}, result);

      // Verify changes were discarded
      const uncommittedExistsAfter = await client.callTool({
        name: 'mem.fileExists',
        arguments: { filePath: 'uncommitted.txt' }
      });
      expect(uncommittedExistsAfter.content[0].text).toBe('false');

      // Verify committed content is restored
      const committedContent = await client.callTool({
        name: 'mem.readFile',
        arguments: { filePath: 'committed-file.txt' }
      });
      expect(committedContent.content[0].text).toBe('Committed content');

      // Verify stable content remains
      const stableContent = await client.callTool({
        name: 'mem.readFile',
        arguments: { filePath: 'stable.txt' }
      });
      expect(stableContent.content[0].text).toBe('Stable content');
    });

    it('should handle discard with no changes', async () => {
      const result = await client.callTool({
        name: 'mem.discardChanges',
        arguments: {}
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('true');

      // Should not affect existing committed files
      const committedExists = await client.callTool({
        name: 'mem.fileExists',
        arguments: { filePath: 'committed-file.txt' }
      });
      expect(committedExists.content[0].text).toBe('true');
    });

    it('should work after multiple changes', async () => {
      // Make multiple sets of changes
      await createTestData(TENANT_ID, {
        'change1.txt': 'First change'
      });

      await createTestData(TENANT_ID, {
        'change2.txt': 'Second change'
      });

      await createTestData(TENANT_ID, {
        'change3.txt': 'Third change'
      });

      // Discard all changes
      const result = await client.callTool({
        name: 'mem.discardChanges',
        arguments: {}
      });

      expect(result.isError).toBeUndefined();

      // Verify all uncommitted files are gone
      const change1Exists = await client.callTool({
        name: 'mem.fileExists',
        arguments: { filePath: 'change1.txt' }
      });
      expect(change1Exists.content[0].text).toBe('false');

      const change2Exists = await client.callTool({
        name: 'mem.fileExists',
        arguments: { filePath: 'change2.txt' }
      });
      expect(change2Exists.content[0].text).toBe('false');

      const change3Exists = await client.callTool({
        name: 'mem.fileExists',
        arguments: { filePath: 'change3.txt' }
      });
      expect(change3Exists.content[0].text).toBe('false');
    });

    it('should preserve committed state after discard', async () => {
      // Make some changes and commit them
      await createTestData(TENANT_ID, {
        'to-be-committed.txt': 'Will be committed'
      });

      await client.callTool({
        name: 'mem.commitChanges',
        arguments: { message: 'Commit some changes' }
      });

      // Make more changes (uncommitted)
      await createTestData(TENANT_ID, {
        'uncommitted.txt': 'Will be discarded'
      });

      // Discard uncommitted changes
      await client.callTool({
        name: 'mem.discardChanges',
        arguments: {}
      });

      // Verify committed file still exists
      const committedExists = await client.callTool({
        name: 'mem.fileExists',
        arguments: { filePath: 'to-be-committed.txt' }
      });
      expect(committedExists.content[0].text).toBe('true');

      // Verify uncommitted file was discarded
      const uncommittedExists = await client.callTool({
        name: 'mem.fileExists',
        arguments: { filePath: 'uncommitted.txt' }
      });
      expect(uncommittedExists.content[0].text).toBe('false');
    });
  });
});