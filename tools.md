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
| **`mem.gitLog`** | `(filePath: string, maxCommits: number = 5): Promise<{hash: string, message: string, date: string}[]>` | `Promise<{hash: string, message: string, date: string}[]>` | Returns the commit history for a file or the entire repo. Used to understand **when** and **why** a file was last changed. |
| **`mem.gitStagedFiles`** | `(): Promise<string[]>` | `Promise<string[]>` | Lists files that have been modified and are currently "staged" for the next commit (or the current working tree changes). Useful before a major operation. |
| **`mem.commitChanges`** | `(message: string): Promise<string>` | `Promise<string>` | **Performs the final `git commit`**. The agent must generate a concise, human-readable commit message summarizing its actions. Returns the commit hash. |

---

## Category 3: Intelligent Graph & Semantic Operations

These tools allow the agent to reason about the relationships and structure inherent in Logseq/Org Mode syntax, moving beyond simple file I/O.

| Method | Signature | Returns | Description |
| :--- | :--- | :--- | :--- |
| **`mem.queryGraph`** | `(query: string): Promise<{filePath: string, matches: string[]}[]>` | `Promise<{filePath: string, matches: string[]}[]>` | **Executes a powerful graph query.** Can find pages by property (`key:: value`), links (`[[Page]]`), or block content. Used for complex retrieval. *Example: `(property affiliation:: AI Research Institute) AND (outgoing-link [[Symbolic Reasoning]])`* |
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

## Category 5: Token Counting & Measurement

Token counting and measurement tools to help agents understand token costs and manage context window usage. These tools use the o200k_base encoding (OpenAI's tokenizer) for accurate counting.

### Type Definitions

```typescript
interface TokenCount {
  total: number;
  tokens: number;
  characters: number;
}

interface FileTokenBreakdown {
  filePath: string;
  tokens: number;
  characters: number;
  blocks: number;
}

interface DirectoryTokenStats {
  totalTokens: number;
  totalFiles: number;
  largestFile: {path: string; tokens: number};
  averageTokensPerFile: number;
}
```

| Method | Signature | Returns | Description |
| :--- | :--- | :--- | :--- |
| **`mem.countFileTokens`** | `(filePath: string): Promise<TokenCount>` | `Promise<TokenCount>` | Counts the number of tokens in a single file using o200k_base encoding. Returns token count, character count, and total. |
| **`mem.countDirectoryTokens`** | `(directoryPath?: string): Promise<number>` | `Promise<number>` | Counts the total number of tokens in all files within a directory (recursive). Useful for estimating context size. |
| **`mem.getTokenBreakdown`** | `(filePath: string): Promise<FileTokenBreakdown>` | `Promise<FileTokenBreakdown>` | Provides detailed token breakdown including tokens per block/section for a file. Helps identify large content areas. |
| **`mem.estimateReadCost`** | `(filePath: string): Promise<number>` | `Promise<number>` | Estimates the token cost to read and process a file in an LLM context. Useful for planning batch operations. |
| **`mem.getFilesByTokenSize`** | `(directoryPath?: string, limit?: number): Promise<{filePath: string; tokens: number}[]>` | `Promise<{filePath: string; tokens: number}[]>` | Lists files in a directory sorted by token size (largest first). Helps identify large files that may need chunking. |
| **`mem.getDirectoryTokenStats`** | `(directoryPath?: string): Promise<DirectoryTokenStats>` | `Promise<DirectoryTokenStats>` | Returns comprehensive token statistics for a directory including totals, averages, and largest file. |

### Usage Examples

```typescript
// Check if a file fits within context window
const count = await mem.countFileTokens('large-document.md');
if (count.tokens > 32000) {
  console.log('File too large, consider chunking');
}

// Find largest files before batch processing
const largestFiles = await mem.getFilesByTokenSize('.', 10);
console.log('Top 10 largest files:', largestFiles);

// Get directory statistics for planning
const stats = await mem.getDirectoryTokenStats('./pages');
console.log(`Directory has ${stats.totalTokens} tokens across ${stats.totalFiles} files`);
```

### Token Counting Best Practices

1. **Context Management:** Use `countFileTokens()` before reading large files to avoid exceeding context limits
2. **Batch Planning:** Use `getFilesByTokenSize()` to identify files that need chunking before batch operations
3. **Cost Estimation:** Use `estimateReadCost()` to predict token usage for planned operations
4. **Optimization:** Monitor directory stats to optimize file organization and content chunking

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