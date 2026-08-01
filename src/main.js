import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { i18n } from './i18n/index.js'
import './styles/main.css'

const app = createApp(App)
app.use(createPinia())
app.use(i18n)

const toPx = n => `${Math.max(0, Math.round(n * 10) / 10)}px`
const getViewportDimensions = () => {
  const vv = window.visualViewport
  const width = vv?.width ?? document.documentElement.clientWidth
  const height = vv?.height ?? document.documentElement.clientHeight
  return {
    width: Math.max(Math.round(width), 1),
    height: Math.max(Math.round(height), 1),
  }
}

const updateRem = () => {
  const { width, height } = getViewportDimensions()
  // Keep desktop controls compact. Mobile gets a small readability bump without
  // scaling every panel with large-screen viewport dimensions.
  const rem = width <= 600 ? 12 : width <= 900 ? 11.5 : height <= 700 ? 10.5 : 11
  const remText = toPx(rem)
  document.documentElement.style.setProperty('--rem-base', remText)
  document.documentElement.style.fontSize = remText
  document.documentElement.dataset.rem = rem.toFixed(1)
}
let rafHandle = 0
const scheduleUpdateRem = () => {
  if (rafHandle) cancelAnimationFrame(rafHandle)
  rafHandle = requestAnimationFrame(() => {
    updateRem()
    rafHandle = 0
  })
}
  scheduleUpdateRem()
window.addEventListener('resize', scheduleUpdateRem, { passive: true })
window.addEventListener('orientationchange', scheduleUpdateRem)
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', scheduleUpdateRem, { passive: true })
  window.visualViewport.addEventListener('scroll', scheduleUpdateRem, { passive: true })
}
app.mount('#app')
