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

describe('MemAPI State Ops Integration Tests', () => {
  let harness: TestHarnessState;
  let mem: MemAPI;

  beforeEach(async () => {
    harness = await createTestHarness();
    mem = harness.mem;
  });

  afterEach(async () => {
    await cleanupTestHarness(harness);
  });

  it('should save and revert to a checkpoint', async () => {
    // 1. Initial state
    await mem.writeFile('a.txt', 'version a');
    await mem.commitChanges('commit a');

    // 2. Make changes and save checkpoint
    await mem.writeFile('b.txt', 'version b');
    const successSave = await mem.saveCheckpoint();
    expect(successSave).toBe(true);
    expect(await mem.fileExists('b.txt')).toBe(true);

    // 3. Make more changes
    await mem.writeFile('c.txt', 'version c');
    expect(await mem.fileExists('c.txt')).toBe(true);

    // 4. Revert
    const successRevert = await mem.revertToLastCheckpoint();
    expect(successRevert).toBe(true);

    // 5. Assert state
    expect(await mem.fileExists('a.txt')).toBe(true);
    expect(await mem.fileExists('b.txt')).toBe(true); // From checkpoint
    expect(await mem.fileExists('c.txt')).toBe(false); // Should be gone
  });

  it('should discard all staged and unstaged changes', async () => {
    // 1. Initial state
    await mem.writeFile('a.txt', 'original a');
    await mem.commitChanges('commit a');

    // 2. Make changes
    await mem.writeFile('a.txt', 'modified a'); // unstaged
    await mem.writeFile('b.txt', 'new b'); // unstaged
    await mem.writeFile('c.txt', 'new c'); // will be staged
    await harness.git.add('c.txt');

    // 3. Discard
    const successDiscard = await mem.discardChanges();
    expect(successDiscard).toBe(true);

    // 4. Assert state
    expect(await mem.readFile('a.txt')).toBe('original a'); // Reverted
    expect(await mem.fileExists('b.txt')).toBe(false); // Removed
    expect(await mem.fileExists('c.txt')).toBe(false); // Removed

    const status = await harness.git.status();
    expect(status.isClean()).toBe(true);
  });

  it('should handle reverting when no checkpoint exists', async () => {
    await mem.writeFile('a.txt', 'content');
    const success = await mem.revertToLastCheckpoint();

    // It should not throw an error and return false to indicate nothing was reverted.
    expect(success).toBe(false);
    expect(await mem.readFile('a.txt')).toBe('content'); // File should be untouched
  });
});