import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { disposeObject3DResources } from '../resources/disposeObject3DResources.js'
import { PACK5_SOURCE_DURATIONS } from '../../config/emojiActions.js'

const standard = (color, metalness = 0, roughness = .5) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness })

function mesh(geometry, material, name) {
  const value = new THREE.Mesh(geometry, material)
  value.name = name.replaceAll(':', '_')
  value.castShadow = true
  return value
}

function dumbbell(name) {
  const root = new THREE.Group()
  root.name = name
  const bar = mesh(new THREE.CylinderGeometry(.025, .025, .26, 12), standard('#9aa3ad', .8, .22), `${name}:bar`)
  bar.rotation.z = Math.PI / 2
  root.add(bar)
  for (const x of [-.14, .14]) {
    const weight = mesh(new THREE.CylinderGeometry(.075, .075, .065, 16), standard('#303844', .55, .28), `${name}:weight`)
    weight.rotation.z = Math.PI / 2
    weight.position.x = x
    root.add(weight)
  }
  return root
}

const WORLD_PROP_IDS = new Set(['emoji-pull-up', 'emoji-bench-press', 'emoji-yoga'])

function jumpRope() {
  const root = new THREE.Group()
  root.name = 'ActionProp_JumpRope'
  const positions = new Float32Array(33 * 3)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const cord = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#f28b25' }))
  cord.name = 'JumpRope_Cord'
  root.add(cord)
  const beads = []
  const beadMaterial = standard('#f28b25', .02, .38)
  const beadGeometry = new THREE.SphereGeometry(.020, 10, 8)
  for (let index = 0; index < 17; index++) {
    const bead = mesh(
      beadGeometry,
      beadMaterial,
      `JumpRope_Bead_${index}`,
    )
    beads.push(bead)
    root.add(bead)
  }
  const handles = []
  for (const side of [-1, 1]) {
    const handle = mesh(
      new THREE.CylinderGeometry(.024, .024, .16, 14),
      standard('#f28b25', .08, .34),
      side < 0 ? 'JumpRope_HandleLeft' : 'JumpRope_HandleRight',
    )
    handles.push(handle)
    root.add(handle)
  }
  root.userData.cord = cord
  root.userData.beads = beads
  root.userData.handles = handles
  return root
}

function createProps() {
  const props = {}

  props['emoji-jump-rope'] = jumpRope()

  const weights = new THREE.Group()
  weights.name = 'ActionProp_Dumbbells'
  const leftWeight = dumbbell('DumbbellLeft'); leftWeight.position.set(-.62, .60, .42)
  const rightWeight = dumbbell('DumbbellRight'); rightWeight.position.set(.62, .60, .42)
  weights.add(leftWeight, rightWeight)
  props['emoji-dumbbells'] = weights

  const pullUp = new THREE.Group()
  pullUp.name = 'ActionProp_PullUpBar'
  const pullBar = mesh(new THREE.CylinderGeometry(.035, .035, 1.45, 16), standard('#56616e', .7, .25), 'PullUpBar')
  pullBar.rotation.z = Math.PI / 2; pullBar.position.set(0, .98, .42)
  pullUp.add(pullBar)
  props['emoji-pull-up'] = pullUp

  const bench = new THREE.Group()
  bench.name = 'ActionProp_BenchPress'
  const pad = mesh(new RoundedBoxGeometry(1.08, .16, .48, 3, .05), standard('#a9444b', 0, .55), 'BenchPress:Pad')
  pad.position.set(0, .25, -.50)
  pad.rotation.x = -.16
  const benchBar = mesh(
    new THREE.CylinderGeometry(.032, .032, 2.20, 16),
    standard('#737e8a', .78, .20),
    'BenchPress_Bar',
  )
  benchBar.rotation.z = Math.PI / 2
  benchBar.name = 'BenchPress_Bar'; benchBar.position.set(0, .94, .38)
  const plateMat = standard('#353b45', .45, .28)
  for (const x of [-1.02, 1.02]) {
    const plate = mesh(new THREE.CylinderGeometry(.19, .19, .075, 20), plateMat, `BenchPress_Plate_${x < 0 ? 'Left' : 'Right'}`)
    plate.rotation.z = Math.PI / 2; plate.position.set(x, .94, .38); bench.add(plate)
  }
  bench.add(pad, benchBar)
  props['emoji-bench-press'] = bench

  const hoop = new THREE.Group()
  hoop.name = 'ActionProp_HulaHoop'
  const hoopMesh = mesh(new THREE.TorusGeometry(.78, .026, 10, 64), standard('#ffcf42', .15, .3), 'HulaHoop')
  hoopMesh.rotation.x = Math.PI / 2; hoopMesh.position.y = .08
  hoop.add(hoopMesh)
  props['emoji-hula-hoop'] = hoop

  const boxing = new THREE.Group()
  boxing.name = 'ActionProp_BoxingGloves'
  const gloveMaterial = standard('#ff5a18', .02, .34)
  for (const side of [-1, 1]) {
    const glove = new THREE.Group()
    glove.name = side < 0 ? 'BoxingGloveLeft' : 'BoxingGloveRight'
    const body = mesh(new THREE.SphereGeometry(.18, 24, 18), gloveMaterial, `${glove.name}:Body`)
    body.scale.set(1.18, 1.02, 1.30)
    body.position.z = .10
    const thumb = mesh(new THREE.SphereGeometry(.075, 16, 12), gloveMaterial, `${glove.name}:Thumb`)
    thumb.scale.set(.78, 1.10, .82)
    thumb.position.set(side * .13, -.035, .08)
    const cuff = mesh(new THREE.CylinderGeometry(.095, .115, .11, 18), gloveMaterial, `${glove.name}:Cuff`)
    cuff.rotation.x = Math.PI / 2
    cuff.position.z = -.07
    glove.add(body, thumb, cuff)
    boxing.add(glove)
  }
  props['emoji-boxing'] = boxing

  const mat = new THREE.Group()
  mat.name = 'ActionProp_YogaMat'
  const matMesh = mesh(new RoundedBoxGeometry(1.35, .035, .62, 3, .025), standard('#7b65d8', 0, .72), 'YogaMat')
  matMesh.position.set(0, .025, 0)
  mat.add(matMesh)
  props['emoji-yoga'] = mat

  const food = new THREE.Group()
  food.name = 'ActionProp_FoodBowl'
  const bowl = mesh(new THREE.CylinderGeometry(.16, .11, .13, 24, 1, true), standard('#f4f0e7', 0, .38), 'FoodBowl')
  bowl.position.set(0, 0, 0)
  const noodles = mesh(new THREE.TorusGeometry(.10, .025, 8, 24), standard('#f2c25c', 0, .65), 'FoodBowl:Noodles')
  noodles.rotation.x = Math.PI / 2; noodles.position.set(0, .08, 0)
  food.add(bowl, noodles)
  props['emoji-foodie'] = food

  const snowboard = new THREE.Group()
  snowboard.name = 'ActionProp_Snowboard'
  const board = mesh(new RoundedBoxGeometry(1.52, .060, .29, 5, .060), standard('#f2a11b', .08, .35), 'Snowboard')
  board.position.set(0, .055, .02); board.rotation.z = -.08
  snowboard.add(board)
  props['emoji-snowboarding'] = snowboard

  const snowFight = new THREE.Group()
  snowFight.name = 'ActionProp_emoji-snow-fight'
  for (const [index, x] of [-.38, .38].entries()) {
    const ball = mesh(new THREE.SphereGeometry(.11, 16, 12), standard('#edf7ff', 0, .62), `Snowball:${index}`)
    ball.position.set(x, 0, 0)
    snowFight.add(ball)
  }
  props['emoji-snow-fight'] = snowFight

  const rollingSnowball = new THREE.Group()
  rollingSnowball.name = 'ActionProp_emoji-snowball'
  const rollingBall = mesh(
    new THREE.SphereGeometry(.38, 28, 20),
    standard('#f4f9ff', 0, .74),
    'RollingSnowball',
  )
  rollingSnowball.add(rollingBall)
  props['emoji-snowball'] = rollingSnowball

  const comfy = new THREE.Group()
  comfy.name = 'ActionProp_ComfyCushion'
  const cushionMaterial = standard('#f5f3ee', 0, .88)
  for (const side of [-1, 1]) {
    const lobe = mesh(new THREE.SphereGeometry(.46, 28, 18), cushionMaterial, side < 0 ? 'ComfyCushion_Left' : 'ComfyCushion_Right')
    lobe.scale.set(1.08, .82, .78)
    lobe.position.set(side * .36, .22, -.23)
    comfy.add(lobe)
  }
  const seat = mesh(new THREE.SphereGeometry(.40, 28, 18), cushionMaterial, 'ComfyCushion_Seat')
  seat.scale.set(1.25, .48, .88)
  seat.position.set(0, .08, -.10)
  comfy.add(seat)
  props['emoji-so-comfy'] = comfy

  return props
}

export class ActionPropController {
  constructor(parent, worldParent = parent.parent) {
    this.root = new THREE.Group()
    this.root.name = 'ActionProps'
    this.root.position.y = -(parent.userData.restPosition?.[1] ?? 0)
    this.root.userData.exportable = true
    this.worldRoot = new THREE.Group()
    this.worldRoot.name = 'ActionPropsWorld'
    this.worldRoot.userData.exportable = true
    this.props = createProps()
    Object.entries(this.props).forEach(([id, prop]) => {
      prop.visible = false
      ;(WORLD_PROP_IDS.has(id) ? this.worldRoot : this.root).add(prop)
    })
    parent.add(this.root)
    worldParent?.add(this.worldRoot)
    this.currentId = null
    this._worldPoint = new THREE.Vector3()
  }

  clear() {
    Object.values(this.props).forEach(prop => { prop.visible = false })
    this.currentId = null
  }

  _jointPosition(rig, partId, jointName, offset = [0, 0, 0], targetRoot = this.root) {
    const joint = rig?.getJoints(partId)?.[jointName]
    if (!joint) return null
    this._worldPoint.set(...offset)
    joint.localToWorld(this._worldPoint)
    return targetRoot.worldToLocal(this._worldPoint).clone()
  }

  _updateJumpRope(prop, time, rig) {
    const left = this._jointPosition(rig, 'arm-left', 'wrist', [0, -.11, .08])
    const right = this._jointPosition(rig, 'arm-right', 'wrist', [0, -.11, .08])
    if (!left || !right) return
    const [leftHandle, rightHandle] = prop.userData.handles ?? []
    leftHandle?.position.copy(left)
    rightHandle?.position.copy(right)
    if (leftHandle) leftHandle.rotation.set(0, 0, -.24)
    if (rightHandle) rightHandle.rotation.set(0, 0, .24)
    const positions = prop.userData.cord.geometry.getAttribute('position')
    const phase = time * 5.2
    for (let index = 0; index < positions.count; index++) {
      const u = index / (positions.count - 1)
      const arch = Math.sin(Math.PI * u)
      this._worldPoint.lerpVectors(left, right, u)
      this._worldPoint.y += arch * (-.68 * Math.cos(phase) - .12)
      this._worldPoint.z += arch * .62 * Math.sin(phase)
      positions.setXYZ(index, this._worldPoint.x, this._worldPoint.y, this._worldPoint.z)
    }
    positions.needsUpdate = true
    prop.userData.beads.forEach((bead, index) => {
      const sample = Math.round(index / (prop.userData.beads.length - 1) * (positions.count - 1))
      bead.position.set(positions.getX(sample), positions.getY(sample), positions.getZ(sample))
    })
  }

  update(id, time = 0, rig = null, parameters = {}) {
    const prop = this.props[id]
    if (!prop) return null
    prop.visible = true
    prop.scale.setScalar(parameters.propScale ?? 1)
    this.currentId = id
    rig?.root?.updateWorldMatrix?.(true, true)
    if (id === 'emoji-jump-rope') this._updateJumpRope(prop, time, rig)
    if (id === 'emoji-hula-hoop') {
      const duration = PACK5_SOURCE_DURATIONS[id]
      const phase = (((time % duration) + duration) % duration) / duration * Math.PI * 2
      prop.rotation.set(.30 + .09 * Math.sin(phase), phase, .10 * Math.cos(phase))
      prop.position.set(.055 * Math.cos(phase), .012 * Math.sin(phase * 2), .045 * Math.sin(phase))
    }
    if (id === 'emoji-yoga') {
      const support = this._jointPosition(rig, 'leg-right', 'ankle', [0, 0, 0], this.worldRoot)
      if (support) prop.position.set(0, support.y - .48, 0)
    }
    if (id === 'emoji-dumbbells') {
      const left = this._jointPosition(rig, 'arm-left', 'wrist', [0, -.13, .08])
      const right = this._jointPosition(rig, 'arm-right', 'wrist', [0, -.13, .08])
      if (left) prop.children[0].position.copy(left)
      if (right) prop.children[1].position.copy(right)
    }
    if (id === 'emoji-boxing') {
      const left = this._jointPosition(rig, 'arm-left', 'wrist', [0, -.08, .12])
      const right = this._jointPosition(rig, 'arm-right', 'wrist', [0, -.08, .12])
      if (left) prop.children[0].position.copy(left)
      if (right) prop.children[1].position.copy(right)
      const duration = PACK5_SOURCE_DURATIONS[id]
      const phase = (((time % duration) + duration) % duration) / duration
      const swing = Math.sin(phase * Math.PI * 2)
      prop.children[0].scale.setScalar(1 + Math.max(0, swing) * .34)
      prop.children[1].scale.setScalar(1 + Math.max(0, -swing) * .34)
    }
    if (id === 'emoji-foodie') {
      const left = this._jointPosition(rig, 'arm-left', 'wrist', [0, -.10, .12])
      const right = this._jointPosition(rig, 'arm-right', 'wrist', [0, -.10, .12])
      if (left && right) {
        prop.position.copy(left).add(right).multiplyScalar(.5)
        const duration = PACK5_SOURCE_DURATIONS[id]
        const phase = (((time % duration) + duration) % duration) / duration
        const lift = (1 - Math.cos(phase * Math.PI * 2)) * .5
        prop.position.y += .02 + lift * .035
        prop.position.z += .24
        prop.rotation.x = -.08 - lift * .16
      }
    }
    if (id === 'emoji-snow-fight') {
      const left = this._jointPosition(rig, 'arm-left', 'wrist', [0, -.12, .12])
      const right = this._jointPosition(rig, 'arm-right', 'wrist', [0, -.12, .12])
      const duration = PACK5_SOURCE_DURATIONS[id]
      const phase = (((time % duration) + duration) % duration) / duration
      const incoming = THREE.MathUtils.smoothstep(phase, .015, .24)
      const impactFade = 1 - THREE.MathUtils.smoothstep(phase, .26, .36)
      const incomingBall = prop.children[0]
      incomingBall.visible = impactFade > .01
      incomingBall.position.set(
        THREE.MathUtils.lerp(-1.20, -.02, incoming),
        THREE.MathUtils.lerp(.92, .96, incoming),
        THREE.MathUtils.lerp(.12, .48, incoming),
      )
      incomingBall.scale.setScalar((.72 + incoming * 2.45) * impactFade)
      if (right) prop.children[1].position.copy(right)
      const release = THREE.MathUtils.smoothstep(phase, .54, .72)
      if (right) {
        prop.children[1].position.copy(right)
        prop.children[1].position.x += release * 1.15
        prop.children[1].position.y += Math.sin(release * Math.PI) * .48
        prop.children[1].position.z += release * .18
        prop.children[1].scale.setScalar(1 + release * .65)
      }
    }
    if (id === 'emoji-snowball') {
      const duration = PACK5_SOURCE_DURATIONS[id]
      const phase = (((time % duration) + duration) % duration) / duration
      const growth = THREE.MathUtils.smoothstep(phase, .05, .82)
      const roll = phase * Math.PI * 2
      prop.position.set(.30 + growth * .14, .60 - growth * .03, .30)
      prop.children[0].scale.setScalar(.55 + growth * .55)
      prop.children[0].rotation.set(roll * .65, 0, -roll)
    }
    if (id === 'emoji-bench-press') {
      const left = this._jointPosition(rig, 'arm-left', 'wrist', [0, -.10, .08], this.worldRoot)
      const right = this._jointPosition(rig, 'arm-right', 'wrist', [0, -.10, .08], this.worldRoot)
      if (left && right) {
        const center = left.clone().add(right).multiplyScalar(.5)
        const bar = prop.getObjectByName('BenchPress_Bar')
        const plateLeft = prop.getObjectByName('BenchPress_Plate_Left')
        const plateRight = prop.getObjectByName('BenchPress_Plate_Right')
        if (bar) bar.position.set(center.x, center.y, center.z)
        if (plateLeft) plateLeft.position.set(center.x - 1.02, center.y, center.z)
        if (plateRight) plateRight.position.set(center.x + 1.02, center.y, center.z)
      }
    }
    if (id === 'emoji-snowboarding') {
      const left = this._jointPosition(rig, 'leg-left', 'ankle', [0, -.08, .08])
      const right = this._jointPosition(rig, 'leg-right', 'ankle', [0, -.08, .08])
      if (left && right) {
        prop.position.copy(left).add(right).multiplyScalar(.5)
        prop.position.y -= .04
        prop.rotation.z = Math.atan2(right.y - left.y, right.x - left.x)
      }
    }
    return prop
  }

  dispose() {
    disposeObject3DResources(this.root)
    disposeObject3DResources(this.worldRoot)
    this.props = {}
  }
}
