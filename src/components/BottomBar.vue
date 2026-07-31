<template>
  <div class="bottom-bar">
    <div class="bottom-inner glass">
      <button class="btn random-btn" @click="store.randomize">{{ t('common.randomize') }}</button>
      <div class="divider"></div>
      <button class="btn export-btn" :disabled="exporting" @click="runConfiguredExport"><span>{{ exporting ? exportLabel : t('panel.export.exportButton') }}</span><i v-if="exporting" :style="{ width: `${exportProgress}%` }"></i></button>
      <button class="btn" :disabled="exporting" @click="exportPNG">{{ t('panel.export.png') }}</button>
      <details class="output-menu">
        <summary class="btn">{{ t('panel.export.exportApi') }}</summary>
        <div class="output-popover glass">
          <header><b>{{ t('panel.export.exportApi') }}</b><small>{{ t('panel.export.exportHint') }}</small></header>
          <label>{{ t('panel.export.target') }}<select v-model="exportConfig.target"><option value="character">{{ t('panel.export.targetCharacter') }}</option><option value="equipment">{{ t('panel.export.targetEquipment') }}</option></select></label>
          <label>{{ t('panel.export.preset') }}<select v-model="exportConfig.preset" @change="applyExportPreset"><option v-for="preset in exportPresets" :key="preset.id" :value="preset.id">{{ preset.localizedLabel }}</option></select></label>
          <label class="check"><input v-model="exportConfig.includeBuiltInAnimations" type="checkbox" /> {{ t('panel.export.includeBuiltinAnimations') }}</label>
          <label class="check"><input v-model="exportConfig.includeCustomAnimation" type="checkbox" /> {{ t('panel.export.includeCustomAnimation') }}</label>
          <label class="filename">{{ t('panel.export.filename') }}<input v-model.trim="exportConfig.filename" :placeholder="t('panel.export.filenameHint')" /></label>
          <button class="btn primary-export" @click="runConfiguredExport">{{ t('panel.export.runExport') }}</button>
          <button class="btn" @click="copyExportRequest">{{ t('panel.export.copyRequest') }}</button>
          <hr />
          <button class="btn" @click="exportCharacterCard">{{ t('panel.export.characterCard') }}</button>
          <button class="btn" @click="exportProfile('transparent')">{{ t('panel.export.transparentProfile') }}</button>
          <button class="btn" @click="exportProfile('social')">{{ t('panel.export.socialProfile') }}</button>
          <button class="btn" @click="exportTurnaround">{{ t('panel.export.turnaround') }}</button>
          <button class="btn" @click="exportSelectedEquipment">{{ t('panel.export.exportSelectedEquipment') }}</button>
          <button class="btn" @click="copyConfig">{{ copied === 'config' ? t('panel.export.copyConfigDone') : t('panel.export.copyConfig') }}</button>
          <button class="btn" @click="copyShareUrl">{{ copied === 'url' ? t('panel.export.shareCopied') : t('panel.export.copyShare') }}</button>
        </div>
      </details>
    </div>
    <Transition name="toast"><div v-if="notice.text" class="export-notice glass" :class="notice.type" role="status" aria-live="polite"><b>{{ notice.type === 'success' ? t('panel.notice.exportComplete') : notice.type === 'error' ? t('panel.notice.error') : t('panel.notice.exporting') }}</b><span>{{ notice.text }}</span></div></Transition>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useCatStore } from '../stores/cat.js'
import { useI18n } from 'vue-i18n'
import { createShareUrl, serializeCatConfig } from '../core/shareCatConfig.js'
import { EXPORT_PRESETS, createExportRequest, serializeExportRequest } from '../export/exportRequest.js'
const store = useCatStore()
const { t } = useI18n()
const exporting = ref(false)
const exportProgress = ref(0)
const exportLabel = ref(t('panel.exportPreparing'))
const notice = ref({ type: '', text: '' })
const copied = ref('')
const exportPresets = computed(() => Object.values(EXPORT_PRESETS).map(preset => ({
  ...preset,
  localizedLabel: t(preset.labelKey || preset.label) || preset.label || preset.id,
})))
const exportConfig = ref({ target: 'character', preset: 'game', includeBuiltInAnimations: true, includeCustomAnimation: true, includeMetadata: true, filename: '' })
let noticeTimer
const stageLabels = {
  audit: t('panel.stageLabels.audit'),
  pbr: t('panel.stageLabels.pbr'),
  encode: t('panel.stageLabels.encode'),
  verify: t('panel.stageLabels.verify'),
  complete: t('panel.stageLabels.complete'),
}

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
    showNotice('error', t('panel.errors.copyFail'))
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
    if (!character) return showNotice('error', t('panel.errors.notReady'))
    exporting.value = true
    exportProgress.value = 0
    showNotice('progress', t('panel.errors.tokenLoadProgress'), 0)
    const { downloadGlb, exportCharacterGlb, summarizeExportReport } = await import('../export/exportCharacterGlb.js')
    const customDocuments = request.includeCustomAnimation && store.poseDocument.keyframes.length ? [store.poseDocument] : []
    const animations = canvas?.__catAssembly?.model?.createExportAnimationClips({
      include: request.includeBuiltInAnimations ? undefined : [],
      customDocuments,
    }) ?? []
    const { arrayBuffer, report } = await exportCharacterGlb(character, { animations, optimize: request.optimize, meshopt: request.meshopt, onProgress: ({ stage, percent }) => {
      exportProgress.value = percent
      exportLabel.value = stageLabels[stage] || t('panel.notice.exporting')
    } })
    const { validateExportBudget } = await import('../export/exportRequest.js')
    const budget = validateExportBudget(report, request)
    if (!budget.valid) throw new Error(t('panel.errors.exportBudgetExceeded', { preset: budget.preset, reasons: budget.failures.join(', ') }))
    console.info('GLB export verified', report)
    downloadGlb(arrayBuffer, request.filename || `liberty-cat-${store.tokenId}.glb`)
    showNotice('success', summarizeExportReport(report))
  } catch (error) {
    console.warn(error)
    showNotice('error', error.message || t('panel.errors.exportFail'), 5000)
  } finally { exporting.value = false; exportProgress.value = 0 }
}
function exportPNG() {
  try {
    const canvas = document.querySelector('canvas')
    if (!canvas) return showNotice('error', t('panel.errors.notReady'))
    const link = document.createElement('a')
    link.download = `liberty-cat-${store.tokenId}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    showNotice('success', t('panel.errors.pngReady', { tokenId: store.tokenId }))
  } catch (error) {
    console.warn(error)
    showNotice('error', t('panel.errors.pngFail'), 5000)
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
    showNotice('success', t('panel.errors.cardReady'))
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
    showNotice('success', profile === 'transparent' ? t('panel.errors.transparentReady') : t('panel.errors.socialReady'))
  } catch (error) { showNotice('error', error.message) }
  finally { restore() }
}
async function exportTurnaround() {
  try {
    const canvas = document.querySelector('canvas')
    const { captureViewSet } = await import('../export/captureCanvasOutputs.js')
    const captures = await captureViewSet(canvas, { setView: view => window.dispatchEvent(new CustomEvent('cat:set-camera-view', { detail: { view } })) })
    captures.forEach(({ view, blob }) => downloadBlob(blob, `liberty-cat-${store.tokenId}-${view}.png`))
    showNotice('success', t('panel.errors.turnaroundReady'))
  } catch (error) { showNotice('error', error.message) }
}

async function exportSelectedEquipment(request = createExportRequest({ ...exportConfig.value, target: 'equipment' })) {
  try {
    const entry = document.querySelector('canvas')?.__equipmentScatterController?.getSelectedEntry?.()
    if (!entry) return showNotice('error', t('panel.errors.copyShareFailed'))
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
    showNotice('success', t('panel.exportReport', {
      id: entry.id,
      bones: report.bones,
      animations: report.animationNames.length,
      size: (report.bytes / 1024).toFixed(0),
    }))
  } catch (error) {
    console.warn(error)
    showNotice('error', error.message || t('panel.errors.equipmentExportFail'), 5000)
  }
}

</script>

<style scoped>
.bottom-bar{position:fixed;bottom:max(16px,env(safe-area-inset-bottom));left:50%;z-index:100;transform:translateX(-50%);animation:slideUp .5s ease-out .45s both}.bottom-inner{display:flex;align-items:center;gap:7px;padding:7px;border-radius:13px;box-shadow:0 16px 45px rgba(0,0,0,.28)}.bottom-inner .btn{min-height:36px}.random-btn{background:var(--accent);color:#1a1a2e;border-color:var(--accent);font-weight:800}.divider{width:1px;height:22px;background:var(--border);margin:0 2px}.hint-text{padding:0 8px;color:var(--text-dim);font-size:.67rem;white-space:nowrap}.btn:disabled{cursor:wait;opacity:.55}@media(max-width:760px){.bottom-bar{width:calc(100% - 16px);bottom:max(8px,env(safe-area-inset-bottom));}.bottom-inner{justify-content:center;width:100%}.hint-text,.divider{display:none}.bottom-inner .btn{flex:1;padding-inline:8px}}
.secondary-action{color:#b8bfd1}@media(max-width:960px){.secondary-action{display:none}}
.export-btn{position:relative;overflow:hidden}.export-btn span{position:relative;z-index:1}.export-btn i{position:absolute;bottom:0;left:0;height:2px;background:var(--accent);transition:width .2s}.export-notice{position:absolute;right:0;bottom:calc(100% + 9px);display:grid;gap:2px;min-width:230px;padding:9px 11px;border-radius:10px;color:#cbd0df;font-size:.65rem}.export-notice b{color:var(--accent);font-size:.58rem}.export-notice.error{border-color:rgba(255,120,120,.35)}.export-notice.error b{color:#ff9999}.export-notice.success{border-color:rgba(104,211,145,.35)}.export-notice.success b{color:#68d391}.toast-enter-active,.toast-leave-active{transition:opacity .18s,transform .2s}.toast-enter-from,.toast-leave-to{opacity:0;transform:translateY(7px)}@media(max-width:760px){.export-notice{right:8px;left:8px;min-width:0}}
.output-menu{position:relative}.output-menu summary{min-height:36px;list-style:none}.output-menu summary::-webkit-details-marker{display:none}.output-popover{position:absolute;right:0;bottom:calc(100% + 10px);display:grid;grid-template-columns:1fr 1fr;gap:7px;width:350px;padding:12px;border-radius:12px;box-shadow:0 18px 48px rgba(0,0,0,.35)}.output-popover header,.output-popover hr,.output-popover .filename{grid-column:1/3}.output-popover header{display:grid;gap:2px}.output-popover header b{color:var(--accent);font-size:.58rem;letter-spacing:.12em}.output-popover header small{color:var(--text-dim);font-size:.54rem}.output-popover label{display:grid;gap:4px;color:#9da6ba;font-size:.57rem}.output-popover select,.output-popover input{min-width:0;padding:7px;border:1px solid var(--border);border-radius:7px;background:#242438;color:var(--text);font-size:.62rem}.output-popover .check{display:flex;align-items:center;gap:6px}.output-popover .check input{accent-color:var(--accent)}.output-popover .btn{justify-content:flex-start;min-height:34px}.output-popover .primary-export{background:var(--accent);color:#201d14;font-weight:800}.output-popover hr{width:100%;border:0;border-top:1px solid var(--border)}@media(max-width:760px){.output-menu{flex:1}.output-menu summary{width:100%}.output-popover{right:0;width:min(350px,calc(100vw - 16px))}}
</style>
