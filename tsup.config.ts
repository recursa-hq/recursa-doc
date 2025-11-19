import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm', 'cjs'],
  target: 'es2022',
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['fastmcp', 'dotenv', 'simple-git', 'zod'],
  platform: 'node',
  outDir: 'dist',
  onSuccess: 'echo "Build completed successfully!"',
});