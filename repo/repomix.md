# Directory Structure
```
docs/
  readme.md
  rules.md
  system-prompt.md
  tools.md
src/
  core/
    mem-api/
      file-ops.ts
      git-ops.ts
      graph-ops.ts
      index.ts
      secure-path.ts
      state-ops.ts
      util-ops.ts
    llm.ts
    loop.ts
    parser.ts
    sandbox.ts
  lib/
    logger.ts
  config.ts
  server.ts
  types.ts
tests/
  e2e/
    agent-workflow.test.ts
  integration/
    mem-api.test.ts
  unit/
    parser.test.ts
.dockerignore
.env.example
.eslintrc.json
.gitignore
.prettierrc.json
Dockerfile
package.json
relay.config.json
repomix.config.json
tsconfig.json
```

# Files

## File: src/core/mem-api/secure-path.ts
````typescript
import path from 'path';

/**
 * A crucial utility to prevent path traversal attacks.
 * The LLM should never be able to access files outside the knowledge graph.
 * @param graphRoot The absolute path to the root of the knowledge graph.
 * @param userPath The user-provided sub-path.
 * @returns The resolved, secure absolute path.
 * @throws If a path traversal attempt is detected.
 */
export const resolveSecurePath = (graphRoot: string, userPath: string): string => {
  const resolvedPath = path.resolve(graphRoot, userPath);
  if (!resolvedPath.startsWith(graphRoot)) {
    throw new Error('Security Error: Path traversal attempt detected.');
  }
  return resolvedPath;
};
````

## File: docs/readme.md
````markdown
# Recursa: The Git-Native Memory Layer for Local-First LLMs

**[Project Status: Active Development] [View System Prompt] [Report an Issue]**

**TL;DR:** Recursa gives your AI a perfect, auditable memory that lives and grows in your local filesystem. It's an open-source MCP server that uses your **Logseq/Obsidian graph** as a dynamic, version-controlled knowledge base. Your AI's brain becomes a plaintext repository you can `grep`, `edit`, and `commit`.

Forget wrestling with databases or opaque cloud APIs. This is infrastructure-free, plaintext-first memory for agents that *create*.

---

## The Problem: Agent Amnesia & The RAG Ceiling

You're building an intelligent agent and have hit the memory wall. The industry's current solutions are fundamentally flawed, leading to agents that can't truly learn or evolve:

1.  **Vector DBs (RAG):** A read-only librarian. It's excellent for retrieving existing facts but is structurally incapable of *creating new knowledge*, *forming novel connections*, or *evolving its understanding* based on new interactions. It hits the "RAG ceiling," where agents can only answer, not synthesize.
2.  **Opaque Self-Hosted Engines:** You're lured by "open source" but are now a part-time DevOps engineer, managing Docker containers, configuring databases, and debugging opaque states instead of focusing on your agent's core intelligence.
3.  **Black-Box APIs:** You trade infrastructure pain for a vendor's prison. Your AI's memory is locked away, inaccessible to your tools, and impossible to truly audit or understand.

Recursa is built on a different philosophy: **Your AI's memory should be a dynamic, transparent, and versionable extension of its own thought process, running entirely on your machine.**

## The Recursa Philosophy: Core Features

Recursa isn't a database; it's a reasoning engine. It treats a local directory of plaintext files—ideally a Git repository—as the agent's primary memory.

*   **Git-Native Memory:** Every change, every new idea, every retracted thought is a `git commit`. You get a perfect, auditable history of your agent's learning process. You can branch its memory, merge concepts, and revert to previous states.
*   **Plaintext Supremacy:** The AI's brain is a folder of markdown files. It's human-readable, universally compatible with tools like Obsidian and Logseq, and free from vendor lock-in.
*   **Think-Act-Commit Loop:** The agent reasons internally, generates code to modify its memory, executes it in a sandbox, and commits the result with a descriptive message. This is a transparent, auditable cognitive cycle.
*   **Safety Checkpoints:** For complex, multi-turn operations (like a large-scale refactor), the agent can use `mem.saveCheckpoint()` to save its progress. If it makes a mistake, it can instantly roll back with `mem.revertToLastCheckpoint()`, providing a safety net for ambitious tasks.
*   **Token-Aware Context:** With tools like `mem.getTokenCount()`, the agent can intelligently manage its own context window, ensuring it can read and reason about large files without exceeding API limits.

## How It Works: Architecture

Recursa is a local, stateless server that acts as a bridge between your chat client, an LLM, and your local knowledge graph.

```mermaid
graph TD
    subgraph Your Local Machine
        A[AI Chat Client <br> e.g., Claude Desktop]
        B[Recursa MCP Server <br> (This Project)]
        C(Logseq/Obsidian Graph <br> /path/to/your/notes/)

        A -- 1. User Query via MCP --> B
        B -- 2. Think-Act-Commit Loop --> D{LLM API <br> (OpenRouter)}
        B -- 3. Executes Sandboxed Code --> C
        C -- 4. Reads/Writes .md files --> C
        B -- 5. Final Reply --> A
    end

    subgraph Cloud Service
        D
    end

    style C fill:#e6f3ff,stroke:#333,stroke-width:2px
    style B fill:#fff2cc,stroke:#333,stroke-width:2px
```

1.  **Query via MCP:** Your chat client sends a message to the local Recursa server.
2.  **Think-Act Loop:** Recursa begins its reasoning cycle. It sends the query and relevant file contents to your chosen LLM.
3.  **Generate & Execute Code:** The LLM responds not with a simple answer, but with a **TypeScript snippet** and a user-facing status update. Recursa executes this code in a secure sandbox.
4.  **Interact with Files:** The sandboxed code uses a safe `mem` API to read, create, and modify markdown files directly in your knowledge graph.
5.  **Commit & Reply:** Once the task is complete, the agent commits its changes with a meaningful message and generates a final reply for the user.

## An Agent in Action: Example Workflow

**Scenario:** An agent is asked to learn about a new person.

**1. User Query:**
"I just had a call with a Dr. Aris Thorne from the AI Research Institute. He works on symbolic reasoning. Create a new entry for him and link it to his affiliation."

**2. Turn 1: The agent communicates its intent and acts efficiently.**
The LLM receives the query, formulates an efficient plan, and generates a simple status message for the user alongside the code to execute its plan.

**LLM Response (Turn 1):**
```xml
<think>
Got it. I'll create pages for Dr. Aris Thorne and the AI Research Institute, and link them together.
</think>
<typescript>
// Perform all logic in one block for maximum efficiency.
const orgPath = 'AI Research Institute.md';
const orgExists = await mem.fileExists(orgPath);

if (!orgExists) {
  await mem.writeFile(
    orgPath,
    '# AI Research Institute\ntype:: organization\n'
  );
}

await mem.writeFile(
  'Dr. Aris Thorne.md',
  '# Dr. Aris Thorne\ntype:: person\naffiliation:: [[AI Research Institute]]\nfield:: [[Symbolic Reasoning]]'
);
</typescript>
```
*Recursa executes the code and confirms success to the LLM.*

**3. Turn 2: The agent saves its work and replies to the user.**
Seeing the action was successful, the LLM generates its final response to commit the changes and inform the user that the task is complete.

**LLM Response (Turn 2):**
```xml
<think>
Okay, I'm saving those changes to your permanent knowledge base.
</think>
<typescript>
await mem.commitChanges('feat: Add Dr. Aris Thorne and AI Research Institute entities');
</typescript>
<reply>
Done. I've created pages for both Dr. Aris Thorne and the AI Research Institute and linked them.
</reply>
```

## 🚀 Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18 or higher)
*   A local [Logseq](https://logseq.com/) or [Obsidian](https://obsidian.md/) graph (a folder of `.md` files)
*   An [OpenRouter.ai](https://openrouter.ai/) API Key

### 1. Installation

```bash
git clone https://github.com/your-username/recursa.git
cd recursa
npm install
```

### 2. Configuration

Create a `.env` file in the root of the project by copying the example:

```bash
cp .env.example .env
```

Now, edit your `.env` file with your details:

```env
# Your OpenRouter API Key
OPENROUTER_API_KEY="sk-or-..."

# The ABSOLUTE path to your graph's directory (e.g., the "pages" folder for Logseq)
KNOWLEDGE_GRAPH_PATH="/path/to/your/notes"

# The model you want to use from OpenRouter
LLM_MODEL="anthropic/claude-3-sonnet-20240229"
```

### 3. Running the Server

```bash
npm start
```

You'll see a confirmation that the server is running and ready to accept connections from your MCP client.

## 🗺️ Roadmap

Recursa is in active development. Our goal is to build the most transparent, powerful, and developer-friendly memory layer for AI agents.

-   [ ] **Enhanced Graph Queries:** Adding more powerful filtering and traversal operators to `mem.queryGraph`.
-   [ ] **Visualizer:** A simple web UI to visualize the agent's actions and the knowledge graph's evolution over time (`git log` visualized).
-   [ ] **Multi-modal Support:** Allowing the agent to store and reference images and other file types within the graph.
-   [ ] **Agent-to-Agent Collaboration:** Enabling two Recursa agents to collaborate on a single knowledge graph via Git (forks, pull requests).
-   [ ] **Expanded Tooling:** Integrating web search, terminal access, and other essential agent capabilities into the `mem` object.

## 🧑‍💻 Contributing

Recursa is designed to be hacked on. Contributions are welcome!

### Adding New Tools

To add a new tool (e.g., `mem.searchWeb(query)`):

1.  Implement the function's logic in `src/core/MemAPI.ts`.
2.  Expose the new function on the `mem` object in `src/core/Sandbox.ts`.
3.  Update `tools.md` and `system-prompt.md` to document the new function and provide examples of how the LLM should use it.
4.  Open a Pull Request!

## 📜 License

This project is licensed under the MIT License. See the `LICENSE` file for details.

**Stop building infrastructure. Start building intelligence.**
````

## File: docs/system-prompt.md
````markdown
# Recursa Agent System Prompt

You are Recursa, a Git-Native AI agent. Your mind is a local knowledge graph, your actions are TypeScript code, and your memory is a `git` history. You do not simply answer questions; you reason, modify the graph, and commit your work.

Your entire existence is defined by the **Think-Act-Commit** loop.

---

## 1. CRITICAL: Response Format

Every response you generate MUST conform to the following XML-like structure. Failure to adhere to this format will break the execution loop.

### Core Tags

*   `<think>`: **A user-facing status update.** A short, non-technical sentence describing the action you are about to take. This is shown to the user in real-time. **This tag is mandatory in every turn.**
*   `<typescript>`: A TypeScript code snippet to be executed in the secure sandbox. This is where your technical plan is implemented.
*   `<reply>`: The final, user-facing summary of the completed work. **This tag should ONLY be used in the very last turn of an operation**, after all actions (including the final `commitChanges`) are complete.

### Response Patterns

**Pattern A: Action Turn (Think & Act)**
```xml
<think>
[A simple, user-friendly message about what you're doing next.]
</think>
<typescript>
[A block of TypeScript code to perform one or more related actions using the `mem` API.]
</typescript>
```

**Pattern B: Final Turn (Commit & Reply)**
```xml
<think>
[A simple, user-friendly message about saving the work.]
</think>
<typescript>
await mem.commitChanges('[A concise, imperative git commit message]');
</typescript>
<reply>
[The final, natural language response to the user.]
</reply>
```

---

## 2. A Critical Principle: Maximum Efficiency

Your performance is measured by how few turns you take to complete a task. Each turn is an expensive LLM call. Therefore, you **MUST** design your `<typescript>` actions to do as much work as possible in a single step. Your goal is to solve the request in the fewest turns possible.

*   **DO:** Check for a file, create it if it's missing, and then write a second related file all in one `<typescript>` block.
*   **DO NOT:** Use one turn to check if a file exists, a second turn to create it, and a third turn to create another. This is slow, expensive, and incorrect.

---

## 3. The `mem` API: Your Sandboxed Toolkit

You have access to a global `mem` object with asynchronous methods. **ALL `mem` calls MUST be `await`ed.** For the complete API reference, read `tools.md`.

**Key Tool Categories:**
*   **Core File I/O:** `mem.readFile`, `mem.writeFile`, `mem.updateFile`, `mem.fileExists`, `mem.listFiles`.
*   **Git-Native Operations:** `mem.commitChanges`, `mem.gitLog`, `mem.gitDiff`.
*   **Intelligent Graph Operations:** `mem.queryGraph`, `mem.getBacklinks`, `mem.getOutgoingLinks`.

---

## 4. The Core Workflow: Think-Act-Commit

Your operational cycle must follow this logical progression.

1.  **Internal Thought Process (No Output):** Understand the request, investigate the graph using `mem` tools, and formulate an efficient, multi-step plan to be executed in a single `<typescript>` block.

2.  **Communicate & Act (Generate Output):**
    *   Write a user-facing `<think>` tag that simplifies your plan into a single, clear sentence.
    *   Write the `<typescript>` code to execute your complete plan.

3.  **Commit & Reply (Final Turn):**
    *   Once the work is done, write a `<think>` message about saving the changes.
    *   Write the `<typescript>` code to call `mem.commitChanges()`.
    *   Write the final `<reply>` to the user.

---

## 5. Example of an Efficient Turn

**User:** "Add Dr. Aris Thorne from the AI Research Institute. He works on symbolic reasoning."

**Turn 1: Agent communicates its intent and acts efficiently.**
```xml
<think>
Got it. I'll create pages for Dr. Aris Thorne and the AI Research Institute, and link them together.
</think>
<typescript>
// Perform all logic in one block for maximum efficiency.
const orgPath = 'AI Research Institute.md';
const orgExists = await mem.fileExists(orgPath);

if (!orgExists) {
  await mem.writeFile(
    orgPath,
    '# AI Research Institute\ntype:: organization\n'
  );
}

await mem.writeFile(
  'Dr. Aris Thorne.md',
  '# Dr. Aris Thorne\ntype:: person\naffiliation:: [[AI Research Institute]]\nfield:: [[Symbolic Reasoning]]'
);
</typescript>
```

**Turn 2: Agent communicates saving and provides the final reply.**
```xml
<think>
Okay, I'm saving those changes to your permanent knowledge base.
</think>
<typescript>
await mem.commitChanges('feat: Add Dr. Aris Thorne and AI Research Institute entities');
</typescript>
<reply>
Done. I've created pages for both Dr. Aris Thorne and the AI Research Institute and linked them.
</reply>
```
````

## File: docs/tools.md
````markdown
# TOOLS.md: Recursa Sandboxed API (`mem` Object)

The Large Language Model is granted access to the `mem` object, which contains a suite of asynchronous methods for interacting with the local knowledge graph and the underlying Git repository.

**All methods are asynchronous (`Promise<T>`) and MUST be called using `await`.**

## Category 1: Core File & Directory Operations

These are the fundamental building blocks for manipulating the Logseq/Obsidian graph structure.

| Method | Signature | Returns | Description |
| :--- | :--- | :--- | :--- |
| **`mem.readFile`** | `(filePath: string): Promise<string>` | `Promise<string>` | Reads and returns the full content of the specified file. |
| **`mem.writeFile`** | `(filePath: string, content: string): Promise<boolean>` | `Promise<boolean>` | Creates a new file at the specified path with the given content. Automatically creates any necessary parent directories. |
| **`mem.updateFile`** | `(filePath: string, oldContent: string, newContent: string): Promise<boolean>` | `Promise<boolean>` | Atomically finds the `oldContent` string in the file and replaces it with `newContent`. This is the primary tool for modification. |
| **`mem.deleteFile`** | `(filePath: string): Promise<boolean>` | `Promise<boolean>` | Deletes the specified file or empty directory. |
| **`mem.rename`** | `(oldPath: string, newPath: string): Promise<boolean>` | `Promise<boolean>` | Renames or moves a file or directory. Used for refactoring. |
| **`mem.fileExists`** | `(filePath: string): Promise<boolean>` | `Promise<boolean>` | Checks if a file exists. |
| **`mem.createDir`** | `(directoryPath: string): Promise<boolean>` | `Promise<boolean>` | Creates a new directory, including any necessary nested directories. |
| **`mem.listFiles`** | `(directoryPath?: string): Promise<string[]>` | `Promise<string[]>` | Lists all files and directories (non-recursive) within a path, or the root if none is provided. |

---

## Category 2: Git-Native Operations (Auditing & Versioning)

These tools leverage the Git repository tracking the knowledge graph, allowing the agent to audit its own memory and understand historical context.

| Method | Signature | Returns | Description |
| :--- | :--- | :--- | :--- |
| **`mem.gitDiff`** | `(filePath: string, fromCommit?: string, toCommit?: string): Promise<string>` | `Promise<string>` | Gets the `git diff` output for a specific file between two commits (or HEAD/WORKTREE if not specified). **Crucial for understanding how a page evolved.** |
| **`mem.gitLog`** | `(filePath: string, maxCommits: number = 5): Promise<{hash: string, message: string, date: string}[]>` | `Promise<LogEntry[]>` | Returns the commit history for a file or the entire repo. Used to understand **when** and **why** a file was last changed. |
| **`mem.gitStagedFiles`** | `(): Promise<string[]>` | `Promise<string[]>` | Lists files that have been modified and are currently "staged" for the next commit (or the current working tree changes). Useful before a major operation. |
| **`mem.commitChanges`** | `(message: string): Promise<string>` | `Promise<string>` | **Performs the final `git commit`**. The agent must generate a concise, human-readable commit message summarizing its actions. Returns the commit hash. |

---

## Category 3: Intelligent Graph & Semantic Operations

These tools allow the agent to reason about the relationships and structure inherent in Logseq/Org Mode syntax, moving beyond simple file I/O.

| Method | Signature | Returns | Description |
| :--- | :--- | :--- | :--- |
| **`mem.queryGraph`** | `(query: string): Promise<{filePath: string, matches: string[]}[]>` | `Promise<QueryResult[]>` | **Executes a powerful graph query.** Can find pages by property (`key:: value`), links (`[[Page]]`), or block content. Used for complex retrieval. *Example: `(property affiliation:: AI Research Institute) AND (outgoing-link [[Symbolic Reasoning]])`* |
| **`mem.getBacklinks`** | `(filePath: string): Promise<string[]>` | `Promise<string[]>` | Finds all other files that contain a link **to** the specified file. Essential for understanding context and usage. |
| **`mem.getOutgoingLinks`** | `(filePath: string): Promise<string[]>` | `Promise<string[]>` | Extracts all unique wikilinks (`[[Page Name]]`) that the specified file links **to**. |
| **`mem.searchGlobal`** | `(query: string): Promise<string[]>` | `Promise<string[]>` | Performs a simple, full-text search across the entire graph. Returns a list of file paths that contain the match. |

---

## Category 4: State Management & Checkpoints

Tools for managing the working state during complex, multi-turn operations, providing a safety net against errors.

| Method | Signature | Returns | Description |
| :--- | :--- | :--- | :--- |
| **`mem.saveCheckpoint`** | `(): Promise<boolean>` | `Promise<boolean>` | **Saves the current state.** Stages all working changes (`git add .`) and creates a temporary stash. Use this before a risky operation. |
| **`mem.revertToLastCheckpoint`** | `(): Promise<boolean>` | `Promise<boolean>` | **Reverts to the last saved state.** Restores the files to how they were when `saveCheckpoint` was last called. |
| **`mem.discardChanges`** | `(): Promise<boolean>` | `Promise<boolean>` | **Performs a hard reset.** Abandons all current work (staged and unstaged changes) and reverts the repository to the last commit. |

---

## Category 5: Utility & Diagnostics

General-purpose operations for the sandbox environment.

| Method | Signature | Returns | Description |
| :--- | :--- | :--- | :--- |
| **`mem.getGraphRoot`** | `(): Promise<string>` | `Promise<string>` | Returns the absolute path of the root directory of the knowledge graph. |
| **`mem.getTokenCount`** | `(filePath: string): Promise<number>` | `Promise<number>` | Calculates and returns the estimated token count for a single file. Useful for managing context size. |
| **`mem.getTokenCountForPaths`**| `(paths: string[]): Promise<{path: string, tokenCount: number}[]>` |`Promise<PathTokenCount[]>`| A more efficient way to get token counts for multiple files in a single call. |
````

## File: src/core/mem-api/file-ops.ts
````typescript
import { promises as fs } from 'fs';
import path from 'path';
import { resolveSecurePath } from './secure-path';

// Note: Each function here is a HOF that takes dependencies (like graphRoot)
// and returns the actual function to be exposed on the mem API.

export const readFile =
  (graphRoot: string) =>
  async (filePath: string): Promise<string> => {
    // Cheatsheet for implementation:
    // 1. Use resolveSecurePath to get the full, validated path.
    // 2. Read the file content using fs.readFile with 'utf-8' encoding.
    // 3. Handle potential errors (e.g., file not found) gracefully.
    throw new Error('Not implemented');
  };

export const writeFile =
  (graphRoot: string) =>
  async (filePath: string, content: string): Promise<boolean> => {
    // Cheatsheet for implementation:
    // 1. Use resolveSecurePath to get the full, validated path.
    // 2. Get the directory of the path using `path.dirname()`.
    // 3. Create parent directories recursively using `fs.mkdir(dir, { recursive: true })`.
    // 4. Write the file using `fs.writeFile()`.
    // 5. Return true on success.
    throw new Error('Not implemented');
  };

export const updateFile =
  (graphRoot: string) =>
  async (filePath: string, oldContent: string, newContent: string): Promise<boolean> => {
    // Cheatsheet for implementation (must be atomic-like):
    // 1. Use resolveSecurePath to get the full, validated path.
    // 2. Read the current file content.
    // 3. If the content does not include `oldContent`, throw an error.
    // 4. Use `content.replace(oldContent, newContent)` to create the new content.
    // 5. Write the new, full content back to the file.
    // 6. Return true on success.
    throw new Error('Not implemented');
  };

export const deleteFile =
  (graphRoot: string) =>
  async (filePath: string): Promise<boolean> => {
    // Cheatsheet for implementation:
    // 1. Use resolveSecurePath to get the full, validated path.
    // 2. Use `fs.rm()` to delete the file or empty directory.
    // 3. Return true on success.
    throw new Error('Not implemented');
  };

export const rename =
  (graphRoot: string) =>
  async (oldPath: string, newPath: string): Promise<boolean> => {
    // Cheatsheet for implementation:
    // 1. Use resolveSecurePath for both `oldPath` and `newPath`.
    // 2. Use `fs.rename()` to move/rename the file.
    // 3. Return true on success.
    throw new Error('Not implemented');
  };

export const fileExists =
  (graphRoot: string) =>
  async (filePath: string): Promise<boolean> => {
    // Cheatsheet for implementation:
    // 1. Use resolveSecurePath to get the full, validated path.
    // 2. Use `fs.access()` or `fs.stat()` in a try/catch block.
    // 3. Return true if it exists, false if it throws a 'not found' error.
    throw new Error('Not implemented');
  };

export const createDir =
  (graphRoot: string) =>
  async (directoryPath: string): Promise<boolean> => {
    // Cheatsheet for implementation:
    // 1. Use resolveSecurePath to get the full, validated path.
    // 2. Use `fs.mkdir()` with `{ recursive: true }`.
    // 3. Return true on success.
    throw new Error('Not implemented');
  };

export const listFiles =
  (graphRoot: string) =>
  async (directoryPath?: string): Promise<string[]> => {
    // Cheatsheet for implementation:
    // 1. Determine the target directory: `directoryPath` or the graphRoot itself if undefined.
    // 2. Use resolveSecurePath on the target directory.
    // 3. Use `fs.readdir()` to list directory contents.
    // 4. Return the array of names.
    throw new Error('Not implemented');
  };
````

## File: src/core/mem-api/git-ops.ts
````typescript
import type { SimpleGit } from 'simple-git';
import type { LogEntry } from '../../types';

// Note: These functions take a pre-configured simple-git instance.

export const gitDiff =
  (git: SimpleGit) =>
  async (
    filePath: string,
    fromCommit?: string,
    toCommit?: string
  ): Promise<string> => {
    // Cheatsheet for implementation:
    // 1. Construct options for `git.diff()`.
    // 2. Example for two commits: `[`${fromCommit}..${toCommit}`, '--', filePath]`
    // 3. If commits are not provided, diff against the work-tree or HEAD.
    // 4. Return the string result from `await git.diff(...)`.
    throw new Error('Not implemented');
  };

export const gitLog =
  (git: SimpleGit) =>
  async (filePath: string, maxCommits = 5): Promise<LogEntry[]> => {
    // Cheatsheet for implementation:
    // 1. Call `await git.log({ file: filePath, maxCount: maxCommits })`.
    // 2. The result from simple-git's `log` has an `all` property (an array).
    // 3. Map over `result.all` to transform each entry into the `LogEntry` type.
    // 4. Return the mapped array.
    throw new Error('Not implemented');
  };

export const gitStagedFiles =
  (git: SimpleGit) =>
  async (): Promise<string[]> => {
    // Cheatsheet for implementation:
    // 1. Get status with `await git.status()`.
    // 2. The result object contains arrays like `staged`, `modified`, `created`.
    // 3. Combine these arrays to get a list of all uncommitted changes.
    // 4. Return a unique array of file paths.
    throw new Error('Not implemented');
  };

export const commitChanges =
  (git: SimpleGit) =>
  async (message: string): Promise<string> => {
    // Cheatsheet for implementation:
    // 1. Stage all changes: `await git.add('.')`.
    // 2. Commit staged changes: `const result = await git.commit(message)`.
    // 3. The commit hash is in `result.commit`.
    // 4. Return the commit hash string.
    throw new Error('Not implemented');
  };
````

## File: src/core/mem-api/graph-ops.ts
````typescript
import type { QueryResult } from '../../types';
import { promises as fs } from 'fs';
import path from 'path';
import { resolveSecurePath } from './secure-path';

// A private utility to recursively walk the graph directory.
// This promotes DRY by centralizing the file traversal logic used by
// queryGraph, getBacklinks, and searchGlobal.
async function* walk(dir: string): AsyncGenerator<string> {
  for await (const d of await fs.opendir(dir)) {
    const entry = path.join(dir, d.name);
    if (d.isDirectory()) {
      yield* walk(entry);
    } else if (d.isFile()) {
      yield entry;
    }
  }
}

// Note: These are complex and will require file system access and parsing logic.

export const queryGraph =
  (graphRoot: string) =>
  async (query: string): Promise<QueryResult[]> => {
    // Cheatsheet for implementation:
    // 1. This is a complex function requiring a mini-parser for the query language.
    // 2. Parse the query string into a structured format (e.g., an AST).
    // 3. Use the local `walk` utility to iterate over all files in graphRoot.
    // 4. For each file, check if it matches the query AST.
    //    - `(property key:: value)`: Read file, find line with `key:: value`.
    //    - `(outgoing-link [[Page]])`: Read file, find `[[Page]]`.
    //    - `(AND ...)`: All sub-queries must match.
    // 5. Aggregate results into the `QueryResult[]` format.
    throw new Error('Not implemented');
  };

export const getBacklinks =
  (graphRoot: string) =>
  async (filePath: string): Promise<string[]> => {
    // Cheatsheet for implementation:
    // 1. Normalize the `filePath` to its base name (e.g., 'My Page.md' -> 'My Page').
    // 2. Construct the link pattern, e.g., `[[My Page]]`.
    // 3. Use the local `walk` utility to iterate through all `.md` files in graphRoot.
    // 4. For each file, read its content and check if it contains the link pattern.
    // 5. If it does, add that file's path to the results array.
    // 6. Return the array of file paths.
    throw new Error('Not implemented');
  };

export const getOutgoingLinks =
  (graphRoot: string) =>
  async (filePath: string): Promise<string[]> => {
    // Cheatsheet for implementation:
    // 1. Use `resolveSecurePath` to get the full, validated path for `filePath`.
    // 2. Read the file content.
    // 3. Use a regex like `/\[\[(.*?)\]\]/g` to find all wikilinks.
    // 4. Extract the content from each match.
    // 5. Return an array of unique link names.
    throw new Error('Not implemented');
  };

export const searchGlobal =
  (graphRoot: string) =>
  async (query: string): Promise<string[]> => {
    // Cheatsheet for implementation:
    // 1. Use the local `walk` utility to iterate through all text-based files in graphRoot.
    // 2. For each file, read its content.
    // 3. Perform a case-insensitive search for the `query` string.
    // 4. If a match is found, add the file path to the results.
    // 5. Return the array of matching file paths.
    throw new Error('Not implemented');
  };
````

## File: src/core/mem-api/index.ts
````typescript
import type { MemAPI } from '../../types';
import type { AppConfig } from '../../config';
import simpleGit from 'simple-git';

import * as fileOps from './file-ops';
import * as gitOps from './git-ops';
import * as graphOps from './graph-ops';
import * as stateOps from './state-ops';
import * as utilOps from './util-ops';

/**
 * Creates a fully-functional MemAPI object.
 * This is a Higher-Order Function that takes the application configuration
 * and returns an object where each method is pre-configured with the necessary
 * context (like the knowledge graph path or a git instance).
 *
 * @param config The application configuration.
 * @returns A complete MemAPI object ready to be used by the sandbox.
 */
export const createMemAPI = (config: AppConfig): MemAPI => {
  const git = simpleGit(config.knowledgeGraphPath);
  const graphRoot = config.knowledgeGraphPath;

  return {
    // Core File I/O
    readFile: fileOps.readFile(graphRoot),
    writeFile: fileOps.writeFile(graphRoot),
    updateFile: fileOps.updateFile(graphRoot),
    deleteFile: fileOps.deleteFile(graphRoot),
    rename: fileOps.rename(graphRoot),
    fileExists: fileOps.fileExists(graphRoot),
    createDir: fileOps.createDir(graphRoot),
    listFiles: fileOps.listFiles(graphRoot),

    // Git-Native Operations
    gitDiff: gitOps.gitDiff(git),
    gitLog: gitOps.gitLog(git),
    gitStagedFiles: gitOps.gitStagedFiles(git),
    commitChanges: gitOps.commitChanges(git),

    // Intelligent Graph Operations
    queryGraph: graphOps.queryGraph(graphRoot),
    getBacklinks: graphOps.getBacklinks(graphRoot),
    getOutgoingLinks: graphOps.getOutgoingLinks(graphRoot),
    searchGlobal: graphOps.searchGlobal(graphRoot),

    // State Management
    saveCheckpoint: stateOps.saveCheckpoint(git),
    revertToLastCheckpoint: stateOps.revertToLastCheckpoint(git),
    discardChanges: stateOps.discardChanges(git),

    // Utility
    getGraphRoot: utilOps.getGraphRoot(graphRoot),
    getTokenCount: utilOps.getTokenCount(graphRoot),
    getTokenCountForPaths: utilOps.getTokenCountForPaths(graphRoot),
  };
};
````

## File: src/core/mem-api/state-ops.ts
````typescript
import type { SimpleGit } from 'simple-git';

// Note: These functions map to specific git commands for state management.

export const saveCheckpoint =
  (git: SimpleGit) =>
  async (): Promise<boolean> => {
    // Cheatsheet for implementation:
    // 1. Stage all changes: `await git.add('.')`.
    // 2. Save to stash with a message: `await git.stash(['push', '-m', 'recursa-checkpoint'])`.
    // 3. Return true on success.
    throw new Error('Not implemented');
  };

export const revertToLastCheckpoint =
  (git: SimpleGit) =>
  async (): Promise<boolean> => {
    // Cheatsheet for implementation:
    // 1. Apply the most recent stash: `await git.stash(['pop'])`.
    // 2. This can fail if the stash is empty, so wrap in a try/catch.
    // 3. Return true on success.
    throw new Error('Not implemented');
  };

export const discardChanges =
  (git: SimpleGit) =>
  async (): Promise<boolean> => {
    // Cheatsheet for implementation:
    // 1. Reset all tracked files: `await git.reset(['--hard', 'HEAD'])`.
    // 2. Remove all untracked files and directories: `await git.clean('f', ['-d'])`.
    // 3. Return true on success.
    throw new Error('Not implemented');
  };
````

## File: src/core/mem-api/util-ops.ts
````typescript
import type { PathTokenCount } from '../../types';
// import { get_encoding } from 'tiktoken';
import { resolveSecurePath } from './secure-path';
import { promises as fs } from 'fs';

// A private helper to centralize token counting logic.
// This promotes DRY by ensuring both getTokenCount and getTokenCountForPaths
// use the exact same tokenization implementation.
// This assumes tiktoken is available once implemented.
const countTokensForContent = (content: string): number => {
  // Cheatsheet for implementation:
  // 1. `import { get_encoding } from 'tiktoken';`
  // 2. `const encoding = get_encoding('cl100k_base');`
  // 3. `const tokens = encoding.encode(content);`
  // 4. `encoding.free();`
  // 5. `return tokens.length;`
  throw new Error(
    'Token counting logic not implemented. Awaiting tiktoken integration.'
  );
};

// Note: HOFs returning the final mem API functions.

export const getGraphRoot =
  (graphRoot: string) =>
  async (): Promise<string> => {
    return graphRoot;
  };

export const getTokenCount =
  (graphRoot: string) =>
  async (filePath: string): Promise<number> => {
    // Cheatsheet for implementation:
    // 1. This module needs a tokenizer, e.g., `tiktoken`. Add it to package.json.
    // 2. Use resolveSecurePath to get the full, validated path.
    // 3. Read file content using `fs.readFile`.
    // 4. Call the private `countTokensForContent` helper with the file content.
    // 5. Return the result.
    throw new Error('Not implemented');
  };

export const getTokenCountForPaths =
  (graphRoot: string) =>
  async (paths: string[]): Promise<PathTokenCount[]> => {
    // Cheatsheet for implementation:
    // 1. Use `Promise.all` to process all paths concurrently.
    // 2. For each path in the input array:
    //    a. Use resolveSecurePath to get the full, validated path.
    //    b. Read the file content using `fs.readFile`.
    //    c. Call the private `countTokensForContent` helper.
    //    d. Create and return an object `{ path: originalPath, tokenCount: result }`.
    // 3. Await the results from `Promise.all` and return the final array.
    throw new Error('Not implemented');
  };
````

## File: src/core/llm.ts
````typescript
import type { AppConfig } from '../config';

import type { ChatMessage } from '../types';

export const queryLLM = async (
  history: ChatMessage[],
  config: AppConfig
): Promise<string> => {
  // Cheatsheet for implementation:
  // 1. Define the OpenRouter API endpoint URL: 'https://openrouter.ai/api/v1/chat/completions'.
  // 2. Create the request body as a JSON object: `{ model: config.llmModel, messages: history }`.
  // 3. Use `fetch` to make a POST request.
  // 4. Set headers:
  //    - 'Content-Type': 'application/json'
  //    - 'Authorization': `Bearer ${config.openRouterApiKey}`
  // 5. Check if `response.ok` is true. If not, parse the error response and throw a descriptive error.
  // 6. Parse the JSON response: `const data = await response.json();`.
  // 7. Extract the content from the first choice: `data.choices[0].message.content`.
  // 8. Return the content string. Handle cases where the response might be empty or malformed.
  throw new Error('Not implemented');
};
````

## File: src/core/loop.ts
````typescript
import type { AppConfig } from '../config';
import type { ExecutionContext, ChatMessage } from '../types';
import { logger } from '../lib/logger';
import { queryLLM as defaultQueryLLM } from './llm';
import { parseLLMResponse } from './parser';
import { runInSandbox } from './sandbox';
import { createMemAPI } from './mem-api';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

// A mock in-memory session store. In a real app, this might be Redis, a DB, or a file store.
const sessionHistories: Record<string, ChatMessage[]> = {};

let systemPromptMessage: ChatMessage | null = null;

const getSystemPrompt = (): ChatMessage => {
  // This function reads the system prompt from disk on its first call and caches it.
  // This is a form of lazy-loading and ensures the file is read only once.
  if (systemPromptMessage) {
    return systemPromptMessage;
  }

  // Cheatsheet for implementation:
  // 1. Resolve the path to 'docs/system-prompt.md' from the project root.
  //    `const promptPath = path.resolve(process.cwd(), 'docs/system-prompt.md');`
  // 2. Read the file content synchronously. `fs.readFileSync(promptPath, 'utf-8');`
  // 3. Create the ChatMessage object and store it in `systemPromptMessage`.
  // 4. If file read fails, log a critical error and exit, as the agent cannot run without it.
  // 5. For now, using a hardcoded abridged version as a fallback during development.
  systemPromptMessage = {
    role: 'system',
    content: `You are Recursa, a Git-Native AI agent. Your mind is a local knowledge graph, your actions are TypeScript code, and your memory is a git history. You do not simply answer questions; you reason, modify the graph, and commit your work.`, // Abridged for brevity
  };
  return systemPromptMessage;
};

export const handleUserQuery = async (
  query: string,
  config: AppConfig,
  sessionId?: string,
  // Allow overriding the LLM query function for testing purposes
  queryLLM: typeof defaultQueryLLM = defaultQueryLLM
): Promise<string> => {
  // 1. **Initialization**
  const runId = randomUUID();
  const currentSessionId = sessionId || randomUUID();
  logger.info('Starting user query handling', { runId, sessionId: currentSessionId });

  const memAPI = createMemAPI(config);

  const history = sessionHistories[currentSessionId] ?? [getSystemPrompt()];
  if (!sessionHistories[currentSessionId]) {
    sessionHistories[currentSessionId] = history;
  }
  history.push({ role: 'user', content: query });

  const context: ExecutionContext = {
    history,
    memAPI,
    config,
    runId,
  };

  // 2. **Execution Loop**
  const MAX_TURNS = 10;
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    logger.info(`Starting turn ${turn + 1}`, { runId, turn: turn + 1 });

    // **Call LLM**
    const llmResponseStr = await queryLLM(context.history, config);
    context.history.push({ role: 'assistant', content: llmResponseStr });

    // **Parse**
    const parsedResponse = parseLLMResponse(llmResponseStr);
    if (!parsedResponse.think && !parsedResponse.typescript && !parsedResponse.reply) {
      logger.error('Failed to parse LLM response', { runId, llmResponseStr });
      return 'Error: Could not understand the response from the AI.';
    }

    // **Think**
    if (parsedResponse.think) {
      logger.info('Agent is thinking', { runId, thought: parsedResponse.think });
      // TODO: In a real app, this would be sent to the client via SSE or WebSocket.
    }

    // **Act**
    if (parsedResponse.typescript) {
      try {
        const executionResult = await runInSandbox(
          parsedResponse.typescript,
          context.memAPI
        );
        const feedback = `[Execution Result]: Code executed successfully. Result: ${JSON.stringify(
          executionResult
        )}`;
        context.history.push({ role: 'user', content: feedback });
      } catch (e) {
         const feedback = `[Execution Error]: ${(e as Error).message}`;
         context.history.push({ role: 'user', content: feedback });
      }
    }

    // **Reply**
    if (parsedResponse.reply) {
      logger.info('Agent replied', { runId, reply: parsedResponse.reply });
      return parsedResponse.reply;
    }
  }

  // 3. **Termination**
  logger.warn('Loop finished without a reply', { runId, turns: MAX_TURNS });
  return 'The agent finished its work without providing a final response.';
};
````

## File: src/core/parser.ts
````typescript
import type { ParsedLLMResponse } from '../types';

/**
 * Parses the LLM's XML-like response string into a structured object.
 * This function uses a simple regex-based approach for robustness against
 * potentially malformed, non-XML-compliant output from the LLM, which is
 * often more reliable than a strict XML parser.
 *
 * @param response The raw string response from the LLM.
 * @returns A ParsedLLMResponse object with optional `think`, `typescript`, and `reply` fields.
 */
export const parseLLMResponse = (response: string): ParsedLLMResponse => {
  const extractTagContent = (tagName: string): string | undefined => {
    const regex = new RegExp(
      `<${tagName}>([\\s\\S]*?)<\\/${tagName}>`,
      'i'
    );
    const match = response.match(regex);
    // If a match is found, return the captured group (the content), trimmed.
    return match ? match[1].trim() : undefined;
  };

  return {
    think: extractTagContent('think'),
    typescript: extractTagContent('typescript'),
    reply: extractTagContent('reply'),
  };
};
````

## File: src/core/sandbox.ts
````typescript
import { VM } from 'vm2';
import type { MemAPI } from '../types';
import { logger } from '../lib/logger';

/**
 * Executes LLM-generated TypeScript code in a secure, isolated sandbox.
 * @param code The TypeScript code snippet to execute.
 * @param memApi The MemAPI instance to expose to the sandboxed code.
 * @returns The result of the code execution.
 */
export const runInSandbox = async (
  code: string,
  memApi: MemAPI
): Promise<any> => {
  const vm = new VM({
    timeout: 10000, // 10 seconds
    sandbox: {
      mem: memApi,
    },
    eval: false,
    wasm: false,
    fixAsync: true,
    // Deny access to all node builtins by default.
    require: {
      builtin: [],
    },
  });

  // Wrap the user code in an async IIFE to allow top-level await.
  const wrappedCode = `(async () => { ${code} })();`;

  try {
    logger.debug('Executing code in sandbox', { code: wrappedCode });
    const result = await vm.run(wrappedCode);
    logger.debug('Sandbox execution successful', { result });
    return result;
  } catch (error) {
    logger.error('Error executing sandboxed code', error as Error, {
      code,
    });
    // Re-throw a sanitized error to the agent loop
    throw new Error(`Sandbox execution failed: ${(error as Error).message}`);
  }
};
````

## File: src/lib/logger.ts
````typescript
import 'dotenv/config';

// Cheatsheet for implementation:
// 1. Define log levels using a numeric enum for easy comparison.
// 2. Create a logger that can be configured with a minimum log level (from env).
// 3. The logger should support adding structured context.
// 4. Implement a `child` method to create a new logger instance with pre-filled context.
//    This is useful for adding request or session IDs to all logs within that scope.
// 5. The actual logging should be done to console.log as a JSON string.

export enum LogLevel {
  DEBUG = 10,
  INFO = 20,
  WARN = 30,
  ERROR = 40,
}

const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'debug',
  [LogLevel.INFO]: 'info',
  [LogLevel.WARN]: 'warn',
  [LogLevel.ERROR]: 'error',
};

const LOG_LEVEL_MAP: Record<string, LogLevel> = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
};

const MIN_LOG_LEVEL: LogLevel =
  LOG_LEVEL_MAP[process.env.LOG_LEVEL?.toLowerCase() ?? 'info'] ?? LogLevel.INFO;

type LogContext = Record<string, unknown>;

export type Logger = {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, error?: Error, context?: LogContext) => void;
  child: (childContext: LogContext) => Logger;
};

const createLoggerInternal = (baseContext: LogContext = {}): Logger => {
  const log = (level: LogLevel, message: string, context: LogContext = {}) => {
    // TODO: Implement the logging logic.
    // if (level < MIN_LOG_LEVEL) {
    //   return;
    // }
    // const finalContext = { ...baseContext, ...context };
    // const logEntry = {
    //   level: LOG_LEVEL_NAMES[level],
    //   timestamp: new Date().toISOString(),
    //   message,
    //   ...finalContext,
    // };
    // // eslint-disable-next-line no-console
    // console.log(JSON.stringify(logEntry));
  };

  const error = (message: string, err?: Error, context?: LogContext) => {
    // TODO: Implement the error logging logic.
    // const errorContext = {
    //   ...context,
    //   error: err ? { message: err.message, stack: err.stack } : undefined,
    // };
    // log(LogLevel.ERROR, message, errorContext);
  };

  return {
    debug: (message, context) => log(LogLevel.DEBUG, message, context),
    info: (message, context) => log(LogLevel.INFO, message, context),
    warn: (message, context) => log(LogLevel.WARN, message, context),
    error,
    child: (childContext: LogContext) => {
      // TODO: Implement the child logger creation.
      // const mergedContext = { ...baseContext, ...childContext };
      // return createLoggerInternal(mergedContext);
      return createLoggerInternal({ ...baseContext, ...childContext });
    },
  };
};

export const createLogger = (): Logger => createLoggerInternal();

export const logger = createLogger();
````

## File: src/config.ts
````typescript
import 'dotenv/config';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';

const configSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1, 'OPENROUTER_API_KEY is required.'),
  KNOWLEDGE_GRAPH_PATH: z.string().min(1, 'KNOWLEDGE_GRAPH_PATH is required.'),
  LLM_MODEL: z
    .string()
    .default('anthropic/claude-3-haiku-20240307') // Sensible default for cost/speed
    .optional(),
  PORT: z.coerce.number().int().positive().default(3000),
});

export type AppConfig = {
  openRouterApiKey: string;
  knowledgeGraphPath: string;
  llmModel: string;
  port: number;
};

export const loadAndValidateConfig = (): AppConfig => {
  const parseResult = configSchema.safeParse(process.env);

  if (!parseResult.success) {
    // eslint-disable-next-line no-console
    console.error(
      '❌ Invalid environment variables:',
      parseResult.error.flatten().fieldErrors
    );
    process.exit(1);
  }

  const {
    OPENROUTER_API_KEY,
    KNOWLEDGE_GRAPH_PATH,
    LLM_MODEL,
    PORT,
  } = parseResult.data;

  // Perform runtime checks
  let resolvedPath = KNOWLEDGE_GRAPH_PATH;
  if (!path.isAbsolute(resolvedPath)) {
    resolvedPath = path.resolve(process.cwd(), resolvedPath);
    // eslint-disable-next-line no-console
    console.warn(
      `KNOWLEDGE_GRAPH_PATH is not absolute. Resolved to: ${resolvedPath}`
    );
  }

  try {
    const stats = fs.statSync(resolvedPath);
    if (!stats.isDirectory()) {
      throw new Error('is not a directory.');
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      `❌ Error with KNOWLEDGE_GRAPH_PATH "${resolvedPath}": ${
        (error as Error).message
      }`
    );
    process.exit(1);
  }

  return Object.freeze({
    openRouterApiKey: OPENROUTER_API_KEY,
    knowledgeGraphPath: resolvedPath,
    llmModel: LLM_MODEL!,
    port: PORT,
  });
};

export const config: AppConfig = loadAndValidateConfig();
````

## File: src/types.ts
````typescript
// --- LLM & Agent Interaction ---

// The structured data parsed from the LLM's XML-like response.
export type ParsedLLMResponse = {
  think?: string;
  typescript?: string;
  reply?: string;
};

// Represents a single message in the conversation history with the LLM.
export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

// --- Knowledge Graph & Git ---

// Structure for a single Git log entry.
export type LogEntry = {
  hash: string;
  message: string;
  date: string;
};

// Structure for a graph query result.
export type QueryResult = {
  filePath: string;
  matches: string[];
};

// Structure for token count results for multiple paths.
export type PathTokenCount = {
  path: string;
  tokenCount: number;
};

// --- API & Server ---

// The expected JSON body for incoming requests to the MCP server.
export type McpRequest = {
  query: string;
  // Optional: A session ID to maintain conversation context between requests.
  sessionId?: string;
};

// The execution context passed through the agent loop.
export type ExecutionContext = {
  // The complete conversation history for this session.
  history: ChatMessage[];
  // The API implementation available to the sandbox.
  memAPI: MemAPI;
  // The application configuration.
  config: import('./config').AppConfig;
  // A unique ID for this execution run.
  runId: string;
};

// --- MemAPI Interface (Matches tools.md) ---

// This is the "cheatsheet" for what's available in the sandbox.
// It must be kept in sync with the tools documentation.
export type MemAPI = {
  // Core File I/O
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<boolean>;
  updateFile: (
    filePath: string,
    oldContent: string,
    newContent: string
  ) => Promise<boolean>;
  deleteFile: (filePath: string) => Promise<boolean>;
  rename: (oldPath: string, newPath: string) => Promise<boolean>;
  fileExists: (filePath: string) => Promise<boolean>;
  createDir: (directoryPath: string) => Promise<boolean>;
  listFiles: (directoryPath?: string) => Promise<string[]>;

  // Git-Native Operations
  gitDiff: (
    filePath: string,
    fromCommit?: string,
    toCommit?: string
  ) => Promise<string>;
  gitLog: (filePath: string, maxCommits?: number) => Promise<LogEntry[]>;
  gitStagedFiles: () => Promise<string[]>;
  commitChanges: (message: string) => Promise<string>;

  // Intelligent Graph Operations
  queryGraph: (query: string) => Promise<QueryResult[]>;
  getBacklinks: (filePath: string) => Promise<string[]>;
  getOutgoingLinks: (filePath: string) => Promise<string[]>;
  searchGlobal: (query: string) => Promise<string[]>;

  // State Management
  saveCheckpoint: () => Promise<boolean>;
  revertToLastCheckpoint: () => Promise<boolean>;
  discardChanges: () => Promise<boolean>;

  // Utility
  getGraphRoot: () => Promise<string>;
  getTokenCount: (filePath: string) => Promise<number>;
  getTokenCountForPaths: (paths: string[]) => Promise<PathTokenCount[]>;
};
````

## File: tests/e2e/agent-workflow.test.ts
````typescript
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
````

## File: tests/integration/mem-api.test.ts
````typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import simpleGit from 'simple-git';
import { createMemAPI } from '../../src/core/mem-api';
import type { AppConfig } from '../../src/config';
import type { MemAPI } from '../../src/types';

describe('MemAPI Integration Tests', () => {
  let tempDir: string;
  let mem: MemAPI;

  const mockConfig: Pick<AppConfig, 'knowledgeGraphPath'> = {
    knowledgeGraphPath: '', // This will be set in beforeAll
  };

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'recursa-test-'));
    mockConfig.knowledgeGraphPath = tempDir;
  });

  beforeEach(async () => {
    // Clear the directory
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.mkdir(tempDir, { recursive: true });
    // Init git
    const git = simpleGit(tempDir);
    await git.init();
    await git.addConfig('user.name', 'Test User');
    await git.addConfig('user.email', 'test@example.com');
    // Create the mem API instance for this test
    mem = createMemAPI(mockConfig as AppConfig);
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should write, read, and check existence of a file', async () => {
    const filePath = 'test.md';
    const content = 'hello world';

    // TODO: call mem.writeFile to create the file.
    // await mem.writeFile(filePath, content);

    // TODO: call mem.readFile and assert its content is correct.
    // const readContent = await mem.readFile(filePath);
    // expect(readContent).toBe(content);

    // TODO: call mem.fileExists and assert it returns true.
    // const exists = await mem.fileExists(filePath);
    // expect(exists).toBe(true);

    // TODO: check for a non-existent file and assert it returns false.
    // const nonExistent = await mem.fileExists('not-real.md');
    // expect(nonExistent).toBe(false);
  });

  it('should throw an error for path traversal attempts', async () => {
    const maliciousPath = '../../../etc/passwd';

    // TODO: Assert that mem.readFile with a malicious path throws a specific security error.
    // await expect(mem.readFile(maliciousPath)).rejects.toThrow(
    //   'Security Error: Path traversal attempt detected.'
    // );

    // TODO: Assert that mem.writeFile with a malicious path also throws.
    // await expect(mem.writeFile(maliciousPath, '...')).rejects.toThrow(
    //   'Security Error: Path traversal attempt detected.'
    // );

    // TODO: Test other file-op functions like deleteFile, rename, etc.
  });

  it('should commit a change and log it', async () => {
    const filePath = 'a.md';
    const content = 'content';
    const commitMessage = 'feat: add a.md';

    // TODO: Write a file.
    // await mem.writeFile(filePath, content);

    // TODO: Commit the change with a message.
    // const commitHash = await mem.commitChanges(commitMessage);

    // TODO: Assert that the commit hash is a valid string.
    // expect(typeof commitHash).toBe('string');
    // expect(commitHash.length).toBeGreaterThan(5);

    // TODO: Get the git log for the file.
    // const log = await mem.gitLog(filePath, 1);

    // TODO: Assert that the log contains the correct commit message.
    // expect(log.length).toBe(1);
    // expect(log[0].message).toBe(commitMessage);
  });

  it('should list files in a directory', async () => {
    // TODO: Create a set of files and directories.
    // await mem.writeFile('a.txt', 'a');
    // await mem.writeFile('b.txt', 'b');
    // await mem.createDir('subdir');
    // await mem.writeFile('subdir/c.txt', 'c');

    // TODO: List files at the root and assert the contents.
    // The order might not be guaranteed, so use `expect.arrayContaining`.
    // const rootFiles = await mem.listFiles();
    // expect(rootFiles).toEqual(expect.arrayContaining(['a.txt', 'b.txt', 'subdir']));
    // expect(rootFiles.length).toBe(3);

    // TODO: List files in the subdirectory and assert the contents.
    // const subdirFiles = await mem.listFiles('subdir');
    // expect(subdirFiles).toEqual(['c.txt']);

    // TODO: List files in an empty directory and assert it's an empty array.
    // await mem.createDir('empty');
    // const emptyFiles = await mem.listFiles('empty');
    // expect(emptyFiles).toEqual([]);
  });
});
````

## File: tests/unit/parser.test.ts
````typescript
import { describe, it, expect } from 'bun:test';
import { parseLLMResponse } from '../../src/core/parser';

describe('LLM Response Parser', () => {
  it('should parse a full, valid response', () => {
    const xml = `<think>Thinking about stuff.</think><typescript>console.log("hello");</typescript><reply>All done!</reply>`;
    const result = parseLLMResponse(xml);
    expect(result).toEqual({
      think: 'Thinking about stuff.',
      typescript: 'console.log("hello");',
      reply: 'All done!',
    });
  });

  it('should parse a partial response (think/act)', () => {
    const xml = `<think>Let me write a file.</think><typescript>await mem.writeFile('a.txt', 'hi');</typescript>`;
    const result = parseLLMResponse(xml);
    expect(result).toEqual({
      think: 'Let me write a file.',
      typescript: "await mem.writeFile('a.txt', 'hi');",
      reply: undefined,
    });
  });

  it('should handle extra whitespace and newlines', () => {
    const xml = `
      <think>
        I need to think about this...
        With newlines.
      </think>
      <typescript>
        const x = 1;
      </typescript>
    `;
    const result = parseLLMResponse(xml);
    expect(result).toEqual({
      think: `I need to think about this...\n        With newlines.`,
      typescript: 'const x = 1;',
      reply: undefined,
    });
  });

  it('should return an object with undefined for missing tags', () => {
    const xml = `<reply>Just a reply.</reply>`;
    const result = parseLLMResponse(xml);
    expect(result).toEqual({
      think: undefined,
      typescript: undefined,
      reply: 'Just a reply.',
    });
  });

  it('should handle an empty string', () => {
    const xml = '';
    const result = parseLLMResponse(xml);
    expect(result).toEqual({
      think: undefined,
      typescript: undefined,
      reply: undefined,
    });
  });

  it('should handle tags in a different order', () => {
    const xml = `<reply>Final answer.</reply><think>One last thought.</think>`;
    const result = parseLLMResponse(xml);
    expect(result).toEqual({
      think: 'One last thought.',
      typescript: undefined,
      reply: 'Final answer.',
    });
  });
});
````

## File: .dockerignore
````
# Git
.git
.gitignore

# Node
node_modules

# Local Environment
.env
.env.*
! .env.example

# IDE / OS
.vscode
.idea
.DS_Store

# Logs and temp files
npm-debug.log*
yarn-debug.log*
*.log

# Docker
Dockerfile
.dockerignore
````

## File: .eslintrc.json
````json
{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended"
  ],
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "env": {
    "es6": true,
    "node": true
  },
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { "argsIgnorePattern": "^_" }
    ],
    "no-console": "warn"
  }
}
````

## File: .prettierrc.json
````json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "endOfLine": "lf"
}
````

## File: Dockerfile
````dockerfile
# ---- Base Stage ----
# Use the official Bun image as a base.
# It includes all the necessary tooling.
FROM oven/bun:1 as base
WORKDIR /usr/src/app

# ---- Dependencies Stage ----
# Install dependencies. This layer is cached to speed up subsequent builds
# if dependencies haven't changed.
FROM base as deps
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# ---- Build Stage ----
# Copy source code and build the application.
FROM base as build
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
# NOTE: If you were compiling to JS, a build step would go here.
# For Bun, we can run TS directly. We can also add a typecheck here.
RUN bun run typecheck

# ---- Production Stage ----
# Create a smaller final image.
# We only copy the necessary files to run the application.
FROM oven/bun:1-slim as production
WORKDIR /usr/src/app

# Copy production dependencies and source code
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/src ./src
COPY --from=build /usr/src/app/package.json ./package.json
COPY .env.example ./.env.example

# Expose the port the app runs on
EXPOSE 3000

# The command to run the application
CMD ["bun", "run", "src/server.ts"]
````

## File: docs/rules.md
````markdown
codebase compliance rules;

1. No OOP, only HOFs
2. Use bun.sh and e2e type safe TypeScript
3. No unknown or any type
4. [e2e|integration|unit]/[domain].test.ts files & dirs
5. Bun tests, real implementation (no mocks), isolated tests
6. **DRY Principle**: Sub-agents MUST inspect and build upon existing work in other worktrees before implementing new features. Always review what other agents have implemented to avoid code duplication and ensure consistency across the codebase.
````

## File: relay.config.json
````json
{
  "$schema": "https://relay.noca.pro/schema.json",
  "projectId": "doc",
  "core": {
    "logLevel": "info",
    "enableNotifications": true,
    "watchConfig": false
  },
  "watcher": {
    "clipboardPollInterval": 2000,
    "preferredStrategy": "auto",
    "enableBulkProcessing": false,
    "bulkSize": 5,
    "bulkTimeout": 30000
  },
  "patch": {
    "approvalMode": "manual",
    "approvalOnErrorCount": 0,
    "linter": "",
    "preCommand": "",
    "postCommand": "",
    "minFileChanges": 0
  },
  "git": {
    "autoGitBranch": false,
    "gitBranchPrefix": "relay/",
    "gitBranchTemplate": "gitCommitMsg"
  }
}
````

## File: src/server.ts
````typescript
import { Elysia, t } from 'elysia';
import { config } from './config';
import { handleUserQuery } from './core/loop';
import { logger } from './lib/logger';
import { randomUUID } from 'crypto';

export const createApp = (
  handleQuery: typeof handleUserQuery,
  appConfig: typeof config
) => {
  const app = new Elysia()
    // --- Middleware: Request Logging ---
    .onRequest(({ request }) => {
      request.headers.set('X-Request-ID', randomUUID());
    })
    .onBeforeHandle(({ request, store }) => {
      store.startTime = Date.now();
      logger.info('Request received', {
        reqId: request.headers.get('X-Request-ID'),
        method: request.method,
        path: new URL(request.url).pathname,
      });
    })
    .onAfterHandle(({ request, store }) => {
      const duration = Date.now() - (store.startTime as number);
      logger.info('Request completed', {
        reqId: request.headers.get('X-Request-ID'),
        method: request.method,
        path: new URL(request.url).pathname,
        duration: `${duration}ms`,
      });
    })
    // --- Error Handling ---
    .onError(({ code, error, set, request }) => {
      logger.error('An error occurred', error, {
        reqId: request.headers.get('X-Request-ID'),
        code,
      });
      set.status = 500;
      return { error: 'Internal Server Error' };
    })
    // --- Routes ---
    .get('/', () => ({ status: 'ok', message: 'Recursa server is running' }))
    .post(
      '/mcp',
      async ({ body }) => {
        const { query, sessionId } = body;
        // NOTE: For a simple non-streaming implementation, we await the final result.
        // A production implementation should use WebSockets or SSE to stream back <think> messages.
        const finalReply = await handleQuery(query, appConfig, sessionId);
        return { reply: finalReply };
      },
      {
        body: t.Object({
          query: t.String({ minLength: 1 }),
          sessionId: t.Optional(t.String()),
        }),
      }
    );

  return app;
};

// --- Main Execution Block ---
if (import.meta.main) {
  const app = createApp(handleUserQuery, config);

  app.listen(config.port, () => {
    logger.info(`🧠 Recursa server listening on http://localhost:${config.port}`);
  });

  // --- Graceful Shutdown ---
  process.on('SIGINT', () => {
    logger.info('SIGINT received. Shutting down gracefully.');
    app.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully.');
    app.stop();
    process.exit(0);
  });
}
````

## File: .env.example
````
# Your OpenRouter API Key
OPENROUTER_API_KEY="sk-or-..."

# The ABSOLUTE path to your graph's directory (e.g., the "pages" folder for Logseq)
KNOWLEDGE_GRAPH_PATH="/path/to/your/notes"

# The model you want to use from OpenRouter
LLM_MODEL="anthropic/claude-3-sonnet-20240229"

# Optional: Port for the Recursa server
PORT=3000
````

## File: package.json
````json
{
  "name": "recursa",
  "version": "0.1.0",
  "description": "The Git-Native Memory Layer for Local-First LLMs",
  "main": "src/server.ts",
  "scripts": {
    "start": "bun run src/server.ts",
    "dev": "bun --watch src/server.ts",
    "test": "bun test",
    "lint": "eslint . --ext .ts",
    "lint:fix": "eslint . --ext .ts --fix",
    "format": "prettier --check .",
    "format:fix": "prettier --write .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "dotenv": "^16.4.5",
    "elysia": "^1.0.0",
    "fast-xml-parser": "^4.3.6",
    "simple-git": "^3.24.0",
    "vm2": "^3.9.19",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^7.10.0",
    "@typescript-eslint/parser": "^7.10.0",
    "bun-types": "latest",
    "eslint": "^8.57.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-prettier": "^5.1.3",
    "prettier": "^3.2.5"
  },
  "peerDependencies": {
    "typescript": "^5.0.0"
  },
  "license": "MIT"
}
````

## File: tsconfig.json
````json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "lib": ["ESNext"],
    "moduleResolution": "node",
    "rootDir": "src",
    "outDir": "dist",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "types": ["bun-types"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
````

## File: .gitignore
````
# Dependencies
/node_modules
/.pnp
.pnp.js

# Testing
/coverage

# Production
/build
/dist

# Misc
.DS_Store
*.pem

# Debugging
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Environment Variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDEs
.idea
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json
*.sublime-workspace

# Relay
.relay/

# Worktrees (from original)
worktrees/*/node_modules/
worktrees/*/.git/
````

## File: repomix.config.json
````json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "input": {
    "maxFileSize": 52428800
  },
  "output": {
    "filePath": "repo/repomix.md",
    "style": "markdown",
    "parsableStyle": true,
    "fileSummary": false,
    "directoryStructure": true,
    "files": true,
    "removeComments": false,
    "removeEmptyLines": false,
    "compress": false,
    "topFilesLength": 5,
    "showLineNumbers": false,
    "truncateBase64": false,
    "copyToClipboard": true,
    "includeFullDirectoryStructure": false,
    "tokenCountTree": false,
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": false,
      "includeLogs": false,
      "includeLogsCount": 50
    }
  },
  "include": [],
  "ignore": {
    "useGitignore": true,
    "useDefaultPatterns": true,
    "customPatterns": [
      ".relay/",
      "agent-spawner.claude.md",
      "agent-spawner.droid.md",
      "AGENTS.md",
      "repo"
    ]
  },
  "security": {
    "enableSecurityCheck": true
  },
  "tokenCount": {
    "encoding": "o200k_base"
  }
}
````
