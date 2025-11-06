export interface GitOptions {
  baseDir?: string;
}

export interface GitCommitHistory {
  hash: string;
  message: string;
  date: string;
  author: string;
}

export interface GitDiffResult {
  additions: number;
  deletions: number;
  patch: string;
}

export interface GitStatus {
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

export type GitCommand =
  | 'init'
  | 'add'
  | 'commit'
  | 'status'
  | 'log'
  | 'diff'
  | 'branch';
