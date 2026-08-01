import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: './',
  plugins: [vue()],
  server: {
    port: 1118,
    open: true,
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
})
