import test from 'node:test'
import assert from 'node:assert/strict'
import { buildTasks } from './plan.js'

test('intake adds relevant tasks and removes them when needs change', () => {
  const personalized = buildTasks({ hospital: true, medicaid: true, needs: ['memory', 'medications', 'mobility', 'daily'] })
  assert.deepEqual(personalized.slice(0, 3).map(({ id }) => id), ['discharge', 'memory', 'coverage'])
  assert.equal(new Set(personalized.map(({ id }) => id)).size, personalized.length)
  const basic = buildTasks({ hospital: false, medicaid: false, needs: [] })
  assert.deepEqual(basic.map(({ id }) => id), ['tour', 'packing', 'profile'])
})
