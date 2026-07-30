import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'node:fs'
import path from 'node:path'

function libertyCatsLocalImages() {
  const imagesRoot = path.resolve(process.cwd(), 'liberty_cats_download', 'images')
  const allowedFile = /^\d+\.(?:png|webp|jpe?g|gif)$/i
  const mimeTypes = { '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif' }
  const mount = server => {
    server.middlewares.use('/liberty_cats_download/images', (request, response, next) => {
      const fileName = decodeURIComponent(String(request.url || '').split('?')[0]).replace(/^\/+/, '')
      if (!allowedFile.test(fileName)) return next()
      const filePath = path.resolve(imagesRoot, fileName)
      if (path.dirname(filePath) !== imagesRoot || !fs.existsSync(filePath)) return next()
      response.setHeader('Content-Type', mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream')
      response.setHeader('Cache-Control', 'public, max-age=3600')
      fs.createReadStream(filePath).on('error', next).pipe(response)
    })
  }
  return { name: 'liberty-cats-local-images', configureServer: mount, configurePreviewServer: mount }
}

export default defineConfig({
  plugins: [vue(), libertyCatsLocalImages()],
  server: {
    port: 1118,
    open: true,
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
})
