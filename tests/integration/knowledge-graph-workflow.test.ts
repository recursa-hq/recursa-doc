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

// This test suite is intentionally stateful.
// Each `it` block builds on the state created by the previous ones
// to simulate a real, multi-turn agent workflow.
describe('Knowledge Graph Workflow Integration Test', () => {
  let harness: TestHarnessState;

  // Setup the test environment once before all tests in this suite
  beforeAll(async () => {
    harness = await createTestHarness();
  });

  // Cleanup the test environment once after all tests in this suite have run
  afterAll(async () => {
    if (harness) {
      await cleanupTestHarness(harness);
    }
  });

  // Part 2, Step 1: Create the central project hub
  it('1. should create the project hub file', async () => {
    const projectContent = `- # Project Singularity
  - status:: active
  - start-date:: 2024-06-01
`;
    await harness.mem.writeFile('projects/Project Singularity.md', projectContent);
    await harness.mem.commitChanges('feat: create Project Singularity hub');

    expect(
      await harness.mem.fileExists('projects/Project Singularity.md')
    ).toBe(true);
  });

  // Part 2, Step 2: Create the people entities
  it('2. should create person entities and link them to the project', async () => {
    const evelynContent = `- # Dr. Evelyn Reed
  - type:: person
  - role:: Lead Research Scientist
  - leads-project::
    - [[Project Singularity]]
`;
    const arisContent = `- # Dr. Aris Thorne
  - type:: person
  - role:: Research Scientist
  - team-member::
    - [[Project Singularity]]
`;
    await harness.mem.writeFile('people/Dr. Evelyn Reed.md', evelynContent);
    await harness.mem.writeFile('people/Dr. Aris Thorne.md', arisContent);
    await harness.mem.commitChanges('feat: add project team members');

    expect(await harness.mem.fileExists('people/Dr. Evelyn Reed.md')).toBe(
      true
    );
    expect(await harness.mem.fileExists('people/Dr. Aris Thorne.md')).toBe(
      true
    );
  });

  // Part 2, Step 3: Document the architecture meeting
  it('3. should document the architecture meeting', async () => {
    const meetingContent = `- # 2024-07-22 - Singularity Architecture Deep Dive
  - type:: meeting
  - project:: [[Project Singularity]]
  - attendees:: [[Dr. Evelyn Reed]], [[Dr. Aris Thorne]]
  - outcomes::
    - This decision is formally documented in [[ADR-001 - Use Micro-frontend Architecture]].
  - action-items::
    - [[Dr. Aris Thorne]] to draft the initial ADR.
`;
    await harness.mem.writeFile(
      'meetings/2024/2024-07-22 - Singularity Architecture Deep Dive.md',
      meetingContent
    );
    await harness.mem.commitChanges('docs: record architecture deep dive meeting');

    expect(
      await harness.mem.fileExists(
        'meetings/2024/2024-07-22 - Singularity Architecture Deep Dive.md'
      )
    ).toBe(true);
  });

  // Part 2, Step 4: Formalize the architectural decision
  it('4. should formalize the architectural decision', async () => {
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
    - Requires a robust component sharing strategy.
`;
    await harness.mem.writeFile(
      'decisions/ADR-001 - Use Micro-frontend Architecture.md',
      adrContent
    );
    await harness.mem.commitChanges('feat: add ADR-001 for micro-frontends');

    expect(
      await harness.mem.fileExists(
        'decisions/ADR-001 - Use Micro-frontend Architecture.md'
      )
    ).toBe(true);
  });

  // Part 2, Step 5: Update the project hub with all links
  it('5. should update the project hub with all new links', async () => {
    const projectPath = 'projects/Project Singularity.md';
    const oldContent = await harness.mem.readFile(projectPath);

    const newContent = `${oldContent}
  - lead:: [[Dr. Evelyn Reed]]
  - team:: [[Dr. Aris Thorne]]
  - key-decisions::
    - [[ADR-001 - Use Micro-frontend Architecture]]
  - meetings::
    - [[2024-07-22 - Singularity Architecture Deep Dive]]
`;

    await harness.mem.updateFile(projectPath, oldContent, newContent);
    await harness.mem.commitChanges(
      'refactor: update project hub with all entity links'
    );

    const updatedContent = await harness.mem.readFile(projectPath);
    expect(updatedContent).toContain('[[Dr. Evelyn Reed]]');
    expect(updatedContent).toContain(
      '[[ADR-001 - Use Micro-frontend Architecture]]'
    );
    expect(updatedContent).toContain(
      '[[2024-07-22 - Singularity Architecture Deep Dive]]'
    );
  });

  // Part 3, Step 1: Test backlink and outgoing link resolution
  it('6. should resolve backlinks and outgoing links correctly', async () => {
    // Test backlinks for Dr. Aris Thorne
    const arisBacklinks = await harness.mem.getBacklinks(
      'people/Dr. Aris Thorne.md'
    );
    expect(arisBacklinks).toEqual(
      expect.arrayContaining([
        'decisions/ADR-001 - Use Micro-frontend Architecture.md',
        'meetings/2024/2024-07-22 - Singularity Architecture Deep Dive.md',
        'projects/Project Singularity.md',
      ])
    );
    // Add a negative assertion for robustness
    expect(arisBacklinks).not.toContain('people/Dr. Evelyn Reed.md');

    // Test outgoing links for the main project file
    const projectOutgoingLinks = await harness.mem.getOutgoingLinks(
      'projects/Project Singularity.md'
    );
    expect(projectOutgoingLinks).toEqual(
      expect.arrayContaining([
        'Dr. Evelyn Reed',
        'Dr. Aris Thorne',
        'ADR-001 - Use Micro-frontend Architecture',
        '2024-07-22 - Singularity Architecture Deep Dive',
      ])
    );
    // Add a negative assertion for robustness
    expect(projectOutgoingLinks).not.toContain('Some Random Unlinked Page');
  });

  // Part 3, Step 2: Simulate the complex user query from docs/overview.md
  it('7. should simulate the complex query for micro-frontend decision', async () => {
    // 1. "User is asking about a decision for 'Singularity'. I'll start by searching for a decision record."
    // A more realistic initial search. The agent wouldn't know to combine terms yet.
    // This failed because "Singularity" is not in the ADR file itself.
    const searchResults = await harness.mem.searchGlobal('micro-frontend');
    expect(searchResults).toContain(
      'decisions/ADR-001 - Use Micro-frontend Architecture.md'
    );

    // 2. "Found the ADR. I'll read it to get the justification and find the source meeting."
    const adrPath = searchResults.find(p =>
      p.startsWith('decisions/')
    );
    expect(adrPath).toBeDefined();

    const adrContent = await harness.mem.readFile(adrPath!);
    const meetingLinkMatch = adrContent.match(/decided-in::\s*\[\[(.*?)\]\]/);
    expect(meetingLinkMatch).not.toBeNull();
    const meetingTitle = meetingLinkMatch![1];

    // 3. "Okay, the decision was made in that meeting. Now I'll read the meeting file to find the attendees."
    const meetingPath = `meetings/2024/${meetingTitle}.md`;
    const meetingContent = await harness.mem.readFile(meetingPath);
    const attendeesMatch = meetingContent.match(/attendees::\s*(.*)/);
    expect(attendeesMatch).not.toBeNull();

    // 4. "I have all the pieces. I'll synthesize the final answer."
    const attendees = attendeesMatch![1];
    expect(attendees).toContain('[[Dr. Evelyn Reed]]');
    expect(attendees).toContain('[[Dr. Aris Thorne]]');
  });

  // Part 3, Step 3: Validate git history
  it('8. should have a complete and accurate git history', async () => {
    const log = await harness.mem.gitLog('projects/Project Singularity.md', 5);
    expect(log.length).toBeGreaterThanOrEqual(2);
    expect(log[0]?.message).toBe(
      'refactor: update project hub with all entity links'
    );
    expect(log[log.length - 1]?.message).toBe(
      'feat: create Project Singularity hub'
    );
  });
});