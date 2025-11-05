# Recursa: The Git-Native Memory Layer for Local-First LLMs

**[Project Status: Active Development] [View System Prompt] [Report an Issue]**

**TL;DR:** Recursa gives your AI a perfect, auditable memory that lives and grows in your local filesystem. It's an open-source MCP server that uses your **Logseq/Obsidian graph** of nested markdown/org-mode blocks as a dynamic, version-controlled knowledge base. Your AI's brain becomes a plaintext repository you can `grep`, `edit`, and `commit`.

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
*   **Plaintext Supremacy:** The AI's brain is a folder of markdown files. It's human-readable, universally compatible with tools like Obsidian and Logseq, and free from vendor lock-in. It understands that knowledge lives in **nested blocks with properties**, not just flat files.
*   **Think-Act-Commit Loop:** The agent reasons internally, generates TypeScript to modify its memory graph, executes it in a sandbox, and commits the result with a descriptive message. This is a transparent, auditable cognitive cycle validated against an org-mode AST.

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

## Project Structure

Recursa is organized with a clean, production-ready structure to make it easy to navigate and contribute to.

```
recursa/
├── .env                # Local environment variables (API keys, paths)
├── package.json        # Project dependencies and scripts
├── tsconfig.json       # TypeScript compiler configuration
├── src/
│   ├── api/            # Handles incoming requests (e.g., from your chat client)
│   │   └── mcp.handler.ts
│   ├── core/           # Core application logic
│   │   ├── Sandbox.ts  # The secure sandbox for executing LLM-generated code
│   │   └── MemAPI.ts   # Implementation of the `mem` object and its tools
│   ├── services/       # Connectors to external services
│   │   ├── Git.ts      # Wrappers for executing local Git commands
│   │   └── Llm.ts      # Logic for communicating with the LLM API (OpenRouter)
│   ├── types/          # Shared TypeScript type definitions
│   └── server.ts       # Main application entry point that starts the server
├── .gitignore
├── readme.md           # You are here!
└── tools.md            # Detailed documentation of the `mem` API for the LLM
```

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
<think>
The affiliation does not exist. I will create a new file for it, and then create the file for Dr. Thorne, linking to the new affiliation page. I'll use Logseq/org-mode block syntax for both files.
</think>
<tool_call>
<typescript>
const orgPath = 'AI Research Institute.md';
const orgExists = await mem.fileExists(orgPath);

if (!orgExists) {
  await mem.writeFile(
    orgPath,
    '- AI Research Institute\n  - type:: organization'
  );
}

// The agent uses valid Logseq/org-mode syntax, treating blocks as first-class citizens.
await mem.writeFile(
  'Dr. Aris Thorne.md',
  '- Dr. Aris Thorne\n  - type:: person\n  - affiliation:: [[AI Research Institute]]\n  - field:: [[Symbolic Reasoning]]'
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

## More Than Just CRUD: Advanced Workflows

Recursa agents can perform complex operations beyond simple file creation.

### Variant 1: Query-Driven Batch Update

**User:** "Tag all people who work in symbolic reasoning as #priority-contact."

**LLM Response:**
```xml
<think>
Okay, I'll find all people associated with symbolic reasoning and add the #priority-contact tag.
</think>
<typescript>
const results = await mem.queryGraph('(property field [[Symbolic Reasoning]])');
for (const result of results) {
  let content = await mem.readFile(result.filePath);
  // Note: A real implementation might use a more robust AST parser.
  // This is a simplified example for clarity.
  const newContent = content.trim() + '\n  - tags:: #priority-contact';
  await mem.updateFile(result.filePath, content, newContent);
}
</typescript>
```

### Variant 2: In-place Refactoring

**User:** "Rename the 'field' property to 'specialty' everywhere."

**LLM Response:**
```xml
<think>
Sure, I'll refactor the property 'field' to 'specialty' across the entire knowledge base.
</think>
<typescript>
const allFiles = await mem.listFiles();
const mdFiles = allFiles.filter(f => f.endsWith('.md'));

for (const file of mdFiles) {
  const content = await mem.readFile(file);
  // Using a simple regex for this example.
  if (content.includes('field::')) {
    const newContent = content.replace(/(\s+-\s+field::)/g, '$1specialty::');
    await mem.updateFile(file, content, newContent);
  }
}
</typescript>
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
