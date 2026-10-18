import assert from 'node:assert/strict'
import test from 'node:test'
import { createPlanSync } from './plan-sync.js'

// A tiny fake server with the same rules as the real one: saving needs the current version.
function fakeServer(initial = { items: [] }) {
  const server = { version: 1, data: initial, puts: 0, gets: 0, down: false, expired: false }
  server.client = {
    async getPlan(known) {
      server.gets += 1
      if (server.down) throw Object.assign(new Error('down'), { status: 0 })
      if (server.expired) throw Object.assign(new Error('ended'), { status: 401 })
      return known === server.version ? { version: known, unchanged: true } : { version: server.version, data: server.data }
    },
    async putPlan(version, data) {
      server.puts += 1
      if (server.down) throw Object.assign(new Error('down'), { status: 0 })
      if (server.expired) throw Object.assign(new Error('ended'), { status: 401 })
      if (version !== server.version) throw Object.assign(new Error('conflict'), { status: 409, data: { current: { version: server.version, data: server.data } } })
      server.version += 1; server.data = data
      return { version: server.version }
    },
  }
  return server
}

// A device: its plan on screen, plus a sync engine that never uses real timers.
function device(server, screen) {
  const state = { screen, statuses: [], ended: 0, applied: [] }
  const fakeTimers = { setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {} }
  state.sync = createPlanSync({
    client: server.client,
    getLocal: () => state.screen,
    applyRemote: (merged) => { state.applied.push(merged); state.screen = merged },
    onStatus: (s) => state.statuses.push(s),
    onSessionEnded: () => { state.ended += 1 },
    timers: fakeTimers,
  })
  state.sync.start({ version: server.version, data: server.data })
  return state
}

test('an edit is saved and the version moves on', async () => {
  const server = fakeServer({ items: ['a'] })
  const a = device(server, { items: ['a'] })
  a.screen = { items: ['a', 'b'] }
  await a.sync.flush()
  assert.deepEqual(server.data, { items: ['a', 'b'] })
  assert.equal(server.version, 2)
  assert.deepEqual(a.statuses, ['saving', 'saved'])
})

test('nothing is sent when nothing changed', async () => {
  const server = fakeServer({ items: ['a'] })
  const a = device(server, { items: ['a'] })
  await a.sync.flush()
  assert.equal(server.puts, 0)
})

test('a plan someone else saved arrives on poll', async () => {
  const server = fakeServer({ items: ['a'], note: '' })
  const a = device(server, { items: ['a'], note: '' })
  const b = device(server, { items: ['a'], note: '' })
  b.screen = { items: ['a'], note: 'hello from B' }
  await b.sync.flush()
  assert.equal(await a.sync.poll(), true)
  assert.equal(a.screen.note, 'hello from B')
  assert.equal(await a.sync.poll(), false) // nothing new now
})

test('two devices editing at once: both edits survive', async () => {
  const server = fakeServer({ items: ['a'], note: '' })
  const a = device(server, { items: ['a'], note: '' })
  const b = device(server, { items: ['a'], note: '' })
  a.screen = { items: ['a', 'from-a'], note: '' }
  b.screen = { items: ['a', 'from-b'], note: 'B wrote this' }
  await a.sync.flush()
  await b.sync.flush() // B's save conflicts, merges with A's, and saves on top
  assert.deepEqual([...server.data.items].sort(), ['a', 'from-a', 'from-b'])
  assert.equal(server.data.note, 'B wrote this')
  assert.deepEqual([...b.screen.items].sort(), ['a', 'from-a', 'from-b']) // B's screen shows the merge
  await a.sync.poll()
  assert.deepEqual([...a.screen.items].sort(), ['a', 'from-a', 'from-b'])
})

test('unsaved local edits are kept when a poll brings other changes', async () => {
  const server = fakeServer({ items: ['a'], note: '' })
  const a = device(server, { items: ['a'], note: '' })
  const b = device(server, { items: ['a'], note: '' })
  b.screen = { items: ['a', 'b-item'], note: '' }
  await b.sync.flush()
  a.screen = { items: ['a'], note: 'typing, not saved yet' }
  await a.sync.poll()
  assert.equal(a.screen.note, 'typing, not saved yet')
  assert.deepEqual([...a.screen.items].sort(), ['a', 'b-item'])
  await a.sync.flush()
  assert.equal(server.data.note, 'typing, not saved yet')
})

test('no connection: status says offline, then it saves when the connection is back', async () => {
  const server = fakeServer({ items: [] })
  const a = device(server, { items: [] })
  server.down = true
  a.screen = { items: ['x'] }
  await a.sync.flush()
  assert.equal(a.sync.status, 'offline')
  assert.equal(server.version, 1)
  server.down = false
  await a.sync.flush()
  assert.equal(a.sync.status, 'saved')
  assert.deepEqual(server.data, { items: ['x'] })
})

test('a sign-in that has ended is reported once and syncing stops', async () => {
  const server = fakeServer({ items: [] })
  const a = device(server, { items: [] })
  server.expired = true
  a.screen = { items: ['x'] }
  await a.sync.flush()
  assert.equal(a.ended, 1)
  const puts = server.puts
  a.screen = { items: ['x', 'y'] }
  await a.sync.flush()
  assert.equal(server.puts, puts) // stopped
})

test('a brand-new plan is pushed when the engine starts', async () => {
  const server = fakeServer({})
  const a = device(server, { intake: { name: 'new' } })
  await a.sync.flush()
  assert.deepEqual(server.data, { intake: { name: 'new' } })
})

test('normalize makes the two sides comparable', async () => {
  const server = fakeServer({ items: ['a'] })
  const state = { screen: { items: ['a'], page: 'plan' } }
  const sync = createPlanSync({
    client: server.client, getLocal: () => state.screen, applyRemote: () => {}, timers: { setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {} },
    normalize: (plan) => Object.fromEntries(Object.entries(plan).filter(([key]) => key !== 'page')), // leaves out which screen the device is on
  })
  sync.start({ version: 1, data: server.data })
  state.screen = { items: ['a'], page: 'overview' } // only the screen changed
  await sync.flush()
  assert.equal(server.puts, 0)
})

test('a late "signed out" answer after the device already left the plan is ignored', async () => {
  const server = fakeServer({ items: ['a'] })
  const a = device(server, { items: ['a'] })
  a.screen = { items: ['a', 'b'] }
  server.expired = true
  const saving = a.sync.flush()
  a.sync.stop() // the person deleted their account / signed out while the save was in flight
  await saving
  assert.equal(a.ended, 0)
})

test('the default timers work in a browser, where setTimeout must be called on the window itself', async () => {
  const real = { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout, setInterval: globalThis.setInterval, clearInterval: globalThis.clearInterval }
  const strict = (fn) => function (...args) { if (this !== undefined && this !== globalThis) throw new TypeError('Illegal invocation'); return fn(...args) }
  globalThis.setTimeout = strict(real.setTimeout); globalThis.clearTimeout = strict(real.clearTimeout)
  globalThis.setInterval = strict(real.setInterval); globalThis.clearInterval = strict(real.clearInterval)
  try {
    const server = fakeServer({ items: ['a'] })
    const sync = createPlanSync({ client: server.client, getLocal: () => ({ items: ['a'] }), applyRemote: () => {}, pollMs: 100000, debounceMs: 100000 })
    sync.start({ version: 1, data: server.data })
    sync.schedulePush()
    sync.stop()
  } finally { Object.assign(globalThis, real) }
})
