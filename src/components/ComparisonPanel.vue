<template>
  <div v-if="store.referenceImage" class="comparison-shell" :class="{ open: store.comparisonOpen }">
    <button class="comparison-toggle glass" @click="store.comparisonOpen = !store.comparisonOpen">
      <span>{{ store.comparisonOpen ? '关闭原图' : '2D / 3D 对照' }}</span><b>{{ store.comparisonOpen ? '×' : '↔' }}</b>
    </button>
    <Transition name="compare">
      <figure v-if="store.comparisonOpen" class="comparison-card glass">
        <header>
          <div><span>ORIGINAL NFT</span><strong>Liberty Cat #{{ store.tokenId }}</strong></div>
          <i :class="imageState">{{ stateLabel }}</i>
        </header>
        <div class="image-stage">
          <div v-if="imageState === 'loading'" class="image-loading"><span></span><b>正在读取 NFT 原图…</b></div>
          <img v-show="imageState === 'ready'" :src="imageSource" :alt="`Liberty Cat #${store.tokenId} 原始 NFT`" @load="onLoad" @error="onError" />
          <div v-if="imageState === 'error'" class="image-error"><b>原图加载失败</b><span>远程地址与本地兜底均不可用</span></div>
        </div>
        <figcaption>
          <span>左侧原图仅用于视觉校验，不会进入 GLB。</span>
          <button @click="setFrontView">切回正面视角</button>
        </figcaption>
      </figure>
    </Transition>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useCatStore } from '../stores/cat.js'
const store = useCatStore()
const imageState = ref('loading')
const usingFallback = ref(false)
const imageSource = computed(() => usingFallback.value ? store.referenceImageFallback : store.referenceImage)
const stateLabel = computed(() => imageState.value === 'ready' ? (usingFallback.value || store.referenceImageSource === 'local' ? '本地资源' : '远程原图') : imageState.value === 'error' ? '不可用' : '加载中')
watch(() => store.referenceImage, () => { imageState.value = 'loading'; usingFallback.value = false })
function onLoad() { imageState.value = 'ready' }
function onError() {
  if (!usingFallback.value && store.referenceImageFallback) {
    usingFallback.value = true
    imageState.value = 'loading'
  } else imageState.value = 'error'
}
function setFrontView() { window.dispatchEvent(new CustomEvent('cat:set-camera-view', { detail: { view: 'front' } })) }
</script>

<style scoped>
.comparison-shell{position:fixed;z-index:106;left:16px;top:165px;pointer-events:none}.comparison-shell>*{pointer-events:auto}.comparison-toggle{display:flex;align-items:center;gap:8px;padding:8px 9px 8px 11px;color:#fff;font-size:.69rem;cursor:pointer}.comparison-toggle b{display:grid;place-items:center;width:20px;height:20px;border-radius:7px;background:rgba(245,211,61,.15);color:var(--accent)}.comparison-card{width:min(330px,calc(100vw - 440px));min-width:260px;margin-top:8px;padding:12px;border-radius:14px;box-shadow:0 20px 55px rgba(0,0,0,.32)}.comparison-card header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.comparison-card header div{display:grid;gap:3px}.comparison-card header span{color:var(--accent);font-size:.52rem;letter-spacing:.15em}.comparison-card header strong{font-size:.76rem}.comparison-card header i{padding:4px 6px;border-radius:6px;background:rgba(104,211,145,.1);color:#68d391;font-size:.55rem;font-style:normal}.comparison-card header i.loading{color:#aeb5c8}.comparison-card header i.error{color:#ff9b9b}.image-stage{position:relative;display:grid;place-items:center;overflow:hidden;aspect-ratio:1;border-radius:10px;background:linear-gradient(145deg,#151522,#202035)}.image-stage img{width:100%;height:100%;object-fit:contain;image-rendering:pixelated}.image-loading,.image-error{display:grid;place-items:center;gap:9px;color:#8993aa;font-size:.65rem}.image-loading span{width:24px;height:24px;border:2px solid rgba(255,255,255,.12);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite}.image-error b{color:#ff9b9b}.image-error span{font-size:.58rem}.comparison-card figcaption{display:flex;align-items:center;justify-content:space-between;gap:9px;margin-top:9px;color:#7f899f;font-size:.58rem;line-height:1.4}.comparison-card figcaption button{flex-shrink:0;padding:5px 7px;border:1px solid var(--border);border-radius:6px;background:rgba(255,255,255,.045);color:#b9c0d0;font-size:.58rem;cursor:pointer}.compare-enter-active,.compare-leave-active{transition:opacity .2s,transform .28s}.compare-enter-from,.compare-leave-to{opacity:0;transform:translateX(-22px)}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:900px){.comparison-card{width:280px;min-width:0}}@media(max-width:700px){.comparison-shell{left:8px;right:8px;top:auto;bottom:114px}.comparison-toggle{margin-left:0}.comparison-card{width:100%;height:min(48vh,390px);display:grid;grid-template-columns:minmax(0,1fr) 112px;grid-template-rows:auto 1fr;margin-top:6px}.comparison-card header{grid-column:1/3}.image-stage{min-height:0;aspect-ratio:auto}.comparison-card figcaption{display:grid;align-content:center;padding-left:10px}.comparison-card figcaption button{width:100%}}
</style>
