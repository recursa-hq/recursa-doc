import type { SimpleGit } from 'simple-git';

// Note: These functions map to specific git commands for state management.

export const saveCheckpoint =
  (_git: SimpleGit) => async (): Promise<boolean> => {
    // Cheatsheet for implementation:
    // 1. Stage all changes: `await git.add('.')`.
    // 2. Save to stash with a message: `await git.stash(['push', '-m', 'recursa-checkpoint'])`.
    // 3. Return true on success.
    throw new Error('Not implemented');
  };

export const revertToLastCheckpoint =
  (_git: SimpleGit) => async (): Promise<boolean> => {
    // Cheatsheet for implementation:
    // 1. Apply the most recent stash: `await git.stash(['pop'])`.
    // 2. This can fail if the stash is empty, so wrap in a try/catch.
    // 3. Return true on success.
    throw new Error('Not implemented');
  };

export const discardChanges =
  (_git: SimpleGit) => async (): Promise<boolean> => {
    // Cheatsheet for implementation:
    // 1. Reset all tracked files: `await git.reset(['--hard', 'HEAD'])`.
    // 2. Remove all untracked files and directories: `await git.clean('f', ['-d'])`.
    // 3. Return true on success.
    throw new Error('Not implemented');
  };
