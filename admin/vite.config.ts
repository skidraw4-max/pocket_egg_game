import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [react()],
  envDir: path.resolve(import.meta.dirname, '..'),
  root: import.meta.dirname,
  build: {
    outDir: path.resolve(import.meta.dirname, '../dist/admin'),
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    host: true,
  },
});
