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
        <div class="param-row"><span class="param-label">毛色</span><div class="color-row"><input type="color" :value="store.furColor" @input="store.furColor = $event.target.value" /><span class="hex-text">{{ store.furColor }}</span></div><div class="preset-row"><button v-for="preset in FUR_PRESETS" :key="preset.label" class="preset-dot" :style="{ background: preset.color }" :class="{ active: store.furColor === preset.color }" :title="preset.label" @click="store.furColor = preset.color" /></div></div>
        <ChoiceRow label="视觉" :items="EYE_STYLES" :active="store.eyeStyle" @select="store.eyeStyle = $event" />
        <ChoiceRow label="表情" :items="FACE_EXPRESSIONS" :active="store.faceExpression" @select="store.faceExpression = $event" />
        <div class="param-row"><span class="param-label">装备</span><div class="btn-row"><button class="btn small" :class="{ active: store.gearType === null }" @click="store.gearType = null">无</button><button v-for="gear in GEAR_LIST" :key="gear.id" class="btn small" :class="{ active: store.gearType === gear.id }" @click="store.gearType = gear.id">{{ gear.label }}</button></div></div>
        <div class="param-row"><span class="param-label">背景</span><select class="select-input" v-model="store.background"><option v-for="background in BACKGROUNDS" :key="background">{{ background }}</option></select></div>
        <div class="param-row"><span class="param-label">场景</span><div class="btn-row"><button class="btn small" :class="{ active: store.special === null }" @click="store.special = null">默认</button><button v-for="special in SPECIALS" :key="special.id" class="btn small" :class="{ active: store.special === special.id }" @click="store.special = special.id">{{ special.label }}</button></div></div>
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
.right-panel { position: fixed; top: 12px; right: 12px; z-index: 90; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; animation: slideLeft .5s ease-out .4s both; }.tool-row { display: flex; gap: 6px; padding: 8px 10px; border-radius: 10px; }.panel-header { padding: 9px 16px; border-radius: 10px; font-size: .8rem; color: var(--text); cursor: pointer; display: flex; align-items: center; gap: 8px; border: 1px solid var(--border); }.arrow { transition: transform .25s; }.arrow.open { transform: rotate(180deg); }.panel-body { padding: 16px; border-radius: 12px; display: flex; flex-direction: column; gap: 13px; width: 330px; max-height: calc(100vh - 160px); overflow-y: auto; }.intro { display: grid; gap: 4px; padding-bottom: 10px; border-bottom: 1px solid var(--border); }.intro span { color: var(--accent); font-size: .6rem; letter-spacing: .18em; }.intro b { font-size: .83rem; }.param-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }.param-label { font-size: .7rem; color: var(--text-dim); min-width: 35px; }.color-row { display: flex; align-items: center; gap: 8px; }.hex-text, .val-text { font-family: monospace; font-size: .73rem; color: var(--text-dim); }.preset-row, .btn-row { display: flex; gap: 4px; flex-wrap: wrap; flex: 1; }.preset-dot { width: 18px; height: 18px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; }.preset-dot.active { border-color: #fff; box-shadow: 0 0 7px var(--accent); }.select-input { background: rgba(255,255,255,.06); border: 1px solid var(--border); border-radius: 6px; color: var(--text); padding: 5px 10px; font-size: .76rem; }.select-input option { background: #1a1a2e; }.slider { accent-color: var(--accent); flex: 1; }.expand-enter-active, .expand-leave-active { transition: all .3s ease; overflow: hidden; }.expand-enter-from, .expand-leave-to { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; }.expand-enter-to, .expand-leave-from { opacity: 1; max-height: 800px; }
</style>
