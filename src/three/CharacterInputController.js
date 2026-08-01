const SUPPORTED_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'Space',
])

function isTypingTarget(target) {
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)
}

export function createCharacterInputController(eventTarget) {
  const keys = new Set()
  const virtual = { x: 0, z: 0, sprinting: false, sneaking: false }
  let jumpRequested = false
  let attached = false

  function onKeyDown(event) {
    if (isTypingTarget(event.target) || !SUPPORTED_KEYS.has(event.code)) return
    keys.add(event.code)
    if (event.code === 'Space' && !event.repeat) jumpRequested = true
    event.preventDefault?.()
  }

  function onKeyUp(event) {
    keys.delete(event.code)
  }

  function attach() {
    if (attached || !eventTarget?.addEventListener) return
    eventTarget.addEventListener('keydown', onKeyDown)
    eventTarget.addEventListener('keyup', onKeyUp)
    attached = true
  }

  function detach() {
    if (attached) {
      eventTarget.removeEventListener('keydown', onKeyDown)
      eventTarget.removeEventListener('keyup', onKeyUp)
    }
    attached = false
    keys.clear()
    jumpRequested = false
  }

  function setVirtualDirection(x = 0, z = 0) {
    virtual.x = Math.max(-1, Math.min(1, Number(x) || 0))
    virtual.z = Math.max(-1, Math.min(1, Number(z) || 0))
  }

  function setVirtualAction(action, active) {
    if (action === 'jump' && active) jumpRequested = true
    else if (action === 'sprint') virtual.sprinting = Boolean(active)
    else if (action === 'sneak') virtual.sneaking = Boolean(active)
  }

  function consumeFrame() {
    const x = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0) + virtual.x
    const z = (keys.has('KeyS') ? 1 : 0) - (keys.has('KeyW') ? 1 : 0) + virtual.z
    const frame = {
      x: Math.max(-1, Math.min(1, x)),
      z: Math.max(-1, Math.min(1, z)),
      sprinting: virtual.sprinting || keys.has('ShiftLeft') || keys.has('ShiftRight'),
      sneaking: virtual.sneaking || keys.has('ControlLeft') || keys.has('ControlRight'),
      jump: jumpRequested,
    }
    jumpRequested = false
    return frame
  }

  return {
    attach, detach, dispose: detach, consumeFrame, setVirtualDirection, setVirtualAction,
    get isMoving() { return keys.has('KeyW') || keys.has('KeyA') || keys.has('KeyS') || keys.has('KeyD') || virtual.x !== 0 || virtual.z !== 0 },
  }
}
