import { promises as fs } from 'fs';
import path from 'path';
import { resolveSecurePath } from './secure-path';

// Note: Each function here is a HOF that takes dependencies (like graphRoot)
// and returns the actual function to be exposed on the mem API.

export const readFile =
  (graphRoot: string) =>
  async (filePath: string): Promise<string> => {
    const fullPath = resolveSecurePath(graphRoot, filePath);
    try {
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to read file ${filePath}: ${(error as Error).message}`
      );
    }
  };

export const writeFile =
  (graphRoot: string) =>
  async (filePath: string, content: string): Promise<boolean> => {
    const fullPath = resolveSecurePath(graphRoot, filePath);
    const dir = path.dirname(fullPath);

    try {
      // Create parent directories recursively
      await fs.mkdir(dir, { recursive: true });

      // Write the file
      await fs.writeFile(fullPath, content, 'utf-8');
      return true;
    } catch (error) {
      throw new Error(
        `Failed to write file ${filePath}: ${(error as Error).message}`
      );
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
      // Read the current file content
      const currentContent = await fs.readFile(fullPath, 'utf-8');

      // Verify the old content exists
      if (!currentContent.includes(oldContent)) {
        throw new Error(
          `File content does not match expected old content in ${filePath}`
        );
      }

      // Replace the content
      const updatedContent = currentContent.replace(oldContent, newContent);

      // Write the new content back
      await fs.writeFile(fullPath, updatedContent, 'utf-8');
      return true;
    } catch (error) {
      throw new Error(
        `Failed to update file ${filePath}: ${(error as Error).message}`
      );
    }
  };

export const deleteFile =
  (graphRoot: string) =>
  async (filePath: string): Promise<boolean> => {
    const fullPath = resolveSecurePath(graphRoot, filePath);

    try {
      await fs.rm(fullPath, { recursive: true, force: true });
      return true;
    } catch (error) {
      throw new Error(
        `Failed to delete file ${filePath}: ${(error as Error).message}`
      );
    }
  };

export const rename =
  (graphRoot: string) =>
  async (oldPath: string, newPath: string): Promise<boolean> => {
    const fullOldPath = resolveSecurePath(graphRoot, oldPath);
    const fullNewPath = resolveSecurePath(graphRoot, newPath);

    try {
      await fs.rename(fullOldPath, fullNewPath);
      return true;
    } catch (error) {
      throw new Error(
        `Failed to rename ${oldPath} to ${newPath}: ${(error as Error).message}`
      );
    }
  };

export const fileExists =
  (graphRoot: string) =>
  async (filePath: string): Promise<boolean> => {
    const fullPath = resolveSecurePath(graphRoot, filePath);

    try {
      await fs.access(fullPath);
      return true;
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        return false;
      }
      throw new Error(
        `Failed to check if file exists ${filePath}: ${(error as Error).message}`
      );
    }
  };

export const createDir =
  (graphRoot: string) =>
  async (directoryPath: string): Promise<boolean> => {
    const fullPath = resolveSecurePath(graphRoot, directoryPath);

    try {
      await fs.mkdir(fullPath, { recursive: true });
      return true;
    } catch (error) {
      throw new Error(
        `Failed to create directory ${directoryPath}: ${(error as Error).message}`
      );
    }
  };

export const listFiles =
  (graphRoot: string) =>
  async (directoryPath?: string): Promise<string[]> => {
    const targetDir = directoryPath ? directoryPath : '.';
    const fullPath = resolveSecurePath(graphRoot, targetDir);

    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      return entries.map((entry) => entry.name).sort(); // Sort for consistent ordering
    } catch (error) {
      throw new Error(
        `Failed to list files in directory ${directoryPath || 'root'}: ${(error as Error).message}`
      );
    }
  };
