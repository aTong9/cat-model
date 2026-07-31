<template>
  <figure v-if="store.referenceImage" class="reference-preview">
    <div class="image-stage">
      <div v-if="imageState === 'loading'" class="image-loading"><span></span><b>正在载入原图…</b></div>
      <img v-show="imageState === 'ready'" :src="imageSource" :alt="`Liberty Cat #${store.tokenId} 原始图片`" @load="onLoad" @error="onError" />
      <div v-if="imageState === 'error'" class="image-error"><b>图片不可用</b><span>本地与远程资源均未载入</span></div>
    </div>
    <figcaption>
      <div><span>ORIGINAL TOKEN</span><strong>Liberty Cat #{{ store.tokenId }}</strong></div>
      <i :class="imageState">{{ stateLabel }}</i>
      <button type="button" @click="setFrontView">切到正面</button>
    </figcaption>
  </figure>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useCatStore } from '../stores/cat.js'
const store = useCatStore()
const imageState = ref('loading')
const usingFallback = ref(false)
const imageSource = computed(() => usingFallback.value ? store.referenceImageFallback : store.referenceImage)
const stateLabel = computed(() => imageState.value === 'ready' ? (usingFallback.value || store.referenceImageSource === 'local' ? '本地图片' : '网络图片') : imageState.value === 'error' ? '不可用' : '载入中')
watch(() => store.referenceImage, () => { imageState.value = 'loading'; usingFallback.value = false })
function onLoad() { imageState.value = 'ready' }
function onError() { if (!usingFallback.value && store.referenceImageFallback) { usingFallback.value = true; imageState.value = 'loading' } else imageState.value = 'error' }
function setFrontView() { window.dispatchEvent(new CustomEvent('cat:set-camera-view', { detail: { view: 'front' } })) }
</script>

<style scoped>
.reference-preview{display:grid;grid-template-columns:126px minmax(0,1fr);gap:11px;margin-top:10px;padding:9px;border:1px solid var(--border);border-radius:12px;background:rgba(255,255,255,.025)}.image-stage{position:relative;display:grid;place-items:center;overflow:hidden;aspect-ratio:1;border-radius:9px;background:#171725}.image-stage img{width:100%;height:100%;object-fit:contain;image-rendering:pixelated}.image-loading,.image-error{display:grid;place-items:center;gap:6px;padding:8px;color:#8993aa;font-size:.58rem;text-align:center}.image-loading span{width:20px;height:20px;border:2px solid rgba(255,255,255,.12);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite}.image-error b{color:#ff9b9b}figcaption{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:5px;min-width:0}figcaption div{display:grid;gap:2px}figcaption span{color:var(--accent);font-size:.48rem;letter-spacing:.14em}figcaption strong{font-size:.72rem}figcaption i{padding:3px 5px;border-radius:5px;background:rgba(104,211,145,.1);color:#68d391;font-size:.52rem;font-style:normal}figcaption i.loading{color:#aeb5c8}figcaption i.error{color:#ff9b9b}figcaption button{margin-top:3px;padding:5px 7px;border:1px solid var(--border);border-radius:6px;background:rgba(255,255,255,.045);color:#b9c0d0;font-size:.56rem;cursor:pointer}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:700px){.reference-preview{grid-template-columns:96px 1fr}}
</style>
