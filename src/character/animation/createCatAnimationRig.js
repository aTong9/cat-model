const PART_IDS = Object.freeze({
  body: 'body', head: 'head', earLeft: 'ear-left', earRight: 'ear-right',
  armLeft: 'arm-left', armRight: 'arm-right', legLeft: 'leg-left', legRight: 'leg-right', tail: 'tail', face: 'face',
  motionRoot: 'motion-root',
})

export function createCatAnimationRig({ root, registry, updateTail, getRunSpeed, getActionParameters, actionProps }) {
  const parts = Object.freeze(Object.fromEntries(
    Object.entries(PART_IDS).map(([key, partId]) => [key, registry.getPart(partId)]),
  ))
  return Object.freeze({
    root,
    parts,
    getRunSpeed,
    getActionParameters,
    updateTail,
    actionProps,
    getJoints: partId => registry.getJoints(partId),
    getJointsFor: part => registry.getJoints(registry.getPartId(part)),
  })
}
