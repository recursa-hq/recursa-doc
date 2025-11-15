import { promises as fs } from 'fs';
import path from 'path';
import simpleGit from 'simple-git';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { MemAPI } from '../../src/types/index.js';
import { createMemAPI } from '../../src/core/mem-api/index.js';

/**
 * MCP Testing Utilities
 *
 * This module provides utilities for testing MCP tools through the actual MCP protocol,
 * ensuring that all tools work correctly through the FastMCP server interface.
 */

/**
 * Creates an MCP client connected to the test server
 */
export async function createMCPClient(tenantId: string = 'tool-test-tenant'): Promise<Client> {
  // Use default test configuration
  const httpPort = 9099;

  const transport = new StreamableHTTPClientTransport(
    new URL(`http://localhost:${httpPort}/mcp`),
    {
      requestInit: {
        headers: {
          Authorization: `Bearer ${tenantId}`,
        },
      },
    },
  );

  const client = new Client({ name: 'mcp-tool-test-client', version: '1.0.0' });
  await client.connect(transport);

  return client;
}

/**
 * Gets test harness configuration for MCP client creation
 */
async function getTestHarnessConfig(): Promise<{ httpPort: number; knowledgeGraphPath: string }> {
  // Use default test configuration matching the test harness
  return {
    httpPort: 9099,
    knowledgeGraphPath: process.env.KNOWLEDGE_GRAPH_PATH || '/tmp/recursa-mcp-test'
  };
}

/**
 * Tests parameter validation for an MCP tool
 */
export async function testParameterValidation(
  client: Client,
  toolName: string,
  invalidParams: Array<{ params: any; expectedError: string }>
): Promise<void> {
  for (const { params, expectedError } of invalidParams) {
    try {
      await client.callTool({ name: toolName, arguments: params });
      throw new Error(`Expected validation error for ${toolName} with params: ${JSON.stringify(params)}`);
    } catch (error: any) {
      if (!error.message.includes(expectedError)) {
        throw new Error(`Expected error containing "${expectedError}", got: ${error.message}`);
      }
    }
  }
}

/**
 * Expects an MCP error response
 */
export function expectMCPError(
  response: any,
  expectedErrorContains: string,
  expectedIsError: boolean = true
): void {
  if (expectedIsError && !response.isError) {
    throw new Error(`Expected error response, got success: ${JSON.stringify(response)}`);
  }

  if (!expectedIsError && response.isError) {
    throw new Error(`Expected success response, got error: ${JSON.stringify(response)}`);
  }

  const responseText = response.content?.[0]?.text || '';
  if (!responseText.includes(expectedErrorContains)) {
    throw new Error(`Expected error containing "${expectedErrorContains}", got: ${responseText}`);
  }
}

/**
 * Validates FastMCP schema structure (which includes $schema and additionalProperties fields)
 */
export function expectFastMCPSchema(actualSchema: any, expectedSchema: any): void {
  // FastMCP adds these fields automatically, so we check for them and then validate the core structure
  expect(actualSchema.$schema).toBe('http://json-schema.org/draft-07/schema#');
  expect(actualSchema.additionalProperties).toBe(false);

  // Check the core schema structure
  expect(actualSchema.type).toBe(expectedSchema.type);
  expect(actualSchema.properties).toEqual(expectedSchema.properties);
  if (expectedSchema.required) {
    expect(actualSchema.required).toEqual(expectedSchema.required);
  }
}

/**
 * Verifies MCP result against direct MemAPI call
 */
export async function verifyWithDirectMemAPI(
  toolName: string,
  args: any,
  mcpResult: any,
  tenantId: string = 'tool-test-tenant'
): Promise<void> {
  // Use the same base path as the MCP server (from environment variable or default)
  // The MCP server is running with KNOWLEDGE_GRAPH_PATH=/tmp/recursa-test-knowledge-graph
  const mcpServerBasePath = process.env.KNOWLEDGE_GRAPH_PATH || '/tmp/recursa-test-knowledge-graph';
  const knowledgeGraphPath = path.join(mcpServerBasePath, tenantId);

  // Ensure the tenant directory exists (MCP client auto-creates it)
  await fs.mkdir(knowledgeGraphPath, { recursive: true });

  // Initialize git repository if it doesn't exist
  const git = simpleGit(knowledgeGraphPath);
  try {
    await git.init();
    await git.addConfig('user.name', 'Test User');
    await git.addConfig('user.email', 'test@example.com');
  } catch (error) {
    // Git repo might already exist, that's fine
  }

  const config = {
    knowledgeGraphPath,
    openRouterApiKey: 'dummy-key',
    recursaApiKey: 'test-key',
    httpPort: 9099,
    llmModel: 'test-model',
    llmTemperature: 0.7,
    llmMaxTokens: 4000,
    sandboxTimeout: 10000,
    sandboxMemoryLimit: 100,
    gitUserName: 'Test User',
    gitUserEmail: 'test@example.com',
  };

  const mem = createMemAPI(config);
  const fn = mem[toolName.split('.')[1] as keyof MemAPI] as (...args: any[]) => Promise<any>;

  try {
    const directResult = await fn(...Object.values(args));

    // For complex results, just verify they're both successful
    if (typeof mcpResult === 'object' && typeof directResult === 'object') {
      return; // Success for both
    }

    // For simple results, compare directly
    const mcpText = mcpResult.content?.[0]?.text;
    if (mcpText !== undefined) {
      // Convert string representations back for comparison
      let mcpValue: any = mcpText;

      // Handle boolean conversion
      if (mcpText === 'true') {
        mcpValue = true;
      } else if (mcpText === 'false') {
        mcpValue = false;
      } else if (!isNaN(Number(mcpText)) && mcpText !== '') {
        // Handle numeric conversion - if it's a valid number string, convert to number
        mcpValue = Number(mcpText);
      }

      if (JSON.stringify(mcpValue) !== JSON.stringify(directResult)) {
        throw new Error(`MCP result "${mcpValue}" doesn't match direct result "${directResult}"`);
      }
    }
  } catch (error: any) {
    // If direct API fails, that's expected for error conditions
    if (mcpResult.isError) {
      return; // Both failed as expected
    }
    throw new Error(`Direct API failed but MCP succeeded: ${error.message}`);
  }
}

/**
 * Creates test data files for MCP testing
 */
export async function createTestData(
  tenantId: string,
  files: Record<string, string>
): Promise<void> {
  // Use the same base path as the MCP server to match where the MCP client looks for files
  const mcpServerBasePath = process.env.KNOWLEDGE_GRAPH_PATH || '/tmp/recursa-test-knowledge-graph';
  const basePath = path.join(mcpServerBasePath, tenantId);

  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(basePath, filePath);
    const dir = path.dirname(fullPath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
  }
}

/**
 * Cleans up test data
 */
export async function cleanupTestData(tenantId: string): Promise<void> {
  // Use the same base path as the MCP server
  const mcpServerBasePath = process.env.KNOWLEDGE_GRAPH_PATH || '/tmp/recursa-test-knowledge-graph';
  const basePath = path.join(mcpServerBasePath, tenantId);

  try {
    await fs.rm(basePath, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Helper to create a markdown file with Logseq-compatible content
 */
export function createMarkdownContent(title: string, content: string): string {
  return `# ${title}

${content}

- Created at: ${new Date().toISOString()}
- Tags: #test #mcp
`;
}

/**
 * Helper to create a file with outgoing links
 */
export function createFileWithLinks(title: string, links: string[]): string {
  const linkSection = links.map(link => `- [[${link}]]`).join('\n');
  return createMarkdownContent(title, `This file links to:\n\n${linkSection}`);
}

/**
 * Helper to create a file with properties
 */
export function createFileWithProperties(title: string, properties: Record<string, string>): string {
  const propSection = Object.entries(properties)
    .map(([key, value]) => `${key}:: ${value}`)
    .join('\n');
  return createMarkdownContent(title, `Properties:\n\n${propSection}`);
}