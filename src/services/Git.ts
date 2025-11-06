import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import type { GitCommitHistory, GitOptions } from '../types/git.js';

export const initGitRepo = (
  directory: string,
  options?: GitOptions
): boolean => {
  const baseDir = options?.baseDir ?? directory;

  if (!existsSync(baseDir)) {
    throw new Error(`Directory does not exist: ${baseDir}`);
  }

  try {
    execSync('git init', { cwd: baseDir, stdio: 'ignore' });
    return true;
  } catch (error) {
    throw new Error(`Failed to initialize git repository: ${error}`);
  }
};

export const addFiles = (files: string[], options?: GitOptions): boolean => {
  const baseDir = options?.baseDir;

  if (!baseDir || !existsSync(baseDir)) {
    throw new Error('Invalid base directory');
  }

  try {
    const filePattern =
      files.length === 1 ? files[0] : files.map((f) => `"${f}"`).join(' ');
    execSync(`git add ${filePattern}`, { cwd: baseDir, stdio: 'ignore' });
    return true;
  } catch (error) {
    throw new Error(`Failed to add files to git: ${error}`);
  }
};

export const commitChanges = (
  message: string,
  options?: GitOptions
): string => {
  const baseDir = options?.baseDir;

  if (!baseDir || !existsSync(baseDir)) {
    throw new Error('Invalid base directory');
  }

  try {
    const output = execSync(`git commit -m "${message}"`, {
      cwd: baseDir,
      encoding: 'utf-8',
    });
    const hashMatch = output.match(/\[([a-f0-9]{7,})\s/);
    return hashMatch ? hashMatch[1] : '';
  } catch (error) {
    throw new Error(`Failed to commit changes: ${error}`);
  }
};

export const getGitLog = (
  filePath?: string,
  maxCommits = 10,
  options?: GitOptions
): GitCommitHistory[] => {
  const baseDir = options?.baseDir;

  if (!baseDir || !existsSync(baseDir)) {
    throw new Error('Invalid base directory');
  }

  try {
    const fileArg = filePath ? ` --follow ${filePath}` : '';
    const output = execSync(
      `git log${fileArg} --pretty=format:"%H|%ad|%s|%an" --date=short -n ${maxCommits}`,
      { cwd: baseDir, encoding: 'utf-8' }
    );

    return output
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        const [hash, date, message, author] = line.split('|');
        return {
          hash,
          date,
          message,
          author,
        };
      });
  } catch (error) {
    throw new Error(`Failed to get git log: ${error}`);
  }
};

export const getGitDiff = (
  filePath: string,
  fromCommit?: string,
  toCommit?: string,
  options?: GitOptions
): string => {
  const baseDir = options?.baseDir;

  if (!baseDir || !existsSync(baseDir)) {
    throw new Error('Invalid base directory');
  }

  try {
    const range =
      fromCommit && toCommit ? `${fromCommit}..${toCommit}` : 'HEAD';
    const output = execSync(`git diff ${range} -- "${filePath}"`, {
      cwd: baseDir,
      encoding: 'utf-8',
    });
    return output;
  } catch (error) {
    throw new Error(`Failed to get git diff: ${error}`);
  }
};

export const getStagedFiles = (options?: GitOptions): string[] => {
  const baseDir = options?.baseDir;

  if (!baseDir || !existsSync(baseDir)) {
    throw new Error('Invalid base directory');
  }

  try {
    const output = execSync('git diff --cached --name-only', {
      cwd: baseDir,
      encoding: 'utf-8',
    });
    return output.split('\n').filter((line) => line.trim());
  } catch (error) {
    throw new Error(`Failed to get staged files: ${error}`);
  }
};

export const isGitRepo = (directory: string): boolean => {
  return existsSync(`${directory}/.git`);
};

export const configureGitUser = (
  name: string,
  email: string,
  options?: GitOptions
): boolean => {
  const baseDir = options?.baseDir;

  try {
    if (baseDir && existsSync(baseDir)) {
      execSync(`git config user.name "${name}"`, {
        cwd: baseDir,
        stdio: 'ignore',
      });
      execSync(`git config user.email "${email}"`, {
        cwd: baseDir,
        stdio: 'ignore',
      });
    } else {
      execSync(`git config --global user.name "${name}"`, { stdio: 'ignore' });
      execSync(`git config --global user.email "${email}"`, {
        stdio: 'ignore',
      });
    }
    return true;
  } catch (error) {
    throw new Error(`Failed to configure git user: ${error}`);
  }
};
