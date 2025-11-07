import { promises as fs } from 'fs';
import path from 'path';
import type { GraphQueryResult } from '../../types';
import { resolveSecurePath } from './secure-path';
import { walk } from './fs-walker';

export const queryGraph =
  (graphRoot: string) =>
  async (query: string): Promise<GraphQueryResult[]> => {
    // Basic property query parser: (property key:: value)
    const propertyRegex = /^\(property\s+([^:]+?)::\s*(.+?)\)$/;
    const match = query.trim().match(propertyRegex);

    if (!match || !match[1] || !match[2]) {
      // For now, only support property queries. Return empty for others.
      return [];
    }

    const key = match[1];
    const value = match[2];
    const results: GraphQueryResult[] = [];

    for await (const filePath of walk(graphRoot)) {
      if (filePath.endsWith('.md')) {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');
        const matchingLines: string[] = [];
        for (const line of lines) {
          if (line.trim() === `${key.trim()}:: ${value.trim()}`) {
            matchingLines.push(line);
          }
        }
        if (matchingLines.length > 0) {
          results.push({
            filePath: path.relative(graphRoot, filePath),
            matches: matchingLines,
          });
        }
      }
    }
    return results;
  };

export const getBacklinks =
  (graphRoot: string) =>
  async (filePath: string): Promise<string[]> => {
    const targetBaseName = path.basename(filePath, path.extname(filePath));
    const linkPattern = `[[${targetBaseName}]]`;
    const backlinks: string[] = [];

    for await (const currentFilePath of walk(graphRoot)) {
      // Don't link to self
      if (
        path.resolve(currentFilePath) === path.resolve(graphRoot, filePath)
      ) {
        continue;
      }

      if (currentFilePath.endsWith('.md')) {
        try {
          const content = await fs.readFile(currentFilePath, 'utf-8');
          if (content.includes(linkPattern)) {
            backlinks.push(path.relative(graphRoot, currentFilePath));
          }
        } catch (e) {
          // Ignore files that can't be read
        }
      }
    }
    return backlinks;
  };

export const getOutgoingLinks =
  (graphRoot: string) =>
  async (filePath: string): Promise<string[]> => {
    const fullPath = resolveSecurePath(graphRoot, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const linkRegex = /\[\[(.*?)\]\]/g;
    const matches = content.matchAll(linkRegex);
    const uniqueLinks = new Set<string>();

    for (const match of matches) {
      if (match[1]) {
        uniqueLinks.add(match[1]);
      }
    }
    return Array.from(uniqueLinks);
  };

export const searchGlobal =
  (graphRoot: string) =>
  async (query: string): Promise<string[]> => {
    const matchingFiles: string[] = [];
    const lowerCaseQuery = query.toLowerCase();

    for await (const filePath of walk(graphRoot)) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        if (content.toLowerCase().includes(lowerCaseQuery)) {
          matchingFiles.push(path.relative(graphRoot, filePath));
        }
      } catch (e) {
        // Ignore binary files or files that can't be read
      }
    }
    return matchingFiles;
  };