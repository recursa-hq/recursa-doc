import { VM } from 'vm2';
import type { MemAPI } from '../types';
// import { logger } from '../lib/logger';

// TODO: Create a function to execute LLM-generated TypeScript in a secure sandbox.
// export const runInSandbox = async (code: string, memApi: MemAPI): Promise<any> => { ... }
// - Instantiate a new VM from `vm2`.
// - **Security**: Configure the VM to be as restrictive as possible.
//   - `wasm: false` - Disable WebAssembly.
//   - `eval: false` - Disable `eval` within the sandbox.
//   - `fixAsync: true` - Ensures `async` operations are handled correctly.
//   - `timeout: 10000` - Set a 10-second timeout to prevent infinite loops.
//   - `sandbox`: The global scope. It should ONLY contain the `mem` object.
//   - `builtin`: Whitelist only necessary built-ins (e.g., 'crypto' for randomUUID if needed),
//     but default to an empty array `[]` to deny access to `fs`, `child_process`, etc.
//
// - The `code` should be wrapped in an `async` IIFE (Immediately Invoked Function Expression)
//   to allow the use of top-level `await` for `mem` calls.
//   Example wrapper: `(async () => { ${code} })();`
//
// - Use a try-catch block to handle errors from the sandboxed code.
//   - Log errors using the structured logger for observability.
//   - Re-throw a sanitized error or return an error object to the agent loop.
//
// - Capture and return the result of the execution.