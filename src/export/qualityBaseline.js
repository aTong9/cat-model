export const QUALITY_BASELINE = Object.freeze({
  version: 2,
  seed: 414,
  views: Object.freeze(['front', 'three-quarter', 'side', 'back']),
  camera: Object.freeze({ fov: 38, target: Object.freeze([0, 0.72, 0]) }),
  morphologyExtremes: true,
  requiredOutputs: Object.freeze(['transparent', 'social', 'card', 'turnaround', 'json', 'glb']),
  tolerances: Object.freeze({ maxTriangles: 250000, maxMaterials: 80, maxFrameMsDesktop: 16.7, maxFrameMsMobile: 33.4 }),
})

export function validateQualityBaseline(value = QUALITY_BASELINE) {
  const missing = QUALITY_BASELINE.requiredOutputs.filter(output => !value.requiredOutputs?.includes(output))
  return Object.freeze({ valid: missing.length === 0 && value.views?.length === 4, missing })
}
