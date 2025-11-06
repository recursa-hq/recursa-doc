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

describe('End-to-End Complete Flow Tests', () => {
  let tempDir: string;
  let mockConfig: AppConfig;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'recursa-e2e-test-'));
    mockConfig = {
      knowledgeGraphPath: tempDir,
      openRouterApiKey: 'test-api-key',
      llmModel: 'test-model',
      port: 3001,
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
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // Mock LLM responses for testing
  const createMockLLMQuery = (responses: string[]) => {
    let callCount = 0;
    return mock(async (_history: any, _config: any) => {
      const response = responses[callCount] || responses[responses.length - 1];
      callCount++;
      return response;
    });
  };

  describe('Complete Workflow Integration', () => {
    it('should execute a complete project lifecycle', async () => {
      const sessionId = 'project-lifecycle';

      // Phase 1: Initialize project
      const initMockLLMQuery = createMockLLMQuery([
        `I'll initialize a new project with basic structure.
<typescript>
// Create project structure
await mem.writeFile('package.json', JSON.stringify({
  name: 'test-project',
  version: '1.0.0',
  description: 'A test project',
  scripts: { start: 'node index.js', test: 'jest' }
}, null, 2));

await mem.writeFile('README.md', '# Test Project\n\nThis is a comprehensive test project.');
await mem.writeFile('index.js', 'console.log("Hello, World!");');
await mem.createDir('src');
await mem.writeFile('src/app.js', '// Application logic');
</typescript>`,
        `Project initialized. Now commit the initial setup.
<typescript>
await mem.commitChanges('feat: initialize project with basic structure');
</typescript>`,
        `<reply>
Project initialized successfully with package.json, README, main entry point, and source directory.
</reply>`,
      ]);

      const initResult = await handleUserQuery(
        'Initialize a new Node.js project',
        mockConfig,
        sessionId,
        initMockLLMQuery
      );

      expect(initResult).toContain('Project initialized successfully');

      // Phase 2: Add features
      const featureMockLLMQuery = createMockLLMQuery([
        `I'll add features to the existing project.
<typescript>
// Add feature files
await mem.writeFile('src/utils.js', '// Utility functions\nexports.formatDate = (date) => date.toISOString();');
await mem.writeFile('src/config.js', '// Configuration\nmodule.exports = { env: 'development', port: 3000 };');
await mem.createDir('tests');
await mem.writeFile('tests/utils.test.js', '// Test utilities\nconst { formatDate } = require('../src/utils.js');');
</typescript>`,
        `Features added. Commit the new functionality.
<typescript>
await mem.commitChanges('feat: add utilities, config, and test structure');
</typescript>`,
        `<reply>
Added utility functions, configuration, and test structure to the project.
</reply>`,
      ]);

      const featureResult = await handleUserQuery(
        'Add utilities and configuration to the project',
        mockConfig,
        sessionId,
        featureMockLLMQuery
      );

      expect(featureResult).toContain('Added utility functions');

      // Phase 3: Update existing files
      const updateMockLLMQuery = createMockLLMQuery([
        `I'll update the main application to use the new utilities.
<typescript>
// Update main file
const indexContent = await mem.readFile('index.js');
const updatedIndex = indexContent.replace(
  'console.log("Hello, World!");',
  'const { formatDate } = require("./src/utils.js");\nconsole.log("Current time:", formatDate(new Date()));'
);
await mem.updateFile('index.js', indexContent, updatedIndex);

// Update README
const readmeContent = await mem.readFile('README.md');
const updatedReadme = readmeContent + '\n\n## Usage\n\nRun with: npm start';
await mem.updateFile('README.md', readmeContent, updatedReadme);
</typescript>`,
        `Main application updated. Commit the improvements.
<typescript>
await mem.commitChanges('feat: integrate utilities and update documentation');
</typescript>`,
        `<reply>
Updated the main application to use utilities and improved documentation.
</reply>`,
      ]);

      const updateResult = await handleUserQuery(
        'Update the main application to use the new utilities',
        mockConfig,
        sessionId,
        updateMockLLMQuery
      );

      expect(updateResult).toContain('Updated the main application');

      // Verify complete project state
      const mem = createMemAPI(mockConfig);

      // Check all expected files exist
      const expectedFiles = [
        'package.json',
        'README.md',
        'index.js',
        'src/app.js',
        'src/utils.js',
        'src/config.js',
        'tests/utils.test.js',
      ];

      for (const file of expectedFiles) {
        const exists = await mem.fileExists(file);
        expect(exists).toBe(true);
      }

      // Verify file contents
      const indexContent = await mem.readFile('index.js');
      expect(indexContent).toContain('formatDate');
      expect(indexContent).toContain('./src/utils.js');

      const readmeContent = await mem.readFile('README.md');
      expect(readmeContent).toContain('Usage');
      expect(readmeContent).toContain('npm start');

      // Verify git history shows all three commits
      const git = simpleGit(tempDir);
      const log = await git.log();
      expect(log.all.length).toBe(3);
      expect(log.all[0].message).toBe(
        'feat: integrate utilities and update documentation'
      );
      expect(log.all[1].message).toBe(
        'feat: add utilities, config, and test structure'
      );
      expect(log.all[2].message).toBe(
        'feat: initialize project with basic structure'
      );
    });

    it('should handle complex file operations and git workflow', async () => {
      const statusUpdates: StatusUpdate[] = [];

      const captureStatusUpdate = (update: StatusUpdate) => {
        statusUpdates.push(update);
      };

      const complexMockLLMQuery = createMockLLMQuery([
        `I'll demonstrate complex file operations including creating, updating, deleting, and renaming files.
<typescript>
// Create multiple related files
await mem.writeFile('docs/intro.md', '# Introduction\n\nProject introduction.');
await mem.writeFile('docs/guide.md', '# User Guide\n\nDetailed user guide.');
await mem.writeFile('docs/api.md', '# API Reference\n\nAPI documentation.');

// Create a temporary file that will be renamed
await mem.writeFile('docs/temp.md', '# Temporary\n\nThis will be renamed.');

// Create a file that will be deleted
await mem.writeFile('docs/obsolete.md', '# Obsolete\n\nThis will be deleted.');

// List files to verify
const docsFiles = await mem.listFiles('docs');
console.log('Files created:', docsFiles);
</typescript>`,
        `Now I'll perform file operations: rename and delete.
<typescript>
// Rename temp.md to overview.md
await mem.rename('docs/temp.md', 'docs/overview.md');

// Delete the obsolete file
await mem.deleteFile('docs/obsolete.md');

// Update the introduction to reference the overview
const introContent = await mem.readFile('docs/intro.md');
const updatedIntro = introContent + '\n\nSee also: [[Overview]] for a project overview.';
await mem.updateFile('docs/intro.md', introContent, updatedIntro);

// Verify git staged files
const stagedFiles = await mem.gitStagedFiles();
console.log('Staged files:', stagedFiles);
</typescript>`,
        `File operations complete. Now commit and verify git operations.
<typescript>
await mem.commitChanges('feat: reorganize documentation structure');

// Test git operations
const gitDiff = await mem.gitDiff('docs/intro.md');
const gitLog = await mem.gitLog('docs/', 5);

console.log('Git diff for intro.md:', gitDiff);
console.log('Git log for docs/:', gitLog);
</typescript>`,
        `<reply>
Successfully performed complex file operations including creating multiple documentation files, renaming temp.md to overview.md, deleting obsolete.md, updating the introduction, and committing all changes with proper git history tracking.
</reply>`,
      ]);

      const result = await handleUserQuery(
        'Perform complex file operations with git workflow',
        mockConfig,
        'complex-ops-session',
        complexMockLLMQuery,
        captureStatusUpdate
      );

      expect(result).toContain(
        'Successfully performed complex file operations'
      );

      // Verify status updates were captured throughout the process
      expect(statusUpdates.length).toBeGreaterThan(0);
      const types = new Set(statusUpdates.map((u) => u.type));
      expect(types.has('think')).toBe(true);
      expect(types.has('act')).toBe(true);

      // Verify final file state
      const mem = createMemAPI(mockConfig);

      // Files that should exist
      const existingFiles = [
        'docs/intro.md',
        'docs/guide.md',
        'docs/api.md',
        'docs/overview.md',
      ];
      for (const file of existingFiles) {
        const exists = await mem.fileExists(file);
        expect(exists).toBe(true);
      }

      // Files that should not exist
      const deletedFiles = ['docs/temp.md', 'docs/obsolete.md'];
      for (const file of deletedFiles) {
        const exists = await mem.fileExists(file);
        expect(exists).toBe(false);
      }

      // Verify content was updated
      const introContent = await mem.readFile('docs/intro.md');
      expect(introContent).toContain('[[Overview]]');

      // Verify git operations worked
      const git = simpleGit(tempDir);
      const log = await git.log();
      expect(log.all.length).toBe(1);
      expect(log.all[0].message).toBe(
        'feat: reorganize documentation structure'
      );
    });

    it('should handle error scenarios and recovery gracefully', async () => {
      const statusUpdates: StatusUpdate[] = [];

      const captureStatusUpdate = (update: StatusUpdate) => {
        statusUpdates.push(update);
      };

      const errorRecoveryMockLLMQuery = createMockLLMQuery([
        `I'll attempt various operations to test error handling and recovery.
<typescript>
// This should fail - file doesn't exist
try {
  await mem.readFile('non-existent-config.json');
} catch (error) {
  console.log('Expected error caught:', error.message);
}

// This should also fail - invalid path traversal attempt
try {
  await mem.writeFile('../../../etc/malicious.txt', 'hack');
} catch (error) {
  console.log('Security error caught:', error.message);
}

// This should work - create the missing file
await mem.writeFile('non-existent-config.json', JSON.stringify({
  app: 'test',
  version: '1.0.0'
}, null, 2));
</typescript>`,
        `Now I'll test additional error scenarios.
<typescript>
// Try to update a file that doesn't exist
try {
  await mem.updateFile('missing.md', 'old content', 'new content');
} catch (error) {
  console.log('Update error caught:', error.message);
  // Create the file instead
  await mem.writeFile('missing.md', '# Created after error\n\nContent here.');
}

// Try to delete a file that doesn't exist
try {
  await mem.deleteFile('already-deleted.md');
} catch (error) {
  console.log('Delete error caught:', error.message);
}
</typescript>`,
        `Error recovery completed. Now commit all successful operations.
<typescript>
await mem.commitChanges('feat: demonstrate error handling and recovery');
</typescript>`,
        `<reply>
Successfully demonstrated comprehensive error handling and recovery. Caught and handled file not found errors, security errors for path traversal attempts, and successfully recovered by creating missing files when appropriate.
</reply>`,
      ]);

      const result = await handleUserQuery(
        'Test error handling and recovery scenarios',
        mockConfig,
        'error-test-session',
        errorRecoveryMockLLMQuery,
        captureStatusUpdate
      );

      expect(result).toContain(
        'Successfully demonstrated comprehensive error handling'
      );

      // Verify error status updates were captured
      const errorUpdates = statusUpdates.filter((u) => u.type === 'error');
      expect(errorUpdates.length).toBeGreaterThan(0);

      // Verify files that should exist after recovery
      const mem = createMemAPI(mockConfig);
      const configExists = await mem.fileExists('non-existent-config.json');
      expect(configExists).toBe(true);

      const missingExists = await mem.fileExists('missing.md');
      expect(missingExists).toBe(true);

      // Verify content
      const configContent = await mem.readFile('non-existent-config.json');
      expect(configContent).toContain('test');
      expect(configContent).toContain('1.0.0');

      const missingContent = await mem.readFile('missing.md');
      expect(missingContent).toContain('Created after error');

      // Verify git commit was successful despite errors
      const git = simpleGit(tempDir);
      const log = await git.log();
      expect(log.all.length).toBe(1);
      expect(log.all[0].message).toBe(
        'feat: demonstrate error handling and recovery'
      );
    });
  });
});
