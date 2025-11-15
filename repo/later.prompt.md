Alright, let's get this rig publish-ready. Right now, it's a clever hack, but to ship it, we need to turn it into a robust, cross-platform tool that developers can trust and easily build on. We're talking about a full teardown and rebuild of the plumbing—the build system, the test harness, and the core file operations.

The current setup has too much duplicated code, especially in the tests. It's fragile. The build scripts are okay, but they don't inspire confidence across different OSes, especially on edge cases like Termux. The file operations are a race condition waiting to happen. We're going to fix all of that.

The plan is to industrialize this thing. We'll start by forging a unified, auto-detecting build system that just works, whether you're on a Linux box or a phone. Then, we'll build a proper test harness to DRY up the entire test suite, making it clean and maintainable. We'll armor-plate the file system and path security layer, introducing atomic writes and platform-aware error handling to prevent data corruption and block traversal attacks cold. Finally, we'll overhaul the documentation, making it dead simple for anyone to get started. When we're done, this won't just be a cool project; it'll be a dependable, publishable piece of engineering.

```yaml
plan:
  uuid: 'a8e9f2d1-0c6a-4b3f-8e1d-9f4a6c7b8d9e'
  status: 'todo'
  title: 'Make Recursa MCP Server Publish-Ready'
  introduction: |
    This plan outlines a comprehensive refactoring of the Recursa MCP server to prepare it for public release. The current codebase, while functional, requires significant improvements in build automation, testing infrastructure, security, and documentation to be considered robust and maintainable.

    Our approach is to systematically address these areas. We will start by unifying the build and installation process into a single, intelligent system that automatically adapts to the host platform (Linux, macOS, Windows, Termux). This eliminates user guesswork and simplifies the setup process.

    Next, we will tackle the testing suite by implementing the Don't Repeat Yourself (DRY) principle. A centralized test harness will be created to manage environments, mock data, and utilities, drastically reducing boilerplate and improving test clarity. We will also refactor core file operations for enhanced security and data integrity by introducing atomic writes and platform-specific hardening.

    Finally, we will consolidate and rewrite the documentation to provide a clear, concise, and welcoming entry point for new users, ensuring the project is not only powerful but also accessible. The end goal is a high-quality, dependable, and developer-friendly package ready for publishing.
  parts:
    - uuid: 'd9b3e1f0-4c7a-4b8d-9a6c-1e2f3a4b5c6d'
      status: 'todo'
      name: 'Part 1: Unify and Fortify the Build System'
      reason: |
        The current build and installation process is fragmented with platform-specific scripts (`install:termux`, `build:standard`, etc.). This creates a confusing user experience and maintenance overhead. We need a single, intelligent entry point that automatically detects the platform and applies the correct logic, making installation seamless and robust for all users.
      steps:
        - uuid: 'c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f'
          status: 'todo'
          name: '1. Enhance Platform Detection Logic'
          reason: |
            The core of the build system relies on accurate platform detection. We need to enhance `src/lib/platform.ts` to be more comprehensive than just checking `process.platform`. Adding feature detection (e.g., for symlinks) and more granular checks for environments like WSL and Termux will make the downstream scripts more reliable.
          files:
            - 'src/lib/platform.ts'
          operations:
            - 'In `src/lib/platform.ts`, add a `get isWSL(): boolean` getter to detect Windows Subsystem for Linux.'
            - 'Add a `get supportsSymlinks(): boolean` getter that returns true for Linux, macOS, and WSL environments.'
            - 'Implement a `getResourceLimits()` method that returns platform-specific defaults for memory, CPU time, etc., with more conservative values for Termux.'
            - 'Create a `platformString` getter for clean, consistent logging of the detected environment (e.g., "linux-x64-wsl").'
            - 'Add platform-aware helpers for path normalization and error handling.'
        - uuid: 'f7e6d5c4-b3a2-1e0f-9d8c-7b6a5e4d3c2b'
          status: 'todo'
          name: '2. Refactor Installation and Build Scripts'
          reason: |
            The `scripts/install.js` and `scripts/build.js` files should be the single source of truth for their respective processes. They need to be refactored to use the enhanced platform detection logic, improve error handling, and provide clearer logging to the user.
          files:
            - 'scripts/install.js'
            - 'scripts/build.js'
            - 'package.json'
          operations:
            - 'Modify `scripts/install.js` and `scripts/build.js` to import and use the enhanced `platform` object from `src/lib/platform.ts`.'
            - 'Implement a main function in each script that auto-detects the platform and calls the appropriate handler (e.g., `installTermux()` or `installStandard()`).'
            - 'In `package.json`, simplify the scripts. Set `install` to run `node scripts/install.js`, and `build` to run `node scripts/build.js`.'
            - 'Keep the explicit scripts like `install:termux` but have them call the main script with an argument (e.g., `node scripts/install.js termux`).'
            - 'Ensure scripts provide verbose, helpful error messages (e.g., "Installation failed. Please ensure build-essential is installed on Debian-based systems.").'
    - uuid: 'a7b6c5d4-e3f2-1a0b-9c8d-7e6f5a4b3c2a'
      status: 'todo'
      name: 'Part 2: Refactor Testing Infrastructure'
      reason: |
        The test suite contains significant boilerplate and duplicated logic for setting up test environments (temp directories, git repos) and mocking the LLM. This makes tests harder to write and maintain. A centralized test harness will enforce the DRY principle, making the test suite cleaner, faster, and more robust.
      steps:
        - uuid: 'b1a0c9d8-e7f6-4a5b-9c3d-2e1f0a9b8c7d'
          status: 'todo'
          name: '1. Create Centralized Test Harness'
          reason: |
            A `test-harness.ts` file will encapsulate all logic for creating and tearing down isolated test environments. This includes file system setup, git initialization, mock configuration, and shared utilities, providing a consistent foundation for all tests.
          files:
            - 'tests/lib/test-harness.ts'
            - 'tests/lib/test-util.ts'
          operations:
            - 'Create a new file `tests/lib/test-harness.ts`.'
            - 'Implement and export `createTestHarness()` which creates a temp directory, inits a git repo, creates a mock `AppConfig`, and returns an object containing `{ tempDir, mockConfig, mem, git }`.'
            - 'Implement and export `cleanupTestHarness()` which recursively deletes the temp directory.'
            - 'Move the `createMockLLMQueryWithSpy` utility from the test files into the harness and export it.'
            - 'Delete the now-empty `tests/lib/test-util.ts` file.'
        - uuid: 'c5d4e3f2-a1b0-9c8d-7e6f-5a4b3c2a1b9c'
          status: 'todo'
          name: '2. Refactor Integration Tests to Use Harness'
          reason: |
            All integration tests must be updated to use the new test harness. This will remove duplicated setup/teardown code and make the tests more readable and consistent.
          files:
            - 'tests/integration/mem-api-file-ops.test.ts'
            - 'tests/integration/mem-api-git-ops.test.ts'
            - 'tests/integration/mem-api-graph-ops.test.ts'
            - 'tests/integration/mem-api-state-ops.test.ts'
            - 'tests/integration/mem-api-util-ops.test.ts'
          operations:
            - 'In each `mem-api-*.test.ts` file, replace the manual `beforeEach`/`afterEach` logic with calls to `createTestHarness()` and `cleanupTestHarness()`.'
            - 'Update variables within the tests to use the `harness` object (e.g., `harness.mem`, `harness.git`).'
        - uuid: 'd9e8f7g6-h5i4-j3k2-l1m0-n9o8p7q6r5s4'
          status: 'todo'
          name: '3. Consolidate and Refactor Workflow Tests'
          reason: |
            The agent workflow logic is currently tested across multiple, confusingly named files (`tests/integration/workflow.test.ts`, `tests/e2e/agent-workflow.test.ts`, `tests/e2e/mcp-workflow.test.ts`). We will merge these into a single, comprehensive integration test for the core agent loop, clarifying the test structure.
          files:
            - 'tests/integration/workflow.test.ts'
            - 'tests/e2e/agent-workflow.test.ts'
            - 'tests/e2e/mcp-workflow.test.ts'
          operations:
            - 'Merge the test cases from `tests/e2e/agent-workflow.test.ts` and `tests/e2e/mcp-workflow.test.ts` into `tests/integration/workflow.test.ts`.'
            - 'Refactor the combined tests in `tests/integration/workflow.test.ts` to use the new `test-harness.ts`.'
            - 'Ensure the merged test file covers the full agent lifecycle: initialization, feature addition, updates, error handling, and complex git operations.'
            - 'Delete the now redundant `tests/e2e/agent-workflow.test.ts` and `tests/e2e/mcp-workflow.test.ts` files.'
    - uuid: 'e3f2a1b0-9c8d-7e6f-5a4b3c2a-1b9c8d7e'
      status: 'todo'
      name: 'Part 3: Enhance Security and Data Integrity'
      reason: |
        The agent has direct file system access, making security paramount. The current path validation is good, but we must harden it against more sophisticated attacks (symlinks, case-insensitivity exploits). Furthermore, file write operations should be atomic to prevent data corruption if the agent or server crashes mid-operation.
      steps:
        - uuid: 'f2a1b09c-8d7e-6f5a-4b3c-2a1b9c8d7e6f'
          status: 'todo'
          name: '1. Harden Path Security Layer'
          reason: |
            Refactor `src/core/mem-api/secure-path.ts` to be the definitive, cross-platform guard against path traversal. It must correctly handle symlinks, case-insensitive filesystems (Windows/macOS), and other OS-specific edge cases.
          files:
            - 'src/core/mem-api/secure-path.ts'
          operations:
            - 'In `secure-path.ts`, enhance `resolveSecurePath` to use `fs.realpathSync` to resolve symlinks and get a canonical path before validation.'
            - 'Add logic to perform case-insensitive path comparisons when `platform.hasCaseInsensitiveFS` is true.'
            - 'Create a `validatePathBounds` utility that provides more granular checks for symlink policies and path existence.'
            - 'Add tests in `mem-api-file-ops.test.ts` specifically for path traversal attempts using symlinks and case-variant paths.'
        - uuid: 'a1b09c8d-7e6f-5a4b-3c2a-1b9c8d7e6f5a'
          status: 'todo'
          name: '2. Implement Atomic File Operations and Error Handling'
          reason: |
            Standard file writes are not atomic. A crash can leave a file in a corrupted, half-written state. We will implement atomic writes by writing to a temporary file and then renaming it, which is an atomic operation on most filesystems.
          files:
            - 'src/core/mem-api/file-ops.ts'
          operations:
            - 'In `file-ops.ts`, create a private helper function `atomicWriteFile(filePath, content)`.'
            - 'This helper will write `content` to a temporary file (e.g., `filePath.tmp.random`), then use `fs.rename` to move it to the final `filePath`.'
            - 'Refactor `writeFile` and `updateFile` to use this new `atomicWriteFile` helper.'
            - 'Enhance `updateFile` to throw an error if the on-disk content has changed since the agent read it, preventing lost updates (a Compare-and-Swap check).'
            - 'Add more specific, platform-aware error handling to suggest user actions (e.g., `termux-setup-storage` for EACCES on Termux).'
    - uuid: 'b09c8d7e-6f5a-4b3c-2a1b-9c8d7e6f5a4b'
      status: 'todo'
      name: 'Part 4: Streamline Configuration and Documentation'
      reason: |
        The project's configuration and documentation are the first things a new user will interact with. They must be clear, concise, and robust. We will improve the configuration loading to use platform-aware defaults and consolidate the scattered documentation into a clear, hierarchical structure.
      steps:
        - uuid: 'c8d7e6f5-a4b3-c2a1-b9c8-d7e6f5a4b3c2'
          status: 'todo'
          name: '1. Implement Platform-Aware Configuration Defaults'
          reason: |
            Different platforms have different capabilities. The server configuration should reflect this with sensible defaults (e.g., lower memory/token limits on Termux) to provide a better out-of-the-box experience.
          files:
            - 'src/config.ts'
          operations:
            - 'In `src/config.ts`, use the enhanced `platform.getResourceLimits()` method to set default values for `LLM_MAX_TOKENS`, `SANDBOX_TIMEOUT`, and `SANDBOX_MEMORY_LIMIT`.'
            - 'Ensure the configuration validation logic properly resolves relative paths in `KNOWLEDGE_GRAPH_PATH` to absolute paths.'
            - 'Add validation to check if `KNOWLEDGE_GRAPH_PATH` exists and is writable during startup, providing a helpful error message if not.'
        - uuid: 'd7e6f5a4-b3c2-a1b9-c8d7-e6f5a4b3c2a1'
          status: 'todo'
          name: '2. Consolidate and Overhaul Documentation'
          reason: |
            The documentation is spread across multiple files, leading to confusion and redundancy. We will consolidate this into a clear structure with `README.md` as the main entry point.
          files:
            - 'README.md'
            - 'docs/PLATFORM_SUPPORT.md'
            - 'docs/TROUBLESHOOTING.md'
            - 'INSTALL_TERMUX.md'
          operations:
            - 'Rewrite `README.md` to be the primary, user-friendly quick start guide. It should clearly state the project''s purpose and guide users through the simplified `npm install` and `npm run dev` process.'
            - 'Merge the essential content from `INSTALL_TERMUX.md` into `README.md` (for the quick start) and `docs/PLATFORM_SUPPORT.md` (for details).'
            - 'Update `docs/PLATFORM_SUPPORT.md` and `docs/TROUBLESHOOTING.md` to reflect the new unified build system and enhanced error handling.'
            - 'Delete the now-redundant `INSTALL_TERMUX.md` file.'
        - uuid: 'e6f5a4b3-c2a1-b9c8-d7e6-f5a4b3c2a1b9'
          status: 'todo'
          name: '3. Prepare package.json for Publishing'
          reason: |
            To be publishable on npm, `package.json` needs to be populated with standard metadata fields like `main`, `files`, `repository`, `keywords`, etc.
          files:
            - 'package.json'
          operations:
            - 'Add/update the `main`, `types`, `files`, `repository`, `author`, `license`, and `keywords` fields in `package.json`.'
            - 'Review all dependencies in `dependencies` and `devDependencies` to ensure they are correctly categorized and versions are appropriate for a public release.'
  conclusion: |
    Upon completion of this refactoring plan, the Recursa MCP Server will be transformed from a promising prototype into a publish-ready, production-grade tool. The unified build system will provide a frictionless onboarding experience for developers on any platform. The robust, DRY test suite will ensure long-term stability and make future contributions safer and easier to validate.

    Most importantly, the hardened security layer and atomic file operations will provide the data integrity and safety necessary for an agent that operates directly on a user's local file system. Combined with clear, consolidated documentation, these changes will establish a foundation of quality and trust, making the project attractive for adoption and community contribution.
  context_files:
    compact:
      - 'package.json'
      - 'src/lib/platform.ts'
      - 'tests/lib/test-harness.ts'
      - 'src/core/mem-api/file-ops.ts'
      - 'README.md'
    medium:
      - 'package.json'
      - 'src/lib/platform.ts'
      - 'scripts/install.js'
      - 'scripts/build.js'
      - 'tests/lib/test-harness.ts'
      - 'tests/integration/workflow.test.ts'
      - 'src/core/mem-api/file-ops.ts'
      - 'src/core/mem-api/secure-path.ts'
      - 'src/config.ts'
      - 'README.md'
    extended:
      - 'package.json'
      - 'src/lib/platform.ts'
      - 'scripts/install.js'
      - 'scripts/build.js'
      - 'tests/lib/test-harness.ts'
      - 'tests/integration/mem-api-file-ops.test.ts'
      - 'tests/integration/workflow.test.ts'
      - 'tests/e2e/agent-workflow.test.ts'
      - 'src/core/mem-api/file-ops.ts'
      - 'src/core/mem-api/secure-path.ts'
      - 'src/config.ts'
      - 'README.md'
      - 'docs/PLATFORM_SUPPORT.md'
      - 'docs/TROUBLESHOOTING.md'
      - 'INSTALL_TERMUX.md'
```
