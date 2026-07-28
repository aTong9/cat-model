<template>
  <aside class="collection" :class="{ open }">
    <button class="collection-toggle" @click="open = !open">
      <span>{{ open ? '收起图鉴' : '精选图鉴' }}</span><b>{{ open ? '×' : PRESET_CATS.length }}</b>
    </button>
    <Transition name="drawer">
      <div v-if="open" class="collection-body glass">
        <header><span>LIBERTY CATS ARCHIVE</span><strong>选择参考角色，立即载入对应属性</strong></header>
        <div class="cards">
          <button v-for="preset in PRESET_CATS" :key="preset.tokenId" class="card" :class="{ active: store.activePreset === preset.tokenId }" @click="store.applyPreset(preset)">
            <img :src="images[preset.tokenId]" :alt="`Liberty Cat #${preset.tokenId}`" />
            <span>#{{ preset.tokenId }}</span><i v-if="preset.special">★</i>
          </button>
        </div>
      </div>
    </Transition>
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
.collection{position:fixed;z-index:105;top:116px;left:16px}.collection-toggle{padding:8px 9px 8px 11px;border:1px solid var(--border);border-radius:11px;background:rgba(24,24,40,.84);backdrop-filter:blur(14px);color:#fff;font-size:.69rem;cursor:pointer}.collection-toggle b{display:inline-grid;place-items:center;min-width:20px;height:20px;margin-left:8px;padding:0 5px;border-radius:10px;background:var(--accent);color:#211d13;font-size:.6rem}.collection-body{width:246px;margin-top:8px;padding:13px;border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.26)}.collection-body header{display:grid;gap:4px;margin-bottom:11px}.collection-body header span{color:var(--accent);font-size:.54rem;letter-spacing:.15em}.collection-body header strong{font-size:.69rem;line-height:1.4}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;max-height:calc(100vh - 235px);overflow:auto}.card{position:relative;aspect-ratio:1;overflow:hidden;padding:0;border:2px solid transparent;border-radius:9px;background:#29283c;cursor:pointer}.card img{display:block;width:100%;height:100%;object-fit:cover;image-rendering:pixelated;transition:transform .2s}.card:hover img{transform:scale(1.07)}.card.active{border-color:var(--accent);box-shadow:0 0 12px var(--accent-glow)}.card span{position:absolute;left:5px;bottom:4px;color:#fff;font-size:.57rem;font-weight:800;text-shadow:0 1px 3px #000}.card i{position:absolute;right:4px;top:3px;color:var(--accent);font-style:normal}.drawer-enter-active,.drawer-leave-active{transition:opacity .2s,transform .25s}.drawer-enter-from,.drawer-leave-to{opacity:0;transform:translateX(-18px)}@media(max-width:700px){.collection{top:105px;left:8px}.collection-body{width:218px}.cards{max-height:calc(100vh - 230px)}}
</style>
