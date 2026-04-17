import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  base: './',

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        // Add new Phaser 4 season entries here as they are created:
        template: resolve(__dirname, 'seasons/season-phaser-template/index.html'),
        // season9: resolve(__dirname, 'seasons/season9-xxx/index.html'),
      },
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },

  resolve: {
    alias: {
      // Import shared utilities as: import { X } from '@shared/phaser/EraConfigs.js'
      '@shared': resolve(__dirname, 'shared'),
    },
  },

  server: {
    port: 3000,
    open: '/seasons/season-phaser-template/index.html',
  },
});
