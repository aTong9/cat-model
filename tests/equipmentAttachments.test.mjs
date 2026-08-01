import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { EQUIPMENT_ATTACHMENTS, applyEquipmentAttachment, getEquipmentAttachment } from '../src/three/EquipmentAttachments.js'

test('all ten gear traits have finite attachment profiles', () => {
  assert.equal(Object.keys(EQUIPMENT_ATTACHMENTS).length, 10)
  for (const [type, profile] of Object.entries(EQUIPMENT_ATTACHMENTS)) {
    assert.match(profile.socket, /^(head-top|face-eyes|chest-front|back|paw-left)$/)
    assert.equal(profile.position.length, 3, type)
    assert.equal(profile.rotation.length, 3, type)
    assert.ok([...profile.position, ...profile.rotation, profile.scale].every(Number.isFinite), type)
    assert.ok(profile.scale > 0, type)
  }
})

test('attachment application overrides factory transforms and records exportable metadata', () => {
  const object = new THREE.Group()
  object.position.set(9, 9, 9)
  assert.equal(applyEquipmentAttachment(object, 'Investment Book'), true)
  assert.deepEqual(object.position.toArray(), getEquipmentAttachment('Investment Book').position)
  assert.equal(object.userData.attachment.socket, 'head-top')
  assert.equal(applyEquipmentAttachment(object, 'Unknown'), false)
})

test('wearable proportions and top-mounted props are centered for the main character', () => {
  assert.ok(getEquipmentAttachment('Hiking Backpack').scale >= 1.1)
  assert.ok(getEquipmentAttachment('Camera').scale >= 0.15)
  for (const type of ['Hot Coffee', 'Investment Book', 'Sake']) {
    assert.equal(getEquipmentAttachment(type).position[0], 0, type)
  }
})
