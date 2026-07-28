<template>
  <div class="bottom-bar">
    <div class="bottom-inner glass">
      <button class="btn random-btn" @click="store.randomize">随机生成</button>
      <div class="divider"></div>
      <button class="btn" :disabled="exporting" @click="exportGLB">{{ exporting ? '正在验证…' : '导出 GLB' }}</button>
      <button class="btn" @click="exportPNG">保存 PNG</button>
      <button class="btn secondary-action" @click="copyConfig">{{ copied === 'config' ? '已复制参数' : '复制参数' }}</button>
      <button class="btn secondary-action" @click="copyShareUrl">{{ copied === 'url' ? '链接已复制' : '分享链接' }}</button>
      <span class="hint-text">拖动旋转 · 滚轮缩放 · 右键平移</span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { downloadGlb, exportCharacterGlb } from '../export/exportCharacterGlb.js'
import { useCatStore } from '../stores/cat.js'
import { createShareUrl, serializeCatConfig } from '../core/shareCatConfig.js'
const store = useCatStore()
const exporting = ref(false)
const copied = ref('')
async function copyText(text, type) {
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
    else {
      const input = document.createElement('textarea')
      input.value = text
      input.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      input.remove()
    }
    copied.value = type
    setTimeout(() => { if (copied.value === type) copied.value = '' }, 1600)
  } catch (error) {
    console.warn('Copy failed', error)
    alert('复制失败，请检查浏览器权限')
  }
}
const copyConfig = () => copyText(serializeCatConfig(store.currentTraits), 'config')
const copyShareUrl = () => copyText(createShareUrl(window.location.href, store.currentTraits), 'url')
async function exportGLB() {
  if (exporting.value) return
  try {
    const character = document.querySelector('canvas')?.__character
    if (!character) return alert('角色尚未准备完成')
    exporting.value = true
    const { arrayBuffer, report } = await exportCharacterGlb(character)
    console.info('GLB export verified', report)
    downloadGlb(arrayBuffer, `liberty-cat-${store.tokenId}.glb`)
  } catch (error) {
    console.warn(error)
    alert(error.message || 'GLB 导出失败，请稍后重试')
  } finally { exporting.value = false }
}
function exportPNG() {
  const canvas = document.querySelector('canvas')
  if (!canvas) return
  const link = document.createElement('a')
  link.download = `liberty-cat-${store.tokenId}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}
</script>

<style scoped>
.bottom-bar{position:fixed;bottom:max(16px,env(safe-area-inset-bottom));left:50%;z-index:100;transform:translateX(-50%);animation:slideUp .5s ease-out .45s both}.bottom-inner{display:flex;align-items:center;gap:7px;padding:7px;border-radius:13px;box-shadow:0 16px 45px rgba(0,0,0,.28)}.bottom-inner .btn{min-height:36px}.random-btn{background:var(--accent);color:#1a1a2e;border-color:var(--accent);font-weight:800}.divider{width:1px;height:22px;background:var(--border);margin:0 2px}.hint-text{padding:0 8px;color:var(--text-dim);font-size:.67rem;white-space:nowrap}.btn:disabled{cursor:wait;opacity:.55}@media(max-width:760px){.bottom-bar{width:calc(100% - 16px);bottom:max(8px,env(safe-area-inset-bottom));}.bottom-inner{justify-content:center;width:100%}.hint-text,.divider{display:none}.bottom-inner .btn{flex:1;padding-inline:8px}}
.secondary-action{color:#b8bfd1}@media(max-width:960px){.secondary-action{display:none}}
</style>
