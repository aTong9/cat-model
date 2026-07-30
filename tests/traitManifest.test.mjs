import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { METADATA_TRAIT_COUNT, METADATA_TRAIT_VALUES } from '../src/core/metadataTraitContract.js'

const manifest = JSON.parse(fs.readFileSync(new URL('../public/data/trait-manifest.json', import.meta.url), 'utf8'))

test('trait manifest covers all 44 metadata values with evidence', () => {
  assert.equal(manifest.schemaVersion, 1)
  assert.equal(manifest.catalogSchemaVersion, 2)
  assert.equal(manifest.tokenCount, 9901)
  assert.equal(manifest.traitCount, 44)
  assert.ok(manifest.representativeCount >= 120)
  assert.ok(manifest.representativeCount <= 180)
  for (const [domainId, domain] of Object.entries(manifest.domains)) {
    assert.equal(domain.id, domainId)
    assert.equal(domain.domain, domainId)
    assert.ok(domain.implementationType)
    assert.ok(Number.isInteger(domain.nullCount))
    for (const trait of domain.traits) {
      assert.ok(trait.frequency > 0, trait.id)
      assert.equal(trait.domain, domainId)
      assert.equal(trait.implementationType, domain.implementationType)
      assert.ok(trait.representativeTokenIds.length >= 1, trait.id)
      assert.equal(trait.representativeTokenIds.length, trait.evidence.length, trait.id)
      assert.ok(trait.evidence.every(path => /^liberty_cats_download\/images\/\d+\.(png|webp)$/.test(path)), trait.id)
    }
  }
})

test('coverage matrix records observed and missing Eyes × Face combinations', () => {
  const coverage = manifest.pairCoverage.find(item => item.domains.join(':') === 'eyes:face')
  assert.equal(coverage.possibleCount, 30)
  assert.equal(coverage.observedCount, 28)
  assert.equal(coverage.missingCount, 2)
  assert.equal(coverage.combinations.length, 28)
  assert.equal(coverage.missing.length, 2)
  assert.ok(coverage.combinations.every(item => item.frequency > 0 && /^\d+$/.test(item.representativeTokenId)))
})

test('properties, manifest and runtime metadata enums agree bidirectionally', () => {
  const properties = fs.readFileSync(new URL('../liberty_cats_download/properties.md', import.meta.url), 'utf8')
  assert.equal(METADATA_TRAIT_COUNT, 44)
  for (const [domainId, expectedValues] of Object.entries(METADATA_TRAIT_VALUES)) {
    const manifestValues = manifest.domains[domainId].traits.map(item => item.id)
    assert.deepEqual([...manifestValues].sort(), [...expectedValues].sort(), domainId)
    for (const value of expectedValues) assert.ok(properties.includes(value), `${domainId}:${value}`)
  }
})

test('null semantics distinguish absence from full-scene ownership', () => {
  assert.equal(manifest.domains.gear.nullMeaning, 'no-equipment')
  assert.equal(manifest.domains.background.nullCount, 442)
  assert.equal(manifest.domains.background.nullMeaning, 'replaced-by-special')
  assert.equal(manifest.domains.special.nullCount, 9459)
})
