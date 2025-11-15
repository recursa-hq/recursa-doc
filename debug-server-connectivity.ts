#!/usr/bin/env bun

import { spawn, type ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

/**
 * Debug Script for MCP Server Connectivity Testing
 *
 * This script helps diagnose and resolve MCP server connectivity issues by:
 * 1. Checking server startup and port availability
 * 2. Testing MCP client connections
 * 3. Validating environment configuration
 * 4. Providing detailed diagnostics and troubleshooting steps
 */

interface ServerConfig {
  httpPort: number;
  knowledgeGraphPath: string;
  openRouterApiKey: string;
  llmModel: string;
}

class ServerConnectivityDebugger {
  private serverProcess: ChildProcess | null = null;
  private readonly defaultConfig: ServerConfig = {
    httpPort: 9099,
    knowledgeGraphPath: '/tmp/recursa-debug-test',
    openRouterApiKey: 'test-api-key',
    llmModel: 'test-model',
  };

  constructor(private config: Partial<ServerConfig> = {}) {}

  async run(): Promise<void> {
    console.log('🔍 Starting MCP Server Connectivity Debug...\n');

    try {
      // Step 1: Environment validation
      await this.validateEnvironment();

      // Step 2: Port availability check
      await this.checkPortAvailability();

      // Step 3: Start server with debug output
      await this.startServer();

      // Step 4: Test server connectivity
      await this.testServerConnectivity();

      // Step 5: Test MCP client connection
      await this.testMCPClientConnection();

      // Step 6: Test tool availability
      await this.testToolAvailability();

      console.log('\n✅ All connectivity tests passed!');
    } catch (error) {
      console.error('\n❌ Connectivity test failed:', error);
      this.printTroubleshootingGuide();
    } finally {
      await this.cleanup();
    }
  }

  private async validateEnvironment(): Promise<void> {
    console.log('1. 🔍 Validating Environment...');

    // Check Node.js version
    const nodeVersion = process.version;
    console.log(`   Node.js version: ${nodeVersion}`);

    // Check if required files exist
    const requiredFiles = [
      'src/server.ts',
      'package.json',
      'tsconfig.json',
    ];

    for (const file of requiredFiles) {
      try {
        await fs.access(file);
        console.log(`   ✅ ${file} exists`);
      } catch {
        console.log(`   ❌ ${file} missing`);
        throw new Error(`Required file ${file} not found`);
      }
    }

    // Check environment variables
    const envVars = ['PATH', 'HOME', 'NODE_ENV'];
    for (const envVar of envVars) {
      const value = process.env[envVar];
      console.log(`   ${envVar}: ${value ? '✅ set' : '❌ not set'}`);
    }

    console.log('   Environment validation complete\n');
  }

  private async checkPortAvailability(): Promise<void> {
    const port = this.config.httpPort || this.defaultConfig.httpPort;
    console.log(`2. 🔍 Checking Port ${port} Availability...`);

    try {
      const net = await import('net');
      const server = net.createServer();
      await new Promise<void>((resolve, reject) => {
        server.listen(port, () => {
          server.close();
          resolve();
        });
        server.on('error', reject);
      });
      console.log(`   ✅ Port ${port} is available`);
    } catch (error) {
      console.log(`   ❌ Port ${port} is in use: ${error}`);
      throw new Error(`Port ${port} is not available`);
    }
  }

  private async startServer(): Promise<void> {
    const config = { ...this.defaultConfig, ...this.config };
    console.log(`3. 🚀 Starting MCP Server on Port ${config.httpPort}...`);

    // Clean up any existing test directory
    try {
      await fs.rm(config.knowledgeGraphPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }

    // Create test directory
    await fs.mkdir(config.knowledgeGraphPath, { recursive: true });

    // Start server process
    this.serverProcess = spawn('./node_modules/.bin/tsx', ['src/server.ts'], {
      env: {
        ...process.env,
        KNOWLEDGE_GRAPH_PATH: config.knowledgeGraphPath,
        HTTP_PORT: String(config.httpPort),
        OPENROUTER_API_KEY: config.openRouterApiKey,
        LLM_MODEL: config.llmModel,
        GIT_USER_NAME: 'Debug User',
        GIT_USER_EMAIL: 'debug@example.com',
        RECURSA_API_KEY: 'debug-key',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Capture server output
    let serverOutput = '';
    if (this.serverProcess.stdout) {
      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        serverOutput += output;
        console.log(`   Server: ${output.trim()}`);
      });
    }

    if (this.serverProcess.stderr) {
      this.serverProcess.stderr.on('data', (data) => {
        const output = data.toString();
        serverOutput += output;
        console.log(`   Server Error: ${output.trim()}`);
      });
    }

    this.serverProcess.on('error', (error) => {
      console.log(`   ❌ Server process error: ${error.message}`);
    });

    // Wait for server to start
    console.log('   Waiting for server to be ready...');
    await this.waitForServerReady(config.httpPort, serverOutput);

    console.log(`   ✅ Server started successfully on port ${config.httpPort}\n`);
  }

  private async waitForServerReady(port: number, serverOutput: string): Promise<void> {
    const maxRetries = 60; // 30 seconds timeout
    const url = `http://localhost:${port}/mcp`;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, { method: 'HEAD', timeout: 1000 });
        if (response.status === 400 || response.status === 404 || response.status === 200) {
          return; // Server is ready
        }
      } catch (error) {
        // Server not ready yet, continue waiting
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    throw new Error(`Server did not become ready at ${url} within the timeout`);
  }

  private async testServerConnectivity(): Promise<void> {
    const port = this.config.httpPort || this.defaultConfig.httpPort;
    console.log(`4. 🔍 Testing Server Connectivity on Port ${port}...`);

    try {
      const response = await fetch(`http://localhost:${port}/mcp`, {
        method: 'HEAD',
        timeout: 5000,
      });

      console.log(`   ✅ Server responded with status: ${response.status}`);

      // Test with invalid request to see if MCP server is properly handling requests
      try {
        const testResponse = await fetch(`http://localhost:${port}/mcp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invalid: 'request' }),
          timeout: 5000,
        });
        console.log(`   ✅ MCP server handling invalid requests (status: ${testResponse.status})`);
      } catch (error) {
        console.log(`   ⚠️  MCP server error handling: ${error}`);
      }
    } catch (error) {
      throw new Error(`Server connectivity test failed: ${error}`);
    }
  }

  private async testMCPClientConnection(): Promise<void> {
    console.log('5. 🔍 Testing MCP Client Connection...');

    try {
      // Import MCP client dynamically
      const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
      const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');

      const port = this.config.httpPort || this.defaultConfig.httpPort;
      const transport = new StreamableHTTPClientTransport(
        new URL(`http://localhost:${port}/mcp`),
        {
          requestInit: {
            headers: {
              Authorization: 'Bearer debug-tenant',
            },
            timeout: 10000,
          },
        },
      );

      const client = new Client({ name: 'debug-client', version: '1.0.0' });
      await client.connect(transport);

      console.log('   ✅ MCP client connected successfully');

      // Test listing tools
      const toolsResponse = await client.listTools();
      if ('tools' in toolsResponse && Array.isArray(toolsResponse.tools)) {
        console.log(`   ✅ Found ${toolsResponse.tools.length} available tools`);
        console.log(`   📋 Tools: ${toolsResponse.tools.map(t => t.name).slice(0, 5).join(', ')}...`);
      } else {
        console.log('   ⚠️  Unexpected tools response structure');
      }

      await client.close();
    } catch (error) {
      throw new Error(`MCP client connection test failed: ${error}`);
    }
  }

  private async testToolAvailability(): Promise<void> {
    console.log('6. 🔍 Testing Tool Availability...');

    try {
      const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
      const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');

      const port = this.config.httpPort || this.defaultConfig.httpPort;
      const transport = new StreamableHTTPClientTransport(
        new URL(`http://localhost:${port}/mcp`),
        {
          requestInit: {
            headers: {
              Authorization: 'Bearer debug-tenant',
            },
            timeout: 10000,
          },
        },
      );

      const client = new Client({ name: 'debug-client', version: '1.0.0' });
      await client.connect(transport);

      // Test basic file operations
      const testCases = [
        {
          name: 'writeFile',
          args: { filePath: 'test.txt', content: 'Hello, World!' },
          expectedSuccess: true,
        },
        {
          name: 'fileExists',
          args: { filePath: 'test.txt' },
          expectedSuccess: true,
        },
        {
          name: 'readFile',
          args: { filePath: 'test.txt' },
          expectedSuccess: true,
        },
      ];

      for (const testCase of testCases) {
        try {
          const result = await client.callTool({
            name: `mem.${testCase.name}`,
            arguments: testCase.args,
          });

          console.log(`   ✅ ${testCase.name}: ${JSON.stringify(result)}`);
        } catch (error) {
          console.log(`   ❌ ${testCase.name}: ${error}`);
        }
      }

      await client.close();
    } catch (error) {
      console.log(`   ⚠️  Tool availability test failed: ${error}`);
    }
  }

  private async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up...');

    if (this.serverProcess) {
      this.serverProcess.kill();
      console.log('   ✅ Server process terminated');
    }

    const config = { ...this.defaultConfig, ...this.config };
    try {
      await fs.rm(config.knowledgeGraphPath, { recursive: true, force: true });
      console.log('   ✅ Test directory cleaned up');
    } catch (error) {
      console.log('   ⚠️  Cleanup warning:', error);
    }
  }

  private printTroubleshootingGuide(): void {
    console.log('\n🔧 Troubleshooting Guide:');
    console.log('========================');

    console.log('\n1. Port Issues:');
    console.log('   - Check if port 9099 is in use: lsof -i :9099');
    console.log('   - Try a different port by setting HTTP_PORT environment variable');

    console.log('\n2. Server Startup Issues:');
    console.log('   - Ensure all dependencies are installed: bun install');
    console.log('   - Check Node.js version compatibility');
    console.log('   - Verify TypeScript compilation: bun run tsc --noEmit');

    console.log('\n3. MCP Client Issues:');
    console.log('   - Verify @modelcontextprotocol/sdk is installed');
    console.log('   - Check network connectivity to localhost');
    console.log('   - Ensure proper authentication headers');

    console.log('\n4. Environment Issues:');
    console.log('   - Set required environment variables');
    console.log('   - Check file permissions on knowledge graph path');
    console.log('   - Verify git is installed and configured');

    console.log('\n5. Debug Steps:');
    console.log('   - Run: bun run debug-server-connectivity.ts');
    console.log('   - Check server logs for detailed error messages');
    console.log('   - Test with minimal configuration');
  }
}

// CLI interface
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const config: Partial<ServerConfig> = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--port' && i + 1 < args.length) {
      config.httpPort = parseInt(args[i + 1]);
      i++;
    } else if (arg === '--path' && i + 1 < args.length) {
      config.knowledgeGraphPath = args[i + 1];
      i++;
    }
  }

  const debuggerInstance = new ServerConnectivityDebugger(config);
  await debuggerInstance.run();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { ServerConnectivityDebugger };