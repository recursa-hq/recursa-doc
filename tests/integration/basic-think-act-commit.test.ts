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
import { handleUserQuery } from '../../src/core/loop';
import { createMemAPI } from '../../src/core/mem-api';
import type { AppConfig } from '../../src/config';
import type { StatusUpdate } from '../../src/types';

describe('Basic Think-Act-Commit Integration Tests', () => {
  let tempDir: string;
  let mockConfig: AppConfig;
  let statusUpdates: StatusUpdate[];

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'recursa-basic-test-'));
    mockConfig = {
      knowledgeGraphPath: tempDir,
      openRouterApiKey: 'test-api-key',
      llmModel: 'test-model',
      port: 3000,
    };
  });

  beforeEach(async () => {
    // Clear the directory completely
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.mkdir(tempDir, { recursive: true });

    // Initialize git
    const git = simpleGit(tempDir);
    await git.init();
    await git.addConfig('user.name', 'Test User');
    await git.addConfig('user.email', 'test@example.com');

    // Reset status updates
    statusUpdates = [];
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // Mock LLM responses for testing different scenarios
  const createMockLLMQuery = (responses: string[]) => {
    let callCount = 0;
    return mock(async (_history: unknown[], _config: unknown) => {
      const response = responses[callCount] || responses[responses.length - 1];
      callCount++;
      return response;
    });
  };

  // Helper function to capture status updates
  const captureStatusUpdate = (update: StatusUpdate) => {
    statusUpdates.push(update);
  };

  describe('Core Think-Act-Commit Loop', () => {
    it('should execute a simple file creation and commit loop', async () => {
      // Mock LLM response sequence
      const mockLLMQuery = createMockLLMQuery([
        // First response: Think and Act
        `</think>
I need to create a test file with some content.
<typescript>
const fileName = 'simple-test.md';
const content = '# Simple Test\n\nThis is a simple test file.';
await mem.writeFile(fileName, content);
</typescript>`,
        // Second response: Commit and Reply
        `</think>
File created successfully. Now commit the changes.
<typescript>
await mem.commitChanges('feat: add simple test file');
</typescript>
<reply>
Successfully created and committed the test file.
</reply>`,
      ]);

      // Execute the query
      const result = await handleUserQuery(
        'Create a simple test file',
        mockConfig,
        undefined,
        mockLLMQuery,
        captureStatusUpdate
      );

      // Verify final response
      expect(result).toBe('Successfully created and committed the test file.');

      // Verify status updates were captured
      expect(statusUpdates.length).toBeGreaterThan(0);

      // Verify at least one 'think' update
      const thinkUpdates = statusUpdates.filter((u) => u.type === 'think');
      expect(thinkUpdates.length).toBeGreaterThan(0);

      // Verify at least one 'act' update
      const actUpdates = statusUpdates.filter((u) => u.type === 'act');
      expect(actUpdates.length).toBeGreaterThan(0);

      // Verify file was actually created
      const mem = createMemAPI(mockConfig);
      const fileExists = await mem.fileExists('simple-test.md');
      expect(fileExists).toBe(true);

      const fileContent = await mem.readFile('simple-test.md');
      expect(fileContent).toContain('# Simple Test');
      expect(fileContent).toContain('This is a simple test file');

      // Verify git commit was made
      const git = simpleGit(tempDir);
      const log = await git.log();
      expect(log.all.length).toBe(1);
      expect(log.all[0].message).toBe('feat: add simple test file');
    });

    it('should handle file updates and commits', async () => {
      // Create initial file
      const mem = createMemAPI(mockConfig);
      await mem.writeFile(
        'update-test.md',
        '# Original Title\n\nOriginal content.'
      );
      await mem.commitChanges('feat: add original file');

      const mockLLMQuery = createMockLLMQuery([
        // First response: Update file
        `</think>
I need to update the existing file with new content.
<typescript>
const fileName = 'update-test.md';
const existingContent = await mem.readFile(fileName);
const updatedContent = existingContent.replace('Original content.', 'Updated content with new information.');
await mem.updateFile(fileName, existingContent, updatedContent);
</typescript>`,
        // Second response: Commit and Reply
        `</think>
File updated successfully. Now commit the changes.
<typescript>
await mem.commitChanges('feat: update file content');
</typescript>
<reply>
Successfully updated the file and committed the changes.
</reply>`,
      ]);

      // Execute the query
      const result = await handleUserQuery(
        'Update the existing file',
        mockConfig,
        undefined,
        mockLLMQuery,
        captureStatusUpdate
      );

      // Verify final response
      expect(result).toBe(
        'Successfully updated the file and committed the changes.'
      );

      // Verify file was updated
      const updatedContent = await mem.readFile('update-test.md');
      expect(updatedContent).toContain('Updated content with new information');
      expect(updatedContent).toContain('Original Title'); // Title should remain

      // Verify git commit was made
      const git = simpleGit(tempDir);
      const log = await git.log();
      expect(log.all.length).toBe(2);
      expect(log.all[0].message).toBe('feat: update file content');
      expect(log.all[1].message).toBe('feat: add original file');
    });

    it('should handle error recovery and continue with work', async () => {
      const mockLLMQuery = createMockLLMQuery([
        // First response with intentional error
        `</think>
I'll try to read a file that doesn't exist to test error handling.
<typescript>
await mem.readFile('non-existent.md');
</typescript>`,
        // Second response: Recovery
        `</think>
There was an error reading the file. I'll create it instead.
<typescript>
await mem.writeFile('non-existent.md', '# Created After Error\n\nFile created after error.');
</typescript>`,
        // Third response: Commit and Reply
        `</think>
File created successfully after error recovery.
<typescript>
await mem.commitChanges('feat: create file after error recovery');
</typescript>
<reply>
Successfully recovered from error and created the file.
</reply>`,
      ]);

      // Execute the query
      const result = await handleUserQuery(
        'Test error recovery',
        mockConfig,
        undefined,
        mockLLMQuery,
        captureStatusUpdate
      );

      // Verify final response
      expect(result).toBe(
        'Successfully recovered from error and created the file.'
      );

      // Verify error status update was captured
      const errorUpdates = statusUpdates.filter((u) => u.type === 'error');
      expect(errorUpdates.length).toBeGreaterThan(0);

      // Verify file was created after recovery
      const mem = createMemAPI(mockConfig);
      const fileExists = await mem.fileExists('non-existent.md');
      expect(fileExists).toBe(true);

      const fileContent = await mem.readFile('non-existent.md');
      expect(fileContent).toContain('Created After Error');
    });

    it('should handle multiple file operations in sequence', async () => {
      const mockLLMQuery = createMockLLMQuery([
        // First response: Create multiple files
        `</think>
I'll create a directory structure with multiple files.
<typescript>
// Create directory
await mem.createDir('multi-test');

// Create multiple files
await mem.writeFile('multi-test/file1.txt', 'Content 1');
await mem.writeFile('multi-test/file2.txt', 'Content 2');
await mem.writeFile('multi-test/file3.txt', 'Content 3');

// Verify files were created
const files = await mem.listFiles('multi-test');
console.log('Created files:', files);
</typescript>`,
        // Second response: Commit and Reply
        `</think>
All files created successfully. Now commit the changes.
<typescript>
await mem.commitChanges('feat: create multiple files in directory');
</typescript>
<reply>
Successfully created multiple files in the directory structure.
</reply>`,
      ]);

      // Execute the query
      const result = await handleUserQuery(
        'Create multiple files in a directory',
        mockConfig,
        undefined,
        mockLLMQuery,
        captureStatusUpdate
      );

      // Verify final response
      expect(result).toBe(
        'Successfully created multiple files in the directory structure.'
      );

      // Verify directory and files were created
      const mem = createMemAPI(mockConfig);
      const dirExists = await mem.fileExists('multi-test');
      expect(dirExists).toBe(true);

      const files = await mem.listFiles('multi-test');
      expect(files).toContain('file1.txt');
      expect(files).toContain('file2.txt');
      expect(files).toContain('file3.txt');
      expect(files.length).toBe(3);

      // Verify git commit
      const git = simpleGit(tempDir);
      const log = await git.log();
      expect(log.all.length).toBe(1);
      expect(log.all[0].message).toBe(
        'feat: create multiple files in directory'
      );
    });
  });

  describe('Session Persistence', () => {
    it('should maintain context across multiple queries in the same session', async () => {
      const sessionId = 'session-test-123';

      // First query: Create initial file
      const firstMockLLMQuery = createMockLLMQuery([
        `</think>
Creating the first file in the session.
<typescript>
await mem.writeFile('session-context.md', '# Session Test\n\nFirst file in this session.');
</typescript>`,
        `</think>
First file created.
<typescript>
await mem.commitChanges('feat: add first session file');
</typescript>`,
        `<reply>
First file created and committed in the session.
</reply>`,
      ]);

      const firstResult = await handleUserQuery(
        'Create first file in session',
        mockConfig,
        sessionId,
        firstMockLLMQuery
      );

      expect(firstResult).toBe(
        'First file created and committed in the session.'
      );

      // Second query: Update the file
      const secondMockLLMQuery = createMockLLMQuery([
        `</think>
Adding to the existing file in the same session.
<typescript>
const existingContent = await mem.readFile('session-context.md');
const updatedContent = existingContent + '\n\n## Second Update\n\nAdded in the same session.';
await mem.updateFile('session-context.md', existingContent, updatedContent);
</typescript>`,
        `</think>
File updated in session.
<typescript>
await mem.commitChanges('feat: update file in same session');
</typescript>`,
        `<reply>
File updated in the same session context.
</reply>`,
      ]);

      const secondResult = await handleUserQuery(
        'Update the file in the same session',
        mockConfig,
        sessionId,
        secondMockLLMQuery
      );

      expect(secondResult).toBe('File updated in the same session context.');

      // Verify file has both updates
      const mem = createMemAPI(mockConfig);
      const finalContent = await mem.readFile('session-context.md');
      expect(finalContent).toContain('First file in this session');
      expect(finalContent).toContain('Second Update');
      expect(finalContent).toContain('Added in the same session');

      // Verify git history shows both commits
      const git = simpleGit(tempDir);
      const log = await git.log();
      expect(log.all.length).toBe(2);
      expect(log.all[0].message).toBe('feat: update file in same session');
      expect(log.all[1].message).toBe('feat: add first session file');
    });
  });
});
