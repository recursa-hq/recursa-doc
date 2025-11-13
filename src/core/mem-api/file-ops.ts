import { promises as fs } from 'fs';
import path from 'path';
import { resolveSecurePath, validatePathBounds } from './secure-path';
import platform from '../../lib/platform.js';

// Note: Each function here is a HOF that takes dependencies (like graphRoot)
// and returns the actual function to be exposed on the mem API.

/**
 * Cross-platform file operation utilities with enhanced error handling
 */

/**
 * Atomic file write with temporary file and proper cleanup
 */
const atomicWriteFile = async (filePath: string, content: string): Promise<void> => {
  const tempPath = filePath + '.tmp.' + Math.random().toString(36).substr(2, 9);

  try {
    // Write to temporary file first
    await fs.writeFile(tempPath, content, 'utf-8');

    // On Windows, we need to handle file locking differently
    if (platform.isWindows) {
      // Try to rename, if it fails due to locking, wait and retry
      let retries = 3;
      let lastError: Error | null = null;

      while (retries > 0) {
        try {
          await fs.rename(tempPath, filePath);
          return; // Success
        } catch (error: unknown) {
          lastError = error as Error;
          if (hasErrorCode(error) && (error.code === 'EBUSY' || error.code === 'EPERM')) {
            retries--;
            await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
            continue;
          }
          throw error; // Re-throw non-locking errors
        }
      }
      throw lastError;
    } else {
      // Unix-like systems can usually rename directly
      await fs.rename(tempPath, filePath);
    }
  } catch (error) {
    // Clean up temp file if something went wrong
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
};

/**
 * Type guard to check if error has a code property
 */
const hasErrorCode = (error: unknown): error is Error & { code?: string } => {
  return error instanceof Error && 'code' in error;
};

/**
 * Enhanced error handler for file operations
 */
const handleFileError = (error: unknown, operation: string, filePath: string): Error => {
  const nodeError = error as NodeJS.ErrnoException;

  // Handle platform-specific errors
  if (nodeError.code === 'EACCES' || nodeError.code === 'EPERM') {
    if (platform.isWindows) {
      return new Error(`Permission denied for ${operation} on ${filePath}. The file may be in use or you may need administrator privileges.`);
    }
    if (platform.isTermux) {
      return new Error(`Permission denied for ${operation} on ${filePath}. Check Termux storage permissions.`);
    }
    return new Error(`Permission denied for ${operation} on ${filePath}. Check file permissions.`);
  }

  if (nodeError.code === 'EMFILE' || nodeError.code === 'ENFILE') {
    return new Error(`Too many files open for ${operation} on ${filePath}. Close some files and try again.`);
  }

  if (nodeError.code === 'ENOSPC') {
    return new Error(`No space left on device for ${operation} on ${filePath}.`);
  }

  if (nodeError.code === 'EROFS') {
    return new Error(`Read-only file system: Cannot perform ${operation} on ${filePath}.`);
  }

  if (nodeError.code === 'EBUSY') {
    return new Error(`Resource busy: Cannot perform ${operation} on ${filePath} as it is in use.`);
  }

  return new Error(`Failed to ${operation.toLowerCase()} ${filePath}: ${nodeError.message}`);
};

/**
 * Ensure parent directories exist with proper error handling
 */
const ensureParentDirectories = async (filePath: string): Promise<void> => {
  const dir = path.dirname(filePath);

  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error: unknown) {
    if (hasErrorCode(error) && error.code !== 'EEXIST') {
      throw handleFileError(error, 'create parent directories', dir);
    }
  }
};

export const readFile =
  (graphRoot: string) =>
  async (filePath: string): Promise<string> => {
    const fullPath = resolveSecurePath(graphRoot, filePath);

    try {
      // Additional validation for symlink safety
      if (!validatePathBounds(graphRoot, fullPath, { followSymlinks: true })) {
        throw new Error(`Security violation: Path validation failed for ${filePath}`);
      }

      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      throw handleFileError(error, 'read file', filePath);
    }
  };

export const writeFile =
  (graphRoot: string) =>
  async (filePath: string, content: string): Promise<boolean> => {
    const fullPath = resolveSecurePath(graphRoot, filePath);

    try {
      // Additional validation - allow non-existent files for write operations
      if (!validatePathBounds(graphRoot, fullPath, { followSymlinks: false, requireExistence: false })) {
        throw new Error(`Security violation: Path validation failed for ${filePath}`);
      }

      // Ensure parent directories exist
      await ensureParentDirectories(fullPath);

      // Use atomic write for data safety
      await atomicWriteFile(fullPath, content);
      return true;
    } catch (error) {
      throw handleFileError(error, 'write file', filePath);
    }
  };

export const updateFile =
  (graphRoot: string) =>
  async (
    filePath: string,
    oldContent: string,
    newContent: string
  ): Promise<boolean> => {
    const fullPath = resolveSecurePath(graphRoot, filePath);

    try {
      // Additional validation
      if (!validatePathBounds(graphRoot, fullPath, { followSymlinks: false })) {
        throw new Error(`Security violation: Path validation failed for ${filePath}`);
      }

      // Atomically read and compare the file content.
      const currentContent = await fs.readFile(fullPath, 'utf-8');

      // This is a Compare-and-Swap (CAS) operation.
      // If the content on disk is not what the agent *thinks* it is,
      // another process (or agent turn) has modified it. We must abort.
      if (currentContent !== oldContent) {
        throw new Error(
          `File content has changed since it was last read for ${filePath}. Update aborted to prevent data loss.`
        );
      }

      // Write the new content back using atomic write.
      await atomicWriteFile(fullPath, newContent);
      return true;
    } catch (error) {
      throw handleFileError(error, 'update file', filePath);
    }
  };

export const deletePath =
  (graphRoot: string) =>
  async (filePath: string): Promise<boolean> => {
    const fullPath = resolveSecurePath(graphRoot, filePath);

    try {
      // Additional validation
      if (!validatePathBounds(graphRoot, fullPath, { followSymlinks: false })) {
        throw new Error(`Security violation: Path validation failed for ${filePath}`);
      }

      await fs.rm(fullPath, { recursive: true, force: true });
      return true;
    } catch (error) {
      throw handleFileError(error, 'delete path', filePath);
    }
  };

export const rename =
  (graphRoot: string) =>
  async (oldPath: string, newPath: string): Promise<boolean> => {
    const fullOldPath = resolveSecurePath(graphRoot, oldPath);
    const fullNewPath = resolveSecurePath(graphRoot, newPath);

    try {
      // Additional validation for both paths
      if (!validatePathBounds(graphRoot, fullOldPath, { followSymlinks: false }) ||
          !validatePathBounds(graphRoot, fullNewPath, { followSymlinks: false })) {
        throw new Error(`Security violation: Path validation failed for rename operation`);
      }

      // Ensure parent directory of new path exists
      await ensureParentDirectories(fullNewPath);

      await fs.rename(fullOldPath, fullNewPath);
      return true;
    } catch (error) {
      throw handleFileError(error, `rename ${oldPath} to ${newPath}`, oldPath);
    }
  };

export const fileExists =
  (graphRoot: string) =>
  async (filePath: string): Promise<boolean> => {
    const fullPath = resolveSecurePath(graphRoot, filePath);

    try {
      // Additional validation - don't throw for non-existent files in fileExists
      if (!validatePathBounds(graphRoot, fullPath, { followSymlinks: true, requireExistence: false })) {
        return false; // Treat security violations as non-existent
      }

      await fs.access(fullPath);
      return true;
    } catch (error: unknown) {
      // fs.access throws an error if path doesn't exist. We expect ENOENT and should return false.
      // For other errors (e.g., permission issues), let the error propagate through our handler.
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
        return false;
      }
      throw handleFileError(error, 'check file existence', filePath);
    }
  };

export const createDir =
  (graphRoot: string) =>
  async (directoryPath: string): Promise<boolean> => {
    const fullPath = resolveSecurePath(graphRoot, directoryPath);

    try {
      // Additional validation
      if (!validatePathBounds(graphRoot, fullPath, { followSymlinks: false })) {
        throw new Error(`Security violation: Path validation failed for ${directoryPath}`);
      }

      await fs.mkdir(fullPath, { recursive: true });
      return true;
    } catch (error) {
      throw handleFileError(error, 'create directory', directoryPath);
    }
  };

export const listFiles =
  (graphRoot: string) =>
  async (directoryPath?: string): Promise<string[]> => {
    const targetDir = directoryPath ? directoryPath : '.';
    const fullPath = resolveSecurePath(graphRoot, targetDir);

    try {
      // Additional validation
      if (!validatePathBounds(graphRoot, fullPath, { followSymlinks: true })) {
        throw new Error(`Security violation: Path validation failed for directory ${directoryPath || 'root'}`);
      }

      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      return entries.map((entry) => entry.name).sort(); // Sort for consistent ordering
    } catch (error) {
      throw handleFileError(error, `list files in directory`, directoryPath || 'root');
    }
  };
