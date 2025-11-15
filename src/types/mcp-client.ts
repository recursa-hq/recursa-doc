import type { LogEntry } from './git.js';

// Base structure for MCP tool results
export interface MCPToolResult<T> {
  _meta?: Record<string, unknown>;
  content: T;
}

// Specific tool result types
export type GitLogResult = MCPToolResult<LogEntry[]>;
export type FileOperationResult = MCPToolResult<boolean | string>;
export type ListFilesResult = MCPToolResult<string[]>;

// Tool result union for type narrowing
export type MCPToolResultUnion =
  | GitLogResult
  | FileOperationResult
  | ListFilesResult
  | MCPToolResult<unknown>;

// Tool interface for listTools response
export interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ListToolsResponse {
  tools: MCPTool[];
}