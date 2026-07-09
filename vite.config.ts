import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 1800,
  },
  test: {
    environment: 'node',
    globals: true,
  },
});
