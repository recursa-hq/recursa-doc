// Based on MCP Specification

// --- Requests ---
export interface MCPRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: unknown;
}

export interface InitializeParams {
  processId?: number;
  clientInfo: {
    name: string;
    version: string;
    [key: string]: unknown;
  };
  capabilities: Record<string, unknown>;
}

// --- Responses ---
export interface MCPResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

// --- Tooling ---
export interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
  [key: string]: unknown;
}

export interface ListToolsResult {
  tools: MCPTool[];
}

// --- Notifications ---
export interface MCPNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}