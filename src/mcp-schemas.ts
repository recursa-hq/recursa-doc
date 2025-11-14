import { z } from 'zod';

// A map of MemAPI function names to their Zod parameter schemas.
// This provides strong typing and validation for all exposed MCP tools.
export const memApiSchemas: Record<string, z.ZodObject<any>> = {
  // Core File I/O
  readFile: z.object({ filePath: z.string() }),
  writeFile: z.object({ filePath: z.string(), content: z.string() }),
  updateFile: z.object({
    filePath: z.string(),
    oldContent: z.string(),
    newContent: z.string(),
  }),
  deletePath: z.object({ filePath: z.string() }),
  rename: z.object({ oldPath: z.string(), newPath: z.string() }),
  fileExists: z.object({ filePath: z.string() }),
  createDir: z.object({ directoryPath: z.string() }),
  listFiles: z.object({ directoryPath: z.string().optional() }),

  // Git-Native Operations
  gitDiff: z.object({
    filePath: z.string(),
    fromCommit: z.string().optional(),
    toCommit: z.string().optional(),
  }),
  gitLog: z.object({
    filePath: z.string().optional(),
    maxCommits: z.number().optional(),
  }),
  getChangedFiles: z.object({}),
  commitChanges: z.object({ message: z.string() }),

  // Intelligent Graph Operations
  queryGraph: z.object({ query: z.string() }),
  getBacklinks: z.object({ filePath: z.string() }),
  getOutgoingLinks: z.object({ filePath: z.string() }),
  searchGlobal: z.object({ query: z.string() }),

  // State Management
  saveCheckpoint: z.object({}),
  revertToLastCheckpoint: z.object({}),
  discardChanges: z.object({}),

  // Utility
  getGraphRoot: z.object({}),
  getTokenCount: z.object({ filePath: z.string() }),
  getTokenCountForPaths: z.object({ paths: z.array(z.string()) }),
};