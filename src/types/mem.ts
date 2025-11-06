export interface TokenCount {
  total: number;
  tokens: number;
  characters: number;
}

export interface FileTokenBreakdown {
  filePath: string;
  tokens: number;
  characters: number;
  blocks: number;
}

export interface DirectoryTokenStats {
  totalTokens: number;
  totalFiles: number;
  largestFile: {
    path: string;
    tokens: number;
  };
  averageTokensPerFile: number;
}

export interface GitCommit {
  hash: string;
  message: string;
  date: string;
}

export interface GraphQueryResult {
  filePath: string;
  matches: string[];
}

export interface MemAPI {
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<boolean>;
  updateFile: (
    filePath: string,
    oldContent: string,
    newContent: string
  ) => Promise<boolean>;
  deleteFile: (filePath: string) => Promise<boolean>;
  rename: (oldPath: string, newPath: string) => Promise<boolean>;
  fileExists: (filePath: string) => Promise<boolean>;
  createDir: (directoryPath: string) => Promise<boolean>;
  listFiles: (directoryPath?: string) => Promise<string[]>;

  gitDiff: (
    filePath: string,
    fromCommit?: string,
    toCommit?: string
  ) => Promise<string>;
  gitLog: (filePath: string, maxCommits?: number) => Promise<GitCommit[]>;
  gitStagedFiles: () => Promise<string[]>;
  commitChanges: (message: string) => Promise<string>;

  queryGraph: (query: string) => Promise<GraphQueryResult[]>;
  getBacklinks: (filePath: string) => Promise<string[]>;
  getOutgoingLinks: (filePath: string) => Promise<string[]>;
  searchGlobal: (query: string) => Promise<string[]>;

  getGraphRoot: () => Promise<string>;
  getMemoryUsage: () => Promise<number>;

  countFileTokens: (filePath: string) => Promise<TokenCount>;
  countDirectoryTokens: (directoryPath?: string) => Promise<number>;
  getTokenBreakdown: (filePath: string) => Promise<FileTokenBreakdown>;
  estimateReadCost: (filePath: string) => Promise<number>;
  getFilesByTokenSize: (
    directoryPath?: string,
    limit?: number
  ) => Promise<Array<{ filePath: string; tokens: number }>>;
  getDirectoryTokenStats: (
    directoryPath?: string
  ) => Promise<DirectoryTokenStats>;
}
