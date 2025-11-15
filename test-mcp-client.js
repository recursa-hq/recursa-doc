#!/usr/bin/env node

// MCP client that uses proper persistent connections
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

async function runMCPClient() {
  const [,, toolName, ...argParts] = process.argv;

  if (!toolName) {
    console.error('Usage: node test-mcp-client.js <tool-name> [--arg value ...]');
    process.exit(1);
  }

  // Parse arguments
  const args = {};
  for (let i = 0; i < argParts.length; i++) {
    if (argParts[i] === '--arg' && i + 1 < argParts.length) {
      const [key, ...valueParts] = argParts[i + 1].split('=');
      const value = valueParts.length > 0 ? valueParts.join('=') : argParts[i + 1];
      // Try to parse as JSON, otherwise keep as string
      try {
        args[key] = JSON.parse(value);
      } catch {
        args[key] = value;
      }
      i++;
    }
  }

  // Get configuration from environment (Bearer token = tenant ID)
  const port = process.env.MCP_PORT || 9099;
  const tenantId = process.env.RECURSA_API_KEY || 'test-tenant';

  console.error(`Connecting to MCP server at http://localhost:${port}/mcp`);
  console.error(`Tool: ${toolName}, Args:`, args);
  console.error(`Tenant (Bearer Token): ${tenantId}`);

  try {
    // Create proper MCP client with persistent connection
    const transport = new StreamableHTTPClientTransport(
      new URL(`http://localhost:${port}/mcp`),
      {
        requestInit: {
          headers: {
            Authorization: `Bearer ${tenantId}`, // Bearer token = tenant ID
          },
        },
      },
    );

    const client = new Client({ name: 'test-cli-client', version: '1.0.0' });

    // Establish persistent connection
    await client.connect(transport);
    console.error('Connected to MCP server successfully');

    // Call the tool
    const result = await client.callTool({
      name: toolName,
      arguments: args,
    });

    console.log(JSON.stringify(result, null, 2));

    // Exit gracefully
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

runMCPClient().catch(console.error);