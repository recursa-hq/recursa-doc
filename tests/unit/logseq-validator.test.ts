import { describe, it, expect } from '@jest/globals';
import { validateLogseqContent } from '../../src/lib/logseq-validator.js';

describe('Logseq Content Validator', () => {
  it('should return valid for correct Logseq content', () => {
    const content = `
- # Page Title
  - property:: value
  - List item 1
    - Nested item 1.1
      - Doubly nested item
  - List item 2
- Another root item
`;
    const result = validateLogseqContent(content);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should return valid for empty or whitespace-only content', () => {
    expect(validateLogseqContent('').isValid).toBe(true);
    expect(validateLogseqContent('   \n\n  ').isValid).toBe(true);
  });

  it('should detect lines not starting with "- "', () => {
    const content = `
- Valid item
Invalid item
`;
    const result = validateLogseqContent(content);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      'Line 3: Must start with "- ". Found: "Invalid item"'
    );
  });

  it('should detect incorrect indentation (not a multiple of 2)', () => {
    const content = `
- Root
   - Invalid indentation
`;
    const result = validateLogseqContent(content);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      'Line 3: Indentation must be a multiple of 2. Found 3 spaces.'
    );
  });

  it('should detect incorrect single-space indentation', () => {
    const content = `
- Root
 - Invalid indentation
`;
    const result = validateLogseqContent(content);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      'Line 3: Indentation must be a multiple of 2. Found 1 spaces.'
    );
  });

  it('should detect illogical nesting (jumping more than one level)', () => {
    const content = `
- Root
    - Invalid jump
`;
    const result = validateLogseqContent(content);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      'Line 3: Invalid nesting. Indentation increased by more than one level (from 0 to 4 spaces).'
    );
  });

  it('should detect properties at the root level', () => {
    const content = `
- property:: not-allowed-at-root
`;
    const result = validateLogseqContent(content);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      'Line 2: Properties (using "::") cannot be at the root level.'
    );
  });

  it('should allow properties at nested levels', () => {
    const content = `
- Item
  - property:: allowed-here
`;
    const result = validateLogseqContent(content);
    expect(result.isValid).toBe(true);
  });

  it('should handle multiple errors at once', () => {
    const content = `
Root without dash
- property:: at-root
   - bad indent
        - bad nesting jump
`;
    const result = validateLogseqContent(content);
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual([
      'Line 2: Must start with "- ". Found: "Root without dash"',
      'Line 3: Properties (using "::") cannot be at the root level.',
      'Line 4: Indentation must be a multiple of 2. Found 3 spaces.',
      'Line 4: Invalid nesting. Indentation increased by more than one level (from 0 to 3 spaces).',
      'Line 5: Invalid nesting. Indentation increased by more than one level (from 3 to 8 spaces).',
    ]);
  });
});