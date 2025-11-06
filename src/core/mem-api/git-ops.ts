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
