<template>
  <aside class="right-panel" :class="{ expanded: store.panelExpanded }">
    <div class="quick-tools glass" :aria-label="t('controls.weather.label')">
      <button class="icon-btn" :class="{ active: store.lightIntensity === 1 }" :title="t('controls.lighting')" @click="store.lightIntensity = store.lightIntensity === 1 ? .4 : 1">☀</button>
      <button v-for="item in weathers" :key="item.id" class="icon-btn" :class="{ active: store.weather === item.id }" :title="item.label" @click="store.weather = item.id">{{ item.icon }}</button>
    </div>

    <button class="panel-toggle glass" aria-controls="character-panel" :aria-expanded="store.panelExpanded" @click="store.togglePanel">
      <span><small>{{ t('brand.generator') }}</small><b>{{ store.panelExpanded ? t('panel.collapse') : t('panel.open') }}</b></span>
      <i>{{ store.panelExpanded ? '›' : '‹' }}</i>
    </button>

    <Transition name="panel">
      <div v-if="store.panelExpanded" id="character-panel" class="panel-body glass">
        <header class="panel-title">
          <div><span>{{ t('brand.generator') }}</span><h1>{{ t('brand.generatorTitle') }}</h1></div>
          <b>#{{ String(store.tokenId).padStart(4, '0') }}</b>
        </header>

        <div class="editor-tools" :aria-label="t('panel.editHistory')">
          <button class="btn" :disabled="!store.canUndo" @click="store.undo">{{ t('common.undo') }}</button>
          <button class="btn" :disabled="!store.canRedo" @click="store.redo">{{ t('common.redo') }}</button>
          <input v-model.trim="traitQuery" type="search" :placeholder="t('panel.searchPlaceholder')" :aria-label="t('panel.searchLabel')" />
        </div>

        <form class="token-search" @submit.prevent="searchToken">
          <div v-if="traitQuery" class="search-results" role="listbox">
            <button v-for="result in searchResults" :key="result.id" class="btn" type="button" @click="activeTab = result.tab">{{ result.label }}</button>
            <small v-if="!searchResults.length">{{ t('panel.traitSearchNoResult') }}</small>
          </div>
          <label for="token-id">{{ t('panel.loadFromToken') }}</label>
          <div>
            <input id="token-id" v-model.trim="tokenQuery" inputmode="numeric" pattern="[0-9]*" :placeholder="t('panel.tokenPlaceholder')" />
            <button class="btn" type="submit" :disabled="store.tokenLoading">{{ store.tokenLoading ? t('panel.loading') : t('panel.load') }}</button>
          </div>
          <small v-if="tokenErrorText" class="token-error">{{ tokenErrorText }}</small>
        </form>

        <div class="token-nav" :aria-label="t('panel.tokenNav')">
          <button class="btn" :disabled="store.tokenLoading" @click="navigateToken(-1)">{{ t('panel.previous') }} ←</button>
          <button class="btn" :disabled="store.tokenLoading" @click="navigateToken(1)">→ {{ t('panel.next') }}</button>
        </div>

        <ComparisonPanel v-if="store.referenceImage" />

        <nav class="section-tabs" :aria-label="t('panel.categoryNav')">
          <button v-for="tab in tabs" :key="tab.id" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">{{ tab.label }}</button>
        </nav>

        <section v-if="activeTab === 'body'" class="settings-section">
          <SettingBlock :title="t('panel.title.body')">
            <div class="choice-grid two morphology-presets">
              <button
                v-for="preset in morphologyPresets"
                :key="preset.id"
                class="choice"
                :class="{ active: matchesMorphologyPreset(preset) }"
                type="button"
                @click="store.applyMorphologyPreset(preset.values)"
              >{{ preset.label }}</button>
            </div>
          </SettingBlock>
          <SettingBlock v-for="control in localizedMorphologyControls" :key="control.key" :title="control.label">
            <div class="range-control">
              <input type="range" :min="control.min" :max="control.max" :step="control.step" :value="store.morphology[control.key]" @input="store.setMorphology(control.key, $event.target.value)" />
              <output>{{ store.morphology[control.key].toFixed(2) }}</output>
              <button class="lock-control" :class="{ active: store.morphologyLocks[control.key] }" :title="store.morphologyLocks[control.key] ? t('panel.morphologyLockKeep') : t('panel.morphologyLockDesc')" @click="store.toggleMorphologyLock(control.key)">
                {{ store.morphologyLocks[control.key] ? t('panel.morphologyLocked') : t('panel.morphologyLock') }}
              </button>
            </div>
          </SettingBlock>
          <button class="btn reset-morphology" @click="store.resetMorphology">{{ t('panel.resetMorphology') }}</button>
        </section>

        <section v-else-if="activeTab === 'look'" class="settings-section">
          <SettingBlock :title="t('panel.title.fur')">
            <div class="color-control"><input type="color" :value="store.furColor" @input="store.setCustomFurColor($event.target.value)" /><span>{{ store.furStyle === 'Custom' ? store.furColor : (localizeOption(FUR_PRESETS.find(preset => preset.id === store.furStyle))?.label || store.furStyle) }}</span></div>
            <div class="swatches"><button v-for="preset in localizedFurPresets" :key="preset.id" class="swatch" :class="{ active: store.furStyle === preset.id }" :style="furDotStyle(preset)" :title="preset.label" @click="store.setFurStyle(preset.id)" /></div>
          </SettingBlock>
          <SettingBlock :title="t('panel.title.eyes')"><div class="choice-grid"><button v-for="item in localizedEyes" :key="item.id" class="choice" :class="{ active: store.eyeStyle === item.id }" @click="store.eyeStyle = item.id">{{ item.label }}</button></div></SettingBlock>
          <SettingBlock :title="t('panel.title.expression')"><div class="choice-grid"><button v-for="item in localizedFaces" :key="item.id" class="choice" :class="{ active: store.faceExpression === item.id }" @click="store.faceExpression = item.id">{{ item.label }}</button></div></SettingBlock>
        </section>

        <section v-else-if="activeTab === 'gear'" class="settings-section">
          <SettingBlock :title="t('panel.title.gear')">
            <div class="gear-grid">
              <button class="choice gear-choice gear-none" :class="{ active: store.gearType === null }" @click="store.gearType = null"><span aria-hidden="true">×</span><b>{{ t('panel.noneEquipment') }}</b></button>
              <button v-for="gear in localizedGearList" :key="gear.id" class="choice gear-choice" :class="{ active: store.gearType === gear.id }" @click="store.gearType = gear.id">
                <span class="gear-preview"><img :src="gear.preview" :alt="gear.label" /></span>
                <b>{{ gear.label }}</b>
              </button>
            </div>
          </SettingBlock>
          <div class="pose-authoring equipment-authoring">
            <header>
              <div><b>{{ t('panel.title.rigAnimation') }}</b><small>{{ store.selectedEquipmentId ? t('panel.selectedItemHint', { item: store.selectedEquipmentId }) : t('panel.equipmentNoSelectionHint') }}</small></div>
              <button class="btn" :disabled="!store.selectedEquipmentId" :class="{ active: store.equipmentAuthoringEnabled }" @click="store.equipmentAuthoringEnabled = !store.equipmentAuthoringEnabled">{{ store.equipmentAuthoringEnabled ? t('panel.poseAuthoring.toggleExit') : t('panel.poseAuthoring.toggle') }}</button>
            </header>
            <div class="choice-grid two"><button v-for="item in equipmentAnimations" :key="item.id" class="choice" :class="{ active: store.equipmentAnimation === item.id }" @click="store.equipmentAnimation = item.id">{{ item.label }}</button></div>
            <template v-if="store.equipmentAuthoringEnabled">
              <label v-for="(axis, index) in ['X', 'Y', 'Z']" :key="axis">{{ t('panel.poseEditor.rotation') }} {{ axis }}<input type="range" min="-180" max="180" step="1" :value="equipmentRotationDegrees(index)" @input="setEquipmentRotationDegrees(index, $event.target.value)" /><output>{{ equipmentRotationDegrees(index) }}°</output></label>
              <div class="timeline-row"><label>{{ t('panel.poseEditor.time') }}<input v-model.number="store.equipmentCursor" type="range" min="0" :max="store.equipmentPoseDocument.duration" step="0.05" /></label><output>{{ store.equipmentCursor.toFixed(2) }}{{ t('common.secondSuffix') }}</output><button class="btn" @click="store.addEquipmentKeyframe">{{ t('panel.poseEditor.addKeyframe') }}</button></div>
              <div class="keyframe-strip"><i v-for="frame in store.equipmentPoseDocument.keyframes" :key="frame.time" :style="{ left: `${frame.time / store.equipmentPoseDocument.duration * 100}%` }"></i></div>
              <div class="authoring-actions"><span>{{ store.equipmentPoseDocument.keyframes.length }} {{ t('common.keyframes') }}</span></div>
            </template>
          </div>
        </section>

        <section v-else-if="activeTab === 'scene'" class="settings-section">
          <SettingBlock :title="t('panel.title.quality')"><select v-model="store.qualityMode"><option v-for="item in qualityModes" :key="item.id" :value="item.id">{{ item.label }}</option></select></SettingBlock>
          <SettingBlock :title="t('panel.title.stage')">
            <select v-model="store.stageStyle">
              <option value="minimal">{{ t('settings.stageType.minimal') }}</option>
              <option value="wood">{{ t('settings.stageType.wood') }}</option>
              <option value="grid">{{ t('settings.stageType.grid') }}</option>
              <option value="hidden">{{ t('settings.stageType.hidden') }}</option>
            </select>
          </SettingBlock>
          <SettingBlock :title="t('panel.title.stageScale')"><div class="range-control"><input v-model.number="store.stageScale" type="range" min="0.75" max="1.6" step="0.05" /><output>{{ store.stageScale.toFixed(2) }}</output></div></SettingBlock>
          <SettingBlock :title="t('panel.title.stageHeight')"><div class="range-control"><input v-model.number="store.stageHeight" type="range" min="-0.04" max="0.12" step="0.01" /><output>{{ store.stageHeight.toFixed(2) }}</output></div></SettingBlock>
          <SettingBlock :title="t('panel.title.floorTexture')"><label class="texture-upload"><input type="file" accept="image/*" @change="onStageTexture"><span class="upload-icon">＋</span><span><b>{{ stageTextureName || t('panel.stageTexture.selectLocal') }}</b><small>{{ stageTextureName ? t('panel.stageTexture.tiled') : t('panel.stageTexture.uploadHint') }}</small></span></label></SettingBlock>
          <SettingBlock :title="t('panel.title.background')"><select :value="store.background || ''" :disabled="Boolean(store.special)" @change="store.setBackground($event.target.value)"><option value="" disabled>{{ store.special ? t('panel.specialEnabled') : t('panel.title.background') }}</option><option v-for="background in BACKGROUNDS" :key="background">{{ background }}</option></select><p v-if="store.special" class="override-note">{{ t('panel.title.special') }}「{{ store.special }}」{{ t('panel.specialOverrideHint') }}<button type="button" @click="store.setSpecial(null)">{{ t('panel.poseEditor.restore') }}</button></p></SettingBlock>
          <SettingBlock :title="t('panel.title.special')">
            <div class="choice-grid two"><button class="choice" :class="{ active: store.special === null }" @click="store.setSpecial(null)">{{ t('panel.specialDefault') }}</button><button v-for="item in localizedSpecials" :key="item.id" class="choice" :class="{ active: store.special === item.id }" @click="store.setSpecial(item.id)">{{ item.label }}</button></div>
          </SettingBlock>
        </section>

        <section v-else-if="activeTab === 'ip'" class="settings-section identity-editor">
          <p v-if="store.isSpecialFullScene" class="conflict-note">{{ t('panel.conflictSpecial') }}</p>
          <button class="btn" @click="store.generateIdentity">{{ t('panel.randomFromSeed') }}</button>
          <label>{{ t('panel.identity.name') }}<input :value="store.identity.name" @change="store.setIdentity('name', $event.target.value)" /></label>
          <label>{{ t('panel.identity.personality') }}<input :value="store.identity.personality.join('，')" @change="store.setIdentity('personality', $event.target.value)" /></label>
          <label>{{ t('panel.identity.occupation') }}<input :value="store.identity.occupation" @change="store.setIdentity('occupation', $event.target.value)" /></label>
          <label>{{ t('panel.identity.theme') }}<input :value="store.identity.theme" @change="store.setIdentity('theme', $event.target.value)" /></label>
          <label>{{ t('panel.identity.catchphrase') }}<input :value="store.identity.catchphrase" @change="store.setIdentity('catchphrase', $event.target.value)" /></label>
          <label>{{ t('panel.identity.story') }}<textarea :value="store.identity.story" rows="5" @change="store.setIdentity('story', $event.target.value)" /></label>
        </section>

        <section v-else class="settings-section">
          <SettingBlock :title="t('panel.title.pose')">
            <div class="choice-grid two"><button v-for="item in localizedActions" :key="item.id" class="choice pose-choice" :class="{ active: store.actionMode === item.id }" :title="item.description" @click="store.actionMode = item.id"><b>{{ item.label }}</b><small>{{ item.description }}</small></button></div>
          </SettingBlock>
          <SettingBlock :title="t('panel.title.actions')">
            <div class="emoji-pack">
              <figure v-if="selectedEmojiAction" class="emoji-preview"><img :src="selectedEmojiAction.preview" :alt="`${selectedEmojiAction.label} ${t('panel.title.actions')}`"><figcaption><b>{{ selectedEmojiAction.label }}</b><small>{{ selectedEmojiAction.description }}</small></figcaption></figure>
              <div class="emoji-action-grid"><button v-for="item in localizedEmojiActions" :key="item.id" class="choice" :class="{ active: store.actionMode === item.id }" :title="item.description" @click="store.actionMode = item.id">{{ item.label }}</button></div>
            </div>
          </SettingBlock>
          <SettingBlock v-if="activeEmojiAction" :title="t('panel.title.actions')">
            <div class="action-parameter-list">
              <label v-for="(definition, key) in localizedActionParameters" :key="key" class="range-control">
                <span>{{ definition.label }}</span>
                <input type="range" :min="definition.min" :max="definition.max" :step="definition.step" :value="store.actionParameters[activeEmojiAction.id][key]" @input="store.setActionParameter(activeEmojiAction.id, key, $event.target.value)" />
                <output>{{ store.actionParameters[activeEmojiAction.id][key].toFixed(2) }}</output>
              </label>
              <button class="btn" @click="store.resetActionParameters(activeEmojiAction.id)">{{ t('panel.poseEditor.rotationReset') }}</button>
            </div>
          </SettingBlock>
          <div class="pose-authoring">
            <header><div><b>{{ t('panel.title.poseApi') }}</b><small>{{ t('panel.poseEditor.time') }} / {{ t('panel.poseEditor.rotation') }}</small></div><button class="btn" :class="{ active: store.poseAuthoringEnabled }" @click="store.poseAuthoringEnabled = !store.poseAuthoringEnabled">{{ store.poseAuthoringEnabled ? t('panel.poseEditor.toggleExit') : t('panel.poseAuthoring.toggle') }}</button></header>
            <template v-if="store.poseAuthoringEnabled">
              <label>{{ t('panel.poseEditor.title') }}<select v-model="store.selectedPoseChannel"><option v-for="channel in localizedPoseChannels" :key="channel.id" :value="channel.id">{{ channel.label }}</option></select></label>
              <label v-for="(axis, index) in ['X', 'Y', 'Z']" :key="axis">{{ t('panel.poseEditor.rotation') }} {{ axis }}<input type="range" min="-180" max="180" step="1" :value="rotationDegrees(index)" @input="setRotationDegrees(index, $event.target.value)" /><output>{{ rotationDegrees(index) }}°</output></label>
              <div class="timeline-row"><label>{{ t('panel.poseEditor.time') }}<input v-model.number="store.poseCursor" type="range" min="0" :max="store.poseDocument.duration" step="0.05" /></label><output>{{ store.poseCursor.toFixed(2) }}{{ t('common.secondSuffix') }}</output><button class="btn" @click="store.addPoseKeyframe">{{ t('panel.poseEditor.addKeyframe') }}</button></div>
              <div class="keyframe-strip"><i v-for="frame in store.poseDocument.keyframes" :key="frame.time" :style="{ left: `${frame.time / store.poseDocument.duration * 100}%` }" :title="`${frame.time.toFixed(2)}s`"></i></div>
              <div class="authoring-actions"><button class="btn" @click="store.resetCustomPose">{{ t('panel.poseEditor.rotationReset') }}</button><span>{{ store.poseDocument.keyframes.length }} {{ t('common.keyframes') }}</span></div>
            </template>
          </div>
          <p class="pose-hint">{{ t('panel.poseHint') }}</p>
          <div class="keyboard-help"><span><kbd>WASD</kbd> {{ t('controls.crossyHud.mobileMoveHint') }}</span><span><kbd>Shift</kbd>{{ t('controls.crossyHud.run') }}</span><span><kbd>Space</kbd> {{ t('controls.crossyHud.jump') }}</span><span><kbd>Ctrl</kbd> {{ t('controls.crossyHud.crouch') }}</span></div>
        </section>
      </div>
    </Transition>
  </aside>
</template>

<script setup>
import { computed, defineComponent, h, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  useCatStore,
  FUR_PRESETS,
  EYE_STYLES,
  EYE_STYLE_OPTIONS,
  FACE_EXPRESSIONS,
  FACE_EXPRESSION_OPTIONS,
  GEAR_LIST,
  BACKGROUNDS,
  SPECIALS,
  ACTIONS,
  MORPHOLOGY_CONTROLS,
  MORPHOLOGY_PRESETS,
} from '../stores/cat.js'
import ComparisonPanel from './ComparisonPanel.vue'
import { QUALITY_MODES } from '../three/RenderQualityController.js'
import { POSE_CHANNELS } from '../character/animation/poseAuthoring.js'
import { EMOJI_ACTIONS, getEmojiAction } from '../config/emojiActions.js'
import { ACTION_PARAMETER_DEFINITIONS } from '../character/animation/actionParameters.js'

const store = useCatStore()
const { t, te } = useI18n()
const tokenQuery = ref(String(store.tokenId))
const activeTab = ref('look')
const traitQuery = ref('')
const stageTextureName = ref('')
const localize = (key, fallback) => (key && te(key) ? t(key) : fallback)
const localizeOption = option => {
  if (!option || typeof option !== 'object') return option
  return {
    ...option,
    label: localize(option.labelKey, option.label),
  }
}

const tokenErrorText = computed(() => {
  const tokenError = store.tokenError
  if (!tokenError) return ''
  if (typeof tokenError === 'string') return tokenError
  if (!tokenError.key) return ''
  return t(tokenError.key, tokenError.values || {})
})

const tabs = computed(() => [
  { id: 'body', label: t('tabs.body') },
  { id: 'look', label: t('tabs.look') },
  { id: 'gear', label: t('tabs.gear') },
  { id: 'scene', label: t('tabs.scene') },
  { id: 'ip', label: t('tabs.identity') },
  { id: 'motion', label: t('tabs.motion') },
])

const searchIndex = computed(() => [
  { id: 'body', tab: 'body', label: t('panel.title.morph') },
  { id: 'fur', tab: 'look', label: t('panel.title.fur') },
  { id: 'eyes', tab: 'look', label: t('panel.title.eyes') },
  { id: 'gear', tab: 'gear', label: t('panel.title.gear') },
  { id: 'scene', tab: 'scene', label: t('tabs.scene') },
  { id: 'identity', tab: 'ip', label: t('tabs.identity') },
  { id: 'motion', tab: 'motion', label: t('tabs.motion') },
])

const searchResults = computed(() => searchIndex.value.filter(item => item.label.toLowerCase().includes(traitQuery.value.toLowerCase())))
const weathers = computed(() => [
  { id: 'sunny', icon: '☀', label: t('controls.weather.sunny') },
  { id: 'cloudy', icon: '☁', label: t('controls.weather.cloudy') },
  { id: 'rain', icon: '☂', label: t('controls.weather.rain') },
  { id: 'thunder', icon: 'ϟ', label: t('controls.weather.thunder') },
])
const equipmentAnimations = computed(() => [
  { id: 'Semantic', label: t('panel.equipmentAnimations.semantic') },
  { id: 'Hover', label: t('panel.equipmentAnimations.hover') },
  { id: 'Spin', label: t('panel.equipmentAnimations.spin') },
  { id: 'Pulse', label: t('panel.equipmentAnimations.pulse') },
])

const qualityModes = computed(() => QUALITY_MODES.map(item => ({
  ...item,
  label: t(`settings.quality.${item.id}`, item.label),
})))

const morphologyPresets = computed(() => MORPHOLOGY_PRESETS.map(preset => ({
  ...preset,
  label: localize(preset.labelKey, preset.label),
})))

const localizedFurPresets = computed(() => FUR_PRESETS.map(localizeOption))
const localizedEyes = computed(() => EYE_STYLES.map((id, index) => {
  const option = EYE_STYLE_OPTIONS[index] ?? EYE_STYLE_OPTIONS.find(item => item.id === id)
  return { id, ...(option ?? {}), label: localize(option?.labelKey, id) }
}))
const localizedFaces = computed(() => FACE_EXPRESSIONS.map((id, index) => {
  const option = FACE_EXPRESSION_OPTIONS[index] ?? FACE_EXPRESSION_OPTIONS.find(item => item.id === id)
  return { id, ...(option ?? {}), label: localize(option?.labelKey, id) }
}))
const localizedGearList = computed(() => GEAR_LIST.map(localizeOption))
const localizedSpecials = computed(() => SPECIALS.map(localizeOption))
const localizedPoseChannels = computed(() => POSE_CHANNELS.map(channel => ({
  ...channel,
  label: localize(channel.labelKey, channel.label),
})))

const localizedMorphologyControls = computed(() => MORPHOLOGY_CONTROLS.map(control => ({
  ...control,
  label: localize(control.labelKey, control.label),
})))

const localizedActions = computed(() => ACTIONS.map(action => ({
  ...action,
  label: localize(action.labelKey, action.label),
  description: localize(action.descriptionKey, action.description),
})))

const localizedEmojiActions = computed(() => EMOJI_ACTIONS.map(action => ({
  ...action,
  label: localize(action.labelKey, action.label),
  description: localize(action.descriptionKey, action.description),
})))

const localizedActionParameters = computed(() => Object.fromEntries(Object.entries(ACTION_PARAMETER_DEFINITIONS).map(([key, definition]) => [
  key,
  {
    ...definition,
    label: localize(definition.labelKey, definition.label),
  },
])))

const getLocalizedAction = action => action ? ({
  ...action,
  label: localize(action.labelKey, action.label),
  description: localize(action.descriptionKey, action.description),
}) : null

const searchToken = async () => {
  if (await store.loadToken(tokenQuery.value)) tokenQuery.value = String(store.tokenId)
}

const navigateToken = async direction => {
  if (await store.loadAdjacent(direction)) tokenQuery.value = String(store.tokenId)
}
const onStageTexture = event => {
  const file = event.target.files?.[0]
  if (!file) return
  stageTextureName.value = file.name
  store.setStageTexture(file)
}
const rotationDegrees = index => Math.round((store.customPose[store.selectedPoseChannel]?.[index] ?? 0) * 180 / Math.PI)
const setRotationDegrees = (index, degrees) => store.setPoseRotation(store.selectedPoseChannel, ['x', 'y', 'z'][index], Number(degrees) * Math.PI / 180)
const equipmentRotationDegrees = index => Math.round((store.equipmentTransform.rotation[index] ?? 0) * 180 / Math.PI)
const setEquipmentRotationDegrees = (index, degrees) => store.setEquipmentRotation(['x', 'y', 'z'][index], Number(degrees) * Math.PI / 180)
const furDotStyle = preset => ({ background: preset.pattern === 'solid' ? preset.color : `linear-gradient(135deg,${preset.color} 0 46%,${preset.accent} 47% 65%,#f4f0e4 66%)` })
const matchesMorphologyPreset = preset => Object.entries(preset.values).every(([key, value]) => Math.abs(store.morphology[key] - value) < 0.001)
const SettingBlock = defineComponent({
  props: { title: String },
  setup(props, { slots }) {
    return () => h('div', { class: 'setting-block' }, [h('h2', props.title), h('div', { class: 'setting-content' }, slots.default?.())])
  },
})

const activeEmojiAction = computed(() => getLocalizedAction(getEmojiAction(store.actionMode)))
const selectedEmojiAction = activeEmojiAction
</script>

<style scoped>
.right-panel{position:fixed;top:14px;right:14px;bottom:14px;z-index:110;display:flex;flex-direction:column;align-items:flex-end;gap:9px;pointer-events:none}.right-panel>*{pointer-events:auto}.quick-tools{display:flex;gap:5px;padding:5px;border-radius:12px}.icon-btn{display:grid;place-items:center;width:34px;height:34px;border:1px solid transparent;border-radius:9px;background:transparent;color:#afb6ca;font-size:1rem;cursor:pointer}.icon-btn:hover{background:rgba(255,255,255,.07)}.icon-btn.active{border-color:rgba(245,211,61,.35);background:rgba(245,211,61,.15);color:var(--accent)}
.panel-toggle{display:flex;align-items:center;justify-content:space-between;width:168px;padding:9px 11px;color:var(--text);cursor:pointer}.panel-toggle span{display:grid;text-align:left}.panel-toggle small{color:var(--accent);font-size:.5rem;letter-spacing:.12em}.panel-toggle b{margin-top:2px;font-size:.72rem}.panel-toggle i{font-style:normal;font-size:1.4rem;color:var(--text-dim)}
.panel-body{width:min(390px,calc(100vw - 28px));max-height:calc(100vh - 104px);overflow:auto;padding:18px;border-radius:16px;box-shadow:0 18px 55px rgba(0,0,0,.28)}.panel-body::-webkit-scrollbar{width:4px}.panel-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.14);border-radius:5px}.panel-title{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:1px solid var(--border)}.panel-title span{color:var(--accent);font-size:.55rem;letter-spacing:.16em}.panel-title h1{margin-top:4px;font-size:1rem}.panel-title>b{padding:6px 8px;border-radius:8px;background:rgba(245,211,61,.12);color:var(--accent);font:700 .7rem monospace}
.token-search{display:grid;gap:7px;margin-top:15px}.token-search label{color:#aeb5c8;font-size:.67rem}.token-search>div{display:flex;gap:7px}.token-search input{min-width:0;flex:1;padding:9px 10px;border:1px solid var(--border);border-radius:8px;outline:none;background:rgba(255,255,255,.055);color:var(--text)}.token-search input:focus{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-glow)}.token-search small{color:#ff9b9b;font-size:.67rem}
.reference-card{position:relative;overflow:hidden;margin-top:12px;border:1px solid var(--border);border-radius:11px;background:#171725}.reference-card img{display:block;width:100%;max-height:188px;object-fit:contain;image-rendering:pixelated}.reference-card figcaption{position:absolute;right:7px;bottom:7px;display:flex;gap:8px;padding:5px 7px;border-radius:6px;background:rgba(12,12,20,.8);font-size:.62rem}.reference-card figcaption span{color:#aeb5c8}.reference-card figcaption b{color:var(--accent)}
.section-tabs{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin:15px 0;padding:4px;border-radius:10px;background:rgba(255,255,255,.04)}.section-tabs button{padding:7px 3px;border:0;border-radius:7px;background:transparent;color:#8e97ad;font-size:.69rem;cursor:pointer}.section-tabs button.active{background:rgba(255,255,255,.09);color:#fff;box-shadow:0 3px 10px rgba(0,0,0,.12)}.settings-section{display:grid;gap:15px}.setting-block{display:grid;grid-template-columns:48px minmax(0,1fr);gap:10px}.setting-block h2{padding-top:7px;color:#7f899f;font-size:.7rem;font-weight:500}.setting-content{min-width:0}.color-control{display:flex;align-items:center;gap:9px;margin-bottom:8px}.color-control span{overflow:hidden;color:#aeb5c8;font:600 .69rem monospace;text-overflow:ellipsis;white-space:nowrap}.swatches{display:flex;flex-wrap:wrap;gap:7px}.swatch{width:25px;height:25px;border:2px solid transparent;border-radius:50%;cursor:pointer}.swatch.active{border-color:#fff;box-shadow:0 0 0 2px var(--accent),0 0 12px var(--accent-glow)}.choice-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.choice-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}.choice{min-height:34px;padding:6px;border:1px solid var(--border);border-radius:7px;background:rgba(255,255,255,.045);color:#c9ccda;font-size:.68rem;cursor:pointer}.choice:hover{background:rgba(255,255,255,.09)}.choice.active{border-color:var(--accent);background:var(--accent);color:#1a1a2e;font-weight:700}.setting-content select{width:100%;padding:9px;border:1px solid var(--border);border-radius:8px;background:#242438;color:var(--text)}.keyboard-help{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin-left:58px;color:#929bb0;font-size:.66rem}.keyboard-help span{display:flex;align-items:center;gap:6px}.keyboard-help kbd{min-width:42px;padding:4px;border:1px solid var(--border);border-radius:5px;background:rgba(255,255,255,.055);color:var(--accent);text-align:center;font:600 .62rem monospace}
.gear-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.gear-choice{display:grid;grid-template-rows:74px auto;gap:5px;overflow:hidden;min-height:104px;padding:6px}.gear-choice b{overflow:hidden;font-size:.62rem;font-weight:650;text-overflow:ellipsis;white-space:nowrap}.gear-preview{display:grid;place-items:center;overflow:hidden;border-radius:6px;background:radial-gradient(circle at 50% 42%,rgba(255,255,255,.13),rgba(255,255,255,.025) 72%)}.gear-preview img{display:block;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 5px 7px rgba(0,0,0,.35))}.gear-choice.active .gear-preview{background:rgba(24,25,40,.16)}.gear-none{grid-template-rows:52px auto;min-height:104px}.gear-none>span{display:grid;place-items:center;color:#727b90;font-size:2rem}.gear-none.active>span{color:#3d3a2b}
.panel-enter-active,.panel-leave-active{transition:opacity .22s,transform .28s}.panel-enter-from,.panel-leave-to{opacity:0;transform:translateX(28px)}@media(max-width:700px){.right-panel{top:auto;right:8px;bottom:68px;left:8px;align-items:stretch}.quick-tools{display:none}.panel-body{width:100%;max-height:min(68vh,620px);padding:14px;border-radius:18px 18px 12px 12px}.panel-toggle{align-self:flex-end;width:154px}.setting-block{grid-template-columns:42px 1fr}.choice-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.keyboard-help{margin-left:52px}.reference-card img{max-height:145px}.panel-enter-from,.panel-leave-to{transform:translateY(28px)}}
.token-nav{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}.token-nav .btn{min-height:32px;color:#b6bed0;font-size:.68rem}
.pose-choice{display:grid;gap:3px;text-align:left}.pose-choice b{font-size:.68rem}.pose-choice small{color:#7f899f;font-size:.56rem;line-height:1.3}.pose-choice.active small{color:rgba(26,26,46,.72)}.pose-hint{margin-left:58px;color:#7f899f;font-size:.62rem}
.emoji-pack{display:grid;gap:8px}.emoji-preview{display:grid;grid-template-columns:72px 1fr;align-items:center;gap:10px;overflow:hidden;margin:0;padding:7px;border:1px solid rgba(245,211,61,.22);border-radius:10px;background:rgba(245,211,61,.055)}.emoji-preview img{width:72px;height:72px;border-radius:7px;object-fit:cover;image-rendering:pixelated}.emoji-preview figcaption{display:grid;gap:4px}.emoji-preview b{color:#f4f5f8;font-size:.72rem}.emoji-preview small{color:#8f98ac;font-size:.6rem;line-height:1.45}.emoji-action-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}.emoji-action-grid .choice{min-height:30px;padding:4px;font-size:.61rem}
.trait-audit{margin-top:11px;border:1px solid var(--border);border-radius:9px;background:rgba(255,255,255,.025)}.trait-audit summary{display:flex;justify-content:space-between;padding:9px 10px;cursor:pointer;color:#aeb5c8;font-size:.65rem}.trait-audit summary b{color:#8590a6;font-weight:500}.trait-audit ul{display:grid;gap:7px;padding:2px 10px 10px;list-style:none}.trait-audit li{display:grid;grid-template-columns:8px 1fr auto;align-items:center;gap:7px;color:#c8ccda;font-size:.62rem}.trait-audit li i{width:7px;height:7px;border-radius:50%}.trait-audit li i.implemented{background:#68d391}.trait-audit li i.partial{background:#f5d33d}.trait-audit li span b{margin-right:6px;color:#7f899f;font-weight:500}.trait-audit li em{color:#8c96aa;font-style:normal}.trait-audit li small{grid-column:2/4;color:#687288;line-height:1.35}
.section-tabs{grid-template-columns:repeat(5,1fr)}
.editor-tools{display:flex;gap:6px;margin-top:10px}.identity-editor input,.identity-editor textarea{width:100%;padding:8px;border:1px solid var(--border);border-radius:7px;background:rgba(255,255,255,.055);color:var(--text)}.identity-editor label{display:grid;gap:5px;color:#9ba4b8;font-size:.68rem}.conflict-note{padding:8px;border:1px solid rgba(245,211,61,.3);border-radius:7px;color:#e7d878;font-size:.65rem}
.range-control{display:grid;grid-template-columns:1fr 42px 38px;align-items:center;gap:7px}.range-control input{width:100%;accent-color:var(--accent)}.range-control output{color:var(--accent);font:700 .68rem monospace;}.lock-control{padding:4px 2px;border:1px solid var(--border);border-radius:5px;background:transparent;color:#7f899f;font-size:.58rem;cursor:pointer}.lock-control.active{border-color:var(--accent);color:var(--accent)}.reset-morphology{margin-left:58px}
.workspace-modes{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:12px;padding:4px;border-radius:10px;background:rgba(255,255,255,.04)}.workspace-modes button{min-height:34px;border:0;border-radius:7px;background:transparent;color:#201d14;cursor:pointer}.workspace-modes button.active{background:var(--accent);color:#201d14;font-weight:800}.mode-description{margin-top:7px;color:var(--text-dim);font-size:.68rem;line-height:1.5}
.override-note{margin-top:7px;color:var(--text-dim);font-size:.62rem;line-height:1.45}.override-note button{margin-left:3px;border:0;background:transparent;color:var(--accent);font-size:inherit;cursor:pointer;text-decoration:underline;text-underline-offset:2px}
.setting-block h2{font-size:.59rem;line-height:1.35}.editor-tools input::placeholder,.token-search input::placeholder{font-size:.58rem}.texture-upload{display:flex;align-items:center;gap:10px;padding:9px;border:1px dashed rgba(245,211,61,.45);border-radius:9px;background:rgba(245,211,61,.055);color:#aeb5c8;cursor:pointer;transition:.18s}.texture-upload:hover{border-color:var(--accent);background:rgba(245,211,61,.1)}.texture-upload input{position:absolute;width:1px;height:1px;overflow:hidden;opacity:0}.texture-upload>span:last-child{display:grid;gap:2px;min-width:0}.texture-upload b{overflow:hidden;color:#f4f5f8;font-size:.62rem;text-overflow:ellipsis;white-space:nowrap}.texture-upload small{color:#7f899f;font-size:.54rem}.upload-icon{display:grid;place-items:center;flex:0 0 28px;height:28px;border-radius:8px;background:var(--accent);color:#211d13;font-size:1rem;font-weight:800}
.token-nav{grid-template-columns:1fr 1fr 1fr}.compare-inline.active{border-color:var(--accent);color:var(--accent)}
.pose-authoring{display:grid;gap:10px;margin-left:58px;padding:10px;border:1px solid var(--border);border-radius:10px;background:rgba(255,255,255,.025)}.pose-authoring header,.authoring-actions{display:flex;align-items:center;justify-content:space-between;gap:8px}.pose-authoring header div{display:grid;gap:2px}.pose-authoring header b{font-size:.68rem}.pose-authoring header small,.authoring-actions span{color:var(--text-dim);font-size:.56rem}.pose-authoring label{display:grid;grid-template-columns:54px 1fr 38px;align-items:center;gap:6px;color:#8f98ad;font-size:.58rem}.pose-authoring select{grid-column:2/4;padding:6px;border:1px solid var(--border);border-radius:6px;background:#242438;color:var(--text);font-size:.62rem}.pose-authoring input{width:100%;accent-color:var(--accent)}.pose-authoring output{color:var(--accent);font:600 .58rem monospace;text-align:right}.timeline-row{display:grid;grid-template-columns:1fr 40px auto;align-items:end;gap:6px}.timeline-row label{display:grid;grid-template-columns:1fr;gap:4px}.keyframe-strip{position:relative;height:6px;border-radius:4px;background:rgba(255,255,255,.08)}.keyframe-strip i{position:absolute;top:-3px;width:4px;height:12px;border-radius:2px;background:var(--accent);transform:translateX(-2px)}
.panel-body{width:min(430px,calc(100vw - 28px));padding:16px}.token-nav{grid-template-columns:1fr 1fr}.section-tabs{position:sticky;z-index:3;top:-16px;background:#242438;box-shadow:0 7px 14px rgba(20,20,32,.5)}.settings-section{padding:2px 1px 8px}.setting-block{padding:9px;border:1px solid rgba(255,255,255,.045);border-radius:9px;background:rgba(255,255,255,.018)}
@media(max-width:900px){.right-panel{top:auto;right:10px;bottom:70px;left:10px;align-items:stretch}.quick-tools{display:none}.panel-toggle{align-self:flex-end;width:158px;min-height:40px}.panel-body{width:100%;max-height:calc(100dvh - 174px);padding:14px;border-radius:16px}.panel-title{padding-bottom:10px}.section-tabs{top:-14px;margin:12px 0;overflow-x:auto;grid-template-columns:repeat(6,minmax(72px,1fr));scrollbar-width:none}.section-tabs::-webkit-scrollbar{display:none}.setting-block{grid-template-columns:52px minmax(0,1fr)}.choice-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.keyboard-help,.pose-hint,.reset-morphology,.pose-authoring{margin-left:0}.panel-enter-from,.panel-leave-to{transform:translateY(24px)}}
@media(max-width:600px){.right-panel{right:8px;bottom:66px;left:8px}.panel-body{max-height:calc(100dvh - 156px);padding:12px}.panel-title h1{font-size:.9rem}.editor-tools{display:grid;grid-template-columns:auto auto 1fr}.token-search{margin-top:10px}.setting-block{grid-template-columns:1fr;gap:6px;padding:8px}.setting-block h2{padding-top:0}.gear-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.gear-choice{grid-template-rows:62px auto;min-height:90px}.range-control{grid-template-columns:minmax(0,1fr) 42px 42px}.emoji-action-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.pose-authoring label{grid-template-columns:48px 1fr 34px}.workspace-modes{margin-top:8px}}
@media(max-width:600px){.panel-body{max-height:calc(100dvh - 174px)}}
@media(max-width:900px){.right-panel.expanded{bottom:224px}.right-panel.expanded .panel-body{max-height:calc(100dvh - 304px)}}
</style>
