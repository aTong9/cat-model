/**
 * 像素猫 3D 属性配置
 *
 * 每个 trait 不仅定义元数据，还定义其 3D 渲染参数。
 * 这些参数会直接传入 Three.js 猫模型构建器。
 */

export const CANVAS_SIZE = 1024;

// ============================================================
// 毛色 → 3D 颜色映射
// ============================================================
export const FUR_COLORS = {
  'Black':                  { base: '#2d2d2d', accent: '#1a1a1a', pattern: 'solid' },
  'Blue Lightning Tabby':   { base: '#5b7cb5', accent: '#ffd700', pattern: 'striped', stripeColor: '#ffe44d' },
  'Calico':                 { base: '#ffffff', accent: '#f4a460', pattern: 'patches', patchColors: ['#f4a460', '#2d2d2d'] },
  'Golden':                 { base: '#daa520', accent: '#ffd700', pattern: 'solid' },
  'Gray':                   { base: '#808080', accent: '#696969', pattern: 'solid' },
  'Leopard Patterned':      { base: '#d2a679', accent: '#8b6914', pattern: 'spots', spotColor: '#5c3d1a' },
  'Orange':                 { base: '#f4a460', accent: '#ff8c00', pattern: 'solid' },
  'Tuxedo':                 { base: '#2d2d2d', accent: '#ffffff', pattern: 'tuxedo', chestColor: '#ffffff' },
};

// ============================================================
// 眼睛样式 → 3D 参数
// ============================================================
export const EYE_STYLES = {
  'Alert':      { size: 1.2, pupilSize: 0.25, openRatio: 1.0, ringColor: null },
  'Blue Ring':  { size: 1.0, pupilSize: 0.3,  openRatio: 1.0, ringColor: '#4488ff' },
  'Original':   { size: 1.0, pupilSize: 0.35, openRatio: 0.85, ringColor: null },
  'Relaxed':    { size: 0.9, pupilSize: 0.35, openRatio: 0.55, ringColor: null },
  'Sunglasses': { size: 1.0, isAccessory: 'sunglasses', lensColor: '#1a1a2e' },
  'VR':         { size: 1.0, isAccessory: 'vr_headset', headsetColor: '#444466' },
};

// ============================================================
// 表情 → 3D 参数
// ============================================================
export const FACE_EXPRESSIONS = {
  'Excited':    { mouthType: 'open', mouthScale: 1.3, eyeBrowAngle: -0.25, blushIntensity: 0.6 },
  'Smile':      { mouthType: 'smile', mouthScale: 1.0, eyeBrowAngle: 0, blushIntensity: 0.3 },
  'Whistling':  { mouthType: 'whistle', mouthScale: 0.6, eyeBrowAngle: 0.1, blushIntensity: 0 },
  'Wow':        { mouthType: 'open', mouthScale: 1.8, eyeBrowAngle: 0.3, blushIntensity: 0 },
  'Yum':        { mouthType: 'tongue', mouthScale: 1.1, eyeBrowAngle: -0.1, blushIntensity: 0.4 },
};

// ============================================================
// 装备 → 3D 几何参数
// ============================================================
export const GEAR_MODELS = {
  'Baseball Cap':       { type: 'cap', color: '#e74c3c', position: [0, 0.9, 0.15], scale: 0.7 },
  'Camera':             { type: 'camera', color: '#2c3e50', position: [0, -0.3, 0.7], scale: 0.35 },
  'Gold Round Glasses': { type: 'glasses', color: '#ffd700', position: [0, 0, 0.3], scale: 1 },
  'Good Luck Gold Bar': { type: 'goldBar', color: '#ffd700', position: [0.5, -0.2, 0.5], scale: 0.4 },
  'Hiking Backpack':    { type: 'backpack', color: '#27ae60', position: [0, 0.3, -0.7], scale: 0.6 },
  'Hot Coffee':         { type: 'coffee', color: '#8b4513', position: [0.5, -0.6, 0.5], scale: 0.35 },
  'Investment Book':    { type: 'book', color: '#c0392b', position: [0.45, -0.5, 0.45], scale: 0.35 },
  'Ramen':              { type: 'bowl', color: '#e67e22', position: [0.45, -0.7, 0.4], scale: 0.4 },
  'Sake':               { type: 'bottle', color: '#ecf0f1', position: [0.5, -0.5, 0.4], scale: 0.25 },
  'Wealth Gold Bar':    { type: 'goldBar', color: '#ffd700', position: [-0.5, -0.2, 0.5], scale: 0.5 },
};

// ============================================================
// 背景渐变
// ============================================================
export const BACKGROUNDS = {
  'Blue Gradient':               { top: '#1a1a4e', bottom: '#4a90d9' },
  'Green Gradient':              { top: '#0d3b0d', bottom: '#4caf50' },
  'Green To Blue Gradient':      { top: '#0d3b0d', bottom: '#4a90d9' },
  'Orange Gradient':             { top: '#5c2a0a', bottom: '#ff8c00' },
  'Pink To Orange Gradient':     { top: '#ff69b4', bottom: '#ff8c00' },
  'Purple Gradient':             { top: '#2d0a3d', bottom: '#9b59b6' },
  'Red To Pink Gradient':        { top: '#8b0000', bottom: '#ff69b4' },
  'Yellow To Green Gradient':    { top: '#ffd700', bottom: '#4caf50' },
};

// ============================================================
// Special 场景
// ============================================================
export const SPECIALS = {
  'Fitness Guru':       { fullScene: false, skyColor: '#87ceeb', groundColor: '#90ee90', extraObjects: ['dumbbell'] },
  'Galactic Voyage':    { fullScene: true,  skyColor: '#0a0a2e', groundColor: null, extraObjects: ['stars', 'planet'] },
  'Golden General':     { fullScene: true,  skyColor: '#ffd700', groundColor: '#000000', extraObjects: ['armor', 'banner'] },
  'Onsen journey':      { fullScene: false, skyColor: '#ffe4b5', groundColor: '#87ceeb', extraObjects: ['towel', 'steam'] },
  'Realm of Mt.Fuji':   { fullScene: false, skyColor: '#ffe4e1', groundColor: '#8fbc8f', extraObjects: ['mountain'] },
  'Thunderous Might':   { fullScene: false, skyColor: '#2c3e50', groundColor: '#34495e', extraObjects: ['lightning'] },
  'Time Traveler':      { fullScene: false, skyColor: '#4a0080', groundColor: '#1a0030', extraObjects: ['clock', 'portal'] },
};

// ============================================================
// 完整 trait 定义
// ============================================================
export const TRAITS = {
  background: {
    displayName: 'Background',
    values: Object.keys(BACKGROUNDS),
  },
  fur_color: {
    displayName: 'Fur Color',
    values: Object.keys(FUR_COLORS),
  },
  face: {
    displayName: 'Face',
    values: Object.keys(FACE_EXPRESSIONS),
  },
  eyes: {
    displayName: 'Eyes',
    values: Object.keys(EYE_STYLES),
  },
  gear: {
    displayName: 'Gear',
    optional: true,
    noneChance: 0.15,
    values: Object.keys(GEAR_MODELS),
  },
  special: {
    displayName: 'Special',
    optional: true,
    chance: 0.08,
    values: Object.keys(SPECIALS),
  },
};

export const SPECIAL_FULLSCENES = ['Galactic Voyage', 'Golden General'];

// 输出目录
export const OUTPUT_DIR = 'output';
export const IMAGES_DIR = `${OUTPUT_DIR}/images`;
export const METADATA_DIR = `${OUTPUT_DIR}/metadata`;
