import test from 'node:test'
import assert from 'node:assert/strict'
import { messages } from '../src/i18n/messages.js'

test('English primary UI controls do not fall back to Chinese copy', () => {
  assert.deepEqual({
    undo: messages.en.common.undo,
    redo: messages.en.common.redo,
    quickTools: messages.en.panel.quickToolsAria,
    history: messages.en.panel.editHistory,
    collection: messages.en.panel.toggleCollection,
    previous: messages.en.panel.previous,
    categories: messages.en.panel.categoryNav,
    localImage: messages.en.panel.localImage,
    exportButton: messages.en.panel.export.exportButton,
    png: messages.en.panel.export.png,
    weather: messages.en.controls.weather.label,
    dark: messages.en.themes.dark,
    tokenNav: messages.en.panel.tokenNav,
    exportPresets: messages.en.panel.export.exportPresets,
  }, {
    undo: 'Undo', redo: 'Redo', quickTools: 'Environment quick settings', history: 'Edit history',
    collection: 'All cats', previous: 'Previous', categories: 'Configuration categories', localImage: 'Local image',
    exportButton: 'Export by configuration', png: 'Save PNG', weather: 'Weather', dark: 'Dark', tokenNav: 'Token navigation',
    exportPresets: { game: 'Game runtime', dcc: 'DCC editing', static: 'Static model' },
  })
})

test('Japanese primary UI controls do not fall back to Chinese copy', () => {
  assert.deepEqual({
    undo: messages.ja.common.undo,
    redo: messages.ja.common.redo,
    quickTools: messages.ja.panel.quickToolsAria,
    history: messages.ja.panel.editHistory,
    collection: messages.ja.panel.toggleCollection,
    previous: messages.ja.panel.previous,
    categories: messages.ja.panel.categoryNav,
    localImage: messages.ja.panel.localImage,
    exportButton: messages.ja.panel.export.exportButton,
    png: messages.ja.panel.export.png,
    weather: messages.ja.controls.weather.label,
    dark: messages.ja.themes.dark,
    tokenNav: messages.ja.panel.tokenNav,
    exportPresets: messages.ja.panel.export.exportPresets,
  }, {
    undo: '元に戻す', redo: 'やり直す', quickTools: '環境クイック設定', history: '編集履歴',
    collection: 'すべての猫', previous: '前へ', categories: '設定カテゴリ', localImage: 'ローカル画像',
    exportButton: '設定からエクスポート', png: 'PNGを保存', weather: '天気', dark: 'ダーク', tokenNav: 'Token切替',
    exportPresets: { game: 'ゲームランタイム', dcc: 'DCC編集', static: '静的モデル' },
  })
})
