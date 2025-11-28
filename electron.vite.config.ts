import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import monacoEditorPlugin_ from 'vite-plugin-monaco-editor';

// @ts-ignore - CommonJS import
const monacoEditorPlugin = (monacoEditorPlugin_ as any).default || monacoEditorPlugin_;

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'src/main/main.ts'),
          duckdbWorker: path.resolve(__dirname, 'src/main/workers/duckdbWorker.ts'),
        },
        output: {
          entryFileNames: (chunk) => {
            if (chunk.name === 'duckdbWorker') {
              return 'workers/[name].js';
            }
            return '[name].js';
          },
        },
        external: ['@duckdb/node-api'],
      },
    },
    resolve: {
      alias: {
        '@main': path.resolve(__dirname, 'src/main'),
        '@shared': path.resolve(__dirname, 'src/shared')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': path.resolve(__dirname, 'src/shared')
      }
    }
  },
  renderer: {
    plugins: [
      react(),
      monacoEditorPlugin({
        languageWorkers: ['editorWorkerService'],
        publicPath: 'monacoeditorwork',
        customDistPath: (root: string, buildOutDir: string) => {
          return path.join(buildOutDir, 'monacoeditorwork');
        }
      })
    ],
    resolve: {
      alias: {
        '@renderer': path.resolve(__dirname, 'src/renderer'),
        '@shared': path.resolve(__dirname, 'src/shared')
      }
    },
    css: {
      postcss: './postcss.config.js'
    }
  }
});
