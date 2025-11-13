import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { handleUserQuery } from '../../src/core/loop';
import {
  createTestHarness,
  cleanupTestHarness,
  createMockLLMQueryWithSpy,
  type TestHarnessState,
} from '../lib/test-harness';
describe('Agent Workflow Integration Tests', () => {
  let harness: TestHarnessState;

  beforeEach(async () => {
    harness = await createTestHarness();
  });

  afterEach(async () => {
    await cleanupTestHarness(harness);
  });

  describe('Complete Workflow Integration', () => {
    it('should execute a complete project lifecycle', async () => {
      const sessionId = 'project-lifecycle';

      // Phase 1: Initialize project
      const initMockLLMQuery = createMockLLMQueryWithSpy([
        `<think>I'll initialize a new project with basic structure.</think>
<typescript>
// Create project structure
await mem.writeFile('package.json', JSON.stringify({
  name: 'test-project',
  version: '1.0.0',
  description: 'A test project',
  scripts: { start: 'node index.js', test: 'jest' }
}, null, 2));

await mem.writeFile('README.md', '# Test Project\\n\\nThis is a comprehensive test project.');
await mem.writeFile('index.js', 'console.log(\\"Hello, World!\\");');
await mem.createDir('src');
await mem.writeFile('src/app.js', '// Application logic');
</typescript>`,
        `<think>Project initialized. Now commit the initial setup.</think>
<typescript>
await mem.commitChanges('feat: initialize project with basic structure');
</typescript>`,
        `<think>Replying to user.</think>
<reply>Project initialized successfully with package.json, README, main entry point, and source directory.</reply>`,
      ]);

      const initResult = await handleUserQuery(
        'Initialize a new Node.js project',
        harness.mockConfig,
        sessionId,
        'run-1',
        initMockLLMQuery,
        async () => {}
      );

      expect(initResult).toContain('Project initialized successfully');

      // Phase 2: Add features
      const featureMockLLMQuery = createMockLLMQueryWithSpy([
        `<think>I'll add features to the existing project.</think>
<typescript>
// Add feature files
await mem.writeFile('src/utils.js', '// Utility functions\\nexports.formatDate = (date) => date.toISOString();');
await mem.writeFile('src/config.js', '// Configuration\\nmodule.exports = { port: 3000 };');
await mem.createDir('tests');
await mem.writeFile('tests/utils.test.js', "// Test utilities\\nconst { formatDate } = require('../src/utils.js');");
</typescript>`,
        `<think>Features added. Commit the new functionality.</think>
<typescript>
await mem.commitChanges('feat: add utilities, config, and test structure');
</typescript>`,
        `<think>Replying to user.</think>
<reply>Added utility functions, configuration, and test structure to the project.</reply>`,
      ]);

      const featureResult = await handleUserQuery(
        'Add utilities and configuration to the project',
        harness.mockConfig,
        sessionId,
        'run-2',
        featureMockLLMQuery,
        async () => {}
      );

      expect(featureResult).toContain('Added utility functions');

      // Phase 3: Update existing files
      const updateMockLLMQuery = createMockLLMQueryWithSpy([
        `<think>I'll update the main application to use the new utilities.</think>
<typescript>
// Update main file
const indexContent = await mem.readFile('index.js');
const updatedIndex = indexContent.replace(
  'console.log(\\"Hello, World!\\");',
  'const { formatDate } = require(\\"./src/utils.js\\");\\nconsole.log(\\"Current time:\\", formatDate(new Date()));'
);
await mem.updateFile('index.js', indexContent, updatedIndex);

// Update README
const readmeContent = await mem.readFile('README.md');
const updatedReadme = readmeContent + '\\n\\n## Usage\\n\\nRun with: npm start';
await mem.updateFile('README.md', readmeContent, updatedReadme);
</typescript>`,
        `<think>Main application updated. Commit the improvements.</think>
<typescript>
await mem.commitChanges('feat: integrate utilities and update documentation');
</typescript>`,
        `<think>Replying to user.</think>
<reply>Updated the main application to use utilities and improved documentation.</reply>`,
      ]);

      const updateResult = await handleUserQuery(
        'Update the main application to use the new utilities',
        harness.mockConfig,
        sessionId,
        'run-3',
        updateMockLLMQuery,
        async () => {}
      );

      expect(updateResult).toContain('Updated the main application');

      // Verify complete project state
      const mem = harness.mem;

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

      // Verify git history shows all three commits (plus initial .gitignore commit)
      const log = await harness.git.log();
      expect(log.all.length).toBe(4);
      expect(log.all[0]?.message).toBe(
        'feat: integrate utilities and update documentation'
      );
      expect(log.all[1]?.message).toBe(
        'feat: add utilities, config, and test structure'
      );
      expect(log.all[2]?.message).toBe(
        'feat: initialize project with basic structure'
      );
    });

    it('should handle complex file operations and git workflow', async () => {
      const streamContentMock = jest.fn<
        (content: { type: 'text'; text: string }) => Promise<void>
      >();

      const complexMockLLMQuery = createMockLLMQueryWithSpy([
        `<think>I'll demonstrate complex file operations including creating, updating, deleting, and renaming files.</think>
<typescript>
// Create multiple related files
await mem.writeFile('docs/intro.md', '# Introduction\\n\\nProject introduction.');
await mem.writeFile('docs/guide.md', '# User Guide\\n\\nDetailed user guide.');
await mem.writeFile('docs/api.md', '# API Reference\\n\\nAPI documentation.');

// Create a temporary file that will be renamed
await mem.writeFile('docs/temp.md', '# Temporary\\n\\nThis will be renamed.');

// Create a file that will be deleted
await mem.writeFile('docs/obsolete.md', '# Obsolete\\n\\nThis will be deleted.');

// List files to verify
const docsFiles = await mem.listFiles('docs');
console.log('Files created:', docsFiles);
</typescript>`,
        `<think>Now I'll perform file operations: rename and delete.</think>
<typescript>
// Rename temp.md to overview.md
await mem.rename('docs/temp.md', 'docs/overview.md');

// Delete the obsolete file
await mem.deletePath('docs/obsolete.md');

// Update the introduction to reference the overview
const introContent = await mem.readFile('docs/intro.md');
const updatedIntro = introContent + '\\n\\nSee also: [[Overview]] for a project overview.';
await mem.updateFile('docs/intro.md', introContent, updatedIntro);

// Verify git staged files
const stagedFiles = await mem.getChangedFiles();
console.log('Staged files:', stagedFiles);
</typescript>`,
        `<think>File operations complete. Now commit and verify git operations.</think>
<typescript>
await mem.commitChanges('feat: reorganize documentation structure');

// Test git operations
const gitDiff = await mem.gitDiff('docs/intro.md');
const gitLog = await mem.gitLog('docs/', 5);

console.log('Git diff for intro.md:', gitDiff);
console.log('Git log for docs/:', gitLog);
</typescript>`,
        `<think>Replying to user.</think>
<reply>
Successfully performed complex file operations including creating multiple documentation files, renaming temp.md to overview.md, deleting obsolete.md, updating the introduction, and committing all changes with proper git history tracking.
</reply>`,
      ]);

      const result = await handleUserQuery(
        'Perform complex file operations with git workflow',
        harness.mockConfig,
        'complex-ops-session',
        'run-complex',
        complexMockLLMQuery,
        streamContentMock
      );

      expect(result).toContain(
        'Successfully performed complex file operations'
      );

      // Verify status updates were captured throughout the process
      expect(streamContentMock).toHaveBeenCalled();
      if (streamContentMock.mock.calls.length > 0 && streamContentMock.mock.calls[0].length > 0) {
        const firstCallArg = streamContentMock.mock.calls[0][0];
        expect(firstCallArg).toHaveProperty('type', 'text');
        expect(firstCallArg.text).toContain('demonstrate complex file operations');
      }

      // Verify final file state
      const mem = harness.mem;

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

      // Verify git operations worked (plus initial .gitignore commit)
      const log = await harness.git.log();
      expect(log.all.length).toBe(2);
      expect(log.all[0]?.message).toBe(
        'feat: reorganize documentation structure'
      );
    });

    it('should handle error scenarios and recovery gracefully', async () => {
      const streamContentMock = jest.fn<
        (content: { type: 'text'; text: string }) => Promise<void>
      >();

      const errorRecoveryMockLLMQuery = createMockLLMQueryWithSpy([
        `<think>I'll attempt various operations to test error handling and recovery.</think>
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
await mem.writeFile('non-existent-config.json', '{"app": "test", "version": "1.0.0"}');
</typescript>`,
        `<think>Now I'll test additional error scenarios.</think>
<typescript>
// Try to update a file that doesn't exist
try {
  await mem.updateFile('missing.md', 'old content', 'new content');
} catch (error) {
  console.log('Update error caught:', error.message);
  // Create the file instead
  await mem.writeFile('missing.md', '# Created after error\\n\\nContent here.');
}

// Try to delete a file that doesn't exist
try {
  await mem.deletePath('already-deleted.md');
} catch (error) {
  console.log('Delete error caught:', error.message);
}
</typescript>`,
        `<think>Error recovery completed. Now commit all successful operations.</think>
<typescript>
await mem.commitChanges('feat: demonstrate error handling and recovery');
</typescript>`,
        `<think>Replying to user.</think>
<reply>
Successfully demonstrated comprehensive error handling and recovery. Caught and handled file not found errors, security errors for path traversal attempts, and successfully recovered by creating missing files when appropriate.
</reply>`,
      ]);

      const result = await handleUserQuery(
        'Test error handling and recovery scenarios',
        harness.mockConfig,
        'error-test-session',
        'run-error',
        errorRecoveryMockLLMQuery,
        streamContentMock
      );

      expect(result).toContain(
        'Successfully demonstrated comprehensive error handling'
      );

      // Verify status updates were captured (should include think and act updates)
      expect(streamContentMock).toHaveBeenCalled();
      if (streamContentMock.mock.calls.length > 0 && streamContentMock.mock.calls[0].length > 0) {
        const firstCallArg = streamContentMock.mock.calls[0][0];
        expect(firstCallArg).toHaveProperty('type', 'text');
        expect(firstCallArg.text).toContain('attempt various operations');
      }

      // Verify files that should exist after recovery
      const mem = harness.mem;
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

      // Verify git commit was successful despite errors (plus initial .gitignore commit)
      const log = await harness.git.log();
      expect(log.all.length).toBe(2);
      expect(log.all[0]?.message).toBe(
        'feat: demonstrate error handling and recovery'
      );
    });
  });
});
