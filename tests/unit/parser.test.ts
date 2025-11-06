import { describe, it, expect } from 'bun:test';
// import { parseLLMResponse } from '../../src/core/parser';

// TODO: Write unit tests for the XML parser function.
describe('LLM Response Parser', () => {
  // TODO: Test case for a valid response with all tags.
  it('should parse a full, valid response', () => {
    // const xml = `<think>...</think><typescript>...</typescript><reply>...</reply>`;
    // const result = parseLLMResponse(xml);
    // expect(result).toEqual({ think: '...', typescript: '...', reply: '...' });
  });

  // TODO: Test case for a response with only think and typescript.
  it('should parse a partial response (think/act)', () => {
    // ...
  });

  // TODO: Test case for a response with messy formatting.
  it('should handle extra whitespace and newlines', () => {
    // ...
  });

  // TODO: Test case for a response with missing tags.
  it('should return an object with undefined for missing tags', () => {
    // ...
  });
});