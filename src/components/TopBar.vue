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
const langs = [{ code: 'zh', label: '中文' }, { code: 'ja', label: '日本語' }, { code: 'en', label: 'EN' }]
</script>

<style scoped>
.top-bar { position: fixed; top: 14px; left: 16px; z-index: 100; display: flex; align-items: center; gap: 4px; padding: 5px; border-radius: 11px; animation: slideUp .5s ease-out .3s both; }
.top-bar .btn { min-height: 30px; padding-inline: 10px; }
</style>
