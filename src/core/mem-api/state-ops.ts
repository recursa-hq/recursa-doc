import type { SimpleGit } from 'simple-git';

// Note: These functions map to specific git commands for state management.

export const saveCheckpoint =
  (git: SimpleGit) => async (): Promise<boolean> => {
    // 1. Stage all changes: `await git.add('.')`.
    await git.add('.');
    // 2. Save to stash with a message: `await git.stash(['push', '-m', 'recursa-checkpoint'])`.
    await git.stash(['push', '-m', 'recursa-checkpoint']);
    // 3. Return true on success.
    return true;
  };

export const revertToLastCheckpoint =
  (git: SimpleGit) => async (): Promise<boolean> => {
    try {
      // 1. Apply the most recent stash: `await git.stash(['pop'])`.
      // This can fail if the stash is empty, so wrap in a try/catch.
      await git.stash(['pop']);
      return true;
    } catch (error) {
      // If stash is empty, simple-git throws. We can consider this a "success"
      // in that there's nothing to revert to. Or we can re-throw.
      // For now, let's log and return false.
      // eslint-disable-next-line no-console
      console.warn('Could not revert to checkpoint, stash may be empty.');
      return false;
    }
  };

export const discardChanges =
  (git: SimpleGit) => async (): Promise<boolean> => {
    // 1. Reset all tracked files: `await git.reset(['--hard', 'HEAD'])`.
    await git.reset(['--hard', 'HEAD']);
    // 2. Remove all untracked files and directories: `await git.clean('f', ['-d'])`.
    await git.clean('f', ['-d']);
    // 3. Return true on success.
    return true;
  };