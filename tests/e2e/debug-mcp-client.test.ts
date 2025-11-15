import { createTestHarness, cleanupTestHarness, TestHarnessState } from '../lib/test-harness.js';
import {
  createMCPClient,
} from '../lib/mcp-test-utils.js';

describe('Debug MCP Client Test', () => {
  let harness: TestHarnessState;
  let client: any; // MCP Client
  const TENANT_ID = 'debug-test';

  beforeAll(async () => {
    harness = await createTestHarness({
      skipPortValidation: true,
      tempPrefix: 'recursa-debug-test',
      withGitignore: true,
    });

    await new Promise(resolve => setTimeout(resolve, 2000));
    client = await createMCPClient(TENANT_ID);
  });

  afterAll(async () => {
    if (client) {
      try {
      } catch (error) {
        console.warn('Error cleaning up MCP client:', error);
      }
    }

    if (harness) {
      await cleanupTestHarness(harness);
    }
  });

  it('should debug basic file creation and backlinks', async () => {
    const personContent = `- # Dr. Aris Thorne
  - type:: person`;

    const personResult = await client.callTool({
      name: 'mem.writeFile',
      arguments: {
        filePath: 'people/Dr. Aris Thorne.md',
        content: personContent
      }
    });

    expect(personResult.isError).toBeUndefined();
    expect(personResult.content[0].text).toBe('true');

    const projectContent = `- # Neural Architecture Search Project
  - lead:: [[Dr. Aris Thorne]]`;

    const projectResult = await client.callTool({
      name: 'mem.writeFile',
      arguments: {
        filePath: 'projects/neural-architecture-search.md',
        content: projectContent
      }
    });

    expect(projectResult.isError).toBeUndefined();
    expect(projectResult.content[0].text).toBe('true');

    const backlinksResult = await client.callTool({
      name: 'mem.getBacklinks',
      arguments: {
        filePath: 'people/dr-aris-thorne.md'
      }
    });

    // Debug: Print the actual backlinks to understand what's happening
    const backlinks = JSON.parse(backlinksResult.content[0].text);
    console.log('DEBUG - Backlinks for Dr. Aris Thorne:', backlinks);
    console.log('DEBUG - Backlinks result:', JSON.stringify(backlinksResult, null, 2));

    const outgoingResult = await client.callTool({
      name: 'mem.getOutgoingLinks',
      arguments: {
        filePath: 'projects/neural-architecture-search.md'
      }
    });

    // Debug: Print the actual outgoing links
    const outgoingLinks = JSON.parse(outgoingResult.content[0].text);
    console.log('DEBUG - Outgoing links from project:', outgoingLinks);

    const searchResult = await client.callTool({
      name: 'mem.searchGlobal',
      arguments: {
        query: 'Aris Thorne'
      }
    });

    const searchResults = JSON.parse(searchResult.content[0].text);
    console.log('DEBUG - Search results for "Aris Thorne":', searchResults);

    expect(personResult.isError).toBeUndefined();
    expect(projectResult.isError).toBeUndefined();
  });
});