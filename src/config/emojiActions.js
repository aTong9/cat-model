const asset = file => new URL(`../../liberty_cats_download/emoji/pack5/${file}`, import.meta.url).href

export const EMOJI_ACTIONS = Object.freeze([
  ['emoji-abs', '练腹肌', '01_Abs.gif', 'fitness', 1.6, '收紧核心并交替卷腹'],
  ['emoji-jump-rope', '跳绳', '02_Jump-Rope.gif', 'fitness', 1.2, '连续轻跳并转动双腕'],
  ['emoji-dumbbells', '哑铃弯举', '03_Dumbbells.gif', 'fitness', 1.6, '双臂同步弯举'],
  ['emoji-pull-up', '引体向上', '04_Pull-Up.gif', 'fitness', 1.8, '双臂上举并屈膝发力'],
  ['emoji-bench-press', '卧推', '05_Bench-Press.gif', 'fitness', 1.8, '双臂反复推举'],
  ['emoji-hula-hoop', '呼啦圈', '06_Hula-Hoop.gif', 'fitness', 1.6, '腰胯环绕并保持平衡'],
  ['emoji-boxing', '拳击', '07_Boxing.gif', 'fitness', 1.2, '左右交替出拳'],
  ['emoji-so-cute', '超可爱', '08_So-Cute.gif', 'mood', 1.8, '歪头并把双爪举到脸侧'],
  ['emoji-yoga', '瑜伽', '09_Yoga.gif', 'fitness', 2.4, '单脚平衡与舒展'],
  ['emoji-foodie', '吃货模式', '10_Foodie-Mode.gif', 'mood', 1.8, '抬爪送到嘴边并满足点头'],
  ['emoji-backflip', '后空翻', '11_Backflip.gif', 'sport', 1.4, '腾空、团身与展开的循环'],
  ['emoji-snowboarding', '滑雪板', '12_Snowboarding.gif', 'snow', 1.6, '低重心左右压板'],
  ['emoji-snow-fight', '打雪仗', '13_Snow-Fight.gif', 'snow', 1.4, '蓄力并挥臂投掷'],
  ['emoji-snowball', '搓雪球', '14_Snowball.gif', 'snow', 1.5, '双爪合拢滚动雪球'],
  ['emoji-so-cold', '好冷', '15_So-Cold.gif', 'snow', 1.0, '抱臂快速发抖'],
  ['emoji-so-comfy', '好舒服', '16_So-Comfy.gif', 'mood', 2.4, '放松坐姿与缓慢呼吸'],
].map(([id, label, file, category, duration, description]) => Object.freeze({
  id, label, file, category, duration, description, preview: asset(file), loop: true,
})))

export const EMOJI_ACTION_IDS = Object.freeze(EMOJI_ACTIONS.map(action => action.id))

export function getEmojiAction(id) {
  return EMOJI_ACTIONS.find(action => action.id === id) ?? null
}
