<template>
  <aside class="collection" :class="{ open }">
    <button class="collection-toggle" @click="open = !open">
      <span>收藏图鉴</span><b>{{ open ? '×' : '15' }}</b>
    </button>
    <div v-if="open" class="collection-body glass">
      <header><span>PIXEL CAT ARCHIVE</span><strong>选择一张，立即套用造型与场景</strong></header>
      <div class="cards">
        <button v-for="preset in PRESET_CATS" :key="preset.tokenId" class="card"
          :class="{ active: store.activePreset === preset.tokenId }" @click="store.applyPreset(preset)">
          <img :src="images[preset.tokenId]" :alt="`Pixel Cat #${preset.tokenId}`" />
          <span>#{{ preset.tokenId }}</span><i v-if="preset.special">✦</i>
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref } from 'vue'
import { PRESET_CATS, useCatStore } from '../stores/cat.js'
const store = useCatStore()
const open = ref(false)
const files = import.meta.glob('../../pixel_cat_3d/img/*.png', { eager: true, query: '?url', import: 'default' })
const images = Object.fromEntries(PRESET_CATS.map(preset => [preset.tokenId, files[`../../pixel_cat_3d/img/${preset.tokenId}.png`]]))
</script>

<style scoped>
.collection { position: fixed; z-index: 100; top: 116px; left: 16px; }.collection-toggle { border: 1px solid rgba(255,255,255,.13); border-radius: 11px; color: #fff; background: rgba(24,24,40,.84); backdrop-filter: blur(12px); padding: 9px 11px; cursor: pointer; font-size: .72rem; letter-spacing: .06em; }.collection-toggle b { display: inline-grid; place-items:center; width: 18px; height:18px; margin-left: 7px; border-radius: 50%; background: var(--accent); color: #211d13; font-size: .62rem; }.collection-body { width: 232px; margin-top: 8px; padding: 12px; border-radius: 13px; }.collection-body header { display: grid; gap: 4px; margin-bottom: 10px; }.collection-body header span { color: var(--accent); font-size: .56rem; letter-spacing: .15em; }.collection-body header strong { font-size: .7rem; line-height: 1.4; }.cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; max-height: calc(100vh - 228px); overflow-y: auto; padding-right: 2px; }.card { position: relative; aspect-ratio: 1; padding: 0; overflow: hidden; border: 2px solid transparent; border-radius: 8px; background: #29283c; cursor: pointer; }.card img { width: 100%; height: 100%; display:block; object-fit: cover; image-rendering: pixelated; transition: transform .22s ease; }.card:hover img { transform: scale(1.08); }.card.active { border-color: var(--accent); box-shadow: 0 0 12px var(--accent-glow); }.card span { position:absolute; left:4px; bottom:3px; color:#fff; font-size:.57rem; font-weight:800; text-shadow:0 1px 2px #000; }.card i { position:absolute; right:3px; top:2px; color:var(--accent); font-style:normal; text-shadow:0 1px 2px #000; }
@media (max-width: 700px) { .collection { top: 105px; left: 10px; }.collection-body { width: 210px; } }
</style>
