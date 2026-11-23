import { defineConfig, loadEnv } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { existsSync } from 'node:fs'
import { connect } from 'node:net'
import { spawn } from 'node:child_process'

function mysqlIsListening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host: '127.0.0.1', port })
    const finish = (ready: boolean) => { socket.destroy(); resolve(ready) }
    socket.setTimeout(500)
    socket.once('connect', () => finish(true))
    socket.once('error', () => finish(false))
    socket.once('timeout', () => finish(false))
  })
}

async function startConfiguredMysql() {
  // Opt-in per machine; existing services and teammate setups remain independent.
  const executable = process.env.CONTX_MYSQL_EXECUTABLE
  if (!executable) return
  const port = Number(process.env.CONTX_MYSQL_PORT ?? 3306)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid local MySQL port.')
  if (await mysqlIsListening(port)) return
  const config = process.env.CONTX_MYSQL_CONFIG
  if (!config || !path.isAbsolute(executable) || !path.isAbsolute(config) ||
      !existsSync(executable) || !existsSync(config)) {
    throw new Error('Check CONTX_MYSQL_EXECUTABLE and CONTX_MYSQL_CONFIG in your local environment file.')
  }
  console.log('Starting local MySQL…')
  const child = spawn(executable, [`--defaults-file=${config}`], {
    // A detached Windows child gets its own console. Unref still lets Vite exit.
    detached: process.platform !== 'win32', windowsHide: true, stdio: 'ignore',
  })
  let stopped = false
  child.once('error', () => { stopped = true })
  child.once('exit', () => { stopped = true })
  child.unref()
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await mysqlIsListening(port)) return
    if (stopped) break
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error('Local MySQL did not start. Check its error log before trying again.')
}

// https://vitejs.dev/config/
export default defineConfig(async ({ mode, command, isPreview }) => {
  // Main-process storage settings stay out of the renderer's VITE_* variables.
  const localEnv = loadEnv(mode, __dirname, ['CONTX_MYSQL_', 'CONTX_OFFLINE_STORAGE'])
  const publicEnv = loadEnv(mode, __dirname, 'VITE_SUPABASE_')
  for (const [key, value] of Object.entries(localEnv)) {
    if (process.env[key] === undefined) process.env[key] = value
  }
  if (command === 'serve' && !isPreview && process.env.CONTX_OFFLINE_STORAGE !== 'embedded') {
    await startConfiguredMysql()
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
            define: {
              'process.env.CONTX_SUPABASE_URL': JSON.stringify(publicEnv.VITE_SUPABASE_URL ?? ''),
              'process.env.CONTX_SUPABASE_ANON_KEY': JSON.stringify(publicEnv.VITE_SUPABASE_ANON_KEY ?? ''),
            },
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
