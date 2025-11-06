import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import simpleGit from 'simple-git';
// import { createMemAPI } from '../../src/core/mem-api';
// import { AppConfig } from '../../src/config';

// TODO: Write integration tests for the MemAPI against a real temporary directory.
describe('MemAPI Integration Tests', () => {
  let tempDir: string;
  // let mem: MemAPI;

  // TODO: Set up a temporary test directory before all tests.
  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'recursa-test-'));
  });

  // TODO: Initialize a fresh git repo in the temp dir before each test.
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
    // mem = createMemAPI({ knowledgeGraphPath: tempDir, ...mockConfig });
  });

  // TODO: Clean up the temporary directory after all tests.
  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // TODO: Write a test for writeFile and readFile.
  it('should write and read a file', async () => {
    // await mem.writeFile('test.md', 'hello');
    // const content = await mem.readFile('test.md');
    // expect(content).toBe('hello');
  });

  // TODO: Add a test to prevent path traversal.
  it('should throw an error for path traversal attempts', async () => {
    // await expect(mem.readFile('../../../etc/passwd')).rejects.toThrow();
  });

  // TODO: Write a test for commitChanges and gitLog.
  it('should commit a change and log it', async () => {
    // await mem.writeFile('a.md', 'content');
    // const commitHash = await mem.commitChanges('feat: add a.md');
    // expect(commitHash).toBeString();
    // const log = await mem.gitLog('a.md');
    // expect(log[0].message).toBe('feat: add a.md');
  });
});