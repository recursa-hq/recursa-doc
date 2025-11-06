# Directory Structure
```
docs/
  readme.md
  rules.md
  system-prompt.md
  tools.md
repo/
  flow.todo.md
src/
  core/
    mem-api/
      file-ops.ts
      git-ops.ts
      graph-ops.ts
      index.ts
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

## File: src/core/mem-api/file-ops.ts
````typescript
import { promises as fs } from 'fs';
import path from 'path';

// Note: Each function here is a HOF that takes dependencies (like graphRoot)
// and returns the actual function to be exposed on the mem API.

// A crucial utility to prevent path traversal attacks.
// The LLM should never be able to access files outside the knowledge graph.
const resolveSecurePath = (graphRoot: string, userPath: string): string => {
  const resolvedPath = path.resolve(graphRoot, userPath);
  if (!resolvedPath.startsWith(graphRoot)) {
    throw new Error('Security Error: Path traversal attempt detected.');
  }
  return resolvedPath;
};

// TODO: Implement readFile
// export const readFile = (graphRoot: string) => async (filePath: string): Promise<string> => {
//   const securePath = resolveSecurePath(graphRoot, filePath); ...
// }

// TODO: Implement writeFile
// - Ensure `path.dirname` is used with `fs.mkdir({ recursive: true })`
//   to create parent directories.
// export const writeFile = (graphRoot: string) => async (filePath:string, content: string): Promise<boolean> => { ... }

// TODO: Implement updateFile
// - This should be atomic: read, replace, then write.
// export const updateFile = (graphRoot: string) => async (filePath: string, oldContent: string, newContent: string): Promise<boolean> => { ... }

// TODO: Implement deleteFile, rename, fileExists, createDir, listFiles
// - All must use `resolveSecurePath`.
````

## File: src/core/mem-api/git-ops.ts
````typescript
import type { SimpleGit } from 'simple-git';
import type { LogEntry } from '../../types';

// Note: These functions take a pre-configured simple-git instance.

// TODO: Implement gitDiff
// export const gitDiff = (git: SimpleGit) => async (filePath: string, fromCommit?: string, toCommit?: string): Promise<string> => { ... }

// TODO: Implement gitLog
// export const gitLog = (git: SimpleGit) => async (filePath: string, maxCommits: number = 5): Promise<LogEntry[]> => { ... }

// TODO: Implement gitStagedFiles
// export const gitStagedFiles = (git: SimpleGit) => async (): Promise<string[]> => { ... }

// TODO: Implement commitChanges
// export const commitChanges = (git: SimpleGit) => async (message: string): Promise<string> => { ... }
````

## File: src/core/mem-api/graph-ops.ts
````typescript
import type { QueryResult } from '../../types';

// Note: These are complex and will require file system access and parsing logic.

// TODO: Implement queryGraph
// export const queryGraph = (graphRoot: string) => async (query: string): Promise<QueryResult[]> => { ... }
// - This needs a parser for the query syntax described in tools.md.
// - It will involve reading multiple files and checking their content.

// TODO: Implement getBacklinks
// export const getBacklinks = (graphRoot: string) => async (filePath: string): Promise<string[]> => { ... }
// - Search all .md files for `[[fileName]]`.

// TODO: Implement getOutgoingLinks
// export const getOutgoingLinks = (graphRoot: string) => async (filePath: string): Promise<string[]> => { ... }
// - Read the given file and parse all `[[...]]` links.

// TODO: Implement searchGlobal
// export const searchGlobal = (graphRoot: string) => async (query: string): Promise<string[]> => { ... }
// - A simple text search across all files. Could use `grep` or a JS implementation.
````

## File: src/core/mem-api/index.ts
````typescript
import type { MemAPI } from '../../types';
import type { AppConfig } from '../../config';
import simpleGit from 'simple-git';

// import * as fileOps from './file-ops';
// import * as gitOps from './git-ops';
// import * as graphOps from './graph-ops';
// import * as stateOps from './state-ops';
// import * as utilOps from './util-ops';

// TODO: Create a HOF that takes the AppConfig (especially KNOWLEDGE_GRAPH_PATH)
// and returns the complete, fully-functional MemAPI object.
// export const createMemAPI = (config: AppConfig): MemAPI => { ... }
// - Initialize simple-git with the knowledge graph path.
// - Each function in the returned MemAPI object will be a partially applied HOF,
//   pre-configured with necessary context (like the graph path or git instance).
// - This is the core of the HOF pattern for this module.
````

## File: src/core/mem-api/state-ops.ts
````typescript
import type { SimpleGit } from 'simple-git';

// Note: These functions map to specific git commands for state management.

// TODO: Implement saveCheckpoint
// export const saveCheckpoint = (git: SimpleGit) => async (): Promise<boolean> => { ... }
// - This should stage all changes (`git add .`) and then create a stash (`git stash push`).

// TODO: Implement revertToLastCheckpoint
// export const revertToLastCheckpoint = (git: SimpleGit) => async (): Promise<boolean> => { ... }
// - This should apply the most recent stash (`git stash pop`).

// TODO: Implement discardChanges
// export const discardChanges = (git: SimpleGit) => async (): Promise<boolean> => { ... }
// - This should perform a hard reset (`git reset --hard`) and clean untracked files (`git clean -fd`).
````

## File: src/core/mem-api/util-ops.ts
````typescript
import type { PathTokenCount } from '../../types';
// Potentially import a tokenizer library like 'tiktoken'

// Note: HOFs returning the final mem API functions.

// TODO: Implement getGraphRoot
// export const getGraphRoot = (graphRoot: string) => async (): Promise<string> => { ... }
// - Simply returns the graphRoot path it was configured with.

// TODO: Implement getTokenCount
// export const getTokenCount = (graphRoot: string) => async (filePath: string): Promise<number> => { ... }
// - Read file content and use a tokenizer to count tokens.

// TODO: Implement getTokenCountForPaths
// export const getTokenCountForPaths = (graphRoot: string) => async (paths: string[]): Promise<PathTokenCount[]> => { ... }
// - Efficiently read multiple files and return their token counts.
````

## File: src/core/llm.ts
````typescript
import type { AppConfig } from '../config';

// TODO: Create a function to call the OpenRouter API.
// export const queryLLM = async (prompt: string, config: AppConfig): Promise<string> => { ... }
// - It should construct a request to the OpenRouter completions endpoint.
// - It should include the system prompt and the user query in the payload.
// - Use the model and API key from the config.
// - Handle API errors gracefully.
// - Return the string content of the LLM's response.
// - Use native `fetch`.
````

## File: src/core/loop.ts
````typescript
import type { AppConfig } from '../config';
import type { ExecutionContext, ChatMessage } from '../types';
// import { logger } from '../lib/logger';
// import { queryLLM } from './llm';
// import { parseLLMResponse } from './parser';
// import { runInSandbox } from './sandbox';
// import { createMemAPI } from './mem-api';

// TODO: Define the main Think-Act-Commit loop handler. This is the orchestrator.
// export const handleUserQuery = async (query: string, config: AppConfig, sessionId?: string) => { ... }
// - This function manages the entire lifecycle of a user request.

// 1. **Initialization**
//    - Generate a unique `runId` for this request for logging/tracing.
//    - Create the `memAPI` instance using `createMemAPI(config)`.
//    - Retrieve or initialize the conversation `history` for the given `sessionId`.
//      - The history should always start with the system prompt.
//    - Add the current user `query` to the history.
//    - Create the `ExecutionContext` object.

// 2. **Execution Loop**
//    - Use a `for` loop with a maximum number of turns (e.g., 10) to prevent infinite loops.
//    - **Call LLM**: `const llmResponseStr = await queryLLM(context.history, config);`
//    - Add the LLM's raw response to the history.
//    - **Parse**: `const parsedResponse = parseLLMResponse(llmResponseStr);`
//      - If parsing fails, return an error to the user.
//    - **Think**: If `parsedResponse.think` exists, send this status update to the client (e.g., via a callback or event emitter).
//    - **Act**: If `parsedResponse.typescript` exists:
//      - `const executionResult = await runInSandbox(parsedResponse.typescript, context.memAPI);`
//      - Create a summary of the result (e.g., "Code executed successfully." or "Error: ...")
//        and add it as a new 'user' message to the history to give the LLM feedback for the next turn.
//    - **Reply**: If `parsedResponse.reply` exists, this is the final turn.
//      - Break the loop and return `parsedResponse.reply` to the user.

// 3. **Termination**
//    - If the loop finishes without a `<reply>`, return a default message like "The agent finished its work without providing a final response."
//    - Store the updated conversation history for the `sessionId`.
````

## File: src/core/parser.ts
````typescript
import { XMLParser } from 'fast-xml-parser';
import type { ParsedLLMResponse } from '../types';

// TODO: Create a function to parse the LLM's XML-like response string.
// export const parseLLMResponse = (response: string): ParsedLLMResponse => { ... }
// - It should handle the specific XML structure (<think>, <typescript>, <reply>).
// - It needs to be robust to variations in whitespace and formatting.
// - Use fast-xml-parser with appropriate options.
// - Return a ParsedLLMResponse object.
````

## File: src/core/sandbox.ts
````typescript
import { VM } from 'vm2';
import type { MemAPI } from '../types';
// import { logger } from '../lib/logger';

// TODO: Create a function to execute LLM-generated TypeScript in a secure sandbox.
// export const runInSandbox = async (code: string, memApi: MemAPI): Promise<any> => { ... }
// - Instantiate a new VM from `vm2`.
// - **Security**: Configure the VM to be as restrictive as possible.
//   - `wasm: false` - Disable WebAssembly.
//   - `eval: false` - Disable `eval` within the sandbox.
//   - `fixAsync: true` - Ensures `async` operations are handled correctly.
//   - `timeout: 10000` - Set a 10-second timeout to prevent infinite loops.
//   - `sandbox`: The global scope. It should ONLY contain the `mem` object.
//   - `builtin`: Whitelist only necessary built-ins (e.g., 'crypto' for randomUUID if needed),
//     but default to an empty array `[]` to deny access to `fs`, `child_process`, etc.
//
// - The `code` should be wrapped in an `async` IIFE (Immediately Invoked Function Expression)
//   to allow the use of top-level `await` for `mem` calls.
//   Example wrapper: `(async () => { ${code} })();`
//
// - Use a try-catch block to handle errors from the sandboxed code.
//   - Log errors using the structured logger for observability.
//   - Re-throw a sanitized error or return an error object to the agent loop.
//
// - Capture and return the result of the execution.
````

## File: src/lib/logger.ts
````typescript
// TODO: Implement a simple, structured logger.
// - It could use a library like `pino` or just `console` with formatting.
// - It should support different log levels (info, warn, error, debug).
// - Log entries should ideally be JSON for easier parsing by log collectors.
// - It should be a singleton or a set of HOFs to ensure consistent logging across the app.

// Example interface:
type Logger = {
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, error?: Error, context?: Record<string, unknown>) => void;
  debug: (message: string, context?: Record<string, unknown>) => void;
};

// export const createLogger = (): Logger => ({ ... });
// export const logger = createLogger();
````

## File: src/config.ts
````typescript
import 'dotenv/config';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';

// TODO: Define a Zod schema for environment variables for robust validation.
const configSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1, 'OPENROUTER_API_KEY is required.'),
  KNOWLEDGE_GRAPH_PATH: z.string().min(1, 'KNOWLEDGE_GRAPH_PATH is required.'),
  LLM_MODEL: z.string().default('anthropic/claude-3-sonnet-20240229'),
  PORT: z.coerce.number().int().positive().default(3000),
});

// TODO: Define the final, typed configuration object.
export type AppConfig = {
  openRouterApiKey: string;
  knowledgeGraphPath: string;
  llmModel: string;
  port: number;
};

// TODO: Create a function to load, parse, and validate environment variables.
// export const loadAndValidateConfig = (): AppConfig => { ... }
// - Use `configSchema.safeParse(process.env)` to validate.
// - If validation fails, log the errors and exit the process.
// - After parsing, perform runtime checks:
//   - Ensure KNOWLEDGE_GRAPH_PATH is an absolute path. If not, resolve it.
//   - Ensure the path exists and is a directory. If not, throw a clear error.
// - Return a frozen, typed config object mapping the env vars to friendlier names.
//   (e.g., OPENROUTER_API_KEY -> openRouterApiKey)

// Example of final export:
// export const config: AppConfig = loadAndValidateConfig();
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
import { describe, it, expect } from 'bun:test';
// import { handleUserQuery } from '../../src/core/loop';

// TODO: Write end-to-end tests that simulate a full user interaction.
describe('Agent End-to-End Workflow', () => {
  // NOTE: Per the rules ("no mocks"), these tests are challenging.
  // The strategy should be to test the loop logic with pre-defined,
  // static LLM responses to ensure the orchestration works as expected
  // without hitting a live API.

  it('should correctly handle the Dr. Aris Thorne example from the docs', async () => {
    // 1. Setup a test environment with a temporary knowledge graph.
    // 2. Mock the LLM client to return the first XML response from the docs on the first call.
    // 3. Mock the LLM client to return the second (commit) XML on the second call.
    // 4. Call `handleUserQuery` with the initial prompt.
    // 5. Assert that the correct files ('Dr. Aris Thorne.md', etc.) were created.
    // 6. Assert that `git commit` was called with the correct message.
    // 7. Assert that the final reply matches the one from the docs.
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
// import { createMemAPI } from '../../src/core/mem-api';
// import { AppConfig } from '../../src/config';

// TODO: Write integration tests for the MemAPI against a real temporary directory.
describe('MemAPI Integration Tests', () => {
  let tempDir: string;
  // let mem: MemAPI;

  // TODO: Set up a temporary test directory before all tests.
  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'recursa-test-'));
  });

  // TODO: Initialize a fresh git repo in the temp dir before each test.
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
    // mem = createMemAPI({ knowledgeGraphPath: tempDir, ...mockConfig });
  });

  // TODO: Clean up the temporary directory after all tests.
  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // TODO: Write a test for writeFile and readFile.
  it('should write and read a file', async () => {
    // await mem.writeFile('test.md', 'hello');
    // const content = await mem.readFile('test.md');
    // expect(content).toBe('hello');
  });

  // TODO: Add a test to prevent path traversal.
  it('should throw an error for path traversal attempts', async () => {
    // await expect(mem.readFile('../../../etc/passwd')).rejects.toThrow();
  });

  // TODO: Write a test for commitChanges and gitLog.
  it('should commit a change and log it', async () => {
    // await mem.writeFile('a.md', 'content');
    // const commitHash = await mem.commitChanges('feat: add a.md');
    // expect(commitHash).toBeString();
    // const log = await mem.gitLog('a.md');
    // expect(log[0].message).toBe('feat: add a.md');
  });
});
````

## File: tests/unit/parser.test.ts
````typescript
import { describe, it, expect } from 'bun:test';
// import { parseLLMResponse } from '../../src/core/parser';

// TODO: Write unit tests for the XML parser function.
describe('LLM Response Parser', () => {
  // TODO: Test case for a valid response with all tags.
  it('should parse a full, valid response', () => {
    // const xml = `<think>...</think><typescript>...</typescript><reply>...</reply>`;
    // const result = parseLLMResponse(xml);
    // expect(result).toEqual({ think: '...', typescript: '...', reply: '...' });
  });

  // TODO: Test case for a response with only think and typescript.
  it('should parse a partial response (think/act)', () => {
    // ...
  });

  // TODO: Test case for a response with messy formatting.
  it('should handle extra whitespace and newlines', () => {
    // ...
  });

  // TODO: Test case for a response with missing tags.
  it('should return an object with undefined for missing tags', () => {
    // ...
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

## File: repo/flow.todo.md
````markdown
=== DOING

understand everything in docs, then initialize the project by prepare detailed boilerplate across structure. each files should contain only concise // TODO: comments, type signatures, and detailed import statements to serve as a "cheatsheet" for the next AI developer.

again. to save your token cost , do not write complete code per todo, only cheatsheet like method name, params, return type.

all should HOF no OOP

make sure the work is enough to produce production ready blueprint
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

## File: src/server.ts
````typescript
import { Elysia, t } from 'elysia';
// import { config } from './config';
// import { handleUserQuery } from './core/loop';
// import { logger } from './lib/logger';

// TODO: Create the main application instance using a HOF pattern for dependency injection.
// export const createApp = (
//   handleQuery: typeof handleUserQuery,
//   appConfig: typeof config
// ) => {
//   const app = new Elysia();

//   // --- Middleware ---
//   // TODO: Add a request logger middleware.
//   // - Should log method, path, and a request ID.

//   // --- Error Handling ---
//   // TODO: Implement a global error handler.
//   // - It should catch any unhandled errors, log them, and return a
//   //   standardized JSON error response (e.g., { error: 'Internal Server Error' }).
//   // - Distinguish between expected errors (e.g., validation) and unexpected ones.

//   // --- Routes ---
//   // TODO: Define a health check endpoint.
//   app.get('/', () => ({ status: 'ok', message: 'Recursa server is running' }));

//   // TODO: Define the main MCP endpoint.
//   app.post(
//     '/mcp',
//     async ({ body }) => {
//       const { query, sessionId } = body;
//       // Note: This should ideally stream back <think> messages.
//       // For a simple non-streaming implementation, we just await the final result.
//       const finalReply = await handleQuery(query, appConfig, sessionId);
//       return { reply: finalReply };
//     },
//     {
//       // TODO: Add request body validation using Elysia's `t`.
//       body: t.Object({
//         query: t.String({ minLength: 1 }),
//         sessionId: t.Optional(t.String()),
//       }),
//     }
//   );

//   return app;
// };

// TODO: In the main execution block, start the server and handle graceful shutdown.
// const app = createApp(handleUserQuery, config);
// app.listen(config.port, () => {
//   logger.info(`🧠 Recursa server listening on http://localhost:${config.port}`);
// });

// // TODO: Implement graceful shutdown on SIGINT and SIGTERM.
// process.on('SIGINT', () => {
//   logger.info('SIGINT received. Shutting down gracefully.');
//   app.stop();
//   process.exit(0);
// });
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
      "AGENTS.md"
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
