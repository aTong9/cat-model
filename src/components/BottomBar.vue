<template>
  <div class="bottom-bar">
    <div class="bottom-inner glass">
      <button class="btn random-btn" @click="store.randomize">随机生成</button>
      <div class="divider"></div>
      <button class="btn export-btn" :disabled="exporting" @click="runConfiguredExport"><span>{{ exporting ? exportLabel : '按配置导出' }}</span><i v-if="exporting" :style="{ width: `${exportProgress}%` }"></i></button>
      <button class="btn" :disabled="exporting" @click="exportPNG">保存 PNG</button>
      <details class="output-menu">
        <summary class="btn">导出设置</summary>
        <div class="output-popover glass">
          <header><b>EXPORT API</b><small>参数可复制并复用于批量任务</small></header>
          <label>目标<select v-model="exportConfig.target"><option value="character">完整角色</option><option value="equipment">选中装备</option></select></label>
          <label>预设<select v-model="exportConfig.preset" @change="applyExportPreset"><option v-for="preset in exportPresets" :key="preset.id" :value="preset.id">{{ preset.label }}</option></select></label>
          <label class="check"><input v-model="exportConfig.includeBuiltInAnimations" type="checkbox" /> 默认动画</label>
          <label class="check"><input v-model="exportConfig.includeCustomAnimation" type="checkbox" /> 自定义动画</label>
          <label class="filename">文件名<input v-model.trim="exportConfig.filename" placeholder="留空则自动命名" /></label>
          <button class="btn primary-export" @click="runConfiguredExport">执行 GLB 导出</button>
          <button class="btn" @click="copyExportRequest">复制导出参数</button>
          <hr />
          <button class="btn" @click="exportCharacterCard">角色卡 SVG</button>
          <button class="btn" @click="exportProfile('transparent')">透明头像</button>
          <button class="btn" @click="exportProfile('social')">社交头像</button>
          <button class="btn" @click="exportTurnaround">正侧背三视图</button>
          <button class="btn" @click="exportSelectedEquipment">导出选中装备 GLB</button>
          <button class="btn" @click="copyConfig">{{ copied === 'config' ? '已复制参数' : '复制参数 JSON' }}</button>
          <button class="btn" @click="copyShareUrl">{{ copied === 'url' ? '链接已复制' : '复制分享链接' }}</button>
        </div>
      </details>
    </div>
    <Transition name="toast"><div v-if="notice.text" class="export-notice glass" :class="notice.type" role="status" aria-live="polite"><b>{{ notice.type === 'success' ? '导出完成' : notice.type === 'error' ? '操作失败' : '正在处理' }}</b><span>{{ notice.text }}</span></div></Transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useCatStore } from '../stores/cat.js'
import { createShareUrl, serializeCatConfig } from '../core/shareCatConfig.js'
import { EXPORT_PRESETS, createExportRequest, serializeExportRequest } from '../export/exportRequest.js'
const store = useCatStore()
const exporting = ref(false)
const exportProgress = ref(0)
const exportLabel = ref('正在准备…')
const notice = ref({ type: '', text: '' })
const copied = ref('')
const exportPresets = Object.values(EXPORT_PRESETS)
const exportConfig = ref({ target: 'character', preset: 'game', includeBuiltInAnimations: true, includeCustomAnimation: true, includeMetadata: true, filename: '' })
let noticeTimer
const stageLabels = { audit: '检查角色…', pbr: '转换材质…', encode: '生成 GLB…', verify: '回读校验…', complete: '准备下载…' }
function showNotice(type, text, duration = 3200) {
  clearTimeout(noticeTimer)
  notice.value = { type, text }
  if (duration) noticeTimer = setTimeout(() => { notice.value = { type: '', text: '' } }, duration)
}
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
    showNotice('error', '复制失败，请检查浏览器权限')
  }
}
const copyConfig = () => copyText(serializeCatConfig(store.currentTraits), 'config')
const copyShareUrl = () => copyText(createShareUrl(window.location.href, store.currentTraits), 'url')
const copyExportRequest = () => copyText(serializeExportRequest(exportConfig.value), 'export')
function applyExportPreset() {
  const preset = EXPORT_PRESETS[exportConfig.value.preset]
  if (preset) Object.assign(exportConfig.value, preset)
}
function runConfiguredExport() {
  const request = createExportRequest(exportConfig.value)
  return request.target === 'equipment' ? exportSelectedEquipment(request) : exportGLB(request)
}
async function exportGLB(request = createExportRequest(exportConfig.value)) {
  if (exporting.value) return
  try {
    const canvas = document.querySelector('canvas')
    const character = canvas?.__character
    if (!character) return showNotice('error', '角色尚未准备完成')
    exporting.value = true
    exportProgress.value = 0
    showNotice('progress', '正在检查角色和导出数据', 0)
    const { downloadGlb, exportCharacterGlb, summarizeExportReport } = await import('../export/exportCharacterGlb.js')
    const customDocuments = request.includeCustomAnimation && store.poseDocument.keyframes.length ? [store.poseDocument] : []
    const animations = canvas?.__catAssembly?.model?.createExportAnimationClips({
      include: request.includeBuiltInAnimations ? undefined : [],
      customDocuments,
    }) ?? []
    const { arrayBuffer, report } = await exportCharacterGlb(character, { animations, onProgress: ({ stage, percent }) => {
      exportProgress.value = percent
      exportLabel.value = stageLabels[stage] || '正在导出…'
    } })
    console.info('GLB export verified', report)
    downloadGlb(arrayBuffer, request.filename || `liberty-cat-${store.tokenId}.glb`)
    showNotice('success', summarizeExportReport(report))
  } catch (error) {
    console.warn(error)
    showNotice('error', error.message || 'GLB 导出失败，请稍后重试', 5000)
  } finally { exporting.value = false; exportProgress.value = 0 }
}
function exportPNG() {
  try {
    const canvas = document.querySelector('canvas')
    if (!canvas) return showNotice('error', '画布尚未准备完成')
    const link = document.createElement('a')
    link.download = `liberty-cat-${store.tokenId}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    showNotice('success', `PNG 已保存：#${store.tokenId}`)
  } catch (error) {
    console.warn(error)
    showNotice('error', 'PNG 保存失败，远程纹理可能受到浏览器跨域限制', 5000)
  }
}
function downloadBlob(blob, filename) {
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.href = url; link.download = filename; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function exportCharacterCard() {
  import('../export/characterCard.js').then(({ createCharacterCardSvg }) => {
    downloadBlob(new Blob([createCharacterCardSvg(store.currentTraits)], { type: 'image/svg+xml' }), `liberty-cat-${store.tokenId}-card.svg`)
    showNotice('success', 'SVG 角色卡已生成')
  }).catch(error => showNotice('error', error.message))
}
async function exportProfile(profile) {
  let restore = () => {}
  try {
    const canvas = document.querySelector('canvas')
    restore = canvas?.__beginCharacterCapture?.({ transparent: profile === 'transparent' }) ?? restore
    const { captureOutput } = await import('../export/captureCanvasOutputs.js')
    const result = await captureOutput(canvas, profile)
    canvas.dataset.lastCaptureProfile = profile
    canvas.dataset.lastCaptureCornerAlpha = String(result.cornerAlpha)
    downloadBlob(result.blob, `liberty-cat-${store.tokenId}-${profile}-${result.spec.width}x${result.spec.height}.png`)
    showNotice('success', profile === 'transparent' ? '透明头像已生成' : '社交头像已生成')
  } catch (error) { showNotice('error', error.message) }
  finally { restore() }
}
async function exportTurnaround() {
  try {
    const canvas = document.querySelector('canvas')
    const { captureViewSet } = await import('../export/captureCanvasOutputs.js')
    const captures = await captureViewSet(canvas, { setView: view => window.dispatchEvent(new CustomEvent('cat:set-camera-view', { detail: { view } })) })
    captures.forEach(({ view, blob }) => downloadBlob(blob, `liberty-cat-${store.tokenId}-${view}.png`))
    showNotice('success', '正侧背三视图已生成')
  } catch (error) { showNotice('error', error.message) }
}

async function exportSelectedEquipment(request = createExportRequest({ ...exportConfig.value, target: 'equipment' })) {
  try {
    const entry = document.querySelector('canvas')?.__equipmentScatterController?.getSelectedEntry?.()
    if (!entry) return showNotice('error', '请先点击并选择一个地面装备')
    const [{ exportEquipmentGlb, downloadEquipmentGlb }, { equipmentDocumentToClip }] = await Promise.all([
      import('../export/exportEquipmentGlb.js'),
      import('../character/equipment/equipmentAnimation.js'),
    ])
    const animations = request.includeBuiltInAnimations ? [...entry.animations] : []
    const custom = request.includeCustomAnimation ? equipmentDocumentToClip(store.equipmentPoseDocument, entry.group) : null
    if (custom) animations.push(custom)
    const { arrayBuffer, report } = await exportEquipmentGlb(entry.group, { animations })
    if (request.filename) {
      const url = URL.createObjectURL(new Blob([arrayBuffer], { type: 'model/gltf-binary' }))
      const link = document.createElement('a'); link.href = url; link.download = request.filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0)
    } else downloadEquipmentGlb(arrayBuffer, entry.id)
    showNotice('success', `${entry.id} · ${report.bones} 骨骼 · ${report.animationNames.length} 动画 · ${(report.bytes / 1024).toFixed(0)} KB`)
  } catch (error) {
    console.warn(error)
    showNotice('error', error.message || '装备 GLB 导出失败', 5000)
  }
}

</script>

<style scoped>
.bottom-bar{position:fixed;bottom:max(16px,env(safe-area-inset-bottom));left:50%;z-index:100;transform:translateX(-50%);animation:slideUp .5s ease-out .45s both}.bottom-inner{display:flex;align-items:center;gap:7px;padding:7px;border-radius:13px;box-shadow:0 16px 45px rgba(0,0,0,.28)}.bottom-inner .btn{min-height:36px}.random-btn{background:var(--accent);color:#1a1a2e;border-color:var(--accent);font-weight:800}.divider{width:1px;height:22px;background:var(--border);margin:0 2px}.hint-text{padding:0 8px;color:var(--text-dim);font-size:.67rem;white-space:nowrap}.btn:disabled{cursor:wait;opacity:.55}@media(max-width:760px){.bottom-bar{width:calc(100% - 16px);bottom:max(8px,env(safe-area-inset-bottom));}.bottom-inner{justify-content:center;width:100%}.hint-text,.divider{display:none}.bottom-inner .btn{flex:1;padding-inline:8px}}
.secondary-action{color:#b8bfd1}@media(max-width:960px){.secondary-action{display:none}}
.export-btn{position:relative;overflow:hidden}.export-btn span{position:relative;z-index:1}.export-btn i{position:absolute;bottom:0;left:0;height:2px;background:var(--accent);transition:width .2s}.export-notice{position:absolute;right:0;bottom:calc(100% + 9px);display:grid;gap:2px;min-width:230px;padding:9px 11px;border-radius:10px;color:#cbd0df;font-size:.65rem}.export-notice b{color:var(--accent);font-size:.58rem}.export-notice.error{border-color:rgba(255,120,120,.35)}.export-notice.error b{color:#ff9999}.export-notice.success{border-color:rgba(104,211,145,.35)}.export-notice.success b{color:#68d391}.toast-enter-active,.toast-leave-active{transition:opacity .18s,transform .2s}.toast-enter-from,.toast-leave-to{opacity:0;transform:translateY(7px)}@media(max-width:760px){.export-notice{right:8px;left:8px;min-width:0}}
.output-menu{position:relative}.output-menu summary{min-height:36px;list-style:none}.output-menu summary::-webkit-details-marker{display:none}.output-popover{position:absolute;right:0;bottom:calc(100% + 10px);display:grid;grid-template-columns:1fr 1fr;gap:7px;width:350px;padding:12px;border-radius:12px;box-shadow:0 18px 48px rgba(0,0,0,.35)}.output-popover header,.output-popover hr,.output-popover .filename{grid-column:1/3}.output-popover header{display:grid;gap:2px}.output-popover header b{color:var(--accent);font-size:.58rem;letter-spacing:.12em}.output-popover header small{color:var(--text-dim);font-size:.54rem}.output-popover label{display:grid;gap:4px;color:#9da6ba;font-size:.57rem}.output-popover select,.output-popover input{min-width:0;padding:7px;border:1px solid var(--border);border-radius:7px;background:#242438;color:var(--text);font-size:.62rem}.output-popover .check{display:flex;align-items:center;gap:6px}.output-popover .check input{accent-color:var(--accent)}.output-popover .btn{justify-content:flex-start;min-height:34px}.output-popover .primary-export{background:var(--accent);color:#201d14;font-weight:800}.output-popover hr{width:100%;border:0;border-top:1px solid var(--border)}@media(max-width:760px){.output-menu{flex:1}.output-menu summary{width:100%}.output-popover{right:0;width:min(350px,calc(100vw - 16px))}}
</style>
