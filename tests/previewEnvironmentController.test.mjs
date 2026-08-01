import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { BACKGROUND_COLORS, createPreviewEnvironmentController } from '../src/three/PreviewEnvironmentController.js'

test('all eight NFT backgrounds update scene and fog together', () => {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color()
  scene.fog = new THREE.Fog('#000000', 1, 10)
  const controller = createPreviewEnvironmentController(scene)
  for (const [name, color] of Object.entries(BACKGROUND_COLORS)) {
    assert.equal(controller.setBackground(name), color)
    assert.equal(scene.background.getHexString(), color.slice(1))
    assert.equal(scene.fog.color.getHexString(), color.slice(1))
  }
  assert.equal(Object.keys(BACKGROUND_COLORS).length, 8)
})

test('light changes are absolute and do not accumulate', () => {
  const scene = new THREE.Scene()
  const sun = new THREE.DirectionalLight('#ffffff', 4.5)
  const fill = new THREE.DirectionalLight('#ffffff', 2.2)
  const hemisphere = new THREE.HemisphereLight('#ffffff', '#000000', 1.4)
  scene.add(sun, fill, hemisphere)
  const controller = createPreviewEnvironmentController(scene)
  controller.setLightIntensity(0.4)
  assert.ok(Math.abs(sun.intensity - 1.8) < 1e-9)
  assert.ok(Math.abs(fill.intensity - 0.88) < 1e-9)
  assert.equal(hemisphere.intensity, 1.4)
  controller.setLightIntensity(1)
  assert.equal(sun.intensity, 4.5)
  assert.equal(fill.intensity, 2.2)
  assert.equal(controller.controlledLightCount, 2)
})

test('unknown backgrounds fall back to the neutral preview color', () => {
  const scene = new THREE.Scene()
  const controller = createPreviewEnvironmentController(scene)
  assert.equal(controller.setBackground('Unknown'), '#11111c')
  assert.equal(controller.background, null)
})
