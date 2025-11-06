import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
  renameSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type {
  MemAPI,
  GitCommit,
  GraphQueryResult,
  TokenCount,
  FileTokenBreakdown,
  DirectoryTokenStats,
} from '../types/mem.js';
import {
  getGitLog,
  getGitDiff,
  getStagedFiles,
  commitChanges as gitCommit,
} from '../services/Git.js';

const countTokens = (text: string): number => {
  return Math.ceil(text.length / 4);
};

export const createMemAPI = (
  knowledgeGraphPath: string,
  gitOptions?: { baseDir?: string }
): MemAPI => {
  const resolvePath = (filePath: string): string => {
    return resolve(knowledgeGraphPath, filePath);
  };

  const readFile = async (filePath: string): Promise<string> => {
    try {
      const resolvedPath = resolvePath(filePath);
      const content = readFileSync(resolvedPath, 'utf-8');
      return content;
    } catch (error) {
      throw new Error(`Failed to read file: ${filePath}`);
    }
  };

  const writeFile = async (
    filePath: string,
    content: string
  ): Promise<boolean> => {
    try {
      const resolvedPath = resolvePath(filePath);
      const dir = dirname(resolvedPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(resolvedPath, content, 'utf-8');
      return true;
    } catch (error) {
      throw new Error(`Failed to write file: ${filePath}`);
    }
  };

  const updateFile = async (
    filePath: string,
    oldContent: string,
    newContent: string
  ): Promise<boolean> => {
    try {
      const resolvedPath = resolvePath(filePath);
      const currentContent = readFileSync(resolvedPath, 'utf-8');
      if (currentContent !== oldContent) {
        throw new Error('File content has changed, update failed');
      }
      writeFileSync(resolvedPath, newContent, 'utf-8');
      return true;
    } catch (error) {
      throw new Error(`Failed to update file: ${filePath}`);
    }
  };

  const deleteFile = async (filePath: string): Promise<boolean> => {
    try {
      const resolvedPath = resolvePath(filePath);
      if (statSync(resolvedPath).isDirectory()) {
        throw new Error('Cannot delete directory');
      }
      unlinkSync(resolvedPath);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete file: ${filePath}`);
    }
  };

  const rename = async (oldPath: string, newPath: string): Promise<boolean> => {
    try {
      const resolvedOldPath = resolvePath(oldPath);
      const resolvedNewPath = resolvePath(newPath);
      const newDir = dirname(resolvedNewPath);
      if (!existsSync(newDir)) {
        mkdirSync(newDir, { recursive: true });
      }
      renameSync(resolvedOldPath, resolvedNewPath);
      return true;
    } catch (error) {
      throw new Error(`Failed to rename file: ${oldPath}`);
    }
  };

  const fileExists = async (filePath: string): Promise<boolean> => {
    try {
      const resolvedPath = resolvePath(filePath);
      return existsSync(resolvedPath);
    } catch (error) {
      return false;
    }
  };

  const createDir = async (directoryPath: string): Promise<boolean> => {
    try {
      const resolvedPath = resolvePath(directoryPath);
      if (!existsSync(resolvedPath)) {
        mkdirSync(resolvedPath, { recursive: true });
      }
      return true;
    } catch (error) {
      throw new Error(`Failed to create directory: ${directoryPath}`);
    }
  };

  const listFiles = async (directoryPath?: string): Promise<string[]> => {
    try {
      const targetPath = directoryPath
        ? resolvePath(directoryPath)
        : knowledgeGraphPath;
      if (!existsSync(targetPath)) {
        return [];
      }
      const items = readdirSync(targetPath);
      return items;
    } catch (error) {
      throw new Error(`Failed to list files: ${directoryPath}`);
    }
  };

  const gitDiff = async (
    filePath: string,
    fromCommit?: string,
    toCommit?: string
  ): Promise<string> => {
    try {
      return getGitDiff(filePath, fromCommit, toCommit, gitOptions);
    } catch (error) {
      throw new Error(`Failed to get git diff: ${error}`);
    }
  };

  const gitLog = async (
    filePath: string,
    maxCommits = 5
  ): Promise<GitCommit[]> => {
    try {
      const resolvedPath = resolvePath(filePath);
      const _gitPath = join(knowledgeGraphPath, resolvedPath);
      const logs = getGitLog(resolvedPath, maxCommits, gitOptions);
      return logs.map((log) => ({
        hash: log.hash,
        message: log.message,
        date: log.date,
      }));
    } catch (error) {
      throw new Error(`Failed to get git log: ${error}`);
    }
  };

  const gitStagedFiles = async (): Promise<string[]> => {
    try {
      return getStagedFiles(gitOptions);
    } catch (error) {
      throw new Error(`Failed to get staged files: ${error}`);
    }
  };

  const commitChanges = async (message: string): Promise<string> => {
    try {
      return gitCommit(message, gitOptions);
    } catch (error) {
      throw new Error(`Failed to commit changes: ${error}`);
    }
  };

  const queryGraph = async (query: string): Promise<GraphQueryResult[]> => {
    try {
      const allFiles = readdirSync(knowledgeGraphPath, { recursive: true });
      const results: GraphQueryResult[] = [];

      for (const file of allFiles) {
        const filePath = join(knowledgeGraphPath, file);
        if (statSync(filePath).isFile() && file.endsWith('.md')) {
          const content = readFileSync(filePath, 'utf-8');
          const matches: string[] = [];

          if (query.includes('::')) {
            const propertyPattern = query.match(/([a-zA-Z]+)::\s*(.+)/);
            if (propertyPattern) {
              const [, key, value] = propertyPattern;
              const propRegex = new RegExp(`${key}::\\s*${value}`, 'i');
              if (propRegex.test(content)) {
                matches.push(`Property match: ${key}:: ${value}`);
              }
            }
          }

          if (query.includes('[[')) {
            const linkPattern = query.match(/\[\[([^\]]+)\]\]/);
            if (linkPattern) {
              const link = linkPattern[1];
              const linkRegex = new RegExp(`\\[\\[${link}\\]\\]`, 'i');
              if (linkRegex.test(content)) {
                matches.push(`Link match: [[${link}]]`);
              }
            }
          }

          if (query.includes('outgoing-link-content')) {
            const contentMatch = query.match(
              /outgoing-link-content\s+"([^"]+)"/
            );
            if (contentMatch) {
              const searchText = contentMatch[1];
              const linkRegex = /\[\[([^\]]+)\]\]/g;
              const links = content.match(linkRegex);
              if (
                links &&
                links.some((_link) => content.includes(searchText))
              ) {
                matches.push(`Contains link and content: ${searchText}`);
              }
            }
          }

          if (query.toLowerCase().includes('type:: person')) {
            const typeRegex = /type::\s*person/i;
            if (typeRegex.test(content)) {
              matches.push('Type: person');
            }
          }

          if (matches.length > 0) {
            results.push({
              filePath: file,
              matches,
            });
          }
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to query graph: ${error}`);
    }
  };

  const getBacklinks = async (filePath: string): Promise<string[]> => {
    try {
      const backlinks: string[] = [];
      const allFiles = readdirSync(knowledgeGraphPath, { recursive: true });

      for (const file of allFiles) {
        const fullPath = join(knowledgeGraphPath, file);
        if (statSync(fullPath).isFile() && file.endsWith('.md')) {
          const content = readFileSync(fullPath, 'utf-8');
          const linkPattern = new RegExp(`\\[\\[${filePath}\\]\\]`, 'i');
          if (linkPattern.test(content)) {
            backlinks.push(file);
          }
        }
      }

      return backlinks;
    } catch (error) {
      throw new Error(`Failed to get backlinks: ${error}`);
    }
  };

  const getOutgoingLinks = async (filePath: string): Promise<string[]> => {
    try {
      const resolvedPath = resolvePath(filePath);
      const content = readFileSync(resolvedPath, 'utf-8');
      const linkPattern = /\[\[([^\]]+)\]\]/g;
      const matches = content.matchAll(linkPattern);
      const links = Array.from(matches, (m) => m[1]);
      return Array.from(new Set(links));
    } catch (error) {
      throw new Error(`Failed to get outgoing links: ${filePath}`);
    }
  };

  const searchGlobal = async (query: string): Promise<string[]> => {
    try {
      const results: string[] = [];
      const allFiles = readdirSync(knowledgeGraphPath, { recursive: true });

      for (const file of allFiles) {
        const fullPath = join(knowledgeGraphPath, file);
        if (statSync(fullPath).isFile() && file.endsWith('.md')) {
          const content = readFileSync(fullPath, 'utf-8');
          if (content.toLowerCase().includes(query.toLowerCase())) {
            results.push(file);
          }
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to search global: ${error}`);
    }
  };

  const getGraphRoot = async (): Promise<string> => {
    return knowledgeGraphPath;
  };

  const getMemoryUsage = async (): Promise<number> => {
    try {
      let totalSize = 0;
      const files = readdirSync(knowledgeGraphPath, { recursive: true });

      for (const file of files) {
        const fullPath = join(knowledgeGraphPath, file);
        if (statSync(fullPath).isFile()) {
          totalSize += statSync(fullPath).size;
        }
      }

      return totalSize;
    } catch (error) {
      throw new Error(`Failed to get memory usage: ${error}`);
    }
  };

  const countFileTokens = async (filePath: string): Promise<TokenCount> => {
    try {
      const resolvedPath = resolvePath(filePath);
      const content = readFileSync(resolvedPath, 'utf-8');
      const tokens = countTokens(content);
      return {
        total: tokens,
        tokens,
        characters: content.length,
      };
    } catch (error) {
      throw new Error(`Failed to count tokens: ${filePath}`);
    }
  };

  const countDirectoryTokens = async (
    directoryPath?: string
  ): Promise<number> => {
    try {
      const targetPath = directoryPath
        ? resolvePath(directoryPath)
        : knowledgeGraphPath;
      let totalTokens = 0;

      const files = readdirSync(targetPath, { recursive: true });

      for (const file of files) {
        const fullPath = join(targetPath, file);
        if (statSync(fullPath).isFile() && file.endsWith('.md')) {
          const content = readFileSync(fullPath, 'utf-8');
          totalTokens += countTokens(content);
        }
      }

      return totalTokens;
    } catch (error) {
      throw new Error(`Failed to count directory tokens: ${directoryPath}`);
    }
  };

  const getTokenBreakdown = async (
    filePath: string
  ): Promise<FileTokenBreakdown> => {
    try {
      const resolvedPath = resolvePath(filePath);
      const content = readFileSync(resolvedPath, 'utf-8');
      const tokens = countTokens(content);
      const blocks = content
        .split('\n')
        .filter((line) => line.trim().startsWith('-')).length;

      return {
        filePath,
        tokens,
        characters: content.length,
        blocks,
      };
    } catch (error) {
      throw new Error(`Failed to get token breakdown: ${filePath}`);
    }
  };

  const estimateReadCost = async (filePath: string): Promise<number> => {
    try {
      const resolvedPath = resolvePath(filePath);
      const content = readFileSync(resolvedPath, 'utf-8');
      return countTokens(content);
    } catch (error) {
      throw new Error(`Failed to estimate read cost: ${filePath}`);
    }
  };

  const getFilesByTokenSize = async (
    directoryPath?: string,
    limit = 10
  ): Promise<Array<{ filePath: string; tokens: number }>> => {
    try {
      const targetPath = directoryPath
        ? resolvePath(directoryPath)
        : knowledgeGraphPath;
      const files = readdirSync(targetPath, { recursive: true });
      const filesWithTokens: Array<{ filePath: string; tokens: number }> = [];

      for (const file of files) {
        const fullPath = join(targetPath, file);
        if (statSync(fullPath).isFile() && file.endsWith('.md')) {
          const content = readFileSync(fullPath, 'utf-8');
          filesWithTokens.push({
            filePath: file,
            tokens: countTokens(content),
          });
        }
      }

      return filesWithTokens
        .sort((a, b) => b.tokens - a.tokens)
        .slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to get files by token size: ${directoryPath}`);
    }
  };

  const getDirectoryTokenStats = async (
    directoryPath?: string
  ): Promise<DirectoryTokenStats> => {
    try {
      const targetPath = directoryPath
        ? resolvePath(directoryPath)
        : knowledgeGraphPath;
      const files = readdirSync(targetPath, { recursive: true });
      let totalTokens = 0;
      let totalFiles = 0;
      let largestFile = { path: '', tokens: 0 };

      for (const file of files) {
        const fullPath = join(targetPath, file);
        if (statSync(fullPath).isFile() && file.endsWith('.md')) {
          const content = readFileSync(fullPath, 'utf-8');
          const tokens = countTokens(content);
          totalTokens += tokens;
          totalFiles++;

          if (tokens > largestFile.tokens) {
            largestFile = { path: file, tokens };
          }
        }
      }

      return {
        totalTokens,
        totalFiles,
        largestFile,
        averageTokensPerFile:
          totalFiles > 0 ? Math.floor(totalTokens / totalFiles) : 0,
      };
    } catch (error) {
      throw new Error(`Failed to get directory token stats: ${directoryPath}`);
    }
  };

  return {
    readFile,
    writeFile,
    updateFile,
    deleteFile,
    rename,
    fileExists,
    createDir,
    listFiles,
    gitDiff,
    gitLog,
    gitStagedFiles,
    commitChanges,
    queryGraph,
    getBacklinks,
    getOutgoingLinks,
    searchGlobal,
    getGraphRoot,
    getMemoryUsage,
    countFileTokens,
    countDirectoryTokens,
    getTokenBreakdown,
    estimateReadCost,
    getFilesByTokenSize,
    getDirectoryTokenStats,
  };
};
