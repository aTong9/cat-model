import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const exts = ['.js', '.vue']
const files = []
const walk = async (dir) => {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'i18n' && dir.includes('/src')) continue
    if (entry.name === '.git') continue
    const p = join(dir, entry.name)
    if (entry.isDirectory()) await walk(p)
    else if (exts.includes(p.slice(-3))) files.push(p)
  }
}
await walk('src')
const re = /['"`](?:[^'"`\\]|\\.)*[\p{Script=Han}](?:[^'"`\\]|\\.)*['"`]/gu
for (const file of files) {
  const text = await readFile(file, 'utf8')
  const matches = [...text.matchAll(re)]
  if (!matches.length) continue
  const lines = text.split('\n')
  for (const m of matches) {
    const idx = m.index
    const line = text.slice(0, idx).split('\n').length
    const lineText = lines[line - 1]?.trim()
    if (!lineText) continue
    if (lineText.trim().startsWith('//')) continue
    if (/export const messages/.test(file)) continue
    if (file.includes('.vue') && /<[^>]+>/.test(lineText)) {
      // keep for template too
    }
    console.log(`${file}:${line}: ${lineText}`)
  }
}
