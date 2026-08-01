const DIRECTIONS = Object.freeze({
  forward: { x: 0, z: 1, yaw: 0 },
  backward: { x: 0, z: -1, yaw: Math.PI },
  left: { x: -1, z: 0, yaw: -Math.PI / 2 },
  right: { x: 1, z: 0, yaw: Math.PI / 2 },
})

export class GridHopController {
  constructor({ columns = 7, hopDuration = 0.22, maxQueue = 2, isBlocked = () => false } = {}) {
    this.columns = columns
    this.hopDuration = hopDuration
    this.maxQueue = maxQueue
    this.isBlocked = isBlocked
    this.grid = { x: 0, z: 0 }
    this.visual = { x: 0, y: 0, z: 0, yaw: 0 }
    this.queue = []
    this.active = null
    this.enabled = true
    this.maxForward = 0
  }

  enqueue(direction) {
    if (!this.enabled || !DIRECTIONS[direction] || this.queue.length >= this.maxQueue) return false
    this.queue.push(direction)
    return true
  }

  update(delta) {
    if (!this.active && this.queue.length) this.#begin(this.queue.shift())
    if (!this.active) return this.visual
    this.active.elapsed = Math.min(this.hopDuration, this.active.elapsed + Math.max(0, delta))
    const t = this.active.elapsed / this.hopDuration
    const eased = t * t * (3 - 2 * t)
    this.visual.x = this.active.from.x + (this.active.to.x - this.active.from.x) * eased
    this.visual.z = this.active.from.z + (this.active.to.z - this.active.from.z) * eased
    this.visual.y = Math.sin(Math.PI * t) * 0.34
    this.visual.yaw = this.active.yaw
    if (t >= 1) {
      this.grid = { ...this.active.to }
      this.maxForward = Math.max(this.maxForward, this.grid.z)
      this.visual.y = 0
      this.active = null
    }
    return this.visual
  }

  #begin(direction) {
    const move = DIRECTIONS[direction]
    const target = { x: this.grid.x + move.x, z: this.grid.z + move.z }
    const half = Math.floor(this.columns / 2)
    if (Math.abs(target.x) > half || target.z < 0 || this.isBlocked(target.x, target.z)) return
    this.active = { from: { ...this.grid }, to: target, yaw: move.yaw, elapsed: 0 }
  }

  reset() {
    this.grid = { x: 0, z: 0 }
    this.visual = { x: 0, y: 0, z: 0, yaw: 0 }
    this.queue.length = 0
    this.active = null
    this.enabled = true
    this.maxForward = 0
  }
}
