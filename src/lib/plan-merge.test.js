import assert from 'node:assert/strict'
import test from 'node:test'
import { mergePlans, same, syncable } from './plan-merge.js'

const base = {
  onboardingComplete: true,
  intake: { personName: 'Rosa', travelMiles: 15, priorityWeights: { staffing: 3, distance: 2 } },
  completed: ['a', 'b'],
  shortlist: ['h1'],
  members: ['Maria', 'Family'],
  contacts: { Maria: { phone: '1' } },
  assignees: { t1: 'Maria' },
  chosenFacility: '',
  guidance: { key: 'k1', tasks: [{ id: 't1' }] },
}
const clone = (value) => JSON.parse(JSON.stringify(value))

test('syncable leaves out which screen a device is on', () => {
  const out = syncable({ page: 'plan', returnPage: 'overview', intake: { a: 1 } })
  assert.deepEqual(out, { intake: { a: 1 } })
})

test('same ignores key order', () => {
  assert.ok(same({ a: 1, b: { c: [1, 2], d: 3 } }, { b: { d: 3, c: [1, 2] }, a: 1 }))
  assert.ok(!same({ a: 1 }, { a: 2 }))
  assert.ok(same(undefined, undefined))
})

test('changes to different things are both kept', () => {
  const local = clone(base); local.intake.travelMiles = 25; local.chosenFacility = 'h2'
  const remote = clone(base); remote.intake.personName = 'Rosa M.'; remote.assignees = { t1: 'Maria', t2: 'Daniel' }
  const merged = mergePlans(base, local, remote)
  assert.equal(merged.intake.travelMiles, 25)
  assert.equal(merged.intake.personName, 'Rosa M.')
  assert.equal(merged.chosenFacility, 'h2')
  assert.deepEqual(merged.assignees, { t1: 'Maria', t2: 'Daniel' })
})

test('checked tasks from both people are combined, and an unchecked box stays unchecked', () => {
  const local = clone(base); local.completed = ['a', 'b', 'c']
  const remote = clone(base); remote.completed = ['a', 'd'] // d added, b unchecked
  assert.deepEqual(mergePlans(base, local, remote).completed.sort(), ['a', 'c', 'd'])
})

test('saved homes added on two devices both survive', () => {
  const local = clone(base); local.shortlist = ['h1', 'h2']
  const remote = clone(base); remote.shortlist = ['h1', 'h3']
  assert.deepEqual(mergePlans(base, local, remote).shortlist, ['h1', 'h2', 'h3'])
})

test('a family member added on another device appears, order of the main contact is kept', () => {
  const remote = clone(base); remote.members = ['Maria', 'Daniel', 'Family']; remote.contacts.Daniel = { phone: '2' }
  const merged = mergePlans(base, clone(base), remote)
  assert.deepEqual(merged.members, ['Maria', 'Daniel', 'Family'])
  assert.deepEqual(merged.contacts.Daniel, { phone: '2' })
})

test('two people editing the same field: the person editing now wins, the rest still merges', () => {
  const local = clone(base); local.intake.travelMiles = 5; local.completed = ['a', 'b', 'x']
  const remote = clone(base); remote.intake.travelMiles = 50; remote.completed = ['a', 'b', 'y']
  const merged = mergePlans(base, local, remote)
  assert.equal(merged.intake.travelMiles, 5)
  assert.deepEqual(merged.completed.sort(), ['a', 'b', 'x', 'y'])
})

test('priority sliders changed on different sliders are combined', () => {
  const local = clone(base); local.intake.priorityWeights.staffing = 5
  const remote = clone(base); remote.intake.priorityWeights.distance = 1
  assert.deepEqual(mergePlans(base, local, remote).intake.priorityWeights, { staffing: 5, distance: 1 })
})

test('the AI guidance is taken as a whole: mine if I changed it, otherwise theirs', () => {
  const mine = clone(base); mine.guidance = { key: 'k2', tasks: [{ id: 'z' }] }
  const theirs = clone(base); theirs.guidance = { key: 'k3', tasks: [{ id: 'q' }] }
  assert.deepEqual(mergePlans(base, mine, theirs).guidance, mine.guidance)
  assert.deepEqual(mergePlans(base, clone(base), theirs).guidance, theirs.guidance)
})

test('a removed item stays removed', () => {
  const local = clone(base); delete local.assignees.t1
  const merged = mergePlans(base, local, clone(base))
  assert.deepEqual(merged.assignees, {})
})

test('no changes anywhere gives the same plan back', () => {
  assert.deepEqual(mergePlans(base, clone(base), clone(base)), base)
})

test('merging never mutates its inputs', () => {
  const local = clone(base); local.completed.push('c')
  const remote = clone(base); remote.completed.push('d')
  const snapshot = JSON.stringify([base, local, remote])
  mergePlans(base, local, remote)
  assert.equal(JSON.stringify([base, local, remote]), snapshot)
})

test('works when there is no base yet (first sync)', () => {
  const merged = mergePlans(null, { a: 1, list: ['x'] }, { b: 2, list: ['y'] })
  assert.equal(merged.a, 1)
  assert.equal(merged.b, 2)
  assert.deepEqual(merged.list.sort(), ['x', 'y'])
})
