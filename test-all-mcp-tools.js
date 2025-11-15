#!/usr/bin/env node

// Comprehensive test of all MCP tools from docs/tools.md
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

const MCP_PORT = 9099;
const TENANT_ID = 'comprehensive-test';

async function testMCPTool(toolName, args = {}) {
  console.log(`\n=== Testing ${toolName} ===`);
  console.log(`Arguments:`, args);

  try {
    const transport = new StreamableHTTPClientTransport(
      new URL(`http://localhost:${MCP_PORT}/mcp`),
      {
        requestInit: {
          headers: {
            Authorization: `Bearer ${TENANT_ID}`,
          },
        },
      },
    );

    const client = new Client({ name: 'comprehensive-test-client', version: '1.0.0' });
    await client.connect(transport);

    const result = await client.callTool({ name: toolName, arguments: args });

    console.log(`✅ ${toolName} SUCCESS`);
    console.log(`Result:`, JSON.stringify(result, null, 2));

    return { success: true, result };
  } catch (error) {
    console.log(`❌ ${toolName} FAILED`);
    console.log(`Error:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runComprehensiveTest() {
  console.log('🚀 Starting comprehensive MCP tools test...');
  console.log(`Server: http://localhost:${MCP_PORT}/mcp`);
  console.log(`Tenant: ${TENANT_ID}`);

  const results = {};

  // Category 1: Core File & Directory Operations
  console.log('\n📁 CATEGORY 1: Core File & Directory Operations');

  // Test mem.writeFile
  results.writeFile = await testMCPTool('mem.writeFile', {
    filePath: 'test-file.txt',
    content: 'Hello from comprehensive MCP test!'
  });

  // Test mem.readFile
  results.readFile = await testMCPTool('mem.readFile', {
    filePath: 'test-file.txt'
  });

  // Test mem.fileExists
  results.fileExists = await testMCPTool('mem.fileExists', {
    filePath: 'test-file.txt'
  });

  // Test mem.updateFile
  results.updateFile = await testMCPTool('mem.updateFile', {
    filePath: 'test-file.txt',
    oldContent: 'Hello from comprehensive MCP test!',
    newContent: 'Updated content from comprehensive MCP test!'
  });

  // Test mem.listFiles
  results.listFiles = await testMCPTool('mem.listFiles');

  // Test mem.createDir
  results.createDir = await testMCPTool('mem.createDir', {
    directoryPath: 'test-subdirectory'
  });

  // Test mem.rename
  results.rename = await testMCPTool('mem.rename', {
    oldPath: 'test-file.txt',
    newPath: 'test-subdirectory/renamed-file.txt'
  });

  // Test mem.getGraphRoot
  results.getGraphRoot = await testMCPTool('mem.getGraphRoot');

  // Category 2: Git-Native Operations
  console.log('\n🔧 CATEGORY 2: Git-Native Operations');

  // Test mem.getChangedFiles
  results.getChangedFiles = await testMCPTool('mem.getChangedFiles');

  // Test mem.commitChanges
  results.commitChanges = await testMCPTool('mem.commitChanges', {
    message: 'Test commit from comprehensive MCP tool test'
  });

  // Test mem.gitLog
  results.gitLog = await testMCPTool('mem.gitLog', {
    filePath: '.',
    maxCommits: 3
  });

  // Test mem.gitDiff
  results.gitDiff = await testMCPTool('mem.gitDiff', {
    filePath: 'test-subdirectory/renamed-file.txt'
  });

  // Category 3: Intelligent Graph & Semantic Operations
  console.log('\n🧠 CATEGORY 3: Intelligent Graph & Semantic Operations');

  // Test mem.searchGlobal
  results.searchGlobal = await testMCPTool('mem.searchGlobal', {
    query: 'comprehensive'
  });

  // Test mem.getOutgoingLinks
  results.getOutgoingLinks = await testMCPTool('mem.getOutgoingLinks', {
    filePath: 'test-subdirectory/renamed-file.txt'
  });

  // Test mem.getBacklinks
  results.getBacklinks = await testMCPTool('mem.getBacklinks', {
    filePath: 'test-subdirectory/renamed-file.txt'
  });

  // Test mem.queryGraph
  results.queryGraph = await testMCPTool('mem.queryGraph', {
    query: 'comprehensive'
  });

  // Category 4: State Management & Checkpoints
  console.log('\n💾 CATEGORY 4: State Management & Checkpoints');

  // Test mem.saveCheckpoint
  results.saveCheckpoint = await testMCPTool('mem.saveCheckpoint');

  // Test mem.discardChanges
  results.discardChanges = await testMCPTool('mem.discardChanges');

  // Category 5: Utility & Diagnostics
  console.log('\n🔍 CATEGORY 5: Utility & Diagnostics');

  // Test mem.getTokenCount
  results.getTokenCount = await testMCPTool('mem.getTokenCount', {
    filePath: 'test-subdirectory/renamed-file.txt'
  });

  // Test mem.getTokenCountForPaths
  results.getTokenCountForPaths = await testMCPTool('mem.getTokenCountForPaths', {
    paths: ['test-subdirectory/renamed-file.txt']
  });

  // Cleanup test
  console.log('\n🧹 CATEGORY 6: Cleanup Operations');

  // Test mem.deletePath
  results.deletePath = await testMCPTool('mem.deletePath', {
    filePath: 'test-subdirectory'
  });

  // Final summary
  console.log('\n📊 COMPREHENSIVE TEST SUMMARY');
  console.log('==================================');

  const tools = Object.keys(results);
  const successful = tools.filter(tool => results[tool].success);
  const failed = tools.filter(tool => !results[tool].success);

  console.log(`Total tools tested: ${tools.length}`);
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\n❌ FAILED TOOLS:');
    failed.forEach(tool => {
      console.log(`  - ${tool}: ${results[tool].error}`);
    });
  }

  console.log('\n✅ SUCCESSFUL TOOLS:');
  successful.forEach(tool => {
    console.log(`  - ${tool}`);
  });

  console.log(`\n🎯 Success Rate: ${((successful.length / tools.length) * 100).toFixed(1)}%`);

  if (failed.length > 0) {
    console.log('\n⚠️  Some MCP tools are not working as documented!');
    process.exit(1);
  } else {
    console.log('\n🎉 All MCP tools are working perfectly!');
    process.exit(0);
  }
}

runComprehensiveTest().catch(console.error);