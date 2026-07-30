export class EditorHistory {
  constructor(initialState, { limit = 50 } = {}) {
    this.limit = limit
    this.past = []
    this.present = structuredClone(initialState)
    this.future = []
  }

  push(state) {
    const next = structuredClone(state)
    if (JSON.stringify(next) === JSON.stringify(this.present)) return false
    this.past.push(this.present)
    if (this.past.length > this.limit) this.past.shift()
    this.present = next
    this.future = []
    return true
  }

  undo() {
    if (!this.past.length) return null
    this.future.unshift(this.present)
    this.present = this.past.pop()
    return structuredClone(this.present)
  }

  redo() {
    if (!this.future.length) return null
    this.past.push(this.present)
    this.present = this.future.shift()
    return structuredClone(this.present)
  }

  get canUndo() { return this.past.length > 0 }
  get canRedo() { return this.future.length > 0 }
}
