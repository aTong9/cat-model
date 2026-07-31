<template>
  <div class="top-bar glass" :aria-label="t('panel.quickToolsAria')">
    <div class="locale-group">
      <button v-for="lang in langs" :key="lang.code" class="btn small"
        :class="{ active: store.language === lang.code }" @click="setLocale(lang.code)">
        {{ t(`languages.${lang.code}`) }}
      </button>
    </div>
    <span class="sep"></span>
    <div class="theme-group">
      <button v-for="theme in themes" :key="theme.code" class="btn small"
        :class="{ active: store.theme === theme.code }" :title="t(`themes.${theme.code}`)" @click="setTheme(theme.code)">
        {{ t(`themes.${theme.code}`) }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { useCatStore } from '../stores/cat.js'
import { useI18n } from 'vue-i18n'
import { normalizeLocale } from '../i18n/index.js'
const { t, locale } = useI18n()
const store = useCatStore()
const langs = [{ code: 'zh' }, { code: 'ja' }, { code: 'en' }]
const themes = [{ code: 'midnight' }, { code: 'neon' }, { code: 'paper' }, { code: 'dark' }]
const setLocale = code => { store.setLanguage(code); locale.value = normalizeLocale(code) }
const setTheme = code => store.setTheme(code)
</script>

<style scoped>
.top-bar { position: fixed; top: 14px; left: 16px; z-index: 100; display: flex; align-items: center; gap: 4px; padding: 5px; border-radius: 11px; animation: slideUp .5s ease-out .3s both; }
.theme-group, .locale-group { display: flex; gap: 4px; }
.sep { width: 1px; height: 18px; background: var(--border); opacity: .62; }
.top-bar .btn { min-height: 30px; padding-inline: 10px; }
</style>
