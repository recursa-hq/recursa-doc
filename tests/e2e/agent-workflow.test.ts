import {
  describe,
  it,
  expect,
  beforeAll,
  afterEach,
  beforeEach,
} from '@jest/globals';
import { handleUserQuery } from '../../src/core/loop';
import { type AppConfig, loadAndValidateConfig } from '../../src/config';
import {
  createTestHarness,
  cleanupTestHarness,
  createMockQueryLLM,
  type TestHarnessState,
} from '../lib/test-harness';

describe('Agent End-to-End Workflow', () => {
  let appConfig: AppConfig;
  let harness: TestHarnessState;

  beforeAll(async () => {
    appConfig = await loadAndValidateConfig();
  });

  beforeEach(async () => {
    // Create a test harness that inherits from real config but uses temp directory
    harness = await createTestHarness({
      apiKey: appConfig.openRouterApiKey,
      model: appConfig.llmModel,
      gitUserName: appConfig.gitUserName,
      gitEmail: appConfig.gitUserEmail,
    });
  });

  afterEach(async () => {
    await cleanupTestHarness(harness);
  });

  it('should correctly handle the Dr. Aris Thorne example from the docs', async () => {
    // 1. SETUP
    // Define the multi-turn LLM responses as XML strings based on the example.
    const turn1Response = `<think>Got it. I'll create pages for Dr. Aris Thorne and the AI Research Institute, and link them together.</think>
<typescript>
const orgPath = 'AI Research Institute.md';
const orgExists = await mem.fileExists(orgPath);
if (!orgExists) {
  await mem.writeFile(orgPath, '# AI Research Institute\ntype:: organization\n');
}
await mem.writeFile('Dr. Aris Thorne.md', '# Dr. Aris Thorne\ntype:: person\naffiliation:: [[AI Research Institute]]\nfield:: [[Symbolic Reasoning]]');
</typescript>`;
    const turn2Response = `<think>Okay, I'm saving those changes to your permanent knowledge base.</think>
<typescript>
await mem.commitChanges('feat: Add Dr. Aris Thorne and AI Research Institute entities');
</typescript>
<reply>
Done. I've created pages for both Dr. Aris Thorne and the AI Research Institute and linked them.
</reply>`;

    // Create a mock LLM function for this specific test case.
    const mockQueryLLM = createMockQueryLLM([turn1Response, turn2Response]);

    // 2. EXECUTE
    // Call the main loop with the user query and the mocked LLM function.
    const query =
      'I just had a call with a Dr. Aris Thorne from the AI Research Institute. He works on symbolic reasoning. Create a new entry for him and link it to his affiliation.';
    const finalReply = await handleUserQuery(
      query,
      harness.mockConfig,
      undefined,
      mockQueryLLM
    );

    // 3. ASSERT
    // Assert the final user-facing reply is correct.
    expect(finalReply).toBe(
      "Done. I've created pages for both Dr. Aris Thorne and the AI Research Institute and linked them."
    );

    // Verify file creation. Check that 'Dr. Aris Thorne.md' and 'AI Research Institute.md' exist.
    const thorneExists = await harness.mem.fileExists('Dr. Aris Thorne.md');
    const orgExists = await harness.mem.fileExists('AI Research Institute.md');

    expect(thorneExists).toBe(true);
    expect(orgExists).toBe(true);

    // Verify file content. Read 'Dr. Aris Thorne.md' and check for `affiliation:: [[AI Research Institute]]`.
    const thorneContent = await harness.mem.readFile('Dr. Aris Thorne.md');
    expect(thorneContent).toContain('affiliation:: [[AI Research Institute]]');
    expect(thorneContent).toContain('field:: [[Symbolic Reasoning]]');

    // Verify the git commit. Use `simple-git` to check the log of the test repo.
    const log = await harness.git.log({ maxCount: 1 });
    expect(log.latest?.message).toBe(
      'feat: Add Dr. Aris Thorne and AI Research Institute entities'
    );
  });
});
