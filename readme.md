# Kortex AI: The Git-Native Memory Layer for Local-First LLMs

**[Project Status: Active Development] [View System Prompt] [Report an Issue]**

**TL;DR:** Kortex gives your AI a perfect, auditable memory that lives and grows in your local filesystem. It's an open-source MCP server that uses your **Logseq/Obsidian graph** as a dynamic, version-controlled knowledge base. Your AI's brain becomes a plaintext repository you can `grep`, `edit`, and `commit`.

Forget wrestling with databases or opaque cloud APIs. This is infrastructure-free, plaintext-first memory for agents that *create*.

---

## The Status Quo is a Dead End

You're building an intelligent agent and have hit the memory wall. The industry's current solutions are fundamentally flawed:

1.  **Vector DBs (RAG):** A read-only librarian. It can find facts but is structurally incapable of *creating new knowledge*, *forming novel connections*, or *evolving its understanding* based on new interactions.
2.  **Opaque Self-Hosted Engines:** You're lured by "open source" but are now a part-time DevOps engineer, managing Docker containers, configuring databases, and debugging opaque states instead of focusing on your agent's core intelligence.
3.  **Black-Box APIs:** You trade infrastructure pain for a vendor's prison. Your AI's memory is locked away, inaccessible to your tools, and impossible to truly audit or understand.

Kortex is built on a different philosophy: **Your AI's memory should be a dynamic, transparent, and versionable extension of its own thought process, running entirely on your machine.**

## The Architecture: A Local Reasoning Engine for Your Knowledge Graph

Kortex is not a database. It is a local, stateless reasoning engine that operates on your plaintext files. The source of truth is a folder of markdown files on your filesystem, ideally tracked in Git.

```mermaid
graph TD
    subgraph Your Local Machine
        A[AI Chat Client <br> e.g., Claude Desktop]
        B[Kortex MCP Server <br> (This Project)]
        C(Logseq/Obsidian Graph <br> /path/to/your/notes/)
        
        A -- 1. User Query via MCP --> B
        B -- 2. Think-Act Loop --> D{LLM API <br> (OpenRouter)}
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

1.  **Query via MCP:** Your chat client (e.g., Claude Desktop) sends a message to the local Kortex server.
2.  **Think-Act Loop:** Kortex begins its reasoning cycle. It sends the query and relevant file contents to your chosen LLM via OpenRouter.
3.  **Generate & Execute Code:** The LLM responds not with an answer, but with a **TypeScript snippet** inside `<typescript>` tags. Kortex executes this code in a secure sandbox.
4.  **Interact with Files:** The sandboxed code uses a safe `mem` API to read, create, and modify markdown files directly in your knowledge graph.
5.  **Reply:** Once the task is complete, the LLM generates a final `<reply>` which Kortex forwards to your client.

## Plaintext Supremacy: Your Knowledge Graph as Code

Your AI's memory is a living directory of markdown files, fully compatible with **Logseq**, **Obsidian**, and the entire text-based tooling ecosystem. It's not just structured; it's emergent.

**Example: An Agent's Personal Journal and Entity Map (`/your-graph/pages/`)**
An agent is tasked with researching "Hierarchical Memory Decomposition."

`journal/2025-11-01.md`:
```markdown
- 10:45 AM: User asked me to research a new topic: "Hierarchical Memory Decomposition".
  - Created a new entity file for this concept at [[concepts/hmd]].
  - Initial finding: It relates to cognitive science and AI memory systems.
```
`concepts/hmd.md` (new file created by the agent):
```markdown
# Hierarchical Memory Decomposition (HMD)
type:: concept
category:: AI Architecture
related:: [[vector databases]], [[Dr. Eva Thorne]]

- ## Core Idea
  - Breaks down memories into different types (semantic, episodic, etc.) rather than a single flat vector space.
- ## Key Proponents
  - Dr. Eva Thorne is a prominent researcher in this area. Creating an entity file for her at [[Dr. Eva Thorne]].
```
`Dr. Eva Thorne.md` (another new file created on the fly):
```markdown
# Dr. Eva Thorne
type:: person
affiliation:: AI Research Institute

- ## Known For
  - Pioneering work in Hierarchical Memory Decomposition.```
The agent dynamically builds its knowledge graph as it learns. Your AI's brain is a browsable, searchable, and editable digital garden you control.

## 🚀 Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18 or higher)
*   A local [Logseq](https://logseq.com/) or [Obsidian](https://obsidian.md/) graph (a folder of `.md` files)
*   An [OpenRouter.ai](https://openrouter.ai/) API Key

### 1. Installation

```bash
git clone https://github.com/your-username/kortex-ai.git
cd kortex-ai
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

## The Think-Act Loop in Action

**Scenario:** An agent is asked to learn about a new person.

**1. User Query:**
"I just had a call with a Dr. Aris Thorne from the AI Research Institute. He works on symbolic reasoning. Create a new entry for him and link it to his affiliation."

**2. Real-time Reasoning (Internal LLM <-> Kortex Dialogue):**

**Turn 1: LLM Output**
```xml
<think>
I need to create a new file for 'Dr. Aris Thorne'. First, I'll check if an entity for the 'AI Research Institute' already exists to avoid duplication.
</think>
<typescript>
const orgExists = await mem.fileExists('AI Research Institute.md');
</typescript>
```
**Turn 1: Kortex Result to LLM**
```xml
<result>
{ "orgExists": false }
</result>
```

**Turn 2: LLM Output**
```xml
<think>
The affiliation does not exist. I will create a new file for it, and then create the file for Dr. Thorne, linking to the new affiliation page.
</think>
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
**Turn 2: Kortex Result to LLM**
```xml
<result>
{ "success": true }
</result>
```

**Turn 3: LLM Final Reply**
```xml
<think>
I have successfully created both pages. I can now confirm this with the user.
</think>
<typescript></typescript>
<reply>
Done. I've created pages for both Dr. Aris Thorne and the AI Research Institute and linked them.
</reply>
```

## Kortex vs. The Alternatives: A Philosophical Divide

| Feature                       | **Kortex AI (This Project)**               | Traditional Self-Hosted (DB-based)      | Vector DB (RAG)           |
| ----------------------------- | ------------------------------------------ | --------------------------------------- | ------------------------- |
| **Data Model**                | **Plaintext (Git-native)**                 | Opaque Database (SQLite/Postgres)       | Opaque Vector Index       |
| **Core Operation**            | **Symbolic Reasoning & Graph Generation**  | Vector Similarity Search                | Vector Similarity Search  |
| **Dynamic Creation**          | ✅ **First-class Citizen**                 | ❌ Not designed for this                | ❌ Impossible             |
| **Explainability**            | ✅ **Full Reasoning Trace**                | Opaque (similarity scores)              | Opaque (similarity scores) |
| **DevOps Overhead**           | ✅ **Low (`npm start`)**                   | **High** (DBs, Docker, etc.)            | Low (if managed)          |
| **Vendor Lock-in**            | ✅ **Impossible (It's your files)**        | High (database schema)                  | High (proprietary index)  |

## 🧑‍💻 For Developers

Kortex is designed to be hacked on. The core logic is split into:

*   `src/mcp-server.ts`: The main server entry point.
*   `src/agent.ts`: Orchestrates the Think-Act-Reply loop with the LLM.
*   `src/sandbox.ts`: Implements the secure sandbox for executing LLM-generated TypeScript.
*   `system_prompt.txt`: The agent's constitution. **Modify this to change your agent's brain.**

---

### Adding New Tools

To add a new tool (e.g., `mem.searchFiles(query)`):

1.  Implement the function's logic in `src/sandbox.ts`.
2.  Expose the new function on the `mem` object passed to the sandboxed environment.
3.  Update `system_prompt.txt` to document the new function and provide examples of how the LLM should use it.

## 📜 License

This project is licensed under the MIT License. See the `LICENSE` file for details

**Stop building infrastructure. Start building intelligence.**