import type { SimpleGit } from 'simple-git';

// Note: These functions map to specific git commands for state management.

export const saveCheckpoint =
  (git: SimpleGit) => async (): Promise<boolean> => {
    // 1. Stage all changes except session files to prevent conflicts during stash operations.
    // Use git add . followed by git reset .sessions/ if it exists
    await git.add('.');
    // Check if .sessions directory exists and unstage it
    try {
      await git.raw('ls-files', '.sessions/');
      await git.reset(['.sessions/']);
    } catch {
      // .sessions directory doesn't exist or is empty, which is fine
    }
    // 2. Save to stash with a message: `await git.stash(['push', '-m', 'recursa-checkpoint'])`.
    await git.stash(['push', '-m', 'recursa-checkpoint']);
    // 3. Return true on success.
    return true;
  };

export const revertToLastCheckpoint =
  (git: SimpleGit) => async (): Promise<boolean> => {
    try {
      // Check if there are any stashes before trying to apply
      const stashes = await git.stashList();
      if (stashes.all.length > 0) {
        console.log('Found stash, applying to restore checkpoint...');

        try {
          // Try to apply with --index to preserve untracked files
          await git.stash(['apply', '--index', 'stash@{0}']);
          console.log('Stash applied with --index successfully');
        } catch (applyError) {
          console.log('Stash apply with --index failed, trying without --index:', (applyError as Error).message);

          // If --index fails, try without it
          await git.stash(['apply', 'stash@{0}']);
          console.log('Stash applied without --index successfully');
        }

        // Remove the stash after successful application
        await git.stash(['drop', 'stash@{0}']);

        console.log('Stash applied and dropped successfully');
        return true;
      }
      // No stashes exist, which is not an error state.
      // It just means there's nothing to revert to.
      console.log('No stashes found');
      return false;
    } catch (error) {
      console.warn(
        `Could not revert to checkpoint: ${(error as Error).message}`
      );
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
