const PART_IDS = Object.freeze({
  body: 'body', head: 'head', earLeft: 'ear-left', earRight: 'ear-right',
  armLeft: 'arm-left', armRight: 'arm-right', legLeft: 'leg-left', legRight: 'leg-right', tail: 'tail',
})

export function createCatAnimationRig({ root, registry, updateTail, getRunSpeed }) {
  const parts = Object.freeze(Object.fromEntries(
    Object.entries(PART_IDS).map(([key, partId]) => [key, registry.getPart(partId)]),
  ))
  return Object.freeze({
    root,
    parts,
    getRunSpeed,
    updateTail,
    getJoints: partId => registry.getJoints(partId),
    getJointsFor: part => registry.getJoints(registry.getPartId(part)),
  })
}
