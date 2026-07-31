import * as THREE from 'three'

const EMPTY_JOINTS = Object.freeze({})

export class CharacterPartRegistry {
  constructor(root) {
    this.root = root
    this._parts = new Map()
    this._sockets = new Map()
    this._joints = new Map()
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

  createSocket(name, parent, position = [0, 0, 0]) {
    if (!parent?.isObject3D) throw new Error(`Invalid socket parent: ${name}`)
    const socket = new THREE.Group()
    socket.name = `Socket:${name}`
    socket.position.set(...position)
    parent.add(socket)
    return this.registerSocket(name, socket)
  }

  getPart(name) { return this._parts.get(name) ?? null }
  getSocket(name) { return this._sockets.get(name) ?? null }
  getPartId(object) {
    for (const [partId, part] of this._parts) {
      if (part === object) return partId
    }
    return null
  }
  registerJoints(partId, joints) {
    if (!this._parts.has(partId) || !joints) throw new Error(`Invalid character joints: ${partId}`)
    this._joints.set(partId, Object.freeze({ ...joints }))
    return this._joints.get(partId)
  }
  getJoints(partId) { return this._joints.get(partId) ?? EMPTY_JOINTS }
  createManifest({ contractVersion = 1, coordinates = null } = {}) {
    const transform = object => Object.freeze({
      name: object.name,
      position: Object.freeze(object.position.toArray()),
      rotation: Object.freeze(object.rotation.toArray().slice(0, 3)),
      scale: Object.freeze(object.scale.toArray()),
    })
    return Object.freeze({
      contractVersion,
      coordinates: coordinates ? Object.freeze({ ...coordinates }) : null,
      parts: Object.freeze(Object.fromEntries([...this._parts].map(([id, object]) => [id, transform(object)]))),
      joints: Object.freeze(Object.fromEntries([...this._joints].map(([partId, joints]) => [
        partId,
        Object.freeze(Object.fromEntries(Object.entries(joints).map(([id, object]) => [id, transform(object)]))),
      ]))),
      sockets: Object.freeze(Object.fromEntries([...this._sockets].map(([id, object]) => [id, transform(object)]))),
    })
  }
  hasPart(name) { return this._parts.has(name) }
  hasSocket(name) { return this._sockets.has(name) }
  get partNames() { return [...this._parts.keys()] }
  get socketNames() { return [...this._sockets.keys()] }
}
