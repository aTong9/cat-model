export class CharacterPartRegistry {
  constructor(root) {
    this.root = root
    this._parts = new Map()
    this._sockets = new Map()
  }

  registerPart(name, object) {
    if (!name || !object?.isObject3D) throw new Error(`Invalid character part: ${name}`)
    this._parts.set(name, object)
    return object
  }

  registerSocket(name, object) {
    if (!name || !object?.isObject3D) throw new Error(`Invalid character socket: ${name}`)
    this._sockets.set(name, object)
    this.root.userData.socketNames = [...this._sockets.keys()]
    return object
  }

  getPart(name) { return this._parts.get(name) ?? null }
  getSocket(name) { return this._sockets.get(name) ?? null }
  hasPart(name) { return this._parts.has(name) }
  hasSocket(name) { return this._sockets.has(name) }
  get partNames() { return [...this._parts.keys()] }
  get socketNames() { return [...this._sockets.keys()] }
}
