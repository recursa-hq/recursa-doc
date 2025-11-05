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

---

## Category 5: Token & Credential Management

Secure storage and retrieval of API tokens, credentials, and secrets within the knowledge graph. Tokens are encrypted at rest and associated with metadata for easy organization and management.

| Method | Signature | Returns | Description |
| :--- | :--- | :--- | :--- |
| **`mem.storeToken`** | `(name: string, token: string, metadata?: {service?: string, description?: string, expiresAt?: string}): Promise<boolean>` | `Promise<boolean>` | Stores a new API token or credential securely in the knowledge graph. Metadata is optional but recommended for tracking purposes. |
| **`mem.getToken`** | `(name: string): Promise<{token: string, metadata: {name: string, service?: string, description?: string, createdAt: string, expiresAt?: string}}>` | `Promise<TokenData>` | Retrieves a stored token and its metadata by name. The token is decrypted and returned in plain text for use. |
| **`mem.updateToken`** | `(name: string, token: string, metadata?: {service?: string, description?: string, expiresAt?: string}): Promise<boolean>` | `Promise<boolean>` | Updates an existing token with a new value and/or metadata. Maintains the same encryption and security guarantees. |
| **`mem.deleteToken`** | `(name: string): Promise<boolean>` | `Promise<boolean>` | Permanently removes a token from secure storage. This operation cannot be undone. |
| **`mem.listTokens`** | `(): Promise<{name: string, metadata: {service?: string, description?: string, createdAt: string, expiresAt?: string}}[]>` | `Promise<TokenSummary[]>` | Lists all stored tokens with their metadata (excluding the actual token values for security). Useful for auditing and management. |
| **`mem.rotateToken`** | `(name: string, newToken: string, metadata?: {service?: string, description?: string, expiresAt?: string}): Promise<boolean>` | `Promise<boolean>` | Rotates a token by updating it with a new value. Used for refreshing API keys, OAuth tokens, or implementing security best practices. |

### Token Storage Format

Tokens are stored as encrypted blocks within the knowledge graph, typically in a dedicated `.tokens/` directory. Each token is stored as:

```
# Token: [name]
- type:: credential
- service:: [metadata.service]
- description:: [metadata.description]
- created:: [ISO timestamp]
- expires:: [ISO timestamp or empty]
- token:: [ENCRYPTED_TOKEN]
```

### Security Best Practices

1. **Naming Convention:** Use descriptive names like `openai_api_key`, `github_pat`, `stripe_secret`, etc.
2. **Metadata:** Always include `service` and `description` for easy identification
3. **Rotation:** Use `mem.rotateToken` regularly for long-lived credentials
4. **Expiration:** Include `expiresAt` metadata when tokens have a fixed lifetime
5. **Cleanup:** Use `mem.deleteToken` when tokens are no longer needed

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