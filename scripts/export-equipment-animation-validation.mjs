import fs from 'node:fs/promises'
import path from 'node:path'
import { createGear } from '../src/three/EquipmentFactory.js'
import { exportEquipmentGlb } from '../src/export/exportEquipmentGlb.js'

if (!globalThis.FileReader) {
  globalThis.FileReader = class FileReader {
    readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.() }) }
  }
}

const outputDir = path.resolve('output', 'equipment-animation-validation')
await fs.mkdir(outputDir, { recursive: true })
const gear = createGear('Camera')
const { arrayBuffer, report } = await exportEquipmentGlb(gear)
await fs.writeFile(path.join(outputDir, 'camera-animated.glb'), Buffer.from(arrayBuffer))
await fs.writeFile(path.join(outputDir, 'threejs-report.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report))
