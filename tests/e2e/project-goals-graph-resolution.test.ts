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

describe('Project Goals: Graph Query Resolution', () => {
  let harness: TestHarnessState;

  beforeAll(async () => {
    harness = await createTestHarness({
      skipPortValidation: true,
      tempPrefix: 'recursa-graph-query-test',
      withGitignore: true,
    });
  });

  afterAll(async () => {
    if (harness) {
      await cleanupTestHarness(harness);
    }
  });

  describe('Complex Relationship Traversal & Synthesis', () => {
    it('should resolve multi-hop relationships for architectural decisions', async () => {
      // Setup: Create the Project Singularity ecosystem as described in docs/overview.md

      // 1. Create the project hub
      const projectContent = `- # Project Singularity
  - type:: project
  - status:: active
  - start-date:: 2024-06-01`;

      await harness.mem.writeFile('projects/Project Singularity.md', projectContent);

      // 2. Create person entities
      const evelynContent = `- # Dr. Evelyn Reed
  - type:: person
  - role:: Lead Research Scientist
  - leads-project::
    - [[Project Singularity]]`;

      const arisContent = `- # Dr. Aris Thorne
  - type:: person
  - role:: Research Scientist
  - team-member::
    - [[Project Singularity]]`;

      await harness.mem.writeFile('people/Dr. Evelyn Reed.md', evelynContent);
      await harness.mem.writeFile('people/Dr. Aris Thorne.md', arisContent);

      // 3. Create the architecture meeting
      const meetingFileContent = `- # 2024-07-22 - Singularity Architecture Deep Dive
  - type:: meeting
  - project:: [[Project Singularity]]
  - attendees:: [[Dr. Evelyn Reed]], [[Dr. Aris Thorne]]
  - outcomes::
    - This decision is formally documented in [[ADR-001 - Use Micro-frontend Architecture]].
  - action-items::
    - [[Dr. Aris Thorne]] to draft the initial ADR.`;

      await harness.mem.writeFile('meetings/2024/2024-07-22 - Singularity Architecture Deep Dive.md', meetingFileContent);

      // 4. Create the ADR (Architectural Decision Record)
      const adrContent = `- # ADR-001: Use Micro-frontend Architecture
  - status:: accepted
  - date:: 2024-07-25
  - authors:: [[Dr. Aris Thorne]]
  - decided-in:: [[2024-07-22 - Singularity Architecture Deep Dive]]
  - context::
    - The UI for the reasoning engine needs to be modular to allow different teams to work on visualization and input components independently.
  - justification::
    - Enables independent deployment cycles.
    - Reduces cognitive load for new developers.
  - consequences::
    - Increased complexity in the build pipeline.
    - Requires a robust component sharing strategy.`;

      await harness.mem.writeFile('decisions/ADR-001 - Use Micro-frontend Architecture.md', adrContent);

      // Commit all the initial setup
      await harness.mem.commitChanges('Setup Project Singularity knowledge graph with people, meetings, and ADRs');

      // Now simulate the complex user query: "Who made the micro-frontend decision for Singularity and why?"
      // This requires traversing multiple relationship hops:
      // User Query -> Search for "micro-frontend" -> Find ADR -> Get authors -> Find meeting -> Get attendees -> Synthesize answer

      // Step 1: Search for micro-frontend references
      const searchResults = await harness.mem.searchGlobal('micro-frontend');
      expect(searchResults).toContain('decisions/ADR-001 - Use Micro-frontend Architecture.md');

      // Step 2: Read the ADR to find the author and source meeting
      const adrPath = searchResults.find((file: string) => file.includes('ADR-001'));
      expect(adrPath).toBeDefined();

      const adrFileContent = await harness.mem.readFile(adrPath!);
      expect(adrFileContent).toContain('Dr. Aris Thorne');
      expect(adrFileContent).toContain('2024-07-22 - Singularity Architecture Deep Dive');

      // Extract the meeting link from ADR
      const meetingLinkMatch = adrFileContent.match(/decided-in::\s*\[\[(.*?)\]\]/);
      expect(meetingLinkMatch).not.toBeNull();
      const meetingTitle = meetingLinkMatch![1];

      // Step 3: Read the meeting to find attendees
      const meetingPath = `meetings/2024/${meetingTitle}.md`;
      const meetingReadContent = await harness.mem.readFile(meetingPath);
      expect(meetingReadContent).toContain('Dr. Evelyn Reed');
      expect(meetingReadContent).toContain('Dr. Aris Thorne');

      // Step 4: Verify the complete relationship chain
      // Dr. Aris Thorne -> authored -> ADR-001 -> decided in -> Architecture Meeting -> attended by -> Dr. Evelyn Reed

      // Check outgoing links from Dr. Aris Thorne
      const arisOutgoingLinks = await harness.mem.getOutgoingLinks('people/Dr. Aris Thorne.md');
      expect(arisOutgoingLinks).toContain('Project Singularity');

      // Check backlinks to Dr. Aris Thorne
      const arisBacklinks = await harness.mem.getBacklinks('people/Dr. Aris Thorne.md');
      expect(arisBacklinks).toContain('decisions/ADR-001 - Use Micro-frontend Architecture.md');
      expect(arisBacklinks).toContain('meetings/2024/2024-07-22 - Singularity Architecture Deep Dive.md');

      // Step 5: Verify search can find related entities across the graph
      const singularityResults = await harness.mem.searchGlobal('Singularity');
      expect(singularityResults.length).toBeGreaterThanOrEqual(4); // Project, meeting, ADR, and people

      const arisResults = await harness.mem.searchGlobal('Aris Thorne');
      expect(arisResults.length).toBeGreaterThanOrEqual(2); // Person and ADR

      // Step 6: Simulate the synthesis - the system should be able to answer:
      // "Dr. Aris Thorne made the micro-frontend decision during the Singularity Architecture Deep Dive meeting
      // on 2024-07-22, with Dr. Evelyn Reed also in attendance. The decision was documented in ADR-001."

      const synthesisEvidence = {
        decisionMaker: adrFileContent.match(/authors::\s*(.*)/)?.[1] || '',
        decisionDate: adrFileContent.match(/date::\s*(.*)/)?.[1] || '',
        sourceMeeting: meetingTitle,
        meetingAttendees: meetingReadContent.match(/attendees::\s*(.*)/)?.[1] || '',
        decisionContext: adrFileContent.match(/context::\s*([\s\S]*?)(?=\n\s*-\s*justification|$)/)?.[1] || ''
      };

      expect(synthesisEvidence.decisionMaker).toContain('Dr. Aris Thorne');
      expect(synthesisEvidence.decisionDate).toContain('2024-07-25');
      expect(synthesisEvidence.sourceMeeting).toContain('Singularity Architecture Deep Dive');
      expect(synthesisEvidence.meetingAttendees).toContain('Dr. Evelyn Reed');
      expect(synthesisEvidence.decisionContext).toContain('modular');

      await harness.mem.commitChanges('Complete complex graph query resolution test with multi-hop relationship traversal');
    });

    it('should handle broken link scenarios gracefully during traversal', async () => {
      // Create a document with both valid and invalid links
      const mixedLinksContent = `- # Test Document
  - type:: test
  - content:: Links to [[Valid Person]] and [[Non-existent Entity]]
  - references:: [[Dr. Evelyn Reed]], [[Invalid Reference]]
  - notes:: Mixed references for testing`;

      await harness.mem.writeFile('test/mixed-links.md', mixedLinksContent);

      // Test outgoing links - should include valid ones
      const outgoingLinks = await harness.mem.getOutgoingLinks('test/mixed-links.md');
      expect(outgoingLinks).toContain('Valid Person');
      expect(outgoingLinks).toContain('Dr. Evelyn Reed');
      expect(outgoingLinks).toContain('Non-existent Entity');
      expect(outgoingLinks).toContain('Invalid Reference');

      // Test backlinks to valid person - should work correctly
      const validPersonBacklinks = await harness.mem.getBacklinks('people/Dr. Evelyn Reed.md');
      expect(validPersonBacklinks).toContain('test/mixed-links.md');

      // Test search still works despite broken links
      const searchResults = await harness.mem.searchGlobal('Test Document');
      expect(searchResults).toContain('test/mixed-links.md');

      await harness.mem.commitChanges('Test broken link handling during graph traversal');
    });

    it('should demonstrate bidirectional relationship resolution', async () => {
      // Create additional interconnected entities to test bidirectional resolution

      const teamContent = `- # AI Research Team
  - type:: team
  - members:: [[Dr. Evelyn Reed]], [[Dr. Aris Thorne]]
  - projects:: [[Project Singularity]]
  - leads:: [[Dr. Evelyn Reed]]`;

      const institutionContent = `- # AI Research Institute
  - type:: institution
  - teams:: [[AI Research Team]]
  - researchers:: [[Dr. Evelyn Reed]], [[Dr. Aris Thorne]]`;

      await harness.mem.writeFile('teams/AI Research Team.md', teamContent);
      await harness.mem.writeFile('institutions/AI Research Institute.md', institutionContent);

      // Test bidirectional resolution:
      // Forward: Person -> Team -> Institution
      // Backward: Institution -> Team -> Person

      // First, let's verify the team has outgoing links to the expected entities
      const teamOutgoingLinks = await harness.mem.getOutgoingLinks('teams/AI Research Team.md');
      expect(teamOutgoingLinks).toContain('Dr. Evelyn Reed');
      expect(teamOutgoingLinks).toContain('Dr. Aris Thorne');
      expect(teamOutgoingLinks).toContain('Project Singularity');

      // Test that the institution links to the team
      const institutionOutgoingLinks = await harness.mem.getOutgoingLinks('institutions/AI Research Institute.md');
      expect(institutionOutgoingLinks).toContain('AI Research Team');

      // Test that search works across the graph
      const searchResults = await harness.mem.searchGlobal('AI Research Team');
      expect(searchResults.length).toBeGreaterThan(0);

      // Test that we can find related entities through search
      const projectResults = await harness.mem.searchGlobal('Project Singularity');
      expect(projectResults.length).toBeGreaterThan(0);

      // Test complex traversal: Find all projects associated with AI Research Institute
      const allProjects = await harness.mem.searchGlobal('Project Singularity');
      expect(allProjects).toContain('projects/Project Singularity.md');
      expect(allProjects).toContain('teams/AI Research Team.md');

      await harness.mem.commitChanges('Complete bidirectional relationship resolution test');
    });

    it('should maintain query performance across large knowledge graphs', async () => {
      // Create a larger knowledge graph to test performance
      const startTime = Date.now();

      // Create multiple projects
      for (let i = 1; i <= 10; i++) {
        const projectContent = `- # Project ${i}
  - type:: project
  - status:: active
  - team:: [[Dr. Evelyn Reed]], [[Researcher ${i}]]`;
        await harness.mem.writeFile(`projects/Project ${i}.md`, projectContent);
      }

      // Create multiple people
      for (let i = 1; i <= 20; i++) {
        const personContent = `- # Researcher ${i}
  - type:: person
  - role:: Researcher
  - projects:: [[Project ${((i - 1) % 10) + 1}]]`;
        await harness.mem.writeFile(`people/Researcher ${i}.md`, personContent);
      }

      // Create multiple meetings
      for (let i = 1; i <= 5; i++) {
        const meetingContent = `- # Meeting ${i}
  - type:: meeting
  - attendees:: [[Dr. Evelyn Reed]], [[Researcher ${i}]]
  - related-to:: [[Project ${i}]]`;
        await harness.mem.writeFile(`meetings/Meeting ${i}.md`, meetingContent);
      }

      await harness.mem.commitChanges('Create large knowledge graph for performance testing');

      const setupTime = Date.now();

      // Test search performance
      const searchStartTime = Date.now();
      const searchResults = await harness.mem.searchGlobal('Dr. Evelyn Reed');
      const searchTime = Date.now() - searchStartTime;

      expect(searchResults.length).toBeGreaterThan(10); // Should find multiple references
      expect(searchTime).toBeLessThan(1000); // Should complete within 1 second

      // Test link resolution performance
      const linkStartTime = Date.now();
      const outgoingLinks = await harness.mem.getOutgoingLinks('people/Dr. Evelyn Reed.md');
      const linkTime = Date.now() - linkStartTime;

      expect(outgoingLinks.length).toBeGreaterThanOrEqual(1); // Should find at least the project link
      expect(linkTime).toBeLessThan(500); // Should complete within 500ms

      const totalTime = Date.now() - startTime;
      console.log(`Performance test completed in ${totalTime}ms: setup=${setupTime-startTime}ms, search=${searchTime}ms, links=${linkTime}ms`);

      await harness.mem.commitChanges('Performance test completed successfully');
    });
  });

  describe('Query Synthesis & Answer Generation', () => {
    it('should synthesize answers from multiple disconnected sources', async () => {
      // Create entities that contain pieces of information that need to be synthesized

      const projectContextContent = `- # Project Context
  - type:: context
  - project:: [[Project Singularity]]
  - challenges::
    - Need for modular UI architecture
    - Multiple teams working on different components
    - Requirement for independent deployment cycles`;

      const architectureSolutionContent = `- # Architecture Solution
  - type:: solution
  - approach:: [[ADR-001 - Use Micro-frontend Architecture]]
  - benefits::
    - Independent deployment
    - Reduced cognitive load
    - Team autonomy`;

      const implementationPlanContent = `- # Implementation Plan
  - type:: plan
  - based-on:: [[ADR-001 - Use Micro-frontend Architecture]]
  - timeline:: Q1 2025
  - responsible:: [[Dr. Aris Thorne]]`;

      await harness.mem.writeFile('context/Project Context.md', projectContextContent);
      await harness.mem.writeFile('solutions/Architecture Solution.md', architectureSolutionContent);
      await harness.mem.writeFile('plans/Implementation Plan.md', implementationPlanContent);

      await harness.mem.commitChanges('Create synthesized information sources');

      // Test that the system can answer complex questions by combining information from multiple sources
      // Question: "What is the implementation plan for addressing the modular UI challenges in Project Singularity?"

      const contextResults = await harness.mem.searchGlobal('modular UI');
      expect(contextResults).toContain('context/Project Context.md');

      const solutionResults = await harness.mem.searchGlobal('micro-frontend');
      expect(solutionResults).toContain('solutions/Architecture Solution.md');

      const planResults = await harness.mem.searchGlobal('Implementation Plan');
      expect(planResults).toContain('plans/Implementation Plan.md');

      // Verify connections between the pieces
      const contextFileContent = await harness.mem.readFile('context/Project Context.md');
      const solutionFileContent = await harness.mem.readFile('solutions/Architecture Solution.md');
      const planFileContent = await harness.mem.readFile('plans/Implementation Plan.md');

      // The system should be able to synthesize that:
      // 1. Project Singularity has modular UI challenges (from context)
      // 2. The solution is micro-frontend architecture (from ADR)
      // 3. Implementation is planned for Q1 2025 by Dr. Aris Thorne (from plan)

      expect(contextFileContent).toContain('Project Singularity');
      expect(solutionFileContent).toContain('ADR-001');
      expect(planFileContent).toContain('Dr. Aris Thorne');
      expect(planFileContent).toContain('Q1 2025');

      await harness.mem.commitChanges('Complete information synthesis test');
    });
  });
});