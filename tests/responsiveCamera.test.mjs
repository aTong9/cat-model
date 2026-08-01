import test from 'node:test'
import assert from 'node:assert/strict'
import { getResponsiveCameraDistance } from '../src/three/SceneSetup.js'

test('mobile framing places the default camera farther from the cat', () => {
  assert.equal(getResponsiveCameraDistance(1280), 4.6)
  assert.ok(getResponsiveCameraDistance(390) >= 5.8)
  assert.ok(getResponsiveCameraDistance(768) > getResponsiveCameraDistance(1280))
})
