### TL;DR: The Structure

The agent doesn't keep everything in a flat directory. It starts creating topic-based and time-based subdirectories as the graph grows. The file system itself becomes part of the schema.

```
knowledge-graph/
├── people/
│   ├── Dr. Aris Thorne.md
│   └── Dr. Evelyn Reed.md
├── projects/
│   └── Project Singularity.md
├── meetings/
│   ├── 2024/
│   │   └── 2024-07-22 - Singularity Architecture Deep Dive.md
│   └── 2025/
│       └── 2025-01-15 - Singularity Q1 Review.md
├── decisions/
│   ├── ADR-001 - Use Micro-frontend Architecture.md
│   └── ADR-002 - Adopt Rust for performance-critical services.md
└── tech/
    ├── Micro-frontend Architecture.md
    └── Symbolic Reasoning.md
```

This is key. The agent can now `mem.listFiles('decisions/')` to see all Architectural Decision Records, or `mem.listFiles('meetings/2024/')` to review last year's meetings. It's a queryable file system.

### The Complex Example: "Project Singularity"

Let's trace a complex, multi-year project through the graph.

---

#### File: `projects/Project Singularity.md`

> This is the central hub for the project. It links out to everything else. It's the first place the agent looks for project-related queries.

```markdown
- # Project Singularity
  - status:: active
  - start-date:: 2024-06-01
  - lead:: [[Dr. Evelyn Reed]]
  - team:: [[Dr. Aris Thorne]]
  - key-decisions::
    - [[ADR-001 - Use Micro-frontend Architecture]]
    - [[ADR-002 - Adopt Rust for performance-critical services]]
  - summary::
    - A long-term research project to develop a novel symbolic reasoning engine.
  - meetings::
    - [[2024-07-22 - Singularity Architecture Deep Dive]]
    - [[2025-01-15 - Singularity Q1 Review]]
```

---

#### File: `people/Dr. Evelyn Reed.md`

> The agent now has a rich context on people. It knows their roles, what projects they lead, and what meetings they attended. `mem.getBacklinks` on this file is powerful.

```markdown
- # Dr. Evelyn Reed
  - type:: person
  - role:: Lead Research Scientist
  - expertise::
    - [[Symbolic Reasoning]]
    - Distributed Systems
  - leads-project::
    - [[Project Singularity]]
  - attended::
    - [[2024-07-22 - Singularity Architecture Deep Dive]]
    - [[2025-01-15 - Singularity Q1 Review]]
```

---

#### File: `meetings/2024/2024-07-22 - Singularity Architecture Deep Dive.md`

> Meetings are time-stamped and atomic. They capture a moment in time, linking people, discussion points, and outcomes.

```markdown
- # 2024-07-22 - Singularity Architecture Deep Dive
  - type:: meeting
  - project:: [[Project Singularity]]
  - attendees:: [[Dr. Evelyn Reed]], [[Dr. Aris Thorne]]
  - agenda::
    - Discuss initial architectural approach for the reasoning engine.
    - Evaluate monolith vs. microservices.
  - outcomes::
    - **Decision Made**: The team agreed to move forward with a micro-frontend architecture for the UI components.
    - This decision is formally documented in [[ADR-001 - Use Micro-frontend Architecture]].
  - action-items::
    - [[Dr. Aris Thorne]] to draft the initial ADR.
```

---

#### File: `decisions/ADR-001 - Use Micro-frontend Architecture.md`

> Decisions are first-class citizens. This is critical for audibility. The agent can trace *why* a choice was made, who was involved, and what the justification was.

```markdown
- # ADR-001: Use Micro-frontend Architecture
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
```

---

### How the Agent Navigates This at Scale

The agent doesn't `cat` everything. It uses its tools to traverse the graph intelligently.

**User Query:** `"Why did we choose micro-frontends for Singularity and who was in that meeting?"`

The agent's internal monologue (and actions) would be:

1.  "User is asking about a decision for 'Singularity'. I'll start by searching for a decision record."
    *   `await mem.searchGlobal('micro-frontends Singularity')`
    *   **Result:** `['decisions/ADR-001 - Use Micro-frontend Architecture.md']`

2.  "Found the ADR. I'll read it to get the justification and find the source meeting."
    *   `const adrContent = await mem.readFile('decisions/ADR-001 - Use Micro-frontend Architecture.md')`
    *   *Parses `decided-in:: [[2024-07-22 - Singularity Architecture Deep Dive]]` from the content.*

3.  "Okay, the decision was made in that meeting. Now I'll read the meeting file to find the attendees."
    *   `const meetingContent = await mem.readFile('meetings/2024/2024-07-22 - Singularity Architecture Deep Dive.md')`
    *   *Parses `attendees:: [[Dr. Evelyn Reed]], [[Dr. Aris Thorne]]` from the content.*

4.  "I have all the pieces. I'll synthesize the final answer."

This is the power of the system. The scaling problem becomes a graph traversal problem, which is cheap and efficient.

### The `git` Angle

And the killer feature: every change is a commit.

*   Want to know *when* the micro-frontend decision was formally documented?
    `git log -- "decisions/ADR-001 - Use Micro-frontend Architecture.md"`
*   Want to see how Project Singularity's status has changed over the last month?
    `git diff HEAD~10 HEAD -- "projects/Project Singularity.md"`

Your AI's brain isn't an opaque database blob. It's a repo you can clone, branch, and audit.

Ship it.
