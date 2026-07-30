import { OUTPUT_PROFILES } from './qualityAudit.js'

function canvasBlob(canvas, type = 'image/png') {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas encoding failed')), type))
}

const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))

export async function captureViewSet(canvas, { views = OUTPUT_PROFILES.turnaround.views, setView, wait = nextFrame } = {}) {
  if (!canvas?.toBlob || typeof setView !== 'function') throw new Error('Canvas and setView are required')
  const captures = []
  for (const view of views) {
    await setView(view)
    await wait()
    captures.push(Object.freeze({ view, blob: await canvasBlob(canvas) }))
  }
  return Object.freeze(captures)
}

export async function captureOutput(canvas, profile = 'transparent', { createCanvas = () => document.createElement('canvas') } = {}) {
  const spec = OUTPUT_PROFILES[profile]
  if (!spec || spec.views) throw new Error(`Unknown output profile: ${profile}`)
  const output = createCanvas()
  output.width = spec.width; output.height = spec.height
  const context = output.getContext('2d')
  if (!spec.alpha) { context.fillStyle = '#171725'; context.fillRect(0, 0, spec.width, spec.height) }
  const scale = Math.min(spec.width / canvas.width, spec.height / canvas.height)
  const width = canvas.width * scale; const height = canvas.height * scale
  context.drawImage(canvas, (spec.width - width) / 2, (spec.height - height) / 2, width, height)
  let cornerAlpha = null
  try { cornerAlpha = context.getImageData(0, 0, 1, 1).data[3] } catch { /* Canvas may be origin-tainted. */ }
  return Object.freeze({ profile, spec, cornerAlpha, blob: await canvasBlob(output) })
}
