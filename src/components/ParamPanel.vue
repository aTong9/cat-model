<template>
  <aside class="right-panel" :class="{ expanded: store.panelExpanded }">
    <div class="quick-tools glass" aria-label="环境快捷设置">
      <button class="icon-btn" :class="{ active: store.lightIntensity === 1 }" title="切换灯光" @click="store.lightIntensity = store.lightIntensity === 1 ? .4 : 1">☀</button>
      <button v-for="item in weathers" :key="item.id" class="icon-btn" :class="{ active: store.weather === item.id }" :title="item.label" @click="store.weather = item.id">{{ item.icon }}</button>
    </div>

    <button class="panel-toggle glass" @click="store.togglePanel">
      <span><small>CHARACTER STUDIO</small><b>{{ store.panelExpanded ? '收起配置' : '打开角色配置' }}</b></span>
      <i>{{ store.panelExpanded ? '›' : '‹' }}</i>
    </button>

    <Transition name="panel">
      <div v-if="store.panelExpanded" class="panel-body glass">
        <header class="panel-title">
          <div><span>LIBERTY CAT GENERATOR</span><h1>角色配置器</h1></div>
          <b>#{{ String(store.tokenId).padStart(4, '0') }}</b>
        </header>

        <form class="token-search" @submit.prevent="searchToken">
          <label for="token-id">按 Token ID 载入原始属性</label>
          <div><input id="token-id" v-model.trim="tokenQuery" inputmode="numeric" pattern="[0-9]*" placeholder="0–9901" /><button class="btn" type="submit" :disabled="store.tokenLoading">{{ store.tokenLoading ? '载入中…' : '载入' }}</button></div>
          <small v-if="store.tokenError">{{ store.tokenError }}</small>
        </form>
        <div class="token-nav" aria-label="切换 Token">
          <button class="btn" :disabled="store.tokenLoading" @click="navigateToken(-1)">← 上一只</button>
          <button class="btn" :disabled="store.tokenLoading" @click="navigateToken(1)">下一只 →</button>
        </div>

        <details class="trait-audit">
          <summary><span>当前 Trait 状态</span><b>{{ traitSummary.implemented }} 已实现<span v-if="traitSummary.partial"> · {{ traitSummary.partial }} 部分实现</span></b></summary>
          <ul>
            <li v-for="item in traitSummary.items" :key="`${item.type}:${item.value}`">
              <i :class="item.status"></i><span><b>{{ traitNames[item.type] }}</b>{{ item.value }}</span><em>{{ item.label }}</em>
              <small>{{ item.note }}</small>
            </li>
          </ul>
        </details>

        <TraitMatrix />

        <nav class="section-tabs" aria-label="配置分类">
          <button v-for="tab in tabs" :key="tab.id" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">{{ tab.label }}</button>
        </nav>

        <section v-if="activeTab === 'look'" class="settings-section">
          <SettingBlock title="毛色">
            <div class="color-control"><input type="color" :value="store.furColor" @input="store.setCustomFurColor($event.target.value)" /><span>{{ store.furStyle === 'Custom' ? store.furColor : store.furStyle }}</span></div>
            <div class="swatches"><button v-for="preset in FUR_PRESETS" :key="preset.id" class="swatch" :class="{ active: store.furStyle === preset.id }" :style="furDotStyle(preset)" :title="preset.label" @click="store.setFurStyle(preset.id)" /></div>
          </SettingBlock>
          <SettingBlock title="眼睛"><div class="choice-grid"><button v-for="item in EYE_STYLES" :key="item" class="choice" :class="{ active: store.eyeStyle === item }" @click="store.eyeStyle = item">{{ item }}</button></div></SettingBlock>
          <SettingBlock title="表情"><div class="choice-grid"><button v-for="item in FACE_EXPRESSIONS" :key="item" class="choice" :class="{ active: store.faceExpression === item }" @click="store.faceExpression = item">{{ item }}</button></div></SettingBlock>
        </section>

        <section v-else-if="activeTab === 'gear'" class="settings-section">
          <SettingBlock title="装备">
            <div class="choice-grid two"><button class="choice" :class="{ active: store.gearType === null }" @click="store.gearType = null">无装备</button><button v-for="gear in GEAR_LIST" :key="gear.id" class="choice" :class="{ active: store.gearType === gear.id }" @click="store.gearType = gear.id">{{ gear.label }}</button></div>
          </SettingBlock>
        </section>

        <section v-else-if="activeTab === 'scene'" class="settings-section">
          <SettingBlock title="画质"><select v-model="store.qualityMode"><option v-for="item in QUALITY_MODES" :key="item.id" :value="item.id">{{ item.label }}</option></select></SettingBlock>
          <SettingBlock title="背景"><select :value="store.background || ''" :disabled="Boolean(store.special)" @change="store.setBackground($event.target.value)"><option value="" disabled>{{ store.special ? '特殊场景已启用' : '选择背景' }}</option><option v-for="background in BACKGROUNDS" :key="background">{{ background }}</option></select></SettingBlock>
          <SettingBlock title="特殊场景"><div class="choice-grid two"><button class="choice" :class="{ active: store.special === null }" @click="store.setSpecial(null)">默认场景</button><button v-for="item in SPECIALS" :key="item.id" class="choice" :class="{ active: store.special === item.id }" @click="store.setSpecial(item.id)">{{ item.label }}</button></div></SettingBlock>
        </section>

        <section v-else class="settings-section">
          <SettingBlock title="动作"><div class="choice-grid"><button v-for="item in ACTIONS" :key="item.id" class="choice" :class="{ active: store.actionMode === item.id }" @click="store.actionMode = item.id">{{ item.label }}</button></div></SettingBlock>
          <div class="keyboard-help"><span><kbd>WASD</kbd>移动</span><span><kbd>Shift</kbd>奔跑</span><span><kbd>Space</kbd>跳跃</span><span><kbd>Ctrl</kbd>潜行</span></div>
        </section>
      </div>
    </Transition>
  </aside>
</template>

<script setup>
import { computed, defineComponent, h, ref } from 'vue'
import { useCatStore, FUR_PRESETS, EYE_STYLES, FACE_EXPRESSIONS, GEAR_LIST, BACKGROUNDS, SPECIALS, ACTIONS } from '../stores/cat.js'
import { summarizeTraitStatuses } from '../core/traitStatus.js'
import TraitMatrix from './TraitMatrix.vue'
import { QUALITY_MODES } from '../three/RenderQualityController.js'
const store = useCatStore()
const tokenQuery = ref(String(store.tokenId))
const activeTab = ref('look')
const traitSummary = computed(() => summarizeTraitStatuses(store.currentTraits))
const traitNames = { fur: '毛色', eyes: '眼睛', face: '表情', gear: '装备', background: '背景', special: 'Special' }
const tabs = [{ id: 'look', label: '外观' }, { id: 'gear', label: '装备' }, { id: 'scene', label: '场景' }, { id: 'motion', label: '动作' }]
const weathers = [{ id: 'sunny', icon: '☀', label: '晴天' }, { id: 'cloudy', icon: '☁', label: '多云' }, { id: 'rain', icon: '☂', label: '降雨' }, { id: 'thunder', icon: 'ϟ', label: '雷雨' }]
const searchToken = async () => { if (await store.loadToken(tokenQuery.value)) tokenQuery.value = String(store.tokenId) }
const navigateToken = async direction => { if (await store.loadAdjacent(direction)) tokenQuery.value = String(store.tokenId) }
const furDotStyle = preset => ({ background: preset.pattern === 'solid' ? preset.color : `linear-gradient(135deg,${preset.color} 0 46%,${preset.accent} 47% 65%,#f4f0e4 66%)` })
const SettingBlock = defineComponent({
  props: { title: String },
  setup(props, { slots }) { return () => h('div', { class: 'setting-block' }, [h('h2', props.title), h('div', { class: 'setting-content' }, slots.default?.())]) },
})
</script>

<style scoped>
.right-panel{position:fixed;top:14px;right:14px;bottom:14px;z-index:110;display:flex;flex-direction:column;align-items:flex-end;gap:9px;pointer-events:none}.right-panel>*{pointer-events:auto}.quick-tools{display:flex;gap:5px;padding:5px;border-radius:12px}.icon-btn{display:grid;place-items:center;width:34px;height:34px;border:1px solid transparent;border-radius:9px;background:transparent;color:#afb6ca;font-size:1rem;cursor:pointer}.icon-btn:hover{background:rgba(255,255,255,.07)}.icon-btn.active{border-color:rgba(245,211,61,.35);background:rgba(245,211,61,.15);color:var(--accent)}
.panel-toggle{display:flex;align-items:center;justify-content:space-between;width:168px;padding:9px 11px;color:var(--text);cursor:pointer}.panel-toggle span{display:grid;text-align:left}.panel-toggle small{color:var(--accent);font-size:.5rem;letter-spacing:.12em}.panel-toggle b{margin-top:2px;font-size:.72rem}.panel-toggle i{font-style:normal;font-size:1.4rem;color:var(--text-dim)}
.panel-body{width:min(390px,calc(100vw - 28px));max-height:calc(100vh - 104px);overflow:auto;padding:18px;border-radius:16px;box-shadow:0 18px 55px rgba(0,0,0,.28)}.panel-body::-webkit-scrollbar{width:4px}.panel-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.14);border-radius:5px}.panel-title{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:1px solid var(--border)}.panel-title span{color:var(--accent);font-size:.55rem;letter-spacing:.16em}.panel-title h1{margin-top:4px;font-size:1rem}.panel-title>b{padding:6px 8px;border-radius:8px;background:rgba(245,211,61,.12);color:var(--accent);font:700 .7rem monospace}
.token-search{display:grid;gap:7px;margin-top:15px}.token-search label{color:#aeb5c8;font-size:.67rem}.token-search>div{display:flex;gap:7px}.token-search input{min-width:0;flex:1;padding:9px 10px;border:1px solid var(--border);border-radius:8px;outline:none;background:rgba(255,255,255,.055);color:var(--text)}.token-search input:focus{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-glow)}.token-search small{color:#ff9b9b;font-size:.67rem}
.reference-card{position:relative;overflow:hidden;margin-top:12px;border:1px solid var(--border);border-radius:11px;background:#171725}.reference-card img{display:block;width:100%;max-height:188px;object-fit:contain;image-rendering:pixelated}.reference-card figcaption{position:absolute;right:7px;bottom:7px;display:flex;gap:8px;padding:5px 7px;border-radius:6px;background:rgba(12,12,20,.8);font-size:.62rem}.reference-card figcaption span{color:#aeb5c8}.reference-card figcaption b{color:var(--accent)}
.section-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin:15px 0;padding:4px;border-radius:10px;background:rgba(255,255,255,.04)}.section-tabs button{padding:7px 3px;border:0;border-radius:7px;background:transparent;color:#8e97ad;font-size:.69rem;cursor:pointer}.section-tabs button.active{background:rgba(255,255,255,.09);color:#fff;box-shadow:0 3px 10px rgba(0,0,0,.12)}.settings-section{display:grid;gap:15px}.setting-block{display:grid;grid-template-columns:48px minmax(0,1fr);gap:10px}.setting-block h2{padding-top:7px;color:#7f899f;font-size:.7rem;font-weight:500}.setting-content{min-width:0}.color-control{display:flex;align-items:center;gap:9px;margin-bottom:8px}.color-control span{overflow:hidden;color:#aeb5c8;font:600 .69rem monospace;text-overflow:ellipsis;white-space:nowrap}.swatches{display:flex;flex-wrap:wrap;gap:7px}.swatch{width:25px;height:25px;border:2px solid transparent;border-radius:50%;cursor:pointer}.swatch.active{border-color:#fff;box-shadow:0 0 0 2px var(--accent),0 0 12px var(--accent-glow)}.choice-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.choice-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}.choice{min-height:34px;padding:6px;border:1px solid var(--border);border-radius:7px;background:rgba(255,255,255,.045);color:#c9ccda;font-size:.68rem;cursor:pointer}.choice:hover{background:rgba(255,255,255,.09)}.choice.active{border-color:var(--accent);background:var(--accent);color:#1a1a2e;font-weight:700}.setting-content select{width:100%;padding:9px;border:1px solid var(--border);border-radius:8px;background:#242438;color:var(--text)}.keyboard-help{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin-left:58px;color:#929bb0;font-size:.66rem}.keyboard-help span{display:flex;align-items:center;gap:6px}.keyboard-help kbd{min-width:42px;padding:4px;border:1px solid var(--border);border-radius:5px;background:rgba(255,255,255,.055);color:var(--accent);text-align:center;font:600 .62rem monospace}
.panel-enter-active,.panel-leave-active{transition:opacity .22s,transform .28s}.panel-enter-from,.panel-leave-to{opacity:0;transform:translateX(28px)}@media(max-width:700px){.right-panel{top:58px;right:8px;bottom:64px}.quick-tools{display:none}.panel-body{max-height:calc(100vh - 164px);padding:14px}.panel-toggle{width:154px}.setting-block{grid-template-columns:42px 1fr}.choice-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.keyboard-help{margin-left:52px}.reference-card img{max-height:145px}}
.token-nav{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}.token-nav .btn{min-height:32px;color:#b6bed0;font-size:.68rem}
.trait-audit{margin-top:11px;border:1px solid var(--border);border-radius:9px;background:rgba(255,255,255,.025)}.trait-audit summary{display:flex;justify-content:space-between;padding:9px 10px;cursor:pointer;color:#aeb5c8;font-size:.65rem}.trait-audit summary b{color:#8590a6;font-weight:500}.trait-audit ul{display:grid;gap:7px;padding:2px 10px 10px;list-style:none}.trait-audit li{display:grid;grid-template-columns:8px 1fr auto;align-items:center;gap:7px;color:#c8ccda;font-size:.62rem}.trait-audit li i{width:7px;height:7px;border-radius:50%}.trait-audit li i.implemented{background:#68d391}.trait-audit li i.partial{background:#f5d33d}.trait-audit li span b{margin-right:6px;color:#7f899f;font-weight:500}.trait-audit li em{color:#8c96aa;font-style:normal}.trait-audit li small{grid-column:2/4;color:#687288;line-height:1.35}
</style>
