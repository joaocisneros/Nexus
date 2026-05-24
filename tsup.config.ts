import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/main.ts', 'src/preload.ts'],
  outDir: 'dist',
  format: 'cjs',
  target: 'node18',
  external: ['electron', 'ollama', 'better-sqlite3'],
  clean: false,
  sourcemap: true,
})
