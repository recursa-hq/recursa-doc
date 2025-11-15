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
