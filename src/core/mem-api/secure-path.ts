import path from 'path';

/**
 * A crucial utility to prevent path traversal attacks.
 * The LLM should never be able to access files outside the knowledge graph.
 * @param graphRoot The absolute path to the root of the knowledge graph.
 * @param userPath The user-provided sub-path.
 * @returns The resolved, secure absolute path.
 * @throws If a path traversal attempt is detected.
 */
export const resolveSecurePath = (
  graphRoot: string,
  userPath: string
): string => {
  const resolvedPath = path.resolve(graphRoot, userPath);
  if (!resolvedPath.startsWith(graphRoot)) {
    throw new Error('Security Error: Path traversal attempt detected.');
  }
  return resolvedPath;
};
