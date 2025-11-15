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

describe('MCP File Operations', () => {
  let harness: TestHarnessState;
  let client: any; // MCP Client
  const TENANT_ID = 'file-ops-test';

  beforeAll(async () => {
    // Create test harness
    harness = await createTestHarness({
      skipPortValidation: true,
      tempPrefix: 'recursa-file-ops-test',
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

  describe('mem.readFile', () => {
    beforeEach(async () => {
      await createTestData(TENANT_ID, {
        'test-file.txt': 'Hello, World!',
        'test-markdown.md': createMarkdownContent('Test Page', 'This is test content')
      });
    });

    afterEach(async () => {
      await cleanupTestData(TENANT_ID);
    });

    it('should register with correct schema', async () => {
      const tools = await client.listTools();
      const readTool = tools.tools.find((t: any) => t.name === 'mem.readFile');

      expect(readTool).toBeDefined();
      expectFastMCPSchema(readTool.inputSchema, {
        type: 'object',
        properties: {
          filePath: { type: 'string' }
        },
        required: ['filePath']
      });
    });

    it('should validate input parameters correctly', async () => {
      await testParameterValidation(client, 'mem.readFile', [
        { params: {}, expectedError: 'filePath' },
        { params: { filePath: 123 }, expectedError: 'string' }
      ]);
    });

    it('should read files successfully', async () => {
      const result = await client.callTool({
        name: 'mem.readFile',
        arguments: { filePath: 'test-file.txt' }
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('Hello, World!');

      // Verify against direct API call
      await verifyWithDirectMemAPI('mem.readFile', { filePath: 'test-file.txt' }, result);
    });

    it('should handle file not found error', async () => {
      const result = await client.callTool({
        name: 'mem.readFile',
        arguments: { filePath: 'nonexistent.txt' }
      });

      expectMCPError(result, 'no such file or directory');
    });
  });

  describe('mem.writeFile', () => {
    afterEach(async () => {
      await cleanupTestData(TENANT_ID);
    });

    it('should register with correct schema', async () => {
      const tools = await client.listTools();
      const writeTool = tools.tools.find((t: any) => t.name === 'mem.writeFile');

      expect(writeTool).toBeDefined();
      expectFastMCPSchema(writeTool.inputSchema, {
        type: 'object',
        properties: {
          filePath: { type: 'string' },
          content: { type: 'string' }
        },
        required: ['filePath', 'content']
      });
    });

    it('should validate input parameters correctly', async () => {
      await testParameterValidation(client, 'mem.writeFile', [
        { params: {}, expectedError: 'filePath' },
        { params: { filePath: 'test.txt' }, expectedError: 'content' },
        { params: { content: 'test' }, expectedError: 'filePath' },
        { params: { filePath: 123, content: 'test' }, expectedError: 'string' }
      ]);
    });

    it('should write files successfully', async () => {
      const result = await client.callTool({
        name: 'mem.writeFile',
        arguments: {
          filePath: 'new-file.txt',
          content: 'New file content'
        }
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('true');

      // Verify against direct API call
      await verifyWithDirectMemAPI('mem.writeFile', {
        filePath: 'new-file.txt',
        content: 'New file content'
      }, result);
    });

    it('should write markdown files with validation', async () => {
      const validMarkdown = createMarkdownContent('Valid Page', 'Valid content');
      const result = await client.callTool({
        name: 'mem.writeFile',
        arguments: {
          filePath: 'valid.md',
          content: validMarkdown
        }
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('true');
    });
  });

  describe('mem.fileExists', () => {
    beforeEach(async () => {
      await createTestData(TENANT_ID, {
        'existing-file.txt': 'Content'
      });
    });

    afterEach(async () => {
      await cleanupTestData(TENANT_ID);
    });

    it('should register with correct schema', async () => {
      const tools = await client.listTools();
      const existsTool = tools.tools.find((t: any) => t.name === 'mem.fileExists');

      expect(existsTool).toBeDefined();
      expectFastMCPSchema(existsTool.inputSchema, {
        type: 'object',
        properties: {
          filePath: { type: 'string' }
        },
        required: ['filePath']
      });
    });

    it('should validate input parameters correctly', async () => {
      await testParameterValidation(client, 'mem.fileExists', [
        { params: {}, expectedError: 'filePath' },
        { params: { filePath: 123 }, expectedError: 'string' }
      ]);
    });

    it('should return true for existing files', async () => {
      const result = await client.callTool({
        name: 'mem.fileExists',
        arguments: { filePath: 'existing-file.txt' }
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('true');
    });

    it('should return false for non-existing files', async () => {
      const result = await client.callTool({
        name: 'mem.fileExists',
        arguments: { filePath: 'nonexistent.txt' }
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('false');
    });
  });

  describe('mem.updateFile', () => {
    beforeEach(async () => {
      await createTestData(TENANT_ID, {
        'update-test.txt': 'Original content'
      });
    });

    afterEach(async () => {
      await cleanupTestData(TENANT_ID);
    });

    it('should register with correct schema', async () => {
      const tools = await client.listTools();
      const updateTool = tools.tools.find((t: any) => t.name === 'mem.updateFile');

      expect(updateTool).toBeDefined();
      expectFastMCPSchema(updateTool.inputSchema, {
        type: 'object',
        properties: {
          filePath: { type: 'string' },
          oldContent: { type: 'string' },
          newContent: { type: 'string' }
        },
        required: ['filePath', 'oldContent', 'newContent']
      });
    });

    it('should validate input parameters correctly', async () => {
      await testParameterValidation(client, 'mem.updateFile', [
        { params: {}, expectedError: 'filePath' },
        { params: { filePath: 'test.txt', oldContent: 'old' }, expectedError: 'newContent' }
      ]);
    });

    it('should update file with matching content', async () => {
      const result = await client.callTool({
        name: 'mem.updateFile',
        arguments: {
          filePath: 'update-test.txt',
          oldContent: 'Original content',
          newContent: 'Updated content'
        }
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('true');

      // Verify the update
      const readResult = await client.callTool({
        name: 'mem.readFile',
        arguments: { filePath: 'update-test.txt' }
      });
      expect(readResult.content[0].text).toBe('Updated content');
    });

    it('should fail with mismatched content', async () => {
      const result = await client.callTool({
        name: 'mem.updateFile',
        arguments: {
          filePath: 'update-test.txt',
          oldContent: 'Wrong content',
          newContent: 'New content'
        }
      });

      expectMCPError(result, 'content does not match');
    });
  });

  describe('mem.deletePath', () => {
    beforeEach(async () => {
      await createTestData(TENANT_ID, {
        'delete-me.txt': 'To be deleted',
        'subdir/file.txt': 'Nested file'
      });
    });

    afterEach(async () => {
      await cleanupTestData(TENANT_ID);
    });

    it('should register with correct schema', async () => {
      const tools = await client.listTools();
      const deleteTool = tools.tools.find((t: any) => t.name === 'mem.deletePath');

      expect(deleteTool).toBeDefined();
      expectFastMCPSchema(deleteTool.inputSchema, {
        type: 'object',
        properties: {
          filePath: { type: 'string' }
        },
        required: ['filePath']
      });
    });

    it('should validate input parameters correctly', async () => {
      await testParameterValidation(client, 'mem.deletePath', [
        { params: {}, expectedError: 'filePath' }
      ]);
    });

    it('should delete files successfully', async () => {
      const result = await client.callTool({
        name: 'mem.deletePath',
        arguments: { filePath: 'delete-me.txt' }
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('true');

      // Verify file is deleted
      const existsResult = await client.callTool({
        name: 'mem.fileExists',
        arguments: { filePath: 'delete-me.txt' }
      });
      expect(existsResult.content[0].text).toBe('false');
    });

    it('should delete directories recursively', async () => {
      const result = await client.callTool({
        name: 'mem.deletePath',
        arguments: { filePath: 'subdir' }
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('true');
    });
  });

  describe('mem.rename', () => {
    beforeEach(async () => {
      await createTestData(TENANT_ID, {
        'old-name.txt': 'Content to rename'
      });
    });

    afterEach(async () => {
      await cleanupTestData(TENANT_ID);
    });

    it('should register with correct schema', async () => {
      const tools = await client.listTools();
      const renameTool = tools.tools.find((t: any) => t.name === 'mem.rename');

      expect(renameTool).toBeDefined();
      expectFastMCPSchema(renameTool.inputSchema, {
        type: 'object',
        properties: {
          oldPath: { type: 'string' },
          newPath: { type: 'string' }
        },
        required: ['oldPath', 'newPath']
      });
    });

    it('should validate input parameters correctly', async () => {
      await testParameterValidation(client, 'mem.rename', [
        { params: { oldPath: 'old.txt' }, expectedError: 'newPath' }
      ]);
    });

    it('should rename files successfully', async () => {
      const result = await client.callTool({
        name: 'mem.rename',
        arguments: {
          oldPath: 'old-name.txt',
          newPath: 'new-name.txt'
        }
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('true');

      // Verify old file doesn't exist
      const oldExistsResult = await client.callTool({
        name: 'mem.fileExists',
        arguments: { filePath: 'old-name.txt' }
      });
      expect(oldExistsResult.content[0].text).toBe('false');

      // Verify new file exists
      const newExistsResult = await client.callTool({
        name: 'mem.fileExists',
        arguments: { filePath: 'new-name.txt' }
      });
      expect(newExistsResult.content[0].text).toBe('true');
    });
  });

  describe('mem.createDir', () => {
    afterEach(async () => {
      await cleanupTestData(TENANT_ID);
    });

    it('should register with correct schema', async () => {
      const tools = await client.listTools();
      const createTool = tools.tools.find((t: any) => t.name === 'mem.createDir');

      expect(createTool).toBeDefined();
      expectFastMCPSchema(createTool.inputSchema, {
        type: 'object',
        properties: {
          directoryPath: { type: 'string' }
        },
        required: ['directoryPath']
      });
    });

    it('should validate input parameters correctly', async () => {
      await testParameterValidation(client, 'mem.createDir', [
        { params: {}, expectedError: 'directoryPath' }
      ]);
    });

    it('should create directories successfully', async () => {
      const result = await client.callTool({
        name: 'mem.createDir',
        arguments: { directoryPath: 'new-directory' }
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('true');

      // Verify we can create a file in the new directory
      const writeResult = await client.callTool({
        name: 'mem.writeFile',
        arguments: {
          filePath: 'new-directory/test.txt',
          content: 'Test in new directory'
        }
      });
      expect(writeResult.content[0].text).toBe('true');
    });

    it('should create nested directories', async () => {
      const result = await client.callTool({
        name: 'mem.createDir',
        arguments: { directoryPath: 'deeply/nested/directory' }
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('true');
    });
  });

  describe('mem.listFiles', () => {
    beforeEach(async () => {
      await createTestData(TENANT_ID, {
        'file1.txt': 'Content 1',
        'file2.md': '# Markdown',
        'subdir/nested.txt': 'Nested content'
      });
    });

    afterEach(async () => {
      await cleanupTestData(TENANT_ID);
    });

    it('should register with correct schema', async () => {
      const tools = await client.listTools();
      const listTool = tools.tools.find((t: any) => t.name === 'mem.listFiles');

      expect(listTool).toBeDefined();
      expectFastMCPSchema(listTool.inputSchema, {
        type: 'object',
        properties: {
          directoryPath: { type: 'string' }
        }
      });
    });

    it('should validate input parameters correctly', async () => {
      await testParameterValidation(client, 'mem.listFiles', [
        { params: { directoryPath: 123 }, expectedError: 'string' }
      ]);
    });

    it('should list root directory files', async () => {
      const result = await client.callTool({
        name: 'mem.listFiles',
        arguments: {}
      });

      expect(result.isError).toBeUndefined();

      // This test might catch the FastMCP array serialization issue
      const fileList = JSON.parse(result.content[0].text);
      expect(Array.isArray(fileList)).toBe(true);
      expect(fileList).toContain('file1.txt');
      expect(fileList).toContain('file2.md');
      expect(fileList).toContain('subdir');
    });

    it('should list specific directory', async () => {
      const result = await client.callTool({
        name: 'mem.listFiles',
        arguments: { directoryPath: 'subdir' }
      });

      expect(result.isError).toBeUndefined();

      const fileList = JSON.parse(result.content[0].text);
      expect(Array.isArray(fileList)).toBe(true);
      expect(fileList).toContain('nested.txt');
    });
  });
});