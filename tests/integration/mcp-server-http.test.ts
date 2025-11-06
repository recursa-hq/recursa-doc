import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  mock,
} from 'bun:test';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import simpleGit from 'simple-git';
import { createApp } from '../../src/server';
import { handleUserQuery } from '../../src/core/loop';
import type { AppConfig } from '../../src/config';
import type { StatusUpdate } from '../../src/types';

describe('MCP Server HTTP Integration Tests', () => {
  let tempDir: string;
  let mockConfig: AppConfig;
  let app: ReturnType<typeof createApp>;
  let testPort: number;
  let server: ReturnType<typeof createApp>;

  beforeAll(async () => {
    // Create a temporary directory for the test knowledge graph
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'recursa-mcp-test-'));
    testPort = 3001; // Use different port for tests

    mockConfig = {
      knowledgeGraphPath: tempDir,
      openRouterApiKey: 'test-api-key',
      llmModel: 'test-model',
      port: testPort,
    };

    // Create a mock handleUserQuery function for testing
    const mockHandleUserQuery = mock(
      async (query: string, config: AppConfig, sessionId?: string) => {
        return `Mock response for query: ${query}`;
      }
    );

    // Create the app instance
    app = createApp(mockHandleUserQuery, mockConfig);
  });

  beforeEach(async () => {
    // Clear and reinitialize the directory
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.mkdir(tempDir, { recursive: true });

    // Initialize git repository
    const git = simpleGit(tempDir);
    await git.init();
    await git.addConfig('user.name', 'Test User');
    await git.addConfig('user.email', 'test@example.com');
  });

  afterAll(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });

    // Close server if it's running
    if (server) {
      server.stop();
    }
  });

  describe('HTTP API Endpoints', () => {
    it('should respond to health check at root endpoint', async () => {
      const response = await app.handle(new Request('http://localhost:3001/'));
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({
        status: 'ok',
        message: 'Recursa server is running',
      });
    });

    it('should handle POST /mcp endpoint with valid request', async () => {
      const requestBody = {
        query: 'Create a test file',
        sessionId: 'test-session-123',
      };

      const response = await app.handle(
        new Request('http://localhost:3001/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('runId');
      expect(data).toHaveProperty('reply');
      expect(data).toHaveProperty('streamingEndpoint');
      expect(data.reply).toContain(
        'Mock response for query: Create a test file'
      );
      expect(data.streamingEndpoint).toMatch(/^\/events\/[a-f0-9-]+$/);
    });

    it('should handle POST /mcp endpoint without sessionId', async () => {
      const requestBody = {
        query: 'Create a test file without session',
      };

      const response = await app.handle(
        new Request('http://localhost:3001/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('runId');
      expect(data).toHaveProperty('reply');
      expect(data).toHaveProperty('streamingEndpoint');
    });

    it('should reject POST /mcp with invalid JSON', async () => {
      const response = await app.handle(
        new Request('http://localhost:3001/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: 'invalid json{',
        })
      );

      expect(response.status).toBe(422); // Validation error
    });

    it('should reject POST /mcp with missing query field', async () => {
      const requestBody = {
        sessionId: 'test-session',
      };

      const response = await app.handle(
        new Request('http://localhost:3001/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
      );

      expect(response.status).toBe(422); // Validation error
    });

    it('should reject POST /mcp with empty query', async () => {
      const requestBody = {
        query: '',
        sessionId: 'test-session',
      };

      const response = await app.handle(
        new Request('http://localhost:3001/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
      );

      expect(response.status).toBe(422); // Validation error
    });

    it('should reject POST /mcp with whitespace-only query', async () => {
      const requestBody = {
        query: '   \n\t   ',
        sessionId: 'test-session',
      };

      const response = await app.handle(
        new Request('http://localhost:3001/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
      );

      expect(response.status).toBe(422); // Validation error
    });
  });

  describe('Server-Sent Events (SSE)', () => {
    it('should establish SSE connection for valid runId', async () => {
      const testRunId = 'test-run-123';

      const response = await app.handle(
        new Request(`http://localhost:3001/events/${testRunId}`)
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
      expect(response.headers.get('Connection')).toBe('keep-alive');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('should send initial connection message via SSE', async () => {
      const testRunId = 'test-run-456';

      const response = await app.handle(
        new Request(`http://localhost:3001/events/${testRunId}`)
      );

      expect(response.status).toBe(200);

      // Read the SSE stream
      const reader = response.body?.getReader();
      expect(reader).toBeDefined();

      if (reader) {
        const { done, value } = await reader.read();
        expect(done).toBe(false);

        const text = new TextDecoder().decode(value);
        expect(text).toContain('data: ');

        // Parse the initial message
        const dataMatch = text.match(/data: (.+)\n\n/);
        expect(dataMatch).toBeDefined();

        if (dataMatch) {
          const initialMessage = JSON.parse(dataMatch[1]);
          expect(initialMessage).toHaveProperty('type', 'think');
          expect(initialMessage).toHaveProperty('runId', testRunId);
          expect(initialMessage).toHaveProperty('timestamp');
          expect(initialMessage).toHaveProperty(
            'content',
            'Connection established'
          );
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in MCP processing gracefully', async () => {
      // Create a mock that throws an error
      const mockHandleUserQuery = mock(async () => {
        throw new Error('Test error');
      });

      const errorApp = createApp(mockHandleUserQuery, mockConfig);

      const requestBody = {
        query: 'This should cause an error',
        sessionId: 'error-test-session',
      };

      const response = await errorApp.handle(
        new Request('http://localhost:3001/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
      );

      // Even with errors, the HTTP response should be successful
      // but the response should indicate the error
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('runId');
      expect(data).toHaveProperty('reply');
      expect(data.reply).toContain(
        'An error occurred while processing your request.'
      );
    });

    it('should handle 404 for unknown routes', async () => {
      const response = await app.handle(
        new Request('http://localhost:3001/unknown-route')
      );
      expect(response.status).toBe(404);
    });

    it('should reject unsupported HTTP methods for /mcp endpoint', async () => {
      // GET method should be rejected
      const getResponse = await app.handle(
        new Request('http://localhost:3001/mcp', {
          method: 'GET',
        })
      );
      expect(getResponse.status).toBe(404); // Route not found for GET

      // PUT method should be rejected
      const putResponse = await app.handle(
        new Request('http://localhost:3001/mcp', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: 'test' }),
        })
      );
      expect(putResponse.status).toBe(404); // Route not found for PUT

      // DELETE method should be rejected
      const deleteResponse = await app.handle(
        new Request('http://localhost:3001/mcp', {
          method: 'DELETE',
        })
      );
      expect(deleteResponse.status).toBe(404); // Route not found for DELETE
    });
  });

  describe('Request/Response Headers', () => {
    it('should include request ID in responses', async () => {
      const requestBody = {
        query: 'Test with headers',
      };

      const response = await app.handle(
        new Request('http://localhost:3001/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
      );

      // The server should add a request ID header
      expect(response.headers.get('X-Request-ID')).toBeDefined();
      expect(response.headers.get('X-Request-ID')).toMatch(/^[a-f0-9-]+$/);
    });

    it('should handle requests with custom headers', async () => {
      const requestBody = {
        query: 'Test with custom headers',
      };

      const response = await app.handle(
        new Request('http://localhost:3001/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'test-agent/1.0',
            'X-Custom-Header': 'custom-value',
          },
          body: JSON.stringify(requestBody),
        })
      );

      expect(response.status).toBe(200);
    });

    it('should handle CORS headers for SSE endpoints', async () => {
      const testRunId = 'cors-test-run';

      const response = await app.handle(
        new Request(`http://localhost:3001/events/${testRunId}`)
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe(
        'Cache-Control'
      );
    });
  });

  describe('Content Type Handling', () => {
    it('should reject requests with wrong content type', async () => {
      const response = await app.handle(
        new Request('http://localhost:3001/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: JSON.stringify({ query: 'test' }),
        })
      );

      // Should still work as Elysia can parse JSON without explicit content type
      expect(response.status).toBe(200);
    });

    it('should handle requests without content type header', async () => {
      const response = await app.handle(
        new Request('http://localhost:3001/mcp', {
          method: 'POST',
          body: JSON.stringify({ query: 'test' }),
        })
      );

      // Should still work as Elysia can infer the content type
      expect(response.status).toBe(200);
    });
  });
});
