import path from 'path';
import fs from 'fs';
import platform from '../../lib/platform.js';

/**
 * Cross-platform path traversal protection utilities
 * The LLM should never be able to access files outside the knowledge graph.
 */

/**
 * Enhanced path resolution with canonicalization for cross-platform security
 * @param graphRoot The absolute path to the root of the knowledge graph.
 * @param userPath The user-provided sub-path.
 * @returns The resolved, secure absolute path.
 * @throws If a path traversal attempt is detected.
 */
export const resolveSecurePath = (
  graphRoot: string,
  userPath: string
): string => {
  // Normalize and resolve paths using platform-aware normalization
  const normalizedRoot = platform.normalizePath(path.resolve(graphRoot));
  const normalizedUserPath = platform.normalizePath(path.resolve(normalizedRoot, userPath));

  // Get canonical paths to handle symlinks and case-insensitive filesystems
  const canonicalRoot = getCanonicalPath(normalizedRoot);
  const canonicalTarget = getCanonicalPath(normalizedUserPath);

  // Security check with case-insensitive comparison when needed
  const isSecure = platform.hasCaseInsensitiveFS
    ? canonicalTarget.toLowerCase().startsWith(canonicalRoot.toLowerCase())
    : canonicalTarget.startsWith(canonicalRoot);

  if (!isSecure) {
    throw new SecurityError(`Path traversal attempt detected. User path: ${userPath}, resolved to: ${canonicalTarget}`);
  }

  return canonicalTarget;
};

/**
 * Get canonical path by resolving symlinks and normalizing
 * @param filePath The path to canonicalize
 * @returns The canonical absolute path
 */
export const getCanonicalPath = (filePath: string): string => {
  try {
    // Use realpath to resolve all symlinks and normalize
    const canonical = fs.realpathSync(filePath);
    return platform.normalizePath(canonical);
  } catch {
    // If path doesn't exist, return normalized path
    return platform.normalizePath(path.resolve(filePath));
  }
};

/**
 * Validate that a path is within allowed bounds
 * @param allowedRoot The root directory that's allowed
 * @param testPath The path to test
 * @param options Additional validation options
 * @returns True if path is valid and within bounds
 */
export const validatePathBounds = (
  allowedRoot: string,
  testPath: string,
  options: {
    allowSymlinks?: boolean;
    requireExistence?: boolean;
    followSymlinks?: boolean;
  } = {}
): boolean => {
  const {
    allowSymlinks = false,
    requireExistence = false,
    followSymlinks = true
  } = options;

  try {
    const canonicalRoot = getCanonicalPath(allowedRoot);
    let canonicalTarget: string;
    
    // Handle non-existent paths specially
    try {
      canonicalTarget = getCanonicalPath(testPath);
    } catch (error) {
      // Path doesn't exist, use normalized path instead
      canonicalTarget = platform.normalizePath(path.resolve(testPath));
    }

    // If we shouldn't follow symlinks, check if the target itself is a symlink
    if (!followSymlinks) {
      try {
        if (fs.lstatSync(testPath).isSymbolicLink()) {
          if (!allowSymlinks) {
            return false;
          }
          // Use lstat to get the symlink itself, not its target
          canonicalTarget = platform.normalizePath(path.resolve(testPath));
        }
      } catch (error) {
        // File doesn't exist, which is fine for write operations
        // The canonicalTarget from resolveSecurePath is still valid
      }
    }

    // Check if the target path exists (if required)
    if (requireExistence && !fs.existsSync(canonicalTarget)) {
      return false;
    }

    // Final security check
    const isSecure = platform.hasCaseInsensitiveFS
      ? canonicalTarget.toLowerCase().startsWith(canonicalRoot.toLowerCase())
      : canonicalTarget.startsWith(canonicalRoot);

    return isSecure;
  } catch {
    return false;
  }
};

/**
 * Sanitize a user-provided path to remove dangerous components
 * @param userPath The user-provided path
 * @returns A sanitized path string
 */
export const sanitizePath = (userPath: string): string => {
  // Remove null bytes and other dangerous characters
  let sanitized = userPath.replace(/\0/g, '');

  // Handle Windows-specific path patterns
  if (platform.isWindows) {
    // Remove drive letter switching attempts
    sanitized = sanitized.replace(/^[a-zA-Z]:[\\/]/, '');
    // Remove UNC path attempts
    sanitized = sanitized.replace(/^\\\\[\\?]/, '');
    // Remove device namespace access attempts
    sanitized = sanitized.replace(/^\\\\\.\\[a-zA-Z]/, '');
  }

  // Remove excessive path separators
  const separator = platform.pathSeparator;
  const doubleSeparator = separator + separator;
  while (sanitized.includes(doubleSeparator)) {
    sanitized = sanitized.replace(doubleSeparator, separator);
  }

  // Normalize relative path components
  const parts = sanitized.split(separator);
  const filteredParts: string[] = [];

  for (const part of parts) {
    if (part === '..') {
      // Don't allow going above the current directory in user input
      continue;
    }
    if (part === '.' || part === '') {
      continue;
    }
    filteredParts.push(part);
  }

  return filteredParts.join(separator);
};

/**
 * Security error class for path traversal attempts
 */
export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SecurityError);
    }
  }
}

/**
 * Cross-platform path validation utilities
 */
export const pathValidation = {
  /**
   * Check if a path contains potentially dangerous patterns
   */
  isDangerousPath(userPath: string): boolean {
    // Check for common traversal patterns
    const dangerousPatterns = [
      /\.\.[/\\]/,    // ../ or ..\
      /[/\\]\.\./,    // /.. or \..
      /\0/,          // null byte injection
      /[/\\]\0/,      // null byte with separator
    ];

    // Windows-specific dangerous patterns
    if (platform.isWindows) {
      dangerousPatterns.push(
        /^[a-zA-Z]:[/\\].*[/\\][a-zA-Z]:[/\\]/, // drive letter switching
        /^\\\\/,                                 // UNC paths
        /\\\\\.\\[a-zA-Z]/,                      // device namespace
        /[/\\]CON$|[/\\]PRN$|[/\\]AUX$|[/\\]COM\d$|[/\\]LPT\d$/i // reserved names
      );
    }

    return dangerousPatterns.some(pattern => pattern.test(userPath));
  },

  /**
   * Validate and sanitize a user path in one step
   */
  validateAndSanitizePath(graphRoot: string, userPath: string): string {
    if (this.isDangerousPath(userPath)) {
      throw new SecurityError(`Dangerous path pattern detected: ${userPath}`);
    }

    const sanitizedPath = sanitizePath(userPath);
    return resolveSecurePath(graphRoot, sanitizedPath);
  }
};

export default {
  resolveSecurePath,
  getCanonicalPath,
  validatePathBounds,
  sanitizePath,
  SecurityError,
  pathValidation
};
