import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import {
  createInspectorHarness,
  type InspectorHarnessContext,
} from '../lib/inspector-harness';
import fs from 'fs/promises';
import path from 'path';

// Increase timeout for E2E tests involving process spawning (npx is slow)
jest.setTimeout(60000);

describe('Inspector E2E Coverage', () => {
  let harness: InspectorHarnessContext;

  beforeAll(async () => {
    harness = await createInspectorHarness();
  });

  afterAll(async () => {
    await harness.cleanup();
  });

  it('should cover File Operations via STDIO transport', async () => {
    // We inject a script that uses all File I/O tools
    const mockResponses = [
      `<think>Testing File Ops</think>
       <typescript>
         await mem.writeFile('test-file.txt', 'hello world');
         const content = await mem.readFile('test-file.txt');
         
         // Atomic update
         await mem.updateFile('test-file.txt', content, 'hello updated');
         
         // Directory and Rename
         await mem.createDir('subdir');
         await mem.rename('test-file.txt', 'subdir/moved.txt');
         
         // Listing
         const list = await mem.listFiles('subdir');
         
         // Save verification data for test assertion
         await mem.writeFile('file-ops-verify.json', JSON.stringify({
            list,
            exists: await mem.fileExists('subdir/moved.txt')
         }));
       </typescript>
       <reply>File Ops Complete</reply>`,
    ];

    const result = await harness.runQuery(
      'Test File Ops',
      mockResponses,
      'stdio'
    );

    // Parse the inner JSON result from the tool
    // The Inspector CLI output format might vary (direct result vs JSON-RPC wrapper).
    const contentItems = result.content || (result.result && result.result.content);
    expect(contentItems).toBeDefined();
    const toolOutput = JSON.parse(contentItems[0].text);
    expect(toolOutput.reply).toBe('File Ops Complete');

    // Verify side effects on disk
    const movedContent = await fs.readFile(
      path.join(harness.graphPath, 'subdir/moved.txt'),
      'utf-8'
    );
    expect(movedContent).toBe('hello updated');

    const verifyData = JSON.parse(
      await fs.readFile(
        path.join(harness.graphPath, 'file-ops-verify.json'),
        'utf-8'
      )
    );
    expect(verifyData.list).toContain('moved.txt');
    expect(verifyData.exists).toBe(true);
  });

  it('should cover Git Operations via SSE transport', async () => {
    // Exercises Git tools and confirms SSE connectivity
    const mockResponses = [
      `<think>Testing Git Ops</think>
       <typescript>
         // Create some history
         await mem.writeFile('git-test.txt', 'v1');
         await mem.commitChanges('feat: v1');
         await mem.writeFile('git-test.txt', 'v2');
         
         const diff = await mem.gitDiff('git-test.txt');
         const changed = await mem.getChangedFiles();
         const log = await mem.gitLog('git-test.txt', 1);
         
         // Save verification data
         await mem.writeFile('git-verify.json', JSON.stringify({
            hasDiff: diff.length > 0,
            changedCount: changed.length,
            lastCommitMsg: log[0].message
         }));
       </typescript>
       <reply>Git Ops Complete</reply>`,
    ];

    const result = await harness.runQuery('Test Git Ops', mockResponses, 'sse');
    const contentItems = result.content || (result.result && result.result.content);
    expect(contentItems).toBeDefined();
    const toolOutput = JSON.parse(contentItems[0].text);
    expect(toolOutput.reply).toBe('Git Ops Complete');

    const verifyData = JSON.parse(
      await fs.readFile(
        path.join(harness.graphPath, 'git-verify.json'),
        'utf-8'
      )
    );
    expect(verifyData.hasDiff).toBe(true);
    expect(verifyData.changedCount).toBeGreaterThan(0); // git-test.txt is modified
    expect(verifyData.lastCommitMsg).toBe('feat: v1');
  });

  it('should cover Graph Operations via STDIO transport', async () => {
    const mockResponses = [
      `<think>Testing Graph Ops</think>
         <typescript>
           // Setup graph
           await mem.writeFile('PageA.md', '- link to [[PageB]]');
           await mem.writeFile('PageB.md', '- type:: concept');
           
           // Query Ops
           const backlinks = await mem.getBacklinks('PageB.md');
           const outgoing = await mem.getOutgoingLinks('PageA.md');
           const search = await mem.searchGlobal('concept');
           const query = await mem.queryGraph('(property type:: concept)');
           
           await mem.writeFile('graph-verify.json', JSON.stringify({
             backlinks,
             outgoing,
             search,
             queryCount: query.length
           }));
         </typescript>
         <reply>Graph Ops Complete</reply>`,
    ];

    const result = await harness.runQuery(
      'Test Graph Ops',
      mockResponses,
      'stdio'
    );
    const contentItems = result.content || (result.result && result.result.content);
    expect(contentItems).toBeDefined();
    const toolOutput = JSON.parse(contentItems[0].text);
    expect(toolOutput.reply).toBe('Graph Ops Complete');

    const verifyData = JSON.parse(
      await fs.readFile(
        path.join(harness.graphPath, 'graph-verify.json'),
        'utf-8'
      )
    );
    expect(verifyData.backlinks).toContain('PageA.md');
    expect(verifyData.outgoing).toContain('PageB');
    expect(verifyData.search).toContain('PageB.md');
    expect(verifyData.queryCount).toBe(1);
  });

  it('should cover State and Utility Operations via STDIO transport', async () => {
    const mockResponses = [
      `<think>Testing State Ops</think>
         <typescript>
           await mem.writeFile('state.txt', 'initial');
           await mem.saveCheckpoint();
           
           // Make changes to revert
           await mem.writeFile('state.txt', 'modified');
           await mem.revertToLastCheckpoint();
           
           // Utils
           const root = await mem.getGraphRoot();
           const tokenCount = await mem.getTokenCount('state.txt');
           
           await mem.writeFile('state-verify.json', JSON.stringify({
             root,
             tokenCount
           }));
         </typescript>
         <reply>State Ops Complete</reply>`,
    ];

    const result = await harness.runQuery(
      'Test State Ops',
      mockResponses,
      'stdio'
    );
    const contentItems = result.content || (result.result && result.result.content);
    expect(contentItems).toBeDefined();
    const toolOutput = JSON.parse(contentItems[0].text);
    expect(toolOutput.reply).toBe('State Ops Complete');

    // Verify content was reverted
    const content = await fs.readFile(
      path.join(harness.graphPath, 'state.txt'),
      'utf-8'
    );
    expect(content).toBe('initial');

    const verifyData = JSON.parse(
      await fs.readFile(
        path.join(harness.graphPath, 'state-verify.json'),
        'utf-8'
      )
    );
    // The root path inside the server should match the test harness path
    // Note: In Windows/Mac there might be slight canonicalization diffs, but should match.
    expect(verifyData.root).toContain(path.basename(harness.graphPath));
    expect(verifyData.tokenCount).toBeGreaterThan(0);
  });
});