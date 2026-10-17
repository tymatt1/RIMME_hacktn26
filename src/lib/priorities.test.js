import test from 'node:test'
import assert from 'node:assert/strict'
import { completePriorityOrder, movePriority, normalizeBudget, priorityTopics } from './priorities.js'
import { loadDraft, saveDraft } from './demo-model.js'
import { buildCareSummary } from '../data/prototype.js'

test('older pick-three drafts keep selections first and gain all remaining topics once', () => {
  const order = completePriorityOrder(['Costs & coverage', 'Staffing', 'Staffing', 'Outdated topic'])
  assert.deepEqual(order.slice(0, 2), ['Costs & coverage', 'Staffing'])
  assert.equal(order.length, priorityTopics.length)
  assert.equal(new Set(order).size, priorityTopics.length)
  assert.deepEqual(completePriorityOrder(null), priorityTopics)
})

test('moving a priority works in either direction without losing or changing the source list', () => {
  const order = [...priorityTopics]
  const moved = movePriority(order, 'Costs & coverage', 'Close to family')
  assert.equal(moved[0], 'Costs & coverage')
  assert.equal(movePriority(moved, 'Costs & coverage', 'Language & culture').at(-1), 'Costs & coverage')
  assert.deepEqual(order, priorityTopics)
  assert.deepEqual(movePriority(order, 'Missing', 'Staffing'), order)
})

test('budget and priority order round-trip through storage and appear in the care summary', () => {
  let stored
  globalThis.window = { localStorage: { getItem: () => stored, setItem: (_, value) => { stored = value } } }
  try {
    const priorities = movePriority(priorityTopics, 'Costs & coverage', 'Close to family')
    assert.equal(saveDraft({ page: 'priorities', intake: { monthlyBudget: 7500, priorities } }), true)
    const draft = loadDraft()
    assert.equal(draft.intake.monthlyBudget, 7500)
    assert.deepEqual(draft.intake.priorities, priorities)
    const summary = buildCareSummary(draft.intake).prioritiesSummary
    assert.match(summary, /1\. costs & coverage/)
    assert.match(summary, /\$7,500/)
    saveDraft({ ...draft, intake: { ...draft.intake, monthlyBudget: null } })
    assert.equal(loadDraft().intake.monthlyBudget, null)
  } finally {
    delete globalThis.window
  }
})

test('budget normalization rejects bad values and enforces slider limits and step', () => {
  for (const value of [undefined, null, '5000', NaN, Infinity]) assert.equal(normalizeBudget(value), null)
  assert.equal(normalizeBudget(-100), 0)
  assert.equal(normalizeBudget(26000), 20000)
  assert.equal(normalizeBudget(6100), 6000)
})
