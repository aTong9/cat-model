import test from 'node:test'
import assert from 'node:assert/strict'
import { EYE_STYLES, FUR_TRAITS } from '../src/config/traits.js'
import {
  EYE_APPEARANCE_PROFILES,
  FUR_APPEARANCE_PROFILES,
  getEyeAppearanceProfile,
  getFurAppearanceProfile,
} from '../src/three/AppearanceProfiles.js'

test('all catalog fur traits have explicit appearance profiles', () => {
  assert.deepEqual(Object.keys(FUR_APPEARANCE_PROFILES).sort(), FUR_TRAITS.map(item => item.id).sort())
  for (const trait of FUR_TRAITS) {
    const profile = getFurAppearanceProfile(trait.id)
    assert.match(profile.base, /^#[0-9a-f]{6}$/i)
    assert.match(profile.accent, /^#[0-9a-f]{6}$/i)
    assert.ok(profile.roughness >= 0 && profile.roughness <= 1)
  }
})

test('all eye traits use distinct, valid silhouette families', () => {
  assert.deepEqual(Object.keys(EYE_APPEARANCE_PROFILES).sort(), [...EYE_STYLES].sort())
  const families = EYE_STYLES.map(style => getEyeAppearanceProfile(style).family)
  assert.equal(new Set(families).size, EYE_STYLES.length)
  for (const style of EYE_STYLES) {
    const profile = getEyeAppearanceProfile(style)
    assert.match(profile.primary, /^#[0-9a-f]{6}$/i)
    assert.ok(profile.roughness >= 0 && profile.roughness <= 1)
    assert.ok(profile.metalness >= 0 && profile.metalness <= 1)
  }
})

test('custom fur colors remain isolated from shared profiles', () => {
  const custom = getFurAppearanceProfile('Custom', '#123456')
  custom.base = '#ffffff'
  assert.equal(getFurAppearanceProfile('Custom', '#123456').base, '#123456')
  assert.equal(getFurAppearanceProfile('Golden').base, '#f4dc7a')
})
