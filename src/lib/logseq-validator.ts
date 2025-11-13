export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates if the given string content conforms to the Logseq/Org-mode block format.
 * @param content The content to validate.
 * @returns A ValidationResult object.
 */
export const validateLogseqContent = (content: string): ValidationResult => {
  const errors: string[] = [];
  const lines = content.split('\n');
  const indentationStack: number[] = [-2]; // Stack to track indentation, -2 for a virtual root

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Skip undefined or null lines
    if (line === undefined || line === null) {
      continue;
    }

    // Ignore empty or whitespace-only lines
    if (line.trim() === '') {
      continue;
    }

    const indentation = line.length - line.trimStart().length;
    const trimmedLine = line.trim();

    // Rule 1: Must start with a dash
    if (!trimmedLine.startsWith('- ')) {
      errors.push(`Line ${lineNumber}: Must start with "- ". Found: "${trimmedLine}"`);
      continue; // Skip other checks for this malformed line
    }

    // Rule 2: Indentation must be a multiple of 2
    if (indentation % 2 !== 0) {
      errors.push(
        `Line ${lineNumber}: Indentation must be a multiple of 2. Found ${indentation} spaces.`
      );
    }

    // Rule 3: Nesting must be logical
    const parentIndentation = indentationStack[indentationStack.length - 1]!;
    if (indentation > parentIndentation + 2) {
      errors.push(
        `Line ${lineNumber}: Invalid nesting. Indentation increased by more than one level (from ${parentIndentation} to ${indentation} spaces).`
      );
    }

    // Adjust indentation stack
    if (indentation > parentIndentation) {
      indentationStack.push(indentation);
    } else {
      while (
        indentationStack.length > 1 &&
        indentationStack[indentationStack.length - 1]! > indentation
      ) {
        indentationStack.pop();
      }
    }

    // Rule 4: Properties (::) cannot be at the root level
    if (indentation === 0 && trimmedLine.includes('::')) {
      errors.push(
        `Line ${lineNumber}: Properties (using "::") cannot be at the root level.`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};