import test from 'node:test'
import assert from 'node:assert/strict'
import { defaultPriorityWeights, importanceLabel, normalizeBudget, normalizePriorityWeights, prioritiesAreEqual, prioritiesAreUntouched, priorityTopics, rankPriorities, scoredPriorityTopics } from './priorities.js'
import { loadDraft, saveDraft } from './demo-model.js'
import { buildCareSummary } from '../data/prototype.js'

test('every topic gets a slider value, clamped to 0-100 in steps of 5', () => {
  const values = normalizePriorityWeights({ Staffing: 130, 'Close to family': -4, 'Quality of care': 'x', 'Inspection information': 62, Unknown: 90 })
  assert.deepEqual(Object.keys(values), priorityTopics)
  assert.equal(values.Staffing, 100)
  assert.equal(values['Close to family'], 0)
  assert.equal(values['Quality of care'], 50)
  assert.equal(values['Inspection information'], 60)
  assert.deepEqual(normalizePriorityWeights(null), defaultPriorityWeights())
  assert.equal(scoredPriorityTopics.includes('Costs & coverage'), false)
})

test('an older drafted ranking becomes slider values, most important highest', () => {
  const values = normalizePriorityWeights(undefined, ['Costs & coverage', 'Staffing', 'Staffing', 'Outdated topic'])
  assert.ok(values['Costs & coverage'] > values.Staffing)
  assert.ok(values.Staffing > values['Close to family'])
  assert.equal(values['Close to family'], 50)
})

test('ranking sorts by slider value, keeps ties in default order and drops topics set to 0', () => {
  const order = rankPriorities({ 'Close to family': 0, Staffing: 80, 'Inspection information': 80, 'Quality of care': 30, 'Costs & coverage': 50 })
  assert.deepEqual(order, ['Staffing', 'Inspection information', 'Costs & coverage', 'Quality of care'])
  assert.equal(prioritiesAreUntouched(defaultPriorityWeights()), true)
  assert.equal(prioritiesAreUntouched({ ...defaultPriorityWeights(), Staffing: 80 }), false)
  assert.equal(prioritiesAreEqual(defaultPriorityWeights(), { Staffing: 50 }), true)
  assert.equal(prioritiesAreEqual(defaultPriorityWeights(), { Staffing: 55 }), false)
})

test('importance labels cover the whole slider', () => {
  assert.deepEqual([0, 20, 50, 70, 100].map(importanceLabel), ['Not important', 'A little', 'Somewhat', 'Important', 'Very important'])
})

test('budget and priority sliders round-trip through storage and appear in the care summary', () => {
  let stored
  globalThis.window = { localStorage: { getItem: () => stored, setItem: (_, value) => { stored = value } } }
  try {
    const priorityWeights = { ...defaultPriorityWeights(), 'Costs & coverage': 95, Staffing: 70 }
    assert.equal(saveDraft({ page: 'priorities', intake: { monthlyBudget: 7500, priorityWeights } }), true)
    const draft = loadDraft()
    assert.equal(draft.intake.monthlyBudget, 7500)
    assert.deepEqual(draft.intake.priorityWeights, priorityWeights)
    const summary = buildCareSummary(draft.intake).prioritiesSummary
    assert.match(summary, /1\. costs & coverage; 2\. staffing/)
    assert.match(summary, /\$7,500/)
    assert.match(buildCareSummary({ priorityWeights: defaultPriorityWeights() }).prioritiesSummary, /sliders/)
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

test('older rankings retain moved topics and become sliders without assuming answers to new preference questions', () => {
  let stored = JSON.stringify({ page: 'overview', intake: { priorities: ['Room preferences', 'Costs & coverage', 'Language & culture', 'Rehabilitation services', 'Staffing'] } })
  globalThis.window = { localStorage: { getItem: () => stored, setItem: (_key, value) => { stored = value } } }
  try {
    const draft = loadDraft()
    assert.ok(draft.intake.priorityWeights['Costs & coverage'] > draft.intake.priorityWeights.Staffing)
    assert.equal(draft.intake.priorityWeights['Close to family'], 50)
    assert.deepEqual(draft.intake.additionalPriorities, ['Room preferences', 'Language & culture', 'Rehabilitation services'])
    assert.equal(draft.intake.rehabilitationPreference, 'Not sure')
    assert.equal(draft.intake.roomPreference, 'Not sure')
    assert.deepEqual(draft.intake.facilityPreferences, [])
    saveDraft({ ...draft, intake: { ...draft.intake, rehabilitationPreference: 'Yes', roomPreference: 'Private room', facilityPreferences: ['Interpreter access'] } })
    const restored = loadDraft()
    assert.equal(restored.intake.rehabilitationPreference, 'Yes')
    assert.equal(restored.intake.roomPreference, 'Private room')
    assert.deepEqual(restored.intake.facilityPreferences, ['Interpreter access'])
    assert.deepEqual(restored.intake.additionalPriorities, draft.intake.additionalPriorities)
    assert.deepEqual(restored.intake.priorityWeights, draft.intake.priorityWeights)
  } finally { delete globalThis.window }
})
