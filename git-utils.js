#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getBaseDir() {
  // Try to find the git repository root
  let currentDir = process.cwd();

  while (currentDir !== '/' && !existsSync(join(currentDir, '.git'))) {
    currentDir = join(currentDir, '..');
  }

  if (currentDir === '/' && !existsSync(join(currentDir, '.git'))) {
    throw new Error('Not in a git repository');
  }

  return currentDir;
}

function gitPull(remote = 'origin', branch = 'main') {
  const baseDir = getBaseDir();

  try {
    console.log(`🔄 Pulling from ${remote}/${branch}...`);
    const output = execSync(`git pull ${remote} ${branch}`, {
      cwd: baseDir,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    console.log('✅ Pull successful:');
    console.log(output);
    return true;
  } catch (error) {
    console.error('❌ Pull failed:', error.message);
    return false;
  }
}

function gitPush(remote = 'origin', branch = 'main') {
  const baseDir = getBaseDir();

  try {
    console.log(`🚀 Pushing to ${remote}/${branch}...`);
    const output = execSync(`git push ${remote} ${branch}`, {
      cwd: baseDir,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    console.log('✅ Push successful:');
    console.log(output);
    return true;
  } catch (error) {
    console.error('❌ Push failed:', error.message);
    return false;
  }
}

function gitStatus() {
  const baseDir = getBaseDir();

  try {
    const output = execSync('git status --porcelain', {
      cwd: baseDir,
      encoding: 'utf-8'
    });
    return output.trim();
  } catch (error) {
    throw new Error(`Failed to get git status: ${error.message}`);
  }
}

function hasUnstagedChanges() {
  const status = gitStatus();
  return status.split('\n').some(line => line && !line.startsWith('??'));
}

function hasUntrackedFiles() {
  const status = gitStatus();
  return status.split('\n').some(line => line && line.startsWith('??'));
}

// Command line interface
const [,, command, ...args] = process.argv;

switch (command) {
  case 'pull':
    {
      const remote = args[0] || 'origin';
      const branch = args[1] || 'main';
      gitPull(remote, branch);
    }
    break;

  case 'push':
    {
      const remote = args[0] || 'origin';
      const branch = args[1] || 'main';
      gitPush(remote, branch);
    }
    break;

  case 'status':
    {
      const status = gitStatus();
      if (status) {
        console.log('📁 Git status:');
        console.log(status);
      } else {
        console.log('✅ Working directory is clean');
      }
    }
    break;

  case 'sync':
    {
      console.log('🔄 Syncing with remote...');

      // Check for untracked files
      if (hasUntrackedFiles()) {
        console.log('📝 Adding untracked files...');
        try {
          execSync('git add .', { cwd: getBaseDir(), stdio: 'pipe' });
          console.log('✅ Untracked files added');
        } catch (error) {
          console.error('❌ Failed to add untracked files:', error.message);
          process.exit(1);
        }
      }

      // Check for unstaged changes
      if (hasUnstagedChanges()) {
        console.log('📝 Committing changes...');
        try {
          execSync('git commit -m "Auto-sync commit"', { cwd: getBaseDir(), stdio: 'pipe' });
          console.log('✅ Changes committed');
        } catch (error) {
          // No changes to commit is fine
          if (!error.message.includes('nothing to commit')) {
            console.error('❌ Failed to commit changes:', error.message);
            process.exit(1);
          }
        }
      }

      // Pull latest changes
      if (!gitPull()) {
        process.exit(1);
      }

      // Push local changes
      if (!gitPush()) {
        process.exit(1);
      }

      console.log('✅ Sync completed successfully');
    }
    break;

  default:
    console.log('Usage:');
    console.log('  git-utils.js pull [remote] [branch]  - Pull changes from remote');
    console.log('  git-utils.js push [remote] [branch]  - Push changes to remote');
    console.log('  git-utils.js status                   - Show working directory status');
    console.log('  git-utils.js sync                     - Sync with remote (add, commit, pull, push)');
    console.log('');
    console.log('Defaults: remote=origin, branch=main');
}