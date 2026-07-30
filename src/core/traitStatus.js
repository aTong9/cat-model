const STATUS_LABELS = Object.freeze({
  implemented: '已实现',
  partial: '部分实现',
  blocked: '待实现',
})

export function getTraitStatus(type, value) {
  if (value == null) return null
  return {
    type,
    value,
    status: 'implemented',
    label: STATUS_LABELS.implemented,
    note: type === 'background'
      ? '已通过环境 recipe 与全量审计；仅用于场景预览，不写入角色 GLB。'
      : '已通过独立 recipe、代表集门禁、全量 metadata 审计与 GLB 合同测试。',
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
