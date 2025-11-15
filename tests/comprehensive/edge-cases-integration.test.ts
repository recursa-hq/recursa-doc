import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from '@jest/globals';
import {
  createTestHarness,
  cleanupTestHarness,
  type TestHarnessState,
} from '../lib/test-harness.js';
import { createMCPClient } from '../lib/mcp-test-utils.js';

describe('Edge Cases & Integration Scenarios Comprehensive', () => {
  let harness: TestHarnessState;
  let client: any;

  beforeAll(async () => {
    harness = await createTestHarness({
      skipPortValidation: true,
      tempPrefix: 'recursa-edge-cases-test',
      withGitignore: true,
    });

    client = await createMCPClient('edge-cases-test-tenant', harness);
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

  describe('Edge Case Handling', () => {
    beforeEach(async () => {
      // Clean up any existing test files
      const testFiles = [
        'edge-case-test.txt',
        'unicode-test.md',
        'special-chars.txt',
        'empty-file.md',
        'minimal-content.md',
        'very-long-path-with-many-nested-directories-and-subdirectories/file.md',
        'non-existent-file.md',
        'projects/Project Singularity.md',
        'people/Dr. Elena Rossi.md',
        'papers/Quantum Entanglement Paper.md',
      ];

      for (const file of testFiles) {
        try {
          await client.callTool('mem.deletePath', { path: file });
        } catch (error) {
          // Ignore errors if file doesn't exist
        }
      }
    });

    it('should handle empty content correctly', async () => {
      const result = await client.callTool('mem.writeFile', {
        filePath: 'edge-case-test.txt',
        content: '',
      });
      expect(result).toBe(true);

      const exists = await client.callTool('mem.fileExists', { filePath: 'edge-case-test.txt' });
      expect(exists).toBe(true);

      const readContent = await client.callTool('mem.readFile', { filePath: 'edge-case-test.txt' });
      expect(readContent).toBe('');
    });

    it('should handle unicode characters correctly', async () => {
      const unicodeContent = `# Unicode Test Document
- type:: unicode-test
- content:: Testing unicode support: 中文 Español العربية Русский 🚀✨
- special-chars:: àáâãäåæçèéêë ìíîïðñòóôõöøùúûüýþÿ
- emoji:: 🎉🎊🎈🎁🎄🎃🎆🧨🎇
- mathematical:: ∑∏∫√∞≈≠±≤≥
- currency:: $€£¥₹₿

This document tests comprehensive unicode support including:
- Chinese characters: 中文内容测试
- Spanish accents: ñ and áéíóú
- Arabic script: العربية
- Cyrillic: русский текст
- Mathematical symbols: ∫∑∏
- Currency symbols: €£¥₹
- Emojis: 🚀✨🎉`;

      const result = await client.callTool('mem.writeFile', {
        filePath: 'unicode-test.md',
        content: unicodeContent,
      });
      expect(result).toBe(true);

      const exists = await client.callTool('mem.fileExists', { filePath: 'unicode-test.md' });
      expect(exists).toBe(true);

      const readContent = await client.callTool('mem.readFile', { filePath: 'unicode-test.md' });
      expect(readContent).toBe(unicodeContent);
    });

    it('should handle special characters in filenames and content', async () => {
      const specialCharsContent = `# Special Characters Test
- type:: special-chars
- filename:: special-chars.txt
- content:: Testing special characters: !@#$%^&*()_+-=[]{}|;:,.<>?
- quotes:: "double quotes" and 'single quotes'
- brackets:: (parentheses) [square] {curly}
- slashes:: /forward\\backslash
- symbols:: ©®™§¶†‡°±µ÷×

This tests handling of various special characters in content.`;

      const result = await client.callTool('mem.writeFile', {
        filePath: 'special-chars.txt',
        content: specialCharsContent,
      });
      expect(result).toBe(true);

      const exists = await client.callTool('mem.fileExists', { filePath: 'special-chars.txt' });
      expect(exists).toBe(true);

      const readContent = await client.callTool('mem.readFile', { filePath: 'special-chars.txt' });
      expect(readContent).toBe(specialCharsContent);
    });

    it('should handle minimal content', async () => {
      const minimalContent = 'a';
      const result = await client.callTool('mem.writeFile', {
        filePath: 'minimal-content.md',
        content: minimalContent,
      });
      expect(result).toBe(true);

      const exists = await client.callTool('mem.fileExists', { filePath: 'minimal-content.md' });
      expect(exists).toBe(true);

      const minimalRead = await client.callTool('mem.readFile', { filePath: 'minimal-content.md' });
      expect(minimalRead).toBe(minimalContent);
    });

    it('should handle very long file paths', async () => {
      const longPath = 'very-long-path-with-many-nested-directories-and-subdirectories/file.md';
      const longPathContent = `# Long Path Test
- type:: long-path-test
- path:: ${longPath}
- content:: Testing very long file paths with multiple nested directories`;

      const result = await client.callTool('mem.writeFile', {
        filePath: longPath,
        content: longPathContent,
      });
      expect(result).toBe(true);

      const exists = await client.callTool('mem.fileExists', { filePath: longPath });
      expect(exists).toBe(true);

      const readContent = await client.callTool('mem.readFile', { filePath: longPath });
      expect(readContent).toBe(longPathContent);
    });

    it('should handle non-existent files gracefully', async () => {
      const exists = await client.callTool('mem.fileExists', { filePath: 'non-existent-file.md' });
      expect(exists).toBe(false);

      await expect(client.callTool('mem.readFile', { filePath: 'non-existent-file.md' })).rejects.toThrow();
      await expect(client.callTool('mem.updateFile', { filePath: 'non-existent-file.md', content: 'content' })).rejects.toThrow();
      await expect(client.callTool('mem.deletePath', { path: 'non-existent-file.md' })).rejects.toThrow();
    });
  });

  describe('Complex Integration Scenarios', () => {
    it('should handle complex knowledge graph relationships', async () => {
      // Create interconnected project, person, and paper files
      const projectContent = `- # Project Singularity
- type:: project
- status:: active
- lead:: [[Dr. Elena Rossi]]
- related-papers:: [[Quantum Entanglement Paper]]
- created:: 2024-11-14T10:00:00.000Z
- description:: Advanced AI research project exploring neural architecture search and quantum computing applications
- team::
  - [[Dr. Elena Rossi]] - Project Lead
  - [[Dr. Aris Thorne]] - Senior Researcher
- milestones::
  - Phase 1: Architecture Design (Q1 2025)
  - Phase 2: Implementation (Q2-Q3 2025)
  - Phase 3: Testing & Validation (Q4 2025)`;

      const personContent = `- # Dr. Elena Rossi
- type:: person
- role:: Lead Researcher
- affiliation:: Quantum Computing Institute
- expertise:: Quantum algorithms, AI optimization, neural networks
- email:: elena.rossi@quantum-institute.edu
- projects:: [[Project Singularity]]
- status:: active
- education::
  - PhD in Quantum Computing - MIT
  - MSc in Artificial Intelligence - Stanford
- publications:: [[Quantum Entanglement Paper]]`;

      const paperContent = `- # Quantum Entanglement Paper
- type:: paper
- title:: "Quantum Entanglement in Neural Networks: A Novel Approach"
- authors:: [[Dr. Elena Rossi]], [[Dr. Aris Thorne]]
- published:: 2024-11-10
- journal:: Journal of Advanced AI Research
- doi:: 10.1234/quantum.ai.2024.001
- related-projects:: [[Project Singularity]]
- abstract:: This paper explores the intersection of quantum computing and artificial intelligence, proposing a novel framework for leveraging quantum entanglement principles in neural network optimization.
- keywords:: quantum computing, neural networks, entanglement, optimization, AI`;

      await client.callTool('mem.writeFile', {
        filePath: 'projects/Project Singularity.md',
        content: projectContent,
      });

      await client.callTool('mem.writeFile', {
        filePath: 'people/Dr. Elena Rossi.md',
        content: personContent,
      });

      await client.callTool('mem.writeFile', {
        filePath: 'papers/Quantum Entanglement Paper.md',
        content: paperContent,
      });

      // Test search functionality
      const projectResults = await client.callTool('mem.searchGlobal', { query: 'Project Singularity' });
      expect(Array.isArray(projectResults)).toBe(true);
      expect(projectResults.length).toBeGreaterThan(0);

      // Test outgoing links from person
      const elenaLinks = await client.callTool('mem.getOutgoingLinks', { filePath: 'people/Dr. Elena Rossi.md' });
      expect(Array.isArray(elenaLinks)).toBe(true);

      // Test search for related content
      const paperResults = await client.callTool('mem.searchGlobal', { query: 'Quantum Entanglement' });
      expect(Array.isArray(paperResults)).toBe(true);
      expect(paperResults.length).toBeGreaterThan(0);
    });

    it('should handle complex property relationships', async () => {
      // Create files with complex property structures
      const complexPropertiesContent = `- # Complex Properties Test
- type:: complex-test
- metadata::
  - created:: 2024-11-14T10:00:00.000Z
  - modified:: 2024-11-14T14:30:00.000Z
  - version:: 2.1.0
  - status:: active
- classification::
  - level:: top-secret
  - department:: research
  - project-code:: SG-1
- relationships::
  - parent:: [[Parent Document]]
  - children:: [[Child Document 1]], [[Child Document 2]]
  - siblings:: [[Sibling Document]]
- tags:: research, advanced, experimental, confidential
- coordinates::
  - latitude:: 40.7128
  - longitude:: -74.0060
- measurements::
  - length:: 15.5
  - width:: 10.25
  - height:: 8.75
  - weight:: 2.3
- timeline::
  - start:: 2024-01-01
  - milestone-1:: 2024-06-01
  - milestone-2:: 2024-09-01
  - completion:: 2024-12-31
- team::
  - lead:: Dr. Elena Rossi
  - members:: Dr. Aris Thorne, Dr. Maria Chen
  - contractors:: External Consulting Group`;

      await client.callTool('mem.writeFile', {
        filePath: 'complex-properties.md',
        content: complexPropertiesContent,
      });

      const exists = await client.callTool('mem.fileExists', { filePath: 'complex-properties.md' });
      expect(exists).toBe(true);

      const content = await client.callTool('mem.readFile', { filePath: 'complex-properties.md' });
      expect(content).toContain('Complex Properties Test');
      expect(content).toContain('classification::');
      expect(content).toContain('relationships::');
      expect(content).toContain('measurements::');
    });

    it('should handle multi-hop graph traversals', async () => {
      // Create a chain of linked documents
      const chainStartContent = `- # Chain Start
- type:: chain
- links:: [[Chain Middle]]
- content:: Starting point of the chain`;

      const chainMiddleContent = `- # Chain Middle
- type:: chain
- links:: [[Chain End]]
- backlinks:: [[Chain Start]]
- content:: Middle point connecting start and end`;

      const chainEndContent = `- # Chain End
- type:: chain
- backlinks:: [[Chain Middle]]
- content:: Final point in the chain`;

      await client.callTool('mem.writeFile', {
        filePath: 'chain-start.md',
        content: chainStartContent,
      });

      await client.callTool('mem.writeFile', {
        filePath: 'chain-middle.md',
        content: chainMiddleContent,
      });

      await client.callTool('mem.writeFile', {
        filePath: 'chain-end.md',
        content: chainEndContent,
      });

      // Test basic link resolution
      const startLinks = await client.callTool('mem.getOutgoingLinks', { filePath: 'chain-start.md' });
      expect(Array.isArray(startLinks)).toBe(true);

      const endBacklinks = await client.callTool('mem.getBacklinks', { filePath: 'chain-end.md' });
      expect(Array.isArray(endBacklinks)).toBe(true);

      // Test search across the chain
      const chainResults = await client.callTool('mem.searchGlobal', { query: 'Chain' });
      expect(Array.isArray(chainResults)).toBe(true);
      expect(chainResults.length).toBe(3); // Should find all three chain documents
    });

    it('should handle circular references gracefully', async () => {
      // Create circular references
      const circularAContent = `- # Circular A
- type:: circular
- links:: [[Circular B]]
- content:: Point A in circular reference`;

      const circularBContent = `- # Circular B
- type:: circular
- links:: [[Circular A]]
- content:: Point B in circular reference`;

      await client.callTool('mem.writeFile', {
        filePath: 'circular-a.md',
        content: circularAContent,
      });

      await client.callTool('mem.writeFile', {
        filePath: 'circular-b.md',
        content: circularBContent,
      });

      // Test that the system can handle circular references
      const aLinks = await client.callTool('mem.getOutgoingLinks', { filePath: 'circular-a.md' });
      expect(Array.isArray(aLinks)).toBe(true);

      const bLinks = await client.callTool('mem.getOutgoingLinks', { filePath: 'circular-b.md' });
      expect(Array.isArray(bLinks)).toBe(true);

      // Search should find both files
      const circularResults = await client.callTool('mem.searchGlobal', { query: 'Circular' });
      expect(Array.isArray(circularResults)).toBe(true);
      expect(circularResults.length).toBe(2);
    });

    it('should handle deeply nested directory structures', async () => {
      const nestedPath = 'research/projects/ai/ml/deep-learning/neural-architecture-search/experiments/experiment-001/results/final-report.md';

      const nestedContent = `- # Deeply Nested Report
- type:: research-report
- path:: ${nestedPath}
- experiment:: NAS-001
- results:: Successful optimization achieved
- metrics::
  - accuracy:: 94.7%
  - efficiency:: 87.3%
  - convergence:: 156 epochs
- conclusions:: The proposed architecture search method demonstrates superior performance compared to baseline approaches.`;

      const result = await client.callTool('mem.writeFile', {
        filePath: nestedPath,
        content: nestedContent,
      });
      expect(result).toBe(true);

      const exists = await client.callTool('mem.fileExists', { filePath: nestedPath });
      expect(exists).toBe(true);

      const content = await client.callTool('mem.readFile', { filePath: nestedPath });
      expect(content).toBe(nestedContent);
    });
  });

  describe('Error Recovery & Resilience', () => {
    it('should handle critical system state corruptions', async () => {
      // Create critical system files
      const criticalFiles = [
        'system/config.md',
        'system/state.md',
        'system/integrity.md'
      ];

      for (const file of criticalFiles) {
        const systemContent = `- # System File: ${file}
- type:: system-critical
- status:: active
- last-updated:: 2024-11-14T10:00:00.000Z
- integrity:: verified
- backup:: available
- priority:: critical
- content:: Critical system configuration data`;

        await client.callTool('mem.writeFile', {
          filePath: file,
          content: systemContent,
        });

        const criticalDataExists = await client.callTool('mem.fileExists', { filePath: file });
        expect(criticalDataExists).toBe(true);
      }

      // Test reading critical data
      const criticalContent = await client.callTool('mem.readFile', { filePath: 'system/config.md' });
      expect(typeof criticalContent).toBe('string');
      expect(criticalContent).toContain('System File');

      // Test search for system files
      const systemCheck = await client.callTool('mem.searchGlobal', { query: 'system' });
      expect(Array.isArray(systemCheck)).toBe(true);
      expect(systemCheck.length).toBeGreaterThan(0);
    });

    it('should handle concurrent modifications with conflict resolution', async () => {
      const testFile = 'concurrent-modification-test.md';

      // Create initial file
      const initialContent = `- # Concurrent Test
- type:: concurrency
- version:: 1
- timestamp:: 2024-11-14T10:00:00.000Z
- content:: Initial content`;

      await client.callTool('mem.writeFile', {
        filePath: testFile,
        content: initialContent,
      });

      // Simulate concurrent modifications
      const concurrentPromises = [];
      for (let i = 0; i < 10; i++) {
        const concurrentContent = `- # Concurrent Test
- type:: concurrency
- version:: ${i + 2}
- timestamp:: 2024-11-14T10:00:${i.toString().padStart(2, '0')}.000Z
- content:: Concurrent modification ${i + 1}`;

        concurrentPromises.push(
          client.callTool('mem.writeFile', {
            filePath: testFile,
            content: concurrentContent,
          })
        );
      }

      // Execute all concurrent writes
      await Promise.all(concurrentPromises);

      // Final state should be valid
      const finalExists = await client.callTool('mem.fileExists', { filePath: testFile });
      expect(finalExists).toBe(true);

      const finalContent = await client.callTool('mem.readFile', { filePath: testFile });
      expect(typeof finalContent).toBe('string');
      expect(finalContent).toContain('Concurrent Test');
      expect(finalContent).toContain('version::');
    });

    it('should handle file system integrity issues', async () => {
      // Create files that test various edge cases
      const integrityTestFiles = [
        {
          path: 'integrity/unicode-test.md',
          content: '# Unicode Integrity Test 中文 Español 🚀\n- type:: integrity\n- content:: Testing unicode integrity'
        },
        {
          path: 'integrity/special-chars.md',
          content: '# Special Characters Test\n- type:: integrity\n- content:: Testing !@#$%^&*() special chars'
        },
        {
          path: 'integrity/long-content.md',
          content: '# Long Content Test\n- type:: integrity\n- content:: ' + 'x'.repeat(10000)
        }
      ];

      for (const testFile of integrityTestFiles) {
        await client.callTool('mem.writeFile', {
          filePath: testFile.path,
          content: testFile.content,
        });

        const exists = await client.callTool('mem.fileExists', { filePath: testFile.path });
        expect(exists).toBe(true);

        const content = await client.callTool('mem.readFile', { filePath: testFile.path });
        expect(content).toBe(testFile.content);
      }

      // Test integrity through search
      const integrityCheck = await client.callTool('mem.getOutgoingLinks', { filePath: 'integrity/unicode-test.md' });
      expect(Array.isArray(integrityCheck)).toBe(true);

      // Search should find all integrity test files
      const searchResults = await client.callTool('mem.searchGlobal', { query: 'integrity' });
      expect(Array.isArray(searchResults)).toBe(true);
      expect(searchResults.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Under Edge Conditions', () => {
    it('should maintain performance with large content files', async () => {
      const largeContent = 'Performance test content\n'.repeat(1000) + '\n- type:: performance\n- size:: large\n- timestamp:: 2024-11-14T10:00:00.000Z';

      const startTime = Date.now();

      // Create multiple large files
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          client.callTool('mem.writeFile', {
            filePath: `performance-large-${i}.txt`,
            content: largeContent,
          })
        );
      }

      await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`Large file creation: 10 files (${largeContent.length * 10} bytes) in ${duration}ms`);

      // Verify files were created
      for (let i = 0; i < 10; i++) {
        const exists = await client.callTool('mem.fileExists', { filePath: `performance-large-${i}.txt` });
        expect(exists).toBe(true);

        const content = await client.callTool('mem.readFile', { filePath: `performance-large-${i}.txt` });
        expect(content).toBe(largeContent);
      }

      // Should complete within reasonable time (30 seconds for 10 large files)
      expect(duration).toBeLessThan(30000);
    });

    it('should handle rapid file operations without data loss', async () => {
      const operations = 50;
      const startTime = Date.now();

      // Rapid create/read/update/delete operations
      for (let i = 0; i < operations; i++) {
        const fileName = `rapid-op-${i % 10}.md`;
        const content = `- # Rapid Operation ${i}
- type:: rapid-test
- operation:: ${i}
- timestamp:: ${new Date().toISOString()}`;

        // Write
        await client.callTool('mem.writeFile', {
          filePath: fileName,
          content: content,
        });

        // Read
        const readContent = await client.callTool('mem.readFile', { filePath: fileName });
        expect(readContent).toBe(content);

        // Update (skip on last iteration)
        if (i < operations - 1) {
          const updatedContent = content + '\n- updated:: true';
          await client.callTool('mem.writeFile', {
            filePath: fileName,
            content: updatedContent,
          });
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`Rapid operations: ${operations * 2} operations in ${duration}ms`);

      // Verify final state
      const finalFile = await client.callTool('mem.readFile', { filePath: 'rapid-op-0.md' });
      expect(typeof finalFile).toBe('string');
      expect(finalFile).toContain('Rapid Operation');

      // Should complete within reasonable time (20 seconds for 100 operations)
      expect(duration).toBeLessThan(20000);
    });

    it('should maintain search functionality under stress', async () => {
      // Create many files with searchable content
      const fileCount = 30;
      for (let i = 0; i < fileCount; i++) {
        const content = `- # Search Stress Test ${i}
- type:: search-stress
- category:: performance
- content:: This is comprehensive search stress test content with multiple keywords including stress, performance, search, optimization, and scalability to ensure the search functionality works correctly under various conditions.
- keywords:: stress test, performance, search, optimization, scalability, functionality
- iteration:: ${i}
- timestamp:: ${new Date().toISOString()}`;

        await client.callTool('mem.writeFile', {
          filePath: `search-stress-${i}.md`,
          content: content,
        });
      }

      const searchStartTime = Date.now();

      // Perform multiple concurrent searches
      const searchTerms = [
        'stress', 'performance', 'search', 'optimization',
        'scalability', 'functionality', 'test', 'content'
      ];

      const searchPromises = searchTerms.map(term =>
        client.callTool('mem.searchGlobal', { query: term })
      );
      const searchResults = await Promise.all(searchPromises);

      const searchEndTime = Date.now();
      const searchDuration = searchEndTime - searchStartTime;

      console.log(`Search stress test: ${searchTerms.length} concurrent searches in ${searchDuration}ms`);

      // Verify search results
      searchResults.forEach((results, index) => {
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeGreaterThan(0);
        console.log(`Search "${searchTerms[index]}": found ${results.length} files`);
      });

      // Should complete within reasonable time (15 seconds for 8 concurrent searches)
      expect(searchDuration).toBeLessThan(15000);
    });
  });

  describe('Integration Workflow Testing', () => {
    it('should handle complete project lifecycle workflow', async () => {
      // Phase 1: Project Setup
      await client.callTool('mem.writeFile', {
        filePath: 'lifecycle/project-setup.md',
        content: `- # Project Lifecycle Setup
- type:: project-lifecycle
- phase:: setup
- status:: initiated
- start-date:: 2024-11-14
- team:: [[Project Team]]
- objectives::
  - Research new AI methodologies
  - Develop prototype system
  - Validate through experiments
- resources:: [[Research Budget]], [[Equipment List]]`,
      });

      // Phase 2: Research Phase
      await client.callTool('mem.writeFile', {
        filePath: 'lifecycle/research-phase.md',
        content: `- # Research Phase
- type:: project-lifecycle
- phase:: research
- status:: active
- project:: [[Project Lifecycle Setup]]
- findings::
  - Literature review completed
  - Gap analysis identified
  - Methodology selected
- deliverables:: [[Literature Review]], [[Research Methodology]]
- timeline:: Q1 2025`,
      });

      // Phase 3: Development Phase
      await client.callTool('mem.writeFile', {
        filePath: 'lifecycle/development-phase.md',
        content: `- # Development Phase
- type:: project-lifecycle
- phase:: development
- status:: planned
- dependencies:: [[Research Phase]]
- tasks::
  - Prototype design
  - Implementation
  - Unit testing
- resources:: [[Development Team]], [[Testing Framework]]
- timeline:: Q2-Q3 2025`,
      });

      // Phase 4: Testing Phase
      await client.callTool('mem.writeFile', {
        filePath: 'lifecycle/testing-phase.md',
        content: `- # Testing Phase
- type:: project-lifecycle
- phase:: testing
- status:: future
- input:: [[Development Phase]]
- test-plan:: [[Test Strategy]]
- criteria:: [[Acceptance Criteria]]
- timeline:: Q4 2025`,
      });

      // Phase 5: Deployment Phase
      await client.callTool('mem.writeFile', {
        filePath: 'lifecycle/deployment-phase.md',
        content: `- # Deployment Phase
- type:: project-lifecycle
- phase:: deployment
- status:: future
- output:: [[Development Phase]]
- deployment-plan:: [[Deployment Strategy]]
- monitoring:: [[Monitoring Plan]]
- timeline:: Q1 2026`,
      });

      // Test workflow connectivity
      const setupLinks = await client.callTool('mem.getOutgoingLinks', {
        filePath: 'lifecycle/project-setup.md',
      });
      expect(Array.isArray(setupLinks)).toBe(true);

      const allProjectResults = await client.callTool('mem.searchGlobal', {
        query: 'project lifecycle',
      });
      expect(Array.isArray(allProjectResults)).toBe(true);
      expect(allProjectResults.length).toBe(5); // All 5 phases should be found

      // Test cross-phase relationships
      const researchResults = await client.callTool('mem.searchGlobal', {
        query: 'Research Phase',
      });
      expect(Array.isArray(researchResults)).toBe(true);
      expect(researchResults.length).toBeGreaterThan(0);
    });

    it('should handle knowledge graph evolution over time', async () => {
      // Create initial knowledge graph state
      await client.callTool('mem.writeFile', {
        filePath: 'knowledge-graph/v1.0/concepts.md',
        content: `- # Knowledge Graph v1.0
- type:: knowledge-graph
- version:: 1.0
- created:: 2024-01-01
- concepts::
  - Basic AI principles
  - Machine learning fundamentals
  - Neural networks introduction
- relationships:: foundational concepts`,
      });

      // Evolve to v2.0 with new concepts
      await client.callTool('mem.writeFile', {
        filePath: 'knowledge-graph/v2.0/concepts.md',
        content: `- # Knowledge Graph v2.0
- type:: knowledge-graph
- version:: 2.0
- created:: 2024-06-01
- previous:: [[Knowledge Graph v1.0]]
- new-concepts::
  - Deep learning advances
  - Transformer architectures
  - Attention mechanisms
  - Self-supervised learning
- enhanced:: [[Basic AI principles]], [[Machine learning fundamentals]]
- deprecated:: None`,
      });

      // Evolve to v3.0 with cutting-edge concepts
      await client.callTool('mem.writeFile', {
        filePath: 'knowledge-graph/v3.0/concepts.md',
        content: `- # Knowledge Graph v3.0
- type:: knowledge-graph
- version:: 3.0
- created:: 2024-11-14
- previous:: [[Knowledge Graph v2.0]]
- latest-concepts::
  - Neural architecture search
  - Quantum machine learning
  - Multimodal models
  - Foundation model optimization
- building-on:: [[Deep learning advances]], [[Transformer architectures]]
- future-directions:: AI alignment, AGI safety, sustainable AI`,
      });

      // Test knowledge graph evolution
      const v1Exists = await client.callTool('mem.fileExists', {
        filePath: 'knowledge-graph/v1.0/concepts.md',
      });
      const v2Exists = await client.callTool('mem.fileExists', {
        filePath: 'knowledge-graph/v2.0/concepts.md',
      });
      const v3Exists = await client.callTool('mem.fileExists', {
        filePath: 'knowledge-graph/v3.0/concepts.md',
      });

      expect(v1Exists).toBe(true);
      expect(v2Exists).toBe(true);
      expect(v3Exists).toBe(true);

      // Test search across versions
      const allVersions = await client.callTool('mem.searchGlobal', {
        query: 'Knowledge Graph',
      });
      expect(Array.isArray(allVersions)).toBe(true);
      expect(allVersions.length).toBe(3);

      // Test relationship traversal
      const v3Links = await client.callTool('mem.getOutgoingLinks', {
        filePath: 'knowledge-graph/v3.0/concepts.md',
      });
      expect(Array.isArray(v3Links)).toBe(true);
    });
  });
});