import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { characterParameterLabels } from '../src/i18n/characterParameterLabels.js'

const panelSource = fs.readFileSync(new URL('../src/components/ParamPanel.vue', import.meta.url), 'utf8')

test('equipment thumbnails are constrained inside their preview frame', () => {
  assert.match(panelSource, /\.gear-preview\{[^}]*position:relative/)
  assert.match(panelSource, /\.gear-preview img\{[^}]*position:absolute[^}]*inset:/)
})

test('equipment preview paths honor the Vite public base on GitHub Pages', () => {
  assert.match(panelSource, /import\.meta\.env\.BASE_URL/)
  assert.match(panelSource, /replace\(\/\^\\\/\+\//)
  assert.match(panelSource, /preview:\s*resolvePublicPreview\(option\.preview\)/)
})

test('requested Chinese equipment and special labels are applied without changing trait ids', () => {
  const { gear, special } = characterParameterLabels.zh.traits
  assert.deepEqual({
    glasses: gear['gold-round-glasses'], goodLuck: gear['good-luck-gold-bar'],
    wealth: gear['wealth-gold-bar'], book: gear['investment-book'],
  }, { glasses: '金眼镜', goodLuck: '大吉', wealth: '亿万两', book: '有的赚' })
  assert.deepEqual({
    fitness: special['fitness-guru'], golden: special['golden-general'], traveler: special['time-traveler'],
    onsen: special['onsen-journey'], thunder: special['thunderous-might'], fuji: special['realm-of-mt.fuji'],
  }, { fitness: '健身达人', golden: '黄金将军', traveler: '时空旅者', onsen: '温泉之旅', thunder: '雷霆万钧', fuji: '富士之镜' })
})
