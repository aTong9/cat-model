<template>
  <div class="right-panel" :class="{ expanded: store.panelExpanded }">
    <div class="tool-row glass">
      <button class="btn round" :class="{ active: store.musicOn }" @click="store.musicOn = !store.musicOn" :title="store.musicOn ? '关闭氛围音' : '开启氛围音'">{{ store.musicOn ? '♪' : '♫' }}</button>
      <button class="btn round" title="切换光照" @click="store.lightIntensity = store.lightIntensity === 1 ? .4 : 1">{{ store.lightIntensity === 1 ? '☀' : '◐' }}</button>
      <button v-for="weather in weathers" :key="weather.id" class="btn round" :class="{ active: store.weather === weather.id }" :title="weather.label" @click="store.weather = weather.id">{{ weather.icon }}</button>
    </div>
    <button class="panel-header glass" @click="store.togglePanel">
      <span>{{ store.panelExpanded ? '收起控制台' : '定制你的 VR 猫' }}</span><span class="arrow" :class="{ open: store.panelExpanded }">⌄</span>
    </button>
    <Transition name="expand">
      <div v-if="store.panelExpanded" class="panel-body glass">
        <section class="intro"><span>CHARACTER STUDIO</span><b>打造独一无二的猫咪搭档</b></section>
        <div class="param-row"><span class="param-label">毛色</span><div class="color-row"><input type="color" :value="store.furColor" @input="store.setCustomFurColor($event.target.value)" /><span class="hex-text">{{ store.furStyle === 'Custom' ? store.furColor : store.furStyle }}</span></div><div class="preset-row"><button v-for="preset in FUR_PRESETS" :key="preset.id" class="preset-dot" :style="furDotStyle(preset)" :class="{ active: store.furStyle === preset.id }" :title="preset.label" @click="store.setFurStyle(preset.id)" /></div></div>
        <ChoiceRow label="视觉" :items="EYE_STYLES" :active="store.eyeStyle" @select="store.eyeStyle = $event" />
        <ChoiceRow label="表情" :items="FACE_EXPRESSIONS" :active="store.faceExpression" @select="store.faceExpression = $event" />
        <div class="param-row"><span class="param-label">装备</span><div class="btn-row"><button class="btn small" :class="{ active: store.gearType === null }" @click="store.gearType = null">无</button><button v-for="gear in GEAR_LIST" :key="gear.id" class="btn small" :class="{ active: store.gearType === gear.id }" @click="store.gearType = gear.id">{{ gear.label }}</button></div></div>
        <div class="param-row"><span class="param-label">背景</span><select class="select-input" :value="store.background || ''" :disabled="Boolean(store.special)" @change="store.setBackground($event.target.value)"><option value="" disabled>{{ store.special ? '场景启用中' : '选择背景' }}</option><option v-for="background in BACKGROUNDS" :key="background">{{ background }}</option></select></div>
        <div class="param-row"><span class="param-label">场景</span><div class="btn-row"><button class="btn small" :class="{ active: store.special === null }" @click="store.setSpecial(null)">默认</button><button v-for="special in SPECIALS" :key="special.id" class="btn small" :class="{ active: store.special === special.id }" @click="store.setSpecial(special.id)">{{ special.label }}</button></div></div>
        <div v-if="store.weather === 'rain' || store.weather === 'thunder'" class="param-row"><span class="param-label">雨量</span><input type="range" min="0" max="2" step=".1" v-model.number="store.rainAmount" class="slider" /><span class="val-text">{{ store.rainAmount.toFixed(1) }}</span></div>
        <div v-if="store.weather !== 'sunny'" class="param-row"><span class="param-label">云量</span><input type="range" min="0" max="2" step=".1" v-model.number="store.cloudAmount" class="slider" /><span class="val-text">{{ store.cloudAmount.toFixed(1) }}</span></div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { defineComponent, h } from 'vue'
import { useCatStore, FUR_PRESETS, EYE_STYLES, FACE_EXPRESSIONS, GEAR_LIST, BACKGROUNDS, SPECIALS } from '../stores/cat.js'
const store = useCatStore()
const weathers = [{ id: 'sunny', icon: '☀', label: '晴天' }, { id: 'cloudy', icon: '☁', label: '多云' }, { id: 'thunder', icon: 'ϟ', label: '雷雨' }, { id: 'rain', icon: '☂', label: '降雨' }]
const furDotStyle = preset => ({
  background: preset.pattern === 'solid'
    ? preset.color
    : `linear-gradient(135deg, ${preset.color} 0 46%, ${preset.accent} 47% 62%, #f4f0e4 63% 100%)`,
})
const ChoiceRow = defineComponent({
  props: ['label', 'items', 'active'],
  emits: ['select'],
  setup(props, { emit }) {
    return () => h('div', { class: 'param-row' }, [
      h('span', { class: 'param-label' }, props.label),
      h('div', { class: 'btn-row' }, props.items.map(item => h('button', {
        class: ['btn', 'small', { active: props.active === item }],
        onClick: () => emit('select', item),
      }, item))),
    ])
  },
})
</script>

<style scoped>
/* ====== 面板整体 ====== */
.right-panel {
  position: fixed; top: 14px; right: 14px; bottom: 14px; z-index: 90;
  display: flex; flex-direction: column; align-items: flex-end; gap: 10px;
  animation: slideInRight .55s cubic-bezier(0.22, 0.61, 0.36, 1) .3s both;
}
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(80px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* ====== 顶部工具条 ====== */
.tool-row {
  display: flex; gap: 8px; padding: 10px 12px; border-radius: 10px;
}

/* ====== 面板标题按钮 ====== */
.panel-header {
  padding: 11px 20px; border-radius: 10px;
  font-size: .84rem; color: var(--text); cursor: pointer;
  display: flex; align-items: center; gap: 8px;
  border: 1px solid var(--border);
  transition: all .25s;
}
.panel-header:hover { background: rgba(255,255,255,.08); }
.arrow { transition: transform .25s; }
.arrow.open { transform: rotate(180deg); }

/* ====== 展开面板主体 ====== */
.panel-body {
  padding: 22px 20px; border-radius: 14px;
  display: flex; flex-direction: column; gap: 22px;
  width: 430px;
  max-height: calc(100vh - 92px);
  overflow-y: auto; overflow-x: hidden;
  flex-shrink: 1;
}
/* 自定义滚动条 */
.panel-body::-webkit-scrollbar { width: 4px; }
.panel-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 4px; }

/* ====== 介绍区 ====== */
.intro {
  display: grid; gap: 4px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}
.intro span {
  color: var(--accent); font-size: .63rem; letter-spacing: .25em;
  text-transform: uppercase;
}
.intro b { font-size: .9rem; font-weight: 600; }

/* ====== 参数行 ====== */
.param-row {
  display: flex; align-items: flex-start; gap: 12px;
}
.param-label {
  font-size: .74rem; color: var(--text-dim);
  min-width: 38px; padding-top: 5px;
  flex-shrink: 0;
}

/* ====== 颜色行 ====== */
.color-row { display: flex; align-items: center; gap: 10px; flex: 1; }
.hex-text, .val-text {
  font-family: monospace; font-size: .78rem; color: var(--text-dim);
}

/* ====== 预设颜色圆点 ====== */
.preset-row { display: flex; gap: 6px; flex-wrap: wrap; flex: 1; }
.preset-dot {
  width: 22px; height: 22px; border-radius: 50%;
  border: 2px solid transparent; cursor: pointer;
  transition: all .18s;
}
.preset-dot:hover { transform: scale(1.15); }
.preset-dot.active {
  border-color: #fff;
  box-shadow: 0 0 10px var(--accent-glow);
  transform: scale(1.1);
}

/* ====== 按钮网格（视觉/表情/装备/场景） ====== */
.btn-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 6px;
  flex: 1;
}
.btn.small { padding: 6px 8px; font-size: .71rem; border-radius: 6px; }

/* ====== 下拉选择 ====== */
.select-input {
  flex: 1;
  background: rgba(255,255,255,.06);
  border: 1px solid var(--border); border-radius: 6px;
  color: var(--text); padding: 7px 12px;
  font-size: .78rem; cursor: pointer;
}
.select-input option { background: #1a1a2e; }
.select-input:disabled { cursor: not-allowed; opacity: .48; }

/* ====== 滑块 ====== */
.slider { accent-color: var(--accent); flex: 1; height: 4px; }

/* ====== 圆形按钮（音乐/光照/天气） ====== */
.btn.round { width: 38px; height: 38px; font-size: 1.05rem; }

/* ====== 展开/收起动画 — 从右往左滑出 ====== */
.expand-enter-active {
  transition: all .38s cubic-bezier(0.22, 0.61, 0.36, 1);
  overflow: hidden;
}
.expand-leave-active {
  transition: all .25s ease-in;
  overflow: hidden;
}
.expand-enter-from {
  opacity: 0;
  transform: translateX(60px);
  max-height: 0;
}
.expand-enter-to {
  opacity: 1;
  transform: translateX(0);
  max-height: 1200px;
}
.expand-leave-from {
  opacity: 1;
  transform: translateX(0);
  max-height: 1200px;
}
.expand-leave-to {
  opacity: 0;
  transform: translateX(40px);
  max-height: 0;
}
</style>
