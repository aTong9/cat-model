import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const mobileControls = fs.readFileSync(new URL('../src/components/MobileControls.vue', import.meta.url), 'utf8')
const parameterPanel = fs.readFileSync(new URL('../src/components/ParamPanel.vue', import.meta.url), 'utf8')

test('opening the mobile parameter panel preserves a separate character control zone', () => {
  assert.doesNotMatch(mobileControls, /v-if="!store\.panelExpanded"/)
  assert.match(parameterPanel, /@media\(max-width:900px\)\{\.right-panel\{[^}]*bottom:\s*132px/)
  assert.match(parameterPanel, /@media\(max-width:600px\)\{\.right-panel\{[^}]*bottom:\s*132px/)
  assert.match(parameterPanel, /\.right-panel\.expanded\s*\{[^}]*top:\s*110px[^}]*bottom:\s*224px/)
  assert.match(parameterPanel, /\.right-panel\.expanded \.panel-body\s*\{[^}]*flex:\s*1[^}]*min-height:\s*0[^}]*max-height:\s*none/)
})
