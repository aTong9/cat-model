export function createRenderLifecycleController({
  canvas,
  documentTarget,
  ResizeObserverClass,
  onResize = () => {},
  onPause = () => {},
  onResume = () => {},
  onContextLost = () => {},
  onContextRestored = () => {},
}) {
  if (!canvas) throw new Error('RenderLifecycleController requires a canvas')
  let attached = false
  let contextLost = false
  let resizeObserver = null

  function isHidden() { return Boolean(documentTarget?.hidden) }
  function syncActivity() {
    if (isHidden() || contextLost) onPause()
    else onResume()
  }
  function handleVisibility() { syncActivity() }
  function handleContextLost(event) {
    event.preventDefault?.()
    contextLost = true
    onContextLost()
    syncActivity()
  }
  function handleContextRestored() {
    contextLost = false
    onContextRestored()
    onResize()
    syncActivity()
  }

  function attach() {
    if (attached) return
    documentTarget?.addEventListener?.('visibilitychange', handleVisibility)
    canvas.addEventListener?.('webglcontextlost', handleContextLost)
    canvas.addEventListener?.('webglcontextrestored', handleContextRestored)
    if (ResizeObserverClass) {
      resizeObserver = new ResizeObserverClass(onResize)
      resizeObserver.observe(canvas)
    }
    attached = true
    onResize()
    syncActivity()
  }

  function dispose() {
    if (!attached) return
    documentTarget?.removeEventListener?.('visibilitychange', handleVisibility)
    canvas.removeEventListener?.('webglcontextlost', handleContextLost)
    canvas.removeEventListener?.('webglcontextrestored', handleContextRestored)
    resizeObserver?.disconnect?.()
    resizeObserver = null
    attached = false
    onPause()
  }

  return { attach, dispose, get active() { return attached && !isHidden() && !contextLost }, get isContextLost() { return contextLost } }
}
