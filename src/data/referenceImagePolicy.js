export const REFERENCE_IMAGE_MODES = Object.freeze(['remote', 'hybrid', 'local'])

function normalizeBase(baseUrl) {
  const value = String(baseUrl || '/liberty_cats_download/images').trim()
  return value.endsWith('/') ? value.slice(0, -1) : value
}

export function createReferenceImagePolicy({ mode = 'remote', localBaseUrl } = {}) {
  mode = REFERENCE_IMAGE_MODES.includes(mode) ? mode : 'remote'
  const baseUrl = normalizeBase(localBaseUrl)

  function resolve({ tokenId, extension, remoteImage }) {
    const localImage = `${baseUrl}/${tokenId}.${extension}`
    if (mode === 'local') return { imageUrl: localImage, fallbackImageUrl: null, imageSource: 'local' }
    if (mode === 'hybrid' && remoteImage) return { imageUrl: remoteImage, fallbackImageUrl: localImage, imageSource: 'remote' }
    if (remoteImage) return { imageUrl: remoteImage, fallbackImageUrl: null, imageSource: 'remote' }
    if (mode === 'hybrid') return { imageUrl: localImage, fallbackImageUrl: null, imageSource: 'local' }
    return { imageUrl: null, fallbackImageUrl: null, imageSource: 'unavailable' }
  }

  return { mode, localBaseUrl: baseUrl, resolve }
}

const env = import.meta.env || {}
export const referenceImagePolicy = createReferenceImagePolicy({
  mode: env.VITE_REFERENCE_IMAGE_MODE || (env.DEV ? 'hybrid' : 'remote'),
  localBaseUrl: env.VITE_REFERENCE_IMAGE_BASE_URL,
})
