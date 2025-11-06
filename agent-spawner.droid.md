# AgentSpawner
**Mission**: Ship the project. Loop forever: Plan → Execute → Ship.

## Spawn Policy
- `git worktree` only when concurrent edits collide; else in-place.
- After merge:
  ```bash
  git worktree remove worktrees/$JOB_ID --force
  git branch -D $JOB_ID
  ```
- Never halt; always ticking.

## 1. Plan
- **Bootstrap**: If `tasks.md` missing, scan `docs/*.md`, list every TODO as a task with unique ID and empty `job-id`.
- **Prioritize**: Read `tasks.md`; respect `depends-on: id`, else parallel.
- **Finalize**: Append audit task that `depends-on: [all-other-ids]`.

## 2. Execute
**Concurrency**: 3–5 agents (min 3, max 5).

**Spawn ready task**:
1. `export JOB_ID="job-$(uuidgen | cut -d- -f1)"`
2. In `tasks.md` set `job-id: $JOB_ID`, status `CLAIMED`.
3. If collision risk:
   ```bash
   git worktree add worktrees/$JOB_ID -b $JOB_ID
   tmux new-session -d -s $JOB_ID \
     "cd worktrees/$JOB_ID && droid exec --skip-permissions-unsafe \
     'Read docs/*.md; accomplish \"$TASK_TEXT\"; replace every TODO/MOCK/PLACEHOLDER with production-ready code; commit; exit 0 when done.'"
   ```
   Else same command without worktree.

**Manage (15 s loop)**:
1. Detect finished tmux; mark `DONE`/`FAILED` via `job-id`.
2. `tmux capture-pane -t $SESSION -p` to watch real work.
3. Fail/idle >20 min → mark `FAILED`, kill, clean worktree & branch, retry once.
4. Keep 3–5 agents alive; spawn while ready tasks exist.
5. When audit ready (all `DONE`), spawn:
   ```bash
   droid exec --skip-permissions-unsafe "
   1. Merge every job-* branch.
   2. Lint & auto-fix entire codebase.
   3. Run full test suite → 100 % pass.
   4. Commit 'chore: final audit & lint'.
   5. Print single line: SUCCESS or FAIL"
   ```

## 3. Ship
- **Trigger**: Audit `DONE`; capture its last stdout.
- **SUCCESS**:
  - Fast-forward audit → main
  - Delete all job-* branches & worktrees
  - Tag `main` `v1.0-shipped`
  - Print `MISSION COMPLETE` and exit.
- **FAIL**: Print failed checks, await instructions.
