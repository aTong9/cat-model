import * as THREE from 'three'

function makeSkyTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
  gradient.addColorStop(0, '#090522')
  gradient.addColorStop(0.42, '#241044')
  gradient.addColorStop(0.72, '#81104f')
  gradient.addColorStop(1, '#19082d')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.magFilter = THREE.LinearFilter
  return texture
}

function createSun() {
  const group = new THREE.Group()
  group.name = 'TimeTraveler:segmented-sun'
  const radius = 2.22
  const slices = 14

  for (let index = 0; index < slices; index++) {
    const normalizedY = 0.92 - index * 0.14
    const y = normalizedY * radius
    const halfWidth = Math.sqrt(Math.max(0, radius * radius - y * y))
    const color = new THREE.Color().setHSL(0.15 - index * 0.006, 0.92, 0.68 - index * 0.018)
    const slice = new THREE.Mesh(
      new THREE.BoxGeometry(halfWidth * 2, index < 4 ? 0.22 : 0.13, 0.10),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.96 })
    )
    slice.name = `TimeTraveler:sun-slice-${index}`
    slice.position.y = y
    slice.userData.explodeWithParent = true
    group.add(slice)
  }

  group.position.set(0, 2.12, -5.30)
  return group
}

function createSkyline(layer, color, z, baseY, scale = 1) {
  const group = new THREE.Group()
  group.name = `TimeTraveler:skyline-${layer}`
  const heights = layer === 'rear'
    ? [0.45, 0.72, 0.50, 0.94, 0.62, 0.42, 0.80, 0.54, 0.70, 0.48, 0.86, 0.58, 0.74, 0.46, 0.66, 0.52]
    : [0.55, 0.88, 0.65, 1.48, 0.72, 0.48, 1.28, 0.76, 1.36, 0.56, 1.18, 0.68, 1.52, 0.74]
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.96, metalness: 0.02 })
  const width = 0.48 * scale
  const startX = -((heights.length - 1) * width) / 2

  heights.forEach((height, index) => {
    const buildingHeight = height * scale
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.04, buildingHeight, 0.34 * scale),
      material
    )
    building.name = `TimeTraveler:${layer}-building-${index}`
    building.position.set(startX + index * width, baseY + buildingHeight / 2, z)
    building.castShadow = true
    group.add(building)

    if ((index + (layer === 'rear' ? 1 : 0)) % 4 === 0) {
      const antenna = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.30 * scale, 0.025), material)
      antenna.name = `TimeTraveler:${layer}-antenna-${index}`
      antenna.position.set(building.position.x, baseY + buildingHeight + 0.15 * scale, z)
      group.add(antenna)
    }
  })

  return group
}

export function createTimeTravelerScene() {
  const root = new THREE.Group()
  root.name = 'Special:Time Traveler'
  root.userData.sceneType = 'Time Traveler'
  root.userData.referenceImage = '/pixel_cat_3d/Special/TimeTraveler_9038.png'

  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(15, 9),
    new THREE.MeshBasicMaterial({ map: makeSkyTexture(), depthWrite: false, fog: false })
  )
  sky.name = 'TimeTraveler:gradient-sky'
  sky.position.set(0, 2.3, -6.2)
  root.add(sky)

  const sun = createSun()
  root.add(sun)
  root.add(createSkyline('rear', '#70114f', -4.25, -0.68, 0.92))
  root.add(createSkyline('front', '#170a2d', -3.55, -0.72, 1.0))

  const horizonGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 0.20),
    new THREE.MeshBasicMaterial({ color: '#49dff1', transparent: true, opacity: 0.82, depthWrite: false })
  )
  horizonGlow.name = 'TimeTraveler:horizon-glow'
  horizonGlow.position.set(0, -0.64, -3.22)
  root.add(horizonGlow)

  const grid = new THREE.GridHelper(12, 24, '#53e7f3', '#5c315f')
  grid.name = 'TimeTraveler:perspective-grid'
  grid.position.set(0, -0.985, -0.8)
  grid.material.transparent = true
  grid.material.opacity = 0.86
  root.add(grid)

  const magentaLight = new THREE.PointLight('#ff3aa8', 12, 8, 2)
  magentaLight.name = 'TimeTraveler:magenta-light'
  magentaLight.position.set(0, 1.3, -2.4)
  root.add(magentaLight)
  const cyanLight = new THREE.PointLight('#4eeaff', 9, 7, 2)
  cyanLight.name = 'TimeTraveler:cyan-light'
  cyanLight.position.set(0, -0.15, 1.5)
  root.add(cyanLight)

  root.userData.update = (time) => {
    const pulse = 0.92 + Math.sin(time * 1.4) * 0.05
    horizonGlow.material.opacity = pulse
    grid.material.opacity = 0.72 + Math.sin(time * 0.8) * 0.10
    sun.scale.setScalar(1 + Math.sin(time * 0.45) * 0.008)
  }

  return root
}
