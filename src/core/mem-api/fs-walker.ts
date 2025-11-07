import { promises as fs } from 'fs';
import path from 'path';

/**
 * Asynchronously and recursively walks a directory, yielding the full path of each file.
 * @param dir The directory to walk.
 * @returns An async generator that yields file paths.
 */
export async function* walk(dir: string): AsyncGenerator<string> {
  for await (const d of await fs.opendir(dir)) {
    const entry = path.join(dir, d.name);
    if (d.isDirectory()) {
      yield* walk(entry);
    } else if (d.isFile()) {
      yield entry;
    }
  }
}