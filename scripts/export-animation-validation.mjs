import fs from 'node:fs/promises'
import path from 'node:path'
import { createCatAssembly } from '../src/core/createCatAssembly.js'
import { exportCharacterGlb } from '../src/export/exportCharacterGlb.js'

if (!globalThis.FileReader) {
  globalThis.FileReader = class FileReader {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.() })
    }
  }
}

const outputDir = path.resolve('output', 'animation-validation')
await fs.mkdir(outputDir, { recursive: true })
const assembly = createCatAssembly({ tokenId: '414', seed: 414, fur: 'Calico', eyes: 'Blue Ring', face: 'Wow', gear: 'Ramen' })
try {
  const animations = assembly.model.createExportAnimationClips({ fps: 30 })
  const { arrayBuffer, report } = await exportCharacterGlb(assembly.root, { animations })
  await fs.writeFile(path.join(outputDir, 'liberty-cat-414-animated.glb'), Buffer.from(arrayBuffer))
  await fs.writeFile(path.join(outputDir, 'compatibility-report.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    animationNames: report.roundTrip.animationNames,
    compatibility: report.roundTrip.compatibility,
    stats: report.roundTrip.stats,
    bytes: report.bytes,
    note: 'Automated glTF 2.0 round-trip validation. Final editor-specific import validation requires Blender, Unity and Unreal Editor.',
  }, null, 2))
  console.log(`Wrote ${animations.length} clips to ${outputDir}`)
} finally {
  assembly.dispose()
}
