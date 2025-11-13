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

  it('should initialize a new project from scratch', async () => {
    const sessionId = 'project-init';
    const initMockLLMQuery = createMockLLMQueryWithSpy([
      `<think>I'll initialize a new project with basic structure.</think>
<typescript>
await mem.writeFile('package.json', JSON.stringify({ name: 'test-project', version: '1.0.0' }, null, 2));
await mem.writeFile('README.md', '- # Test Project');
await mem.commitChanges('feat: initialize project');
</typescript>
<reply>Project initialized successfully.</reply>`,
    ]);

    const result = await handleUserQuery(
      'Initialize a new Node.js project',
      harness.mockConfig,
      sessionId,
      'run-1',
      initMockLLMQuery,
      async () => {}
    );

    expect(result).toBe('Project initialized successfully.');
    expect(await harness.mem.fileExists('package.json')).toBe(true);
    expect(await harness.mem.fileExists('README.md')).toBe(true);
    const log = await harness.git.log();
    expect(log.latest?.message).toBe('feat: initialize project');
  });

  it('should add features to an existing project', async () => {
    // Setup: Create the initial project state
    await harness.mem.writeFile(
      'package.json',
      JSON.stringify({ name: 'test-project' })
    );
    await harness.mem.writeFile('README.md', '- # Test Project');
    await harness.mem.commitChanges('feat: initial project');

    const sessionId = 'project-features';
    const featureMockLLMQuery = createMockLLMQueryWithSpy([
      `<think>I'll add features to the existing project.</think>
<typescript>
await mem.createDir('src');
await mem.writeFile('src/utils.js', '// Utility functions');
await mem.commitChanges('feat: add utilities');
</typescript>
<reply>Added utility functions.</reply>`,
    ]);

    const result = await handleUserQuery(
      'Add utilities to the project',
      harness.mockConfig,
      sessionId,
      'run-2',
      featureMockLLMQuery,
      async () => {}
    );

    expect(result).toBe('Added utility functions.');
    expect(await harness.mem.fileExists('src/utils.js')).toBe(true);
    const log = await harness.git.log();
    expect(log.latest?.message).toBe('feat: add utilities');
  });

  it('should update existing files correctly', async () => {
    // Setup: Create the initial project state
    await harness.mem.writeFile('README.md', '- # Test Project');
    await harness.mem.commitChanges('feat: initial project');

    const sessionId = 'project-update';
    const updateMockLLMQuery = createMockLLMQueryWithSpy([
      `<think>I'll update the README.</think>
<typescript>
const content = await mem.readFile('README.md');
const newContent = content + '\\n  - An update.';
await mem.updateFile('README.md', content, newContent);
await mem.commitChanges('docs: update README');
</typescript>
<reply>README updated.</reply>`,
    ]);

    const result = await handleUserQuery(
      'Update the README',
      harness.mockConfig,
      sessionId,
      'run-3',
      updateMockLLMQuery,
      async () => {}
    );

    expect(result).toBe('README updated.');
    const readmeContent = await harness.mem.readFile('README.md');
    expect(readmeContent).toContain('- An update.');
    const log = await harness.git.log();
    expect(log.latest?.message).toBe('docs: update README');
  });

  it('should handle complex file operations like rename and delete', async () => {
    const streamContentMock = jest.fn();
    await harness.mem.writeFile('docs/intro.md', '- # Introduction');
    await harness.mem.commitChanges('docs: add intro');

    const mockLLMQuery = createMockLLMQueryWithSpy([
      `<think>I will rename a file, delete another, and update one.</think>
<typescript>
await mem.writeFile('docs/temp.md', '- # Temp');
await mem.writeFile('docs/obsolete.md', '- # Obsolete');
await mem.rename('docs/temp.md', 'docs/overview.md');
await mem.deletePath('docs/obsolete.md');
const intro = await mem.readFile('docs/intro.md');
await mem.updateFile('docs/intro.md', intro, intro + '\\n  - Link to [[overview]]');
await mem.commitChanges('feat: reorganize docs');
</typescript>
<reply>Docs reorganized.</reply>`,
    ]);

    const result = await handleUserQuery(
      'Reorganize docs',
      harness.mockConfig,
      'complex-ops-session',
      'run-complex',
      mockLLMQuery,
      streamContentMock
    );

    expect(result).toBe('Docs reorganized.');
    expect(await harness.mem.fileExists('docs/overview.md')).toBe(true);
    expect(await harness.mem.fileExists('docs/temp.md')).toBe(false);
    expect(await harness.mem.fileExists('docs/obsolete.md')).toBe(false);
    const introContent = await harness.mem.readFile('docs/intro.md');
    expect(introContent).toContain('[[overview]]');
    const log = await harness.git.log();
    expect(log.latest?.message).toBe('feat: reorganize docs');
  });

  it('should recover from a file-not-found error', async () => {
    const streamContentMock = jest.fn();
    const mockLLMQuery = createMockLLMQueryWithSpy([
      `<think>I will try to read a file that does not exist.</think>
<typescript>
try {
  await mem.readFile('non-existent.md');
} catch (e) {
  console.log('Caught expected error');
  await mem.writeFile('non-existent.md', '- # Created After Error');
}
</typescript>`,
      `<think>Committing the new file.</think>
<typescript>
await mem.commitChanges('fix: create missing file after read error');
</typescript>
<reply>Handled error and created file.</reply>`,
    ]);

    const result = await handleUserQuery(
      'Test error recovery',
      harness.mockConfig,
      'error-test-session',
      'run-error',
      mockLLMQuery,
      streamContentMock
    );

    expect(result).toBe('Handled error and created file.');
    expect(await harness.mem.fileExists('non-existent.md')).toBe(true);
    const content = await harness.mem.readFile('non-existent.md');
    expect(content).toBe('- # Created After Error');
  });
});