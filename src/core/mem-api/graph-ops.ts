import { promises as fs } from 'fs';
import path from 'path';
import type { GraphQueryResult } from '../../types';
import { resolveSecurePath } from './secure-path.js';
import { walk } from './fs-walker.js';
import { createIgnoreFilter } from '../../lib/gitignore-parser.js';

type PropertyCondition = {
  type: 'property';
  key: string;
  value: string;
};

type OutgoingLinkCondition = {
  type: 'outgoing-link';
  target: string;
};

type Condition = PropertyCondition | OutgoingLinkCondition;

const parseCondition = (conditionStr: string): Condition | null => {
  const propertyRegex = /^\(property\s+([^:]+?)::\s*(.+?)\)$/;
  let match = conditionStr.trim().match(propertyRegex);
  if (match?.[1] && match[2]) {
    return {
      type: 'property',
      key: match[1].trim(),
      value: match[2].trim(),
    };
  }

  const linkRegex = /^\(outgoing-link\s+\[\[(.+?)\]\]\)$/;
  match = conditionStr.trim().match(linkRegex);
  if (match?.[1]) {
    return {
      type: 'outgoing-link',
      target: match[1].trim(),
    };
  }

  return null;
};

const checkCondition = (content: string, condition: Condition): string[] => {
  const matches: string[] = [];
  if (condition.type === 'property') {
    const lines = content.split('\n');
    for (const line of lines) {
      // Handle indented properties by removing the leading list marker
      const trimmedLine = line.trim().replace(/^- /, '');
      if (trimmedLine === `${condition.key}:: ${condition.value}`) {
        matches.push(line);
      }
    }
  } else if (condition.type === 'outgoing-link') {
    const linkRegex = /\[\[(.*?)\]\]/g;
    const outgoingLinks = new Set(
      Array.from(content.matchAll(linkRegex), (m) => m[1])
    );
    if (outgoingLinks.has(condition.target)) {
      // Return a generic match since we don't have a specific line
      matches.push(`[[${condition.target}]]`);
    }
  }
  return matches;
};

export const queryGraph =
  (graphRoot: string) =>
  async (query: string): Promise<GraphQueryResult[]> => {
    const conditionStrings = query.split(/ AND /i);
    const conditions = conditionStrings
      .map(parseCondition)
      .filter((c): c is Condition => c !== null);

    if (conditions.length === 0) {
      return [];
    }

    const results: GraphQueryResult[] = [];
    const isIgnored = await createIgnoreFilter(graphRoot);

    for await (const filePath of walk(graphRoot, isIgnored)) {
      if (!filePath.endsWith('.md')) continue;

      const content = await fs.readFile(filePath, 'utf-8');
      const allMatchingLines: string[] = [];
      let allConditionsMet = true;

      for (const condition of conditions) {
        const matchingLines = checkCondition(content, condition);
        if (matchingLines.length > 0) {
          allMatchingLines.push(...matchingLines);
        } else {
          allConditionsMet = false;
          break;
        }
      }

      if (allConditionsMet) {
        results.push({
          filePath: path.relative(graphRoot, filePath),
          matches: allMatchingLines,
        });
      }
    }
    return results;
  };

export const getBacklinks =
  (graphRoot: string) =>
  async (filePath: string): Promise<string[]> => {
    const targetWithoutExt = path.basename(filePath, path.extname(filePath));
    const targetWithExt = path.basename(filePath);

    const backlinks: string[] = [];
    const isIgnored = await createIgnoreFilter(graphRoot);

    for await (const currentFilePath of walk(graphRoot, isIgnored)) {
      // Don't link to self
      if (path.resolve(currentFilePath) === resolveSecurePath(graphRoot, filePath)) {
        continue;
      }

      if (currentFilePath.endsWith('.md')) {
        try {
          const content = await fs.readFile(currentFilePath, 'utf-8');
          // Extract all outgoing links from the current file
          const linkRegex = /\[\[(.*?)\]\]/g;
          const matches = content.matchAll(linkRegex);

          for (const match of matches) {
            if (match[1]) {
              const linkTarget = match[1].trim();
              // Check if this link points to our target file
              // Try matching against various possible formats:
              // - Exact basename without extension (e.g., "PageC")
              // - Exact basename with extension (e.g., "PageC.md")
              // - With spaces (e.g., "Page C" for "PageC")
              if (linkTarget === targetWithoutExt ||
                  linkTarget === targetWithExt ||
                  linkTarget.replace(/\s+/g, '') === targetWithoutExt ||
                  linkTarget.replace(/\s+/g, '') === targetWithExt) {
                backlinks.push(path.relative(graphRoot, currentFilePath));
                break; // Found a match, no need to check more links in this file
              }
            }
          }
        } catch {
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
    const isIgnored = await createIgnoreFilter(graphRoot);

    for await (const filePath of walk(graphRoot, isIgnored)) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        if (content.toLowerCase().includes(lowerCaseQuery)) {
          matchingFiles.push(path.relative(graphRoot, filePath));
        }
      } catch {
        // Ignore binary files or files that can't be read
      }
    }
    return matchingFiles;
  };
