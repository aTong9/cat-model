import test from 'node:test'
import assert from 'node:assert/strict'
import { EditorHistory } from '../src/core/EditorHistory.js'

test('editor history supports bounded undo, redo and branch replacement', () => {
  const history = new EditorHistory({ value: 0 }, { limit: 2 })
  history.push({ value: 1 }); history.push({ value: 2 }); history.push({ value: 3 })
  assert.deepEqual(history.undo(), { value: 2 })
  assert.deepEqual(history.undo(), { value: 1 })
  assert.equal(history.undo(), null)
  assert.deepEqual(history.redo(), { value: 2 })
  history.push({ value: 9 })
  assert.equal(history.canRedo, false)
})
