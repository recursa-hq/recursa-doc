import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals';
import {
  createTestHarness,
  cleanupTestHarness,
  resetTestHarness,
  type TestHarnessState,
} from '../lib/test-harness';
import type { MemAPI } from '../../src/types';

describe('MemAPI Integration Tests', () => {
  let harness: TestHarnessState;
  let mem: MemAPI;

  beforeEach(async () => {
    harness = await createTestHarness();
    mem = harness.mem;
  });

  afterEach(async () => {
    await cleanupTestHarness(harness);
  });

  it('should write, read, and check existence of a file', async () => {
    const filePath = 'test.md';
    const content = 'hello world';

    await mem.writeFile(filePath, content);

    const readContent = await mem.readFile(filePath);
    expect(readContent).toBe(content);

    const exists = await mem.fileExists(filePath);
    expect(exists).toBe(true);

    const nonExistent = await mem.fileExists('not-real.md');
    expect(nonExistent).toBe(false);
  });

  it('should throw an error for path traversal attempts', async () => {
    const maliciousPath = '../../../etc/passwd';

    await expect(mem.readFile(maliciousPath)).rejects.toThrow(
      'Security Error: Path traversal attempt detected.'
    );

    await expect(mem.writeFile(maliciousPath, '...')).rejects.toThrow(
      'Security Error: Path traversal attempt detected.'
    );

    await expect(mem.deletePath(maliciousPath)).rejects.toThrow(
      'Security Error: Path traversal attempt detected.'
    );

    await expect(mem.rename(maliciousPath, 'safe.md')).rejects.toThrow(
      'Security Error: Path traversal attempt detected.'
    );
  });

  it('should commit a change and log it', async () => {
    const filePath = 'a.md';
    const content = 'content';
    const commitMessage = 'feat: add a.md';

    await mem.writeFile(filePath, content);

    const commitHash = await mem.commitChanges(commitMessage);

    expect(typeof commitHash).toBe('string');
    expect(commitHash.length).toBeGreaterThan(5);

    const log = await mem.gitLog(filePath, 1);

    expect(log).toHaveLength(1);
    expect(log[0]).toBeDefined();
    expect(log[0].message).toBe(commitMessage);
  });

  it('should list files in a directory', async () => {
    await mem.writeFile('a.txt', 'a');
    await mem.writeFile('b.txt', 'b');
    await mem.createDir('subdir');
    await mem.writeFile('subdir/c.txt', 'c');

    const rootFiles = await mem.listFiles();
    expect(rootFiles).toEqual(
      expect.arrayContaining(['a.txt', 'b.txt', 'subdir'])
    );
    expect(rootFiles.length).toBeGreaterThanOrEqual(3);

    const subdirFiles = await mem.listFiles('subdir');
    expect(subdirFiles).toEqual(['c.txt']);

    await mem.createDir('empty');
    const emptyFiles = await mem.listFiles('empty');
    expect(emptyFiles).toEqual([]);
  });

  it('should query the graph with multiple conditions', async () => {
    const pageAContent = `
# Page A
prop:: value

Link to [[Page B]].
    `;
    const pageBContent = `
# Page B
prop:: other

No links here.
    `;

    await mem.writeFile('PageA.md', pageAContent);
    await mem.writeFile('PageB.md', pageBContent);

    const query = `(property prop:: value) AND (outgoing-link [[Page B]])`;
    const results = await mem.queryGraph(query);

    expect(results).toHaveLength(1);
    expect(results[0]).toBeDefined();
    expect(results[0].filePath).toBe('PageA.md');
  });

  it('should update a file atomically and fail if content changes', async () => {
    const filePath = 'atomic.txt';
    const originalContent = 'version 1';
    const newContent = 'version 2';

    // 1. Successful update
    await mem.writeFile(filePath, originalContent);
    const success = await mem.updateFile(filePath, originalContent, newContent);
    expect(success).toBe(true);
    const readContent1 = await mem.readFile(filePath);
    expect(readContent1).toBe(newContent);

    // 2. Failed update (content changed underneath)
    const currentContent = await mem.readFile(filePath); // "version 2"
    const nextContent = 'version 3';

    // Simulate another process changing the file
    const { promises: fs } = await import('fs');
    const path = await import('path');
    await fs.writeFile(path.join(harness.tempDir, filePath), 'version 2.5');

    // The update should fail because 'currentContent' ("version 2") no longer matches the file on disk ("version 2.5")
    await expect(
      mem.updateFile(filePath, currentContent, nextContent)
    ).rejects.toThrow('File content has changed since it was last read');

    // Verify the file was NOT changed
    const readContent2 = await mem.readFile(filePath);
    expect(readContent2).toBe('version 2.5');
  });
});
