export const REFERENCE_IMAGE_MODES = Object.freeze(['remote', 'hybrid', 'local'])

function normalizeBase(baseUrl, fallback = '/liberty_cats_download/images') {
  const value = String(baseUrl || fallback).trim()
  return value.endsWith('/') ? value.slice(0, -1) : value
}

export function createReferenceImagePolicy({ mode = 'remote', localBaseUrl, thumbnailBaseUrl } = {}) {
  mode = REFERENCE_IMAGE_MODES.includes(mode) ? mode : 'remote'
  const baseUrl = normalizeBase(localBaseUrl)
  const previewBaseUrl = normalizeBase(thumbnailBaseUrl, '/audit/thumbnails')

  function resolve({ tokenId, extension, remoteImage }) {
    const localImage = `${baseUrl}/${tokenId}.${extension}`
    const previewImage = `${previewBaseUrl}/${tokenId}.svg`
    if (mode === 'local') return { imageUrl: previewImage, fallbackImageUrl: null, imageSource: 'preview' }
    if (mode === 'hybrid' && remoteImage) return { imageUrl: remoteImage, fallbackImageUrl: previewImage, imageSource: 'remote' }
    if (remoteImage) return { imageUrl: remoteImage, fallbackImageUrl: null, imageSource: 'remote' }
    if (mode === 'hybrid') return { imageUrl: previewImage, fallbackImageUrl: null, imageSource: 'preview' }
    return { imageUrl: null, fallbackImageUrl: null, imageSource: 'unavailable' }
  }

  return { mode, localBaseUrl: baseUrl, resolve }
}

const env = import.meta.env || {}
export const referenceImagePolicy = createReferenceImagePolicy({
  mode: env.VITE_REFERENCE_IMAGE_MODE || (env.DEV ? 'local' : 'remote'),
  localBaseUrl: env.VITE_REFERENCE_IMAGE_BASE_URL,
  thumbnailBaseUrl: env.VITE_REFERENCE_THUMBNAIL_BASE_URL,
})
