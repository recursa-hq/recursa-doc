# Recursa: The Git-Native Memory Layer for Local-First LLMs

**[Project Status: Active Development] [View System Prompt] [Report an Issue]**

**TL;DR:** Recursa gives your AI a perfect, auditable memory that lives and grows in your local filesystem. It's an open-source MCP server that uses your **Logseq/Obsidian graph** as a dynamic, version-controlled knowledge base. Your AI's brain becomes a plaintext repository you can `grep`, `edit`, and `commit`.

Forget wrestling with databases or opaquWe cloud APIs. This is infrastructure-free, plaintext-first memory for agents that _create_.

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
        A[MCP Client <br> e.g., your script, or a compatible editor]
        B[Recursa MCP Server <br> (This Project)]
        C(Logseq/Obsidian Graph <br> /path/to/your/notes/)

        A -- 1. User Query via Stdio --> B
        B -- 2. Think-Act-Commit Loop --> D{LLM API <br> (OpenRouter)}
        B -- 3. Executes Sandboxed Code --> C
        C -- 4. Reads/Writes .md files --> C
        B -- 5. Final Reply & Notifications --> A
    end

    subgraph Cloud Service
        D
    end

    style C fill:#e6f3ff,stroke:#333,stroke-width:2px
    style B fill:#fff2cc,stroke:#333,stroke-width:2px
```

1.  **Query via MCP:** Your client application sends a message to the local Recursa server process over standard I/O.
2.  **Think-Act Loop:** Recursa begins its reasoning cycle. It sends the query and relevant file contents to your chosen LLM, sending real-time status updates back to the client.
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
bun run start
```

This starts the Recursa server as a process that listens for MCP messages on its standard input/output. You can now connect any MCP-compatible client to it.

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
