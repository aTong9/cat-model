<template>
  <div class="bottom-bar">
    <div class="bottom-inner glass">
      <button class="btn random-btn" @click="store.randomize">✦ 随机生成</button>
      <div class="export-group">
        <button class="btn" :disabled="exporting" @click="exportGLB">{{ exporting ? '验证中…' : '导出 GLB' }}</button>
        <button class="btn" @click="exportPNG">保存 PNG</button>
      </div>
      <span class="hint-text">拖拽旋转 · 滚轮缩放 · 右键平移</span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { downloadGlb, exportCharacterGlb } from '../export/exportCharacterGlb.js'
import { useCatStore } from '../stores/cat.js'
const store = useCatStore()
const exporting = ref(false)
async function exportGLB() {
  if (exporting.value) return
  try {
    const character = document.querySelector('canvas')?.__character
    if (!character) return alert('角色尚未就绪')
    exporting.value = true
    const { arrayBuffer, report } = await exportCharacterGlb(character)
    console.info('GLB export verified', report)
    downloadGlb(arrayBuffer, `liberty-cat-${store.tokenId}.glb`)
  } catch (error) {
    console.warn(error)
    alert(error.message || 'GLB 导出失败，请稍后再试。')
  } finally { exporting.value = false }
}
function exportPNG() {
  const canvas = document.querySelector('canvas')
  if (!canvas) return
  const link = document.createElement('a')
  link.download = `vr-cat-${store.tokenId}.png`; link.href = canvas.toDataURL('image/png'); link.click()
}
</script>

<style scoped>
.bottom-bar { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); z-index: 100; animation: slideUp .5s ease-out .45s both; }
.bottom-inner { display: flex; align-items: center; gap: 12px; padding: 10px 18px; border-radius: 12px; }
.random-btn { background: var(--accent) !important; color: #1a1a2e !important; font-weight: 700 !important; border-color: var(--accent) !important; font-size: .82rem !important; padding: 8px 16px !important; }
.random-btn:hover { opacity: .85; }.export-group { display: flex; gap: 6px; }.hint-text { font-size: .7rem; color: var(--text-dim); white-space: nowrap; }
.btn:disabled { cursor: wait; opacity: .55; }
@media (max-width: 700px) { .hint-text { display: none; } .bottom-inner { gap: 6px; padding: 8px; } }
</style>
