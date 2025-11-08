import { promises as fs } from 'fs';
import path from 'path';

/**
 * Asynchronously and recursively walks a directory, yielding the full path of each file.
 * @param dir The directory to walk.
 * @param isIgnored Optional function to determine if a path should be ignored.
 * @returns An async generator that yields file paths.
 */
export async function* walk(
  dir: string,
  isIgnored: (path: string) => boolean = () => false
): AsyncGenerator<string> {
  for await (const d of await fs.opendir(dir)) {
    const entry = path.join(dir, d.name);
    
    // Skip ignored entries
    if (isIgnored(entry)) {
      continue;
    }
    
    if (d.isDirectory()) {
      yield* walk(entry, isIgnored);
    } else if (d.isFile()) {
      yield entry;
    }
  }
}
