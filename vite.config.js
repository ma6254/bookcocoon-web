import { execSync } from 'node:child_process'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function getGitCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

function getGitCommitTime() {
  try {
    return execSync('git log -1 --format=%cI HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __GIT_COMMIT__: JSON.stringify(getGitCommit()),
    __GIT_COMMIT_TIME__: JSON.stringify(getGitCommitTime()),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 38080,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:28080',
        changeOrigin: true,
      },
    }
  },
})
