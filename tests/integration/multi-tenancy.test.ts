import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { handleUserQuery } from '../../src/core/loop';
import {
  createTestHarness,
  cleanupTestHarness,
  createMockLLMQueryWithSpy,
  type TestHarnessState,
} from '../lib/test-harness';
import path from 'path';
import { promises as fs } from 'fs';

describe('Multi-Tenancy Integration Tests', () => {
  let harness: TestHarnessState;

  beforeEach(async () => {
    harness = await createTestHarness();
  });

  afterEach(async () => {
    await cleanupTestHarness(harness);
  });

  it('should operate in single-tenant mode when no tenantId is provided', async () => {
    const mockQueryLLM = createMockLLMQueryWithSpy([
      `<think>Creating a file in the root.</think>
       <typescript>await mem.writeFile('root-file.txt', 'root content');</typescript>
       <reply>Done.</reply>`,
    ]);

    await handleUserQuery(
      'create root file',
      harness.mockConfig,
      'single-tenant-session',
      'run-1',
      mockQueryLLM,
      async () => {}
      // No tenantId provided
    );

    // Verify file exists directly in the knowledge graph root
    expect(await harness.mem.fileExists('root-file.txt')).toBe(true);
    const content = await harness.mem.readFile('root-file.txt');
    expect(content).toBe('root content');
  });

  it('should correctly isolate file operations between tenants', async () => {
    const tenant1 = 'tenant-alpha';
    const tenant2 = 'tenant-beta';

    // Action for Tenant 1
    const mockLLMForTenant1 = createMockLLMQueryWithSpy([
      `<think>Creating file for tenant 1.</think>
       <typescript>await mem.writeFile('file1.txt', 'alpha content');</typescript>
       <reply>Done for alpha.</reply>`,
    ]);

    await handleUserQuery(
      'create file 1',
      harness.mockConfig,
      'tenant1-session',
      'run-2',
      mockLLMForTenant1,
      async () => {},
      tenant1
    );

    // Action for Tenant 2
    const mockLLMForTenant2 = createMockLLMQueryWithSpy([
      `<think>Creating file for tenant 2.</think>
       <typescript>await mem.writeFile('file2.txt', 'beta content');</typescript>
       <reply>Done for beta.</reply>`,
    ]);

    await handleUserQuery(
      'create file 2',
      harness.mockConfig,
      'tenant2-session',
      'run-3',
      mockLLMForTenant2,
      async () => {},
      tenant2
    );

    // Assertions using the root-scoped harness.mem
    expect(await harness.mem.fileExists(`${tenant1}/file1.txt`)).toBe(true);
    expect(await harness.mem.readFile(`${tenant1}/file1.txt`)).toBe(
      'alpha content'
    );

    expect(await harness.mem.fileExists(`${tenant2}/file2.txt`)).toBe(true);
    expect(await harness.mem.readFile(`${tenant2}/file2.txt`)).toBe(
      'beta content'
    );

    // Cross-tenant assertions to ensure isolation
    expect(await harness.mem.fileExists(`${tenant1}/file2.txt`)).toBe(false);
    expect(await harness.mem.fileExists(`${tenant2}/file1.txt`)).toBe(false);
  });

  it('should sanitize malicious tenant IDs to prevent path traversal', async () => {
    const maliciousTenantId = '../malicious_tenant';
    const sanitizedTenantId = '___malicious_tenant'; // `sanitizeTenantId` replaces each . and / with _

    const mockQueryLLM = createMockLLMQueryWithSpy([
      `<think>Attempting traversal.</think>
       <typescript>await mem.writeFile('malicious-file.txt', 'malicious content');</typescript>
       <reply>Done.</reply>`,
    ]);

    await handleUserQuery(
      'create malicious file',
      harness.mockConfig,
      'malicious-session',
      'run-4',
      mockQueryLLM,
      async () => {},
      maliciousTenantId
    );

    // Verify the file was created in a SANITIZED directory, not outside the graph root.
    const expectedPath = `${sanitizedTenantId}/malicious-file.txt`;
    expect(await harness.mem.fileExists(expectedPath)).toBe(true);

    // Verify that NO directory was created outside the test harness tempDir
    const outsidePath = path.join(harness.tempDir, '..', 'malicious_tenant');
    await expect(fs.access(outsidePath)).rejects.toThrow('ENOENT');
  });

  it('should throw an error for an empty or invalid tenant ID', async () => {
    const mockQueryLLM = createMockLLMQueryWithSpy([]); // Won't be called

    await expect(
      handleUserQuery(
        'test empty tenant id',
        harness.mockConfig,
        'invalid-session',
        'run-5',
        mockQueryLLM,
        async () => {},
        '  ' // Whitespace-only tenantId
      )
    ).rejects.toThrow('Tenant ID cannot be empty.');
  });
});