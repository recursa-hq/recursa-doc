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
import type { AppConfig } from '../../src/config';
import { handleUserQuery } from '../../src/core/loop';
import type { ChatMessage } from '../../src/types';

describe('MCP Server Complete End-to-End Tests', () => {
  let tempDir: string;
  let mockConfig: AppConfig;
  let app: unknown;
  let testPort: number;
  let baseUrl: string;

  beforeAll(async () => {
    // Create a temporary directory for the test knowledge graph
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'recursa-e2e-test-'));
    testPort = 3002; // Use a unique port for E2E tests

    mockConfig = {
      knowledgeGraphPath: tempDir,
      openRouterApiKey: 'mock-test-api-key',
      llmModel: 'mock-test-model',
      port: testPort,
    };

    baseUrl = `http://localhost:${testPort}`;
  });

  beforeEach(async () => {
    // Clear and reinitialize the directory
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.mkdir(tempDir, { recursive: true });

    // Initialize git repository
    const git = simpleGit(tempDir);
    await git.init();
    await git.addConfig('user.name', 'E2E Test User');
    await git.addConfig('user.email', 'e2e-test@example.com');

    // Create a .gitignore file first
    await fs.writeFile(
      path.join(tempDir, '.gitignore'),
      '*.log\nnode_modules/\n.env'
    );

    await git.add('.gitignore');
    await git.commit('Initial commit');
  });

  afterAll(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('HTTP API Contract Tests', () => {
    it('should handle complete MCP request lifecycle', async () => {
      // Create a mock LLM that simulates the Think-Act-Commit loop
      const mockLLMResponses = [
        // Turn 1: Think and Act
        `I'll create a new person entry for the test subject.
<typescript>
await mem.writeFile('Test Person.md', '# Test Person\\ntype:: person\\nfield:: [[Testing]]\\ncreated:: ' + new Date().toISOString());
</typescript>`,
        // Turn 2: Commit and Reply
        `I'll save the changes to your knowledge base.
<typescript>
await mem.commitChanges('feat: Add Test Person entity');
</typescript>
<reply>
I've successfully created a new entry for Test Person in your knowledge base.
</reply>`,
      ];

      const mockQueryLLM = mock(
        async (history: ChatMessage[], _config: AppConfig) => {
          // Ensure history is an array
          const historyArray = Array.isArray(history) ? history : [];
          const responseCount = historyArray.filter(
            (m) => m.role === 'assistant'
          ).length;
          return (
            mockLLMResponses[responseCount] ||
            mockLLMResponses[mockLLMResponses.length - 1]
          );
        }
      );

      // Create a version of handleUserQuery that uses our mocked LLM
      const mockedHandleUserQuery = (
        query: string,
        config: AppConfig,
        sessionId?: string
      ) => {
        return handleUserQuery(query, config, sessionId, mockQueryLLM);
      };

      // Create app with the mocked handler
      app = createApp(mockedHandleUserQuery, mockConfig as AppConfig);

      // Make the MCP request
      const requestBody = {
        query: 'Create a new person entry for Test Person who works in Testing',
        sessionId: 'e2e-test-session-1',
      };

      const response = await app.handle(
        new Request(`${baseUrl}/mcp`, {
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
        'successfully created a new entry for Test Person'
      );
      expect(data.streamingEndpoint).toMatch(/^\/events\/[a-f0-9-]+$/);

      // Verify the file was actually created
      const testPersonPath = path.join(tempDir, 'Test Person.md');
      
      // Use fileExists pattern instead of fs.access()
      const checkFileExists = async (filePath: string) => {
        try {
          await fs.access(filePath);
          return true;
        } catch {
          return false;
        }
      };
      
      expect(await checkFileExists(testPersonPath)).toBe(true);

      const content = await fs.readFile(testPersonPath, 'utf-8');
      expect(content).toContain('# Test Person');
      expect(content).toContain('type:: person');
      expect(content).toContain('field:: [[Testing]]');

      // Verify the git commit was created
      const git = simpleGit(tempDir);
      const log = await git.log({ maxCount: 1 });
      expect(log.latest?.message).toBe('feat: Add Test Person entity');
    });

    it('should handle multi-step workflow with multiple file operations', async () => {
      const mockLLMResponses = [
        // Turn 1: Create organization and person with linking
        `I'll create both the organization and person entries and link them together.
<typescript>
const orgPath = 'Test Organization.md';
const orgExists = await mem.fileExists(orgPath);
if (!orgExists) {
  await mem.writeFile(orgPath, '# Test Organization\\ntype:: organization\\nindustry:: [[Technology]]\\nfounded:: 2020');
}

await mem.writeFile('John Doe.md', '# John Doe\\ntype:: person\\nrole:: Developer\\naffiliation:: [[Test Organization]]\\nskills:: [[JavaScript]], [[TypeScript]]');
</typescript>`,
        // Turn 2: Commit and Reply
        `I'll save these changes to your knowledge base.
<typescript>
await mem.commitChanges('feat: Add Test Organization and John Doe with linked entities');
</typescript>
<reply>
I've created entries for both Test Organization and John Doe, with proper linking between them.
</reply>`,
      ];

      const mockQueryLLM = mock(
        async (history: ChatMessage[], _config: AppConfig) => {
          // Ensure history is an array
          const historyArray = Array.isArray(history) ? history : [];
          const responseCount = historyArray.filter(
            (m) => m.role === 'assistant'
          ).length;
          return mockLLMResponses[responseCount];
        }
      );

      // Create a version of handleUserQuery that uses our mocked LLM
      const mockedHandleUserQuery = (
        query: string,
        config: AppConfig,
        sessionId?: string
      ) => {
        return handleUserQuery(query, config, sessionId, mockQueryLLM);
      };

      // Create app with the mocked handler
      app = createApp(mockedHandleUserQuery, mockConfig as AppConfig);

      const requestBody = {
        query:
          'Create entries for John Doe, a developer at Test Organization, and link them together',
        sessionId: 'e2e-test-session-2',
      };

      const response = await app.handle(
        new Request(`${baseUrl}/mcp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.reply).toContain(
        'created entries for both Test Organization and John Doe'
      );

      // Verify both files were created
      const orgPath = path.join(tempDir, 'Test Organization.md');
      const personPath = path.join(tempDir, 'John Doe.md');

      // Use fileExists pattern instead of fs.access()
      const checkFileExists = async (filePath: string) => {
        try {
          await fs.access(filePath);
          return true;
        } catch {
          return false;
        }
      };
      
      expect(await checkFileExists(orgPath)).toBe(true);
      expect(await checkFileExists(personPath)).toBe(true);

      // Verify content and linking
      const orgContent = await fs.readFile(orgPath, 'utf-8');
      expect(orgContent).toContain('# Test Organization');
      expect(orgContent).toContain('type:: organization');

      const personContent = await fs.readFile(personPath, 'utf-8');
      expect(personContent).toContain('# John Doe');
      expect(personContent).toContain('affiliation:: [[Test Organization]]');
      expect(personContent).toContain(
        'skills:: [[JavaScript]], [[TypeScript]]'
      );

      // Verify git commit
      const git = simpleGit(tempDir);
      const log = await git.log({ maxCount: 1 });
      expect(log.latest?.message).toBe(
        'feat: Add Test Organization and John Doe with linked entities'
      );
    });
  });

  describe('Server-Sent Events (SSE) Integration', () => {
    it('should provide real-time status updates during processing', async () => {
      const mockLLMResponses = [
        // Turn 1: Multiple actions to generate status updates
        `I'll analyze the request and create the necessary files.
<typescript>
await mem.writeFile('Status Test.md', '# Status Test\\ntype:: test\\nstatus:: in-progress');
</typescript>`,
        // Turn 2: Final commit
        `I'll complete the operation now.
<typescript>
await mem.commitChanges('feat: Complete status test operation');
</typescript>
<reply>
The status test operation has been completed successfully.
</reply>`,
      ];

      const mockQueryLLM = mock(
        async (history: ChatMessage[], _config: AppConfig) => {
          // Ensure history is an array
          const historyArray = Array.isArray(history) ? history : [];
          const responseCount = historyArray.filter(
            (m) => m.role === 'assistant'
          ).length;
          return mockLLMResponses[responseCount];
        }
      );

      // Create a version of handleUserQuery that uses our mocked LLM
      const mockedHandleUserQuery = (
        query: string,
        config: AppConfig,
        sessionId?: string
      ) => {
        return handleUserQuery(query, config, sessionId, mockQueryLLM);
      };

      // Create app with the mocked handler
      app = createApp(mockedHandleUserQuery, mockConfig as AppConfig);

      // Make the MCP request
      const requestBody = {
        query: 'Create a status test file and track the progress',
        sessionId: 'e2e-sse-test',
      };

      const mcpResponse = await app.handle(
        new Request(`${baseUrl}/mcp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
      );

      const mcpData = await mcpResponse.json();
      const { runId, streamingEndpoint } = mcpData;

      // Connect to SSE endpoint
      const sseResponse = await app.handle(
        new Request(`${baseUrl}${streamingEndpoint}`)
      );
      expect(sseResponse.status).toBe(200);
      expect(sseResponse.headers.get('Content-Type')).toBe('text/event-stream');

      // Read SSE stream
      const reader = sseResponse.body?.getReader();
      expect(reader).toBeDefined();

      if (reader) {
        const decoder = new TextDecoder();
        let sseData = '';

        // Read all available data
        try {
          const startTime = Date.now();
          const timeoutMs = 5000; // 5 second timeout
          while (Date.now() - startTime < timeoutMs) {
            const { done, value } = await reader.read();
            if (done) break;
            sseData += decoder.decode(value);
          }
        } catch (error) {
          // Stream may close, that's expected
        }

        // Parse SSE events
        const events = sseData
          .split('\n\n')
          .filter((event) => event.startsWith('data: '));
        expect(events.length).toBeGreaterThan(0);

        // Verify we get the initial connection message
        const initialEvent = JSON.parse(events[0].replace('data: ', ''));
        expect(initialEvent.type).toBe('think');
        expect(initialEvent.runId).toBe(runId);
        expect(initialEvent.content).toBe('Connection established');
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle LLM errors gracefully and return meaningful responses', async () => {
      const mockQueryLLM = mock(
        async (_history: ChatMessage[], _config: AppConfig) => {
          throw new Error('LLM service unavailable');
        }
      );

      // Create a version of handleUserQuery that uses our mocked LLM
      const mockedHandleUserQuery = (
        query: string,
        config: AppConfig,
        sessionId?: string
      ) => {
        return handleUserQuery(query, config, sessionId, mockQueryLLM);
      };

      // Create app with the mocked handler
      app = createApp(mockedHandleUserQuery, mockConfig as AppConfig);

      const requestBody = {
        query: 'This should trigger an error',
        sessionId: 'error-test-session',
      };

      const response = await app.handle(
        new Request(`${baseUrl}/mcp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
      );

      // HTTP response should still be successful
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('runId');
      expect(data).toHaveProperty('reply');
      expect(data.reply).toContain(
        'An error occurred while processing your request'
      );
    });

    it('should handle code execution errors in the sandbox', async () => {
      const mockLLMResponses = [
        // Turn 1: Invalid TypeScript code
        `I'll try to execute some invalid code.
<typescript>
await mem.nonExistentFunction();
</typescript>`,
        // Turn 2: Handle the error and respond
        `I'll respond with an error message.
<reply>
There was an error executing the code. Please check the syntax and try again.
</reply>`,
      ];

      const mockQueryLLM = mock(
        async (history: ChatMessage[], _config: AppConfig) => {
          // Ensure history is an array
          const historyArray = Array.isArray(history) ? history : [];
          const responseCount = historyArray.filter(
            (m) => m.role === 'assistant'
          ).length;
          return mockLLMResponses[responseCount];
        }
      );

      // Create a version of handleUserQuery that uses our mocked LLM
      const mockedHandleUserQuery = (
        query: string,
        config: AppConfig,
        sessionId?: string
      ) => {
        return handleUserQuery(query, config, sessionId, mockQueryLLM);
      };

      // Create app with the mocked handler
      app = createApp(mockedHandleUserQuery, mockConfig as AppConfig);

      const requestBody = {
        query: 'Execute some invalid code',
        sessionId: 'code-error-test',
      };

      const response = await app.handle(
        new Request(`${baseUrl}/mcp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.reply).toContain('error');
    });

    it('should handle session management across multiple requests', async () => {
      const mockLLMResponses = [
        [
          `I'll create the first file.
<typescript>
await mem.writeFile('Session Test 1.md', '# Session Test 1\\nsession:: first-request');
</typescript>`,
          `I'll commit the first file.
<typescript>
await mem.commitChanges('feat: Add first session test file');
</typescript>
<reply>
First file created successfully.
</reply>`,
        ],
        [
          `I'll create a second related file.
<typescript>
await mem.writeFile('Session Test 2.md', '# Session Test 2\\nsession:: second-request\\nrelated:: [[Session Test 1]]');
</typescript>`,
          `I'll commit the second file.
<typescript>
await mem.commitChanges('feat: Add second session test file');
</typescript>
<reply>
Second file created and linked to the first.
</reply>`,
        ],
      ];

      const mockQueryLLM = mock(
        async (history: ChatMessage[], _config: AppConfig) => {
          const historyArray = Array.isArray(history) ? history : [];

          // Determine which request we're on by counting non-feedback user messages.
          const userQueries = historyArray.filter(
            (m) => m.role === 'user' && !m.content.startsWith('[Execution')
          ).length;
          const requestIndex = userQueries - 1;

          // Determine which turn we're on for the current request.
          const assistantResponses = historyArray.filter(
            (m) => m.role === 'assistant'
          ).length;
          const turnIndex = assistantResponses - requestIndex * 2;

          if (requestIndex < 0 || turnIndex < 0) {
            throw new Error('Mock LLM logic failed to determine request/turn.');
          }

          return mockLLMResponses[requestIndex][turnIndex];
        }
      );

      const mockedHandleUserQuery = (
        query: string,
        config: AppConfig,
        sessionId?: string
      ) => {
        return handleUserQuery(query, config, sessionId, mockQueryLLM);
      };

      // Create app with the mocked handler
      app = createApp(mockedHandleUserQuery, mockConfig as AppConfig);

      // First request
      const firstResponse = await app.handle(
        new Request(`${baseUrl}/mcp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: 'Create the first session test file',
            sessionId: 'session-persistence-test',
          }),
        })
      );

      expect(firstResponse.status).toBe(200);
      const firstData = await firstResponse.json();
      expect(firstData.reply).toContain('First file created successfully');

      // Second request with same session ID
      const secondResponse = await app.handle(
        new Request(`${baseUrl}/mcp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: 'Create a second file in the same session',
            sessionId: 'session-persistence-test',
          }),
        })
      );

      expect(secondResponse.status).toBe(200);
      const secondData = await secondResponse.json();
      expect(secondData.reply).toContain('Second file created and linked');

      // Verify both files exist and are properly linked
      const file1Path = path.join(tempDir, 'Session Test 1.md');
      const file2Path = path.join(tempDir, 'Session Test 2.md');

      // Use fileExists pattern instead of fs.access()
      const checkFileExists = async (filePath: string) => {
        try {
          await fs.access(filePath);
          return true;
        } catch {
          return false;
        }
      };
      
      expect(await checkFileExists(file1Path)).toBe(true);
      expect(await checkFileExists(file2Path)).toBe(true);

      const file2Content = await fs.readFile(file2Path, 'utf-8');
      expect(file2Content).toContain('related:: [[Session Test 1]]');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent requests efficiently', async () => {
      const mockLLMResponses = [
        `I'll create a quick test file.
<typescript>
await mem.writeFile('Concurrent Test.md', '# Concurrent Test\\ntimestamp:: ' + Date.now());
</typescript>`,
        `I'll commit the test file.
<typescript>
await mem.commitChanges('feat: Add concurrent test file');
</typescript>
<reply>
Concurrent test completed successfully.
</reply>`,
      ];

      const mockQueryLLM = mock(
        async (history: ChatMessage[], _config: AppConfig) => {
          // Ensure history is an array
          const historyArray = Array.isArray(history) ? history : [];
          const responseCount = historyArray.filter(
            (m) => m.role === 'assistant'
          ).length;
          return mockLLMResponses[responseCount];
        }
      );

      // Create a version of handleUserQuery that uses our mocked LLM
      const mockedHandleUserQuery = (
        query: string,
        config: AppConfig,
        sessionId?: string
      ) => {
        return handleUserQuery(query, config, sessionId, mockQueryLLM);
      };

      // Create app with the mocked handler
      app = createApp(mockedHandleUserQuery, mockConfig as AppConfig);

      // Create 5 concurrent requests
      const concurrentRequests = Array.from({ length: 5 }, (_, i) =>
        app.handle(
          new Request(`${baseUrl}/mcp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: `Create concurrent test file ${i + 1}`,
              sessionId: `concurrent-session-${i + 1}`,
            }),
          })
        )
      );

      // Wait for all requests to complete
      const responses = await Promise.all(concurrentRequests);

      // Verify all requests were successful
      responses.forEach((response, _index) => {
        expect(response.status).toBe(200);
      });

      // Verify all files were created
      // Use fileExists pattern instead of fs.access()
      const checkFileExists = async (filePath: string) => {
        try {
          await fs.access(filePath);
          return true;
        } catch {
          return false;
        }
      };
      
      for (let i = 0; i < 5; i++) {
        const filePath = path.join(tempDir, 'Concurrent Test.md');
        expect(await checkFileExists(filePath)).toBe(true);
      }
    });
  });

  describe('API Compliance and Validation', () => {
    it('should strictly validate request schemas and return appropriate errors', async () => {
      app = createApp(
        mock(async () => 'mock response'),
        mockConfig as AppConfig
      );

      // Test various invalid request formats
      const invalidRequests = [
        {
          name: 'missing query field',
          body: { sessionId: 'test' },
          expectedStatus: 422,
        },
        {
          name: 'empty query string',
          body: { query: '', sessionId: 'test' },
          expectedStatus: 422,
        },
        {
          name: 'whitespace-only query',
          body: { query: '   \n\t   ', sessionId: 'test' },
          expectedStatus: 422,
        },
        {
          name: 'null query',
          body: { query: null, sessionId: 'test' },
          expectedStatus: 422,
        },
      ];

      for (const testCase of invalidRequests) {
        const response = await app.handle(
          new Request(`${baseUrl}/mcp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(testCase.body),
          })
        );

        expect(response.status).toBe(
          testCase.expectedStatus,
          `Expected status ${testCase.expectedStatus} for ${testCase.name}`
        );
      }
    });

    it('should handle malformed JSON requests gracefully', async () => {
      app = createApp(
        mock(async () => 'mock response'),
        mockConfig as AppConfig
      );

      const malformedRequests = [
        'invalid json{',
        '{"query": "test", "sessionId": "test"', // missing closing brace
        '{"query": "test", "sessionId":}', // invalid value
        'query=test&sessionId=test', // form data instead of JSON
      ];

      for (const malformedBody of malformedRequests) {
        const response = await app.handle(
          new Request(`${baseUrl}/mcp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: malformedBody,
          })
        );

        expect(response.status).toBe(422);
      }
    });
  });
});
