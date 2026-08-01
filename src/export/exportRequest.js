export const EXPORT_PRESETS = Object.freeze({
  game: Object.freeze({
    id: 'game', label: '游戏运行时', labelKey: 'panel.export.exportPresets.game', includeBuiltInAnimations: true, includeCustomAnimation: true,
    includeMetadata: true, optimize: true, meshopt: true,
    budget: Object.freeze({ maxTriangles: 180000, maxMaterials: 64, maxMeshes: 140, maxBytes: 12 * 1024 * 1024 }),
  }),
  dcc: Object.freeze({
    id: 'dcc', label: 'DCC 编辑', labelKey: 'panel.export.exportPresets.dcc', includeBuiltInAnimations: true, includeCustomAnimation: true,
    includeMetadata: true, optimize: false, meshopt: false,
    budget: Object.freeze({ maxTriangles: 250000, maxMaterials: 80, maxMeshes: 160, maxBytes: 32 * 1024 * 1024 }),
  }),
  static: Object.freeze({
    id: 'static', label: '静态模型', labelKey: 'panel.export.exportPresets.static', includeBuiltInAnimations: false, includeCustomAnimation: false,
    includeMetadata: true, optimize: true, meshopt: true,
    budget: Object.freeze({ maxTriangles: 180000, maxMaterials: 64, maxMeshes: 140, maxBytes: 10 * 1024 * 1024 }),
  }),
})

export function createExportRequest(input = {}) {
  const preset = EXPORT_PRESETS[input.preset === 'editor' ? 'dcc' : input.preset] ?? EXPORT_PRESETS.game
  return Object.freeze({
    schemaVersion: 1,
    target: input.target === 'equipment' ? 'equipment' : 'character',
    preset: preset.id,
    format: 'glb',
    binary: true,
    includeBuiltInAnimations: input.includeBuiltInAnimations ?? preset.includeBuiltInAnimations,
    includeCustomAnimation: input.includeCustomAnimation ?? preset.includeCustomAnimation,
    includeMetadata: input.includeMetadata ?? preset.includeMetadata,
    optimize: input.optimize ?? preset.optimize,
    meshopt: input.meshopt ?? preset.meshopt,
    budget: preset.budget,
    filename: String(input.filename || '').trim() || null,
  })
}

export function validateExportBudget(report, requestInput = {}) {
  const request = createExportRequest(requestInput)
  const stats = report?.audit?.stats ?? {}
  const failures = []
  if ((stats.triangles ?? 0) > request.budget.maxTriangles) failures.push(`triangles:${stats.triangles}`)
  if ((stats.materials ?? 0) > request.budget.maxMaterials) failures.push(`materials:${stats.materials}`)
  if ((stats.meshes ?? 0) > request.budget.maxMeshes) failures.push(`meshes:${stats.meshes}`)
  if ((report?.bytes ?? 0) > request.budget.maxBytes) failures.push(`bytes:${report.bytes}`)
  return Object.freeze({ valid: failures.length === 0, preset: request.preset, failures: Object.freeze(failures), budget: request.budget })
}

export function serializeExportRequest(input) {
  return JSON.stringify(createExportRequest(input), null, 2)
}
