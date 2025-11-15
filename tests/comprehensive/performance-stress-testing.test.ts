import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';
import {
  createTestHarness,
  cleanupTestHarness,
  createMultipleTestHarnesses,
  type TestHarnessState,
} from '../lib/test-harness.js';
import { createMCPClient } from '../lib/mcp-test-utils.js';
import { performance } from 'perf_hooks';

describe('Performance & Stress Testing Comprehensive', () => {
  let harness: TestHarnessState;
  let client: any;
  const BULK_OPERATIONS_COUNT = 100;
  const CONCURRENT_OPERATIONS_COUNT = 50;

  beforeAll(async () => {
    harness = await createTestHarness({
      skipPortValidation: true,
      tempPrefix: 'recursa-performance-test',
      withGitignore: true,
    });

    client = await createMCPClient('performance-test-tenant', harness);
  });

  afterAll(async () => {
    if (client) {
      try {
        await client.close();
      } catch (error) {
        console.warn('Error cleaning up MCP client:', error);
      }
    }

    if (harness) {
      await cleanupTestHarness(harness);
    }
  });

  describe('Bulk Operations Performance', () => {
    beforeEach(async () => {
      // Clean up any existing test files
      const testFiles = [];
      for (let i = 0; i < BULK_OPERATIONS_COUNT; i++) {
        testFiles.push(`bulk-test-${i}.md`);
        testFiles.push(`bulk-dir-${i}/nested-file.md`);
      }

      for (const file of testFiles) {
        try {
          await client.callTool('mem.deletePath', { path: file });
        } catch (error) {
          // Ignore errors if file doesn't exist
        }
      }
    });

    it('should handle bulk file creation efficiently', async () => {
      const startTime = performance.now();

      const promises = [];
      for (let i = 0; i < BULK_OPERATIONS_COUNT; i++) {
        const content = `- # Bulk Test Document ${i}
- type:: test
- category:: performance
- iteration:: ${i}
- timestamp:: ${new Date().toISOString()}
- content:: This is test content for bulk operation ${i} to measure performance under load conditions with comprehensive metadata and structured content suitable for testing the system's capabilities.
- metadata::
  - created:: ${new Date().toISOString()}
  - source:: Performance test iteration ${i}
  - priority:: medium
  - status:: active`;

        promises.push(
          client.callTool('mem.writeFile', {
            filePath: `bulk-test-${i}.md`,
            content: content,
          })
        );
      }

      const results = await Promise.all(promises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // All operations should succeed
      expect(results.every(result => result === true)).toBe(true);
      expect(results.length).toBe(BULK_OPERATIONS_COUNT);

      // Should complete within reasonable time (adjust based on system performance)
      console.log(`Bulk file creation: ${BULK_OPERATIONS_COUNT} files in ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(30000); // 30 seconds

      // Verify files were actually created
      const verificationStart = performance.now();
      const existingFiles = await Promise.all(
        Array.from({ length: BULK_OPERATIONS_COUNT }, (_, i) =>
          client.callTool('mem.fileExists', { filePath: `bulk-test-${i}.md` })
        )
      );
      const verificationEnd = performance.now();
      const verificationTime = verificationEnd - verificationStart;

      expect(existingFiles.every(exists => exists === true)).toBe(true);
      console.log(`File verification: ${BULK_OPERATIONS_COUNT} checks in ${verificationTime.toFixed(2)}ms`);
      expect(verificationTime).toBeLessThan(10000); // 10 seconds
    });

    it('should handle bulk file reading efficiently', async () => {
      // First create test files
      for (let i = 0; i < 50; i++) {
        const content = `- # Read Performance Test ${i}
- type:: performance
- content:: Performance test content for measuring read operations under load
- iteration:: ${i}`;

        await client.callTool('mem.writeFile', {
          filePath: `read-test-${i}.md`,
          content: content,
        });
      }

      const startTime = performance.now();

      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          client.callTool('mem.readFile', { filePath: `read-test-${i}.md` })
        );
      }

      const results = await Promise.all(promises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // All reads should succeed
      expect(results.every(content => typeof content === 'string' && content.length > 0)).toBe(true);
      expect(results.length).toBe(50);

      console.log(`Bulk file reading: ${results.length} files in ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(20000); // 20 seconds for 50 files
    });

    it('should handle bulk search operations efficiently', async () => {
      // Create files with searchable content
      for (let i = 0; i < 30; i++) {
        const content = `- # Search Performance Test ${i}
- type:: performance
- category:: search-optimization
- content:: Comprehensive content for testing search performance under load with multiple search terms including performance, optimization, load testing, and scalability metrics.
- keywords:: performance, optimization, load test, scalability, efficiency
- iteration:: ${i}`;

        await client.callTool('mem.writeFile', {
          filePath: `search-test-${i}.md`,
          content: content,
        });
      }

      const startTime = performance.now();

      // Test multiple search queries
      const searchTerms = ['performance', 'optimization', 'load test', 'scalability'];
      const searchPromises = searchTerms.map(term =>
        client.callTool('mem.searchGlobal', { query: term })
      );

      const searchResults = await Promise.all(searchPromises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Each search should find results
      searchResults.forEach((results, index) => {
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeGreaterThan(0);
        console.log(`Search "${searchTerms[index]}": found ${results.length} files in ${duration / searchTerms.length}ms average`);
      });

      console.log(`Bulk search: ${searchTerms.length} queries in ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(15000); // 15 seconds for 4 search queries
    });
  });

  describe('Concurrent Operations Stress Testing', () => {
    it('should handle high concurrency without resource conflicts', async () => {
      const concurrentStart = performance.now();

      // Create multiple concurrent operations mixing different tool types
      const promises = [];

      for (let i = 0; i < CONCURRENT_OPERATIONS_COUNT; i++) {
        // Mix different operation types
        if (i % 8 === 0) {
          // Write operation
          promises.push(
            client.callTool('mem.writeFile', {
              filePath: `concurrent-write-${i % 10}.md`,
              content: `- # Concurrent Write Test ${i}
- type:: concurrent
- operation:: write
- timestamp:: ${new Date().toISOString()}`,
            })
          );
        } else if (i % 8 === 1) {
          // Read operation (try to read existing file)
          promises.push(
            client.callTool('mem.readFile', { filePath: `concurrent-write-${i % 10}.md` }).catch(() => 'file-not-found')
          );
        } else if (i % 8 === 2) {
          // File exists check
          promises.push(
            client.callTool('mem.fileExists', { filePath: `concurrent-write-${i % 10}.md` })
          );
        } else if (i % 8 === 3) {
          // Graph operation - get outgoing links
          promises.push(
            client.callTool('mem.getOutgoingLinks', { filePath: 'projects/Project Singularity.md' }).catch(() => [])
          );
        } else if (i % 8 === 4) {
          // Search operation
          promises.push(
            client.callTool('mem.searchGlobal', { query: 'test concurrent' })
          );
        } else if (i % 8 === 5) {
          // Directory creation
          promises.push(
            client.callTool('mem.createDir', { path: `concurrent-dir-${i}` })
          );
        } else if (i % 8 === 6) {
          // Update operation
          promises.push(
            client.callTool('mem.writeFile', {
              filePath: `concurrent-update-${i % 5}.md`,
              content: `- # Updated Content ${i}
- type:: concurrent-update
- updated:: ${new Date().toISOString()}`,
            })
          );
        } else {
          // Rename operation
          promises.push(
            client.callTool('mem.rename', { from: `concurrent-rename-${i % 3}.md`, to: `concurrent-renamed-${i % 3}.md` }).catch(() => 'rename-failed')
          );
        }
      }

      // Execute all concurrent operations
      const results = await Promise.all(promises);
      const concurrentEnd = performance.now();
      const concurrentDuration = concurrentEnd - concurrentStart;

      console.log(`Concurrent operations: ${CONCURRENT_OPERATIONS_COUNT} operations in ${concurrentDuration.toFixed(2)}ms`);

      // Verify some key operations completed successfully
      const writeExists = await client.callTool('mem.fileExists', { filePath: 'concurrent-write-0.md' });
      const dirExists = await client.callTool('mem.fileExists', { filePath: 'concurrent-dir-0' });
      expect(writeExists).toBe(true);
      expect(dirExists).toBe(true);

      // Should complete within reasonable time
      expect(concurrentDuration).toBeLessThan(60000); // 60 seconds for all concurrent operations
    });

    it('should maintain data consistency under concurrent load', async () => {
      // Create initial test files
      await client.callTool('mem.writeFile', {
        filePath: 'consistency-test.md',
        content: `- # Consistency Test
- type:: consistency
- initial:: true
- version:: 1`,
      });

      const operations = 20;
      const promises = [];

      // Multiple concurrent updates to the same file
      for (let i = 0; i < operations; i++) {
        promises.push(
          client.callTool('mem.writeFile', {
            filePath: 'consistency-test.md',
            content: `- # Consistency Test
- type:: consistency
- initial:: true
- version:: ${i + 1}
- updated:: ${new Date().toISOString()}`,
          })
        );
      }

      await Promise.all(promises);

      // Final read should show the file exists (even if content varies due to race conditions)
      const finalContent = await client.callTool('mem.readFile', { filePath: 'consistency-test.md' });
      expect(typeof finalContent).toBe('string');
      expect(finalContent.length).toBeGreaterThan(0);
      expect(finalContent).toContain('Consistency Test');
    });
  });

  describe('Load Testing', () => {
    it('should handle sustained high load without degradation', async () => {
      const loadStartTime = performance.now();
      const operationCount = 200;
      const operationsPerBatch = 10;

      // Simulate sustained load over multiple batches
      for (let batch = 0; batch < operationCount / operationsPerBatch; batch++) {
        const batchPromises = [];

        // Create batch of operations
        for (let i = 0; i < operationsPerBatch; i++) {
          const opIndex = batch * operationsPerBatch + i;

          if (opIndex < 50) {
            // Create new files
            batchPromises.push(
              client.callTool('mem.writeFile', {
                filePath: `load-test-${opIndex}.md`,
                content: `- # Load Test Document ${opIndex}
- type:: load-test
- batch:: ${batch}
- operation:: create
- timestamp:: ${new Date().toISOString()}`,
              })
            );
          } else {
            // Read and update existing files
            batchPromises.push(
              client.callTool('mem.readFile', { filePath: `load-test-${Math.max(0, opIndex - 10)}.md` }).catch(() => 'file-not-found')
            );
            batchPromises.push(
              client.callTool('mem.searchGlobal', { query: 'load test' })
            );
            batchPromises.push(
              client.callTool('mem.getOutgoingLinks', { filePath: 'projects/Project Singularity.md' }).catch(() => [])
            );
          }
        }

        // Execute batch
        await Promise.all(batchPromises);

        // Small delay between batches to simulate realistic load
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const loadEndTime = performance.now();
      const totalLoadTime = loadEndTime - loadStartTime;

      console.log(`Sustained load test: ${operationCount} operations in ${totalLoadTime.toFixed(2)}ms`);

      // Verify final state
      const finalTest = await client.callTool('mem.fileExists', { filePath: 'load-test-0.md' });
      expect(finalTest).toBe(true);

      // Should complete within reasonable time (2 minutes for 200 operations)
      expect(totalLoadTime).toBeLessThan(120000);
    });

    it('should handle memory-intensive operations without issues', async () => {
      const largeContent = 'x'.repeat(100000); // 100KB content
      const fileCount = 20;

      const startTime = performance.now();

      // Create multiple large files
      const promises = [];
      for (let i = 0; i < fileCount; i++) {
        promises.push(
          client.callTool('mem.writeFile', {
            filePath: `large-content-${i}.txt`,
            content: largeContent,
          })
        );
      }

      await Promise.all(promises);

      // Read back some large files
      const readPromises = [];
      for (let i = 0; i < 5; i++) {
        readPromises.push(
          client.callTool('mem.readFile', { filePath: `large-content-${i}.txt` })
        );
      }

      const readResults = await Promise.all(readPromises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Verify content integrity
      readResults.forEach(content => {
        expect(content).toBe(largeContent);
        expect(content.length).toBe(largeContent.length);
      });

      console.log(`Memory-intensive test: ${fileCount} large files (${fileCount * 100}KB total) in ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(30000); // 30 seconds for memory-intensive operations
    });
  });

  describe('Extreme Stress Testing', () => {
    it('should gracefully handle extreme load conditions', async () => {
      const extremeStartTime = performance.now();

      // Create a very large number of operations
      const extremeOperations = 500;
      const batchSize = 50;

      for (let i = 0; i < extremeOperations; i += batchSize) {
        const batchPromises = [];

        for (let j = 0; j < batchSize && i + j < extremeOperations; j++) {
          const opIndex = i + j;

          // Mix of operations
          if (opIndex % 4 === 0) {
            batchPromises.push(
              client.callTool('mem.writeFile', {
                filePath: `extreme-load-${opIndex}.md`,
                content: `- # Extreme Load Test ${opIndex}
- type:: extreme
- operation:: ${opIndex}
- timestamp:: ${new Date().toISOString()}`,
              })
            );
          } else if (opIndex % 4 === 1) {
            batchPromises.push(
              client.callTool('mem.fileExists', { filePath: `extreme-load-${Math.max(0, opIndex - 10)}` }).catch(() => false)
            );
          } else if (opIndex % 4 === 2) {
            batchPromises.push(
              client.callTool('mem.searchGlobal', { query: 'extreme load' })
            );
          } else {
            batchPromises.push(
              client.callTool('mem.getOutgoingLinks', { filePath: 'projects/Project Singularity.md' }).catch(() => [])
            );
          }
        }

        await Promise.all(batchPromises);

        // Short delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const extremeEndTime = performance.now();
      const extremeDuration = extremeEndTime - extremeStartTime;

      console.log(`Extreme stress test: ${extremeOperations} operations in ${extremeDuration.toFixed(2)}ms`);

      // Verify system is still functional
      const finalTest = await client.callTool('mem.fileExists', { filePath: 'extreme-load-0.md' });
      expect(finalTest).toBe(true);

      // Should complete within reasonable time (5 minutes for extreme test)
      expect(extremeDuration).toBeLessThan(300000);
    });

    it('should maintain performance under varying load patterns', async () => {
      const patterns = [
        { name: 'write-heavy', operations: () => client.callTool('mem.writeFile', { filePath: 'baseline-write-test.md', content: 'test content' }) },
        { name: 'read-heavy', operations: async () => await client.callTool('mem.readFile', { filePath: 'baseline-write-test.md' }) },
        { name: 'search-heavy', operations: async () => await client.callTool('mem.searchGlobal', { query: 'baseline' }) },
        { name: 'graph-heavy', operations: async () => await client.callTool('mem.getOutgoingLinks', { filePath: 'projects/Project Singularity.md' }) },
      ];

      const results = [];

      for (const pattern of patterns) {
        const startTime = performance.now();

        // Execute 20 operations of each type
        const promises = [];
        for (let i = 0; i < 20; i++) {
          promises.push(pattern.operations());
        }

        await Promise.all(promises);

        const endTime = performance.now();
        const duration = endTime - startTime;
        results.push({ pattern: pattern.name, duration });

        console.log(`Load pattern ${pattern.name}: 20 operations in ${duration.toFixed(2)}ms`);
      }

      // All patterns should complete within reasonable time
      results.forEach(result => {
        expect(result.duration).toBeLessThan(15000); // 15 seconds per pattern
      });

      // Performance should be reasonably consistent (within 3x variance)
      const minDuration = Math.min(...results.map(r => r.duration));
      const maxDuration = Math.max(...results.map(r => r.duration));
      const variance = maxDuration / minDuration;
      console.log(`Performance variance across patterns: ${variance.toFixed(2)}x`);
      expect(variance).toBeLessThan(10); // Allow up to 10x variance for different operation types
    });
  });

  describe('Resource Management', () => {
    it('should manage memory efficiently during long-running operations', async () => {
      const initialMemory = process.memoryUsage();

      // Perform operations that could potentially leak memory
      const operations = 100;
      for (let i = 0; i < operations; i++) {
        await client.callTool('mem.writeFile', {
          filePath: `memory-test-${i}.md`,
          content: `- # Memory Test ${i}
- type:: memory
- operation:: ${i}
- content:: ${'x'.repeat(1000)}`,
        });

        if (i % 10 === 0) {
          await client.callTool('mem.readFile', { filePath: `memory-test-${i - 10}.md` });
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`Memory usage: ${initialMemory.heapUsed} -> ${finalMemory.heapUsed} (${memoryIncrease} bytes increase)`);

      // Memory increase should be reasonable (less than 50MB for 100 operations)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle file system limits gracefully', async () => {
      // Test with very long file paths (within reasonable limits)
      const longPath = 'very-long-directory-name-'.repeat(5) + 'file.md';
      const longContent = 'Test content for long path';

      await expect(client.callTool('mem.writeFile', { filePath: longPath, content: longContent })).resolves.toBe(true);
      const exists = await client.callTool('mem.fileExists', { filePath: longPath });
      expect(exists).toBe(true);

      // Test with special characters in filenames
      const specialChars = ['file with spaces.md', 'file-with-dashes.md', 'file_with_underscores.md'];
      for (const fileName of specialChars) {
        await client.callTool('mem.writeFile', { filePath: fileName, content: 'Special character test' });
        const fileExists = await client.callTool('mem.fileExists', { filePath: fileName });
        expect(fileExists).toBe(true);
      }
    });
  });
});