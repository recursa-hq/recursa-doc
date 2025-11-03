# Directory Structure
```
.gitignore
flow.todo.md
readme.md
relay.config.json
repomix.config.json
tools.md
```

# Files

## File: tools.md
````markdown
You are absolutely correct. True "Git-Native" memory requires exposing Git operations to the agent, and "intelligent graph operations" are essential to move beyond file-level thinking to *knowledge-level* thinking. The agent should be able to reason about the graph, not just the files.

Since the **Recursa** server is entirely local and built on TypeScript/Node.js, we can integrate with a local Git executable and a graph parsing library (which we'll assume exists in the environment).

Here is the final, comprehensive `TOOLS.md` for the Recursa sandboxed execution environment.

---

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

## Category 4: Utility & Diagnostics

General-purpose operations for the sandbox environment.

| Method | Signature | Returns | Description |
| :--- | :--- | :--- | :--- |
| **`mem.getGraphRoot`** | `(): Promise<string>` | `Promise<string>` | Returns the absolute path of the root directory of the knowledge graph (the `KNOWLEDGE_GRAPH_PATH` from the `.env`). |
| **`mem.getMemoryUsage`** | `(): Promise<number>` | `Promise<number>` | Returns the total size of the knowledge graph directory in bytes. |

### Tool Execution Flow Philosophy

The LLM MUST understand that all actions are ultimately intended to lead to one or more `mem.updateFile` or `mem.writeFile` calls, followed by a **single** `mem.commitChanges` at the end of a successful thought process.

```typescript
// Example LLM Thought Process

const content = await mem.readLink('user');
// ... logic to parse and determine old/new content ...
const success = await mem.updateFile('user.md', oldContent, newContent);

if (success) {
    const hash = await mem.commitChanges('feat: recorded user name and updated user profile link');
} else {
    // ... logic to handle error ...
}
```
````

## File: .gitignore
````
# relay state
# /.relay/
````

## File: flow.todo.md
````markdown
- add project structure
- add token to tools
````

## File: readme.md
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

## The Recursa Philosophy: Git-Native Memory

Recursa isn't a database; it's a reasoning engine. It treats a local directory of plaintext files—ideally a Git repository—as the agent's primary memory.

*   **Git-Native:** Every change, every new idea, every retracted thought is a `git commit`. You get a perfect, auditable history of your agent's learning process. You can branch its memory, merge concepts, and revert to previous states.
*   **Plaintext Supremacy:** The AI's brain is a folder of markdown files. It's human-readable, universally compatible with tools like Obsidian and Logseq, and free from vendor lock-in.
*   **Think-Act-Commit Loop:** The agent reasons, generates code to modify its memory files, executes it in a sandbox, and commits the result with a descriptive message. This is a transparent, auditable cognitive cycle.

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
3.  **Generate & Execute Code:** The LLM responds not with a simple answer, but with a **TypeScript snippet**. Recursa executes this code in a secure sandbox.
4.  **Interact with Files:** The sandboxed code uses a safe `mem` API to read, create, and modify markdown files directly in your knowledge graph.
5.  **Commit & Reply:** Once the task is complete, the agent commits its changes with a meaningful message and generates a final reply for the user.

## An Agent in Action: Example Workflow

**Scenario:** An agent is asked to learn about a new person.

**1. User Query:**
"I just had a call with a Dr. Aris Thorne from the AI Research Institute. He works on symbolic reasoning. Create a new entry for him and link it to his affiliation."

**2. Real-time Reasoning (Internal LLM <-> Recursa Dialogue):**

**Turn 1: LLM Output**
```xml
<tool_call>
I need to create a new file for 'Dr. Aris Thorne'. First, I'll check if an entity for the 'AI Research Institute' already exists to avoid duplication.
<tool_call>
<typescript>
const orgExists = await mem.fileExists('AI Research Institute.md');
</typescript>
```
**Turn 1: Recursa Result to LLM**
```xml
<result>
{ "orgExists": false }
</result>
```

**Turn 2: LLM Output**
```xml
<tool_call>
The affiliation does not exist. I will create a new file for it, and then create the file for Dr. Thorne, linking to the new affiliation page.
<tool_call>
<typescript>
await mem.writeFile(
  'AI Research Institute.md',
  '# AI Research Institute\ntype:: organization\n'
);
await mem.writeFile(
  'Dr. Aris Thorne.md',
  '# Dr. Aris Thorne\ntype:: person\naffiliation:: [[AI Research Institute]]\nfield:: Symbolic Reasoning'
);
</typescript>
```
**Turn 2: Recursa Result to LLM**
```xml
<result>
{ "success": true }
</result>
```

**Turn 3: LLM Output**
```xml
<tool_call>
I have successfully created both pages and they are stored in the knowledge graph. I'll now commit these changes with a clear message and then confirm completion with the user.
</tool_response>
<typescript>
await mem.commitChanges('feat: Add Dr. Aris Thorne and AI Research Institute entities');
</typescript>
<reply>
Done. I've created pages for both Dr. Aris Thorne and the AI Research Institute and linked them.
</reply>
```

## Recursa vs. The Alternatives: A Philosophical Divide

| Feature                       | **Recursa (This Project)**                 | Traditional Self-Hosted (DB-based)      | Vector DB (RAG)           |
| ----------------------------- | ------------------------------------------ | --------------------------------------- | ------------------------- |
| **Data Model**                | **Plaintext (Git-native)**                 | Opaque Database (SQLite/Postgres)       | Opaque Vector Index       |
| **Core Operation**            | **Symbolic Reasoning & Graph Generation**  | Vector Similarity Search                | Vector Similarity Search  |
| **Dynamic Creation**          | ✅ **First-class Citizen**                 | ❌ Not designed for this                | ❌ Impossible             |
| **Explainability**            | ✅ **Full Reasoning Trace (`git log`)**    | Opaque (similarity scores)              | Opaque (similarity scores) |
| **DevOps Overhead**           | ✅ **Low (`npm start`)**                   | **High** (DBs, Docker, etc.)            | Low (if managed)          |
| **Vendor Lock-in**            | ✅ **Impossible (It's your files)**        | High (database schema)                  | High (proprietary index)  |


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
LLM_MODEL="openai/gpt-oss-20b"
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

1.  Implement the function's logic in `src/sandbox.ts`.
2.  Expose the new function on the `mem` object passed to the sandboxed environment.
3.  Update `TOOLS.md` and the system prompt to document the new function and provide examples of how the LLM should use it.
4.  Open a Pull Request!

## 📜 License

This project is licensed under the MIT License. See the `LICENSE` file for details

**Stop building infrastructure. Start building intelligence.**
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
    "customPatterns": [".relay/"]
  },
  "security": {
    "enableSecurityCheck": true
  },
  "tokenCount": {
    "encoding": "o200k_base"
  }
}
````
