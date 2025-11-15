# TOOLS.md: Recursa Sandboxed API (`mem` Object)

The Large Language Model is granted access to the `mem` object, which contains a suite of asynchronous methods for interacting with the local knowledge graph and the underlying Git repository.

**All methods are asynchronous (`Promise<T>`) and MUST be called using `await`.**

## Category 1: Core File & Directory Operations

These are the fundamental building blocks for manipulating the Logseq/Obsidian graph structure.

| Method               | Signature                                                                      | Returns             | Description                                                                                                                                                                                                                                                                                                                              |
| :------------------- | :----------------------------------------------------------------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`mem.readFile`**   | `(filePath: string): Promise<string>`                                          | `Promise<string>`   | Reads and returns the full content of the specified file.                                                                                                                                                                                                                                                                                |
| **`mem.writeFile`**  | `(filePath: string, content: string): Promise<boolean>`                        | `Promise<boolean>`  | Creates a new file at the specified path with the given content. Automatically creates any necessary parent directories. **Note:** For files ending in `.md`, the content is automatically validated against Logseq/Org-mode block format rules. An error will be thrown if validation fails.                       |
| **`mem.updateFile`** | `(filePath: string, oldContent: string, newContent: string): Promise<boolean>` | `Promise<boolean>`  | **Performs an atomic Compare-and-Swap.** Replaces the entire file content with `newContent` ONLY IF the current content exactly matches `oldContent`. This prevents race conditions and overwriting other changes. **Usage:** Read a file, transform its content in your code, then call `updateFile` with the original and new content. **Note:** For files ending in `.md`, the `newContent` is automatically validated against Logseq/Org-mode block format rules. An error will be thrown if validation fails. |
| **`mem.deletePath`** | `(filePath: string): Promise<boolean>`                                         | `Promise<boolean>`  | Deletes the specified file or directory recursively.                                                                                                                                                                                                                                                                                     |
| **`mem.rename`**     | `(oldPath: string, newPath: string): Promise<boolean>`                         | `Promise<boolean>`  | Renames or moves a file or directory. Used for refactoring.                                                                                                                                                                                                                                                                              |
| **`mem.fileExists`** | `(filePath: string): Promise<boolean>`                                         | `Promise<boolean>`  | Checks if a file exists.                                                                                                                                                                                                                                                                                                                 |
| **`mem.createDir`**  | `(directoryPath: string): Promise<boolean>`                                    | `Promise<boolean>`  | Creates a new directory, including any necessary nested directories.                                                                                                                                                                                                                                                                     |
| **`mem.listFiles`**  | `(directoryPath?: string): Promise<string[]>`                                  | `Promise<string[]>` | Lists all files and directories (non-recursive) within a path, or the root if none is provided.                                                                                                                                                                                                                                          |

---

## Category 2: Git-Native Operations (Auditing & Versioning)

These tools leverage the Git repository tracking the knowledge graph, allowing the agent to audit its own memory and understand historical context.

| Method                    | Signature                                                                                              | Returns               | Description                                                                                                                                               |
| :------------------------ | :----------------------------------------------------------------------------------------------------- | :-------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`mem.gitDiff`**         | `(filePath: string, fromCommit?: string, toCommit?: string): Promise<string>`                          | `Promise<string>`     | Gets the `git diff` output for a specific file between two commits (or HEAD/WORKTREE if not specified). **Crucial for understanding how a page evolved.** |
| **`mem.gitLog`**          | `(filePath: string, maxCommits: number = 5): Promise<{hash: string, message: string, date: string}[]>` | `Promise<LogEntry[]>` | Returns the commit history for a file or the entire repo. Used to understand **when** and **why** a file was last changed.                                |
| **`mem.getChangedFiles`** | `(): Promise<string[]>`                                                                                | `Promise<string[]>`   | Lists all files that have been created, modified, staged, or deleted in the working tree. Provides a complete view of pending changes.                    |
| **`mem.commitChanges`**   | `(message: string): Promise<string>`                                                                   | `Promise<string>`     | **Performs the final `git commit`**. The agent must generate a concise, human-readable commit message summarizing its actions. Returns the commit hash.   |

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
