<template>
  <div class="view-controls glass" aria-label="固定相机视角">
    <span>视角</span>
    <button v-for="view in views" :key="view.id" :class="{ active: active === view.id }" @click="select(view.id)">{{ view.label }}</button>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
const active = ref('front')
const views = [{ id: 'front', label: '正面' }, { id: 'three-quarter', label: '3/4' }, { id: 'side', label: '侧面' }, { id: 'back', label: '背面' }]
function select(view) {
  active.value = view
  window.dispatchEvent(new CustomEvent('cat:set-camera-view', { detail: { view } }))
}
function syncView(event) { if (views.some(view => view.id === event.detail?.view)) active.value = event.detail.view }
onMounted(() => window.addEventListener('cat:set-camera-view', syncView))
onUnmounted(() => window.removeEventListener('cat:set-camera-view', syncView))
</script>

<style scoped>
.view-controls{position:fixed;z-index:100;left:50%;top:14px;display:flex;align-items:center;gap:3px;padding:5px;transform:translateX(-50%);border-radius:11px}.view-controls span{padding:0 7px;color:#778198;font-size:.61rem}.view-controls button{min-height:30px;padding:0 9px;border:0;border-radius:7px;background:transparent;color:#abb2c5;font-size:.66rem;cursor:pointer}.view-controls button:hover{background:rgba(255,255,255,.07)}.view-controls button.active{background:rgba(245,211,61,.16);color:var(--accent)}@media(max-width:700px){.view-controls{top:112px;bottom:auto}.view-controls span{display:none}.view-controls button{padding-inline:8px}}
</style>
