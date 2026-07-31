export const EXPORT_PRESETS = Object.freeze({
  game: Object.freeze({ id: 'game', label: '游戏运行时', includeBuiltInAnimations: true, includeCustomAnimation: true, includeMetadata: true }),
  editor: Object.freeze({ id: 'editor', label: 'DCC 编辑', includeBuiltInAnimations: true, includeCustomAnimation: true, includeMetadata: true }),
  static: Object.freeze({ id: 'static', label: '静态模型', includeBuiltInAnimations: false, includeCustomAnimation: false, includeMetadata: true }),
})

export function createExportRequest(input = {}) {
  const preset = EXPORT_PRESETS[input.preset] ?? EXPORT_PRESETS.game
  return Object.freeze({
    schemaVersion: 1,
    target: input.target === 'equipment' ? 'equipment' : 'character',
    preset: preset.id,
    format: 'glb',
    binary: true,
    includeBuiltInAnimations: input.includeBuiltInAnimations ?? preset.includeBuiltInAnimations,
    includeCustomAnimation: input.includeCustomAnimation ?? preset.includeCustomAnimation,
    includeMetadata: input.includeMetadata ?? preset.includeMetadata,
    filename: String(input.filename || '').trim() || null,
  })
}

export function serializeExportRequest(input) {
  return JSON.stringify(createExportRequest(input), null, 2)
}
