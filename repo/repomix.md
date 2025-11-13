# Directory Structure
```
.claude/
  settings.local.json
src/
  core/
    mem-api/
      file-ops.ts
      fs-walker.ts
      git-ops.ts
      graph-ops.ts
      index.ts
      secure-path.ts
      state-ops.ts
      util-ops.ts
    llm.ts
    loop.ts
    parser.ts
    sandbox.ts
  lib/
    gitignore-parser.ts
    logger.ts
    logseq-validator.ts
    platform.ts
  types/
    git.ts
    index.ts
    llm.ts
    loop.ts
    mcp.ts
    mem.ts
    sandbox.ts
  config.ts
  server.ts
tests/
  e2e/
    mcp-workflow.test.ts
  integration/
    knowledge-graph-workflow.test.ts
    mem-api-file-ops.test.ts
    mem-api-git-ops.test.ts
    mem-api-graph-ops.test.ts
    mem-api-state-ops.test.ts
    mem-api-util-ops.test.ts
    workflow.test.ts
  lib/
    test-harness.ts
    test-util.ts
  unit/
    llm.test.ts
    logseq-validator.test.ts
    parser.test.ts
  setup.ts
.dockerignore
.env.example
.env.test
.gitignore
.prettierrc.json
debug-stash.ts
Dockerfile
eslint.config.js
INSTALL_TERMUX.md
jest.config.js
package.json
README.md
relay.config.json
repomix.config.json
tasks.md
tsconfig.json
```

# Files

## File: .claude/settings.local.json
````json
{
  "permissions": {
    "allow": [
      "Bash(git config:*)"
    ],
    "deny": [],
    "ask": []
  }
}
````

## File: src/lib/logseq-validator.ts
````typescript
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates if the given string content conforms to the Logseq/Org-mode block format.
 * @param content The content to validate.
 * @returns A ValidationResult object.
 */
export const validateLogseqContent = (content: string): ValidationResult => {
  const errors: string[] = [];
  const lines = content.split('\n');
  const indentationStack: number[] = [-2]; // Stack to track indentation, -2 for a virtual root

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Skip undefined or null lines
    if (line === undefined || line === null) {
      continue;
    }

    // Ignore empty or whitespace-only lines
    if (line.trim() === '') {
      continue;
    }

    const indentation = line.length - line.trimStart().length;
    const trimmedLine = line.trim();

    // Rule 1: Must start with a dash
    if (!trimmedLine.startsWith('- ')) {
      errors.push(`Line ${lineNumber}: Must start with "- ". Found: "${trimmedLine}"`);
      continue; // Skip other checks for this malformed line
    }

    // Rule 2: Indentation must be a multiple of 2
    if (indentation % 2 !== 0) {
      errors.push(
        `Line ${lineNumber}: Indentation must be a multiple of 2. Found ${indentation} spaces.`
      );
    }

    // Rule 3: Nesting must be logical
    const parentIndentation = indentationStack[indentationStack.length - 1]!;
    if (indentation > parentIndentation + 2) {
      errors.push(
        `Line ${lineNumber}: Invalid nesting. Indentation increased by more than one level (from ${parentIndentation} to ${indentation} spaces).`
      );
    }

    // Adjust indentation stack
    if (indentation > parentIndentation) {
      indentationStack.push(indentation);
    } else {
      while (
        indentationStack.length > 1 &&
        indentationStack[indentationStack.length - 1]! > indentation
      ) {
        indentationStack.pop();
      }
    }

    // Rule 4: Properties (::) cannot be at the root level
    if (indentation === 0 && trimmedLine.includes('::')) {
      errors.push(
        `Line ${lineNumber}: Properties (using "::") cannot be at the root level.`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
````

## File: src/lib/platform.ts
````typescript
/**
 * Platform detection and utilities for cross-platform compatibility
 */

export const platform = {
  /** Current operating system platform */
  isWindows: process.platform === 'win32',
  isMacOS: process.platform === 'darwin',
  isLinux: process.platform === 'linux',
  isAndroid: process.platform === 'android',

  /** Termux environment detection */
  get isTermux(): boolean {
    return this.isAndroid ||
           process.env.TERMUX === 'true' ||
           process.env.PREFIX?.includes('/com.termux') ||
           process.env.TERMUX_VERSION !== undefined;
  },

  /** WSL (Windows Subsystem for Linux) detection */
  get isWSL(): boolean {
    return this.isLinux && (
      process.env.WSL_DISTRO_NAME !== undefined ||
      process.env.WSLENV !== undefined ||
      require('fs').existsSync('/proc/version') &&
      require('fs').readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft')
    );
  },

  /** File system capabilities */
  get hasCaseInsensitiveFS(): boolean {
    return this.isWindows || this.isMacOS;
  },

  get hasFilePermissions(): boolean {
    return !this.isWindows;
  },

  get supportsSymlinks(): boolean {
    return this.isLinux || this.isMacOS || this.isWSL;
  },

  get supportsHardLinks(): boolean {
    return this.isLinux || this.isMacOS;
  },

  /** Path separator */
  get pathSeparator(): string {
    return this.isWindows ? '\\' : '/';
  },

  /** Line ending */
  get lineEnding(): string {
    return this.isWindows ? '\r\n' : '\n';
  },

  /** Executable file extensions */
  get executableExtensions(): string[] {
    return this.isWindows ? ['.exe', '.bat', '.cmd'] : [];
  },

  /** Environment variable normalization */
  normalizeEnvVar(key: string): string {
    return this.isWindows ? key.toUpperCase() : key;
  },

  /** Path normalization for cross-platform */
  normalizePath(p: string): string {
    const normalized = require('path').normalize(p);
    if (this.isWindows) {
      return normalized.replace(/\//g, '\\');
    }
    return normalized.replace(/\\/g, '/');
  },

  /** Check if path is absolute */
  isAbsolute(p: string): boolean {
    if (this.isWindows) {
      return /^[A-Za-z]:\\|\\\\/.test(p) || require('path').isAbsolute(p);
    }
    return require('path').isAbsolute(p);
  },

  /** Get platform-specific resource limits */
  getResourceLimits() {
    const limits = {
      maxMemory: 512 * 1024 * 1024, // 512MB default
      maxCpuTime: 30000, // 30 seconds default
      maxFileSize: 10 * 1024 * 1024, // 10MB default
      maxProcesses: 10,
    };

    if (this.isTermux) {
      // More conservative limits for mobile environments
      return {
        ...limits,
        maxMemory: 256 * 1024 * 1024, // 256MB
        maxCpuTime: 15000, // 15 seconds
        maxFileSize: 5 * 1024 * 1024, // 5MB
        maxProcesses: 5,
      };
    }

    return limits;
  },

  /** Get platform-specific temp directory */
  getTempDir(): string {
    const os = require('os');
    const path = require('path');

    if (this.isWindows) {
      return process.env.TEMP || process.env.TMP || path.join(os.tmpdir(), 'recursa');
    }

    return process.env.TMPDIR || os.tmpdir();
  },

  /** Get platform-specific user data directory */
  getUserDataDir(appName: string = 'recursa'): string {
    const os = require('os');
    const path = require('path');
    const homeDir = os.homedir();

    if (this.isWindows) {
      return process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming', appName);
    }

    if (this.isMacOS) {
      return path.join(homeDir, 'Library', 'Application Support', appName);
    }

    // Linux, Android, etc.
    return process.env.XDG_DATA_HOME || path.join(homeDir, '.local', 'share', appName);
  },

  /** Platform-specific error handling */
  handleFileError(error: Error & { code?: string }, operation: string, filePath?: string): Error {
    const message = filePath ? `${operation} failed for ${filePath}` : `${operation} failed`;

    if (this.isWindows) {
      // Windows-specific error codes and messages
      if (error.code === 'EPERM') {
        return new Error(`${message}: Permission denied. Try running as administrator.`);
      }
      if (error.code === 'EBUSY') {
        return new Error(`${message}: File is in use by another process.`);
      }
    }

    if (this.isTermux) {
      // Termux/Android specific errors
      if (error.code === 'EACCES') {
        return new Error(`${message}: Permission denied. Check storage permissions.`);
      }
    }

    return new Error(`${message}: ${error.message}`);
  },

  /** Platform detection string for logging */
  get platformString(): string {
    const parts: string[] = [process.platform, process.arch];

    if (this.isTermux) parts.push('termux');
    if (this.isWSL) parts.push('wsl');

    return parts.join('-');
  },

  /** Feature detection */
  async detectFeatures(): Promise<Record<string, boolean>> {
    const fs = require('fs').promises;
    const features: Record<string, boolean> = {};

    // Test symlink support
    try {
      const testFile = require('path').join(this.getTempDir(), 'symlink-test');
      await fs.writeFile(testFile, 'test');
      const linkFile = testFile + '-link';
      await fs.symlink(testFile, linkFile);
      await fs.unlink(linkFile);
      await fs.unlink(testFile);
      features.symlinks = true;
    } catch {
      features.symlinks = false;
    }

    // Test hard link support
    try {
      const testFile = require('path').join(this.getTempDir(), 'hardlink-test');
      await fs.writeFile(testFile, 'test');
      const linkFile = testFile + '-hard';
      await fs.link(testFile, linkFile);
      await fs.unlink(linkFile);
      await fs.unlink(testFile);
      features.hardLinks = true;
    } catch {
      features.hardLinks = false;
    }

    // Test file permissions
    try {
      const testFile = require('path').join(this.getTempDir(), 'perm-test');
      await fs.writeFile(testFile, 'test');
      await fs.chmod(testFile, 0o755);
      await fs.unlink(testFile);
      features.filePermissions = true;
    } catch {
      features.filePermissions = false;
    }

    return features;
  }
};

export default platform;
````

## File: tests/integration/knowledge-graph-workflow.test.ts
````typescript
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from '@jest/globals';
import {
  createTestHarness,
  cleanupTestHarness,
  type TestHarnessState,
} from '../lib/test-harness.js';

// This test suite is intentionally stateful.
// Each `it` block builds on the state created by the previous ones
// to simulate a real, multi-turn agent workflow.
describe('Knowledge Graph Workflow Integration Test', () => {
  let harness: TestHarnessState;

  // Setup the test environment once before all tests in this suite
  beforeAll(async () => {
    harness = await createTestHarness();
  });

  // Cleanup the test environment once after all tests in this suite have run
  afterAll(async () => {
    if (harness) {
      await cleanupTestHarness(harness);
    }
  });

  // Part 2, Step 1: Create the central project hub
  it('1. should create the project hub file', async () => {
    const projectContent = `- # Project Singularity
  - status:: active
  - start-date:: 2024-06-01
`;
    await harness.mem.writeFile('projects/Project Singularity.md', projectContent);
    await harness.mem.commitChanges('feat: create Project Singularity hub');

    expect(
      await harness.mem.fileExists('projects/Project Singularity.md')
    ).toBe(true);
  });

  // Part 2, Step 2: Create the people entities
  it('2. should create person entities and link them to the project', async () => {
    const evelynContent = `- # Dr. Evelyn Reed
  - type:: person
  - role:: Lead Research Scientist
  - leads-project::
    - [[Project Singularity]]
`;
    const arisContent = `- # Dr. Aris Thorne
  - type:: person
  - role:: Research Scientist
  - team-member::
    - [[Project Singularity]]
`;
    await harness.mem.writeFile('people/Dr. Evelyn Reed.md', evelynContent);
    await harness.mem.writeFile('people/Dr. Aris Thorne.md', arisContent);
    await harness.mem.commitChanges('feat: add project team members');

    expect(await harness.mem.fileExists('people/Dr. Evelyn Reed.md')).toBe(
      true
    );
    expect(await harness.mem.fileExists('people/Dr. Aris Thorne.md')).toBe(
      true
    );
  });

  // Part 2, Step 3: Document the architecture meeting
  it('3. should document the architecture meeting', async () => {
    const meetingContent = `- # 2024-07-22 - Singularity Architecture Deep Dive
  - type:: meeting
  - project:: [[Project Singularity]]
  - attendees:: [[Dr. Evelyn Reed]], [[Dr. Aris Thorne]]
  - outcomes::
    - This decision is formally documented in [[ADR-001 - Use Micro-frontend Architecture]].
  - action-items::
    - [[Dr. Aris Thorne]] to draft the initial ADR.
`;
    await harness.mem.writeFile(
      'meetings/2024/2024-07-22 - Singularity Architecture Deep Dive.md',
      meetingContent
    );
    await harness.mem.commitChanges('docs: record architecture deep dive meeting');

    expect(
      await harness.mem.fileExists(
        'meetings/2024/2024-07-22 - Singularity Architecture Deep Dive.md'
      )
    ).toBe(true);
  });

  // Part 2, Step 4: Formalize the architectural decision
  it('4. should formalize the architectural decision', async () => {
    const adrContent = `- # ADR-001: Use Micro-frontend Architecture
  - status:: accepted
  - date:: 2024-07-25
  - authors:: [[Dr. Aris Thorne]]
  - decided-in:: [[2024-07-22 - Singularity Architecture Deep Dive]]
  - context::
    - The UI for the reasoning engine needs to be modular to allow different teams to work on visualization and input components independently.
  - justification::
    - Enables independent deployment cycles.
    - Reduces cognitive load for new developers.
  - consequences::
    - Increased complexity in the build pipeline.
    - Requires a robust component sharing strategy.
`;
    await harness.mem.writeFile(
      'decisions/ADR-001 - Use Micro-frontend Architecture.md',
      adrContent
    );
    await harness.mem.commitChanges('feat: add ADR-001 for micro-frontends');

    expect(
      await harness.mem.fileExists(
        'decisions/ADR-001 - Use Micro-frontend Architecture.md'
      )
    ).toBe(true);
  });

  // Part 2, Step 5: Update the project hub with all links
  it('5. should update the project hub with all new links', async () => {
    const projectPath = 'projects/Project Singularity.md';
    const oldContent = await harness.mem.readFile(projectPath);

    const newContent = `${oldContent}
  - lead:: [[Dr. Evelyn Reed]]
  - team:: [[Dr. Aris Thorne]]
  - key-decisions::
    - [[ADR-001 - Use Micro-frontend Architecture]]
  - meetings::
    - [[2024-07-22 - Singularity Architecture Deep Dive]]
`;

    await harness.mem.updateFile(projectPath, oldContent, newContent);
    await harness.mem.commitChanges(
      'refactor: update project hub with all entity links'
    );

    const updatedContent = await harness.mem.readFile(projectPath);
    expect(updatedContent).toContain('[[Dr. Evelyn Reed]]');
    expect(updatedContent).toContain(
      '[[ADR-001 - Use Micro-frontend Architecture]]'
    );
    expect(updatedContent).toContain(
      '[[2024-07-22 - Singularity Architecture Deep Dive]]'
    );
  });

  // Part 3, Step 1: Test backlink and outgoing link resolution
  it('6. should resolve backlinks and outgoing links correctly', async () => {
    // Test backlinks for Dr. Aris Thorne
    const arisBacklinks = await harness.mem.getBacklinks(
      'people/Dr. Aris Thorne.md'
    );
    expect(arisBacklinks).toEqual(
      expect.arrayContaining([
        'decisions/ADR-001 - Use Micro-frontend Architecture.md',
        'meetings/2024/2024-07-22 - Singularity Architecture Deep Dive.md',
        'projects/Project Singularity.md',
      ])
    );
    // Add a negative assertion for robustness
    expect(arisBacklinks).not.toContain('people/Dr. Evelyn Reed.md');

    // Test outgoing links for the main project file
    const projectOutgoingLinks = await harness.mem.getOutgoingLinks(
      'projects/Project Singularity.md'
    );
    expect(projectOutgoingLinks).toEqual(
      expect.arrayContaining([
        'Dr. Evelyn Reed',
        'Dr. Aris Thorne',
        'ADR-001 - Use Micro-frontend Architecture',
        '2024-07-22 - Singularity Architecture Deep Dive',
      ])
    );
    // Add a negative assertion for robustness
    expect(projectOutgoingLinks).not.toContain('Some Random Unlinked Page');
  });

  // Part 3, Step 2: Simulate the complex user query from docs/overview.md
  it('7. should simulate the complex query for micro-frontend decision', async () => {
    // 1. "User is asking about a decision for 'Singularity'. I'll start by searching for a decision record."
    // A more realistic initial search. The agent wouldn't know to combine terms yet.
    // This failed because "Singularity" is not in the ADR file itself.
    const searchResults = await harness.mem.searchGlobal('micro-frontend');
    expect(searchResults).toContain(
      'decisions/ADR-001 - Use Micro-frontend Architecture.md'
    );

    // 2. "Found the ADR. I'll read it to get the justification and find the source meeting."
    const adrPath = searchResults.find(p =>
      p.startsWith('decisions/')
    );
    expect(adrPath).toBeDefined();

    const adrContent = await harness.mem.readFile(adrPath!);
    const meetingLinkMatch = adrContent.match(/decided-in::\s*\[\[(.*?)\]\]/);
    expect(meetingLinkMatch).not.toBeNull();
    const meetingTitle = meetingLinkMatch![1];

    // 3. "Okay, the decision was made in that meeting. Now I'll read the meeting file to find the attendees."
    const meetingPath = `meetings/2024/${meetingTitle}.md`;
    const meetingContent = await harness.mem.readFile(meetingPath);
    const attendeesMatch = meetingContent.match(/attendees::\s*(.*)/);
    expect(attendeesMatch).not.toBeNull();

    // 4. "I have all the pieces. I'll synthesize the final answer."
    const attendees = attendeesMatch![1];
    expect(attendees).toContain('[[Dr. Evelyn Reed]]');
    expect(attendees).toContain('[[Dr. Aris Thorne]]');
  });

  // Part 3, Step 3: Validate git history
  it('8. should have a complete and accurate git history', async () => {
    const log = await harness.mem.gitLog('projects/Project Singularity.md', 5);
    expect(log.length).toBeGreaterThanOrEqual(2);
    expect(log[0]?.message).toBe(
      'refactor: update project hub with all entity links'
    );
    expect(log[log.length - 1]?.message).toBe(
      'feat: create Project Singularity hub'
    );
  });
});
````

## File: tests/unit/logseq-validator.test.ts
````typescript
import { describe, it, expect } from '@jest/globals';
import { validateLogseqContent } from '../../src/lib/logseq-validator.js';

describe('Logseq Content Validator', () => {
  it('should return valid for correct Logseq content', () => {
    const content = `
- # Page Title
  - property:: value
  - List item 1
    - Nested item 1.1
      - Doubly nested item
  - List item 2
- Another root item
`;
    const result = validateLogseqContent(content);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should return valid for empty or whitespace-only content', () => {
    expect(validateLogseqContent('').isValid).toBe(true);
    expect(validateLogseqContent('   \n\n  ').isValid).toBe(true);
  });

  it('should detect lines not starting with "- "', () => {
    const content = `
- Valid item
Invalid item
`;
    const result = validateLogseqContent(content);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      'Line 3: Must start with "- ". Found: "Invalid item"'
    );
  });

  it('should detect incorrect indentation (not a multiple of 2)', () => {
    const content = `
- Root
   - Invalid indentation
`;
    const result = validateLogseqContent(content);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      'Line 3: Indentation must be a multiple of 2. Found 3 spaces.'
    );
  });

  it('should detect incorrect single-space indentation', () => {
    const content = `
- Root
 - Invalid indentation
`;
    const result = validateLogseqContent(content);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      'Line 3: Indentation must be a multiple of 2. Found 1 spaces.'
    );
  });

  it('should detect illogical nesting (jumping more than one level)', () => {
    const content = `
- Root
    - Invalid jump
`;
    const result = validateLogseqContent(content);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      'Line 3: Invalid nesting. Indentation increased by more than one level (from 0 to 4 spaces).'
    );
  });

  it('should detect properties at the root level', () => {
    const content = `
- property:: not-allowed-at-root
`;
    const result = validateLogseqContent(content);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      'Line 2: Properties (using "::") cannot be at the root level.'
    );
  });

  it('should allow properties at nested levels', () => {
    const content = `
- Item
  - property:: allowed-here
`;
    const result = validateLogseqContent(content);
    expect(result.isValid).toBe(true);
  });

  it('should handle multiple errors at once', () => {
    const content = `
Root without dash
- property:: at-root
   - bad indent
        - bad nesting jump
`;
    const result = validateLogseqContent(content);
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual([
      'Line 2: Must start with "- ". Found: "Root without dash"',
      'Line 3: Properties (using "::") cannot be at the root level.',
      'Line 4: Indentation must be a multiple of 2. Found 3 spaces.',
      'Line 4: Invalid nesting. Indentation increased by more than one level (from 0 to 3 spaces).',
      'Line 5: Invalid nesting. Indentation increased by more than one level (from 3 to 8 spaces).',
    ]);
  });
});
````

## File: debug-stash.ts
````typescript
#!/usr/bin/env ts-node

import simpleGit from 'simple-git';
import { createTestHarness, cleanupTestHarness } from './tests/lib/test-harness.ts';

async function debugStashOperations() {
  console.log('=== Debugging Stash Operations ===');

  const harness = await createTestHarness();

  try {
    // Step 1: Create initial commit
    console.log('\n1. Creating initial commit...');
    await harness.mem.writeFile('init.txt', 'initial file');
    await harness.mem.commitChanges('initial commit for stash test');
    console.log('Initial commit created');

    // Step 2: Create file1.md and save checkpoint
    console.log('\n2. Creating file1.md and saving checkpoint...');
    await harness.mem.writeFile('file1.md', 'content1');
    console.log('file1.md created, exists:', await harness.mem.fileExists('file1.md'));

    const saveSuccess = await harness.mem.saveCheckpoint();
    console.log('saveCheckpoint success:', saveSuccess);
    console.log('file1.md exists after saveCheckpoint:', await harness.mem.fileExists('file1.md'));

    // Check git status
    const status1 = await harness.git.status();
    console.log('Git status after saveCheckpoint:', {
      staged: status1.staged,
      modified: status1.modified,
      created: status1.created,
      not_added: status1.not_added,
      isClean: status1.isClean()
    });

    // Check stash list
    const stashes = await harness.git.stashList();
    console.log('Stash list:', stashes.all.length, 'stashes');

    // Step 3: Create file2.md
    console.log('\n3. Creating file2.md...');
    await harness.mem.writeFile('file2.md', 'content2');
    console.log('file2.md created, exists:', await harness.mem.fileExists('file2.md'));
    console.log('file1.md exists:', await harness.mem.fileExists('file1.md'));

    // Check git status
    const status2 = await harness.git.status();
    console.log('Git status after creating file2.md:', {
      staged: status2.staged,
      modified: status2.modified,
      created: status2.created,
      not_added: status2.not_added,
      isClean: status2.isClean()
    });

    // Step 4: Revert to checkpoint
    console.log('\n4. Reverting to checkpoint...');
    const revertSuccess = await harness.mem.revertToLastCheckpoint();
    console.log('revertToLastCheckpoint success:', revertSuccess);
    console.log('file1.md exists after revert:', await harness.mem.fileExists('file1.md'));
    console.log('file2.md exists after revert:', await harness.mem.fileExists('file2.md'));

    // Check git status after revert
    const status3 = await harness.git.status();
    console.log('Git status after revert:', {
      staged: status3.staged,
      modified: status3.modified,
      created: status3.created,
      not_added: status3.not_added,
      isClean: status3.isClean()
    });

    // Check stash list after revert
    const stashesAfter = await harness.git.stashList();
    console.log('Stash list after revert:', stashesAfter.all.length, 'stashes');

  } finally {
    await cleanupTestHarness(harness);
  }
}

debugStashOperations().catch(console.error);
````

## File: INSTALL_TERMUX.md
````markdown
# Termux Installation Guide

This project works on Termux with some modifications due to Android's filesystem limitations.

## Prerequisites
```bash
pkg update && pkg upgrade
pkg install nodejs npm git
```

## Installation (Termux-specific)
```bash
# Install dependencies with Termux compatibility flags
npm install --ignore-scripts --no-bin-links

# Make binaries executable
find node_modules -name "*.js" -path "*/bin/*" -exec chmod +x {} \;
find node_modules -name "tsx" -type f -exec chmod +x {} \;
find node_modules -name "esbuild" -type f -exec chmod +x {} \;

# Run TypeScript compiler directly using npx
npx tsc

# Start development server
npx tsx watch src/server.ts
```

## Alternative: Use the prepared scripts
```bash
npm run install:termux
npm run dev:termux
```

## Known Limitations
- Binary executables need manual permission fixes
- Some linting tools may not work due to missing binaries
- ESLint and Prettier dependencies removed for compatibility
````

## File: src/lib/gitignore-parser.ts
````typescript
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Represents a parsed gitignore pattern
 */
interface GitignorePattern {
  pattern: string;
  isNegated: boolean;
  isDirectory: boolean;
}

/**
 * Creates a gitignore pattern object from a raw pattern string
 */
const parsePattern = (rawPattern: string): GitignorePattern | null => {
  // Skip empty lines and comments
  if (!rawPattern.trim() || rawPattern.trim().startsWith('#')) {
    return null;
  }

  const trimmed = rawPattern.trim();
  const isNegated = trimmed.startsWith('!');
  const pattern = isNegated ? trimmed.slice(1) : trimmed;
  const isDirectory = pattern.endsWith('/');

  return {
    pattern: isDirectory ? pattern.slice(0, -1) : pattern,
    isNegated,
    isDirectory,
  };
};

/**
 * Tests if a file path matches a gitignore pattern
 */
const matchesPattern = (
  filePath: string,
  relativePath: string,
  parsedPattern: GitignorePattern
): boolean => {
  const { pattern, isDirectory } = parsedPattern;
  
  // Convert gitignore pattern to regex
  let regexPattern = pattern
    // Escape special regex characters except * and ?
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    // Convert * to match any characters except path separators
    .replace(/\*/g, '[^/]*')
    // Convert ? to match any single character except path separators
    .replace(/\?/g, '[^/]')
    // Convert ** to match any characters including path separators
    .replace(/\*\*/g, '.*')
    // Anchors for start and end
    .replace(/^(?![^/])/, '^')
    .replace(/(?<![^/])$/, '$');

  // If pattern doesn't contain a slash, match against basename only
  if (!pattern.includes('/')) {
    regexPattern = `(?:^|.*/)${regexPattern}`;
  }

  const regex = new RegExp(regexPattern);
  
  // For directory patterns, ensure we're matching directories
  if (isDirectory) {
    // Check if it's a directory (ends with / in relative path)
    if (!relativePath.endsWith('/')) {
      return false;
    }
  }

  // Test against relative path
  const matches = regex.test(relativePath);
  
  return matches;
};

/**
 * Creates an ignore filter function from a .gitignore file
 * @param directory The directory containing the .gitignore file
 * @returns A function that returns true if a path should be ignored
 */
export const createIgnoreFilter = async (
  directory: string
): Promise<(filePath: string) => boolean> => {
  const gitignorePath = path.join(directory, '.gitignore');
  
  try {
    const content = await fs.readFile(gitignorePath, 'utf-8');
    const lines = content.split('\n');
    
    const patterns: GitignorePattern[] = [];
    for (const line of lines) {
      const parsed = parsePattern(line);
      if (parsed) {
        patterns.push(parsed);
      }
    }

    // Return the filter function
    return (filePath: string): boolean => {
      const relativePath = path.relative(directory, filePath);
      
      if (relativePath === '') return false; // Never ignore the root directory
      
      let isIgnored = false;
      
      // Process patterns in order
      for (const pattern of patterns) {
        if (matchesPattern(filePath, relativePath, pattern)) {
          isIgnored = !pattern.isNegated;
        }
      }
      
      return isIgnored;
    };
  } catch {
    // .gitignore doesn't exist or can't be read, return a function that never ignores
    return (): boolean => false;
  }
};

/**
 * Creates an ignore filter that combines multiple ignore filters
 * @param filters Array of ignore filter functions
 * @returns A combined ignore filter function
 */
export const combineIgnoreFilters = (
  filters: Array<(filePath: string) => boolean>
): ((filePath: string) => boolean) => {
  return (filePath: string): boolean => {
    return filters.some(filter => filter(filePath));
  };
};
````

## File: tests/integration/mem-api-file-ops.test.ts
````typescript
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals';
import {
  createTestHarness,
  cleanupTestHarness,
  type TestHarnessState,
} from '../lib/test-harness';
import type { MemAPI } from '../../src/types';
import path from 'path';
import { promises as fs } from 'fs';

describe('MemAPI File Ops Integration Tests', () => {
  let harness: TestHarnessState;
  let mem: MemAPI;

  beforeEach(async () => {
    harness = await createTestHarness();
    mem = harness.mem;
  });

  afterEach(async () => {
    await cleanupTestHarness(harness);
  });

  it('should write, read, and check existence of a file', async () => {
    const filePath = 'test.md';
    const content = '- hello world';

    await mem.writeFile(filePath, content);

    const readContent = await mem.readFile(filePath);
    expect(readContent).toBe(content);

    const exists = await mem.fileExists(filePath);
    expect(exists).toBe(true);

    const nonExistent = await mem.fileExists('not-real.md');
    expect(nonExistent).toBe(false);
  });

  it('should create nested directories', async () => {
    const dirPath = 'a/b/c';
    await mem.createDir(dirPath);
    const stats = await fs.stat(path.join(harness.tempDir, dirPath));
    expect(stats.isDirectory()).toBe(true);
  });

  it('should list files in a directory', async () => {
    await mem.writeFile('a.txt', 'a');
    await mem.writeFile('b.txt', 'b');
    await mem.createDir('subdir');
    await mem.writeFile('subdir/c.txt', 'c');

    const rootFiles = await mem.listFiles();
    expect(rootFiles).toEqual(
      expect.arrayContaining(['a.txt', 'b.txt', 'subdir'])
    );
    expect(rootFiles.length).toBeGreaterThanOrEqual(3); // .gitignore might be there

    const subdirFiles = await mem.listFiles('subdir');
    expect(subdirFiles).toEqual(['c.txt']);

    await mem.createDir('empty');
    const emptyFiles = await mem.listFiles('empty');
    expect(emptyFiles).toEqual([]);
  });

  it('should update a file atomically and fail if content changes', async () => {
    const filePath = 'atomic.txt';
    const originalContent = 'version 1';
    const newContent = 'version 2';

    // 1. Successful update
    await mem.writeFile(filePath, originalContent);
    const success = await mem.updateFile(filePath, originalContent, newContent);
    expect(success).toBe(true);
    const readContent1 = await mem.readFile(filePath);
    expect(readContent1).toBe(newContent);

    // 2. Failed update (content changed underneath)
    const currentContent = await mem.readFile(filePath); // "version 2"
    const nextContent = 'version 3';

    // Simulate another process changing the file
    await fs.writeFile(path.join(harness.tempDir, filePath), 'version 2.5');

    // The update should fail because 'currentContent' ("version 2") no longer matches the file on disk ("version 2.5")
    await expect(
      mem.updateFile(filePath, currentContent, nextContent)
    ).rejects.toThrow(/File content has changed since it was last read/);

    // Verify the file was NOT changed by the failed update
    const readContent2 = await mem.readFile(filePath);
    expect(readContent2).toBe('version 2.5');
  });

  it('should delete a file and a directory recursively', async () => {
    // Delete file
    await mem.writeFile('file-to-delete.txt', 'content');
    expect(await mem.fileExists('file-to-delete.txt')).toBe(true);
    await mem.deletePath('file-to-delete.txt');
    expect(await mem.fileExists('file-to-delete.txt')).toBe(false);

    // Delete directory
    await mem.createDir('dir-to-delete/subdir');
    await mem.writeFile('dir-to-delete/subdir/file.txt', 'content');
    expect(await mem.fileExists('dir-to-delete/subdir/file.txt')).toBe(true);
    await mem.deletePath('dir-to-delete');
    expect(await mem.fileExists('dir-to-delete')).toBe(false);
  });

  it('should rename a file and a directory', async () => {
    // Rename file
    await mem.writeFile('old-name.txt', 'content');
    expect(await mem.fileExists('old-name.txt')).toBe(true);
    await mem.rename('old-name.txt', 'new-name.txt');
    expect(await mem.fileExists('old-name.txt')).toBe(false);
    expect(await mem.fileExists('new-name.txt')).toBe(true);
    expect(await mem.readFile('new-name.txt')).toBe('content');

    // Rename directory
    await mem.createDir('old-dir/subdir');
    await mem.writeFile('old-dir/subdir/file.txt', 'content');
    expect(await mem.fileExists('old-dir')).toBe(true);
    await mem.rename('old-dir', 'new-dir');
    expect(await mem.fileExists('old-dir')).toBe(false);
    expect(await mem.fileExists('new-dir/subdir/file.txt')).toBe(true);
  });

  describe('Path Traversal Security', () => {
    const maliciousPath = '../../../etc/malicious';
    const ops: { name: string; fn: (mem: MemAPI) => Promise<unknown> }[] = [
      { name: 'readFile', fn: (mem) => mem.readFile(maliciousPath) },
      { name: 'writeFile', fn: (mem) => mem.writeFile(maliciousPath, '...') },
      {
        name: 'updateFile',
        fn: (mem) => mem.updateFile(maliciousPath, 'old', 'new'),
      },
      { name: 'deletePath', fn: (mem) => mem.deletePath(maliciousPath) },
      { name: 'rename_from', fn: (mem) => mem.rename(maliciousPath, 'safe') },
      { name: 'rename_to', fn: (mem) => mem.rename('safe', maliciousPath) },
      { name: 'fileExists', fn: (mem) => mem.fileExists(maliciousPath) },
      { name: 'createDir', fn: (mem) => mem.createDir(maliciousPath) },
      { name: 'listFiles', fn: (mem) => mem.listFiles(maliciousPath) },
    ];

    for (const op of ops) {
      it(`should block path traversal for ${op.name}`, async () => {
        // fileExists should return false, not throw, for security reasons.
        if (op.name === 'fileExists') {
          await expect(op.fn(mem)).resolves.toBe(false);
        } else {
          // All other ops should reject with a security error.
          await expect(op.fn(mem)).rejects.toThrow(
            /Path traversal attempt detected|Security violation/
          );
        }
      });
    }
  });
});
````

## File: tests/integration/mem-api-state-ops.test.ts
````typescript
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals';
import {
  createTestHarness,
  cleanupTestHarness,
  type TestHarnessState,
} from '../lib/test-harness';
import type { MemAPI } from '../../src/types';

describe('MemAPI State Ops Integration Tests', () => {
  let harness: TestHarnessState;
  let mem: MemAPI;

  beforeEach(async () => {
    harness = await createTestHarness();
    mem = harness.mem;
  });

  afterEach(async () => {
    await cleanupTestHarness(harness);
  });

  it('should save and revert to a checkpoint', async () => {
    // 1. Initial state
    await mem.writeFile('a.txt', 'version a');
    await mem.commitChanges('commit a');

    // 2. Make changes and save checkpoint
    await mem.writeFile('b.txt', 'version b');
    const successSave = await mem.saveCheckpoint();
    expect(successSave).toBe(true);
    expect(await mem.fileExists('b.txt')).toBe(false); // Stashing removes the file from the working dir

    // 3. Make more changes
    await mem.writeFile('c.txt', 'version c');
    expect(await mem.fileExists('c.txt')).toBe(true);

    // 4. Revert by applying the stashed changes
    const successRevert = await mem.revertToLastCheckpoint();
    expect(successRevert).toBe(true);

    // 5. Assert state
    expect(await mem.fileExists('a.txt')).toBe(true);
    expect(await mem.fileExists('b.txt')).toBe(true); // Restored from checkpoint
    expect(await mem.fileExists('c.txt')).toBe(true); // Other working dir changes are preserved
  });

  it('should discard all staged and unstaged changes', async () => {
    // 1. Initial state
    await mem.writeFile('a.txt', 'original a');
    await mem.commitChanges('commit a');

    // 2. Make changes
    await mem.writeFile('a.txt', 'modified a'); // unstaged
    await mem.writeFile('b.txt', 'new b'); // unstaged
    await mem.writeFile('c.txt', 'new c'); // will be staged
    await harness.git.add('c.txt');

    // 3. Discard
    const successDiscard = await mem.discardChanges();
    expect(successDiscard).toBe(true);

    // 4. Assert state
    expect(await mem.readFile('a.txt')).toBe('original a'); // Reverted
    expect(await mem.fileExists('b.txt')).toBe(false); // Removed
    expect(await mem.fileExists('c.txt')).toBe(false); // Removed

    const status = await harness.git.status();
    expect(status.isClean()).toBe(true);
  });

  it('should handle reverting when no checkpoint exists', async () => {
    await mem.writeFile('a.txt', 'content');
    const success = await mem.revertToLastCheckpoint();

    // It should not throw an error and return false to indicate nothing was reverted.
    expect(success).toBe(false);
    expect(await mem.readFile('a.txt')).toBe('content'); // File should be untouched
  });
});
````

## File: tests/integration/mem-api-util-ops.test.ts
````typescript
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals';
import {
  createTestHarness,
  cleanupTestHarness,
  type TestHarnessState,
} from '../lib/test-harness';
import type { MemAPI } from '../../src/types';

describe('MemAPI Util Ops Integration Tests', () => {
  let harness: TestHarnessState;
  let mem: MemAPI;

  beforeEach(async () => {
    harness = await createTestHarness();
    mem = harness.mem;
  });

  afterEach(async () => {
    await cleanupTestHarness(harness);
  });

  it('should return the correct graph root path', async () => {
    const root = await mem.getGraphRoot();
    expect(root).toBe(harness.tempDir);
  });

  it('should correctly estimate token count for a single file', async () => {
    const content = 'This is a test sentence with several words.'; // 44 chars
    await mem.writeFile('test.txt', content);
    const tokenCount = await mem.getTokenCount('test.txt');
    const expected = Math.ceil(content.length / 4); // 11
    expect(tokenCount).toBe(expected);
  });

  it('should correctly estimate token counts for multiple files', async () => {
    const content1 = 'File one content.'; // 17 chars -> 5 tokens
    const content2 = 'File two has slightly more content here.'; // 38 chars -> 10 tokens
    await mem.writeFile('file1.txt', content1);
    await mem.writeFile('sub/file2.txt', content2);

    const results = await mem.getTokenCountForPaths([
      'file1.txt',
      'sub/file2.txt',
    ]);

    expect(results).toHaveLength(2);
    expect(results).toEqual(
      expect.arrayContaining([
        { path: 'file1.txt', tokenCount: Math.ceil(content1.length / 4) },
        { path: 'sub/file2.txt', tokenCount: Math.ceil(content2.length / 4) },
      ])
    );
  });

  it('should throw an error when counting tokens for a non-existent file', async () => {
    await expect(mem.getTokenCount('not-real.txt')).rejects.toThrow(
      /Failed to count tokens for not-real.txt/
    );
  });
});
````

## File: tests/setup.ts
````typescript
import { beforeAll, afterAll, jest } from '@jest/globals';

// Jest setup file to handle Node.js v25+ compatibility issues
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  writable: true,
});


// --- Console Output Suppression ---
// The following hooks suppress console output during test runs to keep the output clean.
// This is crucial for identifying real test failures without noise from application logs.
// The original console methods are restored after all tests complete.

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'debug').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});
````

## File: .dockerignore
````
# Git
.git
.gitignore

# Node
node_modules

# Local Environment
.env
.env.*
! .env.example

# IDE / OS
.vscode
.idea
.DS_Store

# Logs and temp files
npm-debug.log*
yarn-debug.log*
*.log

# Build output & test artifacts
dist
coverage
jest.config.js

# Docker
Dockerfile
.dockerignore
````

## File: .prettierrc.json
````json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "endOfLine": "lf"
}
````

## File: Dockerfile
````dockerfile
# ---- Base Stage ----
# Use an official Node.js image.
FROM node:20-slim as base
WORKDIR /usr/src/app

# ---- Dependencies Stage ----
# Install dependencies. This layer is cached to speed up subsequent builds
# if dependencies haven't changed.
FROM base as deps
COPY package.json package-lock.json* ./
RUN npm ci

# ---- Build Stage ----
# Copy source code and build the application.
FROM base as build
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- Production Stage ----
# Create a smaller final image.
# We only copy the necessary files to run the application.
FROM node:20-slim as production
WORKDIR /usr/src/app

# Copy production dependencies and built source code
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/package.json ./package.json
COPY .env.example ./.env.example

# Expose the port the app runs on
EXPOSE 3000

# The command to run the application
CMD ["node", "dist/server.js"]
````

## File: eslint.config.js
````javascript
import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.ts', 'src/**/*.tsx', 'scripts/**/*.js', 'tests/**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' }
      ],
      'no-console': 'off', // Allow console for build scripts and logging
      'no-unused-vars': 'off', // Let TypeScript handle this
      'no-undef': 'off', // Let TypeScript handle this
    },
  },
];
````

## File: README.md
````markdown
# Recursa MCP Server

A Git-Native AI agent with MCP (Model Context Protocol) support that works across multiple platforms.

## 🌟 Cross-Platform Support

✅ **Linux, macOS, Windows (WSL2), Termux/Android**
📱 **Mobile-optimized** with conservative resource limits
🔒 **Enhanced security** with cross-platform path protection
⚡ **Auto-detecting** platform detection and optimization

## 🚀 Getting Started

### Automatic Installation (Recommended)
```bash
# Clone and install with automatic platform detection
git clone https://github.com/your-repo/recursa-doc.git
cd recursa-doc
npm run install:auto
npm run build:auto
npm run dev
```

Your server is now running on `http://localhost:8080` (or the port specified in your `.env` file).

### Interacting with the Server

Recursa is a `fastmcp` server. You can interact with it using any MCP-compatible client, including the command-line tools that come with `fastmcp`.

#### Authentication

All requests to the server must be authenticated. You need to provide the `RECURSA_API_KEY` from your `.env` file as a bearer token.

When using `fastmcp` tools, you can set the key via an environment variable:

```bash
export RECURSA_API_KEY="a-very-secret-key"
```

#### Testing with the Interactive CLI

The `fastmcp dev` command is the quickest way to test your server. It starts your server and connects an interactive client in your terminal.

```bash
# Make sure your RECURSA_API_KEY is exported
npx fastmcp dev src/server.ts
```

#### Inspecting with the Web UI

For a more visual way to explore your server's tools and capabilities, use the `fastmcp inspect` command.

```bash
# Make sure your RECURSA_API_KEY is exported
npx fastmcp inspect src/server.ts

### Platform-Specific Installation

#### Linux, macOS, Windows (WSL2)
```bash
npm run install:standard
npm run build:standard
npm run dev:standard
```

#### Termux/Android
```bash
# Install Termux from F-Droid, then:
pkg update && pkg install nodejs npm git
npm run install:termux
npm run build:termux
npm run dev:termux
```

## 📋 Prerequisites

### Minimum Requirements
- **Node.js 18+**
- **Git** for version control
- **512MB RAM** (1GB+ recommended)

### Platform-Specific

#### Termux/Android
- Android 7.0+ with Termux app
- Storage permissions (`termux-setup-storage`)

#### Windows
- Windows 10/11 (WSL2 recommended)
- PowerShell or Git Bash
- Developer mode enabled (for symlink support)

#### Linux
- Build tools for native modules:
  ```bash
  # Ubuntu/Debian
  sudo apt-get install build-essential

  # Fedora
  sudo dnf groupinstall "Development Tools"
  ```

## ⚙️ Configuration

Create a `.env` file with your configuration:

```bash
# Required
OPENROUTER_API_KEY=your_api_key_here
KNOWLEDGE_GRAPH_PATH=/path/to/your/knowledge/graph

# Required: API key for securing the Recursa server endpoint
RECURSA_API_KEY=a-very-secret-key

# Optional: Port for the HTTP server
HTTP_PORT=8080

# Optional (platform-specific defaults apply)
LLM_MODEL=anthropic/claude-3-haiku-20240307
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=4000
SANDBOX_TIMEOUT=10000
SANDBOX_MEMORY_LIMIT=100
GIT_USER_NAME=Recursa Agent
GIT_USER_EMAIL=recursa@local
```

### Platform-Specific Defaults

| Platform | Memory Limit | Max Tokens | Timeout |
|----------|--------------|------------|---------|
| Desktop (Linux/macOS/Windows) | 512MB | 4000 | 10s |
| Termux/Android | 256MB | 2000 | 15s |

## 🏗️ Build & Development

### Available Scripts
```bash
# Installation
npm run install:auto     # Auto-detect platform and install
npm run install:termux   # Termux/Android specific
npm run install:standard # Standard platforms

# Building
npm run build:auto       # Auto-detect platform and build
npm run build:termux     # Termux/Android specific
npm run build:standard   # Standard platforms

# Development
npm run dev              # Standard development
npm run dev:termux       # Termux development
npm run dev:standard     # Standard development

# Production
npm run start            # Start production server
npm run start:termux     # Termux production
npm run start:standard   # Standard production

# Utilities
npm run typecheck        # TypeScript type checking
npm run test             # Run tests
```

## 📁 Project Structure

```
recursa-doc/
├── src/
│   ├── lib/
│   │   └── platform.ts          # Cross-platform utilities
│   ├── core/
│   │   ├── mem-api/
│   │   │   ├── secure-path.ts   # Enhanced path security
│   │   │   └── file-ops.ts      # Cross-platform file operations
│   │   └── sandbox.ts           # Platform-aware sandbox
│   ├── config.ts                # Platform-aware configuration
│   └── server.ts                # Main server
├── scripts/
│   ├── install.js               # Cross-platform installer
│   └── build.js                 # Cross-platform builder
├── docs/
│   ├── PLATFORM_SUPPORT.md      # Detailed platform info
│   └── TROUBLESHOOTING.md       # Troubleshooting guide
└── tests/                       # Cross-platform tests
```

## 🔧 Features

### Cross-Platform Capabilities
- **Automatic platform detection** (Linux, macOS, Windows, Termux/Android)
- **Adaptive resource limits** based on platform capabilities
- **Cross-platform path security** with symlink protection
- **Atomic file operations** with platform-specific error handling
- **Platform-aware build system** with automatic fallbacks

### Core Functionality
- **MCP Protocol Support** for model context integration
- **Git-Native Operations** with full repository management
- **Secure File Operations** with path traversal protection
- **Sandboxed Execution** with resource limits
- **TypeScript Support** with full type safety

### Security Features
- **Path Traversal Protection** with cross-platform validation
- **Symlink Attack Prevention** with configurable policies
- **Resource Limiting** (memory, CPU, file size)
- **Sandbox Isolation** with platform-specific constraints

## 🐛 Troubleshooting

### Common Issues

#### Installation Fails
```bash
# Try platform-specific installation
npm run install:termux    # For Termux/Android
npm run install:standard  # For desktop platforms

# Or manual installation
npm install --ignore-scripts --no-bin-links
```

#### Permission Errors
```bash
# Termux: Setup storage access
termux-setup-storage

# Linux/macOS: Fix npm permissions
sudo chown -R $(whoami) ~/.npm

# Windows: Run as administrator or enable Developer Mode
```

#### Build Fails
```bash
# Clean and rebuild
rm -rf node_modules dist
npm run install:auto
npm run build:auto

# Check platform detection
node -e "import('./src/lib/platform.js').then(p => console.log(p.default.platformString))"
```

For detailed troubleshooting, see [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

## 📚 Documentation

- [Platform Support](docs/PLATFORM_SUPPORT.md) - Detailed platform information
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md) - Common issues and solutions
- [API Documentation](docs/API.md) - API reference (coming soon)
- [Development Guide](docs/DEVELOPMENT.md) - Contributing guidelines (coming soon)

## 🔍 Platform Detection

The server automatically detects and optimizes for your platform:

```typescript
import platform from './src/lib/platform.js';

console.log(`Platform: ${platform.platformString}`);
console.log(`Is Termux: ${platform.isTermux}`);
console.log(`Resource limits:`, platform.getResourceLimits());
console.log(`Temp directory: ${platform.getTempDir()}`);
```

## 🤝 Contributing

Contributions are welcome! Please ensure:
1. Test on all supported platforms
2. Use platform detection utilities
3. Update documentation
4. Include cross-platform tests

### Development Setup
```bash
# Clone and install for development
git clone https://github.com/your-repo/recursa-doc.git
cd recursa-doc
npm run install:auto
npm run dev

# Run tests across platforms
npm run test
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📖 Check [documentation](docs/)
- 🐛 [Report issues](https://github.com/your-repo/recursa-doc/issues)
- 💬 [Discussions](https://github.com/your-repo/recursa-doc/discussions)

## 🔮 Roadmap

- [ ] Additional platform support (FreeBSD, iOS)
- [ ] Docker multi-platform builds
- [ ] Performance optimizations
- [ ] Enhanced monitoring and logging
- [ ] Plugin system for extensions
- [ ] Web UI for configuration

---

**Built with ❤️ for cross-platform AI agent development**
````

## File: src/core/mem-api/fs-walker.ts
````typescript
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Asynchronously and recursively walks a directory, yielding the full path of each file.
 * @param dir The directory to walk.
 * @param isIgnored Optional function to determine if a path should be ignored.
 * @returns An async generator that yields file paths.
 */
export async function* walk(
  dir: string,
  isIgnored: (path: string) => boolean = () => false
): AsyncGenerator<string> {
  for await (const d of await fs.opendir(dir)) {
    const entry = path.join(dir, d.name);
    
    // Skip ignored entries
    if (isIgnored(entry)) {
      continue;
    }
    
    if (d.isDirectory()) {
      yield* walk(entry, isIgnored);
    } else if (d.isFile()) {
      yield entry;
    }
  }
}
````

## File: src/types/sandbox.ts
````typescript
export interface SandboxOptions {
  timeout?: number;
  memoryLimit?: number;
  allowedGlobals?: string[];
  forbiddenGlobals?: string[];
}

export interface SandboxExecutionContext {
  mem: import('./mem.js').MemAPI;
  console: Console;
}

export interface SandboxResult {
  success: boolean;
  result?: unknown;
  error?: string;
  output?: string;
  executionTime: number;
}

export type SandboxCode = string;

export interface ExecutionConstraints {
  maxExecutionTime: number;
  maxMemoryBytes: number;
  allowedModules: string[];
  forbiddenAPIs: string[];
}
````

## File: tests/integration/mem-api-git-ops.test.ts
````typescript
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals';
import {
  createTestHarness,
  cleanupTestHarness,
  type TestHarnessState,
} from '../lib/test-harness';
import type { MemAPI } from '../../src/types';

describe('MemAPI Git Ops Integration Tests', () => {
  let harness: TestHarnessState;
  let mem: MemAPI;

  beforeEach(async () => {
    harness = await createTestHarness();
    mem = harness.mem;
  });

  afterEach(async () => {
    await cleanupTestHarness(harness);
  });

  it('should commit a change and log it', async () => {
    const filePath = 'a.md';
    const content = '- content';
    const commitMessage = 'feat: add a.md';

    await mem.writeFile(filePath, content);

    const commitHash = await mem.commitChanges(commitMessage);

    expect(typeof commitHash).toBe('string');
    expect(commitHash.length).toBeGreaterThan(5);

    const log = await mem.gitLog(filePath, 1);

    expect(log).toHaveLength(1);
    expect(log[0]).toBeDefined();
    expect(log[0]?.message).toBe(commitMessage);
  });

  it('should return diff for a file', async () => {
    const filePath = 'a.md';
    await mem.writeFile(filePath, '- version 1');
    await mem.commitChanges('v1');

    await mem.writeFile(filePath, '- version 1\n- version 2');
    const commitV2Hash = await mem.commitChanges('v2');

    await mem.writeFile(filePath, '- version 1\n- version 2\n- version 3');

    // Diff against HEAD (working tree vs last commit)
    const diffWorking = await mem.gitDiff(filePath);
    expect(diffWorking).toContain('+- version 3');

    // Diff between two commits
    const diffCommits = await mem.gitDiff(filePath, 'HEAD~1', 'HEAD');
    expect(diffCommits).toContain('+- version 2');
    expect(diffCommits).not.toContain('+ - version 3');

    // Diff from a specific commit to HEAD
    const diffFromCommit = await mem.gitDiff(filePath, commitV2Hash);
    expect(diffFromCommit).toContain('+- version 3');
  });

  it('should get changed files from the working tree', async () => {
    // Setup
    await mem.writeFile('a.txt', 'a');
    await mem.writeFile('b.txt', 'b');
    await mem.commitChanges('initial commit');

    // 1. Modify a.txt
    await mem.writeFile('a.txt', 'a modified');

    // 2. Create c.txt
    await mem.writeFile('c.txt', 'c');

    // 3. Delete b.txt
    await mem.deletePath('b.txt');

    // 4. Create and stage d.txt
    await mem.writeFile('d.txt', 'd');
    await harness.git.add('d.txt');

    const changedFiles = await mem.getChangedFiles();

    expect(changedFiles).toEqual(
      expect.arrayContaining(['a.txt', 'b.txt', 'c.txt', 'd.txt'])
    );
    expect(changedFiles.length).toBe(4);
  });

  it('should handle commit with no changes', async () => {
    await mem.writeFile('a.txt', 'a');
    await mem.commitChanges('commit 1');

    // Calling commitChanges with no changes should not throw an error
    const commitHash = await mem.commitChanges('no changes');
    expect(commitHash).toBe('No changes to commit.');

    // Verify no new commit was created
    const log = await mem.gitLog(undefined, 2);
    expect(log).toHaveLength(2); // commit 1 + initial .gitignore commit
    expect(log[0]?.message).toBe('commit 1');
  });

  it('should get git log for the whole repo', async () => {
    await mem.writeFile('a.txt', 'a');
    await mem.commitChanges('commit A');
    await mem.writeFile('b.txt', 'b');
    await mem.commitChanges('commit B');

    // Get full repo log
    const log = await mem.gitLog(undefined, 3);
    expect(log).toHaveLength(3); // A, B, and initial .gitignore
    expect(log[0]?.message).toBe('commit B');
    expect(log[1]?.message).toBe('commit A');
    expect(log[2]?.message).toContain('Initial commit');
  });
});
````

## File: tests/integration/mem-api-graph-ops.test.ts
````typescript
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals';
import {
  createTestHarness,
  cleanupTestHarness,
  type TestHarnessState,
} from '../lib/test-harness';
import type { MemAPI } from '../../src/types';

describe('MemAPI Graph Ops Integration Tests', () => {
  let harness: TestHarnessState;
  let mem: MemAPI;

  beforeEach(async () => {
    // Disable .gitignore for these tests so we can correctly search .log files
    harness = await createTestHarness({ withGitignore: false });
    mem = harness.mem;
  });

  afterEach(async () => {
    await cleanupTestHarness(harness);
  });

  it('should query the graph with multiple conditions', async () => {
    const pageAContent = `
- # Page A
  - prop:: value
  - Link to [[Page B]].
    `;
    const pageBContent = `
- # Page B
  - prop:: other
  - No links here.
    `;

    await mem.writeFile('PageA.md', pageAContent);
    await mem.writeFile('PageB.md', pageBContent);

    const query = `(property prop:: value) AND (outgoing-link [[Page B]])`;
    const results = await mem.queryGraph(query);

    expect(results).toHaveLength(1);
    expect(results[0]).toBeDefined();
    expect(results[0]?.filePath).toBe('PageA.md');
  });

  it('should return an empty array for a query with no matches', async () => {
    const pageAContent = `- # Page A\n  - prop:: value`;
    await mem.writeFile('PageA.md', pageAContent);

    const query = `(property prop:: non-existent-value)`;
    const results = await mem.queryGraph(query);

    expect(results).toHaveLength(0);
  });

  it('should get backlinks and outgoing links', async () => {
    // PageA links to PageB and PageC
    await mem.writeFile('PageA.md', '- Links to [[Page B]] and [[Page C]].');
    // PageB links to PageC
    await mem.writeFile('PageB.md', '- Links to [[Page C]].');
    // PageC has no outgoing links
    await mem.writeFile('PageC.md', '- No links.');
    // PageD links to PageA. The filename is `PageA.md`, so the link must match the basename.
    await mem.writeFile('PageD.md', '- Links to [[PageA]].');

    // Test outgoing links
    const outgoingA = await mem.getOutgoingLinks('PageA.md');
    expect(outgoingA).toEqual(expect.arrayContaining(['Page B', 'Page C']));
    expect(outgoingA.length).toBe(2);

    const outgoingC = await mem.getOutgoingLinks('PageC.md');
    expect(outgoingC).toEqual([]);

    // Test backlinks
    const backlinksA = await mem.getBacklinks('PageA.md');
    expect(backlinksA).toEqual(['PageD.md']);

    const backlinksC = await mem.getBacklinks('PageC.md');
    expect(backlinksC).toEqual(
      expect.arrayContaining(['PageA.md', 'PageB.md'])
    );
    expect(backlinksC.length).toBe(2);
  });

  it('should perform a global full-text search', async () => {
    await mem.writeFile('a.txt', 'This file contains a unique-search-term.');
    await mem.writeFile('b.md', '- This file has a common-search-term.');
    await mem.writeFile('c.log', 'This one also has a common-search-term.');
    await mem.writeFile(
      'd.txt',
      'This file has nothing interesting to find.'
    );

    // Search for a unique term
    const uniqueResults = await mem.searchGlobal('unique-search-term');
    expect(uniqueResults).toEqual(['a.txt']);

    // Search for a common term
    const commonResults = await mem.searchGlobal('common-search-term');
    expect(commonResults).toEqual(expect.arrayContaining(['b.md', 'c.log']));
    expect(commonResults.length).toBe(2);

    // Search for a non-existent term
    const noResults = await mem.searchGlobal('non-existent-term');
    expect(noResults).toEqual([]);
  });
});
````

## File: .env.test
````
# Test Environment Configuration
OPENROUTER_API_KEY="mock-test-api-key"
KNOWLEDGE_GRAPH_PATH="/tmp/recursa-test-knowledge-graph"
LLM_MODEL="mock-test-model"
````

## File: jest.config.js
````javascript
/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '(.+)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts'],
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  setupFilesAfterEnv: ['jest-extended/all', '<rootDir>/tests/setup.ts'],
};
````

## File: src/types/llm.ts
````typescript
export type ParsedLLMResponse = {
  think?: string;
  typescript?: string;
  reply?: string;
};

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export interface LLMRequest {
  messages: ChatMessage[];
  model: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMConfig {
  apiKey: string;
  baseUrl?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMProvider {
  generateCompletion: (request: LLMRequest) => Promise<LLMResponse>;
  streamCompletion?: (request: LLMRequest) => AsyncIterable<string>;
}

export type StreamingCallback = (chunk: string) => void;
````

## File: src/types/loop.ts
````typescript
import type { MemAPI } from './mem.js';
import type { ChatMessage } from './llm.js';

// The execution context passed through the agent loop.
export type ExecutionContext = {
  // The complete conversation history for this session.
  history: ChatMessage[];
  // The API implementation available to the sandbox.
  memAPI: MemAPI;
  // The application configuration.
  config: import('../config').AppConfig;
  // A unique ID for this execution run.
  runId: string;
  // Function to stream content back to the client.
  streamContent: (content: { type: 'text'; text: string }) => Promise<void>;
};
````

## File: tests/lib/test-util.ts
````typescript
// This file can be used for shared test utilities.
// Currently, it has no content as previous imports were unused.
````

## File: tests/unit/parser.test.ts
````typescript
import { describe, it, expect } from '@jest/globals';
import { parseLLMResponse } from '../../src/core/parser';

describe('LLM Response Parser', () => {
  it('should parse a full, valid response', () => {
    const xml = `<think>Thinking about stuff.</think><typescript>console.log("hello");</typescript><reply>All done!</reply>`;
    const result = parseLLMResponse(xml);
    expect(result).toEqual({
      think: 'Thinking about stuff.',
      typescript: 'console.log("hello");',
      reply: 'All done!',
    });
  });

  it('should parse a partial response (think/act)', () => {
    const xml = `<think>Let me write a file.</think><typescript>await mem.writeFile('a.txt', 'hi');</typescript>`;
    const result = parseLLMResponse(xml);
    expect(result).toEqual({
      think: 'Let me write a file.',
      typescript: "await mem.writeFile('a.txt', 'hi');",
      reply: undefined,
    });
  });

  it('should handle extra whitespace and newlines', () => {
    const xml = `
      <think>
        I need to think about this...
        With newlines.
      </think>
      <typescript>
        const x = 1;
      </typescript>
    `;
    const result = parseLLMResponse(xml);
    expect(result).toEqual({
      think: `I need to think about this...\n        With newlines.`,
      typescript: 'const x = 1;',
      reply: undefined,
    });
  });

  it('should return an object with undefined for missing tags', () => {
    const xml = `<reply>Just a reply.</reply>`;
    const result = parseLLMResponse(xml);
    expect(result).toEqual({
      think: undefined,
      typescript: undefined,
      reply: 'Just a reply.',
    });
  });

  it('should handle an empty string', () => {
    const xml = '';
    const result = parseLLMResponse(xml);
    expect(result).toEqual({
      think: undefined,
      typescript: undefined,
      reply: undefined,
    });
  });

  it('should handle tags in a different order', () => {
    const xml = `<reply>Final answer.</reply><think>One last thought.</think>`;
    const result = parseLLMResponse(xml);
    expect(result).toEqual({
      think: 'One last thought.',
      typescript: undefined,
      reply: 'Final answer.',
    });
  });
});
````

## File: .gitignore
````
# Dependencies
/node_modules
/.pnp
.pnp.js

# Testing
/coverage

# Production
/build
/dist

# Misc
.DS_Store
*.pem

# Debugging
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Environment Variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDEs
.idea
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json
*.sublime-workspace

# Relay
.relay/

# Worktrees (from original)
worktrees/*/node_modules/
worktrees/*/.git/
````

## File: relay.config.json
````json
{
  "$schema": "https://relay.noca.pro/schema.json",
  "projectId": "doc",
  "core": {
    "logLevel": "info",
    "enableNotifications": false,
    "watchConfig": false
  },
  "watcher": {
    "clipboardPollInterval": 2000,
    "preferredStrategy": "auto",
    "enableBulkProcessing": false,
    "bulkSize": 5,
    "bulkTimeout": 30000
  },
  "patch": {
    "approvalMode": "manual",
    "approvalOnErrorCount": 0,
    "linter": "",
    "preCommand": "",
    "postCommand": "",
    "minFileChanges": 0
  },
  "git": {
    "autoGitBranch": false,
    "gitBranchPrefix": "relay/",
    "gitBranchTemplate": "gitCommitMsg"
  }
}
````

## File: src/types/git.ts
````typescript
export interface GitOptions {
  baseDir?: string;
}

// Structure for a single Git log entry.
export type LogEntry = {
  hash: string;
  message: string;
  date: string;
};

export interface GitDiffResult {
  additions: number;
  deletions: number;
  patch: string;
}

export interface GitStatus {
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

export type GitCommand =
  | 'init'
  | 'add'
  | 'commit'
  | 'status'
  | 'log'
  | 'diff'
  | 'branch';
````

## File: src/core/mem-api/secure-path.ts
````typescript
import path from 'path';
import fs from 'fs';
import platform from '../../lib/platform.js';

/**
 * Cross-platform path traversal protection utilities
 * The LLM should never be able to access files outside the knowledge graph.
 */

/**
 * Enhanced path resolution with canonicalization for cross-platform security
 * @param graphRoot The absolute path to the root of the knowledge graph.
 * @param userPath The user-provided sub-path.
 * @returns The resolved, secure absolute path.
 * @throws If a path traversal attempt is detected.
 */
export const resolveSecurePath = (
  graphRoot: string,
  userPath: string
): string => {
  // Normalize and resolve paths using platform-aware normalization
  const normalizedRoot = platform.normalizePath(path.resolve(graphRoot));
  const normalizedUserPath = platform.normalizePath(path.resolve(normalizedRoot, userPath));

  // Get canonical paths to handle symlinks and case-insensitive filesystems
  const canonicalRoot = getCanonicalPath(normalizedRoot);
  const canonicalTarget = getCanonicalPath(normalizedUserPath);

  // Security check with case-insensitive comparison when needed
  const isSecure = platform.hasCaseInsensitiveFS
    ? canonicalTarget.toLowerCase().startsWith(canonicalRoot.toLowerCase())
    : canonicalTarget.startsWith(canonicalRoot);

  if (!isSecure) {
    throw new SecurityError(`Path traversal attempt detected. User path: ${userPath}, resolved to: ${canonicalTarget}`);
  }

  return canonicalTarget;
};

/**
 * Get canonical path by resolving symlinks and normalizing
 * @param filePath The path to canonicalize
 * @returns The canonical absolute path
 */
export const getCanonicalPath = (filePath: string): string => {
  try {
    // Use realpath to resolve all symlinks and normalize
    const canonical = fs.realpathSync(filePath);
    return platform.normalizePath(canonical);
  } catch {
    // If path doesn't exist, return normalized path
    return platform.normalizePath(path.resolve(filePath));
  }
};

/**
 * Validate that a path is within allowed bounds
 * @param allowedRoot The root directory that's allowed
 * @param testPath The path to test
 * @param options Additional validation options
 * @returns True if path is valid and within bounds
 */
export const validatePathBounds = (
  allowedRoot: string,
  testPath: string,
  options: {
    allowSymlinks?: boolean;
    requireExistence?: boolean;
    followSymlinks?: boolean;
  } = {}
): boolean => {
  const {
    allowSymlinks = false,
    requireExistence = false,
    followSymlinks = true
  } = options;

  try {
    const canonicalRoot = getCanonicalPath(allowedRoot);
    let canonicalTarget: string;
    
    // Handle non-existent paths specially
    try {
      canonicalTarget = getCanonicalPath(testPath);
    } catch {
      // Path doesn't exist, use normalized path instead
      canonicalTarget = platform.normalizePath(path.resolve(testPath));
    }

    // If we shouldn't follow symlinks, check if the target itself is a symlink
    if (!followSymlinks) {
      try {
        if (fs.lstatSync(testPath).isSymbolicLink()) {
          if (!allowSymlinks) {
            return false;
          }
          // Use lstat to get the symlink itself, not its target
          canonicalTarget = platform.normalizePath(path.resolve(testPath));
        }
      } catch {
        // File doesn't exist, which is fine for write operations
        // The canonicalTarget from resolveSecurePath is still valid
      }
    }

    // Check if the target path exists (if required)
    if (requireExistence && !fs.existsSync(canonicalTarget)) {
      return false;
    }

    // Final security check
    const isSecure = platform.hasCaseInsensitiveFS
      ? canonicalTarget.toLowerCase().startsWith(canonicalRoot.toLowerCase())
      : canonicalTarget.startsWith(canonicalRoot);

    return isSecure;
  } catch {
    return false;
  }
};

/**
 * Sanitize a user-provided path to remove dangerous components
 * @param userPath The user-provided path
 * @returns A sanitized path string
 */
export const sanitizePath = (userPath: string): string => {
  // Remove null bytes and other dangerous characters
  let sanitized = userPath.replace(/\0/g, '');

  // Handle Windows-specific path patterns
  if (platform.isWindows) {
    // Remove drive letter switching attempts
    sanitized = sanitized.replace(/^[a-zA-Z]:[\\/]/, '');
    // Remove UNC path attempts
    sanitized = sanitized.replace(/^\\\\[\\?]/, '');
    // Remove device namespace access attempts
    sanitized = sanitized.replace(/^\\\\\.\\[a-zA-Z]/, '');
  }

  // Remove excessive path separators
  const separator = platform.pathSeparator;
  const doubleSeparator = separator + separator;
  while (sanitized.includes(doubleSeparator)) {
    sanitized = sanitized.replace(doubleSeparator, separator);
  }

  // Normalize relative path components
  const parts = sanitized.split(separator);
  const filteredParts: string[] = [];

  for (const part of parts) {
    if (part === '..') {
      // Don't allow going above the current directory in user input
      continue;
    }
    if (part === '.' || part === '') {
      continue;
    }
    filteredParts.push(part);
  }

  return filteredParts.join(separator);
};

/**
 * Security error class for path traversal attempts
 */
export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SecurityError);
    }
  }
}

/**
 * Cross-platform path validation utilities
 */
export const pathValidation = {
  /**
   * Check if a path contains potentially dangerous patterns
   */
  isDangerousPath(userPath: string): boolean {
    // Check for common traversal patterns
    const dangerousPatterns = [
      /\.\.[/\\]/,    // ../ or ..\
      /[/\\]\.\./,    // /.. or \..
      /\0/,          // null byte injection
      /[/\\]\0/,      // null byte with separator
    ];

    // Windows-specific dangerous patterns
    if (platform.isWindows) {
      dangerousPatterns.push(
        /^[a-zA-Z]:[/\\].*[/\\][a-zA-Z]:[/\\]/, // drive letter switching
        /^\\\\/,                                 // UNC paths
        /\\\\\.\\[a-zA-Z]/,                      // device namespace
        /[/\\]CON$|[/\\]PRN$|[/\\]AUX$|[/\\]COM\d$|[/\\]LPT\d$/i // reserved names
      );
    }

    return dangerousPatterns.some(pattern => pattern.test(userPath));
  },

  /**
   * Validate and sanitize a user path in one step
   */
  validateAndSanitizePath(graphRoot: string, userPath: string): string {
    if (this.isDangerousPath(userPath)) {
      throw new SecurityError(`Dangerous path pattern detected: ${userPath}`);
    }

    const sanitizedPath = sanitizePath(userPath);
    return resolveSecurePath(graphRoot, sanitizedPath);
  }
};

export default {
  resolveSecurePath,
  getCanonicalPath,
  validatePathBounds,
  sanitizePath,
  SecurityError,
  pathValidation
};
````

## File: src/core/parser.ts
````typescript
import type { ParsedLLMResponse } from '../types';

/**
 * Parses the LLM's XML-like response string into a structured object.
 * This function uses a simple regex-based approach for robustness against
 * potentially malformed, non-XML-compliant output from the LLM, which is
 * often more reliable than a strict XML parser.
 *
 * @param response The raw string response from the LLM.
 * @returns A ParsedLLMResponse object with optional `think`, `typescript`, and `reply` fields.
 */
export const parseLLMResponse = (response: string): ParsedLLMResponse => {
  const extractTagContent = (tagName: string): string | undefined => {
    const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i');
    const match = response.match(regex);
    // If a match is found, return the captured group (the content), trimmed.
    return match && match[1] ? match[1].trim() : undefined;
  };

  return {
    think: extractTagContent('think'),
    typescript: extractTagContent('typescript'),
    reply: extractTagContent('reply'),
  };
};
````

## File: src/lib/logger.ts
````typescript
import 'dotenv/config';

// Cheatsheet for implementation:
// 1. Define log levels using a numeric enum for easy comparison.
// 2. Create a logger that can be configured with a minimum log level (from env).
// 3. The logger should support adding structured context.
// 4. Implement a `child` method to create a new logger instance with pre-filled context.
//    This is useful for adding request or session IDs to all logs within that scope.
// 5. The actual logging should be done to console.log as a JSON string.

export enum LogLevel {
  DEBUG = 10,
  INFO = 20,
  WARN = 30,
  ERROR = 40,
}

const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'debug',
  [LogLevel.INFO]: 'info',
  [LogLevel.WARN]: 'warn',
  [LogLevel.ERROR]: 'error',
};

const LOG_LEVEL_MAP: Record<string, LogLevel> = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
};

const MIN_LOG_LEVEL: LogLevel =
  LOG_LEVEL_MAP[process.env.LOG_LEVEL?.toLowerCase() ?? 'info'] ??
  LogLevel.INFO;

type LogContext = Record<string, unknown>;

export type Logger = {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, error?: Error, context?: LogContext) => void;
  child: (childContext: LogContext) => Logger;
};

const createLoggerInternal = (baseContext: LogContext = {}): Logger => {
  const log = (level: LogLevel, message: string, context: LogContext = {}) => {
    if (level < MIN_LOG_LEVEL) {
      return;
    }
    const finalContext = { ...baseContext, ...context };
    const logEntry = {
      level: LOG_LEVEL_NAMES[level],
      timestamp: new Date().toISOString(),
      message,
      ...finalContext,
    };
     
    console.log(JSON.stringify(logEntry));
  };

  const error = (message: string, err?: Error, context?: LogContext) => {
    const errorContext = {
      ...context,
      error: err ? { message: err.message, stack: err.stack } : undefined,
    };
    log(LogLevel.ERROR, message, errorContext);
  };

  return {
    debug: (message, context) => log(LogLevel.DEBUG, message, context),
    info: (message, context) => log(LogLevel.INFO, message, context),
    warn: (message, context) => log(LogLevel.WARN, message, context),
    error,
    child: (childContext: LogContext) => {
      const mergedContext = { ...baseContext, ...childContext };
      return createLoggerInternal(mergedContext);
    },
  };
};

export const createLogger = (): Logger => createLoggerInternal();

export const logger = createLogger();
````

## File: src/types/index.ts
````typescript
export * from './mem.js';
export * from './git.js';
export * from './sandbox.js';
export * from './llm.js';
export * from './loop.js';
export * from './mcp.js';

// Re-export AppConfig from config module
export type { AppConfig } from '../config.js';

export interface RecursaConfig {
  knowledgeGraphPath: string;
  llm: {
    apiKey: string;
    baseUrl?: string;
    model: string;
    maxTokens?: number;
    temperature?: number;
  };
  sandbox: {
    timeout: number;
    memoryLimit: number;
  };
  git: {
    userName: string;
    userEmail: string;
  };
}

export interface EnvironmentVariables {
  KNOWLEDGE_GRAPH_PATH: string;
  OPENROUTER_API_KEY: string;
  OPENROUTER_MODEL?: string;
  LLM_TEMPERATURE?: string;
  LLM_MAX_TOKENS?: string;
  SANDBOX_TIMEOUT?: string;
  SANDBOX_MEMORY_LIMIT?: string;
  GIT_USER_NAME?: string;
  GIT_USER_EMAIL?: string;
}
````

## File: src/types/mcp.ts
````typescript
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
````

## File: tests/e2e/mcp-workflow.test.ts
````typescript
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals';
import {
  createTestHarness,
  cleanupTestHarness,
  type TestHarnessState,
  createMockLLMQueryWithSpy,
} from '../lib/test-harness';
import { handleUserQuery } from '../../src/core/loop';

describe('Agent Workflow E2E Tests (In-Process)', () => {
  let harness: TestHarnessState;

  beforeEach(async () => {
    harness = await createTestHarness();
  });

  afterEach(async () => {
    await cleanupTestHarness(harness);
  });

  it('should execute a simple file creation and commit query', async () => {
    // 1. Arrange
    const mockQueryLLM = createMockLLMQueryWithSpy([
      `<think>Okay, creating the file.</think>
         <typescript>await mem.writeFile('hello.txt', 'world');</typescript>`,
      `<think>Committing the file.</think>
         <typescript>await mem.commitChanges('feat: create hello.txt');</typescript>
         <reply>File created and committed.</reply>`,
    ]);

    // 2. Act
    const finalReply = await handleUserQuery(
      'create file',
      harness.mockConfig,
      'simple-query-session',
      'run-1',
      mockQueryLLM,
      async () => {}
    );

    // 3. Assert
    expect(finalReply).toBe('File created and committed.');

    // Verify side-effects
    expect(await harness.mem.fileExists('hello.txt')).toBe(true);
    const log = await harness.git.log();
    expect(log.latest?.message).toBe('feat: create hello.txt');
  });

  it('should correctly handle the Dr. Aris Thorne example', async () => {
    // 1. Arrange
    const turn1Response = `<think>Got it. I'll create pages for Dr. Aris Thorne and the AI Research Institute, and link them together.</think>
<typescript>
const orgPath = 'AI Research Institute.md';
if (!await mem.fileExists(orgPath)) {
  await mem.writeFile(orgPath, \`- # AI Research Institute
  - type:: organization\`);
}
await mem.writeFile('Dr. Aris Thorne.md', \`- # Dr. Aris Thorne
  - type:: person
  - affiliation:: [[AI Research Institute]]
  - field:: [[Symbolic Reasoning]]\`);
</typescript>`;
    const turn2Response = `<think>Okay, I'm saving those changes to your permanent knowledge base.</think>
<typescript>
await mem.commitChanges('feat: Add Dr. Aris Thorne and AI Research Institute entities');
</typescript>
<reply>Done. I've created pages for both Dr. Aris Thorne and the AI Research Institute and linked them.</reply>`;

    const mockQueryLLM = createMockLLMQueryWithSpy([
      turn1Response,
      turn2Response,
    ]);

    // 2. Act
    const finalReply = await handleUserQuery(
      'Create Dr. Aris Thorne',
      harness.mockConfig,
      'thorne-session',
      'run-2',
      mockQueryLLM,
      async () => {}
    );

    // 3. Assert
    expect(finalReply).toBe(
      "Done. I've created pages for both Dr. Aris Thorne and the AI Research Institute and linked them."
    );

    const thorneContent = await harness.mem.readFile('Dr. Aris Thorne.md');
    expect(thorneContent).toContain('affiliation:: [[AI Research Institute]]');

    expect(await harness.mem.fileExists('AI Research Institute.md')).toBe(true);

    const log = await harness.git.log();
    expect(log.latest?.message).toBe(
      'feat: Add Dr. Aris Thorne and AI Research Institute entities'
    );
  });

  it('should save a checkpoint and successfully revert to it', async () => {
    // 1. Arrange
    // Stash requires an initial commit to work reliably.
    await harness.mem.writeFile('init.txt', 'initial file');
    await harness.mem.commitChanges('initial commit for stash test');

    const mockQueryLLM = createMockLLMQueryWithSpy([
      `<think>Writing file 1.</think>
         <typescript>await mem.writeFile('file1.md', '- content1');</typescript>`,
      `<think>Saving checkpoint.</think>
         <typescript>await mem.saveCheckpoint();</typescript>`,
      `<think>Writing file 2.</think>
         <typescript>await mem.writeFile('file2.md', '- content2');</typescript>`,
      `<think>Reverting to checkpoint.</think>
         <typescript>await mem.revertToLastCheckpoint();</typescript>`,
      `<think>Committing.</think>
         <typescript>await mem.commitChanges('feat: add file1 and file2');</typescript>
         <reply>Reverted and committed.</reply>`,
    ]);

    // 2. Act
    const finalReply = await handleUserQuery(
      'test checkpoints',
      harness.mockConfig,
      'checkpoint-session',
      'run-3',
      mockQueryLLM,
      async () => {}
    );

    // 3. Assert
    expect(finalReply).toBe('Reverted and committed.');

    // After `saveCheckpoint`, `file1.md` is stashed.
    // After `writeFile('file2.md')`, `file2.md` is in the working directory.
    // After `revertToLastCheckpoint` (`git stash pop`), stashed changes (`file1.md`) are
    // applied, merging with working directory changes (`file2.md`).
    expect(await harness.mem.fileExists('file1.md')).toBe(true);
    expect(await harness.mem.fileExists('file2.md')).toBe(true);

    const log = await harness.git.log();
    expect(log.latest?.message).toBe('feat: add file1 and file2');

    expect(log.latest).not.toBeNull();

    // Verify both files were part of the commit
    const commitContent = await harness.git.show([
      '--name-only',
      log.latest!.hash,
    ]);
    expect(commitContent).toContain('file1.md');
    expect(commitContent).toContain('file2.md');
  });

  it('should block and gracefully handle path traversal attempts', async () => {
    // 1. Arrange
    const mockQueryLLM = createMockLLMQueryWithSpy([
      `<think>I will try to read a sensitive file.</think>
         <typescript>await mem.readFile('../../../../etc/hosts');</typescript>`,
      `<think>The previous action failed as expected due to security. I will inform the user.</think>
         <reply>I was unable to access that file due to security restrictions.</reply>`,
    ]);

    // 2. Act
    const finalReply = await handleUserQuery(
      'read sensitive file',
      harness.mockConfig,
      'security-session',
      'run-4',
      mockQueryLLM,
      async () => {}
    );

    // 3. Assert
    // The loop catches the security error, feeds it back to the LLM,
    // and the LLM then generates the final reply.
    expect(finalReply).toBe(
      'I was unable to access that file due to security restrictions.'
    );

    // Verify the agent was given a chance to recover.
    expect(mockQueryLLM).toHaveBeenCalledTimes(2);
  });
});
````

## File: src/core/mem-api/git-ops.ts
````typescript
import type { SimpleGit } from 'simple-git';
import type { LogEntry } from '../../types';

// Note: These functions take a pre-configured simple-git instance.

export const gitDiff =
  (git: SimpleGit) =>
  async (
    filePath: string,
    fromCommit?: string,
    toCommit?: string
  ): Promise<string> => {
    try {
      if (fromCommit && toCommit) {
        return await git.diff([`${fromCommit}..${toCommit}`, '--', filePath]);
      } else if (fromCommit) {
        return await git.diff([`${fromCommit}`, '--', filePath]);
      } else {
        return await git.diff([filePath]);
      }
    } catch (error) {
      throw new Error(
        `Failed to get git diff for ${filePath}: ${(error as Error).message}`
      );
    }
  };

export const gitLog =
  (git: SimpleGit) =>
  async (filePath?: string, maxCommits = 5): Promise<LogEntry[]> => {
    try {
      const options = {
        maxCount: maxCommits,
        ...(filePath ? { file: filePath } : {}),
      };
      const result = await git.log(options);
      return result.all.map((entry) => ({
        hash: entry.hash,
        message: entry.message,
        date: entry.date,
      }));
    } catch (error) {
      const target = filePath || 'repository';
      throw new Error(
        `Failed to get git log for ${target}: ${(error as Error).message}`
      );
    }
  };

export const getChangedFiles =
  (git: SimpleGit) => async (): Promise<string[]> => {
    try {
      const status = await git.status();
      // Combine all relevant file arrays and remove duplicates
      const allFiles = new Set([
        ...status.staged,
        ...status.modified,
        ...status.created,
        ...status.deleted,
        ...status.not_added, // Add untracked files
        ...status.renamed.map((r) => r.to),
      ]);
      return Array.from(allFiles);
    } catch (error) {
      throw new Error(
        `Failed to get changed files: ${(error as Error).message}`
      );
    }
  };

export const commitChanges =
  (git: SimpleGit) =>
  async (message: string): Promise<string> => {
    try {
      // Stage all changes
      await git.add('.');

      // Commit staged changes
      const result = await git.commit(message);

      // Return the commit hash
      if (result.commit) {
        return result.commit;
      }
      // If result.commit is empty or null, it means no changes were committed. This is not an error.
      return 'No changes to commit.';
    } catch (error) {
      throw new Error(`Failed to commit changes: ${(error as Error).message}`);
    }
  };
````

## File: src/core/mem-api/index.ts
````typescript
import type { MemAPI } from '../../types';
import type { AppConfig } from '../../config';
import simpleGit from 'simple-git';

import * as fileOps from './file-ops.js';
import * as gitOps from './git-ops.js';
import * as graphOps from './graph-ops.js';
import * as stateOps from './state-ops.js';
import * as utilOps from './util-ops.js';

/**
 * Creates a fully-functional MemAPI object.
 * This is a Higher-Order Function that takes the application configuration
 * and returns an object where each method is pre-configured with the necessary
 * context (like the knowledge graph path or a git instance).
 *
 * @param config The application configuration.
 * @returns A complete MemAPI object ready to be used by the sandbox.
 */
export const createMemAPI = (config: AppConfig): MemAPI => {
  const git = simpleGit(config.knowledgeGraphPath)
    .addConfig('user.name', config.gitUserName)
    .addConfig('user.email', config.gitUserEmail);
  const graphRoot = config.knowledgeGraphPath;

  return {
    // Core File I/O
    readFile: fileOps.readFile(graphRoot),
    writeFile: fileOps.writeFile(graphRoot),
    updateFile: fileOps.updateFile(graphRoot),
    deletePath: fileOps.deletePath(graphRoot),
    rename: fileOps.rename(graphRoot),
    fileExists: fileOps.fileExists(graphRoot),
    createDir: fileOps.createDir(graphRoot),
    listFiles: fileOps.listFiles(graphRoot),

    // Git-Native Operations
    gitDiff: gitOps.gitDiff(git),
    gitLog: gitOps.gitLog(git),
    getChangedFiles: gitOps.getChangedFiles(git),
    commitChanges: gitOps.commitChanges(git),

    // Intelligent Graph Operations
    queryGraph: graphOps.queryGraph(graphRoot),
    getBacklinks: graphOps.getBacklinks(graphRoot),
    getOutgoingLinks: graphOps.getOutgoingLinks(graphRoot),
    searchGlobal: graphOps.searchGlobal(graphRoot),

    // State Management & Checkpoints
    saveCheckpoint: stateOps.saveCheckpoint(git), // Implemented
    revertToLastCheckpoint: stateOps.revertToLastCheckpoint(git), // Implemented
    discardChanges: stateOps.discardChanges(git), // Implemented

    // Utility & Diagnostics
    getGraphRoot: utilOps.getGraphRoot(graphRoot),
    getTokenCount: utilOps.getTokenCount(graphRoot), // Implemented
    getTokenCountForPaths: utilOps.getTokenCountForPaths(graphRoot), // Implemented
  };
};
````

## File: tsconfig.json
````json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "rootDir": "src",
    "outDir": "dist",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": false,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": false,
    "noEmit": false,
    "types": ["node", "jest"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
````

## File: src/core/mem-api/state-ops.ts
````typescript
import type { SimpleGit } from 'simple-git';

// Note: These functions map to specific git commands for state management.

export const saveCheckpoint =
  (git: SimpleGit) => async (): Promise<boolean> => {
    // 1. Stage all changes except session files to prevent conflicts during stash operations.
    // Use git add . followed by git reset .sessions/ if it exists
    await git.add('.');
    // Check if .sessions directory exists and unstage it
    try {
      await git.raw('ls-files', '.sessions/');
      await git.reset(['.sessions/']);
    } catch {
      // .sessions directory doesn't exist or is empty, which is fine
    }
    // 2. Save to stash with a message: `await git.stash(['push', '-m', 'recursa-checkpoint'])`.
    await git.stash(['push', '-m', 'recursa-checkpoint']);
    // 3. Return true on success.
    return true;
  };

export const revertToLastCheckpoint =
  (git: SimpleGit) => async (): Promise<boolean> => {
    try {
      // Check if there are any stashes before trying to apply
      const stashes = await git.stashList();
      if (stashes.all.length > 0) {
        console.log('Found stash, applying to restore checkpoint...');

        try {
          // Try to apply with --index to preserve untracked files
          await git.stash(['apply', '--index', 'stash@{0}']);
          console.log('Stash applied with --index successfully');
        } catch (applyError) {
          console.log('Stash apply with --index failed, trying without --index:', (applyError as Error).message);

          // If --index fails, try without it
          await git.stash(['apply', 'stash@{0}']);
          console.log('Stash applied without --index successfully');
        }

        // Remove the stash after successful application
        await git.stash(['drop', 'stash@{0}']);

        console.log('Stash applied and dropped successfully');
        return true;
      }
      // No stashes exist, which is not an error state.
      // It just means there's nothing to revert to.
      console.log('No stashes found');
      return false;
    } catch (error) {
      console.warn(
        `Could not revert to checkpoint: ${(error as Error).message}`
      );
      return false;
    }
  };

export const discardChanges =
  (git: SimpleGit) => async (): Promise<boolean> => {
    // 1. Reset all tracked files: `await git.reset(['--hard', 'HEAD'])`.
    await git.reset(['--hard', 'HEAD']);
    // 2. Remove all untracked files and directories: `await git.clean('f', ['-d'])`.
    await git.clean('f', ['-d']);
    // 3. Return true on success.
    return true;
  };
````

## File: src/core/mem-api/util-ops.ts
````typescript
import { promises as fs } from 'fs';
import type { PathTokenCount } from '../../types';
import { resolveSecurePath } from './secure-path.js';

// A private helper to centralize token counting logic.
// This is a simple estimation and should be replaced with a proper
// tokenizer library like tiktoken if higher accuracy is needed.
const countTokensForContent = (content: string): number => {
  // A common rough estimate is 4 characters per token.
  return Math.ceil(content.length / 4);
};

// Note: HOFs returning the final mem API functions.

export const getGraphRoot =
  (graphRoot: string) => async (): Promise<string> => {
    return graphRoot;
  };

export const getTokenCount =
  (graphRoot: string) =>
  async (filePath: string): Promise<number> => {
    const fullPath = resolveSecurePath(graphRoot, filePath);
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      return countTokensForContent(content);
    } catch (error) {
      throw new Error(
        `Failed to count tokens for ${filePath}: ${(error as Error).message}`
      );
    }
  };

export const getTokenCountForPaths =
  (graphRoot: string) =>
  async (paths: string[]): Promise<PathTokenCount[]> => {
    return Promise.all(
      paths.map(async (filePath) => {
        const tokenCount = await getTokenCount(graphRoot)(filePath);
        return {
          path: filePath,
          tokenCount,
        };
      })
    );
  };
````

## File: src/types/mem.ts
````typescript
import type { LogEntry } from './git.js';

// --- Knowledge Graph & Git ---

// Structure for a graph query result.
export type GraphQueryResult = {
  filePath: string;
  matches: string[];
};

// Structure for token count results for multiple paths.
export type PathTokenCount = {
  path: string;
  tokenCount: number;
};

// --- MemAPI Interface (Matches tools.md) ---

// This is the "cheatsheet" for what's available in the sandbox.
// It must be kept in sync with the tools documentation.
export type MemAPI = {
  // Core File I/O
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<boolean>;
  updateFile: (
    filePath: string,
    oldContent: string,
    newContent: string
  ) => Promise<boolean>;
  deletePath: (filePath: string) => Promise<boolean>;
  rename: (oldPath: string, newPath: string) => Promise<boolean>;
  fileExists: (filePath: string) => Promise<boolean>;
  createDir: (directoryPath: string) => Promise<boolean>;
  listFiles: (directoryPath?: string) => Promise<string[]>;

  // Git-Native Operations
  gitDiff: (
    filePath: string,
    fromCommit?: string,
    toCommit?: string
  ) => Promise<string>;
  gitLog: (filePath?: string, maxCommits?: number) => Promise<LogEntry[]>;
  getChangedFiles: () => Promise<string[]>;
  commitChanges: (message: string) => Promise<string>;

  // Intelligent Graph Operations
  queryGraph: (query: string) => Promise<GraphQueryResult[]>;
  getBacklinks: (filePath: string) => Promise<string[]>;
  getOutgoingLinks: (filePath: string) => Promise<string[]>;
  searchGlobal: (query: string) => Promise<string[]>;

  // State Management
  saveCheckpoint: () => Promise<boolean>;
  revertToLastCheckpoint: () => Promise<boolean>;
  discardChanges: () => Promise<boolean>;

  // Utility
  getGraphRoot: () => Promise<string>;
  getTokenCount: (filePath: string) => Promise<number>;
  getTokenCountForPaths: (paths: string[]) => Promise<PathTokenCount[]>;
};
````

## File: .env.example
````
# Recursa MCP Server Configuration
# Copy this file to .env and update the values

# Required: Path to your knowledge graph directory
KNOWLEDGE_GRAPH_PATH=./knowledge-graph

# Required: OpenRouter API key for LLM access
# Get your API key from: https://openrouter.ai/keys
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Required: API key for securing the Recursa server endpoint
RECURSA_API_KEY=a-very-secret-key

# Optional: Port for the HTTP server
HTTP_PORT=8080

# Optional: LLM model to use (default: anthropic/claude-3-haiku-20240307)
# See https://openrouter.ai/models for a list of available models
LLM_MODEL=anthropic/claude-3-haiku-20240307

# Optional: LLM Configuration
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=4096

# Optional: Sandbox Configuration (in milliseconds and megabytes)
SANDBOX_TIMEOUT=30000
SANDBOX_MEMORY_LIMIT=100

# Optional: Git Configuration
GIT_USER_NAME=Recursa Agent
GIT_USER_EMAIL=recursa@local

# Usage:
# 1. Copy this file: cp .env.example .env
# 2. Update OPENROUTER_API_KEY and RECURSA_API_KEY with your actual keys
# 3. Update KNOWLEDGE_GRAPH_PATH to point to your knowledge graph
# 4. Run the server: npm run dev
````

## File: src/core/llm.ts
````typescript
import { generateText } from 'ai';
import { openrouter } from '@openrouter/ai-sdk-provider';
import type { AppConfig } from '../config';
import { logger } from '../lib/logger.js';
import type { ChatMessage } from '../types';

export const queryLLM = async (
  history: ChatMessage[],
  config: AppConfig
): Promise<string> => {
  try {
    // Set environment variables for the default openrouter provider
    process.env.OPENROUTER_API_KEY = config.openRouterApiKey;
    process.env['HTTP-REFERER'] = 'https://github.com/rec/ursa';
    process.env['X-TITLE'] = 'Recursa';

    const model = openrouter(config.llmModel);

    // 2. Separate system prompt from the rest of the message history
    const systemPrompt = history.find((m) => m.role === 'system')?.content;
    const messages = history.filter(
      (m) => m.role === 'user' || m.role === 'assistant'
    );

    // 3. Call the AI SDK's generateText function
    const { text } = await generateText({
      model,
      system: systemPrompt,
      messages,
      temperature: config.llmTemperature,
      maxTokens: config.llmMaxTokens,
    });

    // 4. Validate and return the response
    if (!text) {
      throw new Error('Empty content received from OpenRouter API');
    }

    return text;
  } catch (error) {
    logger.error('Failed to query OpenRouter API', error as Error);
    // Re-throw the error to be handled by the agent loop
    throw new Error(
      `Failed to query OpenRouter API: ${(error as Error).message}`
    );
  }
};

// The AI SDK's underlying `fetch` implementation (`ofetch`) has built-in retry logic
// for transient network errors and 5xx server errors, so our custom `withRetry` HOF is no longer needed.
// We export `queryLLM` as `queryLLMWithRetries` to maintain the same interface for the agent loop.
export const queryLLMWithRetries = queryLLM as (
  ...args: unknown[]
) => Promise<unknown>;
````

## File: src/config.ts
````typescript
import 'dotenv/config';
import { z } from 'zod';
import path from 'path';
import { promises as fs } from 'fs';
import platform from './lib/platform.js';

// Platform-specific default values
const getPlatformDefaults = () => {
  const resourceLimits = platform.getResourceLimits();

  return {
    // Conservative defaults for mobile/limited environments
    LLM_MODEL: 'anthropic/claude-3-haiku-20240307',
    LLM_TEMPERATURE: platform.isTermux ? 0.5 : 0.7,
    LLM_MAX_TOKENS: platform.isTermux ? 2000 : 4000,
    SANDBOX_TIMEOUT: Math.min(resourceLimits.maxCpuTime, 10000),
    SANDBOX_MEMORY_LIMIT: Math.floor(resourceLimits.maxMemory / 1024 / 1024), // Convert to MB
    GIT_USER_NAME: 'Recursa Agent',
    GIT_USER_EMAIL: 'recursa@local'
  };
};

const configSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1, 'OPENROUTER_API_KEY is required.'),
  KNOWLEDGE_GRAPH_PATH: z.string().min(1, 'KNOWLEDGE_GRAPH_PATH is required.'),
  RECURSA_API_KEY: z.string().min(1, 'RECURSA_API_KEY is required.'),
  HTTP_PORT: z.coerce.number().default(8080).optional(),
  LLM_MODEL: z.string().default(getPlatformDefaults().LLM_MODEL).optional(),
  LLM_TEMPERATURE: z.coerce.number().default(getPlatformDefaults().LLM_TEMPERATURE).optional(),
  LLM_MAX_TOKENS: z.coerce.number().default(getPlatformDefaults().LLM_MAX_TOKENS).optional(),
  SANDBOX_TIMEOUT: z.coerce.number().default(getPlatformDefaults().SANDBOX_TIMEOUT).optional(),
  SANDBOX_MEMORY_LIMIT: z.coerce.number().default(getPlatformDefaults().SANDBOX_MEMORY_LIMIT).optional(),
  GIT_USER_NAME: z.string().default(getPlatformDefaults().GIT_USER_NAME).optional(),
  GIT_USER_EMAIL: z.string().default(getPlatformDefaults().GIT_USER_EMAIL).optional(),
});

export type AppConfig = {
  openRouterApiKey: string;
  knowledgeGraphPath: string;
  recursaApiKey: string;
  httpPort: number;
  llmModel: string;
  llmTemperature: number;
  llmMaxTokens: number;
  sandboxTimeout: number;
  sandboxMemoryLimit: number;
  gitUserName: string;
  gitUserEmail: string;
};

/**
 * Normalize environment variable keys for cross-platform compatibility
 */
const normalizeEnvVars = () => {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      const normalizedKey = platform.normalizeEnvVar(key);
      normalized[normalizedKey] = value;
    }
  }

  return { ...process.env, ...normalized };
};

/**
 * Resolve and validate the knowledge graph path with platform awareness
 */
const resolveKnowledgeGraphPath = (basePath: string): string => {
  // Normalize path separators for the current platform
  let resolvedPath = platform.normalizePath(basePath);

  // Handle relative paths
  if (!platform.isAbsolute(resolvedPath)) {
    resolvedPath = platform.normalizePath(path.resolve(process.cwd(), resolvedPath));
     
    console.warn(
      `KNOWLEDGE_GRAPH_PATH is not absolute. Resolved to: ${resolvedPath}`
    );
  }

  // Handle platform-specific path requirements
  if (platform.isWindows) {
    // Ensure Windows paths are properly formatted
    if (!/^[A-Za-z]:\\/.test(resolvedPath) && !resolvedPath.startsWith('\\\\')) {
      // Add current drive letter if missing
      const cwd = process.cwd();
      const drive = cwd.substring(0, 2); // e.g., "C:"
      resolvedPath = drive + resolvedPath;
    }
  }

  return resolvedPath;
};

/**
 * Validate that the knowledge graph directory exists and is accessible
 */
const validateKnowledgeGraphPath = async (resolvedPath: string): Promise<void> => {
  // Skip validation in test environments
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  try {
    const stats = await fs.stat(resolvedPath);
    if (!stats.isDirectory()) {
      throw new Error('Path exists but is not a directory.');
    }

    // Test write permissions in a cross-platform way
    const testFile = path.join(resolvedPath, '.recursa-write-test');
    try {
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
    } catch {
      if (platform.isWindows) {
        throw new Error('Directory is not writable. Check folder permissions.');
      } else if (platform.isTermux) {
        throw new Error('Directory is not writable. Check Termux storage permissions.');
      } else {
        throw new Error('Directory is not writable. Check file permissions.');
      }
    }

    // Check available disk space (Unix-like systems only)
    if (!platform.isWindows) {
      try {
        const stats = await fs.statfs(resolvedPath);
        const availableSpace = stats.bavail * stats.bsize;
        const minSpace = 100 * 1024 * 1024; // 100MB minimum
        if (availableSpace < minSpace) {
          console.warn(`⚠️  Low disk space: ${Math.floor(availableSpace / 1024 / 1024)}MB available`);
        }
      } catch {
        // Ignore filesystem stats errors
      }
    }

  } catch (error) {
    if ((error as Error & { code?: string }).code === 'ENOENT') {
      throw new Error('Directory does not exist. Please create it before continuing.');
    }
    throw error;
  }
};

export const loadAndValidateConfig = async (): Promise<AppConfig> => {
  // Use normalized environment variables
  const normalizedEnv = normalizeEnvVars();
  const parseResult = configSchema.safeParse(normalizedEnv);

  if (!parseResult.success) {
     
    console.error(
      '❌ Invalid environment variables:',
      parseResult.error.flatten().fieldErrors
    );
    process.exit(1);
  }

  const {
    OPENROUTER_API_KEY,
    KNOWLEDGE_GRAPH_PATH,
    RECURSA_API_KEY,
    HTTP_PORT,
    LLM_MODEL,
    LLM_TEMPERATURE,
    LLM_MAX_TOKENS,
    SANDBOX_TIMEOUT,
    SANDBOX_MEMORY_LIMIT,
    GIT_USER_NAME,
    GIT_USER_EMAIL,
  } = parseResult.data;

  // Resolve and validate the knowledge graph path
  const resolvedPath = resolveKnowledgeGraphPath(KNOWLEDGE_GRAPH_PATH);
  await validateKnowledgeGraphPath(resolvedPath);

  // Log platform-specific information
  console.log(`🔧 Platform: ${platform.platformString}`);
  if (platform.isTermux) {
    console.log('📱 Running in Termux/Android environment');
    console.log(`⚡ Memory limit: ${SANDBOX_MEMORY_LIMIT}MB, Timeout: ${SANDBOX_TIMEOUT}ms`);
  }

  return Object.freeze({
    openRouterApiKey: OPENROUTER_API_KEY,
    knowledgeGraphPath: resolvedPath,
    recursaApiKey: RECURSA_API_KEY,
    httpPort: HTTP_PORT!,
    llmModel: LLM_MODEL!,
    llmTemperature: LLM_TEMPERATURE!,
    llmMaxTokens: LLM_MAX_TOKENS!,
    sandboxTimeout: SANDBOX_TIMEOUT!,
    sandboxMemoryLimit: SANDBOX_MEMORY_LIMIT!,
    gitUserName: GIT_USER_NAME!,
    gitUserEmail: GIT_USER_EMAIL!,
  });
};
````

## File: tests/lib/test-harness.ts
````typescript
import { jest } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import simpleGit, { type SimpleGit } from 'simple-git';
import { createMemAPI } from '../../src/core/mem-api';
import type { AppConfig } from '../../src/config';
import type { MemAPI } from '../../src/types';
import type { ChatMessage } from '../../src/types';

/**
 * Test harness options for customizing the test environment
 */
export interface TestHarnessOptions {
  /** Custom git user name, defaults to 'Test User' */
  gitUserName?: string;
  /** Custom git user email, defaults to 'test@example.com' */
  gitEmail?: string;
  /** Custom temp directory prefix, defaults to 'recursa-test-' */
  tempPrefix?: string;
  /** Custom OpenRouter API key, defaults to 'test-api-key' */
  apiKey?: string;
  /** Custom LLM model, defaults to 'test-model' */
  model?: string;
  /** Whether to initialize with a .gitignore file, defaults to true */
  withGitignore?: boolean;
}

/**
 * Test harness state containing all the test environment resources
 */
export interface TestHarnessState {
  readonly tempDir: string;
  readonly mockConfig: AppConfig;
  readonly mem: MemAPI;
  readonly git: SimpleGit;
}

/**
 * Creates a test harness with isolated temporary environment
 * @param options - Configuration options for the test harness
 * @returns Promise resolving to TestHarnessState with temp directory, config, and utilities
 */
export const createTestHarness = async (
  options: TestHarnessOptions = {}
): Promise<TestHarnessState> => {
  const {
    gitUserName = 'Test User',
    gitEmail = 'test@example.com',
    tempPrefix = 'recursa-test-',
    apiKey = 'test-api-key',
    model = 'test-model',
    withGitignore = true,
  } = options;

  // Create temporary directory
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), tempPrefix));

  // Create mock configuration
  const mockConfig: AppConfig = {
    knowledgeGraphPath: tempDir,
    openRouterApiKey: apiKey,
    recursaApiKey: 'test-api-key',
    httpPort: 8080,
    llmModel: model,
    llmTemperature: 0.7,
    llmMaxTokens: 4000,
    sandboxTimeout: 10000,
    sandboxMemoryLimit: 100,
    gitUserName: gitUserName,
    gitUserEmail: gitEmail,
  };

  // Initialize git repository
  const git = simpleGit(tempDir);
  await git.init();
  await git.addConfig('user.name', gitUserName);
  await git.addConfig('user.email', gitEmail);

  // Optionally create .gitignore file
  if (withGitignore) {
    await fs.writeFile(
      path.join(tempDir, '.gitignore'),
      '*.log\nnode_modules/\n.env\n.DS_Store'
    );
    await git.add('.gitignore');
    await git.commit('Initial commit with .gitignore');
  }

  // Create MemAPI instance
  const mem = createMemAPI(mockConfig);

  return {
    tempDir,
    mockConfig,
    mem,
    git,
  };
};

/**
 * Type guard to check if an error object has a 'code' property.
 */
const hasErrorCode = (error: unknown): error is { code: string } => {
  return typeof error === 'object' && error !== null && 'code' in error;
};

/**
 * Cleans up a test harness by removing the temporary directory
 * @param harness - The test harness state to clean up
 */
export const cleanupTestHarness = async (
  harness: TestHarnessState
): Promise<void> => {
  const maxRetries = 5;
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      await fs.rm(harness.tempDir, { recursive: true, force: true });
      return; // Success
    } catch (error: unknown) {
      // Retry on common race condition errors during cleanup
      if (
        hasErrorCode(error) &&
        (error.code === 'ENOTEMPTY' ||
          error.code === 'EBUSY' ||
          error.code === 'EPERM')
      ) {
        attempt++;
        if (attempt >= maxRetries) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
      } else {
        throw error; // Rethrow unexpected errors
      }
    }
  }
};

/**
 * Resets the test harness environment (clears directory, re-inits git)
 * @param harness - The test harness state to reset
 * @param options - Options for reset operation
 */
export const resetTestHarness = async (
  harness: TestHarnessState,
  options: { withGitignore?: boolean } = {}
): Promise<void> => {
  const { withGitignore = true } = options;

  // Clear the directory
  await fs.rm(harness.tempDir, { recursive: true, force: true });
  await fs.mkdir(harness.tempDir, { recursive: true });

  // Re-initialize git
  await harness.git.init();

  // Optionally recreate .gitignore
  if (withGitignore) {
    await fs.writeFile(
      path.join(harness.tempDir, '.gitignore'),
      '*.log\nnode_modules/\n.env\n.DS_Store'
    );
    await harness.git.add('.gitignore');
    await harness.git.commit('Initial commit with .gitignore');
  }
};

/**
 * Higher-order function that wraps a test function with test harness setup/teardown
 * @param testFn - The test function to execute with the harness
 * @param options - Test harness options
 * @returns A test function that handles setup/teardown automatically
 */
export const withTestHarness = <T>(
  testFn: (harness: TestHarnessState) => Promise<T>,
  options: TestHarnessOptions = {}
) => {
  return async (): Promise<T> => {
    const harness = await createTestHarness(options);

    try {
      return await testFn(harness);
    } finally {
      await cleanupTestHarness(harness);
    }
  };
};

/**
 * Creates multiple test harnesses for parallel testing
 * @param count - Number of harnesses to create
 * @param options - Configuration options for each harness
 * @returns Array of TestHarnessState instances
 */
export const createMultipleTestHarnesses = async (
  count: number,
  options: TestHarnessOptions = {}
): Promise<TestHarnessState[]> => {
  const harnesses: TestHarnessState[] = [];

  try {
    for (let i = 0; i < count; i++) {
      const harness = await createTestHarness({
        ...options,
        tempPrefix: `${options.tempPrefix || 'recursa-test-'}parallel-${i}-`,
      });
      harnesses.push(harness);
    }

    return harnesses;
  } catch (error) {
    // Cleanup any created harnesses if an error occurs
    await Promise.all(harnesses.map(cleanupTestHarness));
    throw error;
  }
};

/**
 * Utility function to create test files with common patterns
 * @param harness - Test harness state
 * @param files - Object mapping file paths to contents
 */
export const createTestFiles = async (
  harness: TestHarnessState,
  files: Record<string, string>
): Promise<void> => {
  const promises = Object.entries(files).map(async ([filePath, content]) => {
    await harness.mem.writeFile(filePath, content);
  });

  await Promise.all(promises);
};

/**
 * Utility function to verify files exist and have expected content
 * @param harness - Test harness state
 * @param expectedFiles - Object mapping file paths to expected content (partial or full)
 */
export const verifyTestFiles = async (
  harness: TestHarnessState,
  expectedFiles: Record<string, string>
): Promise<void> => {
  const promises = Object.entries(expectedFiles).map(
    async ([filePath, expectedContent]) => {
      const exists = await harness.mem.fileExists(filePath);
      if (!exists) {
        throw new Error(`Expected file ${filePath} does not exist`);
      }

      const actualContent = await harness.mem.readFile(filePath);
      if (!actualContent.includes(expectedContent)) {
        throw new Error(
          `File ${filePath} does not contain expected content: "${expectedContent}"`
        );
      }
    }
  );

  await Promise.all(promises);
};

/**
 * Creates a mock LLM query function for testing purposes.
 * This replaces the duplicate Mock LLM utilities found across different test files.
 *
 * @param responses - Array of predefined responses to return in sequence
 * @returns A mock function that simulates LLM responses
 */
export const createMockQueryLLM = (
  responses: string[]
): ((history: ChatMessage[], config: AppConfig) => Promise<string>) => {
  let callCount = 0;
  return async (
    _history: ChatMessage[],
    _config: AppConfig,
  ): Promise<string> => {
    // Return the next pre-canned XML response from the `responses` array.
    const response = responses[callCount];
    if (!response) {
      throw new Error(
        `Mock LLM called more times than expected (${callCount}).`
      );
    }
    callCount++;
    return response;
  };
};

/**
 * Creates a mock LLM query function using Bun's mock for testing with spies.
 * This is useful when you need to track call counts, arguments, etc.
 *
 * @param responses - Array of predefined responses to return in sequence
 * @returns A Bun mock function that simulates LLM responses
 */
export const createMockLLMQueryWithSpy = (responses: string[]) => {
  let callCount = 0;
  return jest.fn(
    async (_history: ChatMessage[], _config: AppConfig): Promise<string> => {
      const response = responses[callCount] || responses[responses.length - 1];
      callCount++;
      return response as string;
    }
  );
};

/**
 * Default mock configuration for tests
 */
export const createMockConfig = (
  overrides: Partial<AppConfig> = {}
): AppConfig => ({
  openRouterApiKey: 'test-api-key',
  knowledgeGraphPath: '/test/path',
  recursaApiKey: 'test-api-key',
  httpPort: 8080,
  llmModel: 'anthropic/claude-3-haiku-20240307',
  llmTemperature: 0.7,
  llmMaxTokens: 4000,
  sandboxTimeout: 10000,
  sandboxMemoryLimit: 100,
  gitUserName: 'Test User',
  gitUserEmail: 'test@example.com',
  ...overrides,
});

/**
 * Default mock chat history for tests
 */
export const createMockHistory = (
  customMessages: Partial<ChatMessage>[] = []
): ChatMessage[] => [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello, world!' },
  ...customMessages.map(
    (msg) =>
      ({
        role: msg.role || 'user',
        content: msg.content || '',
      }) as ChatMessage
  ),
];
````

## File: tasks.md
````markdown
# Tasks

Based on plan UUID: a8e9f2d1-0c6a-4b3f-8e1d-9f4a6c7b8d9e

## Part 1: Purge `any` Types to Enforce Strict Type Safety

### Task 1.1: Harden Emitter with `unknown`

- **uuid**: b3e4f5a6-7b8c-4d9e-8f0a-1b2c3d4e5f6g
- **status**: done
- **job-id**: job-44fc2242
- **depends-on**: []
- **description**: In `createEmitter`, change the type of the `listeners` map value from `Listener<any>[]` to `Array<Listener<unknown>>`. In the `emit` function, apply a type assertion to the listener before invoking it. Change `listener(data)` to `(listener as Listener<Events[K]>)(data)`.
- **files**: src/lib/events.ts

### Task 1.2: Add Strict Types to MCP E2E Test

- **uuid**: a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d
- **status**: done
- **job-id**: job-44fc2242
- **depends-on**: []
- **description**: Import the `MCPResponse` and `MCPTool` types from `src/types/index.ts`. Change the signature of `readMessages` to return `AsyncGenerator<MCPResponse>` instead of `AsyncGenerator<any>`. In `readMessages`, cast the parsed JSON: `yield JSON.parse(line) as MCPResponse;`. In the test case `it("should initialize and list tools correctly")`, find the `process_query` tool with proper typing: `(listToolsResponse.value.result.tools as MCPTool[]).find((t: MCPTool) => t.name === "process_query")`.
- **files**: tests/e2e/mcp-protocol.test.ts

## Part 2: Abstract Test Environment Setup (DRY)

### Task 2.1: Create a `TestHarness` for Environment Management

- **uuid**: f6a5b4c3-2d1e-4b9c-8a7f-6e5d4c3b2a1f
- **status**: done
- **job-id**: job-b2ec7d18
- **depends-on**: []
- **description**: Create a new directory `tests/lib` and file `tests/lib/test-harness.ts`. Implement and export an async function `setupTestEnvironment()` that creates a temp directory, initializes a git repo, and returns `{ testGraphPath, cleanup, reset }`. The `cleanup` function should delete the temp directory (`for afterAll`). The `reset` function should clean the directory contents and re-initialize git (`for beforeEach`).
- **files**: tests/lib/test-harness.ts (new)

### Task 2.2: Refactor Integration and E2E Tests to Use the Harness

- **uuid**: e5d4c3b2-a1f6-4a9b-8c7d-6b5c4d3e2a1f
- **status**: done
- **job-id**: job-b2ec7d18
- **depends-on**: [f6a5b4c3-2d1e-4b9c-8a7f-6e5d4c3b2a1f]
- **description**: In each test file, import `setupTestEnvironment` from `../lib/test-harness.ts`. Replace the manual `beforeAll`, `afterAll`, and `beforeEach` logic for directory and git management with calls to `setupTestEnvironment`, `cleanup`, and `reset`. Ensure variables like `tempDir`, `testGraphPath`, and `mockConfig` are updated to use the values returned from the harness.
- **files**: tests/integration/mem-api.test.ts, tests/integration/workflow.test.ts, tests/e2e/agent-workflow.test.ts

## Part 3: Consolidate Mock LLM Utility (DRY)

### Task 3.1: Add Shared `createMockQueryLLM` to Test Harness

- **uuid**: b1a0c9d8-e7f6-4a5b-9c3d-2e1f0a9b8c7d
- **status**: done
- **job-id**: job-11bd80d6
- **depends-on**: [f6a5b4c3-2d1e-4b9c-8a7f-6e5d4c3b2a1f]
- **description**: Open `tests/lib/test-harness.ts`. Add and export a new function `createMockQueryLLM(responses: string[])`. This function should accept an array of strings and return a mock function compatible with the `queryLLM` parameter in `handleUserQuery`. The returned mock should cycle through the `responses` array on each call and throw an error if called more times than responses are available.
- **files**: tests/lib/test-harness.ts

### Task 3.2: Refactor Tests to Use Shared LLM Mock

- **uuid**: a9b8c7d6-e5f4-4a3b-2c1d-0e9f8a7b6c5d
- **status**: done
- **job-id**: job-11bd80d6
- **depends-on**: [b1a0c9d8-e7f6-4a5b-9c3d-2e1f0a9b8c7d]
- **description**: In `tests/integration/workflow.test.ts`, remove the local `createMockLLMQuery` function. In `tests/e2e/agent-workflow.test.ts`, remove the local `createMockQueryLLM` function. In both files, import the new `createMockQueryLLM` from `../lib/test-harness.ts`. Update all call sites to use the imported mock generator.
- **files**: tests/integration/workflow.test.ts, tests/e2e/agent-workflow.test.ts

## Audit Task

### Task A.1: Final Audit and Merge

- **uuid**: audit-001
- **status**: todo
- **job-id**:
- **depends-on**: [b3e4f5a6-7b8c-4d9e-8f0a-1b2c3d4e5f6g, a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d, f6a5b4c3-2d1e-4b9c-8a7f-6e5d4c3b2a1f, e5d4c3b2-a1f6-4a9b-8c7d-6b5c4d3e2a1f, b1a0c9d8-e7f6-4a5b-9c3d-2e1f0a9b8c7d, a9b8c7d6-e5f4-4a3b-2c1d-0e9f8a7b6c5d]
- **description**: Merge every job-\* branch. Lint & auto-fix entire codebase. Run full test suite → 100% pass. Commit 'chore: final audit & lint'.
````

## File: tests/unit/llm.test.ts
````typescript
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { queryLLM } from '../../src/core/llm';
import { generateText } from 'ai';
import { openrouter } from '@openrouter/ai-sdk-provider';
import type { AppConfig } from '../../src/config';
import type { ChatMessage } from '../../src/types';

// Mock the Vercel AI SDK and the OpenRouter provider
jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

jest.mock('@openrouter/ai-sdk-provider', () => ({
  openrouter: jest.fn((modelId: string) => ({
    modelId,
    provider: 'mockOpenRouterProvider',
  })),
}));

// Cast the mocked functions to Jest's mock type for type safety
const mockGenerateText = generateText as jest.MockedFunction<typeof generateText>;
const mockOpenRouter = openrouter as unknown as jest.Mock;

const mockConfig: AppConfig = {
  openRouterApiKey: 'test-api-key',
  knowledgeGraphPath: '/test/path',
  recursaApiKey: 'test-api-key',
  httpPort: 8080,
  llmModel: 'anthropic/claude-3-haiku-20240307',
  llmTemperature: 0.7,
  llmMaxTokens: 4000,
  sandboxTimeout: 10000,
  sandboxMemoryLimit: 100,
  gitUserName: 'Test User',
  gitUserEmail: 'test@example.com',
};

const mockHistory: ChatMessage[] = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello, world!' },
  { role: 'assistant', content: 'How can I help you?' },
];

beforeEach(() => {
  // Clear all mock history and implementations before each test
  jest.clearAllMocks();
});

describe('LLM Module with AI SDK', () => {
  it('should call generateText with correct parameters', async () => {
    // Arrange: Mock the successful response from the AI SDK
    mockGenerateText.mockResolvedValue({
      text: 'Test response from AI SDK',
      toolCalls: [],
      toolResults: [],
      finishReason: 'stop',
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
      warnings: undefined,
      request: {
        body: '{}',
      },
      response: {
        id: 'test-response-id',
        timestamp: new Date(),
        modelId: 'anthropic/claude-3-haiku-20240307',
        headers: {},
        messages: [],
      },
      logprobs: undefined,
      experimental_providerMetadata: undefined,
    });

    // Act: Call our queryLLM function
    const response = await queryLLM(mockHistory, mockConfig);

    // Assert: Check the response and that our mocks were called correctly
    expect(response).toBe('Test response from AI SDK');

    // Verify openrouter was called with the correct model ID
    expect(mockOpenRouter).toHaveBeenCalledTimes(1);
    expect(mockOpenRouter).toHaveBeenCalledWith('anthropic/claude-3-haiku-20240307');

    // Verify generateText was called correctly
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: {
          modelId: 'anthropic/claude-3-haiku-20240307',
          provider: 'mockOpenRouterProvider',
        },
        system: 'You are a helpful assistant.',
        messages: [
          { role: 'user', content: 'Hello, world!' },
          { role: 'assistant', content: 'How can I help you?' },
        ],
        temperature: 0.7,
        maxTokens: 4000,
      })
    );
  });

  it('should handle API errors from generateText', async () => {
    // Arrange: Mock an error being thrown from the AI SDK
    const apiError = new Error('API request failed');
    mockGenerateText.mockRejectedValue(apiError);

    // Act & Assert: Expect our queryLLM function to reject with a specific error message
    await expect(queryLLM(mockHistory, mockConfig)).rejects.toThrow(
      'Failed to query OpenRouter API: API request failed'
    );
  });

  it('should handle empty content in the AI SDK response', async () => {
    // Arrange: Mock a response with an empty text field
    mockGenerateText.mockResolvedValue({
      text: '',
      toolCalls: [],
      toolResults: [],
      finishReason: 'stop',
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
      warnings: undefined,
      request: {
        body: '{}',
      },
      response: {
        id: 'test-response-id',
        timestamp: new Date(),
        modelId: 'anthropic/claude-3-haiku-20240307',
        headers: {},
        messages: [],
      },
      logprobs: undefined,
      experimental_providerMetadata: undefined,
    });

    // Act & Assert: Expect an error for empty content
    await expect(queryLLM(mockHistory, mockConfig)).rejects.toThrow(
      'Failed to query OpenRouter API: Empty content received from OpenRouter API'
    );
  });
});
````

## File: tests/integration/workflow.test.ts
````typescript
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
    const streamContentMock = jest.fn<(content: { type: 'text'; text: string }) => Promise<void>>();
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
    const streamContentMock = jest.fn<
      (content: { type: 'text'; text: string }) => Promise<void>
    >();
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
````

## File: src/core/mem-api/file-ops.ts
````typescript
import { promises as fs } from 'fs';
import path from 'path';
import { resolveSecurePath, validatePathBounds } from './secure-path.js';
import platform from '../../lib/platform.js';
import { validateLogseqContent } from '../../lib/logseq-validator.js';

// Note: Each function here is a HOF that takes dependencies (like graphRoot)
// and returns the actual function to be exposed on the mem API.

/**
 * Cross-platform file operation utilities with enhanced error handling
 */

/**
 * Atomic file write with temporary file and proper cleanup
 */
const atomicWriteFile = async (filePath: string, content: string): Promise<void> => {
  const tempPath = filePath + '.tmp.' + Math.random().toString(36).substr(2, 9);

  try {
    // Write to temporary file first
    await fs.writeFile(tempPath, content, 'utf-8');

    // On Windows, we need to handle file locking differently
    if (platform.isWindows) {
      // Try to rename, if it fails due to locking, wait and retry
      let retries = 3;
      let lastError: Error | null = null;

      while (retries > 0) {
        try {
          await fs.rename(tempPath, filePath);
          return; // Success
        } catch (error: unknown) {
          lastError = error as Error;
          if (hasErrorCode(error) && (error.code === 'EBUSY' || error.code === 'EPERM')) {
            retries--;
            await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
            continue;
          }
          throw error; // Re-throw non-locking errors
        }
      }
      throw lastError;
    } else {
      // Unix-like systems can usually rename directly
      await fs.rename(tempPath, filePath);
    }
  } catch (error) {
    // Clean up temp file if something went wrong
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
};

/**
 * Type guard to check if error has a code property
 */
const hasErrorCode = (error: unknown): error is Error & { code?: string } => {
  return error instanceof Error && 'code' in error;
};

/**
 * Enhanced error handler for file operations
 */
const handleFileError = (error: unknown, operation: string, filePath: string): Error => {
  const nodeError = error as NodeJS.ErrnoException;

  // Handle platform-specific errors
  if (nodeError.code === 'EACCES' || nodeError.code === 'EPERM') {
    if (platform.isWindows) {
      return new Error(`Permission denied for ${operation} on ${filePath}. The file may be in use or you may need administrator privileges.`);
    }
    if (platform.isTermux) {
      return new Error(`Permission denied for ${operation} on ${filePath}. Check Termux storage permissions.`);
    }
    return new Error(`Permission denied for ${operation} on ${filePath}. Check file permissions.`);
  }

  if (nodeError.code === 'EMFILE' || nodeError.code === 'ENFILE') {
    return new Error(`Too many files open for ${operation} on ${filePath}. Close some files and try again.`);
  }

  if (nodeError.code === 'ENOSPC') {
    return new Error(`No space left on device for ${operation} on ${filePath}.`);
  }

  if (nodeError.code === 'EROFS') {
    return new Error(`Read-only file system: Cannot perform ${operation} on ${filePath}.`);
  }

  if (nodeError.code === 'EBUSY') {
    return new Error(`Resource busy: Cannot perform ${operation} on ${filePath} as it is in use.`);
  }

  return new Error(`Failed to ${operation.toLowerCase()} ${filePath}: ${nodeError.message}`);
};

/**
 * Ensure parent directories exist with proper error handling
 */
const ensureParentDirectories = async (filePath: string): Promise<void> => {
  const dir = path.dirname(filePath);

  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error: unknown) {
    if (hasErrorCode(error) && error.code !== 'EEXIST') {
      throw handleFileError(error, 'create parent directories', dir);
    }
  }
};

export const readFile =
  (graphRoot: string) =>
  async (filePath: string): Promise<string> => {
    const fullPath = resolveSecurePath(graphRoot, filePath);

    try {
      // Additional validation for symlink safety
      if (!validatePathBounds(graphRoot, fullPath, { followSymlinks: true })) {
        throw new Error(`Security violation: Path validation failed for ${filePath}`);
      }

      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      throw handleFileError(error, 'read file', filePath);
    }
  };

export const writeFile =
  (graphRoot: string) =>
  async (filePath: string, content: string): Promise<boolean> => {
    const fullPath = resolveSecurePath(graphRoot, filePath);

    try {
      if (filePath.endsWith('.md')) {
        const validation = validateLogseqContent(content);
        if (!validation.isValid) {
          throw new Error(
            `Invalid Logseq content for ${filePath}: ${validation.errors.join(
              ', '
            )}`
          );
        }
      }

      // Additional validation - allow non-existent files for write operations
      if (!validatePathBounds(graphRoot, fullPath, { followSymlinks: false, requireExistence: false })) {
        throw new Error(`Security violation: Path validation failed for ${filePath}`);
      }

      // Ensure parent directories exist
      await ensureParentDirectories(fullPath);

      // Use atomic write for data safety
      await atomicWriteFile(fullPath, content);
      return true;
    } catch (error) {
      throw handleFileError(error, 'write file', filePath);
    }
  };

export const updateFile =
  (graphRoot: string) =>
  async (
    filePath: string,
    oldContent: string,
    newContent: string
  ): Promise<boolean> => {
    const fullPath = resolveSecurePath(graphRoot, filePath);

    try {
      if (filePath.endsWith('.md')) {
        const validation = validateLogseqContent(newContent);
        if (!validation.isValid) {
          throw new Error(
            `Invalid Logseq content for ${filePath}: ${validation.errors.join(
              ', '
            )}`
          );
        }
      }

      // Additional validation
      if (!validatePathBounds(graphRoot, fullPath, { followSymlinks: false })) {
        throw new Error(`Security violation: Path validation failed for ${filePath}`);
      }

      // Atomically read and compare the file content.
      const currentContent = await fs.readFile(fullPath, 'utf-8');

      // This is a Compare-and-Swap (CAS) operation.
      // If the content on disk is not what the agent *thinks* it is,
      // another process (or agent turn) has modified it. We must abort.
      if (currentContent !== oldContent) {
        throw new Error(
          `File content has changed since it was last read for ${filePath}. Update aborted to prevent data loss.`
        );
      }

      // Write the new content back using atomic write.
      await atomicWriteFile(fullPath, newContent);
      return true;
    } catch (error) {
      throw handleFileError(error, 'update file', filePath);
    }
  };

export const deletePath =
  (graphRoot: string) =>
  async (filePath: string): Promise<boolean> => {
    const fullPath = resolveSecurePath(graphRoot, filePath);

    try {
      // Additional validation
      if (!validatePathBounds(graphRoot, fullPath, { followSymlinks: false })) {
        throw new Error(`Security violation: Path validation failed for ${filePath}`);
      }

      await fs.rm(fullPath, { recursive: true, force: true });
      return true;
    } catch (error) {
      throw handleFileError(error, 'delete path', filePath);
    }
  };

export const rename =
  (graphRoot: string) =>
  async (oldPath: string, newPath: string): Promise<boolean> => {
    const fullOldPath = resolveSecurePath(graphRoot, oldPath);
    const fullNewPath = resolveSecurePath(graphRoot, newPath);

    try {
      // Additional validation for both paths
      if (!validatePathBounds(graphRoot, fullOldPath, { followSymlinks: false }) ||
          !validatePathBounds(graphRoot, fullNewPath, { followSymlinks: false })) {
        throw new Error(`Security violation: Path validation failed for rename operation`);
      }

      // Ensure parent directory of new path exists
      await ensureParentDirectories(fullNewPath);

      await fs.rename(fullOldPath, fullNewPath);
      return true;
    } catch (error) {
      throw handleFileError(error, `rename ${oldPath} to ${newPath}`, oldPath);
    }
  };

export const fileExists =
  (graphRoot: string) =>
  async (filePath: string): Promise<boolean> => {
    try {
      // resolveSecurePath will throw a SecurityError on traversal attempts.
      // fs.access will throw an error if the file doesn't exist.
      // Both should result in `false`.
      const fullPath = resolveSecurePath(graphRoot, filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      // Any error (security, not found, permissions) results in false.
      return false;
    }
  };

export const createDir =
  (graphRoot: string) =>
  async (directoryPath: string): Promise<boolean> => {
    const fullPath = resolveSecurePath(graphRoot, directoryPath);

    try {
      // Additional validation
      if (!validatePathBounds(graphRoot, fullPath, { followSymlinks: false })) {
        throw new Error(`Security violation: Path validation failed for ${directoryPath}`);
      }

      await fs.mkdir(fullPath, { recursive: true });
      return true;
    } catch (error) {
      throw handleFileError(error, 'create directory', directoryPath);
    }
  };

export const listFiles =
  (graphRoot: string) =>
  async (directoryPath?: string): Promise<string[]> => {
    const targetDir = directoryPath ? directoryPath : '.';
    const fullPath = resolveSecurePath(graphRoot, targetDir);

    try {
      // Additional validation
      if (!validatePathBounds(graphRoot, fullPath, { followSymlinks: true })) {
        throw new Error(`Security violation: Path validation failed for directory ${directoryPath || 'root'}`);
      }

      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      return entries.map((entry) => entry.name).sort(); // Sort for consistent ordering
    } catch (error) {
      throw handleFileError(error, `list files in directory`, directoryPath || 'root');
    }
  };
````

## File: package.json
````json
{
  "name": "recursa-server",
  "version": "0.1.0",
  "description": "Git-Native AI agent with MCP protocol support",
  "type": "module",
  "scripts": {
    "start": "node dist/server.js",
    "start:termux": "npm run start",
    "start:standard": "npm run start",
    "build": "tsc",
    "build:auto": "node scripts/build.js",
    "build:termux": "node scripts/build.js termux",
    "build:standard": "node scripts/build.js standard",
    "dev": "tsx watch src/server.ts",
    "dev:termux": "npm run dev",
    "dev:standard": "npm run dev",
    "test": "jest",
    "lint": "eslint 'src/**/*.ts' 'scripts/**/*.js' 'tests/**/*.ts'",
    "install:auto": "node scripts/install.js",
    "install:termux": "node scripts/install.js termux",
    "install:standard": "node scripts/install.js standard",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@openrouter/ai-sdk-provider": "^0.7.5",
    "ai": "^4.3.17",
    "dotenv": "^16.4.5",
    "fastmcp": "^1.21.0",
    "simple-git": "^3.20.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@jest/globals": "^29.7.0",
    "@types/expect": "^1.20.4",
    "@types/jest": "^29.5.12",
    "@types/node": "^20.10.0",
    "@typescript-eslint/eslint-plugin": "^8.46.4",
    "@typescript-eslint/parser": "^8.46.4",
    "eslint": "^9.39.1",
    "jest": "^29.7.0",
    "jest-extended": "^4.0.2",
    "ts-jest": "^29.1.2",
    "tsx": "^4.7.2",
    "typescript": "^5.3.0"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "license": "MIT"
}
````

## File: src/core/loop.ts
````typescript
import type { AppConfig } from '../config';
import type { ExecutionContext, ChatMessage } from '../types';
import { logger } from '../lib/logger.js';
import { queryLLMWithRetries as defaultQueryLLM } from './llm.js';
import { parseLLMResponse } from './parser.js';
import { runInSandbox } from './sandbox.js';
import { createMemAPI } from './mem-api/index.js';
import { promises as fs } from 'fs';
import path from 'path';

// Helper functions for session management
const getSessionPath = async (
  sessionId: string,
  graphRoot: string,
): Promise<string> => {
  const sessionDir = path.join(graphRoot, '.sessions');
  // Ensure the session directory exists
  await fs.mkdir(sessionDir, { recursive: true });
  return path.join(sessionDir, `${sessionId}.json`);
};

const loadSessionHistory = async (
  sessionId: string,
  graphRoot: string,
): Promise<ChatMessage[] | null> => {
  const sessionFile = await getSessionPath(sessionId, graphRoot);
  try {
    const data = await fs.readFile(sessionFile, 'utf-8');
    return JSON.parse(data) as ChatMessage[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null; // File doesn't exist, new session
    }
    throw error; // Other errors should be thrown
  }
};

const saveSessionHistory = async (
  sessionId: string,
  graphRoot: string,
  history: ChatMessage[],
): Promise<void> => {
  const sessionFile = await getSessionPath(sessionId, graphRoot);
  await fs.writeFile(sessionFile, JSON.stringify(history, null, 2), 'utf-8');
};

let systemPromptMessage: ChatMessage | null = null;

const getSystemPrompt = async (): Promise<ChatMessage> => {
  // This function reads the system prompt from disk on its first call and caches it.
  // This is a form of lazy-loading and ensures the file is read only once.
  if (systemPromptMessage) {
    return systemPromptMessage;
  }

  try {
    // Resolve the path to 'docs/system-prompt.md' from the project root.
    const promptPath = path.resolve(process.cwd(), 'docs/system-prompt.md');

    // Read the file content asynchronously.
    const systemPromptContent = await fs.readFile(promptPath, 'utf-8');

    // Create the ChatMessage object and store it in `systemPromptMessage`.
    systemPromptMessage = {
      role: 'system',
      content: systemPromptContent.trim(),
    };

    logger.info('System prompt loaded successfully', { path: promptPath });
    return systemPromptMessage;
  } catch (error) {
    // If file read fails, log a critical error and exit, as the agent cannot run without it.
    const errorMessage = 'Failed to load system prompt file';
    logger.error(errorMessage, error as Error, {
      path: path.resolve(process.cwd(), 'docs/system-prompt.md'),
    });

    // Throw an error to be caught by the server's main function
    throw new Error(errorMessage, { cause: error });
  }
};

export const handleUserQuery = async (
  query: string,
  config: AppConfig,
  sessionId: string,
  runId: string,
  // Allow overriding the LLM query function (with its retry logic) for testing purposes
  queryLLM: ((
    history: ChatMessage[],
    config: AppConfig
  ) => Promise<string | unknown>) = defaultQueryLLM,
  streamContent: (content: { type: 'text'; text: string }) => Promise<void>
): Promise<string> => {
  // 1. **Initialization**
  logger.info('Starting user query handling', {
    runId,
    sessionId: sessionId,
  });

  const memAPI = createMemAPI(config);

  // Initialize or retrieve session history
  const loadedHistory = await loadSessionHistory(sessionId, config.knowledgeGraphPath);
  const history = loadedHistory || [await getSystemPrompt()];
  history.push({ role: 'user', content: query });

  const context: ExecutionContext = {
    history,
    memAPI,
    config,
    runId,
    streamContent,
  };

  // 2. **Execution Loop**
  const MAX_TURNS = 10;
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    logger.info(`Starting turn ${turn + 1}`, { runId, turn: turn + 1 });

    // **Call LLM**
    const llmResponseStr = (await queryLLM(context.history, config)) as string;
    context.history.push({ role: 'assistant', content: llmResponseStr });

    // **Parse**
    const parsedResponse = parseLLMResponse(llmResponseStr);

    // Debug logging to see what was parsed
    logger.info('Parsed LLM response', {
      runId,
      parsed: {
        think: !!parsedResponse.think,
        typescript: !!parsedResponse.typescript,
        reply: !!parsedResponse.reply,
      },
    });

    if (
      !parsedResponse.think &&
      !parsedResponse.typescript &&
      !parsedResponse.reply
    ) {
      logger.error('Failed to parse LLM response', undefined, {
        runId,
        llmResponseStr: llmResponseStr as string,
      });
      return 'Error: Could not understand the response from the AI.';
    }

    // **Think**
    if (parsedResponse.think) {
      logger.info('Agent is thinking', {
        runId,
        thought: parsedResponse.think,
      });

      // Stream the "thought" back to the client.
      await streamContent({ type: 'text', text: `> ${parsedResponse.think}\n\n` });
    }

    // **Act**
    if (parsedResponse.typescript) {
      logger.info('Executing TypeScript code', { runId });

      try {
        logger.info('Running code in sandbox', { runId });
        const executionResult = await runInSandbox(
          parsedResponse.typescript,
          context.memAPI,
          config.sandboxTimeout
        );
        logger.info('Code executed successfully', {
          runId,
          // Safely serialize result for logging
          result: JSON.stringify(executionResult, null, 2),
        });
        const feedback = `[Execution Result]: Code executed successfully. Result: ${JSON.stringify(executionResult)}`;
        context.history.push({ role: 'user', content: feedback });
      } catch (e) {
        logger.error('Code execution failed', e as Error, { runId });
        const feedback = `[Execution Error]: Your code failed to execute. Error: ${
          (e as Error).message
        }. You must analyze this error and correct your code in the next turn.`;
        context.history.push({ role: 'user', content: feedback });
      }
    }

    // Persist history at the end of the turn
    await saveSessionHistory(sessionId, config.knowledgeGraphPath, context.history);

    // **Reply**
    if (parsedResponse.reply) {
      logger.info('Agent replied', { runId, reply: parsedResponse.reply });
      return parsedResponse.reply;
    }
  }

  // 3. **Termination**
  logger.warn('Loop finished without a reply', { runId, turns: MAX_TURNS });
  return 'The agent finished its work without providing a final response.';
};
````

## File: repomix.config.json
````json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "input": {
    "maxFileSize": 52428800
  },
  "output": {
    "filePath": "repo/repomix.md",
    "style": "markdown",
    "parsableStyle": true,
    "fileSummary": false,
    "directoryStructure": true,
    "files": true,
    "removeComments": false,
    "removeEmptyLines": false,
    "compress": false,
    "topFilesLength": 5,
    "showLineNumbers": false,
    "truncateBase64": false,
    "copyToClipboard": true,
    "includeFullDirectoryStructure": false,
    "tokenCountTree": false,
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": false,
      "includeLogs": false,
      "includeLogsCount": 50
    }
  },
  "include": [],
  "ignore": {
    "useGitignore": true,
    "useDefaultPatterns": true,
    "customPatterns": [
      ".relay/",
      "agent-spawner.claude.md",
      "agent-spawner.droid.md",
      "AGENTS.md",
      "repo",
      "prompt",
      "scripts",
      "docs",
      "coverage"
      //   "tests"
    ]
  },
  "security": {
    "enableSecurityCheck": true
  },
  "tokenCount": {
    "encoding": "o200k_base"
  }
}
````

## File: src/core/mem-api/graph-ops.ts
````typescript
import { promises as fs } from 'fs';
import path from 'path';
import type { GraphQueryResult } from '../../types';
import { resolveSecurePath } from './secure-path.js';
import { walk } from './fs-walker.js';
import { createIgnoreFilter } from '../../lib/gitignore-parser.js';

type PropertyCondition = {
  type: 'property';
  key: string;
  value: string;
};

type OutgoingLinkCondition = {
  type: 'outgoing-link';
  target: string;
};

type Condition = PropertyCondition | OutgoingLinkCondition;

const parseCondition = (conditionStr: string): Condition | null => {
  const propertyRegex = /^\(property\s+([^:]+?)::\s*(.+?)\)$/;
  let match = conditionStr.trim().match(propertyRegex);
  if (match?.[1] && match[2]) {
    return {
      type: 'property',
      key: match[1].trim(),
      value: match[2].trim(),
    };
  }

  const linkRegex = /^\(outgoing-link\s+\[\[(.+?)\]\]\)$/;
  match = conditionStr.trim().match(linkRegex);
  if (match?.[1]) {
    return {
      type: 'outgoing-link',
      target: match[1].trim(),
    };
  }

  return null;
};

const checkCondition = (content: string, condition: Condition): string[] => {
  const matches: string[] = [];
  if (condition.type === 'property') {
    const lines = content.split('\n');
    for (const line of lines) {
      // Handle indented properties by removing the leading list marker
      const trimmedLine = line.trim().replace(/^- /, '');
      if (trimmedLine === `${condition.key}:: ${condition.value}`) {
        matches.push(line);
      }
    }
  } else if (condition.type === 'outgoing-link') {
    const linkRegex = /\[\[(.*?)\]\]/g;
    const outgoingLinks = new Set(
      Array.from(content.matchAll(linkRegex), (m) => m[1])
    );
    if (outgoingLinks.has(condition.target)) {
      // Return a generic match since we don't have a specific line
      matches.push(`[[${condition.target}]]`);
    }
  }
  return matches;
};

export const queryGraph =
  (graphRoot: string) =>
  async (query: string): Promise<GraphQueryResult[]> => {
    const conditionStrings = query.split(/ AND /i);
    const conditions = conditionStrings
      .map(parseCondition)
      .filter((c): c is Condition => c !== null);

    if (conditions.length === 0) {
      return [];
    }

    const results: GraphQueryResult[] = [];
    const isIgnored = await createIgnoreFilter(graphRoot);

    for await (const filePath of walk(graphRoot, isIgnored)) {
      if (!filePath.endsWith('.md')) continue;

      const content = await fs.readFile(filePath, 'utf-8');
      const allMatchingLines: string[] = [];
      let allConditionsMet = true;

      for (const condition of conditions) {
        const matchingLines = checkCondition(content, condition);
        if (matchingLines.length > 0) {
          allMatchingLines.push(...matchingLines);
        } else {
          allConditionsMet = false;
          break;
        }
      }

      if (allConditionsMet) {
        results.push({
          filePath: path.relative(graphRoot, filePath),
          matches: allMatchingLines,
        });
      }
    }
    return results;
  };

export const getBacklinks =
  (graphRoot: string) =>
  async (filePath: string): Promise<string[]> => {
    const targetWithoutExt = path.basename(filePath, path.extname(filePath));
    const targetWithExt = path.basename(filePath);

    const backlinks: string[] = [];
    const isIgnored = await createIgnoreFilter(graphRoot);

    for await (const currentFilePath of walk(graphRoot, isIgnored)) {
      // Don't link to self
      if (path.resolve(currentFilePath) === resolveSecurePath(graphRoot, filePath)) {
        continue;
      }

      if (currentFilePath.endsWith('.md')) {
        try {
          const content = await fs.readFile(currentFilePath, 'utf-8');
          // Extract all outgoing links from the current file
          const linkRegex = /\[\[(.*?)\]\]/g;
          const matches = content.matchAll(linkRegex);

          for (const match of matches) {
            if (match[1]) {
              const linkTarget = match[1].trim();
              // Check if this link points to our target file
              // Try matching against various possible formats:
              // - Exact basename without extension (e.g., "PageC")
              // - Exact basename with extension (e.g., "PageC.md")
              // - With spaces (e.g., "Page C" for "PageC")
              if (linkTarget === targetWithoutExt ||
                  linkTarget === targetWithExt ||
                  linkTarget.replace(/\s+/g, '') === targetWithoutExt ||
                  linkTarget.replace(/\s+/g, '') === targetWithExt) {
                backlinks.push(path.relative(graphRoot, currentFilePath));
                break; // Found a match, no need to check more links in this file
              }
            }
          }
        } catch {
          // Ignore files that can't be read
        }
      }
    }
    return backlinks;
  };

export const getOutgoingLinks =
  (graphRoot: string) =>
  async (filePath: string): Promise<string[]> => {
    const fullPath = resolveSecurePath(graphRoot, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const linkRegex = /\[\[(.*?)\]\]/g;
    const matches = content.matchAll(linkRegex);
    const uniqueLinks = new Set<string>();

    for (const match of matches) {
      if (match[1]) {
        uniqueLinks.add(match[1]);
      }
    }
    return Array.from(uniqueLinks);
  };

export const searchGlobal =
  (graphRoot: string) =>
  async (query: string): Promise<string[]> => {
    const matchingFiles: string[] = [];
    const lowerCaseQuery = query.toLowerCase();
    const isIgnored = await createIgnoreFilter(graphRoot);

    for await (const filePath of walk(graphRoot, isIgnored)) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        if (content.toLowerCase().includes(lowerCaseQuery)) {
          matchingFiles.push(path.relative(graphRoot, filePath));
        }
      } catch {
        // Ignore binary files or files that can't be read
      }
    }
    return matchingFiles;
  };
````

## File: src/core/sandbox.ts
````typescript
import { createContext, runInContext } from 'node:vm';
import type { MemAPI } from '../types/mem';
import { logger } from '../lib/logger.js';

/**
 * Executes LLM-generated TypeScript code in a secure, isolated sandbox.
 * @param code The TypeScript code snippet to execute.
 * @param memApi The MemAPI instance to expose to the sandboxed code.
 * @returns The result of the code execution.
 */
export const runInSandbox = async (
  code: string,
  memApi: MemAPI,
  timeout = 10000
): Promise<unknown> => {
  // Create a sandboxed context with the mem API and only essential globals
  const context = createContext({
    mem: memApi,
    // Essential JavaScript globals
    console: {
      log: (...args: unknown[]) =>
        logger.info('Sandbox console.log', { arguments: args }),
      error: (...args: unknown[]) =>
        logger.error('Sandbox console.error', undefined, {
          arguments: args,
        }),
      warn: (...args: unknown[]) =>
        logger.warn('Sandbox console.warn', { arguments: args }),
    },
    // Promise and async support
    Promise,
    setTimeout: (fn: () => void, delay: number) => {
      if (delay > 1000) {
        throw new Error('Timeout too long');
      }
      return setTimeout(fn, Math.min(delay, 10000));
    },
    clearTimeout,
    // Basic types and constructors
    Array,
    Object,
    String,
    Number,
    Boolean,
    Date,
    Math,
    JSON,
    RegExp,
    Error,
  });

  // Wrap the user code in an async IIFE to allow top-level await.
  // Ensure the code is properly formatted and doesn't have syntax errors
  const wrappedCode = `(async () => {
${code}
  })();`;

  try {
    logger.debug('Executing code in sandbox', { code, timeout });
    const result = await runInContext(wrappedCode, context, {
      timeout, // Use provided timeout
      displayErrors: true,
    });
    logger.debug('Sandbox execution successful', {
      result,
      type: typeof result,
    });
    return result;
  } catch (error) {
    const errorMessage = (error as Error).message;
    logger.error('Error executing sandboxed code', error as Error, { 
      code,
      wrappedCode: wrappedCode.substring(0, 800) + '...' // Log first 800 chars for debugging
    });
    
    // Provide more specific error messages for common issues
    if (errorMessage.includes('Invalid or unexpected token')) {
      throw new Error(`Sandbox execution failed: Syntax error in code. This usually indicates unescaped quotes or malformed JavaScript. Original error: ${errorMessage}`);
    } else if (errorMessage.includes('timeout')) {
      throw new Error(`Sandbox execution failed: Code execution timed out after ${timeout}ms`);
    } else {
      throw new Error(`Sandbox execution failed: ${errorMessage}`);
    }
  }
};
````

## File: src/server.ts
````typescript
import { handleUserQuery } from './core/loop.js';
import { logger } from './lib/logger.js';
import { loadAndValidateConfig } from './config.js';
import { FastMCP, UserError, type Context } from 'fastmcp';
import { z } from 'zod';
import { queryLLMWithRetries } from './core/llm.js';
import { IncomingMessage } from 'http';

interface SessionContext extends Record<string, unknown> {
  sessionId: string;
  requestId: string;
  stream: {
    write: (content: { type: 'text'; text: string }) => Promise<void>;
  };
}

const main = async () => {
  logger.info('Starting Recursa MCP Server...');

  try {
    // 1. Load configuration
    const config = await loadAndValidateConfig();

    // 2. Create FastMCP server
    const server = new FastMCP<SessionContext>({
      name: 'recursa-server',
      version: '0.1.0',
      authenticate: async (request: IncomingMessage) => {
        const authHeader = request.headers['authorization'];
        const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
          ? authHeader.slice(7)
          : null;

        if (!token || token !== config.recursaApiKey) {
          logger.warn('Authentication failed', {
            remoteAddress: request.socket?.remoteAddress, // Best effort IP logging
          });
          throw new Response(null, {
            status: 401,
            statusText: 'Unauthorized',
          });
        }

        // For simplicity, we'll create minimal session context
        // In a real implementation, you might extract more session info from the request
        return {
          sessionId: 'default-session', // You'd typically generate or extract this
          requestId: 'default-request', // You'd typically generate or extract this
          stream: {
            write: async () => {}, // Placeholder - actual stream will be provided by FastMCP
          },
        } as SessionContext;
      },
    });

    // 3. Add resources
    server.addResource({
      uri: `file://${config.knowledgeGraphPath}`,
      name: 'Knowledge Graph Root',
      mimeType: 'text/directory',
      description: 'Root directory of the knowledge graph',
      async load() {
        return {
          text: `This resource represents the root of the knowledge graph at ${config.knowledgeGraphPath}. It cannot be loaded directly.`,
        };
      },
    });

    // 4. Add tools
    server.addTool({
      name: 'process_query',
      description:
        'Processes a high-level user query by running the agent loop.',
      parameters: z.object({
        query: z.string().describe('The user query to process.'),
      }),
      execute: async (args, context: Context<SessionContext>) => {
        const { log, session } = context;
        const { sessionId, requestId, stream } = session!;
        if (!sessionId) {
          throw new UserError(
            'Session ID is missing. This tool requires a session.'
          );
        }
        if (!requestId) {
          throw new UserError(
            'Request ID is missing. This tool requires a request ID.'
          );
        }
        if (!stream) {
          throw new UserError('This tool requires a streaming connection.');
        }

        try {
          const streamContent = (content: { type: 'text'; text: string }) => {
            return stream.write(content);
          };

          const finalReply = await handleUserQuery(
            args.query,
            config,
            sessionId,
            requestId,
            queryLLMWithRetries,
            streamContent
          );

          return finalReply;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const errorContext =
            error instanceof Error
              ? { message: error.message, stack: error.stack }
              : { message: errorMessage };
          log.error(`Error in process_query: ${errorMessage}`, errorContext);
          throw new UserError(errorMessage);
        }
      },
    });

    // 5. Start the server
    await server.start({
      transportType: 'httpStream',
      httpStream: { port: config.httpPort, endpoint: '/mcp' },
    });

    logger.info(
      `Recursa MCP Server is running and listening on http://localhost:${config.httpPort}`
    );
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
};

main();
````
