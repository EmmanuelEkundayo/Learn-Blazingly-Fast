/// <reference types="vitest/config" />
import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['d3'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    css: false,
  },
  server: {
    proxy: {
      '/api/hint': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: () => '/v1/messages',
        configure(proxy) {
          proxy.on('proxyReq', (proxyReq) => {
            const key = process.env.ANTHROPIC_API_KEY
            if (key) proxyReq.setHeader('x-api-key', key)
            proxyReq.setHeader('anthropic-version', '2023-06-01')
          })
        },
      },
      '/api/v1/reviews': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/v1/leaderboard': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('d3')) return 'vendor-d3'
            if (id.includes('framer-motion')) return 'vendor-framer'
            if (id.includes('html2canvas') || id.includes('jspdf')) return 'vendor-export'
            if (id.includes('@monaco-editor') || id.includes('monaco-editor')) return 'vendor-monaco'
            if (id.includes('react') || id.includes('zustand') || id.includes('react-router')) return 'vendor-core'
          }
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
})
