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

describe('MemAPI Util Ops Integration Tests', () => {
  let harness: TestHarnessState;
  let mem: MemAPI;

  beforeEach(async () => {
    harness = await createTestHarness();
    mem = harness.mem;
  });

  afterEach(async () => {
    await cleanupTestHarness(harness);
  });

  it('should return the correct graph root path', async () => {
    const root = await mem.getGraphRoot();
    expect(root).toBe(harness.tempDir);
  });

  it('should correctly estimate token count for a single file', async () => {
    const content = 'This is a test sentence with several words.'; // 44 chars
    await mem.writeFile('test.txt', content);
    const tokenCount = await mem.getTokenCount('test.txt');
    const expected = Math.ceil(content.length / 4); // 11
    expect(tokenCount).toBe(expected);
  });

  it('should correctly estimate token counts for multiple files', async () => {
    const content1 = 'File one content.'; // 17 chars -> 5 tokens
    const content2 = 'File two has slightly more content here.'; // 38 chars -> 10 tokens
    await mem.writeFile('file1.txt', content1);
    await mem.writeFile('sub/file2.txt', content2);

    const results = await mem.getTokenCountForPaths([
      'file1.txt',
      'sub/file2.txt',
    ]);

    expect(results).toHaveLength(2);
    expect(results).toEqual(
      expect.arrayContaining([
        { path: 'file1.txt', tokenCount: Math.ceil(content1.length / 4) },
        { path: 'sub/file2.txt', tokenCount: Math.ceil(content2.length / 4) },
      ])
    );
  });

  it('should throw an error when counting tokens for a non-existent file', async () => {
    await expect(mem.getTokenCount('not-real.txt')).rejects.toThrow(
      /Failed to count tokens for not-real.txt/
    );
  });
});