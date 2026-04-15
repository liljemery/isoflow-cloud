import { readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const rootPackageJson = JSON.parse(
  readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8')
) as { version: string };

export default defineConfig({
  define: {
    PACKAGE_VERSION: JSON.stringify(rootPackageJson.version)
  },
  plugins: [react()],
  resolve: {
    alias: {
      src: path.resolve(__dirname, '../../src')
    }
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, '../..')]
    },
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  }
});
