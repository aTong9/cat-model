import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createWeatherController } from '../src/three/WeatherController.js'

test('weather controller owns and replaces its scene resources', () => {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#253f88')
  const root = new THREE.Group()
  const controller = createWeatherController({ scene, root, random: () => 0.5 })
  controller.setWeather('rain')
  assert.equal(root.getObjectByName('WeatherRain')?.isPoints, true)
  assert.equal(root.children.filter(item => item.name.startsWith('WeatherCloud')).length, 6)
  controller.setWeather('sunny')
  assert.equal(controller.objectCount, 0)
  controller.dispose()
})

test('thunder restores the active background instead of a hard-coded color', () => {
  const scene = new THREE.Scene()
  const original = new THREE.Color('#5f3e9f')
  scene.background = original.clone()
  const controller = createWeatherController({ scene, root: new THREE.Group(), random: () => 0 })
  controller.setWeather('thunder')
  controller.update(0.016)
  assert.equal(scene.background.getHexString(), 'ffffff')
  controller.update(0.1)
  assert.equal(scene.background.getHexString(), original.getHexString())
  controller.dispose()
})

test('unknown weather safely falls back to sunny', () => {
  const controller = createWeatherController({ scene: new THREE.Scene(), root: new THREE.Group() })
  controller.setWeather('hail')
  assert.equal(controller.weather, 'sunny')
  assert.equal(controller.objectCount, 0)
})
