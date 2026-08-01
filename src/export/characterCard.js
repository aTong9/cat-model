import { createCatTraits } from '../core/catTraits.js'

const escapeXml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char])

export function createCharacterCardSvg(input, { width = 1200, height = 675 } = {}) {
  const traits = createCatTraits(input)
  const identity = traits.identity
  const lines = [identity.occupation, identity.personality.join(' · '), identity.catchphrase].filter(Boolean)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(identity.name || 'Liberty Cat')} character card"><rect width="100%" height="100%" rx="36" fill="#171725"/><circle cx="180" cy="180" r="112" fill="${escapeXml(traits.furColor)}"/><text x="340" y="150" fill="#f5d33d" font-family="system-ui" font-size="58" font-weight="800">${escapeXml(identity.name || `CAT #${traits.tokenId || 'NEW'}`)}</text>${lines.map((line, index) => `<text x="344" y="${220 + index * 54}" fill="#e0e0e0" font-family="system-ui" font-size="28">${escapeXml(line)}</text>`).join('')}<text x="72" y="${height - 74}" fill="#8b94ab" font-family="monospace" font-size="22">${escapeXml([traits.fur, traits.eyes, traits.face, traits.gear].filter(Boolean).join(' / '))}</text></svg>`
}

export function createCharacterPackageManifest(input, files = []) {
  const traits = createCatTraits(input)
  return Object.freeze({ schemaVersion: traits.schemaVersion, generatorVersion: traits.generatorVersion, seed: traits.seed, traits, files: [...new Set(files)].sort() })
}

export function createCharacterPackage(input, assets = {}) {
  const files = Object.keys(assets)
  const manifest = createCharacterPackageManifest(input, ['manifest.json', ...files])
  return Object.freeze({ manifest, files: Object.freeze({ ...assets, 'manifest.json': JSON.stringify(manifest, null, 2) }) })
}
