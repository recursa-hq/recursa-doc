import type { ParsedLLMResponse } from '../types';

/**
 * Parses the LLM's XML-like response string into a structured object.
 * This function uses a simple regex-based approach for robustness against
 * potentially malformed, non-XML-compliant output from the LLM, which is
 * often more reliable than a strict XML parser.
 *
 * @param response The raw string response from the LLM.
 * @returns A ParsedLLMResponse object with optional `think`, `typescript`, and `reply` fields.
 */
export const parseLLMResponse = (response: string): ParsedLLMResponse => {
  const extractTagContent = (tagName: string): string | undefined => {
    const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i');
    const match = response.match(regex);
    // If a match is found, return the captured group (the content), trimmed.
    return match ? match[1].trim() : undefined;
  };

  // Parse structured tags
  let think = extractTagContent('think');
  let typescript = extractTagContent('typescript');
  let reply = extractTagContent('reply');
  
  // Handle malformed responses: if no think tag but there's content before the first XML tag,
  // treat that content as the think content
  if (!think) {
    const firstTagMatch = response.match(/<[^>]+>/);
    if (firstTagMatch) {
      const contentBeforeFirstTag = response.substring(0, firstTagMatch.index).trim();
      if (contentBeforeFirstTag) {
        think = contentBeforeFirstTag;
      }
    }
  }

  // Handle malformed responses or alternative formats
  if (!think && !typescript && !reply) {
    // Try to extract any content that looks like a reply (text after XML-like tags)
    const lines = response.split('\n').filter(line => line.trim());
    const nonTagLines = lines.filter(line => !line.trim().match(/^<[^>]+>$/));
    
    if (nonTagLines.length > 0) {
      // If there's content that's not just tags, treat it as a reply
      const lastLineIndex = response.lastIndexOf('>');
      if (lastLineIndex > 0 && lastLineIndex < response.length - 1) {
        reply = response.substring(lastLineIndex + 1).trim();
      } else if (nonTagLines.length === 1) {
        reply = nonTagLines[0].trim();
      }
    }
  }

  // Handle cases where reply is embedded in XML-like structure but without explicit tags
  if (!reply && typescript && think) {
    // If we have think and typescript but no reply, there might be content after the typescript block
    const tsEndIndex = response.lastIndexOf('</typescript>');
    if (tsEndIndex > 0 && tsEndIndex < response.length - 1) {
      const afterTs = response.substring(tsEndIndex + 13).trim();
      if (afterTs && !afterTs.startsWith('<')) {
        reply = afterTs;
      }
    }
  }

  return {
    think,
    typescript,
    reply,
  };
};
