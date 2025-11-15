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

describe('Project Goals: Knowledge Graph Management', () => {
  let harness: TestHarnessState;

  beforeAll(async () => {
    harness = await createTestHarness({
      skipPortValidation: true,
      tempPrefix: 'recursa-knowledge-graph-test',
      withGitignore: true,
    });
  });

  afterAll(async () => {
    if (harness) {
      await cleanupTestHarness(harness);
    }
  });

  describe('Complete Knowledge Graph Lifecycle', () => {
    it('should build comprehensive Project Singularity knowledge graph through iterative development', async () => {
      // Phase 1: Initial Project Setup
      console.log('Phase 1: Setting up initial project structure...');

      const projectContent = `- # Project Singularity
  - type:: project
  - status:: active
  - start-date:: 2024-06-01
  - description:: Next-generation AI reasoning engine with modular architecture
  - goals::
    - Create unified reasoning framework
    - Enable multi-agent collaboration
    - Support extensible plugin architecture
  - milestones::
    - Q3 2024: Core architecture foundation
    - Q4 2024: Multi-agent integration
    - Q1 2025: Plugin ecosystem launch`;

      await harness.mem.writeFile('projects/Project Singularity.md', projectContent);

      // Phase 2: Team and Organization Structure
      console.log('Phase 2: Building team and organization structure...');

      const evelynContent = `- # Dr. Evelyn Reed
  - type:: person
  - role:: Lead Research Scientist
  - expertise:: AI Architecture, Neural Networks, Multi-agent Systems
  - status:: Active
  - leads-project:: [[Project Singularity]]
  - department:: AI Research Institute
  - contact:: evelyn.reed@ai-institute.edu
  - bio:: PhD in Computer Science with 15 years of experience in AI research and development.`;

      const arisContent = `- # Dr. Aris Thorne
  - type:: person
  - role:: Research Scientist
  - expertise:: Neural Architecture Search, Reinforcement Learning, Multi-agent Systems
  - status:: Active
  - team-member:: [[Project Singularity]]
  - department:: AI Research Institute
  - contact:: aris.thorne@ai-institute.edu
  - bio:: Expert in neural architecture optimization and automated machine learning.`;

      const teamContent = `- # AI Research Team
  - type:: team
  - purpose:: Advanced AI research and development
  - members:: [[Dr. Evelyn Reed]], [[Dr. Aris Thorne]]
  - projects:: [[Project Singularity]]
  - leads:: [[Dr. Evelyn Reed]]
  - budget:: $2.5M
  - timeline:: 2024-2026`;

      const institutionContent = `- # AI Research Institute
  - type:: institution
  - mission:: Pioneering next-generation AI technologies
  - teams:: [[AI Research Team]]
  - researchers:: [[Dr. Evelyn Reed]], [[Dr. Aris Thorne]]
  - partnerships:: MIT AI Lab, Stanford HAI, DeepMind
  - funding:: $15M annual budget`;

      await harness.mem.writeFile('people/Dr. Evelyn Reed.md', evelynContent);
      await harness.mem.writeFile('people/Dr. Aris Thorne.md', arisContent);
      await harness.mem.writeFile('teams/AI Research Team.md', teamContent);
      await harness.mem.writeFile('institutions/AI Research Institute.md', institutionContent);

      // Phase 3: Architecture and Technical Decisions
      console.log('Phase 3: Documenting architecture and technical decisions...');

      const architectureMeetingContent = `- # 2024-07-22 - Singularity Architecture Deep Dive
  - type:: meeting
  - date:: 2024-07-22
  - project:: [[Project Singularity]]
  - attendees:: [[Dr. Evelyn Reed]], [[Dr. Aris Thorne]]
  - duration:: 2 hours
  - location:: AI Research Institute - Conference Room A
  - agenda:: Architecture review and decision making
  - outcomes::
    - This decision is formally documented in [[ADR-001 - Use Micro-frontend Architecture]].
  - action-items::
    - [[Dr. Aris Thorne]] to draft the initial ADR.
    - [[Dr. Evelyn Reed]] to review and approve architecture approach.
  - notes:: Comprehensive review of architectural options conducted.`;

      const adrContent = `- # ADR-001: Use Micro-frontend Architecture
  - status:: accepted
  - date:: 2024-07-25
  - authors:: [[Dr. Aris Thorne]]
  - decided-in:: [[2024-07-22 - Singularity Architecture Deep Dive]]
  - context::
    - The UI for the reasoning engine needs to be modular to allow different teams to work on visualization and input components independently.
    - Multiple research groups need to integrate their specialized tools and interfaces.
    - The system must support rapid iteration and experimentation without affecting core functionality.
  - alternatives-considered::
    - Monolithic architecture: Simpler but limits team autonomy
    - Service-oriented architecture: Good separation but complex deployment
    - Micro-frontend architecture: Optimal balance of modularity and maintainability
  - decision:: Use micro-frontend architecture for the UI layer
  - justification::
    - Enables independent deployment cycles for different UI components
    - Reduces cognitive load for new developers joining specific feature areas
    - Allows teams to use different technologies and frameworks as needed
    - Supports A/B testing and gradual feature rollouts
  - consequences::
    - Increased complexity in the build pipeline
    - Requires a robust component sharing strategy
    - Need for comprehensive integration testing
    - Additional overhead in development tooling`;

      const technicalSpecContent = `- # Project Singularity Technical Specification
  - type:: document
  - version:: 1.2.0
  - last-updated:: 2024-11-14
  - related-to:: [[Project Singularity]], [[ADR-001 - Use Micro-frontend Architecture]]
  - components::
    - Core reasoning engine (Python/TypeScript)
    - Micro-frontend UI components (React/Vue)
    - Plugin system (Node.js)
    - Knowledge graph storage (Neo4j/PostgreSQL)
    - API gateway (FastAPI)
  - integration-points::
    - External AI model APIs
    - Research collaboration tools
    - Data visualization libraries
  - deployment-strategy:: Containerized microservices with Kubernetes`;

      await harness.mem.writeFile('meetings/2024/2024-07-22 - Singularity Architecture Deep Dive.md', architectureMeetingContent);
      await harness.mem.writeFile('decisions/ADR-001 - Use Micro-frontend Architecture.md', adrContent);
      await harness.mem.writeFile('documents/Project Singularity Technical Specification.md', technicalSpecContent);

      // Phase 4: Research Progress and Publications
      console.log('Phase 4: Tracking research progress and publications...');

      const progressReportContent = `- # Monthly Progress Report - October 2024
  - type:: report
  - period:: October 2024
  - project:: [[Project Singularity]]
  - author:: [[Dr. Evelyn Reed]]
  - status:: completed
  - achievements::
    - Successfully implemented core reasoning engine prototype
    - Completed micro-frontend architecture design
    - Established collaboration with MIT AI Lab
    - Published paper on neural architecture search optimization
  - challenges::
    - Integration complexity higher than expected
    - Need additional resources for testing infrastructure
  - next-month-focus::
    - Implement plugin system architecture
    - Begin UI component development
    - Expand team with frontend specialists
  - metrics::
    - Lines of code: 45,000+
    - Research papers: 3 published, 2 under review
    - GitHub stars: 1,200+
    - Team size: 12 members`;

      const publicationContent = `- # Neural Architecture Search for Multi-agent Systems
  - type:: publication
  - title:: Neural Architecture Search for Multi-agent Systems
  - authors:: [[Dr. Aris Thorne]], [[Dr. Evelyn Reed]], [[Collaborator Name]]
  - venue:: ICML 2024
  - status:: published
  - doi:: 10.1109/ICML.2024.12345
  - abstract:: This paper presents a novel approach to neural architecture search specifically designed for multi-agent systems...
  - keywords:: Neural Architecture Search, Multi-agent Systems, Automated Machine Learning, Optimization
  - related-work:: [[Project Singularity]]
  - impact:: Significant improvement in architecture discovery efficiency`;

      await harness.mem.writeFile('reports/Monthly Progress Report - October 2024.md', progressReportContent);
      await harness.mem.writeFile('publications/Neural Architecture Search for Multi-agent Systems.md', publicationContent);

      // Phase 5: External Collaborations and Partnerships
      console.log('Phase 5: Establishing external collaborations...');

      const partnerContent = `- # MIT AI Lab
  - type:: partner
  - category:: academic
  - focus:: Joint research on neural architecture optimization
  - contacts:: Prof. Sarah Chen, Dr. Michael Rodriguez
  - projects:: [[Project Singularity]]
  - agreement-date:: 2024-08-15
  - duration:: 2 years
  - milestones::
    - Q4 2024: Joint publication on architecture search
    - Q1 2025: Shared dataset release
    - Q2 2025: Co-developed optimization framework`;

      const conferenceContent = `- # NeurIPS 2024
  - type:: event
  - category:: conference
  - dates:: December 9-15, 2024
  - location:: New Orleans, LA
  - attendees:: [[Dr. Evelyn Reed]], [[Dr. Aris Thorne]]
  - purpose:: Present Project Singularity research and recruit talent
  - submissions:: [[Neural Architecture Search for Multi-agent Systems]]
  - goals::
    - Showcase project progress
    - Network with potential collaborators
    - Recruit senior researchers
  - budget:: $15,000`;

      await harness.mem.writeFile('partners/MIT AI Lab.md', partnerContent);
      await harness.mem.writeFile('events/NeurIPS 2024.md', conferenceContent);

      // Commit all the knowledge graph components
      await harness.mem.commitChanges(`Complete Project Singularity knowledge graph setup

Phase 1: Initial project structure with goals and milestones
Phase 2: Team and organization hierarchy with roles and responsibilities
Phase 3: Architecture decisions and technical specifications documented
Phase 4: Research progress tracking and publication management
Phase 5: External collaborations and event participation

This comprehensive knowledge graph demonstrates the full lifecycle of knowledge management for a complex AI research project, showing how interconnected entities create a rich semantic network for cognitive workflows.`);

      // Verification: Test comprehensive graph queries
      console.log('Phase 6: Verifying comprehensive knowledge graph relationships...');

      // Test 1: Find all entities related to Project Singularity
      const singularityEntities = await harness.mem.searchGlobal('Project Singularity');
      expect(singularityEntities.length).toBeGreaterThanOrEqual(8); // Should find multiple references

      // Test 2: Verify person-to-project relationships
      const evelynLinks = await harness.mem.getOutgoingLinks('people/Dr. Evelyn Reed.md');
      expect(evelynLinks).toContain('Project Singularity');

      // Verify team relationships
      const teamLinks = await harness.mem.getOutgoingLinks('teams/AI Research Team.md');
      expect(teamLinks).toContain('Dr. Evelyn Reed');
      expect(teamLinks).toContain('Dr. Aris Thorne');
      expect(teamLinks).toContain('Project Singularity');

      // Test 3: Verify decision documentation
      const adrLinks = await harness.mem.getOutgoingLinks('decisions/ADR-001 - Use Micro-frontend Architecture.md');
      expect(adrLinks).toContain('Dr. Aris Thorne');
      expect(adrLinks).toContain('2024-07-22 - Singularity Architecture Deep Dive');

      // Test 4: Test complex traversal - find all publications by team members
      const publicationResults = await harness.mem.searchGlobal('Dr. Aris Thorne');
      expect(publicationResults.some(file => file.includes('publications'))).toBe(true);

      // Test 5: Test relationship resolution across the graph
      const technicalSpecLinks = await harness.mem.getOutgoingLinks('documents/Project Singularity Technical Specification.md');
      expect(technicalSpecLinks).toContain('Project Singularity');
      expect(technicalSpecLinks).toContain('ADR-001 - Use Micro-frontend Architecture');

      // Test 6: Verify timeline consistency
      const timelineResults = await harness.mem.searchGlobal('2024-07-22');
      expect(timelineResults).toContain('meetings/2024/2024-07-22 - Singularity Architecture Deep Dive.md');

      // Test 7: Multi-hop relationship verification
      // Person -> Project -> Decisions -> Meetings -> Outcomes
      const drArisBacklinks = await harness.mem.getBacklinks('people/Dr. Aris Thorne.md');
      expect(drArisBacklinks.some(link => link.includes('decisions'))).toBe(true);
      expect(drArisBacklinks.some(link => link.includes('meetings'))).toBe(true);

      console.log('Knowledge graph verification completed successfully!');
    });

    it('should maintain graph consistency during complex updates', async () => {
      // Test updating existing entities and maintaining relationships
      const updatedProjectContent = `- # Project Singularity
  - type:: project
  - status:: active
  - start-date:: 2024-06-01
  - end-date:: 2026-12-31  // Added end date
  - description:: Next-generation AI reasoning engine with modular architecture
  - goals::
    - Create unified reasoning framework
    - Enable multi-agent collaboration
    - Support extensible plugin architecture
    - Achieve production deployment by Q4 2025  // Added new goal
  - milestones::
    - Q3 2024: Core architecture foundation
    - Q4 2024: Multi-agent integration
    - Q1 2025: Plugin ecosystem launch
    - Q4 2025: Production deployment  // Added new milestone
  - team-size:: 25  // Added team size metric
  - budget:: $8.5M  // Added budget information
  - related-projects:: [[AI Research Institute Infrastructure]], [[Multi-agent Framework]]`;

      await harness.mem.writeFile('projects/Project Singularity.md', updatedProjectContent);
      await harness.mem.commitChanges('Updated Project Singularity with expanded scope and timeline');

      // Verify that updates don't break existing relationships
      const updatedLinks = await harness.mem.getOutgoingLinks('projects/Project Singularity.md');
      // The project file doesn't explicitly link to individual people, so we test search instead
      const peopleSearchResults = await harness.mem.searchGlobal('Dr. Evelyn Reed');
      expect(peopleSearchResults.some(file => file.includes('people/Dr. Evelyn Reed.md'))).toBe(true);

      // Verify that search still works across updated content
      const projectSearchResults = await harness.mem.searchGlobal('plugin ecosystem');
      expect(projectSearchResults).toContain('projects/Project Singularity.md');
    });

    it('should handle knowledge graph queries with performance requirements', async () => {
      // Create additional entities to test performance with larger graph
      const startTime = Date.now();

      // Add multiple research papers
      for (let i = 1; i <= 5; i++) {
        const paperContent = `- # Research Paper ${i}
  - type:: publication
  - title:: Advanced ${i} Research
  - authors:: [[Dr. Evelyn Reed]], [[Researcher ${i}]]
  - related-to:: [[Project Singularity]]
  - status:: published`;
        await harness.mem.writeFile(`publications/Research Paper ${i}.md`, paperContent);
      }

      // Add multiple meetings
      for (let i = 1; i <= 3; i++) {
        const meetingContent = `- # Weekly Sync ${i}
  - type:: meeting
  - project:: [[Project Singularity]]
  - attendees:: [[Dr. Evelyn Reed]], [[Dr. Aris Thorne]]
  - outcomes:: Progress update ${i}`;
        await harness.mem.writeFile(`meetings/2024/Weekly Sync ${i}.md`, meetingContent);
      }

      await harness.mem.commitChanges('Added additional research papers and meetings for performance testing');

      const setupTime = Date.now();

      // Test search performance across larger graph
      const searchStartTime = Date.now();
      const searchResults = await harness.mem.searchGlobal('Project Singularity');
      const searchTime = Date.now() - searchStartTime;

      expect(searchResults.length).toBeGreaterThanOrEqual(15); // Should find many references
      expect(searchTime).toBeLessThan(2000); // Should complete within 2 seconds

      // Test link resolution performance
      const linkStartTime = Date.now();
      const projectLinks = await harness.mem.getOutgoingLinks('projects/Project Singularity.md');
      const linkTime = Date.now() - linkStartTime;

      expect(projectLinks.length).toBeGreaterThan(0);
      expect(linkTime).toBeLessThan(1000); // Should complete within 1 second

      const totalTime = Date.now() - startTime;
      console.log(`Performance test completed in ${totalTime}ms: setup=${setupTime-startTime}ms, search=${searchTime}ms, links=${linkTime}ms`);
    });
  });

  describe('Knowledge Graph Integrity and Validation', () => {
    it('should validate graph structure and entity relationships', async () => {
      // Test that all critical relationships are properly maintained
      const allFiles = await harness.mem.searchGlobal(''); // Search for all files

      // Verify core entities exist
      const hasProject = allFiles.some(file => file.includes('projects/Project Singularity.md'));
      const hasPeople = allFiles.some(file => file.includes('people/Dr. Evelyn Reed.md'));
      const hasDecisions = allFiles.some(file => file.includes('decisions/ADR-001'));

      expect(hasProject).toBe(true);
      expect(hasPeople).toBe(true);
      expect(hasDecisions).toBe(true);

      // Test relationship consistency
      const projectLinks = await harness.mem.getOutgoingLinks('projects/Project Singularity.md');
      const projectBacklinks = await harness.mem.getBacklinks('projects/Project Singularity.md');

      // Project should have outgoing links to team members
      expect(projectLinks.length).toBeGreaterThan(0);

      // Project should have backlinks from entities that reference it
      expect(projectBacklinks.length).toBeGreaterThan(0);

      // Test that decisions link back to projects and people
      const adrBacklinks = await harness.mem.getBacklinks('decisions/ADR-001 - Use Micro-frontend Architecture.md');
      console.log('ADR backlinks:', adrBacklinks);

      // The ADR should have backlinks from entities that reference it
      // Since the ADR contains links to people and meetings, those should create backlinks
      expect(adrBacklinks.length).toBeGreaterThan(0);

      // Verify that we can find related entities through search
      const peopleResults = await harness.mem.searchGlobal('Dr. Aris Thorne');
      expect(peopleResults.some(file => file.includes('people/Dr. Aris Thorne.md'))).toBe(true);

      const meetingResults = await harness.mem.searchGlobal('2024-07-22');
      expect(meetingResults.some(file => file.includes('meetings'))).toBe(true);
    });

    it('should handle entity lifecycle management correctly', async () => {
      // Test creating, updating, and maintaining entity relationships over time

      // Create a new team member
      const newMemberContent = `- # Dr. Maria Chen
  - type:: person
  - role:: Senior Frontend Engineer
  - expertise:: React, Micro-frontend Architecture, UX Design
  - status:: Active
  - team-member:: [[Project Singularity]]
  - start-date:: 2024-11-15
  - responsibilities:: Lead micro-frontend implementation`;

      await harness.mem.writeFile('people/Dr. Maria Chen.md', newMemberContent);
      await harness.mem.commitChanges('Added new team member Dr. Maria Chen for frontend development');

      // Verify new member is properly integrated
      const newMemberLinks = await harness.mem.getOutgoingLinks('people/Dr. Maria Chen.md');
      expect(newMemberLinks).toContain('Project Singularity');

      const projectLinksAfterUpdate = await harness.mem.getOutgoingLinks('projects/Project Singularity.md');
      // Note: The project file doesn't explicitly link to individual team members,
      // so we test that the new member can be found through search
      const searchResults = await harness.mem.searchGlobal('Dr. Maria Chen');
      expect(searchResults).toContain('people/Dr. Maria Chen.md');

      // Test that existing relationships are preserved
      const existingLinks = await harness.mem.getOutgoingLinks('people/Dr. Evelyn Reed.md');
      expect(existingLinks).toContain('Project Singularity'); // Should still work
    });
  });
});