import test from 'node:test'
import assert from 'node:assert/strict'
import { createCatTraits } from '../src/core/catTraits.js'
import { expandCatIdentity, generateCatIdentity } from '../src/core/generateCatIdentity.js'

test('offline identity generation is deterministic and survives trait normalization', () => {
  const traits = createCatTraits({ tokenId: '42', gear: 'Camera', special: 'Time Traveler' })
  const identity = generateCatIdentity(traits, 42)
  assert.deepEqual(identity, generateCatIdentity(traits, 42))
  const normalized = createCatTraits({ ...traits, identity })
  assert.deepEqual(normalized.identity, identity)
  assert.match(identity.story, /Camera/)
})

test('AI expansion is optional and isolated behind a provider contract', async () => {
  const identity = { name: 'Nova', personality: ['好奇'], story: '短故事' }
  assert.deepEqual(await expandCatIdentity(identity), identity)
  const expanded = await expandCatIdentity(identity, { provider: async value => ({ story: `${value.story}，继续远行。` }) })
  assert.match(expanded.story, /继续远行/)
  await assert.rejects(() => expandCatIdentity(identity, { provider: true }), /provider must be a function/)
})
