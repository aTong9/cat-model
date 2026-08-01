import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const mobileControls = fs.readFileSync(new URL('../src/components/MobileControls.vue', import.meta.url), 'utf8')
const parameterPanel = fs.readFileSync(new URL('../src/components/ParamPanel.vue', import.meta.url), 'utf8')

test('opening the mobile parameter panel preserves a separate character control zone', () => {
  assert.doesNotMatch(mobileControls, /v-if="!store\.panelExpanded"/)
  assert.match(parameterPanel, /\.right-panel\.expanded\s*\{[^}]*bottom:/)
})
