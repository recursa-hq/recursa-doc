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