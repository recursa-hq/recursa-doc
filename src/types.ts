// --- LLM & Agent Interaction ---

// The structured data parsed from the LLM's XML-like response.
export type ParsedLLMResponse = {
  think?: string;
  typescript?: string;
  reply?: string;
};

// Represents a single message in the conversation history with the LLM.
export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

// --- Knowledge Graph & Git ---

// Structure for a single Git log entry.
export type LogEntry = {
  hash: string;
  message: string;
  date: string;
};

// Structure for a graph query result.
export type QueryResult = {
  filePath: string;
  matches: string[];
};

// Structure for token count results for multiple paths.
export type PathTokenCount = {
  path: string;
  tokenCount: number;
};

// --- API & Server ---

// The expected JSON body for incoming requests to the MCP server.
export type McpRequest = {
  query: string;
  // Optional: A session ID to maintain conversation context between requests.
  sessionId?: string;
};

// Real-time status update types
export type StatusUpdate = {
  type: 'think' | 'act' | 'error' | 'complete';
  runId: string;
  timestamp: number;
  content?: string;
  data?: Record<string, unknown>;
};

// The execution context passed through the agent loop.
export type ExecutionContext = {
  // The complete conversation history for this session.
  history: ChatMessage[];
  // The API implementation available to the sandbox.
  memAPI: MemAPI;
  // The application configuration.
  config: import('./config').AppConfig;
  // A unique ID for this execution run.
  runId: string;
  // Optional callback for real-time status updates
  onStatusUpdate?: (update: StatusUpdate) => void;
};

// --- MemAPI Interface (Matches tools.md) ---

// This is the "cheatsheet" for what's available in the sandbox.
// It must be kept in sync with the tools documentation.
export type MemAPI = {
  // Core File I/O
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

  // Git-Native Operations
  gitDiff: (
    filePath: string,
    fromCommit?: string,
    toCommit?: string
  ) => Promise<string>;
  gitLog: (filePath: string, maxCommits?: number) => Promise<LogEntry[]>;
  gitStagedFiles: () => Promise<string[]>;
  commitChanges: (message: string) => Promise<string>;

  // Intelligent Graph Operations
  queryGraph: (query: string) => Promise<QueryResult[]>;
  getBacklinks: (filePath: string) => Promise<string[]>;
  getOutgoingLinks: (filePath: string) => Promise<string[]>;
  searchGlobal: (query: string) => Promise<string[]>;

  // State Management
  saveCheckpoint: () => Promise<boolean>;
  revertToLastCheckpoint: () => Promise<boolean>;
  discardChanges: () => Promise<boolean>;

  // Utility
  getGraphRoot: () => Promise<string>;
  getTokenCount: (filePath: string) => Promise<number>;
  getTokenCountForPaths: (paths: string[]) => Promise<PathTokenCount[]>;
};
