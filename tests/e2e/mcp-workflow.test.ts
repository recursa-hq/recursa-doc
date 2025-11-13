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
  createMockLLMQueryWithSpy,
} from '../lib/test-harness';
import { handleUserQuery } from '../../src/core/loop';

describe('Agent Workflow E2E Tests (In-Process)', () => {
  let harness: TestHarnessState;

  beforeEach(async () => {
    harness = await createTestHarness();
  });

  afterEach(async () => {
    await cleanupTestHarness(harness);
  });

  it('should execute a simple file creation and commit query', async () => {
    // 1. Arrange
    const mockQueryLLM = createMockLLMQueryWithSpy([
      `<think>Okay, creating the file.</think>
         <typescript>await mem.writeFile('hello.txt', 'world');</typescript>`,
      `<think>Committing the file.</think>
         <typescript>await mem.commitChanges('feat: create hello.txt');</typescript>
         <reply>File created and committed.</reply>`,
    ]);

    // 2. Act
    const finalReply = await handleUserQuery(
      'create file',
      harness.mockConfig,
      'simple-query-session',
      'run-1',
      mockQueryLLM,
      async () => {}
    );

    // 3. Assert
    expect(finalReply).toBe('File created and committed.');

    // Verify side-effects
    expect(await harness.mem.fileExists('hello.txt')).toBe(true);
    const log = await harness.git.log();
    expect(log.latest?.message).toBe('feat: create hello.txt');
  });

  it('should correctly handle the Dr. Aris Thorne example', async () => {
    // 1. Arrange
    const turn1Response = `<think>Got it. I'll create pages for Dr. Aris Thorne and the AI Research Institute, and link them together.</think>
<typescript>
const orgPath = 'AI Research Institute.md';
if (!await mem.fileExists(orgPath)) {
  await mem.writeFile(orgPath, \`- # AI Research Institute
  - type:: organization\`);
}
await mem.writeFile('Dr. Aris Thorne.md', \`- # Dr. Aris Thorne
  - type:: person
  - affiliation:: [[AI Research Institute]]
  - field:: [[Symbolic Reasoning]]\`);
</typescript>`;
    const turn2Response = `<think>Okay, I'm saving those changes to your permanent knowledge base.</think>
<typescript>
await mem.commitChanges('feat: Add Dr. Aris Thorne and AI Research Institute entities');
</typescript>
<reply>Done. I've created pages for both Dr. Aris Thorne and the AI Research Institute and linked them.</reply>`;

    const mockQueryLLM = createMockLLMQueryWithSpy([
      turn1Response,
      turn2Response,
    ]);

    // 2. Act
    const finalReply = await handleUserQuery(
      'Create Dr. Aris Thorne',
      harness.mockConfig,
      'thorne-session',
      'run-2',
      mockQueryLLM,
      async () => {}
    );

    // 3. Assert
    expect(finalReply).toBe(
      "Done. I've created pages for both Dr. Aris Thorne and the AI Research Institute and linked them."
    );

    const thorneContent = await harness.mem.readFile('Dr. Aris Thorne.md');
    expect(thorneContent).toContain('affiliation:: [[AI Research Institute]]');

    expect(await harness.mem.fileExists('AI Research Institute.md')).toBe(true);

    const log = await harness.git.log();
    expect(log.latest?.message).toBe(
      'feat: Add Dr. Aris Thorne and AI Research Institute entities'
    );
  });

  it('should save a checkpoint and successfully revert to it', async () => {
    // 1. Arrange
    // Stash requires an initial commit to work reliably.
    await harness.mem.writeFile('init.txt', 'initial file');
    await harness.mem.commitChanges('initial commit for stash test');

    const mockQueryLLM = createMockLLMQueryWithSpy([
      `<think>Writing file 1.</think>
         <typescript>await mem.writeFile('file1.md', '- content1');</typescript>`,
      `<think>Saving checkpoint.</think>
         <typescript>await mem.saveCheckpoint();</typescript>`,
      `<think>Writing file 2.</think>
         <typescript>await mem.writeFile('file2.md', '- content2');</typescript>`,
      `<think>Reverting to checkpoint.</think>
         <typescript>await mem.revertToLastCheckpoint();</typescript>`,
      `<think>Committing.</think>
         <typescript>await mem.commitChanges('feat: add file1 and file2');</typescript>
         <reply>Reverted and committed.</reply>`,
    ]);

    // 2. Act
    const finalReply = await handleUserQuery(
      'test checkpoints',
      harness.mockConfig,
      'checkpoint-session',
      'run-3',
      mockQueryLLM,
      async () => {}
    );

    // 3. Assert
    expect(finalReply).toBe('Reverted and committed.');

    // After `saveCheckpoint`, `file1.md` is stashed.
    // After `writeFile('file2.md')`, `file2.md` is in the working directory.
    // After `revertToLastCheckpoint` (`git stash pop`), stashed changes (`file1.md`) are
    // applied, merging with working directory changes (`file2.md`).
    expect(await harness.mem.fileExists('file1.md')).toBe(true);
    expect(await harness.mem.fileExists('file2.md')).toBe(true);

    const log = await harness.git.log();
    expect(log.latest?.message).toBe('feat: add file1 and file2');

    expect(log.latest).not.toBeNull();

    // Verify both files were part of the commit
    const commitContent = await harness.git.show([
      '--name-only',
      log.latest!.hash,
    ]);
    expect(commitContent).toContain('file1.md');
    expect(commitContent).toContain('file2.md');
  });

  it('should block and gracefully handle path traversal attempts', async () => {
    // 1. Arrange
    const mockQueryLLM = createMockLLMQueryWithSpy([
      `<think>I will try to read a sensitive file.</think>
         <typescript>await mem.readFile('../../../../etc/hosts');</typescript>`,
      `<think>The previous action failed as expected due to security. I will inform the user.</think>
         <reply>I was unable to access that file due to security restrictions.</reply>`,
    ]);

    // 2. Act
    const finalReply = await handleUserQuery(
      'read sensitive file',
      harness.mockConfig,
      'security-session',
      'run-4',
      mockQueryLLM,
      async () => {}
    );

    // 3. Assert
    // The loop catches the security error, feeds it back to the LLM,
    // and the LLM then generates the final reply.
    expect(finalReply).toBe(
      'I was unable to access that file due to security restrictions.'
    );

    // Verify the agent was given a chance to recover.
    expect(mockQueryLLM).toHaveBeenCalledTimes(2);
  });
});