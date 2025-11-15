import { createTestHarness, cleanupTestHarness, TestHarnessState } from '../lib/test-harness.js';
import {
  createMCPClient,
  testParameterValidation,
  expectMCPError,
  expectFastMCPSchema,
  verifyWithDirectMemAPI,
  createTestData,
  cleanupTestData,
  createMarkdownContent,
  createFileWithLinks,
  createFileWithProperties
} from '../lib/mcp-test-utils.js';

describe('MCP Graph Operations', () => {
  let harness: TestHarnessState;
  let client: any; // MCP Client
  const TENANT_ID = 'graph-ops-test';

  beforeAll(async () => {
    // Create test harness
    harness = await createTestHarness({
      skipPortValidation: true,
      tempPrefix: 'recursa-graph-ops-test',
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

  describe('mem.searchGlobal', () => {
    beforeEach(async () => {
      await createTestData(TENANT_ID, {
        'searchable1.md': createMarkdownContent('Searchable Page 1', 'This content contains unique terms like python and javascript'),
        'searchable2.md': createMarkdownContent('Searchable Page 2', 'Another page with python programming content'),
        'searchable3.txt': 'Plain text file with some unique content here',
        'subdir/nested.md': createMarkdownContent('Nested Page', 'Content about nested programming concepts')
      });
    });

    afterEach(async () => {
      await cleanupTestData(TENANT_ID);
    });

    it('should register with correct schema', async () => {
      const tools = await client.listTools();
      const searchTool = tools.tools.find((t: any) => t.name === 'mem.searchGlobal');

      expect(searchTool).toBeDefined();
      expectFastMCPSchema(searchTool.inputSchema, {
        type: 'object',
        properties: {
          query: { type: 'string' }
        },
        required: ['query']
      });
    });

    it('should validate input parameters correctly', async () => {
      await testParameterValidation(client, 'mem.searchGlobal', [
        { params: {}, expectedError: 'query' },
        { params: { query: 123 }, expectedError: 'string' }
      ]);
    });

    it('should search for content globally', async () => {
      const result = await client.callTool({
        name: 'mem.searchGlobal',
        arguments: {
          query: 'python'
        }
      });

      // This should catch FastMCP array validation issues
      expect(result.isError).toBeUndefined();

      const searchResults = JSON.parse(result.content[0].text);
      expect(Array.isArray(searchResults)).toBe(true);

      // Should find files containing 'python'
      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults.some((file: string) => file.includes('searchable1.md'))).toBe(true);
      expect(searchResults.some((file: string) => file.includes('searchable2.md'))).toBe(true);
    });

    it('should search for partial terms', async () => {
      const result = await client.callTool({
        name: 'mem.searchGlobal',
        arguments: {
          query: 'programm'
        }
      });

      expect(result.isError).toBeUndefined();

      const searchResults = JSON.parse(result.content[0].text);
      expect(Array.isArray(searchResults)).toBe(true);

      // Should find files with 'programming' content
      expect(searchResults.length).toBeGreaterThan(0);
    });

    it('should return empty results for non-existent terms', async () => {
      const result = await client.callTool({
        name: 'mem.searchGlobal',
        arguments: {
          query: 'nonexistent_term_xyz123'
        }
      });

      expect(result.isError).toBeUndefined();

      const searchResults = JSON.parse(result.content[0].text);
      expect(Array.isArray(searchResults)).toBe(true);
      expect(searchResults.length).toBe(0);
    });

    it('should handle empty query', async () => {
      const result = await client.callTool({
        name: 'mem.searchGlobal',
        arguments: {
          query: ''
        }
      });

      // Empty search might return all files or empty results depending on implementation
      expect(result.isError).toBeUndefined();

      const searchResults = JSON.parse(result.content[0].text);
      expect(Array.isArray(searchResults)).toBe(true);
    });
  });

  describe('mem.getOutgoingLinks', () => {
    beforeEach(async () => {
      await createTestData(TENANT_ID, {
        'page-with-links.md': createFileWithLinks('Page with Links', ['Target Page 1', 'Target Page 2', 'Non-existent Page']),
        'target-page-1.md': createMarkdownContent('Target Page 1', 'This is the first target page'),
        'target-page-2.md': createMarkdownContent('Target Page 2', 'This is the second target page'),
        'no-links.md': createMarkdownContent('No Links', 'This page has no outgoing links'),
        'complex-links.md': createMarkdownContent('Complex Links', 'Links to [[Target Page 1]] and [[Target Page 2]] with some text in between'),
        'plain-text.txt': 'This has [[links]] in plain text format'
      });
    });

    afterEach(async () => {
      await cleanupTestData(TENANT_ID);
    });

    it('should register with correct schema', async () => {
      const tools = await client.listTools();
      const linksTool = tools.tools.find((t: any) => t.name === 'mem.getOutgoingLinks');

      expect(linksTool).toBeDefined();
      expectFastMCPSchema(linksTool.inputSchema, {
        type: 'object',
        properties: {
          filePath: { type: 'string' }
        },
        required: ['filePath']
      });
    });

    it('should validate input parameters correctly', async () => {
      await testParameterValidation(client, 'mem.getOutgoingLinks', [
        { params: {}, expectedError: 'filePath' },
        { params: { filePath: 123 }, expectedError: 'string' }
      ]);
    });

    it('should extract outgoing links from markdown files', async () => {
      const result = await client.callTool({
        name: 'mem.getOutgoingLinks',
        arguments: {
          filePath: 'page-with-links.md'
        }
      });

      // This should catch FastMCP array validation issues
      expect(result.isError).toBeUndefined();

      const outgoingLinks = JSON.parse(result.content[0].text);
      expect(Array.isArray(outgoingLinks)).toBe(true);

      // Should extract all wikilinks
      expect(outgoingLinks).toContain('Target Page 1');
      expect(outgoingLinks).toContain('Target Page 2');
      expect(outgoingLinks).toContain('Non-existent Page');
    });

    it('should extract links from complex markdown content', async () => {
      const result = await client.callTool({
        name: 'mem.getOutgoingLinks',
        arguments: {
          filePath: 'complex-links.md'
        }
      });

      expect(result.isError).toBeUndefined();

      const outgoingLinks = JSON.parse(result.content[0].text);
      expect(Array.isArray(outgoingLinks)).toBe(true);

      expect(outgoingLinks).toContain('Target Page 1');
      expect(outgoingLinks).toContain('Target Page 2');
    });

    it('should return empty array for files with no links', async () => {
      const result = await client.callTool({
        name: 'mem.getOutgoingLinks',
        arguments: {
          filePath: 'no-links.md'
        }
      });

      expect(result.isError).toBeUndefined();

      const outgoingLinks = JSON.parse(result.content[0].text);
      expect(Array.isArray(outgoingLinks)).toBe(true);
      expect(outgoingLinks.length).toBe(0);
    });

    it('should handle non-markdown files', async () => {
      const result = await client.callTool({
        name: 'mem.getOutgoingLinks',
        arguments: {
          filePath: 'plain-text.txt'
        }
      });

      expect(result.isError).toBeUndefined();

      const outgoingLinks = JSON.parse(result.content[0].text);
      expect(Array.isArray(outgoingLinks)).toBe(true);
      // Plain text might still be processed for links depending on implementation
    });

    it('should handle non-existent files', async () => {
      const result = await client.callTool({
        name: 'mem.getOutgoingLinks',
        arguments: {
          filePath: 'non-existent.md'
        }
      });

      expectMCPError(result, 'no such file or directory');
    });
  });

  describe('mem.getBacklinks', () => {
    beforeEach(async () => {
      await createTestData(TENANT_ID, {
        'target-page.md': createMarkdownContent('Target Page', 'This page is linked to by others'),
        'linker-page-1.md': createFileWithLinks('Linker Page 1', ['target-page', 'Another Page']),
        'linker-page-2.md': createFileWithLinks('Linker Page 2', ['target-page', 'Different Page']),
        'no-backlinks.md': createMarkdownContent('No Backlinks', 'This page is not linked to by anyone'),
        'complex-linker.md': createMarkdownContent('Complex Linker', 'Content about [[target-page]] and some other [[Another Page]]')
      });
    });

    afterEach(async () => {
      await cleanupTestData(TENANT_ID);
    });

    it('should register with correct schema', async () => {
      const tools = await client.listTools();
      const backlinksTool = tools.tools.find((t: any) => t.name === 'mem.getBacklinks');

      expect(backlinksTool).toBeDefined();
      expectFastMCPSchema(backlinksTool.inputSchema, {
        type: 'object',
        properties: {
          filePath: { type: 'string' }
        },
        required: ['filePath']
      });
    });

    it('should validate input parameters correctly', async () => {
      await testParameterValidation(client, 'mem.getBacklinks', [
        { params: {}, expectedError: 'filePath' },
        { params: { filePath: 123 }, expectedError: 'string' }
      ]);
    });

    it('should find backlinks to target page', async () => {
      const result = await client.callTool({
        name: 'mem.getBacklinks',
        arguments: {
          filePath: 'target-page.md'
        }
      });

      // This should catch FastMCP array validation issues
      expect(result.isError).toBeUndefined();

      const backlinks = JSON.parse(result.content[0].text);
      expect(Array.isArray(backlinks)).toBe(true);

      // Should find all files that link to 'target-page.md'
      expect(backlinks.length).toBeGreaterThan(0);
    });

    it('should return empty array for pages with no backlinks', async () => {
      const result = await client.callTool({
        name: 'mem.getBacklinks',
        arguments: {
          filePath: 'no-backlinks.md'
        }
      });

      expect(result.isError).toBeUndefined();

      const backlinks = JSON.parse(result.content[0].text);
      expect(Array.isArray(backlinks)).toBe(true);
      expect(backlinks.length).toBe(0);
    });

    it('should handle case sensitivity correctly', async () => {
      const result = await client.callTool({
        name: 'mem.getBacklinks',
        arguments: {
          filePath: 'Target-Page.md'  // Different case
        }
      });

      expect(result.isError).toBeUndefined();

      const backlinks = JSON.parse(result.content[0].text);
      expect(Array.isArray(backlinks)).toBe(true);
      // Case sensitivity behavior depends on implementation
    });

    it('should handle non-existent files', async () => {
      const result = await client.callTool({
        name: 'mem.getBacklinks',
        arguments: {
          filePath: 'non-existent.md'
        }
      });

      expect(result.isError).toBeUndefined();
      const backlinks = JSON.parse(result.content[0].text);
      expect(Array.isArray(backlinks)).toBe(true);
      expect(backlinks.length).toBe(0); // Non-existent files should have no backlinks
    });
  });

  describe('mem.queryGraph', () => {
    beforeEach(async () => {
      await createTestData(TENANT_ID, {
        'ai-research.md': createFileWithProperties('AI Research', {
          'type': 'research',
          'affiliation': 'AI Research Institute',
          'status': 'active',
          'priority': 'high'
        }),
        'machine-learning.md': createFileWithProperties('Machine Learning', {
          'type': 'research',
          'affiliation': 'AI Research Institute',
          'domain': 'ML',
          'status': 'in-progress'
        }),
        'symbolic-reasoning.md': createFileWithProperties('Symbolic Reasoning', {
          'type': 'research',
          'affiliation': 'AI Research Institute',
          'domain': 'Logic',
          'complexity': 'high'
        }),
        'notes.md': createFileWithLinks('Notes', ['AI Research', 'Machine Learning']),
        'unrelated.md': createMarkdownContent('Unrelated', 'This page has no relevant properties')
      });
    });

    afterEach(async () => {
      await cleanupTestData(TENANT_ID);
    });

    it('should register with correct schema', async () => {
      const tools = await client.listTools();
      const queryTool = tools.tools.find((t: any) => t.name === 'mem.queryGraph');

      expect(queryTool).toBeDefined();
      expectFastMCPSchema(queryTool.inputSchema, {
        type: 'object',
        properties: {
          query: { type: 'string' }
        },
        required: ['query']
      });
    });

    it('should validate input parameters correctly', async () => {
      await testParameterValidation(client, 'mem.queryGraph', [
        { params: {}, expectedError: 'query' },
        { params: { query: 123 }, expectedError: 'string' }
      ]);
    });

    it('should query by property value', async () => {
      const result = await client.callTool({
        name: 'mem.queryGraph',
        arguments: {
          query: '(property affiliation:: AI Research Institute)'
        }
      });

      // This should catch FastMCP array validation issues
      expect(result.isError).toBeUndefined();

      const queryResults = JSON.parse(result.content[0].text);
      expect(Array.isArray(queryResults)).toBe(true);

      // Should find all files with the specified property
      expect(queryResults.length).toBeGreaterThan(0);

      // Results should contain file paths and matches
      queryResults.forEach((result: any) => {
        expect(result).toHaveProperty('filePath');
        expect(result).toHaveProperty('matches');
        expect(Array.isArray(result.matches)).toBe(true);
      });
    });

    it('should query by multiple properties', async () => {
      const result = await client.callTool({
        name: 'mem.queryGraph',
        arguments: {
          query: '(property type:: research) AND (property affiliation:: AI Research Institute)'
        }
      });

      expect(result.isError).toBeUndefined();

      const queryResults = JSON.parse(result.content[0].text);
      expect(Array.isArray(queryResults)).toBe(true);

      // Should find files matching all criteria
      expect(queryResults.length).toBeGreaterThan(0);
    });

    it('should query by outgoing links', async () => {
      const result = await client.callTool({
        name: 'mem.queryGraph',
        arguments: {
          query: '(outgoing-link [[AI Research]])'
        }
      });

      expect(result.isError).toBeUndefined();

      const queryResults = JSON.parse(result.content[0].text);
      expect(Array.isArray(queryResults)).toBe(true);

      // Should find files linking to AI Research (from notes.md)
      expect(queryResults.length).toBeGreaterThan(0);
    });

    it('should return empty results for non-matching queries', async () => {
      const result = await client.callTool({
        name: 'mem.queryGraph',
        arguments: {
          query: 'property:: non-existent-value'
        }
      });

      expect(result.isError).toBeUndefined();

      const queryResults = JSON.parse(result.content[0].text);
      expect(Array.isArray(queryResults)).toBe(true);
      expect(queryResults.length).toBe(0);
    });

    it('should handle complex queries with AND/OR logic', async () => {
      const result = await client.callTool({
        name: 'mem.queryGraph',
        arguments: {
          query: 'type:: research AND (affiliation:: AI Research Institute OR domain:: ML)'
        }
      });

      expect(result.isError).toBeUndefined();

      const queryResults = JSON.parse(result.content[0].text);
      expect(Array.isArray(queryResults)).toBe(true);
      // Complex query results depend on implementation
    });

    it('should handle malformed queries gracefully', async () => {
      const result = await client.callTool({
        name: 'mem.queryGraph',
        arguments: {
          query: 'invalid syntax query'
        }
      });

      expect(result.isError).toBeUndefined();

      const queryResults = JSON.parse(result.content[0].text);
      expect(Array.isArray(queryResults)).toBe(true);
      // Should return empty results for invalid queries
    });
  });
});