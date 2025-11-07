import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import simpleGit from 'simple-git';
import { createMemAPI } from '../src/core/mem-api';
import type { AppConfig } from '../src/config';
import type { MemAPI } from '../src/types';
import type { ChatMessage } from '../src/types';

/**
 * TestHarness - Abstracts common test environment setup patterns
 * Follows the "No OOP, only HOFs" rule by using Higher-Order Functions
 */

export interface TestHarnessOptions {
  /** Custom git user name, defaults to 'Test User' */
  gitUserName?: string;
  /** Custom git user email, defaults to 'test@example.com' */
  gitEmail?: string;
  /** Custom temp directory prefix, defaults to 'recursa-test-' */
  tempPrefix?: string;
  /** Custom OpenRouter API key, defaults to 'test-key' */
  apiKey?: string;
  /** Custom LLM model, defaults to 'test-model' */
  model?: string;
  /** Whether to initialize with a .gitignore file, defaults to true */
  withGitignore?: boolean;
}

export interface TestHarnessState {
  readonly tempDir: string;
  readonly mockConfig: AppConfig;
  readonly mem: MemAPI;
  readonly git: simpleGit.SimpleGit;
}

export interface MockLLMResponse {
  response: string;
  shouldError?: boolean;
  errorMessage?: string;
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
    apiKey = 'test-key',
    model = 'test-model',
    withGitignore = true,
  } = options;

  // Create temporary directory
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), tempPrefix));

  // Create mock configuration
  const mockConfig: AppConfig = {
    knowledgeGraphPath: tempDir,
    openRouterApiKey: apiKey,
    llmModel: model,
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
 * Cleans up a test harness by removing the temporary directory
 * @param harness - The test harness state to clean up
 */
export const cleanupTestHarness = async (
  harness: TestHarnessState
): Promise<void> => {
  await fs.rm(harness.tempDir, { recursive: true, force: true });
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
 * Creates a mock LLM function that returns predefined responses
 * Follows the pattern used across multiple test files
 * @param responses - Array of predefined responses to return in sequence
 * @returns Mock LLM function
 */
export const createMockLLM = (
  responses: (string | MockLLMResponse)[]
) => {
  let callCount = 0;

  return async (
    _history: ChatMessage[],
    _config: AppConfig
  ): Promise<string> => {
    if (callCount >= responses.length) {
      throw new Error(
        `Mock LLM called more times than expected (${responses.length}).`
      );
    }

    const response = responses[callCount];
    callCount++;

    if (typeof response === 'string') {
      return response;
    }

    // Handle MockLLMResponse object
    if (response.shouldError) {
      throw new Error(response.errorMessage || 'Mock LLM error');
    }

    return response.response;
  };
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
  const promises = Object.entries(expectedFiles).map(async ([filePath, expectedContent]) => {
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
  });
  
  await Promise.all(promises);
};
