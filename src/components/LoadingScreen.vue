<template>
  <Transition name="fade">
    <div v-if="store.loading" class="loading-overlay">
      <div class="loading-content">
        <div class="loading-icon">🐱</div>
        <p class="loading-text">{{ loadingText }}</p>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: store.loadingProgress + '%' }"></div>
        </div>
        <p class="progress-num">{{ Math.floor(store.loadingProgress) }}%</p>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'
import { useCatStore } from '../stores/cat.js'

const store = useCatStore()

const loadingText = computed(() => {
  const p = store.loadingProgress
  if (p < 20) return '正在开罐，马上就好…'
  if (p < 50) return '正在给小猫梳毛…'
  if (p < 80) return '正在组装小道具…'
  return '小猫即将登场！🐾'
})
</script>

<style scoped>
.loading-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: #1a1a2e;
  display: flex; align-items: center; justify-content: center;
}
.loading-content {
  text-align: center;
  animation: pulse 1.8s ease-in-out infinite;
}
.loading-icon { font-size: 4rem; }
.loading-text {
  color: #8899bb; font-size: 1rem;
  margin: 16px 0 12px;
}
.progress-bar {
  width: 200px; height: 4px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  margin: 0 auto; overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f4a460, #ff8c00);
  border-radius: 2px;
  transition: width 0.2s ease-out;
}
.progress-num {
  color: #556; font-size: 0.75rem;
  margin-top: 6px; font-family: monospace;
}

.fade-leave-active { transition: opacity 0.5s ease-out; }
.fade-leave-to { opacity: 0; }
</style>
