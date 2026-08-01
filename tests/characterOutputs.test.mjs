import test from 'node:test'
import assert from 'node:assert/strict'
import { createCatAssembly } from '../src/core/createCatAssembly.js'
import { createCharacterCardSvg, createCharacterPackage, createCharacterPackageManifest } from '../src/export/characterCard.js'
import { auditCharacterQuality, DEVICE_MATRIX, OUTPUT_PROFILES } from '../src/export/qualityAudit.js'

test('character card and package manifest are deterministic and escaped', () => {
  const traits = { tokenId: '9', identity: { name: '<Mochi>', personality: ['勇敢'], occupation: '向导', story: '', catchphrase: '出发！' } }
  const svg = createCharacterCardSvg(traits)
  assert.match(svg, /&lt;Mochi&gt;/)
  assert.deepEqual(createCharacterPackageManifest(traits, ['cat.glb', 'card.svg', 'cat.glb']).files, ['card.svg', 'cat.glb'])
  const bundle = createCharacterPackage(traits, { 'card.svg': svg, 'traits.json': '{}' })
  assert.ok(bundle.files['manifest.json'].includes('generatorVersion'))
  assert.deepEqual(bundle.manifest.files, ['card.svg', 'manifest.json', 'traits.json'])
})

test('output profiles, device matrix and character performance audit form a quality gate', () => {
  assert.deepEqual(OUTPUT_PROFILES.turnaround.views, ['front', 'three-quarter', 'side', 'back'])
  assert.ok(DEVICE_MATRIX.some(device => device.targetFps === 30))
  const assembly = createCatAssembly({ tokenId: '5' })
  try { assert.equal(auditCharacterQuality(assembly.root).valid, true) } finally { assembly.dispose() }
})
