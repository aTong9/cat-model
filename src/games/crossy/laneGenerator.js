export const LANE_TYPES = Object.freeze(['safe', 'road', 'fast-road'])

export function createSeededRandom(seed = 1) {
  let state = Number(seed) >>> 0 || 1
  return () => {
    state = (state + 0x6D2B79F5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function createLane(index, seed = 1, width = 7) {
  if (index <= 1 || index % 8 === 0) return { index, type: 'safe', speed: 0, direction: 0, blocked: [] }
  const random = createSeededRandom((Number(seed) ^ Math.imul(index + 1, 0x9E3779B1)) >>> 0)
  const type = random() > 0.72 ? 'fast-road' : 'road'
  const direction = random() > 0.5 ? 1 : -1
  const density = type === 'fast-road' ? 2 : 1
  const blocked = new Set()
  while (blocked.size < density) blocked.add(Math.floor(random() * width) - Math.floor(width / 2))
  return {
    index,
    type,
    direction,
    speed: Number(((type === 'fast-road' ? 2.2 : 1.25) + random() * 0.55).toFixed(3)),
    blocked: [...blocked].sort((a, b) => a - b),
  }
}

export function createLaneWindow(seed, fromIndex, count, width = 7) {
  return Array.from({ length: count }, (_, offset) => createLane(fromIndex + offset, seed, width))
}
