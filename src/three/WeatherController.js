import * as THREE from 'three'

const WEATHER_TYPES = new Set(['sunny', 'cloudy', 'rain', 'thunder'])

function disposeObject(object) {
  object.geometry?.dispose?.()
  if (Array.isArray(object.material)) object.material.forEach(material => material.dispose?.())
  else object.material?.dispose?.()
}

export function createWeatherController({ scene, root, random = Math.random }) {
  if (!scene || !root) throw new Error('WeatherController requires scene and root')
  let weather = 'sunny'
  let rain = null
  let clouds = []
  let flashRemaining = 0
  const backgroundBeforeFlash = new THREE.Color()

  function clear() {
    root.traverse(disposeObject)
    root.clear()
    rain = null
    clouds = []
    flashRemaining = 0
  }

  function createRain() {
    const positions = new Float32Array(300 * 3)
    for (let index = 0; index < positions.length; index += 3) {
      positions[index] = (random() - 0.5) * 8
      positions[index + 1] = random() * 6
      positions[index + 2] = (random() - 0.5) * 8
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    rain = new THREE.Points(geometry, new THREE.PointsMaterial({ color: '#aaccff', size: 0.04, transparent: true, opacity: 0.5, depthWrite: false }))
    rain.name = 'WeatherRain'
    root.add(rain)
  }

  function createClouds() {
    for (let index = 0; index < 6; index++) {
      const cloud = new THREE.Mesh(
        new THREE.SphereGeometry(0.5 + random() * 0.6, 16, 12),
        new THREE.MeshStandardMaterial({ color: '#8899aa', roughness: 1, transparent: true, opacity: 0.4, depthWrite: false }),
      )
      cloud.name = `WeatherCloud${index + 1}`
      cloud.position.set((random() - 0.5) * 8, 4 + random() * 2, (random() - 0.5) * 6)
      cloud.userData.speed = 0.1 + random() * 0.4
      cloud.userData.baseX = cloud.position.x
      root.add(cloud)
      clouds.push(cloud)
    }
  }

  function setWeather(nextWeather) {
    weather = WEATHER_TYPES.has(nextWeather) ? nextWeather : 'sunny'
    clear()
    if (weather === 'rain' || weather === 'thunder') createRain()
    if (weather === 'cloudy' || weather === 'rain' || weather === 'thunder') createClouds()
    root.userData.weather = weather
  }

  function update(delta) {
    if (rain) {
      const positions = rain.geometry.attributes.position
      for (let index = 0; index < positions.count; index++) {
        const y = positions.getY(index) - 3.6 * delta
        positions.setY(index, y < -0.5 ? 5.5 : y)
      }
      positions.needsUpdate = true
    }
    for (const cloud of clouds) {
      cloud.position.x += cloud.userData.speed * delta
      if (cloud.position.x > cloud.userData.baseX + 5) cloud.position.x = cloud.userData.baseX - 5
    }
    if (flashRemaining > 0) {
      flashRemaining -= delta
      if (flashRemaining <= 0 && scene.background?.isColor) scene.background.copy(backgroundBeforeFlash)
    } else if (weather === 'thunder' && random() < 0.003) {
      if (scene.background?.isColor) backgroundBeforeFlash.copy(scene.background)
      scene.background = new THREE.Color('#ffffff')
      flashRemaining = 0.08
    }
  }

  function dispose() {
    if (flashRemaining > 0 && scene.background?.isColor) scene.background.copy(backgroundBeforeFlash)
    clear()
  }

  return { setWeather, update, dispose, get weather() { return weather }, get objectCount() { return root.children.length } }
}
