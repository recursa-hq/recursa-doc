import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import simpleGit from 'simple-git';
import { createMemAPI } from '../../src/core/mem-api';
import type { AppConfig } from '../../src/config';
import type { MemAPI } from '../../src/types';

describe('MemAPI Integration Tests', () => {
  let tempDir: string;
  let mem: MemAPI;

  const mockConfig: Pick<AppConfig, 'knowledgeGraphPath'> = {
    knowledgeGraphPath: '', // This will be set in beforeAll
  };

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'recursa-test-'));
    mockConfig.knowledgeGraphPath = tempDir;
  });

  beforeEach(async () => {
    // Clear the directory
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.mkdir(tempDir, { recursive: true });
    // Init git
    const git = simpleGit(tempDir);
    await git.init();
    await git.addConfig('user.name', 'Test User');
    await git.addConfig('user.email', 'test@example.com');
    // Create the mem API instance for this test
    mem = createMemAPI(mockConfig as AppConfig);
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should write, read, and check existence of a file', async () => {
    const filePath = 'test.md';
    const content = 'hello world';

    // TODO: call mem.writeFile to create the file.
    // await mem.writeFile(filePath, content);

    // TODO: call mem.readFile and assert its content is correct.
    // const readContent = await mem.readFile(filePath);
    // expect(readContent).toBe(content);

    // TODO: call mem.fileExists and assert it returns true.
    // const exists = await mem.fileExists(filePath);
    // expect(exists).toBe(true);

    // TODO: check for a non-existent file and assert it returns false.
    // const nonExistent = await mem.fileExists('not-real.md');
    // expect(nonExistent).toBe(false);
  });

  it('should throw an error for path traversal attempts', async () => {
    const maliciousPath = '../../../etc/passwd';

    // TODO: Assert that mem.readFile with a malicious path throws a specific security error.
    // await expect(mem.readFile(maliciousPath)).rejects.toThrow(
    //   'Security Error: Path traversal attempt detected.'
    // );

    // TODO: Assert that mem.writeFile with a malicious path also throws.
    // await expect(mem.writeFile(maliciousPath, '...')).rejects.toThrow(
    //   'Security Error: Path traversal attempt detected.'
    // );

    // TODO: Test other file-op functions like deleteFile, rename, etc.
  });

  it('should commit a change and log it', async () => {
    const filePath = 'a.md';
    const content = 'content';
    const commitMessage = 'feat: add a.md';

    // TODO: Write a file.
    // await mem.writeFile(filePath, content);

    // TODO: Commit the change with a message.
    // const commitHash = await mem.commitChanges(commitMessage);

    // TODO: Assert that the commit hash is a valid string.
    // expect(typeof commitHash).toBe('string');
    // expect(commitHash.length).toBeGreaterThan(5);

    // TODO: Get the git log for the file.
    // const log = await mem.gitLog(filePath, 1);

    // TODO: Assert that the log contains the correct commit message.
    // expect(log.length).toBe(1);
    // expect(log[0].message).toBe(commitMessage);
  });

  it('should list files in a directory', async () => {
    // TODO: Create a set of files and directories.
    // await mem.writeFile('a.txt', 'a');
    // await mem.writeFile('b.txt', 'b');
    // await mem.createDir('subdir');
    // await mem.writeFile('subdir/c.txt', 'c');

    // TODO: List files at the root and assert the contents.
    // The order might not be guaranteed, so use `expect.arrayContaining`.
    // const rootFiles = await mem.listFiles();
    // expect(rootFiles).toEqual(expect.arrayContaining(['a.txt', 'b.txt', 'subdir']));
    // expect(rootFiles.length).toBe(3);

    // TODO: List files in the subdirectory and assert the contents.
    // const subdirFiles = await mem.listFiles('subdir');
    // expect(subdirFiles).toEqual(['c.txt']);

    // TODO: List files in an empty directory and assert it's an empty array.
    // await mem.createDir('empty');
    // const emptyFiles = await mem.listFiles('empty');
    // expect(emptyFiles).toEqual([]);
  });
});