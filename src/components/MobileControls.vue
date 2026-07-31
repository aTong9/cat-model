<template>
  <div v-if="!store.panelExpanded" class="mobile-controls" :aria-label="t('mobile.label')">
    <div class="dpad glass">
      <button class="up" :aria-label="t('controls.view')" @pointerdown.prevent="move(0, -1)" @pointerup="stop" @pointercancel="stop" @pointerleave="stop">▲</button>
      <button class="left" :aria-label="t('controls.controls.mobileMoveHint')" @pointerdown.prevent="move(-1, 0)" @pointerup="stop" @pointercancel="stop" @pointerleave="stop">◀</button>
      <i></i>
      <button class="right" :aria-label="t('controls.controls.mobileMoveHint')" @pointerdown.prevent="move(1, 0)" @pointerup="stop" @pointercancel="stop" @pointerleave="stop">▶</button>
      <button class="down" :aria-label="t('controls.controls.mobileMoveHint')" @pointerdown.prevent="move(0, 1)" @pointerup="stop" @pointercancel="stop" @pointerleave="stop">▼</button>
    </div>
    <div class="actions">
      <button class="jump glass" :aria-label="t('controls.controls.jump')" @pointerdown.prevent="action('jump', true)">{{ t('controls.controls.jump') }}</button>
      <button class="run glass" :aria-label="t('controls.controls.run')" @pointerdown.prevent="action('sprint', true)" @pointerup="action('sprint', false)" @pointercancel="action('sprint', false)" @pointerleave="action('sprint', false)">{{ t('controls.controls.run') }}</button>
    </div>
  </div>
</template>

<script setup>
import { onUnmounted } from 'vue'
import { useCatStore } from '../stores/cat.js'
import { useI18n } from 'vue-i18n'

const store = useCatStore()
const { t } = useI18n()
const emitInput = detail => window.dispatchEvent(new CustomEvent('cat:virtual-input', { detail }))
const move = (x, z) => emitInput({ direction: { x, z } })
const stop = () => move(0, 0)
const action = (name, active) => emitInput({ action: name, active })
onUnmounted(() => { stop(); action('sprint', false); action('sneak', false) })
</script>

<style scoped>
.mobile-controls{display:none}
@media(max-width:700px),(pointer:coarse){
  .mobile-controls{position:fixed;z-index:104;right:12px;bottom:72px;left:12px;display:flex;align-items:flex-end;justify-content:space-between;pointer-events:none;touch-action:none;user-select:none}
  .mobile-controls button{pointer-events:auto;border:1px solid rgba(255,255,255,.14);color:#fff;font-weight:800;-webkit-tap-highlight-color:transparent}
  .mobile-controls button:active{border-color:var(--accent);background:rgba(245,211,61,.28);color:var(--accent);transform:scale(.94)}
  .dpad{display:grid;grid-template-columns:repeat(3,40px);grid-template-rows:repeat(3,40px);gap:3px;padding:7px;border-radius:18px}
  .dpad button{border-radius:11px;background:rgba(20,20,35,.76);font-size:.8rem}.dpad .up{grid-column:2;grid-row:1}.dpad .left{grid-column:1;grid-row:2}.dpad .right{grid-column:3;grid-row:2}.dpad .down{grid-column:2;grid-row:3}.dpad i{grid-column:2;grid-row:2;display:block;width:8px;height:8px;place-self:center;border-radius:50%;background:rgba(255,255,255,.18);pointer-events:none}
  .actions{display:flex;align-items:flex-end;gap:10px}.actions button{display:grid;place-items:center;border-radius:50%;background:rgba(20,20,35,.8);font-size:.76rem}.actions .jump{width:58px;height:58px;border-color:rgba(245,211,61,.35);color:var(--accent)}.actions .run{width:46px;height:46px}
}
</style>
