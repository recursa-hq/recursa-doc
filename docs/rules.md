codebase compliance rules;

1. No OOP, only HOFs
2. Use bun.sh and e2e type safe TypeScript
3. No unknown or any type
4. [e2e|integration|unit]/[domain].test.ts files & dirs
5. Bun tests, real implementation (no mocks), isolated tests
6. **DRY Principle**: Sub-agents MUST inspect and build upon existing work in other worktrees before implementing new features. Always review what other agents have implemented to avoid code duplication and ensure consistency across the codebase.
