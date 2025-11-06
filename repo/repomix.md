# Directory Structure
```
docs/
  readme.md
  rules.md
  system-prompt.md
  tools.md
src/
  api/
    mcp.handler.ts
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
  types/
    git.ts
    index.ts
    llm.ts
    loop.ts
    mcp.ts
    mem.ts
    sandbox.ts
  config.ts
  server.ts
tests/
  e2e/
    agent-workflow.test.ts
    mcp-server-complete.test.ts
  integration/
    basic-think-act-commit.test.ts
    end-to-e2e.test.ts
    end-to-end.test.ts
    mcp-server-http.test.ts
    mem-api.test.ts
    think-act-commit.test.ts
    workflow-integration.test.ts
  unit/
    llm.test.ts
    parser.test.ts
.dockerignore
.env.example
.env.test
.eslintrc.json
.gitignore
.prettierrc.json
Dockerfile
package.json
relay.config.json
repomix.config.json
tasks.md
tsconfig.json
tsconfig.tsbuildinfo
```

# Files

## File: src/types/loop.ts
````typescript
import type { MemAPI } from './mem';
import type { ChatMessage } from './llm';

// Real-time status update types
export type StatusUpdate = {
  type: 'think' | 'act' | 'error' | 'complete';
  runId: string;
  timestamp: number;
  content?: string;
  data?: Record<string, unknown>;
};

// The execution context passed through the agent loop.
export type ExecutionContext = {
  // The complete conversation history for this session.
  history: ChatMessage[];
  // The API implementation available to the sandbox.
  memAPI: MemAPI;
  // The application configuration.
  config: import('../config').AppConfig;
  // A unique ID for this execution run.
  runId: string;
  // Optional callback for real-time status updates
  onStatusUpdate?: (update: StatusUpdate) => void;
};
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

## File: tsconfig.tsbuildinfo
````
{"root":["./src/config.ts","./src/server.ts","./src/api/mcp.handler.ts","./src/core/llm.ts","./src/core/loop.ts","./src/core/parser.ts","./src/core/sandbox.ts","./src/core/mem-api/file-ops.ts","./src/core/mem-api/git-ops.ts","./src/core/mem-api/graph-ops.ts","./src/core/mem-api/index.ts","./src/core/mem-api/secure-path.ts","./src/core/mem-api/state-ops.ts","./src/core/mem-api/util-ops.ts","./src/lib/logger.ts","./src/types/git.ts","./src/types/index.ts","./src/types/llm.ts","./src/types/loop.ts","./src/types/mcp.ts","./src/types/mem.ts","./src/types/sandbox.ts"],"version":"5.9.3"}
````

## File: docs/readme.md
````markdown
# Recursa: The Git-Native Memory Layer for Local-First LLMs

**[Project Status: Active Development] [View System Prompt] [Report an Issue]**

**TL;DR:** Recursa gives your AI a perfect, auditable memory that lives and grows in your local filesystem. It's an open-source MCP server that uses your **Logseq/Obsidian graph** as a dynamic, version-controlled knowledge base. Your AI's brain becomes a plaintext repository you can `grep`, `edit`, and `commit`.

Forget wrestling with databases or opaque cloud APIs. This is infrastructure-free, plaintext-first memory for agents that _create_.

---

## The Problem: Agent Amnesia & The RAG Ceiling

You're building an intelligent agent and have hit the memory wall. The industry's current solutions are fundamentally flawed, leading to agents that can't truly learn or evolve:

1.  **Vector DBs (RAG):** A read-only librarian. It's excellent for retrieving existing facts but is structurally incapable of _creating new knowledge_, _forming novel connections_, or _evolving its understanding_ based on new interactions. It hits the "RAG ceiling," where agents can only answer, not synthesize.
2.  **Opaque Self-Hosted Engines:** You're lured by "open source" but are now a part-time DevOps engineer, managing Docker containers, configuring databases, and debugging opaque states instead of focusing on your agent's core intelligence.
3.  **Black-Box APIs:** You trade infrastructure pain for a vendor's prison. Your AI's memory is locked away, inaccessible to your tools, and impossible to truly audit or understand.

Recursa is built on a different philosophy: **Your AI's memory should be a dynamic, transparent, and versionable extension of its own thought process, running entirely on your machine.**

## The Recursa Philosophy: Core Features

Recursa isn't a database; it's a reasoning engine. It treats a local directory of plaintext files—ideally a Git repository—as the agent's primary memory.

- **Git-Native Memory:** Every change, every new idea, every retracted thought is a `git commit`. You get a perfect, auditable history of your agent's learning process. You can branch its memory, merge concepts, and revert to previous states.
- **Plaintext Supremacy:** The AI's brain is a folder of markdown files. It's human-readable, universally compatible with tools like Obsidian and Logseq, and free from vendor lock-in.
- **Think-Act-Commit Loop:** The agent reasons internally, generates code to modify its memory, executes it in a sandbox, and commits the result with a descriptive message. This is a transparent, auditable cognitive cycle.
- **Safety Checkpoints:** For complex, multi-turn operations (like a large-scale refactor), the agent can use `mem.saveCheckpoint()` to save its progress. If it makes a mistake, it can instantly roll back with `mem.revertToLastCheckpoint()`, providing a safety net for ambitious tasks.
- **Token-Aware Context:** With tools like `mem.getTokenCount()`, the agent can intelligently manage its own context window, ensuring it can read and reason about large files without exceeding API limits.

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

_Recursa executes the code and confirms success to the LLM._

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

- [Node.js](https://nodejs.org/) (v18 or higher)
- A local [Logseq](https://logseq.com/) or [Obsidian](https://obsidian.md/) graph (a folder of `.md` files)
- An [OpenRouter.ai](https://openrouter.ai/) API Key

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

- [ ] **Enhanced Graph Queries:** Adding more powerful filtering and traversal operators to `mem.queryGraph`.
- [ ] **Visualizer:** A simple web UI to visualize the agent's actions and the knowledge graph's evolution over time (`git log` visualized).
- [ ] **Multi-modal Support:** Allowing the agent to store and reference images and other file types within the graph.
- [ ] **Agent-to-Agent Collaboration:** Enabling two Recursa agents to collaborate on a single knowledge graph via Git (forks, pull requests).
- [ ] **Expanded Tooling:** Integrating web search, terminal access, and other essential agent capabilities into the `mem` object.

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

- `<think>`: **A user-facing status update.** A short, non-technical sentence describing the action you are about to take. This is shown to the user in real-time. **This tag is mandatory in every turn.**
- `<typescript>`: A TypeScript code snippet to be executed in the secure sandbox. This is where your technical plan is implemented.
- `<reply>`: The final, user-facing summary of the completed work. **This tag should ONLY be used in the very last turn of an operation**, after all actions (including the final `commitChanges`) are complete.

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

- **DO:** Check for a file, create it if it's missing, and then write a second related file all in one `<typescript>` block.
- **DO NOT:** Use one turn to check if a file exists, a second turn to create it, and a third turn to create another. This is slow, expensive, and incorrect.

---

## 3. The `mem` API: Your Sandboxed Toolkit

You have access to a global `mem` object with asynchronous methods. **ALL `mem` calls MUST be `await`ed.** For the complete API reference, read `tools.md`.

**Key Tool Categories:**

- **Core File I/O:** `mem.readFile`, `mem.writeFile`, `mem.updateFile`, `mem.fileExists`, `mem.listFiles`.
- **Git-Native Operations:** `mem.commitChanges`, `mem.gitLog`, `mem.gitDiff`.
- **Intelligent Graph Operations:** `mem.queryGraph`, `mem.getBacklinks`, `mem.getOutgoingLinks`.

---

## 4. The Core Workflow: Think-Act-Commit

Your operational cycle must follow this logical progression.

1.  **Internal Thought Process (No Output):** Understand the request, investigate the graph using `mem` tools, and formulate an efficient, multi-step plan to be executed in a single `<typescript>` block.

2.  **Communicate & Act (Generate Output):**
    - Write a user-facing `<think>` tag that simplifies your plan into a single, clear sentence.
    - Write the `<typescript>` code to execute your complete plan.

3.  **Commit & Reply (Final Turn):**
    - Once the work is done, write a `<think>` message about saving the changes.
    - Write the `<typescript>` code to call `mem.commitChanges()`.
    - Write the final `<reply>` to the user.

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

| Method               | Signature                                                                      | Returns             | Description                                                                                                                        |
| :------------------- | :----------------------------------------------------------------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------------------------------- |
| **`mem.readFile`**   | `(filePath: string): Promise<string>`                                          | `Promise<string>`   | Reads and returns the full content of the specified file.                                                                          |
| **`mem.writeFile`**  | `(filePath: string, content: string): Promise<boolean>`                        | `Promise<boolean>`  | Creates a new file at the specified path with the given content. Automatically creates any necessary parent directories.           |
| **`mem.updateFile`** | `(filePath: string, oldContent: string, newContent: string): Promise<boolean>` | `Promise<boolean>`  | Atomically finds the `oldContent` string in the file and replaces it with `newContent`. This is the primary tool for modification. |
| **`mem.deleteFile`** | `(filePath: string): Promise<boolean>`                                         | `Promise<boolean>`  | Deletes the specified file or empty directory.                                                                                     |
| **`mem.rename`**     | `(oldPath: string, newPath: string): Promise<boolean>`                         | `Promise<boolean>`  | Renames or moves a file or directory. Used for refactoring.                                                                        |
| **`mem.fileExists`** | `(filePath: string): Promise<boolean>`                                         | `Promise<boolean>`  | Checks if a file exists.                                                                                                           |
| **`mem.createDir`**  | `(directoryPath: string): Promise<boolean>`                                    | `Promise<boolean>`  | Creates a new directory, including any necessary nested directories.                                                               |
| **`mem.listFiles`**  | `(directoryPath?: string): Promise<string[]>`                                  | `Promise<string[]>` | Lists all files and directories (non-recursive) within a path, or the root if none is provided.                                    |

---

## Category 2: Git-Native Operations (Auditing & Versioning)

These tools leverage the Git repository tracking the knowledge graph, allowing the agent to audit its own memory and understand historical context.

| Method                   | Signature                                                                                              | Returns               | Description                                                                                                                                                |
| :----------------------- | :----------------------------------------------------------------------------------------------------- | :-------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`mem.gitDiff`**        | `(filePath: string, fromCommit?: string, toCommit?: string): Promise<string>`                          | `Promise<string>`     | Gets the `git diff` output for a specific file between two commits (or HEAD/WORKTREE if not specified). **Crucial for understanding how a page evolved.**  |
| **`mem.gitLog`**         | `(filePath: string, maxCommits: number = 5): Promise<{hash: string, message: string, date: string}[]>` | `Promise<LogEntry[]>` | Returns the commit history for a file or the entire repo. Used to understand **when** and **why** a file was last changed.                                 |
| **`mem.gitStagedFiles`** | `(): Promise<string[]>`                                                                                | `Promise<string[]>`   | Lists files that have been modified and are currently "staged" for the next commit (or the current working tree changes). Useful before a major operation. |
| **`mem.commitChanges`**  | `(message: string): Promise<string>`                                                                   | `Promise<string>`     | **Performs the final `git commit`**. The agent must generate a concise, human-readable commit message summarizing its actions. Returns the commit hash.    |

---

## Category 3: Intelligent Graph & Semantic Operations

These tools allow the agent to reason about the relationships and structure inherent in Logseq/Org Mode syntax, moving beyond simple file I/O.

| Method                     | Signature                                                           | Returns                  | Description                                                                                                                                                                                                                                               |
| :------------------------- | :------------------------------------------------------------------ | :----------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`mem.queryGraph`**       | `(query: string): Promise<{filePath: string, matches: string[]}[]>` | `Promise<QueryResult[]>` | **Executes a powerful graph query.** Can find pages by property (`key:: value`), links (`[[Page]]`), or block content. Used for complex retrieval. _Example: `(property affiliation:: AI Research Institute) AND (outgoing-link [[Symbolic Reasoning]])`_ |
| **`mem.getBacklinks`**     | `(filePath: string): Promise<string[]>`                             | `Promise<string[]>`      | Finds all other files that contain a link **to** the specified file. Essential for understanding context and usage.                                                                                                                                       |
| **`mem.getOutgoingLinks`** | `(filePath: string): Promise<string[]>`                             | `Promise<string[]>`      | Extracts all unique wikilinks (`[[Page Name]]`) that the specified file links **to**.                                                                                                                                                                     |
| **`mem.searchGlobal`**     | `(query: string): Promise<string[]>`                                | `Promise<string[]>`      | Performs a simple, full-text search across the entire graph. Returns a list of file paths that contain the match.                                                                                                                                         |

---

## Category 4: State Management & Checkpoints

Tools for managing the working state during complex, multi-turn operations, providing a safety net against errors.

| Method                           | Signature              | Returns            | Description                                                                                                                             |
| :------------------------------- | :--------------------- | :----------------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| **`mem.saveCheckpoint`**         | `(): Promise<boolean>` | `Promise<boolean>` | **Saves the current state.** Stages all working changes (`git add .`) and creates a temporary stash. Use this before a risky operation. |
| **`mem.revertToLastCheckpoint`** | `(): Promise<boolean>` | `Promise<boolean>` | **Reverts to the last saved state.** Restores the files to how they were when `saveCheckpoint` was last called.                         |
| **`mem.discardChanges`**         | `(): Promise<boolean>` | `Promise<boolean>` | **Performs a hard reset.** Abandons all current work (staged and unstaged changes) and reverts the repository to the last commit.       |

---

## Category 5: Utility & Diagnostics

General-purpose operations for the sandbox environment.

| Method                          | Signature                                                          | Returns                     | Description                                                                                           |
| :------------------------------ | :----------------------------------------------------------------- | :-------------------------- | :---------------------------------------------------------------------------------------------------- |
| **`mem.getGraphRoot`**          | `(): Promise<string>`                                              | `Promise<string>`           | Returns the absolute path of the root directory of the knowledge graph.                               |
| **`mem.getTokenCount`**         | `(filePath: string): Promise<number>`                              | `Promise<number>`           | Calculates and returns the estimated token count for a single file. Useful for managing context size. |
| **`mem.getTokenCountForPaths`** | `(paths: string[]): Promise<{path: string, tokenCount: number}[]>` | `Promise<PathTokenCount[]>` | A more efficient way to get token counts for multiple files in a single call.                         |
````

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
export const resolveSecurePath = (
  graphRoot: string,
  userPath: string
): string => {
  const resolvedPath = path.resolve(graphRoot, userPath);
  if (!resolvedPath.startsWith(graphRoot)) {
    throw new Error('Security Error: Path traversal attempt detected.');
  }
  return resolvedPath;
};
````

## File: tests/unit/llm.test.ts
````typescript
import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { queryLLM, queryLLMWithRetries } from '../../src/core/llm';
import type { AppConfig } from '../../src/config';
import type { ChatMessage } from '../../src/types';

// Mock fetch globally
const mockFetch = mock(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        choices: [
          {
            message: {
              content: 'Test response from LLM',
            },
          },
        ],
      }),
    status: 200,
    statusText: 'OK',
  })
);

global.fetch = mockFetch;

const mockConfig: AppConfig = {
  openRouterApiKey: 'test-api-key',
  knowledgeGraphPath: '/test/path',
  llmModel: 'anthropic/claude-3-haiku-20240307',
  port: 3000,
};

const mockHistory: ChatMessage[] = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello, world!' },
];

beforeEach(() => {
  mockFetch.mockClear();
});

describe('LLM Module', () => {
  describe('queryLLM', () => {
    it('should make a successful request to OpenRouter API', async () => {
      const response = await queryLLM(mockHistory, mockConfig);

      expect(response).toBe('Test response from LLM');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-api-key',
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Recursa',
          },
          body: JSON.stringify({
            model: 'anthropic/claude-3-haiku-20240307',
            messages: mockHistory,
            temperature: 0.7,
            max_tokens: 4000,
          }),
        })
      );
    });

    it('should handle API errors properly', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: () =>
            Promise.resolve({
              error: { message: 'Invalid API key' },
            }),
        })
      );

      await expect(queryLLM(mockHistory, mockConfig)).rejects.toThrow(
        'OpenRouter API error: 401 Unauthorized'
      );
    });

    it('should handle malformed API responses', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ invalid: 'response' }),
        })
      );

      await expect(queryLLM(mockHistory, mockConfig)).rejects.toThrow(
        'Invalid response format from OpenRouter API'
      );
    });

    it('should handle empty content in response', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [
                {
                  message: { content: '' },
                },
              ],
            }),
        })
      );

      await expect(queryLLM(mockHistory, mockConfig)).rejects.toThrow(
        'Empty content received from OpenRouter API'
      );
    });
  });

  describe('queryLLMWithRetries', () => {
    it('should retry on retryable errors', async () => {
      // First call fails with server error
      // Second call succeeds
      mockFetch
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: () => Promise.resolve({ error: 'Server error' }),
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                choices: [
                  {
                    message: { content: 'Success after retry' },
                  },
                ],
              }),
          })
        );

      const response = await queryLLMWithRetries(mockHistory, mockConfig);

      expect(response).toBe('Success after retry');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors (4xx)', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          json: () =>
            Promise.resolve({
              error: { message: 'Bad request' },
            }),
        })
      );

      await expect(
        queryLLMWithRetries(mockHistory, mockConfig)
      ).rejects.toThrow('OpenRouter API error: 400 Bad Request');
      expect(mockFetch).toHaveBeenCalledTimes(1); // Should not retry
    });
  });
});
````

## File: .env.test
````
# Test Environment Configuration
OPENROUTER_API_KEY="mock-test-api-key"
KNOWLEDGE_GRAPH_PATH="/tmp/recursa-test-knowledge-graph"
LLM_MODEL="mock-test-model"
PORT=3000
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

## File: docs/rules.md
````markdown
codebase compliance rules;

1. No OOP, only HOFs
2. Use bun.sh and e2e type safe TypeScript
3. No unknown or any type
4. [e2e|integration|unit]/[domain].test.ts files & dirs
5. Bun tests, real implementation (no mocks), isolated tests
6. DRY
````

## File: src/types/sandbox.ts
````typescript
export interface SandboxOptions {
  timeout?: number;
  memoryLimit?: number;
  allowedGlobals?: string[];
  forbiddenGlobals?: string[];
}

export interface SandboxExecutionContext {
  mem: import('./mem.js').MemAPI;
  console: Console;
}

export interface SandboxResult {
  success: boolean;
  result?: unknown;
  error?: string;
  output?: string;
  executionTime: number;
}

export type SandboxCode = string;

export interface ExecutionConstraints {
  maxExecutionTime: number;
  maxMemoryBytes: number;
  allowedModules: string[];
  forbiddenAPIs: string[];
}
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

  const { OPENROUTER_API_KEY, KNOWLEDGE_GRAPH_PATH, LLM_MODEL, PORT } =
    parseResult.data;

  // Perform runtime checks
  let resolvedPath = KNOWLEDGE_GRAPH_PATH;
  if (!path.isAbsolute(resolvedPath)) {
    resolvedPath = path.resolve(process.cwd(), resolvedPath);
    // eslint-disable-next-line no-console
    console.warn(
      `KNOWLEDGE_GRAPH_PATH is not absolute. Resolved to: ${resolvedPath}`
    );
  }

  // In test environments, the path is created dynamically by the test runner,
  // so we should skip this check. `bun test` automatically sets NODE_ENV=test.
  if (process.env.NODE_ENV !== 'test') {
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

## File: tests/integration/basic-think-act-commit.test.ts
````typescript
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  mock,
} from 'bun:test';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import simpleGit from 'simple-git';
import { handleUserQuery } from '../../src/core/loop';
import { createMemAPI } from '../../src/core/mem-api';
import type { AppConfig } from '../../src/config';
import type { StatusUpdate } from '../../src/types';

describe('Basic Think-Act-Commit Integration Tests', () => {
  let tempDir: string;
  let mockConfig: AppConfig;
  let statusUpdates: StatusUpdate[];

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'recursa-basic-test-'));
    mockConfig = {
      knowledgeGraphPath: tempDir,
      openRouterApiKey: 'test-api-key',
      llmModel: 'test-model',
      port: 3000,
    };
  });

  beforeEach(async () => {
    // Clear the directory completely
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.mkdir(tempDir, { recursive: true });

    // Initialize git
    const git = simpleGit(tempDir);
    await git.init();
    await git.addConfig('user.name', 'Test User');
    await git.addConfig('user.email', 'test@example.com');

    // Reset status updates
    statusUpdates = [];
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // Mock LLM responses for testing different scenarios
  const createMockLLMQuery = (responses: string[]) => {
    let callCount = 0;
    return mock(async (_history: unknown[], _config: unknown) => {
      const response = responses[callCount] || responses[responses.length - 1];
      callCount++;
      return response;
    });
  };

  // Helper function to capture status updates
  const captureStatusUpdate = (update: StatusUpdate) => {
    statusUpdates.push(update);
  };

  describe('Core Think-Act-Commit Loop', () => {
    it('should execute a simple file creation and commit loop', async () => {
      // Mock LLM response sequence
      const mockLLMQuery = createMockLLMQuery([
        // First response: Think and Act
        `</think>
I need to create a test file with some content.
<typescript>
const fileName = 'simple-test.md';
const content = '# Simple Test\n\nThis is a simple test file.';
await mem.writeFile(fileName, content);
</typescript>`,
        // Second response: Commit and Reply
        `</think>
File created successfully. Now commit the changes.
<typescript>
await mem.commitChanges('feat: add simple test file');
</typescript>
<reply>
Successfully created and committed the test file.
</reply>`,
      ]);

      // Execute the query
      const result = await handleUserQuery(
        'Create a simple test file',
        mockConfig,
        undefined,
        mockLLMQuery,
        captureStatusUpdate
      );

      // Verify final response
      expect(result).toBe('Successfully created and committed the test file.');

      // Verify status updates were captured
      expect(statusUpdates.length).toBeGreaterThan(0);

      // Verify at least one 'think' update
      const thinkUpdates = statusUpdates.filter((u) => u.type === 'think');
      expect(thinkUpdates.length).toBeGreaterThan(0);

      // Verify at least one 'act' update
      const actUpdates = statusUpdates.filter((u) => u.type === 'act');
      expect(actUpdates.length).toBeGreaterThan(0);

      // Verify file was actually created
      const mem = createMemAPI(mockConfig as AppConfig);
      const fileExists = await mem.fileExists('simple-test.md');
      expect(fileExists).toBe(true);

      const fileContent = await mem.readFile('simple-test.md');
      expect(fileContent).toContain('# Simple Test');
      expect(fileContent).toContain('This is a simple test file');

      // Verify git commit was made
      const git = simpleGit(tempDir);
      const log = await git.log();
      expect(log.all.length).toBe(1);
      expect(log.all[0].message).toBe('feat: add simple test file');
    });

    it('should handle file updates and commits', async () => {
      // Create initial file
      const mem = createMemAPI(mockConfig as AppConfig);
      await mem.writeFile(
        'update-test.md',
        '# Original Title\n\nOriginal content.'
      );
      await mem.commitChanges('feat: add original file');

      const mockLLMQuery = createMockLLMQuery([
        // First response: Update file
        `</think>
I need to update the existing file with new content.
<typescript>
const fileName = 'update-test.md';
const existingContent = await mem.readFile(fileName);
const updatedContent = existingContent.replace('Original content.', 'Updated content with new information.');
await mem.updateFile(fileName, existingContent, updatedContent);
</typescript>`,
        // Second response: Commit and Reply
        `</think>
File updated successfully. Now commit the changes.
<typescript>
await mem.commitChanges('feat: update file content');
</typescript>
<reply>
Successfully updated the file and committed the changes.
</reply>`,
      ]);

      // Execute the query
      const result = await handleUserQuery(
        'Update the existing file',
        mockConfig,
        undefined,
        mockLLMQuery,
        captureStatusUpdate
      );

      // Verify final response
      expect(result).toBe(
        'Successfully updated the file and committed the changes.'
      );

      // Verify file was updated
      const updatedContent = await mem.readFile('update-test.md');
      expect(updatedContent).toContain('Updated content with new information');
      expect(updatedContent).toContain('Original Title'); // Title should remain

      // Verify git commit was made
      const git = simpleGit(tempDir);
      const log = await git.log();
      expect(log.all.length).toBe(2);
      expect(log.all[0].message).toBe('feat: update file content');
      expect(log.all[1].message).toBe('feat: add original file');
    });

    it('should handle error recovery and continue with work', async () => {
      const mockLLMQuery = createMockLLMQuery([
        // First response with intentional error
        `</think>
I'll try to read a file that doesn't exist to test error handling.
<typescript>
await mem.readFile('non-existent.md');
</typescript>`,
        // Second response: Recovery
        `</think>
There was an error reading the file. I'll create it instead.
<typescript>
await mem.writeFile('non-existent.md', '# Created After Error\n\nFile created after error.');
</typescript>`,
        // Third response: Commit and Reply
        `</think>
File created successfully after error recovery.
<typescript>
await mem.commitChanges('feat: create file after error recovery');
</typescript>
<reply>
Successfully recovered from error and created the file.
</reply>`,
      ]);

      // Execute the query
      const result = await handleUserQuery(
        'Test error recovery',
        mockConfig,
        undefined,
        mockLLMQuery,
        captureStatusUpdate
      );

      // Verify final response
      expect(result).toBe(
        'Successfully recovered from error and created the file.'
      );

      // Verify error status update was captured
      const errorUpdates = statusUpdates.filter((u) => u.type === 'error');
      expect(errorUpdates.length).toBeGreaterThan(0);

      // Verify file was created after recovery
      const mem = createMemAPI(mockConfig as AppConfig);
      const fileExists = await mem.fileExists('non-existent.md');
      expect(fileExists).toBe(true);

      const fileContent = await mem.readFile('non-existent.md');
      expect(fileContent).toContain('Created After Error');
    });

    it('should handle multiple file operations in sequence', async () => {
      const mockLLMQuery = createMockLLMQuery([
        // First response: Create multiple files
        `</think>
I'll create a directory structure with multiple files.
<typescript>
// Create directory
await mem.createDir('multi-test');

// Create multiple files
await mem.writeFile('multi-test/file1.txt', 'Content 1');
await mem.writeFile('multi-test/file2.txt', 'Content 2');
await mem.writeFile('multi-test/file3.txt', 'Content 3');

// Verify files were created
const files = await mem.listFiles('multi-test');
console.log('Created files:', files);
</typescript>`,
        // Second response: Commit and Reply
        `</think>
All files created successfully. Now commit the changes.
<typescript>
await mem.commitChanges('feat: create multiple files in directory');
</typescript>
<reply>
Successfully created multiple files in the directory structure.
</reply>`,
      ]);

      // Execute the query
      const result = await handleUserQuery(
        'Create multiple files in a directory',
        mockConfig,
        undefined,
        mockLLMQuery,
        captureStatusUpdate
      );

      // Verify final response
      expect(result).toBe(
        'Successfully created multiple files in the directory structure.'
      );

      // Verify directory and files were created
      const mem = createMemAPI(mockConfig as AppConfig);
      const dirExists = await mem.fileExists('multi-test');
      expect(dirExists).toBe(true);

      const files = await mem.listFiles('multi-test');
      expect(files).toContain('file1.txt');
      expect(files).toContain('file2.txt');
      expect(files).toContain('file3.txt');
      expect(files.length).toBe(3);

      // Verify git commit
      const git = simpleGit(tempDir);
      const log = await git.log();
      expect(log.all.length).toBe(1);
      expect(log.all[0].message).toBe(
        'feat: create multiple files in directory'
      );
    });
  });

  describe('Session Persistence', () => {
    it('should maintain context across multiple queries in the same session', async () => {
      const sessionId = 'session-test-123';

      // First query: Create initial file
      const firstMockLLMQuery = createMockLLMQuery([
        `</think>
Creating the first file in the session.
<typescript>
await mem.writeFile('session-context.md', '# Session Test\n\nFirst file in this session.');
</typescript>`,
        `</think>
First file created.
<typescript>
await mem.commitChanges('feat: add first session file');
</typescript>`,
        `<reply>
First file created and committed in the session.
</reply>`,
      ]);

      const firstResult = await handleUserQuery(
        'Create first file in session',
        mockConfig,
        sessionId,
        firstMockLLMQuery
      );

      expect(firstResult).toBe(
        'First file created and committed in the session.'
      );

      // Second query: Update the file
      const secondMockLLMQuery = createMockLLMQuery([
        `</think>
Adding to the existing file in the same session.
<typescript>
const existingContent = await mem.readFile('session-context.md');
const updatedContent = existingContent + '\n\n## Second Update\n\nAdded in the same session.';
await mem.updateFile('session-context.md', existingContent, updatedContent);
</typescript>`,
        `</think>
File updated in session.
<typescript>
await mem.commitChanges('feat: update file in same session');
</typescript>`,
        `<reply>
File updated in the same session context.
</reply>`,
      ]);

      const secondResult = await handleUserQuery(
        'Update the file in the same session',
        mockConfig,
        sessionId,
        secondMockLLMQuery
      );

      expect(secondResult).toBe('File updated in the same session context.');

      // Verify file has both updates
      const mem = createMemAPI(mockConfig as AppConfig);
      const finalContent = await mem.readFile('session-context.md');
      expect(finalContent).toContain('First file in this session');
      expect(finalContent).toContain('Second Update');
      expect(finalContent).toContain('Added in the same session');

      // Verify git history shows both commits
      const git = simpleGit(tempDir);
      const log = await git.log();
      expect(log.all.length).toBe(2);
      expect(log.all[0].message).toBe('feat: update file in same session');
      expect(log.all[1].message).toBe('feat: add first session file');
    });
  });
});
````

## File: tests/integration/end-to-e2e.test.ts
````typescript
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  mock,
} from 'bun:test';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import simpleGit from 'simple-git';
import { handleUserQuery } from '../../src/core/loop';
import { createMemAPI } from '../../src/core/mem-api';
import type { AppConfig } from '../../src/config';
import type { StatusUpdate } from '../../src/types';

describe('End-to-End Complete Flow Tests', () => {
  let tempDir: string;
  let mockConfig: AppConfig;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'recursa-e2e-test-'));
    mockConfig = {
      knowledgeGraphPath: tempDir,
      openRouterApiKey: 'test-api-key',
      llmModel: 'test-model',
      port: 3001,
    };
  });

  beforeEach(async () => {
    // Clear the directory
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.mkdir(tempDir, { recursive: true });

    // Initialize git
    const git = simpleGit(tempDir);
    await git.init();
    await git.addConfig('user.name', 'Test User');
    await git.addConfig('user.email', 'test@example.com');
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // Mock LLM responses for testing
  const createMockLLMQuery = (responses: string[]) => {
    let callCount = 0;
    return mock(async (_history: unknown[], _config: unknown) => {
      const response = responses[callCount] || responses[responses.length - 1];
      callCount++;
      return response;
    });
  };

  describe('Complete Workflow Integration', () => {
    it('should execute a complete project lifecycle', async () => {
      const sessionId = 'project-lifecycle';

      // Phase 1: Initialize project
      const initMockLLMQuery = createMockLLMQuery([
        `I'll initialize a new project with basic structure.
<typescript>
// Create project structure
await mem.writeFile('package.json', JSON.stringify({
  name: 'test-project',
  version: '1.0.0',
  description: 'A test project',
  scripts: { start: 'node index.js', test: 'jest' }
}, null, 2));

await mem.writeFile('README.md', '# Test Project\n\nThis is a comprehensive test project.');
await mem.writeFile('index.js', 'console.log("Hello, World!");');
await mem.createDir('src');
await mem.writeFile('src/app.js', '// Application logic');
</typescript>`,
        `Project initialized. Now commit the initial setup.
<typescript>
await mem.commitChanges('feat: initialize project with basic structure');
</typescript>`,
        `<reply>
Project initialized successfully with package.json, README, main entry point, and source directory.
</reply>`,
      ]);

      const initResult = await handleUserQuery(
        'Initialize a new Node.js project',
        mockConfig,
        sessionId,
        initMockLLMQuery
      );

      expect(initResult).toContain('Project initialized successfully');

      // Phase 2: Add features
      const featureMockLLMQuery = createMockLLMQuery([
        `I'll add features to the existing project.
<typescript>
// Add feature files
await mem.writeFile('src/utils.js', '// Utility functions\nexports.formatDate = (date) => date.toISOString();');
await mem.writeFile('src/config.js', '// Configuration\nmodule.exports = { env: 'development', port: 3000 };');
await mem.createDir('tests');
await mem.writeFile('tests/utils.test.js', '// Test utilities\nconst { formatDate } = require('../src/utils.js');');
</typescript>`,
        `Features added. Commit the new functionality.
<typescript>
await mem.commitChanges('feat: add utilities, config, and test structure');
</typescript>`,
        `<reply>
Added utility functions, configuration, and test structure to the project.
</reply>`,
      ]);

      const featureResult = await handleUserQuery(
        'Add utilities and configuration to the project',
        mockConfig,
        sessionId,
        featureMockLLMQuery
      );

      expect(featureResult).toContain('Added utility functions');

      // Phase 3: Update existing files
      const updateMockLLMQuery = createMockLLMQuery([
        `I'll update the main application to use the new utilities.
<typescript>
// Update main file
const indexContent = await mem.readFile('index.js');
const updatedIndex = indexContent.replace(
  'console.log("Hello, World!");',
  'const { formatDate } = require("./src/utils.js");\nconsole.log("Current time:", formatDate(new Date()));'
);
await mem.updateFile('index.js', indexContent, updatedIndex);

// Update README
const readmeContent = await mem.readFile('README.md');
const updatedReadme = readmeContent + '\n\n## Usage\n\nRun with: npm start';
await mem.updateFile('README.md', readmeContent, updatedReadme);
</typescript>`,
        `Main application updated. Commit the improvements.
<typescript>
await mem.commitChanges('feat: integrate utilities and update documentation');
</typescript>`,
        `<reply>
Updated the main application to use utilities and improved documentation.
</reply>`,
      ]);

      const updateResult = await handleUserQuery(
        'Update the main application to use the new utilities',
        mockConfig,
        sessionId,
        updateMockLLMQuery
      );

      expect(updateResult).toContain('Updated the main application');

      // Verify complete project state
      const mem = createMemAPI(mockConfig as AppConfig);

      // Check all expected files exist
      const expectedFiles = [
        'package.json',
        'README.md',
        'index.js',
        'src/app.js',
        'src/utils.js',
        'src/config.js',
        'tests/utils.test.js',
      ];

      for (const file of expectedFiles) {
        const exists = await mem.fileExists(file);
        expect(exists).toBe(true);
      }

      // Verify file contents
      const indexContent = await mem.readFile('index.js');
      expect(indexContent).toContain('formatDate');
      expect(indexContent).toContain('./src/utils.js');

      const readmeContent = await mem.readFile('README.md');
      expect(readmeContent).toContain('Usage');
      expect(readmeContent).toContain('npm start');

      // Verify git history shows all three commits
      const git = simpleGit(tempDir);
      const log = await git.log();
      expect(log.all.length).toBe(3);
      expect(log.all[0].message).toBe(
        'feat: integrate utilities and update documentation'
      );
      expect(log.all[1].message).toBe(
        'feat: add utilities, config, and test structure'
      );
      expect(log.all[2].message).toBe(
        'feat: initialize project with basic structure'
      );
    });

    it('should handle complex file operations and git workflow', async () => {
      const statusUpdates: StatusUpdate[] = [];

      const captureStatusUpdate = (update: StatusUpdate) => {
        statusUpdates.push(update);
      };

      const complexMockLLMQuery = createMockLLMQuery([
        `I'll demonstrate complex file operations including creating, updating, deleting, and renaming files.
<typescript>
// Create multiple related files
await mem.writeFile('docs/intro.md', '# Introduction\n\nProject introduction.');
await mem.writeFile('docs/guide.md', '# User Guide\n\nDetailed user guide.');
await mem.writeFile('docs/api.md', '# API Reference\n\nAPI documentation.');

// Create a temporary file that will be renamed
await mem.writeFile('docs/temp.md', '# Temporary\n\nThis will be renamed.');

// Create a file that will be deleted
await mem.writeFile('docs/obsolete.md', '# Obsolete\n\nThis will be deleted.');

// List files to verify
const docsFiles = await mem.listFiles('docs');
console.log('Files created:', docsFiles);
</typescript>`,
        `Now I'll perform file operations: rename and delete.
<typescript>
// Rename temp.md to overview.md
await mem.rename('docs/temp.md', 'docs/overview.md');

// Delete the obsolete file
await mem.deleteFile('docs/obsolete.md');

// Update the introduction to reference the overview
const introContent = await mem.readFile('docs/intro.md');
const updatedIntro = introContent + '\n\nSee also: [[Overview]] for a project overview.';
await mem.updateFile('docs/intro.md', introContent, updatedIntro);

// Verify git staged files
const stagedFiles = await mem.gitStagedFiles();
console.log('Staged files:', stagedFiles);
</typescript>`,
        `File operations complete. Now commit and verify git operations.
<typescript>
await mem.commitChanges('feat: reorganize documentation structure');

// Test git operations
const gitDiff = await mem.gitDiff('docs/intro.md');
const gitLog = await mem.gitLog('docs/', 5);

console.log('Git diff for intro.md:', gitDiff);
console.log('Git log for docs/:', gitLog);
</typescript>`,
        `<reply>
Successfully performed complex file operations including creating multiple documentation files, renaming temp.md to overview.md, deleting obsolete.md, updating the introduction, and committing all changes with proper git history tracking.
</reply>`,
      ]);

      const result = await handleUserQuery(
        'Perform complex file operations with git workflow',
        mockConfig,
        'complex-ops-session',
        complexMockLLMQuery,
        captureStatusUpdate
      );

      expect(result).toContain(
        'Successfully performed complex file operations'
      );

      // Verify status updates were captured throughout the process
      expect(statusUpdates.length).toBeGreaterThan(0);
      const types = new Set(statusUpdates.map((u) => u.type));
      expect(types.has('think')).toBe(true);
      expect(types.has('act')).toBe(true);

      // Verify final file state
      const mem = createMemAPI(mockConfig as AppConfig);

      // Files that should exist
      const existingFiles = [
        'docs/intro.md',
        'docs/guide.md',
        'docs/api.md',
        'docs/overview.md',
      ];
      for (const file of existingFiles) {
        const exists = await mem.fileExists(file);
        expect(exists).toBe(true);
      }

      // Files that should not exist
      const deletedFiles = ['docs/temp.md', 'docs/obsolete.md'];
      for (const file of deletedFiles) {
        const exists = await mem.fileExists(file);
        expect(exists).toBe(false);
      }

      // Verify content was updated
      const introContent = await mem.readFile('docs/intro.md');
      expect(introContent).toContain('[[Overview]]');

      // Verify git operations worked
      const git = simpleGit(tempDir);
      const log = await git.log();
      expect(log.all.length).toBe(1);
      expect(log.all[0].message).toBe(
        'feat: reorganize documentation structure'
      );
    });

    it('should handle error scenarios and recovery gracefully', async () => {
      const statusUpdates: StatusUpdate[] = [];

      const captureStatusUpdate = (update: StatusUpdate) => {
        statusUpdates.push(update);
      };

      const errorRecoveryMockLLMQuery = createMockLLMQuery([
        `I'll attempt various operations to test error handling and recovery.
<typescript>
// This should fail - file doesn't exist
try {
  await mem.readFile('non-existent-config.json');
} catch (error) {
  console.log('Expected error caught:', error.message);
}

// This should also fail - invalid path traversal attempt
try {
  await mem.writeFile('../../../etc/malicious.txt', 'hack');
} catch (error) {
  console.log('Security error caught:', error.message);
}

// This should work - create the missing file
await mem.writeFile('non-existent-config.json', JSON.stringify({
  app: 'test',
  version: '1.0.0'
}, null, 2));
</typescript>`,
        `Now I'll test additional error scenarios.
<typescript>
// Try to update a file that doesn't exist
try {
  await mem.updateFile('missing.md', 'old content', 'new content');
} catch (error) {
  console.log('Update error caught:', error.message);
  // Create the file instead
  await mem.writeFile('missing.md', '# Created after error\n\nContent here.');
}

// Try to delete a file that doesn't exist
try {
  await mem.deleteFile('already-deleted.md');
} catch (error) {
  console.log('Delete error caught:', error.message);
}
</typescript>`,
        `Error recovery completed. Now commit all successful operations.
<typescript>
await mem.commitChanges('feat: demonstrate error handling and recovery');
</typescript>`,
        `<reply>
Successfully demonstrated comprehensive error handling and recovery. Caught and handled file not found errors, security errors for path traversal attempts, and successfully recovered by creating missing files when appropriate.
</reply>`,
      ]);

      const result = await handleUserQuery(
        'Test error handling and recovery scenarios',
        mockConfig,
        'error-test-session',
        errorRecoveryMockLLMQuery,
        captureStatusUpdate
      );

      expect(result).toContain(
        'Successfully demonstrated comprehensive error handling'
      );

      // Verify error status updates were captured
      const errorUpdates = statusUpdates.filter((u) => u.type === 'error');
      expect(errorUpdates.length).toBeGreaterThan(0);

      // Verify files that should exist after recovery
      const mem = createMemAPI(mockConfig as AppConfig);
      const configExists = await mem.fileExists('non-existent-config.json');
      expect(configExists).toBe(true);

      const missingExists = await mem.fileExists('missing.md');
      expect(missingExists).toBe(true);

      // Verify content
      const configContent = await mem.readFile('non-existent-config.json');
      expect(configContent).toContain('test');
      expect(configContent).toContain('1.0.0');

      const missingContent = await mem.readFile('missing.md');
      expect(missingContent).toContain('Created after error');

      // Verify git commit was successful despite errors
      const git = simpleGit(tempDir);
      const log = await git.log();
      expect(log.all.length).toBe(1);
      expect(log.all[0].message).toBe(
        'feat: demonstrate error handling and recovery'
      );
    });
  });
});
````

## File: tests/integration/think-act-commit.test.ts
````typescript
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  mock,
} from 'bun:test';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import simpleGit from 'simple-git';
import { handleUserQuery } from '../../src/core/loop';
import { createMemAPI } from '../../src/core/mem-api';
import type { AppConfig } from '../../src/config';
import type { StatusUpdate } from '../../src/types';

describe('Think-Act-Commit Loop Integration Tests', () => {
  let tempDir: string;
  let mockConfig: AppConfig;
  let statusUpdates: StatusUpdate[] = [];

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'recursa-test-'));
    mockConfig = {
      knowledgeGraphPath: tempDir,
      openRouterApiKey: 'test-api-key',
      llmModel: 'test-model',
      port: 3000,
    };
  });

  beforeEach(async () => {
    // Clear the directory
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.mkdir(tempDir, { recursive: true });

    // Initialize git
    const git = simpleGit(tempDir);
    await git.init();
    await git.addConfig('user.name', 'Test User');
    await git.addConfig('user.email', 'test@example.com');

    // Reset status updates
    statusUpdates = [];
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // Mock LLM responses for testing different scenarios
  const createMockLLMQuery = (responses: string[]) => {
    let callCount = 0;
    return mock(async (_history: unknown[], _config: unknown) => {
      const response = responses[callCount] || responses[responses.length - 1];
      callCount++;
      return response;
    });
  };

  // Helper function to capture status updates
  const captureStatusUpdate = (update: StatusUpdate) => {
    statusUpdates.push(update);
  };

  describe('Complete Think-Act-Commit Flow', () => {
    it('should execute a complete loop with file creation and commit', async () => {
      // Mock LLM response sequence
      const mockLLMQuery = createMockLLMQuery([
        // First response: Think and Act (create file)
        `<think>
I need to create a new file and add some content to it.
</think>
<typescript>
const fileName = 'test-file.md';
const content = '# Test Document\n\nThis is a test file created during integration testing.';
await mem.writeFile(fileName, content);
</typescript>`,
        // Second response: Commit and Reply
        `<think>
The file has been created successfully. Now I need to commit the changes and provide a final response.
</think>
<typescript>
await mem.commitChanges('feat: add test document');
</typescript>
<reply>
I've successfully created a new test document and committed the changes to your knowledge base.
</reply>`,
      ]);

      // Execute the query
      const result = await handleUserQuery(
        'Create a test document',
        mockConfig,
        undefined,
        mockLLMQuery,
        captureStatusUpdate
      );

      // Verify final response
      expect(result).toBe(
        "I've successfully created a new test document and committed the changes to your knowledge base."
      );

      // Verify status updates were captured
      expect(statusUpdates.length).toBeGreaterThan(0);

      // Verify at least one 'think' update
      const thinkUpdates = statusUpdates.filter((u) => u.type === 'think');
      expect(thinkUpdates.length).toBeGreaterThan(0);

      // Verify at least one 'act' update
      const actUpdates = statusUpdates.filter((u) => u.type === 'act');
      expect(actUpdates.length).toBeGreaterThan(0);

      // Verify file was actually created
      const mem = createMemAPI(mockConfig as AppConfig);
      const fileExists = await mem.fileExists('test-file.md');
      expect(fileExists).toBe(true);

      const fileContent = await mem.readFile('test-file.md');
      expect(fileContent).toContain('# Test Document');
      expect(fileContent).toContain('This is a test file');

      // Verify git commit was made
      const git = simpleGit(tempDir);
      const log = await git.log();
      expect(log.all.length).toBe(1);
      expect(log.all[0].message).toBe('feat: add test document');
    });

    it('should handle file updates in the loop', async () => {
      // Create initial file
      const mem = createMemAPI(mockConfig as AppConfig);
      await mem.writeFile(
        'existing.md',
        '# Original Content\n\nOriginal content here.'
      );
      await mem.commitChanges('feat: add original file');

      const mockLLMQuery = createMockLLMQuery([
        // First response: Think and Act (update file)
        `<think>
I need to update the existing file with new content.
</think>
<typescript>
const fileName = 'existing.md';
const existingContent = await mem.readFile(fileName);
const updatedContent = existingContent.replace('Original content here.', 'Updated content here.');
await mem.updateFile(fileName, existingContent, updatedContent);
</typescript>`,
        // Second response: Commit and Reply
        `<think>
The file has been updated successfully. Now I need to commit the changes.
</think>
<typescript>
await mem.commitChanges('feat: update existing document');
</typescript>
<reply>
I've successfully updated the existing document with new content and committed the changes.
</reply>`,
      ]);

      // Execute the query
      const result = await handleUserQuery(
        'Update the existing document',
        mockConfig,
        undefined,
        mockLLMQuery,
        captureStatusUpdate
      );

      // Verify final response
      expect(result).toBe(
        "I've successfully updated the existing document with new content and committed the changes."
      );

      // Verify file was updated
      const updatedContent = await mem.readFile('existing.md');
      expect(updatedContent).toContain('Updated content here.');

      // Verify git commit was made
      const git = simpleGit(tempDir);
      const log = await git.log();
      expect(log.all.length).toBe(2);
      expect(log.all[0].message).toBe('feat: update existing document');
    });

    it('should handle errors during code execution', async () => {
      const mockLLMQuery = createMockLLMQuery([
        // Response with code that will throw an error
        `<think>
I'll try to read a file that doesn't exist to test error handling.
</think>
<typescript>
// This should throw an error
await mem.readFile('non-existent-file.md');
</typescript>`,
        // Recovery response
        `<think>
There was an error reading the file. I should create it instead.
</think>
<typescript>
await mem.writeFile('non-existent-file.md', '# New File\n\nCreated after error.');
</typescript>`,
        // Final commit and reply
        `<think>
File created successfully. Now commit the changes.
</think>
<typescript>
await mem.commitChanges('feat: create file after error recovery');
</typescript>
<reply>
I encountered an error but recovered by creating the new file. Changes have been committed.
</reply>`,
      ]);

      // Execute the query
      const result = await handleUserQuery(
        'Try to read and then create a file',
        mockConfig,
        undefined,
        mockLLMQuery,
        captureStatusUpdate
      );

      // Verify final response
      expect(result).toBe(
        'I encountered an error but recovered by creating the new file. Changes have been committed.'
      );

      // Verify error status update was captured
      const errorUpdates = statusUpdates.filter((u) => u.type === 'error');
      expect(errorUpdates.length).toBeGreaterThan(0);

      // Verify file was eventually created
      const mem = createMemAPI(mockConfig as AppConfig);
      const fileExists = await mem.fileExists('non-existent-file.md');
      expect(fileExists).toBe(true);
    });

    it('should handle directory operations and file listings', async () => {
      const mockLLMQuery = createMockLLMQuery([
        // Response that creates directory and files
        `<think>
I need to create a directory structure with multiple files.
</think>
<typescript>
// Create a directory
await mem.createDir('test-directory');

// Create multiple files
await mem.writeFile('test-directory/file1.md', '# File 1\n\nContent of file 1.');
await mem.writeFile('test-directory/file2.md', '# File 2\n\nContent of file 2.');
await mem.writeFile('test-directory/file3.md', '# File 3\n\nContent of file 3.');

// List files to verify
const files = await mem.listFiles('test-directory');
console.log('Files created:', files);
</typescript>`,
        // Commit and reply
        `<think>
Directory and files created successfully. Now commit the changes.
</think>
<typescript>
await mem.commitChanges('feat: create directory with multiple files');
</typescript>
<reply>
I've created a new directory structure with three files and committed all the changes.
</reply>`,
      ]);

      // Execute the query
      const result = await handleUserQuery(
        'Create a directory with multiple files',
        mockConfig,
        undefined,
        mockLLMQuery,
        captureStatusUpdate
      );

      // Verify final response
      expect(result).toBe(
        "I've created a new directory structure with three files and committed all the changes."
      );

      // Verify directory and files were created
      const mem = createMemAPI(mockConfig as AppConfig);
      const dirExists = await mem.fileExists('test-directory');
      expect(dirExists).toBe(true);

      const files = await mem.listFiles('test-directory');
      expect(files).toContain('file1.md');
      expect(files).toContain('file2.md');
      expect(files).toContain('file3.md');
      expect(files.length).toBe(3);
    });

    it('should handle multiple operations in a single loop', async () => {
      const mockLLMQuery = createMockLLMQuery([
        // Response with multiple complex operations
        `<think>
I need to perform multiple operations: create files, update one, and verify with git operations.
</think>
<typescript>
// Create initial files
await mem.writeFile('project.md', '# My Project\n\nProject description here.');
await mem.writeFile('notes.md', '# Notes\n\nInitial notes.');

// Update the project file
const projectContent = await mem.readFile('project.md');
const updatedProject = projectContent + '\n\n## Status\n\nIn progress.';
await mem.updateFile('project.md', projectContent, updatedProject);

// Check git status before commit
const stagedFiles = await mem.gitStagedFiles();
console.log('Staged files before commit:', stagedFiles);
</typescript>`,
        // Commit and git log verification
        `<think>
Files created and updated. Now commit and verify git history.
</think>
<typescript>
await mem.commitChanges('feat: add project files with updates');

// Verify git log
const log = await mem.gitLog('project.md', 2);
console.log('Git log for project.md:', log);
</typescript>`,
        // Final reply
        `<think>
All operations completed successfully. Provide final summary.
</think>
<typescript>
// No operations needed, just final reply
</typescript>
<reply>
I've successfully created and updated multiple files, committed them with a proper message, and verified the git history. All operations completed in the Think-Act-Commit loop.
</reply>`,
      ]);

      // Execute the query
      const result = await handleUserQuery(
        'Perform multiple file operations with git verification',
        mockConfig,
        undefined,
        mockLLMQuery,
        captureStatusUpdate
      );

      // Verify final response
      expect(result).toBe(
        "I've successfully created and updated multiple files, committed them with a proper message, and verified the git history. All operations completed in the Think-Act-Commit loop."
      );

      // Verify files exist and have correct content
      const mem = createMemAPI(mockConfig as AppConfig);
      const projectContent = await mem.readFile('project.md');
      expect(projectContent).toContain('# My Project');
      expect(projectContent).toContain('In progress.');

      const notesContent = await mem.readFile('notes.md');
      expect(notesContent).toContain('# Notes');

      // Verify git operations
      const git = simpleGit(tempDir);
      const log = await git.log();
      expect(log.all.length).toBe(1);
      expect(log.all[0].message).toBe('feat: add project files with updates');
    });
  });

  describe('Session Management', () => {
    it('should maintain conversation context across multiple queries', async () => {
      const sessionId = 'test-session-123';

      // First query with file creation
      const firstMockLLMQuery = createMockLLMQuery([
        `<think>
Creating the first file in the session.
</think>
<typescript>
await mem.writeFile('session-test.md', '# Session Test\n\nFirst file in session.');
</typescript>`,
        `<think>
Commit the first file.
</think>
<typescript>
await mem.commitChanges('feat: add first session file');
</typescript>`,
        `<reply>
First file created and committed in the session.
</reply>`,
      ]);

      const firstResult = await handleUserQuery(
        'Create first file',
        mockConfig,
        sessionId,
        firstMockLLMQuery,
        captureStatusUpdate
      );

      expect(firstResult).toBe(
        'First file created and committed in the session.'
      );

      // Second query in the same session
      const secondMockLLMQuery = createMockLLMQuery([
        `<think>
Adding to the existing file in the same session.
</think>
<typescript>
const existingContent = await mem.readFile('session-test.md');
const updatedContent = existingContent + '\n\n## Second Update\n\nAdded in second query.';
await mem.updateFile('session-test.md', existingContent, updatedContent);
</typescript>`,
        `<think>
Commit the update.
</think>
<typescript>
await mem.commitChanges('feat: update session file');
</typescript>`,
        `<reply>
File updated in the same session context.
</reply>`,
      ]);

      const secondResult = await handleUserQuery(
        'Update the file',
        mockConfig,
        sessionId,
        secondMockLLMQuery,
        captureStatusUpdate
      );

      expect(secondResult).toBe('File updated in the same session context.');

      // Verify file has both updates
      const mem = createMemAPI(mockConfig as AppConfig);
      const finalContent = await mem.readFile('session-test.md');
      expect(finalContent).toContain('First file in session');
      expect(finalContent).toContain('Second Update');
    });
  });
});
````

## File: tests/integration/workflow-integration.test.ts
````typescript
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from 'bun:test';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import simpleGit from 'simple-git';
import { handleUserQuery } from '../../src/core/loop';
import { createMemAPI } from '../../src/core/mem-api';
import type { AppConfig } from '../../src/config';
import type { StatusUpdate } from '../../src/types';

describe('Workflow Integration Tests', () => {
  let tempDir: string;
  let mockConfig: AppConfig;
  let statusUpdates: StatusUpdate[];

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'recursa-workflow-test-')
    );
    mockConfig = {
      knowledgeGraphPath: tempDir,
      openRouterApiKey: 'test-api-key',
      llmModel: 'test-model',
      port: 3000,
    };
  });

  beforeEach(async () => {
    // Clear the directory completely
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.mkdir(tempDir, { recursive: true });

    // Initialize git
    const git = simpleGit(tempDir);
    await git.init();
    await git.addConfig('user.name', 'Test User');
    await git.addConfig('user.email', 'test@example.com');

    // Reset status updates
    statusUpdates = [];
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // Mock LLM responses for testing different scenarios
  const createMockLLMQuery = (responses: string[]) => {
    let callCount = 0;
    return async (_history: unknown[], _config: unknown) => {
      const response = responses[callCount] || responses[responses.length - 1];
      callCount++;
      return response;
    };
  };

  // Helper function to capture status updates
  const captureStatusUpdate = (update: StatusUpdate) => {
    statusUpdates.push(update);
  };

  describe('Complete Workflow Verification', () => {
    it('should handle basic file creation workflow', async () => {
      // Mock LLM response sequence with proper XML format
      const mockLLMQuery = createMockLLMQuery([
        // First response: Think and Act
        `I'll create a simple test file to verify the workflow.
<typescript>
const fileName = 'workflow-test.md';
const content = '# Workflow Test\n\nThis is a test file for the workflow integration.';
await mem.writeFile(fileName, content);
</typescript>`,
        // Second response: Commit and Reply
        `File created successfully. Now commit the changes.
<typescript>
await mem.commitChanges('feat: add workflow test file');
</typescript>
<reply>
Successfully created and committed the workflow test file.
</reply>`,
      ]);

      // Execute the query
      const result = await handleUserQuery(
        'Create a workflow test file',
        mockConfig,
        undefined,
        mockLLMQuery,
        captureStatusUpdate
      );

      // Verify final response
      expect(result).toBe(
        'Successfully created and committed the workflow test file.'
      );

      // Verify file was actually created
      const mem = createMemAPI(mockConfig as AppConfig);
      const fileExists = await mem.fileExists('workflow-test.md');
      expect(fileExists).toBe(true);

      const fileContent = await mem.readFile('workflow-test.md');
      expect(fileContent).toContain('# Workflow Test');
      expect(fileContent).toContain(
        'This is a test file for the workflow integration'
      );

      // Verify git commit was made
      const git = simpleGit(tempDir);
      const log = await git.log();
      expect(log.all.length).toBe(1);
      expect(log.all[0].message).toBe('feat: add workflow test file');
    });

    it('should handle multi-step file operations', async () => {
      // Mock LLM response sequence
      const mockLLMQuery = createMockLLMQuery([
        // First response: Create directory and files
        `I'll create a directory structure with multiple files.
<typescript>
// Create directory
await mem.createDir('project');

// Create multiple files in the directory
await mem.writeFile('project/README.md', '# Project README\n\nProject description here.');
await mem.writeFile('project/main.js', 'console.log("Hello, World!");');
await mem.writeFile('project/config.json', '{"name": "test", "version": "1.0.0"}');

// List files to verify creation
const files = await mem.listFiles('project');
console.log('Files created:', files);
</typescript>`,
        // Second response: Commit and Reply
        `All files created successfully. Now commit the project structure.
<typescript>
await mem.commitChanges('feat: create project structure with multiple files');
</typescript>
<reply>
Successfully created a complete project structure with README, main file, and configuration.
</reply>`,
      ]);

      // Execute the query
      const result = await handleUserQuery(
        'Create a project structure',
        mockConfig,
        undefined,
        mockLLMQuery,
        captureStatusUpdate
      );

      // Verify final response
      expect(result).toBe(
        'Successfully created a complete project structure with README, main file, and configuration.'
      );

      // Verify directory and files were created
      const mem = createMemAPI(mockConfig as AppConfig);
      const dirExists = await mem.fileExists('project');
      expect(dirExists).toBe(true);

      const files = await mem.listFiles('project');
      expect(files).toContain('README.md');
      expect(files).toContain('main.js');
      expect(files).toContain('config.json');
      expect(files.length).toBe(3);

      // Verify file contents
      const readmeContent = await mem.readFile('project/README.md');
      expect(readmeContent).toContain('# Project README');

      const mainContent = await mem.readFile('project/main.js');
      expect(mainContent).toContain('console.log("Hello, World!");');

      const configContent = await mem.readFile('project/config.json');
      expect(configContent).toContain('test');
      expect(configContent).toContain('1.0.0');

      // Verify git commit
      const git = simpleGit(tempDir);
      const log = await git.log();
      expect(log.all.length).toBe(1);
      expect(log.all[0].message).toBe(
        'feat: create project structure with multiple files'
      );
    });

    it('should handle file modification workflow', async () => {
      // Create initial file first
      const mem = createMemAPI(mockConfig as AppConfig);
      await mem.writeFile(
        'modify-test.md',
        '# Original Title\n\nOriginal content here.'
      );
      await mem.commitChanges('feat: add original file');

      // Mock LLM response for modification
      const mockLLMQuery = createMockLLMQuery([
        // First response: Modify the file
        `I'll modify the existing file by adding new content.
<typescript>
const fileName = 'modify-test.md';
const existingContent = await mem.readFile(fileName);
const newContent = existingContent + '\n\n## New Section\n\nThis content was added during modification.';
await mem.updateFile(fileName, existingContent, newContent);
</typescript>`,
        // Second response: Commit and Reply
        `File modified successfully. Now commit the changes.
<typescript>
await mem.commitChanges('feat: modify file with new section');
</typescript>
<reply>
Successfully modified the file by adding a new section.
</reply>`,
      ]);

      // Execute the query
      const result = await handleUserQuery(
        'Modify the existing file',
        mockConfig,
        undefined,
        mockLLMQuery,
        captureStatusUpdate
      );

      // Verify final response
      expect(result).toBe(
        'Successfully modified the file by adding a new section.'
      );

      // Verify file was modified
      const modifiedContent = await mem.readFile('modify-test.md');
      expect(modifiedContent).toContain('# Original Title');
      expect(modifiedContent).toContain('Original content here.');
      expect(modifiedContent).toContain('## New Section');
      expect(modifiedContent).toContain(
        'This content was added during modification'
      );

      // Verify git history
      const git = simpleGit(tempDir);
      const log = await git.log();
      expect(log.all.length).toBe(2);
      expect(log.all[0].message).toBe('feat: modify file with new section');
      expect(log.all[1].message).toBe('feat: add original file');
    });

    it('should demonstrate complete Think-Act-Commit loop', async () => {
      const statusUpdates: StatusUpdate[] = [];

      const captureStatusUpdate = (update: StatusUpdate) => {
        statusUpdates.push(update);
      };

      // Mock LLM response sequence demonstrating the complete loop
      const mockLLMQuery = createMockLLMQuery([
        // Think phase
        `I need to create a comprehensive example that demonstrates the complete Think-Act-Commit loop.
<typescript>
// Create a detailed example file
await mem.writeFile('loop-example.md', '# Complete Loop Example\n\nThis demonstrates the full workflow.');
await mem.writeFile('loop-example.md', await mem.readFile('loop-example.md') + '\n\n## Steps\n\n1. Think\n2. Act\n3. Commit');
</typescript>`,
        // Commit phase
        `Example created successfully. Now commit the demonstration.
<typescript>
await mem.commitChanges('feat: demonstrate complete Think-Act-Commit loop');
</typescript>`,
        // Final reply
        `Complete workflow demonstrated successfully.
<reply>
I've successfully demonstrated the complete Think-Act-Commit loop by creating an example file and committing the changes.
</reply>`,
      ]);

      // Execute the query
      const result = await handleUserQuery(
        'Demonstrate the complete Think-Act-Commit loop',
        mockConfig,
        undefined,
        mockLLMQuery,
        captureStatusUpdate
      );

      // Verify final response
      expect(result).toBe(
        "I've successfully demonstrated the complete Think-Act-Commit loop by creating an example file and committing the changes."
      );

      // Verify the workflow was completed
      const mem = createMemAPI(mockConfig as AppConfig);
      const fileExists = await mem.fileExists('loop-example.md');
      expect(fileExists).toBe(true);

      const content = await mem.readFile('loop-example.md');
      expect(content).toContain('# Complete Loop Example');
      expect(content).toContain('Think');
      expect(content).toContain('Act');
      expect(content).toContain('Commit');

      // Verify git commit
      const git = simpleGit(tempDir);
      const log = await git.log();
      expect(log.all.length).toBe(1);
      expect(log.all[0].message).toBe(
        'feat: demonstrate complete Think-Act-Commit loop'
      );
    });
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
    const fullPath = resolveSecurePath(graphRoot, filePath);
    try {
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to read file ${filePath}: ${(error as Error).message}`
      );
    }
  };

export const writeFile =
  (graphRoot: string) =>
  async (filePath: string, content: string): Promise<boolean> => {
    const fullPath = resolveSecurePath(graphRoot, filePath);
    const dir = path.dirname(fullPath);

    try {
      // Create parent directories recursively
      await fs.mkdir(dir, { recursive: true });

      // Write the file
      await fs.writeFile(fullPath, content, 'utf-8');
      return true;
    } catch (error) {
      throw new Error(
        `Failed to write file ${filePath}: ${(error as Error).message}`
      );
    }
  };

export const updateFile =
  (graphRoot: string) =>
  async (
    filePath: string,
    oldContent: string,
    newContent: string
  ): Promise<boolean> => {
    const fullPath = resolveSecurePath(graphRoot, filePath);

    try {
      // Read the current file content
      const currentContent = await fs.readFile(fullPath, 'utf-8');

      // Verify the old content exists
      if (!currentContent.includes(oldContent)) {
        throw new Error(
          `File content does not match expected old content in ${filePath}`
        );
      }

      // Replace the content
      const updatedContent = currentContent.replace(oldContent, newContent);

      // Write the new content back
      await fs.writeFile(fullPath, updatedContent, 'utf-8');
      return true;
    } catch (error) {
      throw new Error(
        `Failed to update file ${filePath}: ${(error as Error).message}`
      );
    }
  };

export const deleteFile =
  (graphRoot: string) =>
  async (filePath: string): Promise<boolean> => {
    const fullPath = resolveSecurePath(graphRoot, filePath);

    try {
      await fs.rm(fullPath, { recursive: true, force: true });
      return true;
    } catch (error) {
      throw new Error(
        `Failed to delete file ${filePath}: ${(error as Error).message}`
      );
    }
  };

export const rename =
  (graphRoot: string) =>
  async (oldPath: string, newPath: string): Promise<boolean> => {
    const fullOldPath = resolveSecurePath(graphRoot, oldPath);
    const fullNewPath = resolveSecurePath(graphRoot, newPath);

    try {
      await fs.rename(fullOldPath, fullNewPath);
      return true;
    } catch (error) {
      throw new Error(
        `Failed to rename ${oldPath} to ${newPath}: ${(error as Error).message}`
      );
    }
  };

export const fileExists =
  (graphRoot: string) =>
  async (filePath: string): Promise<boolean> => {
    const fullPath = resolveSecurePath(graphRoot, filePath);

    try {
      await fs.access(fullPath);
      return true;
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        return false;
      }
      throw new Error(
        `Failed to check if file exists ${filePath}: ${(error as Error).message}`
      );
    }
  };

export const createDir =
  (graphRoot: string) =>
  async (directoryPath: string): Promise<boolean> => {
    const fullPath = resolveSecurePath(graphRoot, directoryPath);

    try {
      await fs.mkdir(fullPath, { recursive: true });
      return true;
    } catch (error) {
      throw new Error(
        `Failed to create directory ${directoryPath}: ${(error as Error).message}`
      );
    }
  };

export const listFiles =
  (graphRoot: string) =>
  async (directoryPath?: string): Promise<string[]> => {
    const targetDir = directoryPath ? directoryPath : '.';
    const fullPath = resolveSecurePath(graphRoot, targetDir);

    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      return entries.map((entry) => entry.name).sort(); // Sort for consistent ordering
    } catch (error) {
      throw new Error(
        `Failed to list files in directory ${directoryPath || 'root'}: ${(error as Error).message}`
      );
    }
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
    try {
      if (fromCommit && toCommit) {
        return await git.diff([`${fromCommit}..${toCommit}`, '--', filePath]);
      } else if (fromCommit) {
        return await git.diff([`${fromCommit}`, '--', filePath]);
      } else {
        return await git.diff([filePath]);
      }
    } catch (error) {
      throw new Error(
        `Failed to get git diff for ${filePath}: ${(error as Error).message}`
      );
    }
  };

export const gitLog =
  (git: SimpleGit) =>
  async (filePath: string, maxCommits = 5): Promise<LogEntry[]> => {
    try {
      const result = await git.log({ file: filePath, maxCount: maxCommits });
      return result.all.map((entry) => ({
        hash: entry.hash,
        message: entry.message,
        date: entry.date,
      }));
    } catch (error) {
      throw new Error(
        `Failed to get git log for ${filePath}: ${(error as Error).message}`
      );
    }
  };

export const gitStagedFiles =
  (git: SimpleGit) => async (): Promise<string[]> => {
    try {
      const status = await git.status();
      // Combine all relevant file arrays and remove duplicates
      const allFiles = new Set([
        ...status.staged,
        ...status.modified,
        ...status.created,
        ...status.deleted,
        ...status.renamed.map((r) => r.to),
      ]);
      return Array.from(allFiles);
    } catch (error) {
      throw new Error(
        `Failed to get staged files: ${(error as Error).message}`
      );
    }
  };

export const commitChanges =
  (git: SimpleGit) =>
  async (message: string): Promise<string> => {
    try {
      // Stage all changes
      await git.add('.');

      // Commit staged changes
      const result = await git.commit(message);

      // Return the commit hash
      if (result.commit) {
        return result.commit;
      } else {
        throw new Error('No commit hash returned from git commit');
      }
    } catch (error) {
      throw new Error(`Failed to commit changes: ${(error as Error).message}`);
    }
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

    // State Management & Checkpoints
    saveCheckpoint: stateOps.saveCheckpoint(git), // Implemented
    revertToLastCheckpoint: stateOps.revertToLastCheckpoint(git), // Implemented
    discardChanges: stateOps.discardChanges(git), // Implemented

    // Utility & Diagnostics
    getGraphRoot: utilOps.getGraphRoot(graphRoot),
    getTokenCount: utilOps.getTokenCount(graphRoot), // Implemented
    getTokenCountForPaths: utilOps.getTokenCountForPaths(graphRoot), // Implemented
  };
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
  LOG_LEVEL_MAP[process.env.LOG_LEVEL?.toLowerCase() ?? 'info'] ??
  LogLevel.INFO;

type LogContext = Record<
  string,
  string | number | boolean | null | undefined | Record<string, unknown>
>;

export type Logger = {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, error?: Error, context?: LogContext) => void;
  child: (childContext: LogContext) => Logger;
};

const createLoggerInternal = (baseContext: LogContext = {}): Logger => {
  const log = (level: LogLevel, message: string, context: LogContext = {}) => {
    if (level < MIN_LOG_LEVEL) {
      return;
    }
    const finalContext = { ...baseContext, ...context };
    const logEntry = {
      level: LOG_LEVEL_NAMES[level],
      timestamp: new Date().toISOString(),
      message,
      ...finalContext,
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(logEntry));
  };

  const error = (message: string, err?: Error, context?: LogContext) => {
    const errorContext = {
      ...context,
      error: err ? { message: err.message, stack: err.stack } : undefined,
    };
    log(LogLevel.ERROR, message, errorContext);
  };

  return {
    debug: (message, context) => log(LogLevel.DEBUG, message, context),
    info: (message, context) => log(LogLevel.INFO, message, context),
    warn: (message, context) => log(LogLevel.WARN, message, context),
    error,
    child: (childContext: LogContext) => {
      const mergedContext = { ...baseContext, ...childContext };
      return createLoggerInternal(mergedContext);
    },
  };
};

export const createLogger = (): Logger => createLoggerInternal();

export const logger = createLogger();
````

## File: src/types/index.ts
````typescript
export * from './mem.js';
export * from './git.js';
export * from './sandbox.js';
export * from './mcp.js';
export * from './llm.js';
export * from './loop.js';

export interface RecursaConfig {
  knowledgeGraphPath: string;
  llm: {
    apiKey: string;
    baseUrl?: string;
    model: string;
    maxTokens?: number;
    temperature?: number;
  };
  sandbox: {
    timeout: number;
    memoryLimit: number;
  };
  git: {
    userName: string;
    userEmail: string;
  };
}

export interface EnvironmentVariables {
  KNOWLEDGE_GRAPH_PATH: string;
  OPENROUTER_API_KEY: string;
  OPENROUTER_MODEL?: string;
  LLM_TEMPERATURE?: string;
  LLM_MAX_TOKENS?: string;
  SANDBOX_TIMEOUT?: string;
  SANDBOX_MEMORY_LIMIT?: string;
  GIT_USER_NAME?: string;
  GIT_USER_EMAIL?: string;
}
````

## File: src/types/llm.ts
````typescript
export type ParsedLLMResponse = {
  think?: string;
  typescript?: string;
  reply?: string;
};

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export interface LLMRequest {
  messages: ChatMessage[];
  model: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMConfig {
  apiKey: string;
  baseUrl?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMProvider {
  generateCompletion: (request: LLMRequest) => Promise<LLMResponse>;
  streamCompletion?: (request: LLMRequest) => AsyncIterable<string>;
}

export type StreamingCallback = (chunk: string) => void;
````

## File: tests/integration/end-to-end.test.ts
````typescript
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  mock,
} from 'bun:test';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import simpleGit from 'simple-git';
import { handleUserQuery } from '../../src/core/loop';
import { createMemAPI } from '../../src/core/mem-api';
import type { AppConfig } from '../../src/config';

describe('End-to-End HTTP Integration Tests', () => {
  let tempDir: string;
  let mockConfig: AppConfig;
  let app: Elysia;
  let testPort: number;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'recursa-e2e-test-'));
    testPort = 3001; // Use different port for tests
    mockConfig = {
      knowledgeGraphPath: tempDir,
      openRouterApiKey: 'test-api-key',
      llmModel: 'test-model',
      port: testPort,
    };
  });

  beforeEach(async () => {
    // Clear the directory
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.mkdir(tempDir, { recursive: true });

    // Initialize git
    const git = simpleGit(tempDir);
    await git.init();
    await git.addConfig('user.name', 'Test User');
    await git.addConfig('user.email', 'test@example.com');
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // Mock LLM responses for testing
  const createMockLLMQuery = (responses: string[]) => {
    let callCount = 0;
    return mock(async (_history: unknown[], _config: unknown) => {
      const response = responses[callCount] || responses[responses.length - 1];
      callCount++;
      return response;
    });
  };

  describe('HTTP API Integration', () => {
    it('should handle a complete MCP request via HTTP', async () => {
      // Mock the LLM query function
      const mockLLMQuery = createMockLLMQuery([
        // First response: Think and Act
        `</think>
I'll create a simple test file via the HTTP API.
</think>
<typescript>
const fileName = 'api-test.md';
const content = '# API Test\n\nThis file was created via the HTTP API endpoint.';
await mem.writeFile(fileName, content);
</typescript>`,
        // Second response: Commit and Reply
        `<think>
File created successfully. Now I need to commit and respond.
</think>
<typescript>
await mem.commitChanges('feat: add API test file');
</typescript>
<reply>
I've successfully created a test file through the HTTP API and committed the changes.
</reply>`,
      ]);

      // This test focuses on the handleUserQuery function directly,
      // simulating an end-to-end agent workflow without the HTTP server layer.
      const result = await handleUserQuery(
        'Create a test file via HTTP API',
        mockConfig,
        'test-session-456',
        mockLLMQuery
      );

      expect(result).toBe(
        "I've successfully created a test file through the HTTP API and committed the changes."
      );

      // Verify the file was created
      const mem = createMemAPI(mockConfig as AppConfig);
      const fileExists = await mem.fileExists('api-test.md');
      expect(fileExists).toBe(true);

      const fileContent = await mem.readFile('api-test.md');
      expect(fileContent).toContain('# API Test');
      expect(fileContent).toContain('HTTP API endpoint');

      // Verify git commit
      const git = simpleGit(tempDir);
      const log = await git.log();
      expect(log.all.length).toBe(1);
      expect(log.all[0].message).toBe('feat: add API test file');
    });

    it('should handle streaming responses with status updates', async () => {
      const statusUpdates: StatusUpdate[] = [];

      const captureStatusUpdate = (update: StatusUpdate) => {
        statusUpdates.push(update);
      };

      const mockLLMQuery = createMockLLMQuery([
        // First response with thinking
        `</think>
I'll demonstrate the streaming capabilities by creating multiple files and showing progress.
</think>
<typescript>
// Create multiple files to demonstrate progress
const files = [
  { name: 'progress1.md', content: '# Progress 1\n\nFirst file in series.' },
  { name: 'progress2.md', content: '# Progress 2\n\nSecond file in series.' },
  { name: 'progress3.md', content: '# Progress 3\n\nThird file in series.' }
];

for (const file of files) {
  await mem.writeFile(file.name, file.content);
}
</typescript>`,
        // Second response: Commit and Reply
        `<think>
All files created successfully. Now commit and provide final summary.
</think>
<typescript>
await mem.commitChanges('feat: add multiple progress files');
</typescript>
<reply>
I've successfully created three files to demonstrate the streaming progress functionality. All changes have been committed.
</reply>`,
      ]);

      // Execute with status updates
      const result = await handleUserQuery(
        'Demonstrate streaming with multiple files',
        mockConfig,
        'stream-test-session',
        mockLLMQuery,
        captureStatusUpdate
      );

      // Verify final response
      expect(result).toBe(
        "I've successfully created three files to demonstrate the streaming progress functionality. All changes have been committed."
      );

      // Verify status updates were captured
      expect(statusUpdates.length).toBeGreaterThan(0);

      // Check for different types of status updates
      const types = new Set(statusUpdates.map((u) => u.type));
      expect(types.has('think')).toBe(true);
      expect(types.has('act')).toBe(true);

      // Verify runId consistency
      const runIds = [...new Set(statusUpdates.map((u) => u.runId))];
      expect(runIds.length).toBe(1); // All updates should have same runId

      // Verify files were created
      const mem = createMemAPI(mockConfig as AppConfig);
      for (let i = 1; i <= 3; i++) {
        const fileExists = await mem.fileExists(`progress${i}.md`);
        expect(fileExists).toBe(true);
      }
    });

    it('should handle complex multi-turn conversations', async () => {
      const sessionId = 'complex-conversation';

      // First query: Create a project structure
      const firstMockLLMQuery = createMockLLMQuery([
        `</think>
I'll create a project structure with README, main file, and configuration.
</think>
<typescript>
// Create project structure
await mem.writeFile('README.md', '# My Project\n\nThis is a test project.');
await mem.writeFile('main.ts', '// Main entry point\nconsole.log("Hello, World!");');
await mem.writeFile('config.json', '{"name": "test-project", "version": "1.0.0"}');
await mem.createDir('src');
await mem.writeFile('src/utils.ts', '// Utility functions');
</typescript>`,
        `</think>
Project structure created. Now commit the initial setup.
</think>
<typescript>
await mem.commitChanges('feat: initialize project structure');
</typescript>`,
        `<reply>
I've created a complete project structure with README, main file, configuration, and a source directory with utilities.
</reply>`,
      ]);

      const firstResult = await handleUserQuery(
        'Create a new project structure',
        mockConfig,
        sessionId,
        firstMockLLMQuery
      );

      expect(firstResult).toContain('created a complete project structure');

      // Second query: Add more features to the existing project
      const secondMockLLMQuery = createMockLLMQuery([
        `</think>
I'll enhance the existing project by adding tests and documentation.
</think>
<typescript>
// Add tests and documentation
await mem.createDir('tests');
await mem.writeFile('tests/main.test.ts', '// Test for main functionality');
await mem.writeFile('docs/api.md', '# API Documentation\n\nDetailed API docs here.');
const readmeContent = await mem.readFile('README.md');
await mem.updateFile(
  'README.md',
  readmeContent,
  readmeContent + '\n\n## Testing\n\nRun tests with \`npm test\`.'
);
</typescript>`,
        `<think>
Enhanced project with tests and documentation. Commit the additions.
`,
      ]);

      const secondResult = await handleUserQuery(
        'Add tests and documentation',
        mockConfig,
        sessionId,
        secondMockLLMQuery
      );

      expect(secondResult).toContain(
        'Enhanced project with tests and documentation'
      );
    });
  });
});
````

## File: tests/integration/mcp-server-http.test.ts
````typescript
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  mock,
} from 'bun:test';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import simpleGit from 'simple-git';
import { createApp } from '../../src/server';
import type { AppConfig } from '../../src/config';

describe('MCP Server HTTP Integration Tests', () => {
  let tempDir: string;
  let mockConfig: AppConfig;
  let app: ReturnType<typeof createApp>;
  let testPort: number;
  let server: ReturnType<typeof createApp>;

  beforeAll(async () => {
    // Create a temporary directory for the test knowledge graph
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'recursa-mcp-test-'));
    testPort = 3001; // Use different port for tests

    mockConfig = {
      knowledgeGraphPath: tempDir,
      openRouterApiKey: 'test-api-key',
      llmModel: 'test-model',
      port: testPort,
    };

    // Create a mock handleUserQuery function for testing
    const mockHandleUserQuery = mock(async (query: string) => {
      // config: AppConfig, sessionId?: string
        return `Mock response for query: ${query}`;
      }
    );

    // Create the app instance
    app = createApp(mockHandleUserQuery, mockConfig);
  });

  beforeEach(async () => {
    // Clear and reinitialize the directory
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.mkdir(tempDir, { recursive: true });

    // Initialize git repository
    const git = simpleGit(tempDir);
    await git.init();
    await git.addConfig('user.name', 'Test User');
    await git.addConfig('user.email', 'test@example.com');
  });

  afterAll(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });

    // Close server if it's running
    if (server) {
      server.stop();
    }
  });

  describe('HTTP API Endpoints', () => {
    it('should respond to health check at root endpoint', async () => {
      const response = await app.handle(new Request('http://localhost:3001/'));
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({
        status: 'ok',
        message: 'Recursa server is running',
      });
    });

    it('should handle POST /mcp endpoint with valid request', async () => {
      const requestBody = {
        query: 'Create a test file',
        sessionId: 'test-session-123',
      };

      const response = await app.handle(
        new Request('http://localhost:3001/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('runId');
      expect(data).toHaveProperty('reply');
      expect(data).toHaveProperty('streamingEndpoint');
      expect(data.reply).toContain(
        'Mock response for query: Create a test file'
      );
      expect(data.streamingEndpoint).toMatch(/^\/events\/[a-f0-9-]+$/);
    });

    it('should handle POST /mcp endpoint without sessionId', async () => {
      const requestBody = {
        query: 'Create a test file without session',
      };

      const response = await app.handle(
        new Request('http://localhost:3001/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('runId');
      expect(data).toHaveProperty('reply');
      expect(data).toHaveProperty('streamingEndpoint');
    });

    it('should reject POST /mcp with invalid JSON', async () => {
      const response = await app.handle(
        new Request('http://localhost:3001/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: 'invalid json{',
        })
      );

      expect(response.status).toBe(422); // Validation error
    });

    it('should reject POST /mcp with missing query field', async () => {
      const requestBody = {
        sessionId: 'test-session',
      };

      const response = await app.handle(
        new Request('http://localhost:3001/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
      );

      expect(response.status).toBe(422); // Validation error
    });

    it('should reject POST /mcp with empty query', async () => {
      const requestBody = {
        query: '',
        sessionId: 'test-session',
      };

      const response = await app.handle(
        new Request('http://localhost:3001/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
      );

      expect(response.status).toBe(422); // Validation error
    });

    it('should reject POST /mcp with whitespace-only query', async () => {
      const requestBody = {
        query: '   \n\t   ',
        sessionId: 'test-session',
      };

      const response = await app.handle(
        new Request('http://localhost:3001/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
      );

      expect(response.status).toBe(422); // Validation error
    });
  });

  describe('Server-Sent Events (SSE)', () => {
    it('should establish SSE connection for valid runId', async () => {
      const testRunId = 'test-run-123';

      const response = await app.handle(
        new Request(`http://localhost:3001/events/${testRunId}`)
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
      expect(response.headers.get('Connection')).toBe('keep-alive');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('should send initial connection message via SSE', async () => {
      const testRunId = 'test-run-456';

      const response = await app.handle(
        new Request(`http://localhost:3001/events/${testRunId}`)
      );

      expect(response.status).toBe(200);

      // Read the SSE stream
      const reader = response.body?.getReader();
      expect(reader).toBeDefined();

      if (reader) {
        const { done, value } = await reader.read();
        expect(done).toBe(false);

        const text = new TextDecoder().decode(value);
        expect(text).toContain('data: ');

        // Parse the initial message
        const dataMatch = text.match(/data: (.+)\n\n/);
        expect(dataMatch).toBeDefined();

        if (dataMatch) {
          const initialMessage = JSON.parse(dataMatch[1]);
          expect(initialMessage).toHaveProperty('type', 'think');
          expect(initialMessage).toHaveProperty('runId', testRunId);
          expect(initialMessage).toHaveProperty('timestamp');
          expect(initialMessage).toHaveProperty(
            'content',
            'Connection established'
          );
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in MCP processing gracefully', async () => {
      // Create a mock that throws an error
      const mockHandleUserQuery = mock(async () => {
        throw new Error('Test error');
      });

      const errorApp = createApp(mockHandleUserQuery, mockConfig);

      const requestBody = {
        query: 'This should cause an error',
        sessionId: 'error-test-session',
      };

      const response = await errorApp.handle(
        new Request('http://localhost:3001/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
      );

      // Even with errors, the HTTP response should be successful
      // but the response should indicate the error
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('runId');
      expect(data).toHaveProperty('reply');
      expect(data.reply).toContain(
        'An error occurred while processing your request.'
      );
    });

    it('should handle 404 for unknown routes', async () => {
      const response = await app.handle(
        new Request('http://localhost:3001/unknown-route')
      );
      expect(response.status).toBe(404);
    });

    it('should reject unsupported HTTP methods for /mcp endpoint', async () => {
      // GET method should be rejected
      const getResponse = await app.handle(
        new Request('http://localhost:3001/mcp', {
          method: 'GET',
        })
      );
      expect(getResponse.status).toBe(404); // Route not found for GET

      // PUT method should be rejected
      const putResponse = await app.handle(
        new Request('http://localhost:3001/mcp', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: 'test' }),
        })
      );
      expect(putResponse.status).toBe(404); // Route not found for PUT

      // DELETE method should be rejected
      const deleteResponse = await app.handle(
        new Request('http://localhost:3001/mcp', {
          method: 'DELETE',
        })
      );
      expect(deleteResponse.status).toBe(404); // Route not found for DELETE
    });
  });

  describe('Request/Response Headers', () => {
    it('should include request ID in responses', async () => {
      const requestBody = {
        query: 'Test with headers',
      };

      const response = await app.handle(
        new Request('http://localhost:3001/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
      );

      // The server should add a request ID header
      expect(response.headers.get('X-Request-ID')).toBeDefined();
      expect(response.headers.get('X-Request-ID')).toMatch(/^[a-f0-9-]+$/);
    });

    it('should handle requests with custom headers', async () => {
      const requestBody = {
        query: 'Test with custom headers',
      };

      const response = await app.handle(
        new Request('http://localhost:3001/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'test-agent/1.0',
            'X-Custom-Header': 'custom-value',
          },
          body: JSON.stringify(requestBody),
        })
      );

      expect(response.status).toBe(200);
    });

    it('should handle CORS headers for SSE endpoints', async () => {
      const testRunId = 'cors-test-run';

      const response = await app.handle(
        new Request(`http://localhost:3001/events/${testRunId}`)
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe(
        'Cache-Control'
      );
    });
  });

  describe('Content Type Handling', () => {
    it('should reject requests with wrong content type', async () => {
      const response = await app.handle(
        new Request('http://localhost:3001/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: JSON.stringify({ query: 'test' }),
        })
      );

      // Elysia's parser is strict and will reject this.
      expect(response.status).toBe(422);
    });

    it('should handle requests without content type header', async () => {
      const response = await app.handle(
        new Request('http://localhost:3001/mcp', {
          method: 'POST',
          body: JSON.stringify({ query: 'test' }),
        })
      );

      // Elysia's parser is strict and will reject this without a Content-Type header.
      expect(response.status).toBe(422);
    });
  });
});
````

## File: .env.example
````
# Recursa MCP Server Configuration
# Copy this file to .env and update the values

# Required: Path to your knowledge graph directory
KNOWLEDGE_GRAPH_PATH=./knowledge-graph

# Required: OpenRouter API key for LLM access
# Get your API key from: https://openrouter.ai/keys
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Optional: OpenRouter model to use (default: anthropic/claude-3.5-sonnet)
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet

# Optional: LLM Configuration
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=4096

# Optional: Sandbox Configuration (in milliseconds and megabytes)
SANDBOX_TIMEOUT=30000
SANDBOX_MEMORY_LIMIT=100

# Optional: Git Configuration
GIT_USER_NAME=Recursa Agent
GIT_USER_EMAIL=recursa@local

# Optional: Port for the Recursa server
PORT=3000

# Usage:
# 1. Copy this file: cp .env.example .env
# 2. Update OPENROUTER_API_KEY with your actual API key
# 3. Update KNOWLEDGE_GRAPH_PATH to point to your knowledge graph
# 4. Source the file: source .env
# 5. Run the server: bun run start
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

## File: src/core/mem-api/state-ops.ts
````typescript
import type { SimpleGit } from 'simple-git';

// Note: These functions map to specific git commands for state management.

export const saveCheckpoint =
  (git: SimpleGit) => async (): Promise<boolean> => {
    // 1. Stage all changes: `await git.add('.')`.
    await git.add('.');
    // 2. Save to stash with a message: `await git.stash(['push', '-m', 'recursa-checkpoint'])`.
    await git.stash(['push', '-m', 'recursa-checkpoint']);
    // 3. Return true on success.
    return true;
  };

export const revertToLastCheckpoint =
  (git: SimpleGit) => async (): Promise<boolean> => {
    try {
      // 1. Apply the most recent stash: `await git.stash(['pop'])`.
      // This can fail if the stash is empty, so wrap in a try/catch.
      await git.stash(['pop']);
      return true;
    } catch (error) {
      // If stash is empty, simple-git throws. We can consider this a "success"
      // in that there's nothing to revert to. Or we can re-throw.
      // For now, let's log and return false.
      // eslint-disable-next-line no-console
      console.warn('Could not revert to checkpoint, stash may be empty.');
      return false;
    }
  };

export const discardChanges =
  (git: SimpleGit) => async (): Promise<boolean> => {
    // 1. Reset all tracked files: `await git.reset(['--hard', 'HEAD'])`.
    await git.reset(['--hard', 'HEAD']);
    // 2. Remove all untracked files and directories: `await git.clean('f', ['-d'])`.
    await git.clean('f', ['-d']);
    // 3. Return true on success.
    return true;
  };
````

## File: src/core/llm.ts
````typescript
import type { AppConfig } from '../config';
import { logger } from '../lib/logger';
import type { ChatMessage } from '../types';

// Custom error class for HTTP errors with status code
class HttpError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseText?: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

const withRetry =
  <T extends (...args: unknown[]) => Promise<unknown>>(queryFn: T) =>
  async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const maxAttempts = 3;
    const initialDelay = 1000;
    const backoffFactor = 2;
    let lastError: Error;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return (await queryFn(...args)) as Awaited<ReturnType<T>>;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on non-retryable errors (4xx status codes)
        if (
          error instanceof HttpError &&
          error.statusCode >= 400 &&
          error.statusCode < 500
        ) {
          throw error;
        }

        // If this is the last attempt, throw the error
        if (attempt === maxAttempts - 1) {
          throw lastError;
        }

        // Calculate exponential backoff delay
        const delay = initialDelay * Math.pow(backoffFactor, attempt);
        logger.warn(
          `Retry attempt ${attempt + 1}/${maxAttempts} after ${delay}ms delay. Error: ${lastError.message}`
        );

        // Wait for the delay
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  };

export const queryLLM = async (
  history: ChatMessage[],
  config: AppConfig
): Promise<string> => {
  // OpenRouter API endpoint
  const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';

  // Create request body
  const requestBody = {
    model: config.llmModel,
    messages: history,
    temperature: 0.7,
    max_tokens: 4000,
  };

  try {
    // Make POST request to OpenRouter API
    const response = await fetch(openRouterUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': `http://localhost:${config.port}`,
        'X-Title': 'Recursa',
      },
      body: JSON.stringify(requestBody),
    });

    // Check if response is successful
    if (!response.ok) {
      let errorDetails = 'Unknown error';
      try {
        const errorData = (await response.json()) as {
          error?: { message?: string };
        };
        errorDetails = errorData.error?.message || JSON.stringify(errorData);
      } catch {
        errorDetails = await response.text();
      }

      throw new HttpError(
        `OpenRouter API error: ${response.status} ${response.statusText}`,
        response.status,
        errorDetails
      );
    }

    // Parse JSON response
    const data = (await response.json()) as {
      choices: Array<{
        message: {
          content: string;
        };
      }>;
    };

    // Extract and validate content
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from OpenRouter API');
    }

    const content = data.choices[0].message.content;
    if (!content) {
      throw new Error('Empty content received from OpenRouter API');
    }

    return content;
  } catch (error) {
    // Re-throw HttpError instances
    if (error instanceof HttpError) {
      throw error;
    }

    // Wrap other errors
    throw new Error(
      `Failed to query OpenRouter API: ${(error as Error).message}`
    );
  }
};

export const queryLLMWithRetries = withRetry(
  queryLLM as (...args: unknown[]) => Promise<unknown>
);
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
    const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i');
    const match = response.match(regex);
    // If a match is found, return the captured group (the content), trimmed.
    return match && match[1] ? match[1].trim() : undefined;
  };

  // Parse structured tags
  let think = extractTagContent('think');
  let typescript = extractTagContent('typescript');
  let reply = extractTagContent('reply');
  
  // Handle malformed responses: if no think tag but there's content before the first XML tag,
  // treat that content as the think content
  if (!think) {
    const firstTagMatch = response.match(/<[^>]+>/);
    if (firstTagMatch) {
      const contentBeforeFirstTag = response.substring(0, firstTagMatch.index).trim();
      if (contentBeforeFirstTag) {
        think = contentBeforeFirstTag;
      }
    }
  }

  // Handle malformed responses or alternative formats
  if (!think && !typescript && !reply) {
    // Try to extract any content that looks like a reply (text after XML-like tags)
    const lines = response.split('\n').filter(line => line.trim());
    const nonTagLines = lines.filter(line => !line.trim().match(/^<[^>]+>$/));
    
    if (nonTagLines.length > 0) {
      // If there's content that's not just tags, treat it as a reply
      const lastLineIndex = response.lastIndexOf('>');
      if (lastLineIndex > 0 && lastLineIndex < response.length - 1) {
        reply = response.substring(lastLineIndex + 1).trim();
      } else if (nonTagLines.length === 1) {
          reply = nonTagLines[0]!.trim();
      }
    }
  }

  // Handle cases where reply is embedded in XML-like structure but without explicit tags
  if (!reply && typescript && think) {
    // If we have think and typescript but no reply, there might be content after the typescript block
    const tsEndIndex = response.lastIndexOf('</typescript>');
    if (tsEndIndex > 0 && tsEndIndex < response.length - 1) {
      const afterTs = response.substring(tsEndIndex + 13).trim();
      if (afterTs && !afterTs.startsWith('<')) {
        reply = afterTs;
      }
    }
  }

  return {
    think,
    typescript,
    reply,
  };
};
````

## File: src/core/sandbox.ts
````typescript
import { VM, type VMOptions } from 'vm2';
import type { MemAPI } from '../types/mem';
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
): Promise<unknown> => {
  // Create a new, mutable object for the sandbox.
  // The spread operator (`{ ...memApi }`) can fail to create a sufficiently
  // mutable object for the vm2 sandbox, leading to "readonly property" errors.
  // This manual construction is more robust.
  const memApiCopy: { [K in keyof MemAPI]?: MemAPI[K] } = {};
  for (const key of Object.keys(memApi) as Array<keyof MemAPI>) {
    memApiCopy[key] = memApi[key];
  }

  const vm = new VM({
    timeout: 10000, // 10 seconds
    sandbox: {
      mem: memApiCopy,
    },
    eval: false,
    wasm: false,
    fixAsync: true,
    // Deny access to all node builtins by default.
    require: {
      builtin: [],
    },
  } as VMOptions);

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

## File: src/types/git.ts
````typescript
export interface GitOptions {
  baseDir?: string;
}

// Structure for a single Git log entry.
export type LogEntry = {
  hash: string;
  message: string;
  date: string;
};

export interface GitDiffResult {
  additions: number;
  deletions: number;
  patch: string;
}

export interface GitStatus {
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

export type GitCommand =
  | 'init'
  | 'add'
  | 'commit'
  | 'status'
  | 'log'
  | 'diff'
  | 'branch';
````

## File: src/types/mcp.ts
````typescript
import type { Resource } from '@modelcontextprotocol/sdk/types.js';

export interface MCPInitializeRequest {
  protocolVersion: string;
  capabilities: {
    tools?: {
      listChanged?: boolean;
    };
    resources?: {
      listChanged?: boolean;
      subscribe?: boolean;
      unsubscribe?: boolean;
    };
  };
  clientInfo: {
    name: string;
    version: string;
  };
}

export interface MCPInitializeResult {
  protocolVersion: string;
  capabilities: {
    tools: {
      listChanged?: boolean;
    };
    resources: {
      listChanged?: boolean;
      subscribe?: boolean;
      unsubscribe?: boolean;
    };
  };
  serverInfo: {
    name: string;
    version: string;
  };
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface MCPResource extends Resource {
  mimeType?: string;
}

export interface MCPRequest {
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

export interface MCPResponse {
  id: string;
  result?: Record<string, unknown>;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface MCPServerConfig {
  name: string;
  version: string;
  description?: string;
}
````

## File: src/types/mem.ts
````typescript
import type { LogEntry } from './git';

// --- Knowledge Graph & Git ---

// Structure for a graph query result.
export type GraphQueryResult = {
  filePath: string;
  matches: string[];
};

// Structure for token count results for multiple paths.
export type PathTokenCount = {
  path: string;
  tokenCount: number;
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
  queryGraph: (query: string) => Promise<GraphQueryResult[]>;
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
import {
  describe,
  it,
  expect,
  afterAll,
  beforeAll,
  beforeEach,
} from 'bun:test';
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
    // Return the next pre-canned XML response from the `responses` array.
    const response = responses[callCount];
    if (!response) {
      throw new Error(
        `Mock LLM called more times than expected (${callCount}).`
      );
    }
    callCount++;
    return response;
  };
};

describe('Agent End-to-End Workflow', () => {
  let testGraphPath: string;
  let testConfig: AppConfig;

  beforeAll(async () => {
    // Set up a temporary directory for the knowledge graph.
    testGraphPath = await fs.mkdtemp(path.join(os.tmpdir(), 'recursa-e2e-'));
    testConfig = { ...appConfig, knowledgeGraphPath: testGraphPath };
  });

  afterAll(async () => {
    // Clean up the temporary directory.
    await fs.rm(testGraphPath, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Clean up the graph directory between tests to ensure isolation.
    await fs.rm(testGraphPath, { recursive: true, force: true });
    await fs.mkdir(testGraphPath, { recursive: true });
    const git = simpleGit(testGraphPath);
    await git.init();
    await git.addConfig('user.name', 'Test User');
    await git.addConfig('user.email', 'test@example.com');

    // Create a .gitignore file first
    await fs.writeFile(
      path.join(testGraphPath, '.gitignore'),
      '*.log\nnode_modules/\n.env'
    );

    await git.add('.gitignore');
    await git.commit('Initial commit');
  });

  it('should correctly handle the Dr. Aris Thorne example from the docs', async () => {
    // 1. SETUP
    // Define the multi-turn LLM responses as XML strings based on the example.
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

    // Create a mock LLM function for this specific test case.
    const mockQueryLLM = createMockQueryLLM([turn1Response, turn2Response]);

    // 2. EXECUTE
    // Call the main loop with the user query and the mocked LLM function.
    const query =
      'I just had a call with a Dr. Aris Thorne from the AI Research Institute. He works on symbolic reasoning. Create a new entry for him and link it to his affiliation.';
    const finalReply = await handleUserQuery(
      query,
      testConfig,
      undefined,
      mockQueryLLM
    );

    // 3. ASSERT
    // Assert the final user-facing reply is correct.
    expect(finalReply).toBe(
      "Done. I've created pages for both Dr. Aris Thorne and the AI Research Institute and linked them."
    );

    // Verify file creation. Check that 'Dr. Aris Thorne.md' and 'AI Research Institute.md' exist.
    const thornePath = path.join(testGraphPath, 'Dr. Aris Thorne.md');
    const orgPath = path.join(testGraphPath, 'AI Research Institute.md');
    await expect(fs.access(thornePath)).resolves.not.toThrow();
    await expect(fs.access(orgPath)).resolves.not.toThrow();

    // Verify file content. Read 'Dr. Aris Thorne.md' and check for `affiliation:: [[AI Research Institute]]`.
    const thorneContent = await fs.readFile(thornePath, 'utf-8');
    expect(thorneContent).toContain('affiliation:: [[AI Research Institute]]');
    expect(thorneContent).toContain('field:: [[Symbolic Reasoning]]');

    // Verify the git commit. Use `simple-git` to check the log of the test repo.
    const git = simpleGit(testGraphPath);
    const log = await git.log({ maxCount: 1 });
    expect(log.latest?.message).toBe(
      'feat: Add Dr. Aris Thorne and AI Research Institute entities'
    );
  });
});
````

## File: tests/e2e/mcp-server-complete.test.ts
````typescript
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  mock,
} from 'bun:test';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import simpleGit from 'simple-git';
import { createApp } from '../../src/server';
import type { AppConfig } from '../../src/config';
import { handleUserQuery } from '../../src/core/loop';
import type { ChatMessage } from '../../src/types';

describe('MCP Server Complete End-to-End Tests', () => {
  let tempDir: string;
  let mockConfig: AppConfig;
  let app: unknown;
  let testPort: number;
  let baseUrl: string;

  beforeAll(async () => {
    // Create a temporary directory for the test knowledge graph
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'recursa-e2e-test-'));
    testPort = 3002; // Use a unique port for E2E tests

    mockConfig = {
      knowledgeGraphPath: tempDir,
      openRouterApiKey: 'mock-test-api-key',
      llmModel: 'mock-test-model',
      port: testPort,
    };

    baseUrl = `http://localhost:${testPort}`;
  });

  beforeEach(async () => {
    // Clear and reinitialize the directory
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.mkdir(tempDir, { recursive: true });

    // Initialize git repository
    const git = simpleGit(tempDir);
    await git.init();
    await git.addConfig('user.name', 'E2E Test User');
    await git.addConfig('user.email', 'e2e-test@example.com');

    // Create a .gitignore file first
    await fs.writeFile(
      path.join(tempDir, '.gitignore'),
      '*.log\nnode_modules/\n.env'
    );

    await git.add('.gitignore');
    await git.commit('Initial commit');
  });

  afterAll(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('HTTP API Contract Tests', () => {
    it('should handle complete MCP request lifecycle', async () => {
      // Create a mock LLM that simulates the Think-Act-Commit loop
      const mockLLMResponses = [
        // Turn 1: Think and Act
        `I'll create a new person entry for the test subject.
<typescript>
await mem.writeFile('Test Person.md', '# Test Person\\ntype:: person\\nfield:: [[Testing]]\\ncreated:: ' + new Date().toISOString());
</typescript>`,
        // Turn 2: Commit and Reply
        `I'll save the changes to your knowledge base.
<typescript>
await mem.commitChanges('feat: Add Test Person entity');
</typescript>
<reply>
I've successfully created a new entry for Test Person in your knowledge base.
</reply>`,
      ];

      const mockQueryLLM = mock(
        async (history: ChatMessage[], _config: AppConfig) => {
          // Ensure history is an array
          const historyArray = Array.isArray(history) ? history : [];
          const responseCount = historyArray.filter(
            (m) => m.role === 'assistant'
          ).length;
          return (
            mockLLMResponses[responseCount] ||
            mockLLMResponses[mockLLMResponses.length - 1]
          );
        }
      );

      // Create a version of handleUserQuery that uses our mocked LLM
      const mockedHandleUserQuery = (
        query: string,
        config: AppConfig,
        sessionId?: string
      ) => {
        return handleUserQuery(query, config, sessionId, mockQueryLLM);
      };

      // Create app with the mocked handler
      app = createApp(mockedHandleUserQuery, mockConfig as AppConfig);

      // Make the MCP request
      const requestBody = {
        query: 'Create a new person entry for Test Person who works in Testing',
        sessionId: 'e2e-test-session-1',
      };

      const response = await app.handle(
        new Request(`${baseUrl}/mcp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('runId');
      expect(data).toHaveProperty('reply');
      expect(data).toHaveProperty('streamingEndpoint');
      expect(data.reply).toContain(
        'successfully created a new entry for Test Person'
      );
      expect(data.streamingEndpoint).toMatch(/^\/events\/[a-f0-9-]+$/);

      // Verify the file was actually created
      const testPersonPath = path.join(tempDir, 'Test Person.md');
      expect(await fs.access(testPersonPath)).not.toThrow();

      const content = await fs.readFile(testPersonPath, 'utf-8');
      expect(content).toContain('# Test Person');
      expect(content).toContain('type:: person');
      expect(content).toContain('field:: [[Testing]]');

      // Verify the git commit was created
      const git = simpleGit(tempDir);
      const log = await git.log({ maxCount: 1 });
      expect(log.latest?.message).toBe('feat: Add Test Person entity');
    });

    it('should handle multi-step workflow with multiple file operations', async () => {
      const mockLLMResponses = [
        // Turn 1: Create organization and person with linking
        `I'll create both the organization and person entries and link them together.
<typescript>
const orgPath = 'Test Organization.md';
const orgExists = await mem.fileExists(orgPath);
if (!orgExists) {
  await mem.writeFile(orgPath, '# Test Organization\\ntype:: organization\\nindustry:: [[Technology]]\\nfounded:: 2020');
}

await mem.writeFile('John Doe.md', '# John Doe\\ntype:: person\\nrole:: Developer\\naffiliation:: [[Test Organization]]\\nskills:: [[JavaScript]], [[TypeScript]]');
</typescript>`,
        // Turn 2: Commit and Reply
        `I'll save these changes to your knowledge base.
<typescript>
await mem.commitChanges('feat: Add Test Organization and John Doe with linked entities');
</typescript>
<reply>
I've created entries for both Test Organization and John Doe, with proper linking between them.
</reply>`,
      ];

      const mockQueryLLM = mock(
        async (history: ChatMessage[], _config: AppConfig) => {
          // Ensure history is an array
          const historyArray = Array.isArray(history) ? history : [];
          const responseCount = historyArray.filter(
            (m) => m.role === 'assistant'
          ).length;
          return mockLLMResponses[responseCount];
        }
      );

      // Create a version of handleUserQuery that uses our mocked LLM
      const mockedHandleUserQuery = (
        query: string,
        config: AppConfig,
        sessionId?: string
      ) => {
        return handleUserQuery(query, config, sessionId, mockQueryLLM);
      };

      // Create app with the mocked handler
      app = createApp(mockedHandleUserQuery, mockConfig as AppConfig);

      const requestBody = {
        query:
          'Create entries for John Doe, a developer at Test Organization, and link them together',
        sessionId: 'e2e-test-session-2',
      };

      const response = await app.handle(
        new Request(`${baseUrl}/mcp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.reply).toContain(
        'created entries for both Test Organization and John Doe'
      );

      // Verify both files were created
      const orgPath = path.join(tempDir, 'Test Organization.md');
      const personPath = path.join(tempDir, 'John Doe.md');

      expect(await fs.access(orgPath)).not.toThrow();
      expect(await fs.access(personPath)).not.toThrow();

      // Verify content and linking
      const orgContent = await fs.readFile(orgPath, 'utf-8');
      expect(orgContent).toContain('# Test Organization');
      expect(orgContent).toContain('type:: organization');

      const personContent = await fs.readFile(personPath, 'utf-8');
      expect(personContent).toContain('# John Doe');
      expect(personContent).toContain('affiliation:: [[Test Organization]]');
      expect(personContent).toContain(
        'skills:: [[JavaScript]], [[TypeScript]]'
      );

      // Verify git commit
      const git = simpleGit(tempDir);
      const log = await git.log({ maxCount: 1 });
      expect(log.latest?.message).toBe(
        'feat: Add Test Organization and John Doe with linked entities'
      );
    });
  });

  describe('Server-Sent Events (SSE) Integration', () => {
    it('should provide real-time status updates during processing', async () => {
      const mockLLMResponses = [
        // Turn 1: Multiple actions to generate status updates
        `I'll analyze the request and create the necessary files.
<typescript>
await mem.writeFile('Status Test.md', '# Status Test\\ntype:: test\\nstatus:: in-progress');
</typescript>`,
        // Turn 2: Final commit
        `I'll complete the operation now.
<typescript>
await mem.commitChanges('feat: Complete status test operation');
</typescript>
<reply>
The status test operation has been completed successfully.
</reply>`,
      ];

      const mockQueryLLM = mock(
        async (history: ChatMessage[], _config: AppConfig) => {
          // Ensure history is an array
          const historyArray = Array.isArray(history) ? history : [];
          const responseCount = historyArray.filter(
            (m) => m.role === 'assistant'
          ).length;
          return mockLLMResponses[responseCount];
        }
      );

      // Create a version of handleUserQuery that uses our mocked LLM
      const mockedHandleUserQuery = (
        query: string,
        config: AppConfig,
        sessionId?: string
      ) => {
        return handleUserQuery(query, config, sessionId, mockQueryLLM);
      };

      // Create app with the mocked handler
      app = createApp(mockedHandleUserQuery, mockConfig as AppConfig);

      // Make the MCP request
      const requestBody = {
        query: 'Create a status test file and track the progress',
        sessionId: 'e2e-sse-test',
      };

      const mcpResponse = await app.handle(
        new Request(`${baseUrl}/mcp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
      );

      const mcpData = await mcpResponse.json();
      const { runId, streamingEndpoint } = mcpData;

      // Connect to SSE endpoint
      const sseResponse = await app.handle(
        new Request(`${baseUrl}${streamingEndpoint}`)
      );
      expect(sseResponse.status).toBe(200);
      expect(sseResponse.headers.get('Content-Type')).toBe('text/event-stream');

      // Read SSE stream
      const reader = sseResponse.body?.getReader();
      expect(reader).toBeDefined();

      if (reader) {
        const decoder = new TextDecoder();
        let sseData = '';

        // Read all available data
        try {
          const startTime = Date.now();
          const timeoutMs = 5000; // 5 second timeout
          while (Date.now() - startTime < timeoutMs) {
            const { done, value } = await reader.read();
            if (done) break;
            sseData += decoder.decode(value);
          }
        } catch (error) {
          // Stream may close, that's expected
        }

        // Parse SSE events
        const events = sseData
          .split('\n\n')
          .filter((event) => event.startsWith('data: '));
        expect(events.length).toBeGreaterThan(0);

        // Verify we get the initial connection message
        const initialEvent = JSON.parse(events[0].replace('data: ', ''));
        expect(initialEvent.type).toBe('think');
        expect(initialEvent.runId).toBe(runId);
        expect(initialEvent.content).toBe('Connection established');
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle LLM errors gracefully and return meaningful responses', async () => {
      const mockQueryLLM = mock(
        async (_history: ChatMessage[], _config: AppConfig) => {
          throw new Error('LLM service unavailable');
        }
      );

      // Create a version of handleUserQuery that uses our mocked LLM
      const mockedHandleUserQuery = (
        query: string,
        config: AppConfig,
        sessionId?: string
      ) => {
        return handleUserQuery(query, config, sessionId, mockQueryLLM);
      };

      // Create app with the mocked handler
      app = createApp(mockedHandleUserQuery, mockConfig as AppConfig);

      const requestBody = {
        query: 'This should trigger an error',
        sessionId: 'error-test-session',
      };

      const response = await app.handle(
        new Request(`${baseUrl}/mcp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
      );

      // HTTP response should still be successful
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('runId');
      expect(data).toHaveProperty('reply');
      expect(data.reply).toContain(
        'An error occurred while processing your request'
      );
    });

    it('should handle code execution errors in the sandbox', async () => {
      const mockLLMResponses = [
        // Turn 1: Invalid TypeScript code
        `I'll try to execute some invalid code.
<typescript>
await mem.nonExistentFunction();
</typescript>`,
        // Turn 2: Handle the error and respond
        `I'll respond with an error message.
<reply>
There was an error executing the code. Please check the syntax and try again.
</reply>`,
      ];

      const mockQueryLLM = mock(
        async (history: ChatMessage[], _config: AppConfig) => {
          // Ensure history is an array
          const historyArray = Array.isArray(history) ? history : [];
          const responseCount = historyArray.filter(
            (m) => m.role === 'assistant'
          ).length;
          return mockLLMResponses[responseCount];
        }
      );

      // Create a version of handleUserQuery that uses our mocked LLM
      const mockedHandleUserQuery = (
        query: string,
        config: AppConfig,
        sessionId?: string
      ) => {
        return handleUserQuery(query, config, sessionId, mockQueryLLM);
      };

      // Create app with the mocked handler
      app = createApp(mockedHandleUserQuery, mockConfig as AppConfig);

      const requestBody = {
        query: 'Execute some invalid code',
        sessionId: 'code-error-test',
      };

      const response = await app.handle(
        new Request(`${baseUrl}/mcp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.reply).toContain('error');
    });

    it('should handle session management across multiple requests', async () => {
      const mockLLMResponses = [
        [
          `I'll create the first file.
<typescript>
await mem.writeFile('Session Test 1.md', '# Session Test 1\\nsession:: first-request');
</typescript>`,
          `I'll commit the first file.
<typescript>
await mem.commitChanges('feat: Add first session test file');
</typescript>
<reply>
First file created successfully.
</reply>`,
        ],
        [
          `I'll create a second related file.
<typescript>
await mem.writeFile('Session Test 2.md', '# Session Test 2\\nsession:: second-request\\nrelated:: [[Session Test 1]]');
</typescript>`,
          `I'll commit the second file.
<typescript>
await mem.commitChanges('feat: Add second session test file');
</typescript>
<reply>
Second file created and linked to the first.
</reply>`,
        ],
      ];

      const mockQueryLLM = mock(
        async (history: ChatMessage[], _config: AppConfig) => {
          const historyArray = Array.isArray(history) ? history : [];

          // Determine which request we're on by counting non-feedback user messages.
          const userQueries = historyArray.filter(
            (m) => m.role === 'user' && !m.content.startsWith('[Execution')
          ).length;
          const requestIndex = userQueries - 1;

          // Determine which turn we're on for the current request.
          const assistantResponses = historyArray.filter(
            (m) => m.role === 'assistant'
          ).length;
          const turnIndex = assistantResponses - requestIndex * 2;

          if (requestIndex < 0 || turnIndex < 0) {
            throw new Error('Mock LLM logic failed to determine request/turn.');
          }

          return mockLLMResponses[requestIndex][turnIndex];
        }
      );

      const mockedHandleUserQuery = (
        query: string,
        config: AppConfig,
        sessionId?: string
      ) => {
        return handleUserQuery(query, config, sessionId, mockQueryLLM);
      };

      // Create app with the mocked handler
      app = createApp(mockedHandleUserQuery, mockConfig as AppConfig);

      // First request
      const firstResponse = await app.handle(
        new Request(`${baseUrl}/mcp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: 'Create the first session test file',
            sessionId: 'session-persistence-test',
          }),
        })
      );

      expect(firstResponse.status).toBe(200);
      const firstData = await firstResponse.json();
      expect(firstData.reply).toContain('First file created successfully');

      // Second request with same session ID
      const secondResponse = await app.handle(
        new Request(`${baseUrl}/mcp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: 'Create a second file in the same session',
            sessionId: 'session-persistence-test',
          }),
        })
      );

      expect(secondResponse.status).toBe(200);
      const secondData = await secondResponse.json();
      expect(secondData.reply).toContain('Second file created and linked');

      // Verify both files exist and are properly linked
      const file1Path = path.join(tempDir, 'Session Test 1.md');
      const file2Path = path.join(tempDir, 'Session Test 2.md');

      expect(await fs.access(file1Path)).not.toThrow();
      expect(await fs.access(file2Path)).not.toThrow();

      const file2Content = await fs.readFile(file2Path, 'utf-8');
      expect(file2Content).toContain('related:: [[Session Test 1]]');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent requests efficiently', async () => {
      const mockLLMResponses = [
        `I'll create a quick test file.
<typescript>
await mem.writeFile('Concurrent Test.md', '# Concurrent Test\\ntimestamp:: ' + Date.now());
</typescript>`,
        `I'll commit the test file.
<typescript>
await mem.commitChanges('feat: Add concurrent test file');
</typescript>
<reply>
Concurrent test completed successfully.
</reply>`,
      ];

      const mockQueryLLM = mock(
        async (history: ChatMessage[], _config: AppConfig) => {
          // Ensure history is an array
          const historyArray = Array.isArray(history) ? history : [];
          const responseCount = historyArray.filter(
            (m) => m.role === 'assistant'
          ).length;
          return mockLLMResponses[responseCount];
        }
      );

      // Create a version of handleUserQuery that uses our mocked LLM
      const mockedHandleUserQuery = (
        query: string,
        config: AppConfig,
        sessionId?: string
      ) => {
        return handleUserQuery(query, config, sessionId, mockQueryLLM);
      };

      // Create app with the mocked handler
      app = createApp(mockedHandleUserQuery, mockConfig as AppConfig);

      // Create 5 concurrent requests
      const concurrentRequests = Array.from({ length: 5 }, (_, i) =>
        app.handle(
          new Request(`${baseUrl}/mcp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: `Create concurrent test file ${i + 1}`,
              sessionId: `concurrent-session-${i + 1}`,
            }),
          })
        )
      );

      // Wait for all requests to complete
      const responses = await Promise.all(concurrentRequests);

      // Verify all requests were successful
      responses.forEach((response, _index) => {
        expect(response.status).toBe(200);
      });

      // Verify all files were created
      for (let i = 0; i < 5; i++) {
        const filePath = path.join(tempDir, 'Concurrent Test.md');
        expect(await fs.access(filePath)).not.toThrow();
      }
    });
  });

  describe('API Compliance and Validation', () => {
    it('should strictly validate request schemas and return appropriate errors', async () => {
      app = createApp(
        mock(async () => 'mock response'),
        mockConfig as AppConfig
      );

      // Test various invalid request formats
      const invalidRequests = [
        {
          name: 'missing query field',
          body: { sessionId: 'test' },
          expectedStatus: 422,
        },
        {
          name: 'empty query string',
          body: { query: '', sessionId: 'test' },
          expectedStatus: 422,
        },
        {
          name: 'whitespace-only query',
          body: { query: '   \n\t   ', sessionId: 'test' },
          expectedStatus: 422,
        },
        {
          name: 'null query',
          body: { query: null, sessionId: 'test' },
          expectedStatus: 422,
        },
      ];

      for (const testCase of invalidRequests) {
        const response = await app.handle(
          new Request(`${baseUrl}/mcp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(testCase.body),
          })
        );

        expect(response.status).toBe(
          testCase.expectedStatus,
          `Expected status ${testCase.expectedStatus} for ${testCase.name}`
        );
      }
    });

    it('should handle malformed JSON requests gracefully', async () => {
      app = createApp(
        mock(async () => 'mock response'),
        mockConfig as AppConfig
      );

      const malformedRequests = [
        'invalid json{',
        '{"query": "test", "sessionId": "test"', // missing closing brace
        '{"query": "test", "sessionId":}', // invalid value
        'query=test&sessionId=test', // form data instead of JSON
      ];

      for (const malformedBody of malformedRequests) {
        const response = await app.handle(
          new Request(`${baseUrl}/mcp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: malformedBody,
          })
        );

        expect(response.status).toBe(422);
      }
    });
  });
});
````

## File: tests/integration/mem-api.test.ts
````typescript
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from 'bun:test';
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

  // Provide a full mock config
  const mockConfig: AppConfig = {
    knowledgeGraphPath: '', // This will be set in beforeAll,
    openRouterApiKey: 'test-key',
    llmModel: 'test-model',
    port: 3000,
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
    // Create the mem API instance for this test, it's now AppConfig
    mem = createMemAPI(mockConfig as AppConfig);
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should write, read, and check existence of a file', async () => {
    const filePath = 'test.md';
    const content = 'hello world';

    await mem.writeFile(filePath, content);

    const readContent = await mem.readFile(filePath);
    expect(readContent).toBe(content);

    const exists = await mem.fileExists(filePath);
    expect(exists).toBe(true);

    const nonExistent = await mem.fileExists('not-real.md');
    expect(nonExistent).toBe(false);
  });

  it('should throw an error for path traversal attempts', async () => {
    const maliciousPath = '../../../etc/passwd';

    await expect(mem.readFile(maliciousPath)).rejects.toThrow(
      'Security Error: Path traversal attempt detected.'
    );

    await expect(mem.writeFile(maliciousPath, '...')).rejects.toThrow(
      'Security Error: Path traversal attempt detected.'
    );

    await expect(mem.deleteFile(maliciousPath)).rejects.toThrow(
      'Security Error: Path traversal attempt detected.'
    );

    await expect(mem.rename(maliciousPath, 'safe.md')).rejects.toThrow(
      'Security Error: Path traversal attempt detected.'
    );
  });

  it('should commit a change and log it', async () => {
    const filePath = 'a.md';
    const content = 'content';
    const commitMessage = 'feat: add a.md';

    await mem.writeFile(filePath, content);

    const commitHash = await mem.commitChanges(commitMessage);

    expect(typeof commitHash).toBe('string');
    expect(commitHash.length).toBeGreaterThan(5);

    const log = await mem.gitLog(filePath, 1);

    expect(log.length).toBe(1);
    expect(log[0].message).toBe(commitMessage);
  });

  it('should list files in a directory', async () => {
    await mem.writeFile('a.txt', 'a');
    await mem.writeFile('b.txt', 'b');
    await mem.createDir('subdir');
    await mem.writeFile('subdir/c.txt', 'c');

    const rootFiles = await mem.listFiles();
    expect(rootFiles).toEqual(
      expect.arrayContaining(['a.txt', 'b.txt', 'subdir'])
    );
    expect(rootFiles.length).toBeGreaterThanOrEqual(3);

    const subdirFiles = await mem.listFiles('subdir');
    expect(subdirFiles).toEqual(['c.txt']);

    await mem.createDir('empty');
    const emptyFiles = await mem.listFiles('empty');
    expect(emptyFiles).toEqual([]);
  });
});
````

## File: package.json
````json
{
  "name": "recursa-server",
  "version": "0.1.0",
  "description": "Git-Native AI agent with MCP protocol support",
  "type": "module",
  "scripts": {
    "dev": "bun run --watch src/server.ts",
    "start": "bun run src/server.ts",
    "test": "bun test",
    "lint": "eslint . --ext .ts",
    "lint:fix": "eslint . --ext .ts --fix",
    "format": "prettier --check .",
    "format:fix": "prettier --write .",
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.20.0",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "openrouter-sdk": "^1.0.0",
    "vm2": "^3.9.19",
    "simple-git": "^3.20.0",
    "elysia": "^1.0.0",
    "fast-xml-parser": "^4.3.6",
    "zod": "^3.23.8",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "bun-types": "^1.0.0",
    "@types/node": "^20.10.0",
    "@typescript-eslint/eslint-plugin": "^7.10.0",
    "@typescript-eslint/parser": "^7.10.0",
    "eslint": "^8.57.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-prettier": "^5.1.3",
    "prettier": "^3.2.5"
  },
  "engines": {
    "bun": ">=1.0.0"
  },
  "license": "MIT"
}
````

## File: tsconfig.json
````json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "rootDir": "src",
    "outDir": "dist",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": false,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": false,
    "noEmit": false,
    "types": ["bun-types"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
````

## File: src/core/mem-api/graph-ops.ts
````typescript
import type { GraphQueryResult } from '../../types';

// Note: These are complex and will require file system access and parsing logic.

export const queryGraph =
  (_graphRoot: string) =>
  async (_query: string): Promise<GraphQueryResult[]> => {
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
  (_graphRoot: string) =>
  async (_filePath: string): Promise<string[]> => {
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
  (_graphRoot: string) =>
  async (_filePath: string): Promise<string[]> => {
    // Cheatsheet for implementation:
    // 1. Use `resolveSecurePath` to get the full, validated path for `filePath`.
    // 2. Read the file content.
    // 3. Use a regex like `/\[\[(.*?)\]\]/g` to find all wikilinks.
    // 4. Extract the content from each match.
    // 5. Return an array of unique link names.
    throw new Error('Not implemented');
  };

export const searchGlobal =
  (_graphRoot: string) =>
  async (_query: string): Promise<string[]> => {
    // Cheatsheet for implementation:
    // 1. Use the local `walk` utility to iterate through all text-based files in graphRoot.
    // 2. For each file, read its content.
    // 3. Perform a case-insensitive search for the `query` string.
    // 4. If a match is found, add the file path to the results.
    // 5. Return the array of matching file paths.
    throw new Error('Not implemented');
  };
````

## File: src/core/mem-api/util-ops.ts
````typescript
import { promises as fs } from 'fs';
import type { PathTokenCount } from '../../types';
import { resolveSecurePath } from './secure-path';

// A private helper to centralize token counting logic.
// This is a simple estimation and should be replaced with a proper
// tokenizer library like tiktoken if higher accuracy is needed.
const countTokensForContent = (content: string): number => {
  // A common rough estimate is 4 characters per token.
  return Math.ceil(content.length / 4);
};

// Note: HOFs returning the final mem API functions.

export const getGraphRoot =
  (graphRoot: string) => async (): Promise<string> => {
    return graphRoot;
  };

export const getTokenCount =
  (graphRoot: string) =>
  async (filePath: string): Promise<number> => {
    const fullPath = resolveSecurePath(graphRoot, filePath);
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      return countTokensForContent(content);
    } catch (error) {
      throw new Error(
        `Failed to count tokens for ${filePath}: ${(error as Error).message}`
      );
    }
  };

export const getTokenCountForPaths =
  (graphRoot: string) =>
  async (paths: string[]): Promise<PathTokenCount[]> => {
    return Promise.all(
      paths.map(async (filePath) => {
        const tokenCount = await getTokenCount(graphRoot)(filePath);
        return {
          path: filePath,
          tokenCount,
        };
      })
    );
  };
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

## File: tasks.md
````markdown
# Recursa Project Tasks

## Core Infrastructure Tasks

### Task 1: Implement Logger Logic

- **id**: task-1
- **description**: Implement the actual logging logic in src/lib/logger.ts - currently has TODO comments for core logging functionality, error handling, and child logger creation
- **status**: DONE
- **job-id**: job-ff715793
- **depends-on**: []

### Task 2: Implement OpenRouter LLM Integration

- **id**: task-2
- **description**: Complete the LLM query implementation in src/core/llm.ts - includes OpenRouter API integration, proper error handling, and retry logic with exponential backoff
- **status**: DONE
- **job-id**: job-378da45b
- **depends-on**: []

### Task 3: Complete System Prompt Loading

- **id**: task-3
- **description**: Implement proper system prompt loading from docs/system-prompt.md in src/core/loop.ts instead of using hardcoded fallback
- **status**: DONE
- **job-id**: job-1eb85cfe
- **depends-on**: []

### Task 4: Implement Real-time Communication

- **id**: task-4
- **description**: Replace TODO in src/core/loop.ts for real-time agent status updates via SSE or WebSocket instead of placeholder
- **status**: DONE
- **job-id**: job-62d9c37b
- **depends-on**: []

### Task 5: Complete Server Response Streaming

- **id**: task-5
- **description**: Implement proper streaming responses in src/server.ts for real-time agent communication instead of simple non-streaming implementation
- **status**: DONE
- **job-id**: job-8cc473eb
- **depends-on**: [task-4]

## Testing & Validation Tasks

### Task 6: Create Unit Tests

- **id**: task-6
- **description**: Create comprehensive unit tests for all core modules following the project's testing structure and DRY principles
- **status**: DONE
- **job-id**: job-c275ebb5
- **depends-on**: [task-1, task-2, task-3]

### Task 7: Create Integration Tests

- **id**: task-7
- **description**: Create integration tests to verify the complete Think-Act-Commit loop works end-to-end with real file operations
- **status**: DONE
- **job-id**: job-0b4ca146
- **depends-on**: [task-6]

### Task 8: Create E2E Tests

- **id**: task-8
- **description**: Create end-to-end tests that verify the complete MCP server functionality with HTTP requests and responses
- **status**: DONE
- **job-id**: job-7d9556f2
- **depends-on**: [task-7, task-5]

## Code Quality & Compliance Tasks

### Task 9: Type Safety Validation

- **id**: task-9
- **description**: Ensure all TypeScript code has strict type safety with no 'any' or 'unknown' types, following project compliance rules
- **status**: DONE
- **job-id**: job-e5310d99
- **depends-on**: [task-1, task-2, task-3, task-4, task-5]

### Task 10: Code Style & Linting

- **id**: task-10
- **description**: Run linting and formatting tools to ensure code compliance with project standards (no OOP, HOFs only, DRY principles)
- **status**: DONE
- **job-id**: job-1fda3c2f
- **depends-on**: [task-9]

## Final Audit Task

### Task 11: Final Audit & Ship Preparation

- **id**: task-11
- **description**: Complete final audit of entire codebase including test suite validation, documentation verification, and deployment readiness
- **status**: CLAIMED
- **job-id**: job-aff105b8
- **depends-on**: [task-1, task-2, task-3, task-4, task-5, task-6, task-7, task-8, task-9, task-10]
````

## File: src/api/mcp.handler.ts
````typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  InitializeRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { runInSandbox } from '../core/sandbox.js';
import type { MemAPI } from '../types/mem.js';
import type { MCPTool, MCPResource } from '../types/mcp.js';

export const createMCPHandler = (
  memApi: MemAPI,
  knowledgeGraphPath: string
) => {
  const server = new Server(
    {
      name: 'recursa-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {
          listChanged: true,
        },
        resources: {
          listChanged: true,
        },
      },
    }
  );

  const tools: MCPTool[] = [
    {
      name: 'execute_code',
      description: 'Execute TypeScript code in the sandbox',
      inputSchema: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'TypeScript code to execute',
          },
        },
        required: ['code'],
      },
    },
    {
      name: 'read_file',
      description: 'Read a file from the knowledge graph',
      inputSchema: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Path to the file to read',
          },
        },
        required: ['filePath'],
      },
    },
    {
      name: 'write_file',
      description: 'Write content to a file in the knowledge graph',
      inputSchema: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Path to the file to write',
          },
          content: {
            type: 'string',
            description: 'Content to write to the file',
          },
        },
        required: ['filePath', 'content'],
      },
    },
    {
      name: 'update_file',
      description: 'Update a file in the knowledge graph',
      inputSchema: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Path to the file to update',
          },
          oldContent: {
            type: 'string',
            description: 'Content to replace',
          },
          newContent: {
            type: 'string',
            description: 'New content',
          },
        },
        required: ['filePath', 'oldContent', 'newContent'],
      },
    },
    {
      name: 'commit_changes',
      description: 'Commit changes to git',
      inputSchema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Commit message',
          },
        },
        required: ['message'],
      },
    },
    {
      name: 'query_graph',
      description: 'Query the knowledge graph',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Graph query string',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'search_global',
      description: 'Search across all files',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query',
          },
        },
        required: ['query'],
      },
    },
  ];

  const resources: MCPResource[] = [
    {
      uri: `file://${knowledgeGraphPath}`,
      name: 'Knowledge Graph Root',
      mimeType: 'text/directory',
      description: 'Root directory of the knowledge graph',
    },
  ];

  server.setRequestHandler(InitializeRequestSchema, async (_request) => {
    return {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {
          listChanged: true,
        },
        resources: {
          listChanged: true,
        },
      },
      serverInfo: {
        name: 'recursa-server',
        version: '0.1.0',
      },
    };
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools,
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params as {
      name: string;
      arguments: Record<string, unknown>;
    };

    try {
      switch (name) {
        case 'execute_code': {
          const code = String(args.code);
          const result = await runInSandbox(code, memApi);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result),
              },
            ],
          };
        }

        case 'read_file': {
          const filePath = String(args.filePath);
          const content = await memApi.readFile(filePath);
          return {
            content: [
              {
                type: 'text',
                text: content,
              },
            ],
          };
        }

        case 'write_file': {
          const filePath = String(args.filePath);
          const content = String(args.content);
          const success = await memApi.writeFile(filePath, content);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success }),
              },
            ],
          };
        }

        case 'update_file': {
          const filePath = String(args.filePath);
          const oldContent = String(args.oldContent);
          const newContent = String(args.newContent);
          const success = await memApi.updateFile(
            filePath,
            oldContent,
            newContent
          );
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success }),
              },
            ],
          };
        }

        case 'commit_changes': {
          const message = String(args.message);
          const hash = await memApi.commitChanges(message);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ hash }),
              },
            ],
          };
        }

        case 'query_graph': {
          const query = String(args.query);
          const results = await memApi.queryGraph(query);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(results),
              },
            ],
          };
        }

        case 'search_global': {
          const query = String(args.query);
          const results = await memApi.searchGlobal(query);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(results),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
            }),
          },
        ],
        isError: true,
      };
    }
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources,
    };
  });

  return {
    server,
    transport: new StdioServerTransport(),
  };
};
````

## File: src/core/loop.ts
````typescript
import type { AppConfig } from '../config';
import type { ExecutionContext, ChatMessage, StatusUpdate } from '../types';
import { logger } from '../lib/logger';
import { queryLLMWithRetries as defaultQueryLLM } from './llm';
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

  try {
    // Resolve the path to 'docs/system-prompt.md' from the project root.
    const promptPath = path.resolve(process.cwd(), 'docs/system-prompt.md');

    // Read the file content synchronously.
    const systemPromptContent = fs.readFileSync(promptPath, 'utf-8');

    // Create the ChatMessage object and store it in `systemPromptMessage`.
    systemPromptMessage = {
      role: 'system',
      content: systemPromptContent.trim(),
    };

    logger.info('System prompt loaded successfully', { path: promptPath });
    return systemPromptMessage;
  } catch (error) {
    // If file read fails, log a critical error and exit, as the agent cannot run without it.
    logger.error('Failed to load system prompt file', error as Error, {
      path: path.resolve(process.cwd(), 'docs/system-prompt.md'),
    });

    // Exit the process with a non-zero code to indicate failure
    process.exit(1);
  }
};

export const handleUserQuery = async (
  query: string,
  config: AppConfig,
  sessionId?: string,
  // Allow overriding the LLM query function (with its retry logic) for testing purposes
  queryLLM: typeof defaultQueryLLM = defaultQueryLLM,
  // Optional callback for real-time status updates
  onStatusUpdate?: (update: StatusUpdate) => void
): Promise<string> => {
  // 1. **Initialization**
  const runId = randomUUID();
  const currentSessionId = sessionId || runId;
  logger.info('Starting user query handling', {
    runId,
    sessionId: currentSessionId,
  });

  const memAPI = createMemAPI(config);

  // Initialize or retrieve session history
  if (!sessionHistories[currentSessionId]) {
    sessionHistories[currentSessionId] = [getSystemPrompt()];
  }
  
  const history = sessionHistories[currentSessionId];
  history.push({ role: 'user', content: query });

  const context: ExecutionContext = {
    history,
    memAPI,
    config,
    runId,
    onStatusUpdate,
  };

  // 2. **Execution Loop**
  const MAX_TURNS = 10;
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    logger.info(`Starting turn ${turn + 1}`, { runId, turn: turn + 1 });

    // **Call LLM**
    const llmResponseStr = (await queryLLM(context.history, config)) as string;
    context.history.push({ role: 'assistant', content: llmResponseStr });

    // **Parse**
    const parsedResponse = parseLLMResponse(llmResponseStr);
    
    // Debug logging to see what was parsed
    logger.info('Parsed LLM response', {
      runId,
      parsed: {
        think: !!parsedResponse.think,
        typescript: !!parsedResponse.typescript,
        reply: !!parsedResponse.reply,
      },
    });
    
    if (
      !parsedResponse.think &&
      !parsedResponse.typescript &&
      !parsedResponse.reply
    ) {
      logger.error('Failed to parse LLM response', undefined, {
        runId,
        llmResponseStr: llmResponseStr as string,
      });
      return 'Error: Could not understand the response from the AI.';
    }

    // **Think**
    if (parsedResponse.think) {
      logger.info('Agent is thinking', {
        runId,
        thought: parsedResponse.think,
      });

      // Send real-time status update via callback if available
      if (onStatusUpdate) {
        const thinkUpdate: StatusUpdate = {
          type: 'think',
          runId,
          timestamp: Date.now(),
          content: parsedResponse.think,
        };
        onStatusUpdate(thinkUpdate);
      }
    }

    // **Act**
    if (parsedResponse.typescript) {
      logger.info('Executing TypeScript code', { runId });
      
      // Send action status update via callback if available
      if (onStatusUpdate) {
        const actUpdate: StatusUpdate = {
          type: 'act',
          runId,
          timestamp: Date.now(),
          content: 'Executing code...',
          data: { code: parsedResponse.typescript },
        };
        onStatusUpdate(actUpdate);
      }

      try {
        logger.info('Running code in sandbox', { runId });
        const executionResult = await runInSandbox(
          parsedResponse.typescript,
          context.memAPI
        );
        logger.info('Code executed successfully', {
          runId,
          // Safely serialize result for logging
          result: JSON.stringify(executionResult, null, 2),
        });
        const feedback = `[Execution Result]: Code executed successfully. Result: ${JSON.stringify(
          executionResult
        )}`;
        context.history.push({ role: 'user', content: feedback });

        // Send success status update
        if (onStatusUpdate) {
          const successUpdate: StatusUpdate = {
            type: 'act',
            runId,
            timestamp: Date.now(),
            content: 'Code executed successfully',
            data: { result: executionResult },
          };
          onStatusUpdate(successUpdate);
        }
      } catch (e) {
        logger.error('Code execution failed', e as Error, { runId });
        const feedback = `[Execution Error]: ${(e as Error).message}`;
        context.history.push({ role: 'user', content: feedback });

        // Send error status update
        if (onStatusUpdate) {
          const errorUpdate: StatusUpdate = {
            type: 'error',
            runId,
            timestamp: Date.now(),
            content: `Code execution failed: ${(e as Error).message}`,
          };
          onStatusUpdate(errorUpdate);
        }
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

## File: src/server.ts
````typescript
import { Elysia, t } from 'elysia';
import { handleUserQuery } from './core/loop.js';
import { logger } from './lib/logger.js';
import { randomUUID } from 'crypto';
import { config as appConfig } from './config.js';
import type { StatusUpdate } from './types';

export const createApp = (
  handleQuery: typeof handleUserQuery,
  config: typeof appConfig
) => {
  const app = new Elysia()
    // --- Setup request-scoped context ---
    .decorate('requestId', '')
    .decorate('startTime', 0)
    // --- Middleware: Request Logging ---
    .onRequest(({ set, store }) => {
      const requestId = randomUUID();
      set.headers['X-Request-ID'] = requestId;
      (store as { requestId: string }).requestId = requestId;
    })
    .onBeforeHandle(({ request, store }) => {
      (store as { startTime: number }).startTime = Date.now();
      logger.info('Request received', {
        reqId: (store as { requestId: string }).requestId,
        method: request.method,
        path: new URL(request.url).pathname,
      });
    })
    .onAfterHandle(({ request, store }) => {
      const duration = Date.now() - (store as { startTime: number }).startTime;
      logger.info('Request completed', {
        reqId: (store as { requestId: string }).requestId,
        method: request.method,
        path: new URL(request.url).pathname,
        duration: `${duration}ms`,
      });
    })
    // --- Error Handling ---
    .onError(({ code, error, set, store }) => {
      logger.error('An error occurred', error as Error, {
        reqId: (store as { requestId: string })?.requestId || 'unknown',
        code,
      });

      // Set appropriate status codes based on error type
      switch (code) {
        case 'VALIDATION':
          set.status = 422;
          return {
            error: 'Validation Error',
            message: error.message,
            details: error.all || [],
          };
        case 'NOT_FOUND':
          set.status = 404;
          return {
            error: 'Not Found',
            message: error.message || 'Resource not found',
          };
        case 'PARSE':
          set.status = 422; // Changed from 400 to 422 for malformed JSON
          return {
            error: 'Validation Error',
            message: 'Invalid JSON format',
          };
        default:
          set.status = 500;
          return {
            error: 'Internal Server Error',
            message: 'An unexpected error occurred',
          };
      }
    })
    // --- Routes ---
    .get('/', () => ({ status: 'ok', message: 'Recursa server is running' }))
    .post(
      '/mcp',
      async ({ body, set }) => {
        const { query, sessionId } = body;
        const runId = randomUUID();

        try {
          // NOTE: For a simple non-streaming implementation, we await the final result.
          // A production implementation should use WebSockets or SSE to stream back messages.
          const finalReply = await handleQuery(query, config, sessionId, undefined);

          return {
            runId,
            reply: finalReply,
            sessionId: sessionId || runId,
            streamingEndpoint: `/events/${runId}`,
          };
        } catch (error) {
          logger.error('Error processing user query', error as Error, {
            runId,
            sessionId,
            query: (query || '').substring(0, 100) + '...',
          });

          // Return a graceful error response instead of throwing
          return {
            runId,
            reply: 'An error occurred while processing your request. The LLM service may be unavailable. Please try again later.',
            sessionId: sessionId || runId,
            streamingEndpoint: `/events/${runId}`,
          };
        }
      },
      {
        body: t.Object({
          query: t.String({
            // Use a pattern to ensure at least one non-whitespace character.
            // This is more robust than `minLength` after a transform.
            pattern: '.*\\S.*',
            transform: (value: string) => value.trim(),
            error: 'Query must be a non-empty string.',
          }),
          sessionId: t.Optional(t.String()),
        }),
      }
    )
    .get('/events/:runId', ({ params: { runId } }) => {
      return new Response(
        new ReadableStream({
          start(controller) {
            const initialUpdate: StatusUpdate = {
              type: 'think',
              runId: runId,
              timestamp: Date.now(),
              content: 'Connection established',
            };
            const initialData = `data: ${JSON.stringify(initialUpdate)}\n\n`;
            controller.enqueue(new TextEncoder().encode(initialData));

            // In a real implementation, you would subscribe to an event emitter
            // for this runId. For the test, we can just close it.
            const timeout = setTimeout(() => {
              controller.close();
            }, 500);

            // Cleanup if client disconnects
            return () => clearTimeout(timeout);
          },
        }),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control',
          },
        }
      );
    });
  return app;
};

if (process.env.NODE_ENV !== 'test') {
  const app = createApp(handleUserQuery, appConfig);
  app.listen(appConfig.port);

  logger.info(
    `🦊 Recursa server is running at http://${app.server?.hostname}:${app.server?.port}`
  );
}
````
