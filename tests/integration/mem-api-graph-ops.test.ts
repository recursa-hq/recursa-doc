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

describe('MemAPI Graph Ops Integration Tests', () => {
  let harness: TestHarnessState;
  let mem: MemAPI;

  beforeEach(async () => {
    // Disable .gitignore for these tests so we can correctly search .log files
    harness = await createTestHarness({
      skipPortValidation: true, withGitignore: false });
    mem = harness.mem;
  });

  afterEach(async () => {
    await cleanupTestHarness(harness);
  });

  it('should query the graph with multiple conditions', async () => {
    const pageAContent = `
- # Page A
  - prop:: value
  - Link to [[Page B]].
    `;
    const pageBContent = `
- # Page B
  - prop:: other
  - No links here.
    `;

    await mem.writeFile('PageA.md', pageAContent);
    await mem.writeFile('PageB.md', pageBContent);

    const query = `(property prop:: value) AND (outgoing-link [[Page B]])`;
    const results = await mem.queryGraph(query);

    expect(results).toHaveLength(1);
    expect(results[0]).toBeDefined();
    expect(results[0]?.filePath).toBe('PageA.md');
  });

  it('should return an empty array for a query with no matches', async () => {
    const pageAContent = `- # Page A\n  - prop:: value`;
    await mem.writeFile('PageA.md', pageAContent);

    const query = `(property prop:: non-existent-value)`;
    const results = await mem.queryGraph(query);

    expect(results).toHaveLength(0);
  });

  it('should get backlinks and outgoing links', async () => {
    // PageA links to PageB and PageC
    await mem.writeFile('PageA.md', '- Links to [[Page B]] and [[Page C]].');
    // PageB links to PageC
    await mem.writeFile('PageB.md', '- Links to [[Page C]].');
    // PageC has no outgoing links
    await mem.writeFile('PageC.md', '- No links.');
    // PageD links to PageA. The filename is `PageA.md`, so the link must match the basename.
    await mem.writeFile('PageD.md', '- Links to [[PageA]].');

    // Test outgoing links
    const outgoingA = await mem.getOutgoingLinks('PageA.md');
    expect(outgoingA).toEqual(expect.arrayContaining(['Page B', 'Page C']));
    expect(outgoingA.length).toBe(2);

    const outgoingC = await mem.getOutgoingLinks('PageC.md');
    expect(outgoingC).toEqual([]);

    // Test backlinks
    const backlinksA = await mem.getBacklinks('PageA.md');
    expect(backlinksA).toEqual(['PageD.md']);

    const backlinksC = await mem.getBacklinks('PageC.md');
    expect(backlinksC).toEqual(
      expect.arrayContaining(['PageA.md', 'PageB.md'])
    );
    expect(backlinksC.length).toBe(2);
  });

  it('should perform a global full-text search', async () => {
    await mem.writeFile('a.txt', 'This file contains a unique-search-term.');
    await mem.writeFile('b.md', '- This file has a common-search-term.');
    await mem.writeFile('c.log', 'This one also has a common-search-term.');
    await mem.writeFile(
      'd.txt',
      'This file has nothing interesting to find.'
    );

    // Search for a unique term
    const uniqueResults = await mem.searchGlobal('unique-search-term');
    expect(uniqueResults).toEqual(['a.txt']);

    // Search for a common term
    const commonResults = await mem.searchGlobal('common-search-term');
    expect(commonResults).toEqual(expect.arrayContaining(['b.md', 'c.log']));
    expect(commonResults.length).toBe(2);

    // Search for a non-existent term
    const noResults = await mem.searchGlobal('non-existent-term');
    expect(noResults).toEqual([]);
  });
});