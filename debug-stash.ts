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