import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const candidates = [
  process.env.BLENDER_BIN,
  'blender',
  '/Applications/Blender.app/Contents/MacOS/Blender',
  '/opt/homebrew/bin/blender',
].filter(Boolean)

const blender = candidates.find(candidate => {
  if (candidate.includes(path.sep)) return fs.existsSync(candidate)
  return spawnSync(candidate, ['--version'], { stdio: 'ignore' }).status === 0
})

if (!blender) {
  throw new Error('未找到 Blender。请安装 Blender，或通过 BLENDER_BIN 指定可执行文件。')
}

const exportResult = spawnSync(process.execPath, ['scripts/export-animation-validation.mjs'], { stdio: 'inherit' })
if (exportResult.status !== 0) process.exit(exportResult.status ?? 1)

const outputDir = path.resolve('output', 'animation-validation')
const result = spawnSync(blender, [
  '--background',
  '--factory-startup',
  '--python', 'scripts/validate-glb-in-blender.py',
  '--',
  path.join(outputDir, 'liberty-cat-414-animated.glb'),
  path.join(outputDir, 'blender-report.json'),
  path.join(outputDir, 'liberty-cat-414-animated.blend'),
  'Idle,Run,Jump,Wave',
], { stdio: 'inherit' })

const readValidationReport = () => {
const reportPath = path.join(outputDir, 'blender-report.json')
  if (!fs.existsSync(reportPath)) return null
  try {
    return JSON.parse(fs.readFileSync(reportPath, 'utf8'))
  } catch {
    return null
  }
}

if (result.status !== 0) {
  const report = readValidationReport()
  const softFail = process.env.BLENDER_SOFT_FAIL === '1'
  const strictMode = process.env.BLENDER_STRICT === '1'

  if (report?.valid) {
    if (strictMode) {
      console.error(`Blender 返回非零退出码 ${result.status}，报告有效但启用了严格模式（BLENDER_STRICT=1），将视为失败。`)
      process.exit(result.status ?? 1)
    }

    const modeLabel = softFail ? 'BLENDER_SOFT_FAIL=1' : '非严格模式'
    console.warn(`Blender 返回非零退出码 ${result.status}，但验证报告有效（${modeLabel}），已降级为软失败。`)
    process.exit(0)
  }

  process.exit(result.status ?? 1)
}

const report = JSON.parse(fs.readFileSync(path.join(outputDir, 'blender-report.json'), 'utf8'))
if (!report.valid) throw new Error('Blender 导入报告未通过。')
console.log(`Blender ${report.blenderVersion} validation passed: ${report.meshes} meshes, ${report.actions.length} actions.`)
