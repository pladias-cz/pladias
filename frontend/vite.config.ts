/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// __filename a __dirname v ESM modu
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'serve' ? '/' : '/assets/react/',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:9443',
        changeOrigin: true,
      },
      '/login': {
        target: 'http://localhost:9443',
        changeOrigin: true,
      },
      '/logout': {
        target: 'http://localhost:9443',
        changeOrigin: true,
      },
      '/userSettings': {
        target: 'http://localhost:9443',
        changeOrigin: true,
      },
    },
  },
  build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'src/index.tsx')
        },
        output: {
          // code splitting podle importů
          chunkFileNames: 'chunks/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          // objektová podoba manualChunks v Rolldownu (Vite 8) není podporovaná
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/.test(id)) return 'react-vendor';
            if (/[\\/]node_modules[\\/](bootstrap|react-bootstrap)[\\/]/.test(id)) return 'bootstrap-vendor';
            if (/[\\/]node_modules[\\/](leaflet|react-leaflet)[\\/]/.test(id)) return 'map-vendor';
            if (/[\\/]node_modules[\\/]@tanstack[\\/]react-table[\\/]/.test(id)) return 'table-vendor';
          }
        },
      },
      outDir: '../public/react', // výstupní složka
      emptyOutDir: true,
      manifest: true,

    },
    resolve: {
        alias: {
          '@': resolve(__dirname, 'src')
        }
      },
    test: {
        // Vitest sdílí aliasy a transformace s Vite
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
        // Pokrytí service a core vrstvy (improvements P2) – prahy nastavené
        // mírně pod hodnoty naměřené při zavedení (statements 48 %, branch 39 %,
        // function 54 %, lines 49 %) fungují jako protiregrese; aktivní jen při
        // `npm run test:coverage`, běžný `npm test` ani CI je nekontrolují.
        coverage: {
          provider: 'v8',
          include: ['src/services/**', 'src/core/**'],
          reporter: ['text', 'html'],
          thresholds: {
            statements: 45,
            branches: 35,
            functions: 50,
            lines: 45,
          },
        },
      }
    }))
