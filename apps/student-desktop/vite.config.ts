import { defineConfig, loadEnv } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Main-process storage settings stay out of the renderer's VITE_* variables.
  const localEnv = loadEnv(mode, __dirname, 'CONTX_MYSQL_')
  for (const [key, value] of Object.entries(localEnv)) {
    if (process.env[key] === undefined) process.env[key] = value
  }
  return {
    base: './',
    resolve: { dedupe: ['react', 'react-dom'] },
    plugins: [
      tailwindcss(),
      react(),
      electron({
        main: {
          // Shortcut of `build.lib.entry`.
          entry: 'electron/main.ts',
          // nested vite config, only applies to the main process build
          vite: {
            build: {
              rollupOptions: {
                // keep these as real require() calls instead of bundling them
                external: ['win-audio', 'events', 'mysql2/promise'],
              },
            },
          },
        },
        preload: {
          // Shortcut of `build.rollupOptions.input`.
          // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
          input: path.join(__dirname, 'electron/preload.ts'),
          vite: {
            build: {
              rollupOptions: {
                output: { entryFileNames: 'preload.cjs' },
              },
            },
          },
        },
        // Ployfill the Electron and Node.js API for Renderer process.
        // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
        // See https://github.com/electron-vite/vite-plugin-electron-renderer
        renderer: process.env.NODE_ENV === 'test'
          // https://github.com/electron-vite/vite-plugin-electron-renderer/issues/78#issuecomment-2053600808
          ? undefined
          : {},
      }),
    ],
    server: {
      watch: {
        ignored: [
          '**/electron/native/mingw/**',
          '**/electron/native/keyboard-hook/build/**',
          '**/.mysql.local/**',
          '**/release/**',
          '**/dist/**',
          '**/dist-electron/**',
        ],
      },
    },
  }
})
