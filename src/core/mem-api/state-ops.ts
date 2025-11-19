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
      // 0. Check if there is a checkpoint to revert to
      const stash = await git.stashList();
      if (stash.total === 0) {
        console.warn('Could not revert to checkpoint, stash is empty.');
        return false;
      }

      // 1. Discard all current changes (staged, unstaged, and untracked)
      // This prevents conflicts when popping the stash.
      await git.reset(['--hard', 'HEAD']);
      await git.clean('f', ['-d']);

      // 2. Apply the most recent stash: `await git.stash(['pop'])`.
      await git.stash(['pop']);
      return true;
    } catch (error) {
      // If stash pop fails for some other reason (e.g. merge conflict despite clean wd),
      // log it and return false.
      console.warn('Could not revert to checkpoint:', error);
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