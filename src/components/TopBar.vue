<template>
  <div class="top-bar glass" aria-label="语言选择">
    <button v-for="lang in langs" :key="lang.code" class="btn small"
      :class="{ active: store.language === lang.code }" @click="store.setLanguage(lang.code)">
      {{ lang.label }}
    </button>
  </div>
</template>

<script setup>
import { useCatStore } from '../stores/cat.js'
const store = useCatStore()
const langs = [{ code: 'zh', label: '中' }, { code: 'ja', label: '日' }, { code: 'en', label: 'EN' }]
</script>

<style scoped>
.top-bar { position: fixed; top: 12px; left: 12px; z-index: 100; display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 10px; animation: slideUp .5s ease-out .3s both; }
</style>
