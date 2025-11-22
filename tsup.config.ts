import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm', 'cjs'],
  target: 'es2022',
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  shims: true,
  external: ['fastmcp', 'dotenv', 'simple-git', 'zod'],
  platform: 'node',
  outDir: 'dist',
  publicDir: 'docs',
  onSuccess: 'echo "Build completed successfully!"',
});