<template>
  <aside class="collection" :class="{ open }">
    <button class="collection-toggle" aria-controls="collection-panel" :aria-expanded="open" @click="toggleDrawer">
      <span>{{ open ? t('panel.filtersOpen') : t('panel.filtersAll') }}</span><b>{{ open ? '×' : '9901' }}</b>
    </button>
    <Transition name="drawer">
      <div v-if="open" id="collection-panel" class="collection-body glass">
        <header><span>{{ t('brand.archive') }}</span><strong>{{ t('panel.filterTitle') }}</strong></header>
        <div class="filters">
          <label v-for="filter in filterDefinitions" :key="filter.key">
            <span>{{ filter.label }}</span>
            <select :value="filters[filter.key]" @change="setFilter(filter.key, $event.target.value)">
              <option value="">{{ t('common.all') }}</option>
              <option v-for="option in filter.options" :key="option.id" :value="option.id" :disabled="optionCount(filter.key, option.id) === 0">{{ option.label }} · {{ optionCount(filter.key, option.id) }}</option>
            </select>
          </label>
        </div>
        <div class="result-line"><span v-if="loading">{{ t('panel.loadingCatalog') }}</span><span v-else-if="loadError">{{ t('panel.catalogError') }}</span><span v-else>{{ t('panel.resultPrefix', { total: result.total }) }}<span v-if="result.total > result.tokens.length">{{ t('panel.showOnly', { visible: result.tokens.length }) }}</span></span><button v-if="hasFilters" @click="resetFilters">{{ t('panel.clearFilters') }}</button></div>
        <div class="cards" @scroll.passive="onCardsScroll">
          <button v-for="token in result.tokens" :key="token.tokenId" class="card" :class="{ active: String(store.tokenId) === token.tokenId }" @click="store.loadToken(token.tokenId)">
            <img :src="token.imageUrl" :alt="`Liberty Cat #${token.tokenId}`" loading="lazy" @error="useFallback($event, token)" />
            <span>#{{ token.tokenId }}</span><i v-if="token.special">★</i>
          </button>
        </div>
        <p v-if="loadError" class="empty">{{ loadError }}<button @click="loadCatalog">{{ t('panel.catalogError') }}</button></p>
        <p v-else-if="!loading && !result.total" class="empty">{{ t('panel.noTokenWithFilters') }}<button @click="resetFilters">{{ t('panel.clearFilters') }}</button></p>
      </div>
    </Transition>
  </aside>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useCatStore } from '../stores/cat.js'
import { useI18n } from 'vue-i18n'
import {
  BACKGROUND_TRAITS,
  EYE_STYLE_OPTIONS,
  FACE_EXPRESSION_OPTIONS,
  FUR_TRAITS,
  GEAR_TRAITS,
  SPECIAL_TRAITS,
} from '../config/traits.js'
import { countTokenFilterOptions, filterTokenCatalog, loadTokenCatalog } from '../data/tokenCatalog.js'

const store = useCatStore()
const open = ref(false)
const loading = ref(false)
const loadError = ref('')
const visibleLimit = ref(24)
const tokens = ref([])
const filters = reactive({ fur: '', eyes: '', face: '', gear: '', background: '', special: '' })
const { t } = useI18n()
const localizeOption = option => ({
  id: option.id,
  label: option.labelKey ? (t(option.labelKey, option.id) || option.label) : option.label,
})
const textOptions = values => values.map(id => ({ id, label: id }))
const localizeStyleOptions = (options, defaultLabel) => options.map(option => {
  const label = t(option.labelKey, option.label || defaultLabel)
  return { id: option.id, label: label || option.label || option.id }
})

const filterDefinitions = [
  { key: 'fur', label: t('panel.filter.fur'), options: FUR_TRAITS.map(localizeOption) },
  { key: 'eyes', label: t('panel.filter.eyes'), options: localizeStyleOptions(EYE_STYLE_OPTIONS, t('panel.filter.eyes')) },
  { key: 'face', label: t('panel.filter.face'), options: localizeStyleOptions(FACE_EXPRESSION_OPTIONS, t('panel.filter.face')) },
  { key: 'gear', label: t('panel.filter.gear'), options: GEAR_TRAITS.map(localizeOption) },
  { key: 'background', label: t('panel.filter.background'), options: textOptions(BACKGROUND_TRAITS) },
  { key: 'special', label: t('panel.filter.special'), options: SPECIAL_TRAITS.map(localizeOption) },
]
const result = computed(() => filterTokenCatalog(tokens.value, filters, visibleLimit.value))
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
    loadError.value = error instanceof Error ? error.message : t('panel.catalogError')
  } finally {
    loading.value = false
  }
}
function resetFilters() { for (const key of Object.keys(filters)) filters[key] = '' }
function setFilter(key, value) {
  visibleLimit.value = 24
  filters[key] = value
  if (key === 'special' && value) filters.background = ''
  if (key === 'background' && value) filters.special = ''
}
function onCardsScroll(event) {
  const element = event.currentTarget
  if (element.scrollHeight - element.scrollTop - element.clientHeight > 120) return
  if (result.value.tokens.length < result.value.total) visibleLimit.value += 24
}
function useFallback(event, token) {
  if (!token.fallbackImageUrl) return
  const fallbackUrl = new URL(token.fallbackImageUrl, window.location.href).href
  if (event.currentTarget.src === fallbackUrl) return
  event.currentTarget.src = fallbackUrl
}
</script>

<style scoped>
.collection{position:fixed;z-index:105;top:116px;left:16px}.collection-toggle{padding:8px 9px 8px 11px;border:1px solid var(--border);border-radius:11px;background:rgba(24,24,40,.84);backdrop-filter:blur(14px);color:#fff;font-size:.69rem;cursor:pointer}.collection-toggle b{display:inline-grid;place-items:center;min-width:20px;height:20px;margin-left:8px;padding:0 5px;border-radius:10px;background:var(--accent);color:#211d13;font-size:.6rem}.collection-body{width:320px;margin-top:8px;padding:13px;border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.26)}.collection-body header{display:grid;gap:4px;margin-bottom:11px}.collection-body header span{color:var(--accent);font-size:.54rem;letter-spacing:.15em}.collection-body header strong{font-size:.69rem;line-height:1.4}.filters{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}.filters label{display:grid;gap:3px}.filters label span{color:#7f899f;font-size:.56rem}.filters select{min-width:0;padding:6px;border:1px solid var(--border);border-radius:6px;background:#242438;color:#d4d7e3;font-size:.61rem}.result-line{display:flex;justify-content:space-between;align-items:center;min-height:28px;color:#8992a7;font-size:.58rem}.result-line button,.empty button{border:0;background:transparent;color:var(--accent);font-size:inherit;cursor:pointer;text-decoration:underline;text-underline-offset:2px}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;max-height:calc(100vh - 360px);overflow:auto}.card{position:relative;aspect-ratio:1;overflow:hidden;padding:0;border:2px solid transparent;border-radius:8px;background:#29283c;cursor:pointer}.card img{display:block;width:100%;height:100%;object-fit:cover;image-rendering:pixelated;transition:transform .2s}.card:hover img{transform:scale(1.04)}.card.active{border-color:var(--accent);box-shadow:0 0 12px var(--accent-glow)}.card span{position:absolute;left:4px;bottom:3px;color:#fff;font-size:.52rem;font-weight:800;text-shadow:0 1px 3px #000}.card i{position:absolute;right:4px;top:3px;color:var(--accent);font-style:normal}.empty{display:grid;gap:6px;padding:18px 0;color:#7e879b;font-size:.63rem;text-align:center}.drawer-enter-active,.drawer-leave-active{transition:opacity .2s,transform .25s}.drawer-enter-from,.drawer-leave-to{opacity:0;transform:translateX(-18px)}@media(max-width:900px){.collection{top:104px;left:10px}.collection-toggle{min-height:40px}.collection-body{width:min(340px,calc(100vw - 20px));max-height:calc(100dvh - 160px);overflow:auto}.filters select{min-height:38px}.cards{max-height:calc(100dvh - 430px)}}@media(max-width:600px){.collection{top:104px;left:10px}.collection-body{position:fixed;top:144px;right:10px;bottom:72px;left:10px;width:auto;margin:0}.cards{grid-template-columns:repeat(3,1fr);max-height:none}.card{min-height:72px}}
.cards,.filters select{scrollbar-width:thin;scrollbar-color:var(--accent) rgba(255,255,255,.06)}.cards::-webkit-scrollbar,.filters select::-webkit-scrollbar{width:6px}.cards::-webkit-scrollbar-track,.filters select::-webkit-scrollbar-track{background:rgba(255,255,255,.05);border-radius:6px}.cards::-webkit-scrollbar-thumb,.filters select::-webkit-scrollbar-thumb{background:var(--accent);border-radius:6px}
</style>
