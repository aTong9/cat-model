import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeMetadataRecord } from '../src/core/catTraits.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const metadataPath = path.join(root, 'liberty_cats_download', 'all_metadata.json')
const imageDir = path.join(root, 'liberty_cats_download', 'images')
if (!fs.existsSync(metadataPath) || !fs.existsSync(imageDir)) throw new Error('Liberty Cats source data is missing')
const source = JSON.parse(fs.readFileSync(metadataPath, 'utf8'))
const records = Array.isArray(source) ? source : source.nfts
if (!Array.isArray(records)) throw new Error('Expected all_metadata.json to contain an nfts array')
const imageIds = new Set(fs.readdirSync(imageDir).map(name => path.parse(name).name).filter(value => /^\d+$/.test(value)))
const normalized = [], excluded = [], failures = []
const sourceByTokenId = new Map()
for (const record of records) {
  const result = normalizeMetadataRecord(record)
  if (result.ok) {
    normalized.push(result.traits)
    sourceByTokenId.set(result.traits.tokenId, record)
  }
  else if (result.reason.startsWith('excluded-')) excluded.push({ tokenId: result.tokenId, reason: result.reason })
  else failures.push(result)
}
const missingImages = normalized.filter(item => !imageIds.has(item.tokenId)).map(item => item.tokenId)
const summary = { sourceRecords: records.length, supportedTokens: normalized.length, excluded, failures, imageFiles: imageIds.size, missingImages }
console.log(JSON.stringify(summary, null, 2))
if (records.length !== 9903 || normalized.length !== 9901 || excluded.length !== 2 || failures.length || missingImages.length) process.exitCode = 1

if (process.argv.includes('--write') && !process.exitCode) {
  const extensionById = new Map(fs.readdirSync(imageDir).map(name => [path.parse(name).name, path.extname(name).slice(1).toLowerCase()]))
  const catalog = normalized.map(traits => {
    const sourceRecord = sourceByTokenId.get(traits.tokenId)
    return [
      traits.tokenId, traits.eyes, traits.face, traits.fur, traits.gear,
      traits.background, traits.special, extensionById.get(traits.tokenId),
      sourceRecord?.image?.originalUrl ?? sourceRecord?.raw?.metadata?.image ?? null,
    ]
  })
  const targetDir = path.join(root, 'public', 'data')
  fs.mkdirSync(targetDir, { recursive: true })
  const target = path.join(targetDir, 'token-catalog.json')
  fs.writeFileSync(target, JSON.stringify({ schemaVersion: 1, count: catalog.length, tokens: catalog }))
  console.log(`Wrote ${catalog.length} tokens to ${target}`)
}
