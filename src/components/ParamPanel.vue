<template>
  <aside class="right-panel" :class="{ expanded: store.panelExpanded }">
    <div class="quick-tools glass" aria-label="环境快捷设置">
      <button class="icon-btn" :class="{ active: store.lightIntensity === 1 }" title="切换灯光" @click="store.lightIntensity = store.lightIntensity === 1 ? .4 : 1">☀</button>
      <button v-for="item in weathers" :key="item.id" class="icon-btn" :class="{ active: store.weather === item.id }" :title="item.label" @click="store.weather = item.id">{{ item.icon }}</button>
    </div>

    <button class="panel-toggle glass" aria-controls="character-panel" :aria-expanded="store.panelExpanded" @click="store.togglePanel">
      <span><small>CHARACTER STUDIO</small><b>{{ store.panelExpanded ? '收起配置' : '打开角色配置' }}</b></span>
      <i>{{ store.panelExpanded ? '›' : '‹' }}</i>
    </button>

    <Transition name="panel">
      <div v-if="store.panelExpanded" id="character-panel" class="panel-body glass">
        <header class="panel-title">
          <div><span>LIBERTY CAT GENERATOR</span><h1>角色配置器</h1></div>
          <b>#{{ String(store.tokenId).padStart(4, '0') }}</b>
        </header>
        <div class="editor-tools" aria-label="编辑历史">
          <button class="btn" :disabled="!store.canUndo" @click="store.undo">撤销</button>
          <button class="btn" :disabled="!store.canRedo" @click="store.redo">重做</button>
          <input v-model.trim="traitQuery" type="search" placeholder="搜索选项" aria-label="搜索角色选项" />
        </div>

        <form class="token-search" @submit.prevent="searchToken">
          <div v-if="traitQuery" class="search-results" role="listbox">
            <button v-for="result in searchResults" :key="result.id" class="btn" type="button" @click="activeTab = result.tab">{{ result.label }}</button>
            <small v-if="!searchResults.length">没有匹配项</small>
          </div>
          <label for="token-id">按 Token ID 载入原始属性</label>
          <div><input id="token-id" v-model.trim="tokenQuery" inputmode="numeric" pattern="[0-9]*" placeholder="0–9901" /><button class="btn" type="submit" :disabled="store.tokenLoading">{{ store.tokenLoading ? '载入中…' : '载入' }}</button></div>
          <small v-if="store.tokenError">{{ store.tokenError }}</small>
        </form>
        <div class="token-nav" aria-label="切换 Token">
          <button class="btn" :disabled="store.tokenLoading" @click="navigateToken(-1)">← 上一只</button>
          <button class="btn" :disabled="store.tokenLoading" @click="navigateToken(1)">下一只 →</button>
          <button class="btn compare-inline" :class="{ active: store.comparisonOpen }" :disabled="!store.referenceImage" @click="store.comparisonOpen = !store.comparisonOpen">2D/3D 核对</button>
        </div>
        <ComparisonPanel v-if="store.comparisonOpen" embedded />

        <nav class="section-tabs" aria-label="配置分类">
          <button v-for="tab in tabs" :key="tab.id" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">{{ tab.label }}</button>
        </nav>

        <section v-if="activeTab === 'body'" class="settings-section">
          <SettingBlock title="基础体型"><div class="choice-grid two morphology-presets"><button v-for="preset in MORPHOLOGY_PRESETS" :key="preset.id" class="choice" :class="{ active: matchesMorphologyPreset(preset) }" type="button" @click="store.applyMorphologyPreset(preset.values)">{{ preset.label }}</button></div></SettingBlock>
          <SettingBlock v-for="control in MORPHOLOGY_CONTROLS" :key="control.key" :title="control.label">
            <div class="range-control">
              <input type="range" :min="control.min" :max="control.max" step="0.01" :value="store.morphology[control.key]" @input="store.setMorphology(control.key, $event.target.value)" />
              <output>{{ store.morphology[control.key].toFixed(2) }}</output>
              <button class="lock-control" :class="{ active: store.morphologyLocks[control.key] }" :title="store.morphologyLocks[control.key] ? '随机时保留此参数' : '锁定后随机不会改变'" @click="store.toggleMorphologyLock(control.key)">{{ store.morphologyLocks[control.key] ? '已锁' : '锁定' }}</button>
            </div>
          </SettingBlock>
          <button class="btn reset-morphology" @click="store.resetMorphology">恢复默认体型</button>
        </section>

        <section v-else-if="activeTab === 'look'" class="settings-section">
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
          <SettingBlock title="舞台"><select v-model="store.stageStyle"><option value="minimal">简约舞台</option><option value="wood">木纹舞台</option><option value="grid">网格舞台</option><option value="hidden">隐藏舞台</option></select></SettingBlock>
          <SettingBlock title="舞台尺寸"><div class="range-control"><input v-model.number="store.stageScale" type="range" min="0.75" max="1.6" step="0.05" /><output>{{ store.stageScale.toFixed(2) }}</output></div></SettingBlock>
          <SettingBlock title="舞台高度"><div class="range-control"><input v-model.number="store.stageHeight" type="range" min="-0.04" max="0.12" step="0.01" /><output>{{ store.stageHeight.toFixed(2) }}</output></div></SettingBlock>
          <SettingBlock title="地板图片"><label class="texture-upload"><input type="file" accept="image/*" @change="onStageTexture"><span class="upload-icon">＋</span><span><b>{{ stageTextureName || '选择本地图片' }}</b><small>{{ stageTextureName ? '已应用为平铺纹理' : 'PNG、JPG 或 WebP' }}</small></span></label></SettingBlock>
          <SettingBlock title="背景"><select :value="store.background || ''" :disabled="Boolean(store.special)" @change="store.setBackground($event.target.value)"><option value="" disabled>{{ store.special ? '特殊场景已启用' : '选择背景' }}</option><option v-for="background in BACKGROUNDS" :key="background">{{ background }}</option></select><p v-if="store.special" class="override-note">背景由 Special「{{ store.special }}」接管。<button type="button" @click="store.setSpecial(null)">恢复普通背景</button></p></SettingBlock>
          <SettingBlock title="特殊场景"><div class="choice-grid two"><button class="choice" :class="{ active: store.special === null }" @click="store.setSpecial(null)">默认场景</button><button v-for="item in SPECIALS" :key="item.id" class="choice" :class="{ active: store.special === item.id }" @click="store.setSpecial(item.id)">{{ item.label }}</button></div></SettingBlock>
        </section>

        <section v-else-if="activeTab === 'ip'" class="settings-section identity-editor">
          <p v-if="store.isSpecialFullScene" class="conflict-note">完整 Special 场景会自动移除冲突装备。</p>
          <button class="btn" @click="store.generateIdentity">按 Seed 离线生成身份</button>
          <label>名称<input :value="store.identity.name" @change="store.setIdentity('name', $event.target.value)" /></label>
          <label>性格<input :value="store.identity.personality.join('，')" @change="store.setIdentity('personality', $event.target.value)" /></label>
          <label>职业<input :value="store.identity.occupation" @change="store.setIdentity('occupation', $event.target.value)" /></label>
          <label>主题<input :value="store.identity.theme" @change="store.setIdentity('theme', $event.target.value)" /></label>
          <label>口头禅<input :value="store.identity.catchphrase" @change="store.setIdentity('catchphrase', $event.target.value)" /></label>
          <label>故事<textarea :value="store.identity.story" rows="5" @change="store.setIdentity('story', $event.target.value)" /></label>
        </section>

        <section v-else class="settings-section">
          <SettingBlock title="姿势"><div class="choice-grid two"><button v-for="item in ACTIONS" :key="item.id" class="choice pose-choice" :class="{ active: store.actionMode === item.id }" :title="item.description" @click="store.actionMode = item.id"><b>{{ item.label }}</b><small>{{ item.description }}</small></button></div></SettingBlock>
          <p class="pose-hint">点击画面中的猫，可依次切换四种姿势</p>
          <div class="keyboard-help"><span><kbd>WASD</kbd>移动</span><span><kbd>Shift</kbd>奔跑</span><span><kbd>Space</kbd>跳跃</span><span><kbd>Ctrl</kbd>潜行</span></div>
        </section>
      </div>
    </Transition>
  </aside>
</template>

<script setup>
import { computed, defineComponent, h, ref } from 'vue'
import { useCatStore, FUR_PRESETS, EYE_STYLES, FACE_EXPRESSIONS, GEAR_LIST, BACKGROUNDS, SPECIALS, ACTIONS, MORPHOLOGY_CONTROLS, MORPHOLOGY_PRESETS } from '../stores/cat.js'
import ComparisonPanel from './ComparisonPanel.vue'
import { QUALITY_MODES } from '../three/RenderQualityController.js'
const store = useCatStore()
const tokenQuery = ref(String(store.tokenId))
const activeTab = ref('look')
const traitQuery = ref('')
const stageTextureName = ref('')
const searchIndex = [
  { id: 'body', tab: 'body', label: '体型与比例' }, { id: 'fur', tab: 'look', label: '毛色外观' },
  { id: 'eyes', tab: 'look', label: '眼睛表情' }, { id: 'gear', tab: 'gear', label: '装备饰品' },
  { id: 'scene', tab: 'scene', label: '场景背景' }, { id: 'identity', tab: 'ip', label: 'IP 身份故事' },
  { id: 'motion', tab: 'motion', label: '动作姿势' },
]
const searchResults = computed(() => searchIndex.filter(item => item.label.toLowerCase().includes(traitQuery.value.toLowerCase())))
const tabs = [{ id: 'body', label: '体型' }, { id: 'look', label: '外观' }, { id: 'gear', label: '装备' }, { id: 'scene', label: '场景' }, { id: 'motion', label: '动作' }]
const weathers = [{ id: 'sunny', icon: '☀', label: '晴天' }, { id: 'cloudy', icon: '☁', label: '多云' }, { id: 'rain', icon: '☂', label: '降雨' }, { id: 'thunder', icon: 'ϟ', label: '雷雨' }]
const searchToken = async () => { if (await store.loadToken(tokenQuery.value)) tokenQuery.value = String(store.tokenId) }
tabs.splice(4, 0, { id: 'ip', label: 'IP' })
const navigateToken = async direction => { if (await store.loadAdjacent(direction)) tokenQuery.value = String(store.tokenId) }
const onStageTexture = event => { const file = event.target.files?.[0]; if (!file) return; stageTextureName.value = file.name; store.setStageTexture(file) }
const furDotStyle = preset => ({ background: preset.pattern === 'solid' ? preset.color : `linear-gradient(135deg,${preset.color} 0 46%,${preset.accent} 47% 65%,#f4f0e4 66%)` })
const matchesMorphologyPreset = preset => Object.entries(preset.values).every(([key, value]) => Math.abs(store.morphology[key] - value) < 0.001)
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
.panel-enter-active,.panel-leave-active{transition:opacity .22s,transform .28s}.panel-enter-from,.panel-leave-to{opacity:0;transform:translateX(28px)}@media(max-width:700px){.right-panel{top:auto;right:8px;bottom:68px;left:8px;align-items:stretch}.quick-tools{display:none}.panel-body{width:100%;max-height:min(68vh,620px);padding:14px;border-radius:18px 18px 12px 12px}.panel-toggle{align-self:flex-end;width:154px}.setting-block{grid-template-columns:42px 1fr}.choice-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.keyboard-help{margin-left:52px}.reference-card img{max-height:145px}.panel-enter-from,.panel-leave-to{transform:translateY(28px)}}
.token-nav{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}.token-nav .btn{min-height:32px;color:#b6bed0;font-size:.68rem}
.pose-choice{display:grid;gap:3px;text-align:left}.pose-choice b{font-size:.68rem}.pose-choice small{color:#7f899f;font-size:.56rem;line-height:1.3}.pose-choice.active small{color:rgba(26,26,46,.72)}.pose-hint{margin-left:58px;color:#7f899f;font-size:.62rem}
.trait-audit{margin-top:11px;border:1px solid var(--border);border-radius:9px;background:rgba(255,255,255,.025)}.trait-audit summary{display:flex;justify-content:space-between;padding:9px 10px;cursor:pointer;color:#aeb5c8;font-size:.65rem}.trait-audit summary b{color:#8590a6;font-weight:500}.trait-audit ul{display:grid;gap:7px;padding:2px 10px 10px;list-style:none}.trait-audit li{display:grid;grid-template-columns:8px 1fr auto;align-items:center;gap:7px;color:#c8ccda;font-size:.62rem}.trait-audit li i{width:7px;height:7px;border-radius:50%}.trait-audit li i.implemented{background:#68d391}.trait-audit li i.partial{background:#f5d33d}.trait-audit li span b{margin-right:6px;color:#7f899f;font-weight:500}.trait-audit li em{color:#8c96aa;font-style:normal}.trait-audit li small{grid-column:2/4;color:#687288;line-height:1.35}
.section-tabs{grid-template-columns:repeat(5,1fr)}
.section-tabs{grid-template-columns:repeat(6,1fr)}.editor-tools{display:flex;gap:6px;margin-top:10px}.identity-editor input,.identity-editor textarea{width:100%;padding:8px;border:1px solid var(--border);border-radius:7px;background:rgba(255,255,255,.055);color:var(--text)}.identity-editor label{display:grid;gap:5px;color:#9ba4b8;font-size:.68rem}.conflict-note{padding:8px;border:1px solid rgba(245,211,61,.3);border-radius:7px;color:#e7d878;font-size:.65rem}
.range-control{display:grid;grid-template-columns:1fr 42px 38px;align-items:center;gap:7px}.range-control input{width:100%;accent-color:var(--accent)}.range-control output{color:var(--accent);font:700 .68rem monospace;text-align:right}.lock-control{padding:4px 2px;border:1px solid var(--border);border-radius:5px;background:transparent;color:#7f899f;font-size:.58rem;cursor:pointer}.lock-control.active{border-color:var(--accent);color:var(--accent)}.reset-morphology{margin-left:58px}
.workspace-modes{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:12px;padding:4px;border-radius:10px;background:rgba(255,255,255,.04)}.workspace-modes button{min-height:34px;border:0;border-radius:7px;background:transparent;color:var(--text-dim);cursor:pointer}.workspace-modes button.active{background:var(--accent);color:#201d14;font-weight:800}.mode-description{margin-top:7px;color:var(--text-dim);font-size:.68rem;line-height:1.5}
.override-note{margin-top:7px;color:var(--text-dim);font-size:.62rem;line-height:1.45}.override-note button{margin-left:3px;border:0;background:transparent;color:var(--accent);font-size:inherit;cursor:pointer;text-decoration:underline;text-underline-offset:2px}
.setting-block h2{font-size:.59rem;line-height:1.35}.editor-tools input::placeholder,.token-search input::placeholder{font-size:.58rem}.texture-upload{display:flex;align-items:center;gap:10px;padding:9px;border:1px dashed rgba(245,211,61,.45);border-radius:9px;background:rgba(245,211,61,.055);color:#aeb5c8;cursor:pointer;transition:.18s}.texture-upload:hover{border-color:var(--accent);background:rgba(245,211,61,.1)}.texture-upload input{position:absolute;width:1px;height:1px;overflow:hidden;opacity:0}.texture-upload>span:last-child{display:grid;gap:2px;min-width:0}.texture-upload b{overflow:hidden;color:var(--text);font-size:.62rem;text-overflow:ellipsis;white-space:nowrap}.texture-upload small{color:#7f899f;font-size:.54rem}.upload-icon{display:grid;place-items:center;flex:0 0 28px;height:28px;border-radius:8px;background:var(--accent);color:#211d13;font-size:1rem;font-weight:800}
.token-nav{grid-template-columns:1fr 1fr 1fr}.compare-inline.active{border-color:var(--accent);color:var(--accent)}
</style>
