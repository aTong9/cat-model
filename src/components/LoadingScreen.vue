<template>
  <Transition name="fade">
    <div v-if="store.loading" class="loading-overlay">
      <div class="loading-content">
        <div class="loading-icon">🐈</div>
        <strong>{{ t('brand.catStudio') }}</strong>
        <p>{{ loadingText }}</p>
        <div class="progress-bar"><div class="progress-fill" :style="{ width: `${store.loadingProgress}%` }"></div></div>
        <small>{{ Math.floor(store.loadingProgress) }}%</small>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'
import { useCatStore } from '../stores/cat.js'
import { useI18n } from 'vue-i18n'
const store = useCatStore()
const { t } = useI18n()
const loadingText = computed(() => {
  if (store.loadingProgress < 20) return t('loading.text1')
  if (store.loadingProgress < 50) return t('loading.text2')
  if (store.loadingProgress < 80) return t('loading.text3')
  return t('loading.text4')
})
</script>

<style scoped>
.loading-overlay{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;background:radial-gradient(circle at 50% 42%,#292942 0,#11111c 58%)}
.loading-content{width:min(280px,72vw);text-align:center}.loading-icon{font-size:3.4rem;filter:drop-shadow(0 10px 22px rgba(0,0,0,.35));animation:float 1.8s ease-in-out infinite}.loading-content strong{display:block;margin-top:12px;color:#f5d33d;font-size:.72rem;letter-spacing:.22em}.loading-content p{margin:14px 0 12px;color:#aeb5cb;font-size:.82rem}.progress-bar{height:4px;overflow:hidden;border-radius:4px;background:rgba(255,255,255,.09)}.progress-fill{height:100%;border-radius:inherit;background:linear-gradient(90deg,#f5d33d,#ff9f43);transition:width .2s}.loading-content small{display:block;margin-top:8px;color:#66708a;font:600 .68rem monospace}@keyframes float{50%{transform:translateY(-7px)}}.fade-leave-active{transition:opacity .45s}.fade-leave-to{opacity:0}
</style>
