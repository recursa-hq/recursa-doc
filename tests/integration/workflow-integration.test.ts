import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from 'bun:test';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import simpleGit from 'simple-git';
import { handleUserQuery } from '../../src/core/loop';
import { createMemAPI } from '../../src/core/mem-api';
import type { AppConfig } from '../../src/config';
import type { StatusUpdate } from '../../src/types';

describe('Workflow Integration Tests', () => {
  let tempDir: string;
  let mockConfig: AppConfig;
  let statusUpdates: StatusUpdate[];

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'recursa-workflow-test-')
    );
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
    return async (_history: unknown[], _config: unknown) => {
      const response = responses[callCount] || responses[responses.length - 1];
      callCount++;
      return response;
    };
  };

  // Helper function to capture status updates
  const captureStatusUpdate = (update: StatusUpdate) => {
    statusUpdates.push(update);
  };

  describe('Complete Workflow Verification', () => {
    it('should handle basic file creation workflow', async () => {
      // Mock LLM response sequence with proper XML format
      const mockLLMQuery = createMockLLMQuery([
        // First response: Think and Act
        `I'll create a simple test file to verify the workflow.
<typescript>
const fileName = 'workflow-test.md';
const content = '# Workflow Test\n\nThis is a test file for the workflow integration.';
await mem.writeFile(fileName, content);
</typescript>`,
        // Second response: Commit and Reply
        `File created successfully. Now commit the changes.
<typescript>
await mem.commitChanges('feat: add workflow test file');
</typescript>
<reply>
Successfully created and committed the workflow test file.
</reply>`,
      ]);

      // Execute the query
      const result = await handleUserQuery(
        'Create a workflow test file',
        mockConfig,
        undefined,
        mockLLMQuery,
        captureStatusUpdate
      );

      // Verify final response
      expect(result).toBe(
        'Successfully created and committed the workflow test file.'
      );

      // Verify file was actually created
      const mem = createMemAPI(mockConfig);
      const fileExists = await mem.fileExists('workflow-test.md');
      expect(fileExists).toBe(true);

      const fileContent = await mem.readFile('workflow-test.md');
      expect(fileContent).toContain('# Workflow Test');
      expect(fileContent).toContain(
        'This is a test file for the workflow integration'
      );

      // Verify git commit was made
      const git = simpleGit(tempDir);
      const log = await git.log();
      expect(log.all.length).toBe(1);
      expect(log.all[0].message).toBe('feat: add workflow test file');
    });

    it('should handle multi-step file operations', async () => {
      // Mock LLM response sequence
      const mockLLMQuery = createMockLLMQuery([
        // First response: Create directory and files
        `I'll create a directory structure with multiple files.
<typescript>
// Create directory
await mem.createDir('project');

// Create multiple files in the directory
await mem.writeFile('project/README.md', '# Project README\n\nProject description here.');
await mem.writeFile('project/main.js', 'console.log("Hello, World!");');
await mem.writeFile('project/config.json', '{"name": "test", "version": "1.0.0"}');

// List files to verify creation
const files = await mem.listFiles('project');
console.log('Files created:', files);
</typescript>`,
        // Second response: Commit and Reply
        `All files created successfully. Now commit the project structure.
<typescript>
await mem.commitChanges('feat: create project structure with multiple files');
</typescript>
<reply>
Successfully created a complete project structure with README, main file, and configuration.
</reply>`,
      ]);

      // Execute the query
      const result = await handleUserQuery(
        'Create a project structure',
        mockConfig,
        undefined,
        mockLLMQuery,
        captureStatusUpdate
      );

      // Verify final response
      expect(result).toBe(
        'Successfully created a complete project structure with README, main file, and configuration.'
      );

      // Verify directory and files were created
      const mem = createMemAPI(mockConfig);
      const dirExists = await mem.fileExists('project');
      expect(dirExists).toBe(true);

      const files = await mem.listFiles('project');
      expect(files).toContain('README.md');
      expect(files).toContain('main.js');
      expect(files).toContain('config.json');
      expect(files.length).toBe(3);

      // Verify file contents
      const readmeContent = await mem.readFile('project/README.md');
      expect(readmeContent).toContain('# Project README');

      const mainContent = await mem.readFile('project/main.js');
      expect(mainContent).toContain('console.log("Hello, World!");');

      const configContent = await mem.readFile('project/config.json');
      expect(configContent).toContain('test');
      expect(configContent).toContain('1.0.0');

      // Verify git commit
      const git = simpleGit(tempDir);
      const log = await git.log();
      expect(log.all.length).toBe(1);
      expect(log.all[0].message).toBe(
        'feat: create project structure with multiple files'
      );
    });

    it('should handle file modification workflow', async () => {
      // Create initial file first
      const mem = createMemAPI(mockConfig);
      await mem.writeFile(
        'modify-test.md',
        '# Original Title\n\nOriginal content here.'
      );
      await mem.commitChanges('feat: add original file');

      // Mock LLM response for modification
      const mockLLMQuery = createMockLLMQuery([
        // First response: Modify the file
        `I'll modify the existing file by adding new content.
<typescript>
const fileName = 'modify-test.md';
const existingContent = await mem.readFile(fileName);
const newContent = existingContent + '\n\n## New Section\n\nThis content was added during modification.';
await mem.updateFile(fileName, existingContent, newContent);
</typescript>`,
        // Second response: Commit and Reply
        `File modified successfully. Now commit the changes.
<typescript>
await mem.commitChanges('feat: modify file with new section');
</typescript>
<reply>
Successfully modified the file by adding a new section.
</reply>`,
      ]);

      // Execute the query
      const result = await handleUserQuery(
        'Modify the existing file',
        mockConfig,
        undefined,
        mockLLMQuery,
        captureStatusUpdate
      );

      // Verify final response
      expect(result).toBe(
        'Successfully modified the file by adding a new section.'
      );

      // Verify file was modified
      const modifiedContent = await mem.readFile('modify-test.md');
      expect(modifiedContent).toContain('# Original Title');
      expect(modifiedContent).toContain('Original content here.');
      expect(modifiedContent).toContain('## New Section');
      expect(modifiedContent).toContain(
        'This content was added during modification'
      );

      // Verify git history
      const git = simpleGit(tempDir);
      const log = await git.log();
      expect(log.all.length).toBe(2);
      expect(log.all[0].message).toBe('feat: modify file with new section');
      expect(log.all[1].message).toBe('feat: add original file');
    });

    it('should demonstrate complete Think-Act-Commit loop', async () => {
      const statusUpdates: StatusUpdate[] = [];

      const captureStatusUpdate = (update: StatusUpdate) => {
        statusUpdates.push(update);
      };

      // Mock LLM response sequence demonstrating the complete loop
      const mockLLMQuery = createMockLLMQuery([
        // Think phase
        `I need to create a comprehensive example that demonstrates the complete Think-Act-Commit loop.
<typescript>
// Create a detailed example file
await mem.writeFile('loop-example.md', '# Complete Loop Example\n\nThis demonstrates the full workflow.');
await mem.writeFile('loop-example.md', await mem.readFile('loop-example.md') + '\n\n## Steps\n\n1. Think\n2. Act\n3. Commit');
</typescript>`,
        // Commit phase
        `Example created successfully. Now commit the demonstration.
<typescript>
await mem.commitChanges('feat: demonstrate complete Think-Act-Commit loop');
</typescript>`,
        // Final reply
        `Complete workflow demonstrated successfully.
<reply>
I've successfully demonstrated the complete Think-Act-Commit loop by creating an example file and committing the changes.
</reply>`,
      ]);

      // Execute the query
      const result = await handleUserQuery(
        'Demonstrate the complete Think-Act-Commit loop',
        mockConfig,
        undefined,
        mockLLMQuery,
        captureStatusUpdate
      );

      // Verify final response
      expect(result).toBe(
        "I've successfully demonstrated the complete Think-Act-Commit loop by creating an example file and committing the changes."
      );

      // Verify the workflow was completed
      const mem = createMemAPI(mockConfig);
      const fileExists = await mem.fileExists('loop-example.md');
      expect(fileExists).toBe(true);

      const content = await mem.readFile('loop-example.md');
      expect(content).toContain('# Complete Loop Example');
      expect(content).toContain('Think');
      expect(content).toContain('Act');
      expect(content).toContain('Commit');

      // Verify git commit
      const git = simpleGit(tempDir);
      const log = await git.log();
      expect(log.all.length).toBe(1);
      expect(log.all[0].message).toBe(
        'feat: demonstrate complete Think-Act-Commit loop'
      );
    });
  });
});
