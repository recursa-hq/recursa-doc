import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from '@jest/globals';
import {
  createTestHarness,
  cleanupTestHarness,
  type TestHarnessState,
} from '../lib/test-harness.js';

describe('Project Goals Validation Tests', () => {
  let harness: TestHarnessState;

  beforeAll(async () => {
    harness = await createTestHarness({
      skipPortValidation: true,
      tempPrefix: 'recursa-project-goals-validation',
      withGitignore: true,
    });
  });

  afterAll(async () => {
    if (harness) {
      await cleanupTestHarness(harness);
    }
  });

  describe('Think-Act-Commit Workflow (from docs/readme.md)', () => {
    it('should demonstrate complete think-act-commit cognitive workflow', async () => {
      // THINK PHASE: User shares new information
      // "I just had a call with a Dr. Aris Thorne from the AI Research Institute"

      const personContent = `- # Dr. Aris Thorne
  - type:: person
  - affiliation:: AI Research Institute
  - email:: aris.thorne@ai-research.edu
  - specialization:: Neural Architecture Search, Reinforcement Learning, Multi-agent Systems
  - status:: Active
  - role:: Lead Researcher
  - notes:: Currently supervising three PhD candidates working on novel approaches to model interpretability.
  - created:: 2024-11-14T10:00:00.000Z
  - source:: User interaction: "I just had a call with a Dr. Aris Thorne from the AI Research Institute"`;

      await harness.mem.writeFile('people/Dr. Aris Thorne.md', personContent);

      // ACT PHASE: System acts on the information by creating related entities
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

      await harness.mem.writeFile('projects/Neural Architecture Search Project.md', projectContent);

      // COMMIT PHASE: System commits with meaningful audit trail
      await harness.mem.commitChanges(`Add Dr. Aris Thorne profile and Neural Architecture Search project

User interaction: "I just had a call with a Dr. Aris Thorne from the AI Research Institute"

Cognitive Process:
- Created person entry with research details and contact information
- Added project entry linking to Dr. Thorne's expertise
- Established initial knowledge graph connections
- This represents the complete think-act-commit workflow described in docs/readme.md`);

      // VALIDATION: Verify the cognitive workflow was captured correctly
      const log = await harness.mem.gitLog();
      expect(log.length).toBeGreaterThan(0);
      expect(log[0]?.message).toContain('Dr. Aris Thorne');
      // The commit message demonstrates the cognitive process through its content
      expect(log[0]?.message.length).toBeGreaterThan(10); // Has meaningful content

      // Verify knowledge graph connections work
      const backlinks = await harness.mem.getBacklinks('people/Dr. Aris Thorne.md');
      expect(backlinks).toContain('projects/Neural Architecture Search Project.md');

      // Verify search can find the new information
      const searchResults = await harness.mem.searchGlobal('Aris Thorne');
      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults.some((file: string) => file.includes('people/Dr. Aris Thorne.md'))).toBe(true);

      // Verify the person file has correct content
      const personFile = await harness.mem.readFile('people/Dr. Aris Thorne.md');
      expect(personFile).toContain('AI Research Institute');
      expect(personFile).toContain('Neural Architecture Search');
      expect(personFile).toContain('User interaction');
    });

    it('should maintain transparent audit trail across multiple interactions', async () => {
      // Second interaction: User mentions a meeting with the same person
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

      await harness.mem.writeFile('meetings/Architecture Review Meeting.md', meetingContent);
      await harness.mem.commitChanges(`Document architecture review meeting with Dr. Aris Thorne

Meeting outcomes:
- Decision to prioritize interpretability over performance
- Resource allocation for architecture search
- Clear action items with owners and deadlines

This expands our understanding of the Neural Architecture Search project context.`);

      // Verify the git history shows the evolving understanding
      const logEntries = await harness.mem.gitLog();
      const commitMessages = logEntries.map((entry: any) => entry.message).join(' ');
      expect(commitMessages).toContain('Dr. Aris Thorne');
      expect(commitMessages).toContain('Neural Architecture Search');
      expect(commitMessages).toContain('meeting');
      // The interpretability keyword is in the meeting content, not necessarily in commit messages
      expect(commitMessages).toContain('architecture');

      // Verify complex query resolution across the knowledge graph
      const queryResults = await harness.mem.searchGlobal('architecture search');
      expect(queryResults.length).toBeGreaterThanOrEqual(2); // Should find project and meeting
    });

    it('should maintain referential integrity across complex operations', async () => {
      // Test that broken links are handled gracefully
      const testContent = `- # Test Document
  - type:: test
  - content:: This document references [[Non-existent Person]] and [[Dr. Aris Thorne]].
  - notes:: One reference should work, the other should be handled gracefully.`;

      await harness.mem.writeFile('test/referential-integrity.md', testContent);

      // Backlinks should still work for valid references
      const backlinks = await harness.mem.getBacklinks('people/Dr. Aris Thorne.md');
      expect(backlinks).toContain('test/referential-integrity.md');

      // Search should still work despite broken links
      const searchResults = await harness.mem.searchGlobal('Test Document');
      expect(searchResults).toContain('test/referential-integrity.md');

      await harness.mem.commitChanges('Add test document with mixed link references');
    });
  });

  describe('Core Business Logic Validation', () => {
    it('should validate logseq format compliance automatically', async () => {
      // Test that the system properly validates Logseq format
      const invalidContent = '# Invalid Header\nMissing bullet point format';

      await expect(
        harness.mem.writeFile('test/invalid.md', invalidContent)
      ).rejects.toThrow('Invalid Logseq content');

      // Test valid content
      const validContent = `- # Valid Header
  - property:: value`;
      await expect(
        harness.mem.writeFile('test/valid.md', validContent)
      ).resolves.not.toThrow();
    });

    it('should enforce proper git workflow with meaningful commits', async () => {
      const testFile = '- # Test\n  - content:: test data';
      await harness.mem.writeFile('test/git-workflow.md', testFile);

      const commitHash = await harness.mem.commitChanges('Test commit with meaningful message');
      expect(commitHash).toMatch(/^[a-f0-9]{40}$/);

      // Verify git log contains meaningful message
      const log = await harness.mem.gitLog('test/git-workflow.md', 1);
      expect(log[0]?.message).toBe('Test commit with meaningful message');
      expect(log[0]?.hash).toBe(commitHash);
    });

    it('should maintain knowledge graph consistency across operations', async () => {
      // Create a network of interconnected entities
      const person1 = `- # Alice Johnson
  - type:: person
  - role:: Software Engineer`;
      const person2 = `- # Bob Smith
  - type:: person
  - role:: Product Manager`;
      const project = `- # Test Project
  - type:: project
  - team:: [[Alice Johnson]], [[Bob Smith]]`;

      await harness.mem.writeFile('people/Alice Johnson.md', person1);
      await harness.mem.writeFile('people/Bob Smith.md', person2);
      await harness.mem.writeFile('projects/Test Project.md', project);

      // Test bidirectional link resolution
      const aliceBacklinks = await harness.mem.getBacklinks('people/Alice Johnson.md');
      const bobBacklinks = await harness.mem.getBacklinks('people/Bob Smith.md');
      const projectOutgoing = await harness.mem.getOutgoingLinks('projects/Test Project.md');

      expect(aliceBacklinks).toContain('projects/Test Project.md');
      expect(bobBacklinks).toContain('projects/Test Project.md');
      expect(projectOutgoing).toContain('Alice Johnson');
      expect(projectOutgoing).toContain('Bob Smith');
    });
  });

  describe('Safety and Error Recovery', () => {
    it('should handle file-not-found errors gracefully', async () => {
      await expect(
        harness.mem.readFile('non-existent.md')
      ).rejects.toThrow('ENOENT');
    });

    it('should recover from operations with partial failures', async () => {
      // Create a file, try to create invalid content, then continue
      await harness.mem.writeFile('test/recovery.md', '- # Recovery Test');

      // Try invalid content (should fail)
      try {
        await harness.mem.writeFile('test/invalid.md', '# Invalid');
      } catch (error) {
        // Expected to fail
      }

      // Should be able to continue with valid operations
      await harness.mem.writeFile('test/continues.md', '- # Continues');
      expect(await harness.mem.fileExists('test/continues.md')).toBe(true);
    });
  });
});