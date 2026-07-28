<template>
  <div class="app-root">
    <LoadingScreen />
    <CatCanvas />
    <CollectionDrawer />
    <ViewControls />
    <ComparisonPanel />
    <div class="brand-lockup">
      <span class="brand-mark">M</span>
      <div><strong>MEOWVERSE</strong><small>VR CAT LAB</small></div>
    </div>
    <div class="mascot-note">
      <img :src="catImage" alt="Liberty Cats 像素猫参考" />
      <span>当前角色<br><b>#{{ store.tokenId.toString().padStart(4, '0') }}</b></span>
    </div>
    <TopBar />
    <ParamPanel />
    <BottomBar />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useCatStore } from './stores/cat.js'
import CatCanvas from './components/CatCanvas.vue'
import TopBar from './components/TopBar.vue'
import ParamPanel from './components/ParamPanel.vue'
import BottomBar from './components/BottomBar.vue'
import LoadingScreen from './components/LoadingScreen.vue'
import CollectionDrawer from './components/CollectionDrawer.vue'
import ViewControls from './components/ViewControls.vue'
import ComparisonPanel from './components/ComparisonPanel.vue'
import { parseShareQuery } from './core/shareCatConfig.js'

const catImage = new URL('../pixel_cat_3d/cat.png', import.meta.url).href

const store = useCatStore()

onMounted(() => {
  // 模拟加载过程
  let progress = 0
  const interval = setInterval(() => {
    progress += Math.random() * 15 + 3
    if (progress >= 100) {
      progress = 100
      clearInterval(interval)
      setTimeout(() => { store.loading = false }, 350)
    }
    store.loadingProgress = Math.min(progress, 100)
  }, 120)

  // URL 参数
  const params = new URLSearchParams(window.location.search)
  if (params.has('seed')) {
    store.setFromSeed(parseInt(params.get('seed')))
  }
  const explicitKeys = ['fur', 'color', 'eyes', 'face', 'gear', 'bg', 'special']
  if (explicitKeys.some(key => params.has(key))) {
    const traits = parseShareQuery(params)
    store.tokenId = Number(traits.tokenId || 1)
    store.setFurStyle(traits.fur)
    if (params.has('color')) store.setCustomFurColor(traits.furColor)
    store.eyeStyle = traits.eyes
    store.faceExpression = traits.face
    store.gearType = traits.gear
    store.background = traits.background
    store.special = traits.special
  } else if (params.has('tokenId')) store.loadToken(params.get('tokenId'))
})
</script>

<style scoped>
.app-root {
  width: 100%; height: 100%;
  position: relative;
  overflow: hidden;
}
.brand-lockup { position: fixed; z-index: 90; left: 18px; top: 68px; display: flex; align-items: center; gap: 9px; color: #fff; pointer-events: none; }
.brand-mark { display: grid; place-items: center; width: 31px; height: 31px; border-radius: 10px; background: #f5d33d; color: #181622; font: 900 18px/1 Georgia, serif; box-shadow: 0 6px 18px rgba(245, 211, 61, .28); }
.brand-lockup strong { display: block; font-size: .74rem; letter-spacing: .16em; }.brand-lockup small { display: block; margin-top: 2px; color: #aeb2cb; font-size: .57rem; letter-spacing: .2em; }
.mascot-note { position: fixed; z-index: 80; left: 18px; bottom: 20px; display: flex; align-items: center; gap: 9px; color: #d8daea; font-size: .67rem; line-height: 1.45; pointer-events: none; }
.mascot-note img { width: 42px; height: 42px; border-radius: 13px; object-fit: cover; object-position: 50% 33%; border: 1px solid rgba(255,255,255,.18); }.mascot-note b { color: #f5d33d; font-size: .64rem; letter-spacing: .08em; }
@media (max-width: 700px) { .mascot-note { display: none; } .brand-lockup { top: 62px; } }
</style>
