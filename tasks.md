# Tasks

## Completed Tasks

### Task 1: Add Token & Credential Management to tools.md
**ID:** task-1
**Status:** DONE
**Description:** add token to tools
**Source:** flow.todo.md
**Depends-on:** None
**Priority:** High
**Completion:** Added Category 5: Token & Credential Management to tools.md with 6 token management methods (storeToken, getToken, updateToken, deleteToken, listTokens, rotateToken) including encrypted storage, metadata tracking, and security best practices documentation. Committed and pushed to branch job-8586a166.

---

## Implementation Tasks (Core System)

### Task 2: Implement Core Recursa Server
**ID:** task-2
**Status:** CLAIMED (job-93cf7fdc)
**Description:** Implement the core Recursa MCP server with TypeScript/Node.js
**Source:** readme.md Project Structure section
**Depends-on:** None
**Priority:** Critical
**Scope:**
- Initialize package.json with all required dependencies
- Create TypeScript configuration (tsconfig.json)
- Implement src/server.ts - Main application entry point
- Implement src/api/mcp.handler.ts - MCP protocol handler
- Implement src/core/Sandbox.ts - Secure sandbox for executing LLM code
- Implement src/core/MemAPI.ts - Implementation of mem object and all tools
- Implement src/services/Git.ts - Git operations wrapper
- Implement src/services/Llm.ts - LLM API communication (OpenRouter)
- Implement src/types/ - All TypeScript type definitions
- Create .env.example with all required configuration variables
- Ensure code follows rules.md (no OOP, use bun.sh, explicit typing, etc.)

### Task 3: Implement Complete mem API Tools
**ID:** task-3
**Status:** PENDING
**Description:** Implement all tools documented in tools.md
**Source:** tools.md
**Depends-on:** task-2
**Priority:** Critical
**Scope:**
- Category 1: Core File & Directory Operations (8 methods)
- Category 2: Git-Native Operations (4 methods)
- Category 3: Intelligent Graph & Semantic Operations (4 methods)
- Category 4: Utility & Diagnostics (2 methods)
- Category 5: Token & Credential Management (6 methods)
Total: 24 methods requiring full implementation

### Task 4: Create Comprehensive Test Suite
**ID:** task-4
**Status:** PENDING
**Description:** Create unit, integration, and e2e tests for all components
**Source:** rules.md (rule #4 & #5)
**Depends-on:** task-3
**Priority:** High
**Scope:**
- Follow [e2e|integration|unit]/[domain].test.ts naming convention
- Use Bun tests with real implementation (no mocks)
- Test all 24 mem API methods
- Test sandbox execution and security
- Test Git integration
- Test MCP protocol handling
- Achieve 100% pass rate

---

## Roadmap Implementation Tasks

### Task 5: Enhanced Graph Queries
**ID:** task-5
**Status:** PENDING
**Description:** Add powerful filtering and traversal operators to mem.queryGraph
**Source:** readme.md Roadmap
**Depends-on:** task-3
**Priority:** High
**Scope:**
- Add advanced query operators (AND, OR, NOT, regex matching)
- Support nested property queries
- Implement graph traversal operations
- Add context-aware search (backlinks, forward links)
- Update tools.md documentation with new operators

### Task 6: Build Visualizer Web UI
**ID:** task-6
**Status:** PENDING
**Description:** Create web UI to visualize agent actions and git log evolution
**Source:** readme.md Roadmap
**Depends-on:** task-2
**Priority:** Medium
**Scope:**
- Create simple web server for visualization
- Build UI components to display:
  - Agent's actions in real-time
  - Git history visualization
  - Knowledge graph structure
  - File relationships and links
- Integrate with Recursa server for live updates

### Task 7: Multi-modal Support
**ID:** task-7
**Status:** PENDING
**Description:** Allow agent to store and reference images and other file types
**Source:** readme.md Roadmap
**Depends-on:** task-3
**Priority:** Medium
**Scope:**
- Extend mem API to handle images, PDFs, audio, video
- Add image tagging and categorization
- Create image blocks in markdown (with proper links)
- Implement image metadata extraction
- Update tools.md with new multi-modal methods

### Task 8: Agent-to-Agent Collaboration
**ID:** task-8
**Status:** PENDING
**Description:** Enable two Recursa agents to collaborate via Git forks/PRs
**Source:** readme.md Roadmap
**Depends-on:** task-3
**Priority:** Medium
**Scope:**
- Implement Git fork functionality
- Create pull request workflow for agent collaboration
- Add merge conflict detection and resolution
- Implement agent communication protocol
- Add collaboration documentation

### Task 9: Expanded Tooling Integration
**ID:** task-9
**Status:** PENDING
**Description:** Integrate web search, terminal access, and other capabilities into mem object
**Source:** readme.md Roadmap
**Depends-on:** task-3
**Priority:** High
**Scope:**
- Add web search capabilities (mem.searchWeb)
- Add terminal/command execution (mem.executeCommand)
- Add HTTP request capabilities (mem.httpRequest)
- Add calendar/todo integration (mem.addEvent, mem.getEvents)
- Add email/communication tools (mem.sendEmail, mem.listEmails)
- Update tools.md with all new methods

---

## Documentation & Finalization Tasks

### Task 10: Complete API Documentation
**ID:** task-10
**Status:** PENDING
**Description:** Ensure all public APIs are fully documented
**Source:** readme.md Contributing section
**Depends-on:** task-3
**Priority:** High
**Scope:**
- Verify tools.md is complete and accurate
- Add code comments to all public methods
- Create API reference documentation
- Add usage examples for complex operations
- Document security best practices

### Task 11: Security Audit & Hardening
**ID:** task-11
**Status:** PENDING
**Description:** Perform security audit and implement hardening measures
**Source:** General security best practices
**Depends-on:** task-3
**Priority:** Critical
**Scope:**
- Audit sandbox security (prevent code injection, file system access)
- Verify token encryption implementation
- Add input validation to all mem API methods
- Implement rate limiting
- Add security headers and CORS configuration
- Document security model

### Task 12: Performance Optimization
**ID:** task-12
**Status:** PENDING
**Description:** Optimize performance for large knowledge graphs
**Source:** Performance requirements
**Depends-on:** task-3
**Priority:** Medium
**Scope:**
- Implement file caching mechanisms
- Optimize Git operations for large repos
- Add pagination to list operations
- Implement incremental indexing
- Add performance monitoring

### Task 13: Final Integration Testing
**ID:** task-13
**Status:** PENDING
**Description:** Run full integration tests with real Logseq/Obsidian graphs
**Source:** Quality assurance
**Depends-on:** task-4, task-11
**Priority:** Critical
**Scope:**
- Test with actual Logseq graph
- Test with Obsidian vault
- Verify MCP protocol compatibility
- Test end-to-end workflows from readme.md examples
- Performance testing with large datasets

### Task 14: Create Deployment Package
**ID:** task-14
**Status:** PENDING
**Description:** Create distribution package and installation documentation
**Source:** readme.md Getting Started section
**Depends-on:** task-13
**Priority:** High
**Scope:**
- Create npm package structure
- Add build scripts
- Create Docker container (optional)
- Verify installation instructions work
- Create troubleshooting guide

---

## Task Dependencies Summary

```
task-1 (DONE) ← Token management added to tools.md

Core Implementation Phase:
task-2 ← Server implementation (depends on nothing)
  ↓
task-3 ← mem API implementation (depends on task-2)
  ↓
task-4 ← Test suite (depends on task-3)

Roadmap Implementation Phase (can run in parallel after task-3):
task-5 ← Enhanced Graph Queries (depends on task-3)
task-6 ← Visualizer (depends on task-2)
task-7 ← Multi-modal Support (depends on task-3)
task-8 ← Agent-to-Agent Collaboration (depends on task-3)
task-9 ← Expanded Tooling (depends on task-3)

Finalization Phase:
task-10 ← Documentation (depends on task-3)
task-11 ← Security Audit (depends on task-3)
task-12 ← Performance Optimization (depends on task-3)
task-13 ← Integration Testing (depends on task-4, task-11)
task-14 ← Deployment Package (depends on task-13)
```

## Execution Strategy

**Phase 1: Core Foundation (Tasks 2-4)**
- Must be completed before any other work
- These are the critical path items

**Phase 2: Roadmap Features (Tasks 5-9)**
- Can be executed in parallel after task-3
- Order can be adjusted based on priority/interest

**Phase 3: Quality & Shipment (Tasks 10-14)**
- Must be completed before final audit
- Task 13 is the final gate before shipment

**Total Estimated Tasks: 14**
**Completed: 1**
**Remaining: 13**
