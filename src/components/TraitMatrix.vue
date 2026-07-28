<template>
  <details class="matrix">
    <summary><span>全部 Trait 实现矩阵</span><b>{{ totals.total }} 项 · {{ totals.partial }} 项待视觉验收</b></summary>
    <div class="matrix-body">
      <section v-for="group in groups" :key="group.type">
        <header><b>{{ group.label }}</b><small>{{ group.items.length }}</small></header>
        <div class="matrix-grid">
          <button v-for="item in group.items" :key="`${group.type}:${item.id}`" :class="[{ selected: isSelected(group.type, item.id) }, statusOf(group.type, item.id).status]" :title="statusOf(group.type, item.id).note" type="button" @click="selectTrait(group.type, item.id)">
            <i></i><span>{{ item.label }}</span>
          </button>
        </div>
      </section>
      <p><i class="implemented"></i>已实现 <i class="partial"></i>部分实现／待视觉验收</p>
    </div>
  </details>
</template>

<script setup>
import { computed } from 'vue'
import { useCatStore } from '../stores/cat.js'
import { BACKGROUND_TRAITS, EYE_STYLES, FACE_EXPRESSIONS, FUR_TRAITS, GEAR_TRAITS, SPECIAL_TRAITS } from '../config/traits.js'
import { getTraitStatus } from '../core/traitStatus.js'
const store = useCatStore()
const textItems = values => values.map(id => ({ id, label: id }))
const groups = [
  { type: 'fur', label: '毛色 Fur', items: FUR_TRAITS.map(item => ({ id: item.id, label: item.label })) },
  { type: 'eyes', label: '眼睛 Eyes', items: textItems(EYE_STYLES) },
  { type: 'face', label: '表情 Face', items: textItems(FACE_EXPRESSIONS) },
  { type: 'gear', label: '装备 Gear', items: GEAR_TRAITS.map(item => ({ id: item.id, label: item.label })) },
  { type: 'background', label: '背景 Background', items: textItems(BACKGROUND_TRAITS) },
  { type: 'special', label: '特殊场景 Special', items: SPECIAL_TRAITS.map(item => ({ id: item.id, label: item.label })) },
]
const statusOf = (type, value) => getTraitStatus(type, value)
const totals = computed(() => {
  const statuses = groups.flatMap(group => group.items.map(item => statusOf(group.type, item.id)))
  return { total: statuses.length, partial: statuses.filter(item => item.status === 'partial').length }
})
const currentValue = type => ({ fur: store.furStyle, eyes: store.eyeStyle, face: store.faceExpression, gear: store.gearType, background: store.background, special: store.special })[type]
const isSelected = (type, value) => currentValue(type) === value
function selectTrait(type, value) {
  if (type === 'fur') store.setFurStyle(value)
  else if (type === 'eyes') store.eyeStyle = value
  else if (type === 'face') store.faceExpression = value
  else if (type === 'gear') store.gearType = value
  else if (type === 'background') store.setBackground(value)
  else if (type === 'special') store.setSpecial(value)
}
</script>

<style scoped>
.matrix{margin-top:8px;border:1px solid var(--border);border-radius:9px;background:rgba(255,255,255,.025)}.matrix summary{display:flex;justify-content:space-between;gap:8px;padding:9px 10px;cursor:pointer;color:#aeb5c8;font-size:.65rem}.matrix summary b{color:#8590a6;font-weight:500;text-align:right}.matrix-body{display:grid;gap:11px;padding:3px 10px 11px}.matrix section{display:grid;gap:6px}.matrix header{display:flex;align-items:center;gap:6px;color:#8d96aa;font-size:.62rem}.matrix header small{display:grid;place-items:center;min-width:17px;height:17px;border-radius:9px;background:rgba(255,255,255,.06);font-size:.55rem}.matrix-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}.matrix-grid button{display:flex;align-items:center;gap:6px;min-width:0;padding:6px 7px;border:1px solid var(--border);border-radius:6px;background:rgba(255,255,255,.035);color:#b7bdcc;font-size:.61rem;text-align:left;cursor:pointer}.matrix-grid button:hover{background:rgba(255,255,255,.08)}.matrix-grid button.selected{border-color:var(--accent);box-shadow:0 0 0 1px rgba(245,211,61,.18)}.matrix-grid button span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.matrix-grid i,.matrix-body p i{flex:0 0 auto;width:6px;height:6px;border-radius:50%}.matrix-grid .implemented i,.matrix-body i.implemented{background:#68d391}.matrix-grid .partial i,.matrix-body i.partial{background:#f5d33d}.matrix-body p{display:flex;align-items:center;gap:5px;color:#707a90;font-size:.57rem}.matrix-body p i.partial{margin-left:7px}
</style>
