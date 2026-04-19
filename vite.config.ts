import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          const normalizedId = id.replace(/\\/g, '/');

          if (normalizedId.includes('/three/')) {
            return 'three-core';
          }

          if (
            normalizedId.includes('/@react-three/fiber/') ||
            normalizedId.includes('/@react-three/drei/') ||
            normalizedId.includes('/three-stdlib/')
          ) {
            return 'three-react';
          }

          if (
            normalizedId.includes('/leva/') ||
            normalizedId.includes('/zustand/') ||
            normalizedId.includes('/@radix-ui/')
          ) {
            return 'controls';
          }

          return 'vendor';
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});
