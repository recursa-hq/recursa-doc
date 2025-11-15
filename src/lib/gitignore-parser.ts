import { promises as fs } from 'fs';
import path from 'path';

/**
 * Represents a parsed gitignore pattern
 */
interface GitignorePattern {
  pattern: string;
  isNegated: boolean;
  isDirectory: boolean;
}

/**
 * Creates a gitignore pattern object from a raw pattern string
 */
const parsePattern = (rawPattern: string): GitignorePattern | null => {
  // Skip empty lines and comments
  if (!rawPattern.trim() || rawPattern.trim().startsWith('#')) {
    return null;
  }

  const trimmed = rawPattern.trim();
  const isNegated = trimmed.startsWith('!');
  const pattern = isNegated ? trimmed.slice(1) : trimmed;
  const isDirectory = pattern.endsWith('/');

  return {
    pattern: isDirectory ? pattern.slice(0, -1) : pattern,
    isNegated,
    isDirectory,
  };
};

/**
 * Tests if a file path matches a gitignore pattern
 */
const matchesPattern = (
  filePath: string,
  relativePath: string,
  parsedPattern: GitignorePattern
): boolean => {
  const { pattern, isDirectory } = parsedPattern;
  
  // Convert gitignore pattern to regex
  let regexPattern = pattern
    // Escape special regex characters except * and ?
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    // Convert * to match any characters except path separators
    .replace(/\*/g, '[^/]*')
    // Convert ? to match any single character except path separators
    .replace(/\?/g, '[^/]')
    // Convert ** to match any characters including path separators
    .replace(/\*\*/g, '.*')
    // Anchors for start and end
    .replace(/^(?![^/])/, '^')
    .replace(/(?<![^/])$/, '$');

  // If pattern doesn't contain a slash, match against basename only
  if (!pattern.includes('/')) {
    regexPattern = `(?:^|.*/)${regexPattern}`;
  }

  const regex = new RegExp(regexPattern);
  
  // For directory patterns, ensure we're matching directories
  if (isDirectory) {
    // Check if it's a directory (ends with / in relative path)
    if (!relativePath.endsWith('/')) {
      return false;
    }
  }

  // Test against relative path
  const matches = regex.test(relativePath);
  
  return matches;
};

/**
 * Creates an ignore filter function from a .gitignore file
 * @param directory The directory containing the .gitignore file
 * @returns A function that returns true if a path should be ignored
 */
export const createIgnoreFilter = async (
  directory: string
): Promise<(filePath: string) => boolean> => {
  const gitignorePath = path.join(directory, '.gitignore');
  
  try {
    const content = await fs.readFile(gitignorePath, 'utf-8');
    const lines = content.split('\n');
    
    const patterns: GitignorePattern[] = [];
    for (const line of lines) {
      const parsed = parsePattern(line);
      if (parsed) {
        patterns.push(parsed);
      }
    }

    // Return the filter function
    return (filePath: string): boolean => {
      const relativePath = path.relative(directory, filePath);
      
      if (relativePath === '') return false; // Never ignore the root directory
      
      let isIgnored = false;
      
      // Process patterns in order
      for (const pattern of patterns) {
        if (matchesPattern(filePath, relativePath, pattern)) {
          isIgnored = !pattern.isNegated;
        }
      }
      
      return isIgnored;
    };
  } catch {
    // .gitignore doesn't exist or can't be read, return a function that never ignores
    return (): boolean => false;
  }
};

/**
 * Creates an ignore filter that combines multiple ignore filters
 * @param filters Array of ignore filter functions
 * @returns A combined ignore filter function
 */
export const combineIgnoreFilters = (
  filters: Array<(filePath: string) => boolean>
): ((filePath: string) => boolean) => {
  return (filePath: string): boolean => {
    return filters.some(filter => filter(filePath));
  };
};
