import * as THREE from 'three'

export const EQUIPMENT_EFFECT_RECIPES = Object.freeze({
  Camera: Object.freeze({ kind: 'flash', color: '#ffffff', duration: .55 }),
  Ramen: Object.freeze({ kind: 'steam', color: '#ffb35c', duration: 1.8 }),
  Sake: Object.freeze({ kind: 'ripple', color: '#9ee8ff', duration: 1.4 }),
  'Hot Coffee': Object.freeze({ kind: 'steam', color: '#d99a62', duration: 1.8 }),
  'Good Luck Gold Bar': Object.freeze({ kind: 'coins', color: '#ffd84d', duration: 1.4 }),
  'Wealth Gold Bar': Object.freeze({ kind: 'coins', color: '#ffbd2e', duration: 1.6 }),
  'Investment Book': Object.freeze({ kind: 'pages', color: '#8fc6ff', duration: 1.35 }),
  'Baseball Cap': Object.freeze({ kind: 'spin', color: '#ff7070', duration: 1.1 }),
  'Hiking Backpack': Object.freeze({ kind: 'compass', color: '#7ee09a', duration: 1.5 }),
  'Gold Round Glasses': Object.freeze({ kind: 'glint', color: '#ffe783', duration: 1.0 }),
})

function disc(color) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(.30, .018, 8, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9, depthWrite: false }))
  mesh.rotation.x = Math.PI / 2
  mesh.position.y = .04
  return mesh
}

function particles(recipe, count, geometry) {
  const group = new THREE.Group()
  for (let index = 0; index < count; index++) {
    const mesh = new THREE.Mesh(geometry(), new THREE.MeshBasicMaterial({ color: recipe.color, transparent: true, opacity: .85, depthWrite: false }))
    const angle = index / count * Math.PI * 2
    mesh.position.set(Math.cos(angle) * .12, .04 + index * .025, Math.sin(angle) * .12)
    mesh.userData.angle = angle
    mesh.userData.index = index
    group.add(mesh)
  }
  return group
}

export function createEquipmentEffect(id) {
  const recipe = EQUIPMENT_EFFECT_RECIPES[id]
  if (!recipe) return null
  const root = new THREE.Group()
  root.name = `EquipmentEffect:${id}`
  root.userData.effectKind = recipe.kind
  let elapsed = 0
  let visual

  if (recipe.kind === 'steam') visual = particles(recipe, 6, () => new THREE.SphereGeometry(.035, 8, 6))
  else if (recipe.kind === 'coins') visual = particles(recipe, 8, () => new THREE.CylinderGeometry(.028, .028, .008, 12))
  else if (recipe.kind === 'pages') visual = particles(recipe, 5, () => new THREE.PlaneGeometry(.09, .06))
  else if (recipe.kind === 'glint') visual = particles(recipe, 4, () => new THREE.OctahedronGeometry(.035))
  else if (recipe.kind === 'compass') visual = particles(recipe, 4, () => new THREE.ConeGeometry(.025, .12, 5))
  else visual = disc(recipe.color)
  root.add(visual)

  if (recipe.kind === 'flash') {
    const light = new THREE.PointLight('#ffffff', 5, 3, 2)
    light.position.set(0, .25, .25)
    root.add(light)
  }

  function update(dt) {
    elapsed += dt
    const progress = Math.min(1, elapsed / recipe.duration)
    const fade = 1 - progress
    root.traverse(object => { if (object.material) object.material.opacity = fade })
    if (recipe.kind === 'steam') visual.children.forEach((item, index) => { item.position.y += dt * (.22 + index * .025); item.position.x += Math.sin(elapsed * 4 + index) * dt * .025 })
    else if (recipe.kind === 'coins') visual.children.forEach((item, index) => { item.position.y = .05 + Math.sin(progress * Math.PI) * (.38 + index * .015); item.rotation.x += dt * 8; item.rotation.z += dt * 5 })
    else if (recipe.kind === 'pages') visual.children.forEach((item, index) => { item.rotation.y += dt * (3 + index); item.position.y += dt * .12 })
    else if (recipe.kind === 'glint') { visual.rotation.z += dt * 2.5; visual.scale.setScalar(1 + Math.sin(elapsed * 12) * .3) }
    else if (recipe.kind === 'compass') visual.rotation.y -= dt * 3
    else { visual.scale.setScalar(1 + progress * (recipe.kind === 'spin' ? 1.2 : 2)); visual.rotation.z += recipe.kind === 'spin' ? dt * 8 : 0 }
    root.children.filter(child => child.isLight).forEach(light => { light.intensity = fade * 5 })
    return progress >= 1
  }

  function dispose() {
    root.traverse(object => { object.geometry?.dispose?.(); object.material?.dispose?.() })
    root.removeFromParent()
  }
  return { root, recipe, update, dispose }
}
