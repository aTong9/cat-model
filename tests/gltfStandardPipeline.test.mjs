import test from 'node:test'
import assert from 'node:assert/strict'
import { createCatAssembly } from '../src/core/createCatAssembly.js'
import { exportCharacterGlb } from '../src/export/exportCharacterGlb.js'
import { optimizeStandardGlb, validateStandardGlb } from '../src/export/gltfStandardPipeline.js'

if (!globalThis.FileReader) {
  globalThis.FileReader = class FileReader {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.() })
    }
  }
}

test('character GLB passes Khronos validation and optional Meshopt optimization', async () => {
  const assembly = createCatAssembly({ tokenId: '414', fur: 'Calico', eyes: 'Blue Ring', face: 'Wow' })
  try {
    const original = await exportCharacterGlb(assembly.root)
    assert.equal(original.report.standardValidation.valid, true)
    const optimized = await optimizeStandardGlb(original.arrayBuffer)
    const validation = await validateStandardGlb(optimized)
    assert.equal(validation.valid, true, JSON.stringify(validation.messages))
    assert.ok(optimized.byteLength > 0)
  } finally { assembly.dispose() }
})
