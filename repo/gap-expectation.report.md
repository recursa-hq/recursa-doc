### `gap-expectation.report.md`

# 🚨 Logseq Block Formatting: Gap-Expectation Report 🚨

**TL;DR:** The agent is using a file-level hammer but is expected to produce block-level precision. The risk is high-entropy string manipulation failing on indentation.

---

### STATUS: Tooling is Solid, Vision is Fragile

The core contract—relying on the LLM to generate all logic as a string inside a `<typescript>` block, then writing that string to the file—remains in force. We are **not** building a block-parsing AST layer.

The issue is that the LLM is currently generating unstructured markdown (e.g., in `Dr. Aris Thorne.md`).

### THE CRUNCH: LLM is Forced to be an ASCII Parser

To meet the Logseq/Org-mode block expectation (nested items, `property:: value` adherence), the LLM must be perfectly consistent in its string manipulation.

| Tool | Agent's Current Use (Fragile) | Agent's Required Use (High Precision) |
| :--- | :--- | :--- |
| `mem.writeFile` | `content: '# Title\nSome text.'` | `content: '# Title\n- Root Item\n  - Nested block\n    property:: value'` |
| `mem.updateFile` | `old.replace('text', 'new text')` | `old.insertAtEndOfBlock('- new child')` (Requires perfect manual index/indent tracking) |

The current system prompt does not enforce the specific block syntax, relying only on general Markdown.

### EXPECTED FIX: Prompt Engineering > Code

This is a documentation and prompt discipline problem, not an immediate failure of the `mem` API.

1.  **Harden `docs/system-prompt.md`:** The prompt must explicitly state, in the "Core Workflow" section, that all new content written to files **MUST** use Logseq-style block formatting (e.g., starting with a dash `-`, using two spaces for nesting, and placing properties under a block).
2.  **Harden `docs/tools.md` Examples:** All examples for `writeFile` and `updateFile` must be updated to demonstrate the required block-level output structure.

**Conclusion:** The code won't break, but the knowledge graph quality will be random until the prompt forces the LLM to become a high-precision block formatter. **LLM discipline is mandatory.**
