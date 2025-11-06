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

describe('Think-Act-Commit Loop Integration Tests', () => {
  let tempDir: string;
  let mockConfig: AppConfig;
  let statusUpdates: StatusUpdate[] = [];

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'recursa-test-'));
    mockConfig = {
      knowledgeGraphPath: tempDir,
      openRouterApiKey: 'test-api-key',
      llmModel: 'test-model',
      port: 3000,
    };
  });

  beforeEach(async () => {
    // Clear the directory
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
    return mock(async (_history: any, _config: any) => {
      const response = responses[callCount] || responses[responses.length - 1];
      callCount++;
      return response;
    });
  };

  // Helper function to capture status updates
  const captureStatusUpdate = (update: StatusUpdate) => {
    statusUpdates.push(update);
  };

  describe('Complete Think-Act-Commit Flow', () => {
    it('should execute a complete loop with file creation and commit', async () => {
      // Mock LLM response sequence
      const mockLLMQuery = createMockLLMQuery([
        // First response: Think and Act (create file)
        `<think>
I need to create a new file and add some content to it.
</think>
<typescript>
const fileName = 'test-file.md';
const content = '# Test Document\n\nThis is a test file created during integration testing.';
await mem.writeFile(fileName, content);
</typescript>`,
        // Second response: Commit and Reply
        `<think>
The file has been created successfully. Now I need to commit the changes and provide a final response.
</think>
<typescript>
await mem.commitChanges('feat: add test document');
</typescript>
<reply>
I've successfully created a new test document and committed the changes to your knowledge base.
</reply>`,
      ]);

      // Execute the query
      const result = await handleUserQuery(
        'Create a test document',
        mockConfig,
        undefined,
        mockLLMQuery,
        captureStatusUpdate
      );

      // Verify final response
      expect(result).toBe(
        "I've successfully created a new test document and committed the changes to your knowledge base."
      );

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
      const fileExists = await mem.fileExists('test-file.md');
      expect(fileExists).toBe(true);

      const fileContent = await mem.readFile('test-file.md');
      expect(fileContent).toContain('# Test Document');
      expect(fileContent).toContain('This is a test file');

      // Verify git commit was made
      const git = simpleGit(tempDir);
      const log = await git.log();
      expect(log.all.length).toBe(1);
      expect(log.all[0].message).toBe('feat: add test document');
    });

    it('should handle file updates in the loop', async () => {
      // Create initial file
      const mem = createMemAPI(mockConfig);
      await mem.writeFile(
        'existing.md',
        '# Original Content\n\nOriginal content here.'
      );
      await mem.commitChanges('feat: add original file');

      const mockLLMQuery = createMockLLMQuery([
        // First response: Think and Act (update file)
        `<think>
I need to update the existing file with new content.
</think>
<typescript>
const fileName = 'existing.md';
const existingContent = await mem.readFile(fileName);
const updatedContent = existingContent.replace('Original content here.', 'Updated content here.');
await mem.updateFile(fileName, existingContent, updatedContent);
</typescript>`,
        // Second response: Commit and Reply
        `<think>
The file has been updated successfully. Now I need to commit the changes.
</think>
<typescript>
await mem.commitChanges('feat: update existing document');
</typescript>
<reply>
I've successfully updated the existing document with new content and committed the changes.
</reply>`,
      ]);

      // Execute the query
      const result = await handleUserQuery(
        'Update the existing document',
        mockConfig,
        undefined,
        mockLLMQuery,
        captureStatusUpdate
      );

      // Verify final response
      expect(result).toBe(
        "I've successfully updated the existing document with new content and committed the changes."
      );

      // Verify file was updated
      const updatedContent = await mem.readFile('existing.md');
      expect(updatedContent).toContain('Updated content here.');

      // Verify git commit was made
      const git = simpleGit(tempDir);
      const log = await git.log();
      expect(log.all.length).toBe(2);
      expect(log.all[0].message).toBe('feat: update existing document');
    });

    it('should handle errors during code execution', async () => {
      const mockLLMQuery = createMockLLMQuery([
        // Response with code that will throw an error
        `<think>
I'll try to read a file that doesn't exist to test error handling.
</think>
<typescript>
// This should throw an error
await mem.readFile('non-existent-file.md');
</typescript>`,
        // Recovery response
        `<think>
There was an error reading the file. I should create it instead.
</think>
<typescript>
await mem.writeFile('non-existent-file.md', '# New File\n\nCreated after error.');
</typescript>`,
        // Final commit and reply
        `<think>
File created successfully. Now commit the changes.
</think>
<typescript>
await mem.commitChanges('feat: create file after error recovery');
</typescript>
<reply>
I encountered an error but recovered by creating the new file. Changes have been committed.
</reply>`,
      ]);

      // Execute the query
      const result = await handleUserQuery(
        'Try to read and then create a file',
        mockConfig,
        undefined,
        mockLLMQuery,
        captureStatusUpdate
      );

      // Verify final response
      expect(result).toBe(
        'I encountered an error but recovered by creating the new file. Changes have been committed.'
      );

      // Verify error status update was captured
      const errorUpdates = statusUpdates.filter((u) => u.type === 'error');
      expect(errorUpdates.length).toBeGreaterThan(0);

      // Verify file was eventually created
      const mem = createMemAPI(mockConfig);
      const fileExists = await mem.fileExists('non-existent-file.md');
      expect(fileExists).toBe(true);
    });

    it('should handle directory operations and file listings', async () => {
      const mockLLMQuery = createMockLLMQuery([
        // Response that creates directory and files
        `<think>
I need to create a directory structure with multiple files.
</think>
<typescript>
// Create a directory
await mem.createDir('test-directory');

// Create multiple files
await mem.writeFile('test-directory/file1.md', '# File 1\n\nContent of file 1.');
await mem.writeFile('test-directory/file2.md', '# File 2\n\nContent of file 2.');
await mem.writeFile('test-directory/file3.md', '# File 3\n\nContent of file 3.');

// List files to verify
const files = await mem.listFiles('test-directory');
console.log('Files created:', files);
</typescript>`,
        // Commit and reply
        `<think>
Directory and files created successfully. Now commit the changes.
</think>
<typescript>
await mem.commitChanges('feat: create directory with multiple files');
</typescript>
<reply>
I've created a new directory structure with three files and committed all the changes.
</reply>`,
      ]);

      // Execute the query
      const result = await handleUserQuery(
        'Create a directory with multiple files',
        mockConfig,
        undefined,
        mockLLMQuery,
        captureStatusUpdate
      );

      // Verify final response
      expect(result).toBe(
        "I've created a new directory structure with three files and committed all the changes."
      );

      // Verify directory and files were created
      const mem = createMemAPI(mockConfig);
      const dirExists = await mem.fileExists('test-directory');
      expect(dirExists).toBe(true);

      const files = await mem.listFiles('test-directory');
      expect(files).toContain('file1.md');
      expect(files).toContain('file2.md');
      expect(files).toContain('file3.md');
      expect(files.length).toBe(3);
    });

    it('should handle multiple operations in a single loop', async () => {
      const mockLLMQuery = createMockLLMQuery([
        // Response with multiple complex operations
        `<think>
I need to perform multiple operations: create files, update one, and verify with git operations.
</think>
<typescript>
// Create initial files
await mem.writeFile('project.md', '# My Project\n\nProject description here.');
await mem.writeFile('notes.md', '# Notes\n\nInitial notes.');

// Update the project file
const projectContent = await mem.readFile('project.md');
const updatedProject = projectContent + '\n\n## Status\n\nIn progress.';
await mem.updateFile('project.md', projectContent, updatedProject);

// Check git status before commit
const stagedFiles = await mem.gitStagedFiles();
console.log('Staged files before commit:', stagedFiles);
</typescript>`,
        // Commit and git log verification
        `<think>
Files created and updated. Now commit and verify git history.
</think>
<typescript>
await mem.commitChanges('feat: add project files with updates');

// Verify git log
const log = await mem.gitLog('project.md', 2);
console.log('Git log for project.md:', log);
</typescript>`,
        // Final reply
        `<think>
All operations completed successfully. Provide final summary.
</think>
<typescript>
// No operations needed, just final reply
</typescript>
<reply>
I've successfully created and updated multiple files, committed them with a proper message, and verified the git history. All operations completed in the Think-Act-Commit loop.
</reply>`,
      ]);

      // Execute the query
      const result = await handleUserQuery(
        'Perform multiple file operations with git verification',
        mockConfig,
        undefined,
        mockLLMQuery,
        captureStatusUpdate
      );

      // Verify final response
      expect(result).toBe(
        "I've successfully created and updated multiple files, committed them with a proper message, and verified the git history. All operations completed in the Think-Act-Commit loop."
      );

      // Verify files exist and have correct content
      const mem = createMemAPI(mockConfig);
      const projectContent = await mem.readFile('project.md');
      expect(projectContent).toContain('# My Project');
      expect(projectContent).toContain('In progress.');

      const notesContent = await mem.readFile('notes.md');
      expect(notesContent).toContain('# Notes');

      // Verify git operations
      const git = simpleGit(tempDir);
      const log = await git.log();
      expect(log.all.length).toBe(1);
      expect(log.all[0].message).toBe('feat: add project files with updates');
    });
  });

  describe('Session Management', () => {
    it('should maintain conversation context across multiple queries', async () => {
      const sessionId = 'test-session-123';

      // First query with file creation
      const firstMockLLMQuery = createMockLLMQuery([
        `<think>
Creating the first file in the session.
</think>
<typescript>
await mem.writeFile('session-test.md', '# Session Test\n\nFirst file in session.');
</typescript>`,
        `<think>
Commit the first file.
</think>
<typescript>
await mem.commitChanges('feat: add first session file');
</typescript>`,
        `<reply>
First file created and committed in the session.
</reply>`,
      ]);

      const firstResult = await handleUserQuery(
        'Create first file',
        mockConfig,
        sessionId,
        firstMockLLMQuery,
        captureStatusUpdate
      );

      expect(firstResult).toBe(
        'First file created and committed in the session.'
      );

      // Second query in the same session
      const secondMockLLMQuery = createMockLLMQuery([
        `<think>
Adding to the existing file in the same session.
</think>
<typescript>
const existingContent = await mem.readFile('session-test.md');
const updatedContent = existingContent + '\n\n## Second Update\n\nAdded in second query.';
await mem.updateFile('session-test.md', existingContent, updatedContent);
</typescript>`,
        `<think>
Commit the update.
</think>
<typescript>
await mem.commitChanges('feat: update session file');
</typescript>`,
        `<reply>
File updated in the same session context.
</reply>`,
      ]);

      const secondResult = await handleUserQuery(
        'Update the file',
        mockConfig,
        sessionId,
        secondMockLLMQuery,
        captureStatusUpdate
      );

      expect(secondResult).toBe('File updated in the same session context.');

      // Verify file has both updates
      const mem = createMemAPI(mockConfig);
      const finalContent = await mem.readFile('session-test.md');
      expect(finalContent).toContain('First file in session');
      expect(finalContent).toContain('Second Update');
    });
  });
});
