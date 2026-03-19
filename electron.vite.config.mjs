import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

/**
 * Copies all .js files from src/main/ → out/main/ and src/shared/ → out/shared/
 * after each Rollup build. Required because electron-vite bundles main/index.js
 * into a single file, while the IPC handler sub-modules use createRequire() and
 * need to be physically present in out/main/ipc/, out/main/services/ etc.
 */
function copyMainSourcePlugin() {
  function copyDir(src, dst, isRoot = false) {
    mkdirSync(dst, { recursive: true })
    for (const entry of readdirSync(src)) {
      if (entry === 'node_modules') continue
      // Skip index.js at the root — Rollup already builds it
      if (isRoot && entry === 'index.js') continue
      const srcPath = join(src, entry)
      const dstPath = join(dst, entry)
      if (statSync(srcPath).isDirectory()) {
        copyDir(srcPath, dstPath, false)
      } else if (entry.endsWith('.js') || entry.endsWith('.cjs')) {
        copyFileSync(srcPath, dstPath)
      }
    }
  }

  return {
    name: 'copy-main-source',
    // Runs after rollup finishes outputting files
    closeBundle() {
      const mainSrc = resolve('src/main')
      const mainDst = resolve('out/main')
      const sharedSrc = resolve('src/shared')
      const sharedDst = resolve('out/shared')
      try {
        copyDir(mainSrc, mainDst, true)  // true = skip root index.js
        copyDir(sharedSrc, sharedDst)
        console.log('[copy-main-source] ✓ Copied src/main + src/shared to out/')
      } catch (e) {
        console.warn('[copy-main-source] Copy failed:', e.message)
      }
    }
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), copyMainSourcePlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
        '@main':   resolve('src/main')
      }
    },
    build: {
      rollupOptions: {
        external: [
          'ssh2',
          'mysql2',
          'pg',
          'mongodb',
          'ioredis',
          'axios',
          'archiver',
          '@mhoc/axios-digest-auth',
          'piscina',
          'google-auth-library',
        ]
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared':   resolve('src/shared')
      }
    },
    plugins: [react()],
    css: {
      postcss: './postcss.config.js'
    }
  }
})
