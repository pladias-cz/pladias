import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// __filename a __dirname v ESM modu
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "serve" ? "/" : "/assets/react/",
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:9443",
        changeOrigin: true,
      },
      "/login": {
        target: "http://localhost:9443",
        changeOrigin: true,
      },
      "/logout": {
        target: "http://localhost:9443",
        changeOrigin: true,
      },
      "/userSettings": {
        target: "http://localhost:9443",
        changeOrigin: true,
      },
    },
  },
  build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, "src/index.tsx")
        },
        output: {
          // code splitting podle importů
          chunkFileNames: "chunks/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'bootstrap-vendor': ['bootstrap', 'react-bootstrap'],
            'map-vendor': ['leaflet', 'react-leaflet'],
            'table-vendor': ['@tanstack/react-table']
          }
        },
      },
      outDir: "../public/react", // výstupní složka
      emptyOutDir: true,
      manifest: true,

    },
    resolve: {
        alias: {
          '@': resolve(__dirname, 'src')
        }
      }
    }))
