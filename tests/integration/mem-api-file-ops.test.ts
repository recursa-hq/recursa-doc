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
  type TestHarnessState,
} from '../lib/test-harness';
import type { MemAPI } from '../../src/types';
import path from 'path';
import { promises as fs } from 'fs';

describe('MemAPI File Ops Integration Tests', () => {
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

  it('should create nested directories', async () => {
    const dirPath = 'a/b/c';
    await mem.createDir(dirPath);
    const stats = await fs.stat(path.join(harness.tempDir, dirPath));
    expect(stats.isDirectory()).toBe(true);
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
    expect(rootFiles.length).toBeGreaterThanOrEqual(3); // .gitignore might be there

    const subdirFiles = await mem.listFiles('subdir');
    expect(subdirFiles).toEqual(['c.txt']);

    await mem.createDir('empty');
    const emptyFiles = await mem.listFiles('empty');
    expect(emptyFiles).toEqual([]);
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
    await fs.writeFile(path.join(harness.tempDir, filePath), 'version 2.5');

    // The update should fail because 'currentContent' ("version 2") no longer matches the file on disk ("version 2.5")
    await expect(
      mem.updateFile(filePath, currentContent, nextContent)
    ).rejects.toThrow(/File content has changed since it was last read/);

    // Verify the file was NOT changed by the failed update
    const readContent2 = await mem.readFile(filePath);
    expect(readContent2).toBe('version 2.5');
  });

  it('should delete a file and a directory recursively', async () => {
    // Delete file
    await mem.writeFile('file-to-delete.txt', 'content');
    expect(await mem.fileExists('file-to-delete.txt')).toBe(true);
    await mem.deletePath('file-to-delete.txt');
    expect(await mem.fileExists('file-to-delete.txt')).toBe(false);

    // Delete directory
    await mem.createDir('dir-to-delete/subdir');
    await mem.writeFile('dir-to-delete/subdir/file.txt', 'content');
    expect(await mem.fileExists('dir-to-delete/subdir/file.txt')).toBe(true);
    await mem.deletePath('dir-to-delete');
    expect(await mem.fileExists('dir-to-delete')).toBe(false);
  });

  it('should rename a file and a directory', async () => {
    // Rename file
    await mem.writeFile('old-name.txt', 'content');
    expect(await mem.fileExists('old-name.txt')).toBe(true);
    await mem.rename('old-name.txt', 'new-name.txt');
    expect(await mem.fileExists('old-name.txt')).toBe(false);
    expect(await mem.fileExists('new-name.txt')).toBe(true);
    expect(await mem.readFile('new-name.txt')).toBe('content');

    // Rename directory
    await mem.createDir('old-dir/subdir');
    await mem.writeFile('old-dir/subdir/file.txt', 'content');
    expect(await mem.fileExists('old-dir')).toBe(true);
    await mem.rename('old-dir', 'new-dir');
    expect(await mem.fileExists('old-dir')).toBe(false);
    expect(await mem.fileExists('new-dir/subdir/file.txt')).toBe(true);
  });

  describe('Path Traversal Security', () => {
    const maliciousPath = '../../../etc/malicious';
    const ops: { name: string; fn: (mem: MemAPI) => Promise<unknown> }[] = [
      { name: 'readFile', fn: (mem) => mem.readFile(maliciousPath) },
      { name: 'writeFile', fn: (mem) => mem.writeFile(maliciousPath, '...') },
      {
        name: 'updateFile',
        fn: (mem) => mem.updateFile(maliciousPath, 'old', 'new'),
      },
      { name: 'deletePath', fn: (mem) => mem.deletePath(maliciousPath) },
      { name: 'rename_from', fn: (mem) => mem.rename(maliciousPath, 'safe') },
      { name: 'rename_to', fn: (mem) => mem.rename('safe', maliciousPath) },
      { name: 'fileExists', fn: (mem) => mem.fileExists(maliciousPath) },
      { name: 'createDir', fn: (mem) => mem.createDir(maliciousPath) },
      { name: 'listFiles', fn: (mem) => mem.listFiles(maliciousPath) },
    ];

    for (const op of ops) {
      it(`should block path traversal for ${op.name}`, async () => {
        // fileExists should return false, not throw, for security reasons.
        if (op.name === 'fileExists') {
          await expect(op.fn(mem)).resolves.toBe(false);
        } else {
          // All other ops should reject with a security error.
          await expect(op.fn(mem)).rejects.toThrow(
            /Path traversal attempt detected|Security violation/
          );
        }
      });
    }
  });
});