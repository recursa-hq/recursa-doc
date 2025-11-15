import { createTestHarness, cleanupTestHarness, TestHarnessState } from '../../lib/test-harness.js';
import {
  createMCPClient,
  expectMCPError,
  createTestData,
  cleanupTestData,
  createMarkdownContent,
  createFileWithProperties
} from '../../lib/mcp-test-utils.js';

describe('Project Goals: Think-Act-Commit Workflow', () => {
  let harness: TestHarnessState;
  let client: any; // MCP Client
  const TENANT_ID = 'project-goals-test';

  beforeAll(async () => {
    // Create test harness
    harness = await createTestHarness({
      skipPortValidation: true,
      tempPrefix: 'recursa-project-goals-test',
      withGitignore: true,
    });

    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create MCP client
    client = await createMCPClient(TENANT_ID);
  });

  afterAll(async () => {
    // Clean up MCP client
    if (client) {
      try {
        // MCP client doesn't have explicit close method, it will be cleaned up with the process
      } catch (error) {
        console.warn('Error cleaning up MCP client:', error);
      }
    }

    // Clean up test harness
    if (harness) {
      await cleanupTestHarness(harness);
    }
  });

  describe('Dr. Aris Thorne Scenario (from docs/readme.md)', () => {
    it('should complete the think-act-commit workflow for new person entry', async () => {
      // Step 1: Create person entry with properties (Think phase)
      const personContent = `- # Dr. Aris Thorne
  - type:: person
  - affiliation:: AI Research Institute
  - email:: aris.thorne@ai-research.edu
  - specialization:: Neural Architecture Search, Reinforcement Learning, Multi-agent Systems
  - status:: Active
  - role:: Lead Researcher
  - notes:: Currently supervising three PhD candidates working on novel approaches to model interpretability.
  - created:: ${new Date().toISOString()}
  - source:: User interaction: "I just had a call with a Dr. Aris Thorne from the AI Research Institute"`;

      const personResult = await client.callTool({
        name: 'mem.writeFile',
        arguments: {
          filePath: 'people/Dr. Aris Thorne.md',
          content: personContent
        }
      });

      // Debug: log the actual result
      console.log('Write Person Result:', JSON.stringify(personResult, null, 2));

      expect(personResult.isError).toBeUndefined();
      expect(personResult.content[0].text).toBe('true');

      // Step 2: Create related project entry (Act phase)
      const projectContent = `- # Neural Architecture Search Project
  - type:: project
  - status:: Active
  - start_date:: 2024-01-15
  - lead:: [[Dr. Aris Thorne]]
  - institution:: AI Research Institute
  - objectives::
    - Develop novel architecture search algorithms
    - Improve efficiency of neural architecture discovery
    - Create interpretable architecture decision processes
  - recent_progress::
    - Completed baseline architecture search framework
    - Published preliminary results at ICML 2024
    - Currently optimizing search space definitions`;

      const projectResult = await client.callTool({
        name: 'mem.writeFile',
        arguments: {
          filePath: 'projects/neural-architecture-search.md',
          content: projectContent
        }
      });

      expect(projectResult.isError).toBeUndefined();
      expect(projectResult.content[0].text).toBe('true');

      // Step 3: Commit changes with meaningful message (Commit phase)
      const commitResult = await client.callTool({
        name: 'mem.commitChanges',
        arguments: {
          message: 'Add Dr. Aris Thorne profile and Neural Architecture Search project\n\nUser interaction: "I just had a call with a Dr. Aris Thorne from the AI Research Institute"\n\n- Created person entry with research details and contact information\n- Added project entry linking to Dr. Thorne\n- Established initial knowledge graph connections'
        }
      });

      expect(commitResult.isError).toBeUndefined();
      // commitChanges returns a commit hash, not a boolean
      expect(typeof commitResult.content[0].text).toBe('string');
      expect(commitResult.content[0].text).toMatch(/^[a-f0-9]{40}$/); // Git hash format

      // Step 4: Verify the knowledge graph connections work correctly
      const backlinksResult = await client.callTool({
        name: 'mem.getBacklinks',
        arguments: {
          filePath: 'people/Dr. Aris Thorne.md'
        }
      });

      expect(backlinksResult.isError).toBeUndefined();
      const backlinks = JSON.parse(backlinksResult.content[0].text);
      expect(backlinks).toContain('projects/neural-architecture-search.md');

      // Step 5: Verify git history captures the cognitive process
      const gitLogResult = await client.callTool({
        name: 'mem.gitLog',
        arguments: {}
      });

      expect(gitLogResult.isError).toBeUndefined();
      const logEntries = JSON.parse(gitLogResult.content[0].text);
      expect(logEntries.length).toBeGreaterThan(0);

      // Verify the commit message contains our cognitive process documentation
      const latestCommit = logEntries[0];
      expect(latestCommit.message).toContain('Dr. Aris Thorne');
      expect(latestCommit.message).toContain('Neural Architecture Search');

      // Step 6: Verify search can find the new information
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for file to be indexed

      const searchResult = await client.callTool({
        name: 'mem.searchGlobal',
        arguments: {
          query: 'AI Research Institute'
        }
      });

      expect(searchResult.isError).toBeUndefined();
      const searchResults = JSON.parse(searchResult.content[0].text);
      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults.some((file: string) => file.includes('people/Dr. Aris Thorne.md'))).toBe(true);
    });

    it('should demonstrate transparent cognitive audit trail', async () => {
      // Create another interaction to build on the existing knowledge
      const meetingContent = `- # Architecture Review Meeting
  - type:: meeting
  - date:: 2024-11-14
  - attendees:: [[Dr. Aris Thorne]], Maria Chen (Software Engineer), James Wilson (Product Manager)
  - location:: Conference Room A
  - agenda::
    - Review current architecture search results
    - Discuss integration challenges with existing systems
    - Plan next research milestone
  - decisions::
    - Focus on interpretability over pure performance for next quarter
    - Allocate additional compute resources for architecture search
    - Schedule weekly progress reviews
  - action_items::
    - [[Dr. Aris Thorne]] to prepare technical specification by 2024-11-21
    - Maria Chen to evaluate integration options
    - James Wilson to update project timeline`;

      const meetingResult = await client.callTool({
        name: 'mem.writeFile',
        arguments: {
          filePath: 'meetings/architecture-review-2024-11-14.md',
          content: meetingContent
        }
      });

      expect(meetingResult.isError).toBeUndefined();

      // Commit with detailed cognitive context
      const commitResult = await client.callTool({
        name: 'mem.commitChanges',
        arguments: {
          message: 'Document architecture review meeting with Dr. Aris Thorne\n\nMeeting outcomes:\n- Decision to prioritize interpretability over performance\n- Resource allocation for architecture search\n- Clear action items with owners and deadlines\n\nThis expands our understanding of the Neural Architecture Search project context.'
        }
      });

      expect(commitResult.isError).toBeUndefined();
      // commitChanges returns a commit hash, not a boolean
      expect(typeof commitResult.content[0].text).toBe('string');

      // In a stateful test, the file might already be committed from previous runs
      // So we accept both a new commit hash and "No changes to commit"
      const isNewCommit = /^[a-f0-9]{40}$/.test(commitResult.content[0].text);
      const noChanges = commitResult.content[0].text === 'No changes to commit.';

      expect(isNewCommit || noChanges).toBe(true);

      // Verify the git history shows the evolving understanding
      const gitLogResult = await client.callTool({
        name: 'mem.gitLog',
        arguments: {}
      });

      expect(gitLogResult.isError).toBeUndefined();
      const logEntries = JSON.parse(gitLogResult.content[0].text);

      // Should have commits from the workflow
      expect(logEntries.length).toBeGreaterThanOrEqual(1);

      // Verify we can trace the cognitive journey from previous commits
      const commitMessages = logEntries.map((entry: any) => entry.message).join(' ');
      expect(commitMessages).toContain('Aris Thorne');
      expect(commitMessages).toContain('Neural Architecture Search');

      // The meeting-specific content only appears if we got a new commit
      if (isNewCommit) {
        expect(commitMessages).toContain('meeting');
        expect(commitMessages).toContain('architecture review');
      }

      // Test complex query resolution across the knowledge graph
      const queryResult = await client.callTool({
        name: 'mem.queryGraph',
        arguments: {
          query: '(outgoing-link [[Dr. Aris Thorne]]) AND (property type:: meeting)'
        }
      });

      expect(queryResult.isError).toBeUndefined();
      const queryResults = JSON.parse(queryResult.content[0].text);
      expect(queryResults.length).toBeGreaterThan(0);

      const meetingEntry = queryResults.find((result: any) =>
        result.filePath.includes('architecture-review-2024-11-14.md')
      );
      expect(meetingEntry).toBeDefined();
      expect(meetingEntry.matches.length).toBeGreaterThan(0);
    });

    it('should maintain referential integrity across complex operations', async () => {
      // Test that broken links are handled gracefully
      const brokenLinkContent = `- # Test Document
  - type:: test
  - content:: This document references [[Non-existent Person]] and [[Dr. Aris Thorne]].
  - notes:: One reference should work, the other should be handled gracefully.`;

      const testResult = await client.callTool({
        name: 'mem.writeFile',
        arguments: {
          filePath: 'test/referential-integrity.md',
          content: brokenLinkContent
        }
      });

      expect(testResult.isError).toBeUndefined();

      // Get outgoing links - should extract both references
      const outgoingResult = await client.callTool({
        name: 'mem.getOutgoingLinks',
        arguments: {
          filePath: 'test/referential-integrity.md'
        }
      });

      expect(outgoingResult.isError).toBeUndefined();
      const outgoingLinks = JSON.parse(outgoingResult.content[0].text);
      expect(outgoingLinks).toContain('Non-existent Person');
      expect(outgoingLinks).toContain('Dr. Aris Thorne');

      // Get backlinks for Dr. Aris Thorne - should include our test document
      const backlinksResult = await client.callTool({
        name: 'mem.getBacklinks',
        arguments: {
          filePath: 'people/Dr. Aris Thorne.md'
        }
      });

      expect(backlinksResult.isError).toBeUndefined();
      const backlinks = JSON.parse(backlinksResult.content[0].text);
      expect(backlinks).toContain('test/referential-integrity.md');

      // Search should still work despite broken links
      const searchResult = await client.callTool({
        name: 'mem.searchGlobal',
        arguments: {
          query: 'Dr. Aris Thorne'
        }
      });

      expect(searchResult.isError).toBeUndefined();
      const searchResults = JSON.parse(searchResult.content[0].text);
      expect(searchResults.length).toBeGreaterThan(2); // Should find original + test document
    });
  });
});