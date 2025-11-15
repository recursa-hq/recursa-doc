import { createTestHarness, cleanupTestHarness, TestHarnessState } from '../lib/test-harness.js';
import {
  createMCPClient,
  testParameterValidation,
  expectMCPError,
  verifyWithDirectMemAPI,
  createTestData,
  cleanupTestData,
  createMarkdownContent
} from '../lib/mcp-test-utils.js';

describe('MCP Utility Operations', () => {
  let harness: TestHarnessState;
  let client: any; // MCP Client
  const TENANT_ID = 'utility-ops-test';

  beforeAll(async () => {
    // Create test harness
    harness = await createTestHarness({
      skipPortValidation: true,
      tempPrefix: 'recursa-utility-ops-test',
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

  describe('mem.getGraphRoot', () => {
    it('should register with correct schema', async () => {
      const tools = await client.listTools();
      const rootTool = tools.tools.find((t: any) => t.name === 'mem.getGraphRoot');

      expect(rootTool).toBeDefined();
      expect(rootTool.inputSchema.type).toBe('object');
      expect(rootTool.inputSchema.properties).toBeDefined();
      expect(typeof rootTool.inputSchema.properties).toBe('object');
    });

    it('should validate input parameters correctly', async () => {
      // getGraphRoot takes no parameters, but we should test that extra params are handled
      const result = await client.callTool({
        name: 'mem.getGraphRoot',
        arguments: { extra: 'param' }
      });

      // Should either succeed (ignoring extra params) or fail gracefully
      expect(result.content[0].text).toBeDefined();
    });

    it('should return tenant-specific graph root path', async () => {
      const result = await client.callTool({
        name: 'mem.getGraphRoot',
        arguments: {}
      });

      expect(result.isError).toBeUndefined();

      const graphRoot = result.content[0].text;
      expect(graphRoot).toContain(TENANT_ID);
      expect(graphRoot).toContain('/tmp/');
      expect(graphRoot).not.toContain('..'); // No parent directory traversal

      // Verify against direct API call
      await verifyWithDirectMemAPI('mem.getGraphRoot', {}, result, TENANT_ID);
    });

    it('should return absolute path', async () => {
      const result = await client.callTool({
        name: 'mem.getGraphRoot',
        arguments: {}
      });

      expect(result.isError).toBeUndefined();

      const graphRoot = result.content[0].text;
      expect(graphRoot).toMatch(/^\/.*$/); // Should start with / (absolute path)
    });

    it('should return consistent path across multiple calls', async () => {
      const result1 = await client.callTool({
        name: 'mem.getGraphRoot',
        arguments: {}
      });

      const result2 = await client.callTool({
        name: 'mem.getGraphRoot',
        arguments: {}
      });

      expect(result1.content[0].text).toBe(result2.content[0].text);
    });

    it('should isolate tenants properly', async () => {
      // Create a different client for a different tenant
      const differentTenantClient = await createMCPClient('different-tenant');

      const result1 = await client.callTool({
        name: 'mem.getGraphRoot',
        arguments: {}
      });

      const result2 = await differentTenantClient.callTool({
        name: 'mem.getGraphRoot',
        arguments: {}
      });

      expect(result1.content[0].text).not.toBe(result2.content[0].text);
      expect(result1.content[0].text).toContain(TENANT_ID);
      expect(result2.content[0].text).toContain('different-tenant');
    });
  });

  describe('mem.getTokenCount', () => {
    beforeEach(async () => {
      await createTestData(TENANT_ID, {
        'short-file.txt': 'Short content',
        'medium-file.md': createMarkdownContent('Medium File', 'This is a file with medium content that contains multiple sentences and some basic structure.'),
        'empty-file.txt': '',
        'code-file.js': 'function test() {\n  console.log("Hello, world!");\n  return true;\n}\n\n// This is a JavaScript file with some code content',
        'large-file.txt': 'This is a larger file with more content. '.repeat(100)
      });
    });

    afterEach(async () => {
      await cleanupTestData(TENANT_ID);
    });

    it('should register with correct schema', async () => {
      const tools = await client.listTools();
      const tokenTool = tools.tools.find((t: any) => t.name === 'mem.getTokenCount');

      expect(tokenTool).toBeDefined();
      expect(tokenTool.inputSchema.type).toBe('object');
      expect(tokenTool.inputSchema.properties.filePath).toBeDefined();
      expect(tokenTool.inputSchema.properties.filePath.type).toBe('string');
      expect(tokenTool.inputSchema.required).toContain('filePath');
    });

    it('should validate input parameters correctly', async () => {
      await testParameterValidation(client, 'mem.getTokenCount', [
        { params: {}, expectedError: 'filePath' },
        { params: { filePath: 123 }, expectedError: 'string' }
      ]);
    });

    it('should count tokens for short files', async () => {
      const result = await client.callTool({
        name: 'mem.getTokenCount',
        arguments: {
          filePath: 'short-file.txt'
        }
      });

      expect(result.isError).toBeUndefined();

      const tokenCount = parseInt(result.content[0].text);
      expect(typeof tokenCount).toBe('number');
      expect(tokenCount).toBeGreaterThan(0);
      expect(tokenCount).toBeLessThan(100); // Short file should have less than 100 tokens

      // Verify against direct API call
      await verifyWithDirectMemAPI('mem.getTokenCount', { filePath: 'short-file.txt' }, result, TENANT_ID);
    });

    it('should count tokens for markdown files', async () => {
      const result = await client.callTool({
        name: 'mem.getTokenCount',
        arguments: {
          filePath: 'medium-file.md'
        }
      });

      expect(result.isError).toBeUndefined();

      const tokenCount = parseInt(result.content[0].text);
      expect(typeof tokenCount).toBe('number');
      expect(tokenCount).toBeGreaterThan(0);
    });

    it('should count tokens for code files', async () => {
      const result = await client.callTool({
        name: 'mem.getTokenCount',
        arguments: {
          filePath: 'code-file.js'
        }
      });

      expect(result.isError).toBeUndefined();

      const tokenCount = parseInt(result.content[0].text);
      expect(typeof tokenCount).toBe('number');
      expect(tokenCount).toBeGreaterThan(0);
    });

    it('should count tokens for larger files', async () => {
      const result = await client.callTool({
        name: 'mem.getTokenCount',
        arguments: {
          filePath: 'large-file.txt'
        }
      });

      expect(result.isError).toBeUndefined();

      const tokenCount = parseInt(result.content[0].text);
      expect(typeof tokenCount).toBe('number');
      expect(tokenCount).toBeGreaterThan(100); // Large file should have more tokens
    });

    it('should handle empty files', async () => {
      const result = await client.callTool({
        name: 'mem.getTokenCount',
        arguments: {
          filePath: 'empty-file.txt'
        }
      });

      expect(result.isError).toBeUndefined();

      const tokenCount = parseInt(result.content[0].text);
      expect(typeof tokenCount).toBe('number');
      expect(tokenCount).toBe(0);
    });

    it('should handle non-existent files', async () => {
      const result = await client.callTool({
        name: 'mem.getTokenCount',
        arguments: {
          filePath: 'non-existent.txt'
        }
      });

      expectMCPError(result, 'no such file or directory');
    });

    it('should return consistent token counts', async () => {
      const result1 = await client.callTool({
        name: 'mem.getTokenCount',
        arguments: {
          filePath: 'short-file.txt'
        }
      });

      const result2 = await client.callTool({
        name: 'mem.getTokenCount',
        arguments: {
          filePath: 'short-file.txt'
        }
      });

      expect(result1.content[0].text).toBe(result2.content[0].text);
    });
  });

  describe('mem.getTokenCountForPaths', () => {
    beforeEach(async () => {
      await createTestData(TENANT_ID, {
        'file1.txt': 'First file content with some text',
        'file2.md': createMarkdownContent('Second File', 'Content with markdown formatting and structure'),
        'file3.js': 'const x = 1; const y = 2; return x + y;',
        'empty.txt': '',
        'subdir/nested.txt': 'Nested file content'
      });
    });

    afterEach(async () => {
      await cleanupTestData(TENANT_ID);
    });

    it('should register with correct schema', async () => {
      const tools = await client.listTools();
      const pathsTokenTool = tools.tools.find((t: any) => t.name === 'mem.getTokenCountForPaths');

      expect(pathsTokenTool).toBeDefined();
      expect(pathsTokenTool.inputSchema.type).toBe('object');
      expect(pathsTokenTool.inputSchema.properties.paths).toBeDefined();
      expect(pathsTokenTool.inputSchema.properties.paths.type).toBe('array');
      expect(pathsTokenTool.inputSchema.properties.paths.items.type).toBe('string');
      expect(pathsTokenTool.inputSchema.required).toContain('paths');
    });

    it('should validate input parameters correctly', async () => {
      await testParameterValidation(client, 'mem.getTokenCountForPaths', [
        { params: {}, expectedError: 'paths' },
        { params: { paths: 'not-array' }, expectedError: 'array' },
        { params: { paths: [123] }, expectedError: 'string' }
      ]);
    });

    it('should count tokens for multiple files', async () => {
      const result = await client.callTool({
        name: 'mem.getTokenCountForPaths',
        arguments: {
          paths: ['file1.txt', 'file2.md', 'file3.js']
        }
      });

      // This should catch FastMCP array validation issues
      expect(result.isError).toBeUndefined();

      const tokenCounts = JSON.parse(result.content[0].text);
      expect(Array.isArray(tokenCounts)).toBe(true);
      expect(tokenCounts).toHaveLength(3);

      // Verify structure of results
      tokenCounts.forEach((item: any) => {
        expect(item).toHaveProperty('path');
        expect(item).toHaveProperty('tokenCount');
        expect(typeof item.path).toBe('string');
        expect(typeof item.tokenCount).toBe('number');
        expect(item.tokenCount).toBeGreaterThanOrEqual(0);
      });

      // Check specific files
      const file1Result = tokenCounts.find((item: any) => item.path === 'file1.txt');
      const file2Result = tokenCounts.find((item: any) => item.path === 'file2.md');
      const file3Result = tokenCounts.find((item: any) => item.path === 'file3.js');

      expect(file1Result).toBeDefined();
      expect(file2Result).toBeDefined();
      expect(file3Result).toBeDefined();

      expect(file1Result.tokenCount).toBeGreaterThan(0);
      expect(file2Result.tokenCount).toBeGreaterThan(0);
      expect(file3Result.tokenCount).toBeGreaterThan(0);
    });

    it('should handle empty files in the list', async () => {
      const result = await client.callTool({
        name: 'mem.getTokenCountForPaths',
        arguments: {
          paths: ['file1.txt', 'empty.txt', 'file2.md']
        }
      });

      expect(result.isError).toBeUndefined();

      const tokenCounts = JSON.parse(result.content[0].text);
      expect(Array.isArray(tokenCounts)).toBe(true);

      const emptyFileResult = tokenCounts.find((item: any) => item.path === 'empty.txt');
      expect(emptyFileResult).toBeDefined();
      expect(emptyFileResult.tokenCount).toBe(0);
    });

    it('should handle non-existent files in the list', async () => {
      const result = await client.callTool({
        name: 'mem.getTokenCountForPaths',
        arguments: {
          paths: ['file1.txt', 'non-existent.txt', 'file2.md']
        }
      });

      // Behavior for non-existent files may vary by implementation
      expect(result.isError).toBeUndefined();

      const tokenCounts = JSON.parse(result.content[0].text);
      expect(Array.isArray(tokenCounts)).toBe(true);

      // Should still process existing files
      const file1Result = tokenCounts.find((item: any) => item.path === 'file1.txt');
      const file2Result = tokenCounts.find((item: any) => item.path === 'file2.md');

      expect(file1Result).toBeDefined();
      expect(file2Result).toBeDefined();
    });

    it('should handle single file in array', async () => {
      const result = await client.callTool({
        name: 'mem.getTokenCountForPaths',
        arguments: {
          paths: ['file1.txt']
        }
      });

      expect(result.isError).toBeUndefined();

      const tokenCounts = JSON.parse(result.content[0].text);
      expect(Array.isArray(tokenCounts)).toBe(true);
      expect(tokenCounts).toHaveLength(1);

      expect(tokenCounts[0].path).toBe('file1.txt');
      expect(tokenCounts[0].tokenCount).toBeGreaterThan(0);
    });

    it('should handle empty array', async () => {
      const result = await client.callTool({
        name: 'mem.getTokenCountForPaths',
        arguments: {
          paths: []
        }
      });

      expect(result.isError).toBeUndefined();

      const tokenCounts = JSON.parse(result.content[0].text);
      expect(Array.isArray(tokenCounts)).toBe(true);
      expect(tokenCounts).toHaveLength(0);
    });

    it('should handle files in subdirectories', async () => {
      const result = await client.callTool({
        name: 'mem.getTokenCountForPaths',
        arguments: {
          paths: ['subdir/nested.txt', 'file1.txt']
        }
      });

      expect(result.isError).toBeUndefined();

      const tokenCounts = JSON.parse(result.content[0].text);
      expect(Array.isArray(tokenCounts)).toBe(true);
      expect(tokenCounts).toHaveLength(2);

      const nestedResult = tokenCounts.find((item: any) => item.path === 'subdir/nested.txt');
      expect(nestedResult).toBeDefined();
      expect(nestedResult.tokenCount).toBeGreaterThan(0);
    });

    it('should return consistent results across multiple calls', async () => {
      const paths = ['file1.txt', 'file2.md'];

      const result1 = await client.callTool({
        name: 'mem.getTokenCountForPaths',
        arguments: { paths }
      });

      const result2 = await client.callTool({
        name: 'mem.getTokenCountForPaths',
        arguments: { paths }
      });

      expect(result1.content[0].text).toBe(result2.content[0].text);

      const tokenCounts1 = JSON.parse(result1.content[0].text);
      const tokenCounts2 = JSON.parse(result2.content[0].text);

      expect(tokenCounts1).toEqual(tokenCounts2);
    });

    it('should handle duplicate paths in array', async () => {
      const result = await client.callTool({
        name: 'mem.getTokenCountForPaths',
        arguments: {
          paths: ['file1.txt', 'file1.txt', 'file2.md']
        }
      });

      expect(result.isError).toBeUndefined();

      const tokenCounts = JSON.parse(result.content[0].text);
      expect(Array.isArray(tokenCounts)).toBe(true);

      // Should handle duplicates gracefully (behavior may vary by implementation)
      const file1Results = tokenCounts.filter((item: any) => item.path === 'file1.txt');
      expect(file1Results.length).toBeGreaterThan(0);

      file1Results.forEach((result: any) => {
        expect(result.tokenCount).toBeGreaterThan(0);
      });
    });
  });
});