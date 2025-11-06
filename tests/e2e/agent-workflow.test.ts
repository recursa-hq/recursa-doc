import { describe, it, expect, afterAll, beforeAll, beforeEach } from 'bun:test';
import { handleUserQuery } from '../../src/core/loop';
import type { AppConfig } from '../../src/config';
import type { ChatMessage } from '../../src/types';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import simpleGit from 'simple-git';
import { config as appConfig } from '../../src/config';

// This is a test-scoped override for the LLM call.
// It allows us to simulate the LLM's responses without making network requests.
const createMockQueryLLM = (responses: string[]) => {
  let callCount = 0;
  return async (
    _history: ChatMessage[],
    _config: AppConfig
  ): Promise<string> => {
    // TODO: Implement the mock logic.
    // This function will be called by `handleUserQuery`.
    // It should return the next pre-canned XML response from the `responses` array.
    // If called more times than there are responses, it should throw an error.
    const response = responses[callCount];
    if (!response) {
      throw new Error(`Mock LLM called more times than expected (${callCount}).`);
    }
    callCount++;
    return response;
  };
};

describe('Agent End-to-End Workflow', () => {
  let testGraphPath: string;
  let testConfig: AppConfig;

  beforeAll(async () => {
    // TODO: Set up a temporary directory for the knowledge graph.
    // testGraphPath = await fs.mkdtemp(path.join(os.tmpdir(), 'recursa-e2e-'));
    // testConfig = { ...appConfig, knowledgeGraphPath: testGraphPath };
  });

  afterAll(async () => {
    // TODO: Clean up the temporary directory.
    // await fs.rm(testGraphPath, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // TODO: Clean up the graph directory between tests to ensure isolation.
    // await fs.rm(testGraphPath, { recursive: true, force: true });
    // await fs.mkdir(testGraphPath, { recursive: true });
    // const git = simpleGit(testGraphPath);
    // await git.init();
    // await git.addConfig('user.name', 'Test User');
    // await git.addConfig('user.email', 'test@example.com');
  });

  it.skip('should correctly handle the Dr. Aris Thorne example from the docs', async () => {
    // 1. SETUP
    // TODO: Define the multi-turn LLM responses as XML strings based on the example.
    const turn1Response = `<think>Got it. I'll create pages for Dr. Aris Thorne and the AI Research Institute, and link them together.</think>
<typescript>
const orgPath = 'AI Research Institute.md';
const orgExists = await mem.fileExists(orgPath);
if (!orgExists) {
  await mem.writeFile(orgPath, '# AI Research Institute\\ntype:: organization\\n');
}
await mem.writeFile('Dr. Aris Thorne.md', '# Dr. Aris Thorne\\ntype:: person\\naffiliation:: [[AI Research Institute]]\\nfield:: [[Symbolic Reasoning]]');
</typescript>`;
    const turn2Response = `<think>Okay, I'm saving those changes to your permanent knowledge base.</think>
<typescript>
await mem.commitChanges('feat: Add Dr. Aris Thorne and AI Research Institute entities');
</typescript>
<reply>
Done. I've created pages for both Dr. Aris Thorne and the AI Research Institute and linked them.
</reply>`;

    // TODO: Create a mock LLM function for this specific test case.
    const mockQueryLLM = createMockQueryLLM([turn1Response, turn2Response]);

    // 2. EXECUTE
    // TODO: Call the main loop with the user query and the mocked LLM function.
    const query =
      'I just had a call with a Dr. Aris Thorne from the AI Research Institute...';
    // const finalReply = await handleUserQuery(query, testConfig, undefined, mockQueryLLM);

    // 3. ASSERT
    // TODO: Assert the final user-facing reply is correct.
    // expect(finalReply).toBe("Done. I've created pages for both Dr. Aris Thorne and the AI Research Institute and linked them.");

    // TODO: Verify file creation. Check that 'Dr. Aris Thorne.md' and 'AI Research Institute.md' exist.
    // const thornePath = path.join(testGraphPath, 'Dr. Aris Thorne.md');
    // const orgPath = path.join(testGraphPath, 'AI Research Institute.md');
    // await expect(fs.access(thornePath)).toResolve();
    // await expect(fs.access(orgPath)).toResolve();

    // TODO: Verify file content. Read 'Dr. Aris Thorne.md' and check for `affiliation:: [[AI Research Institute]]`.
    // const thorneContent = await fs.readFile(thornePath, 'utf-8');
    // expect(thorneContent).toInclude('affiliation:: [[AI Research Institute]]');

    // TODO: Verify the git commit. Use `simple-git` to check the log of the test repo.
    // const git = simpleGit(testGraphPath);
    // const log = await git.log({ maxCount: 1 });
    // expect(log.latest?.message).toBe('feat: Add Dr. Aris Thorne and AI Research Institute entities');
  });
});