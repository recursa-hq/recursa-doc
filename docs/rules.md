codebase compliance rules;

1. No OOP, only HOFs
2. Use bun.sh and e2e type safe TypeScript
3. No unknown or any type
4. [e2e|integration|unit]/[domain].test.ts files & dirs
5. Bun tests, isolated tests with minimal mocking. External network services (e.g., LLM APIs) should be mocked to ensure tests are fast, deterministic, and independent of network or API key issues.
6. DRY
