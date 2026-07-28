const STATUS_LABELS = Object.freeze({ implemented: '已实现', partial: '部分实现', blocked: '待实现' })

export function getTraitStatus(type, value) {
  if (value == null) return null
  if (type === 'fur' || type === 'eyes' || type === 'face') return {
    type, value, status: 'partial', label: STATUS_LABELS.partial,
    note: '已接入独立视觉配置与参数化导出，仍需对照原 NFT 完成逐项截图验收。',
  }
  if (type === 'gear') return {
    type, value, status: 'partial', label: STATUS_LABELS.partial,
    note: '已接入统一挂点与缩放配置，仍需逐件完成正面和侧面视觉验收。',
  }
  if (type === 'special') return {
    type, value, status: 'partial', label: STATUS_LABELS.partial,
    note: '已提供程序化展示场景，但尚未完成逐像素视觉验收。',
  }
  return {
    type, value, status: 'implemented', label: STATUS_LABELS.implemented,
    note: type === 'background' ? '仅用于预览环境，不会写入角色 GLB。' : '已接入参数化角色生成与 GLB 导出流程。',
  }
}

export function getCurrentTraitStatuses(traits) {
  return [
    getTraitStatus('fur', traits.fur), getTraitStatus('eyes', traits.eyes),
    getTraitStatus('face', traits.face), getTraitStatus('gear', traits.gear),
    getTraitStatus('background', traits.background), getTraitStatus('special', traits.special),
  ].filter(Boolean)
}

export function summarizeTraitStatuses(traits) {
  const items = getCurrentTraitStatuses(traits)
  return {
    items,
    implemented: items.filter(item => item.status === 'implemented').length,
    partial: items.filter(item => item.status === 'partial').length,
    blocked: items.filter(item => item.status === 'blocked').length,
  }
}
