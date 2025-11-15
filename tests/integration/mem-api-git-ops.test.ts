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

describe('MemAPI Git Ops Integration Tests', () => {
  let harness: TestHarnessState;
  let mem: MemAPI;

  beforeEach(async () => {
    harness = await createTestHarness();
    mem = harness.mem;
  });

  afterEach(async () => {
    await cleanupTestHarness(harness);
  });

  it('should commit a change and log it', async () => {
    const filePath = 'a.md';
    const content = '- content';
    const commitMessage = 'feat: add a.md';

    await mem.writeFile(filePath, content);

    const commitHash = await mem.commitChanges(commitMessage);

    expect(typeof commitHash).toBe('string');
    expect(commitHash.length).toBeGreaterThan(5);

    const log = await mem.gitLog(filePath, 1);

    expect(log).toHaveLength(1);
    expect(log[0]).toBeDefined();
    expect(log[0]?.message).toBe(commitMessage);
  });

  it('should return diff for a file', async () => {
    const filePath = 'a.md';
    await mem.writeFile(filePath, '- version 1');
    await mem.commitChanges('v1');

    await mem.writeFile(filePath, '- version 1\n- version 2');
    const commitV2Hash = await mem.commitChanges('v2');

    await mem.writeFile(filePath, '- version 1\n- version 2\n- version 3');

    // Diff against HEAD (working tree vs last commit)
    const diffWorking = await mem.gitDiff(filePath);
    expect(diffWorking).toContain('+- version 3');

    // Diff between two commits
    const diffCommits = await mem.gitDiff(filePath, 'HEAD~1', 'HEAD');
    expect(diffCommits).toContain('+- version 2');
    expect(diffCommits).not.toContain('+ - version 3');

    // Diff from a specific commit to HEAD
    const diffFromCommit = await mem.gitDiff(filePath, commitV2Hash);
    expect(diffFromCommit).toContain('+- version 3');
  });

  it('should get changed files from the working tree', async () => {
    // Setup
    await mem.writeFile('a.txt', 'a');
    await mem.writeFile('b.txt', 'b');
    await mem.commitChanges('initial commit');

    // 1. Modify a.txt
    await mem.writeFile('a.txt', 'a modified');

    // 2. Create c.txt
    await mem.writeFile('c.txt', 'c');

    // 3. Delete b.txt
    await mem.deletePath('b.txt');

    // 4. Create and stage d.txt
    await mem.writeFile('d.txt', 'd');
    await harness.git.add('d.txt');

    const changedFiles = await mem.getChangedFiles();

    expect(changedFiles).toEqual(
      expect.arrayContaining(['a.txt', 'b.txt', 'c.txt', 'd.txt'])
    );
    expect(changedFiles.length).toBe(4);
  });

  it('should handle commit with no changes', async () => {
    await mem.writeFile('a.txt', 'a');
    await mem.commitChanges('commit 1');

    // Calling commitChanges with no changes should not throw an error
    const commitHash = await mem.commitChanges('no changes');
    expect(commitHash).toBe('No changes to commit.');

    // Verify no new commit was created
    const log = await mem.gitLog(undefined, 2);
    expect(log).toHaveLength(2); // commit 1 + initial .gitignore commit
    expect(log[0]?.message).toBe('commit 1');
  });

  it('should get git log for the whole repo', async () => {
    await mem.writeFile('a.txt', 'a');
    await mem.commitChanges('commit A');
    await mem.writeFile('b.txt', 'b');
    await mem.commitChanges('commit B');

    // Get full repo log
    const log = await mem.gitLog(undefined, 3);
    expect(log).toHaveLength(3); // A, B, and initial .gitignore
    expect(log[0]?.message).toBe('commit B');
    expect(log[1]?.message).toBe('commit A');
    expect(log[2]?.message).toContain('Initial commit');
  });
});