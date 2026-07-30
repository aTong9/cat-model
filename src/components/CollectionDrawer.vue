<template>
  <aside class="collection" :class="{ open }">
    <button class="collection-toggle" aria-controls="collection-panel" :aria-expanded="open" @click="toggleDrawer">
      <span>{{ open ? '收起图鉴' : '全部猫咪' }}</span><b>{{ open ? '×' : '9901' }}</b>
    </button>
    <Transition name="drawer">
      <div v-if="open" id="collection-panel" class="collection-body glass">
        <header><span>LIBERTY CATS ARCHIVE</span><strong>按 NFT 属性筛选并载入真实 Token</strong></header>
        <div class="filters">
          <label v-for="filter in filterDefinitions" :key="filter.key">
            <span>{{ filter.label }}</span>
            <select :value="filters[filter.key]" @change="setFilter(filter.key, $event.target.value)">
              <option value="">全部</option>
              <option v-for="option in filter.options" :key="option.id" :value="option.id" :disabled="optionCount(filter.key, option.id) === 0">{{ option.label }} · {{ optionCount(filter.key, option.id) }}</option>
            </select>
          </label>
        </div>
        <div class="result-line"><span v-if="loading">正在读取目录…</span><span v-else-if="loadError">目录读取失败，请重试</span><span v-else>找到 {{ result.total }} 只<span v-if="result.total > result.tokens.length">，显示前 {{ result.tokens.length }} 只</span></span><button v-if="hasFilters" @click="resetFilters">清除筛选</button></div>
        <div class="cards">
          <button v-for="token in result.tokens" :key="token.tokenId" class="card" :class="{ active: String(store.tokenId) === token.tokenId }" @click="store.loadToken(token.tokenId)">
            <img :src="token.imageUrl" :alt="`Liberty Cat #${token.tokenId}`" loading="lazy" @error="useFallback($event, token)" />
            <span>#{{ token.tokenId }}</span><i v-if="token.special">★</i>
          </button>
        </div>
        <p v-if="loadError" class="empty">{{ loadError }}<button @click="loadCatalog">重新读取</button></p>
        <p v-else-if="!loading && !result.total" class="empty">当前属性组合没有对应 Token。<button @click="resetFilters">清除筛选</button></p>
      </div>
    </Transition>
  </aside>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useCatStore } from '../stores/cat.js'
import { BACKGROUND_TRAITS, EYE_STYLES, FACE_EXPRESSIONS, FUR_TRAITS, GEAR_TRAITS, SPECIAL_TRAITS } from '../config/traits.js'
import { countTokenFilterOptions, filterTokenCatalog, loadTokenCatalog } from '../data/tokenCatalog.js'

const store = useCatStore()
const open = ref(false)
const loading = ref(false)
const loadError = ref('')
const tokens = ref([])
const filters = reactive({ fur: '', eyes: '', face: '', gear: '', background: '', special: '' })
const textOptions = values => values.map(id => ({ id, label: id }))
const filterDefinitions = [
  { key: 'fur', label: '毛色', options: FUR_TRAITS }, { key: 'eyes', label: '眼睛', options: textOptions(EYE_STYLES) },
  { key: 'face', label: '表情', options: textOptions(FACE_EXPRESSIONS) }, { key: 'gear', label: '装备', options: GEAR_TRAITS },
  { key: 'background', label: '背景', options: textOptions(BACKGROUND_TRAITS) }, { key: 'special', label: '特殊', options: SPECIAL_TRAITS },
]
const result = computed(() => filterTokenCatalog(tokens.value, filters, 60))
const hasFilters = computed(() => Object.values(filters).some(Boolean))
const facetCounts = computed(() => Object.fromEntries(filterDefinitions.map(filter => [filter.key, countTokenFilterOptions(tokens.value, filters, filter.key)])))
const optionCount = (key, value) => facetCounts.value[key]?.get(value) ?? 0
async function toggleDrawer() {
  open.value = !open.value
  if (!open.value || tokens.value.length) return
  await loadCatalog()
}
async function loadCatalog() {
  loading.value = true
  loadError.value = ''
  try {
    tokens.value = (await loadTokenCatalog()).tokens
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '无法读取猫咪目录'
  } finally {
    loading.value = false
  }
}
function resetFilters() { for (const key of Object.keys(filters)) filters[key] = '' }
function setFilter(key, value) {
  filters[key] = value
  if (key === 'special' && value) filters.background = ''
  if (key === 'background' && value) filters.special = ''
}
function useFallback(event, token) {
  if (!token.fallbackImageUrl) return
  const fallbackUrl = new URL(token.fallbackImageUrl, window.location.href).href
  if (event.currentTarget.src === fallbackUrl) return
  event.currentTarget.src = fallbackUrl
}
</script>

<style scoped>
.collection{position:fixed;z-index:105;top:116px;left:16px}.collection-toggle{padding:8px 9px 8px 11px;border:1px solid var(--border);border-radius:11px;background:rgba(24,24,40,.84);backdrop-filter:blur(14px);color:#fff;font-size:.69rem;cursor:pointer}.collection-toggle b{display:inline-grid;place-items:center;min-width:20px;height:20px;margin-left:8px;padding:0 5px;border-radius:10px;background:var(--accent);color:#211d13;font-size:.6rem}.collection-body{width:300px;margin-top:8px;padding:13px;border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.26)}.collection-body header{display:grid;gap:4px;margin-bottom:11px}.collection-body header span{color:var(--accent);font-size:.54rem;letter-spacing:.15em}.collection-body header strong{font-size:.69rem;line-height:1.4}.filters{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}.filters label{display:grid;gap:3px}.filters label span{color:#7f899f;font-size:.56rem}.filters select{min-width:0;padding:6px;border:1px solid var(--border);border-radius:6px;background:#242438;color:#d4d7e3;font-size:.61rem}.result-line{display:flex;justify-content:space-between;align-items:center;min-height:28px;color:#8992a7;font-size:.58rem}.result-line button,.empty button{border:0;background:transparent;color:var(--accent);font-size:inherit;cursor:pointer;text-decoration:underline;text-underline-offset:2px}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;max-height:calc(100vh - 360px);overflow:auto}.card{position:relative;aspect-ratio:1;overflow:hidden;padding:0;border:2px solid transparent;border-radius:8px;background:#29283c;cursor:pointer}.card img{display:block;width:100%;height:100%;object-fit:cover;image-rendering:pixelated;transition:transform .2s}.card:hover img{transform:scale(1.07)}.card.active{border-color:var(--accent);box-shadow:0 0 12px var(--accent-glow)}.card span{position:absolute;left:4px;bottom:3px;color:#fff;font-size:.52rem;font-weight:800;text-shadow:0 1px 3px #000}.card i{position:absolute;right:4px;top:3px;color:var(--accent);font-style:normal}.empty{display:grid;gap:6px;padding:18px 0;color:#7e879b;font-size:.63rem;text-align:center}.drawer-enter-active,.drawer-leave-active{transition:opacity .2s,transform .25s}.drawer-enter-from,.drawer-leave-to{opacity:0;transform:translateX(-18px)}@media(max-width:700px){.collection{top:105px;left:8px}.collection-toggle{min-height:44px}.collection-body{width:min(320px,calc(100vw - 16px))}.filters select{min-height:40px}.cards{max-height:calc(100vh - 390px)}.card{min-height:58px}}
</style>
