import test from 'node:test'
import assert from 'node:assert/strict'
import { facilities, sampleIntake } from '../data/prototype.js'
import { buildTasks } from './plan.js'
import { blankIntake, toPlanIntake, visibleFacilities, loadDraft, saveDraft } from './demo-model.js'

test('a sample hospital journey personalizes the existing task library', () => {
  const planIntake = toPlanIntake(sampleIntake)
  assert.deepEqual(planIntake, { hospital: true, medicaid: false, needs: ['mobility', 'memory', 'medications', 'daily'] })
  const ids = buildTasks(planIntake).map(({ id }) => id)
  assert.ok(ids.includes('discharge'))
  assert.ok(ids.includes('medications'))
  assert.ok(ids.includes('memory'))
  assert.ok(!ids.includes('coverage'))
  assert.deepEqual(toPlanIntake(blankIntake()), { hospital: false, medicaid: false, needs: [] })
})

test('uncertainty and independence do not create needs; explicit support and Medicaid do', () => {
  const intake = blankIntake()
  intake.mobility = ['Independently', 'Not sure']
  intake.coverage = ['Medicaid']
  intake.dailySupport.medicines = 'Substantial help'
  const converted = toPlanIntake(intake)
  assert.deepEqual(converted, { hospital: false, medicaid: true, needs: ['medications'] })
  intake.transferHelp = 'Some help'
  assert.ok(toPlanIntake(intake).needs.includes('mobility'))
  assert.ok(buildTasks(converted).some(({ id }) => id === 'coverage'))
})

test('filters combine and sorting leaves source facility order unchanged', () => {
  const initialOrder = facilities.map(({ id }) => id)
  const chosen = visibleFacilities(facilities, 8, 'Short recovery stays', 'staffing')
  assert.deepEqual(chosen.map(({ id }) => id), ['cedar-grove', 'willow-bend'])
  assert.deepEqual(visibleFacilities(facilities, 6, 'Longer-term stays').map(({ id }) => id), ['magnolia-court'])
  assert.deepEqual(visibleFacilities(facilities, 0), [])
  assert.deepEqual(visibleFacilities(facilities, 50, 'All sample options', 'name').map(({ name }) => name), [...facilities.map(({ name }) => name)].sort())
  assert.deepEqual(facilities.map(({ id }) => id), initialOrder)
})

test('drafts hydrate stale arrays and nested values and omit account credentials', () => {
  let stored = JSON.stringify({ page: 'unknown', intake: { personName: 'Arthur', priorities: 'broken', dailySupport: { bathing: 'Some help' }, coverage: ['Medicaid', 4] }, completed: [null, 'packing', 'packing'], shortlist: 'bad' })
  globalThis.window = { localStorage: { getItem: () => stored, setItem: (_, value) => { stored = value } } }
  const draft = loadDraft()
  assert.equal(draft.page, 'welcome')
  assert.equal(draft.intake.personName, 'Arthur')
  assert.deepEqual(draft.intake.priorities, [])
  assert.deepEqual(draft.intake.coverage, ['Medicaid'])
  assert.equal(draft.intake.dailySupport.bathing, 'Some help')
  assert.equal(draft.intake.dailySupport.medicines, 'Not sure')
  assert.deepEqual(draft.completed, ['packing'])
  assert.deepEqual(draft.shortlist, [])
  assert.deepEqual(draft.members, ['Me', 'Family'])
  assert.deepEqual(draft.profile, { morning: '', interests: [], comforts: [], communication: [], notes: '', aiDraft: null })
  assert.equal(saveDraft({ ...draft, page: 'plan', email: 'demo@example.com', password: 'not-a-real-password', intake: { ...draft.intake, password: 'hidden' }, profile: { morning: 'Early riser', interests: ['Music'], comforts: null, communication: ['Use larger print'], notes: 'Likes jazz', password: 'hidden' }, members: ['Me', 'Daniel'], assignees: { packing: 'Daniel', invalid: 'Missing member', email: 'Me' }, chosenFacility: 'cedar-grove' }), true)
  assert.equal(loadDraft().page, 'plan')
  assert.deepEqual(loadDraft().members, ['Me', 'Daniel'])
  assert.deepEqual(loadDraft().assignees, { packing: 'Daniel' })
  assert.deepEqual(loadDraft().profile.interests, ['Music'])
  assert.deepEqual(loadDraft().profile.comforts, [])
  assert.equal(loadDraft().profile.notes, 'Likes jazz')
  assert.equal(loadDraft().chosenFacility, 'cedar-grove')
  assert.ok(!stored.includes('password'))
  assert.ok(!stored.includes('demo@example.com'))
  delete globalThis.window
})

test('unavailable, malformed, and structurally invalid storage fails safely', () => {
  assert.equal(loadDraft(), null)
  assert.equal(saveDraft({}), false)
  let stored = '{invalid'
  globalThis.window = { localStorage: { getItem: () => stored, setItem: () => { throw new Error('quota') } } }
  assert.equal(loadDraft(), null)
  stored = 'null'
  assert.equal(loadDraft(), null)
  stored = '[]'
  assert.equal(loadDraft(), null)
  assert.equal(saveDraft({ page: 'plan' }), false)
  delete globalThis.window
})
