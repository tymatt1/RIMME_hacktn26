import assert from 'node:assert/strict'
import test from 'node:test'
import { cloudStore, emptyLinks, localStore, startup } from './account-store.js'

function mockFetch(routes) {
  const calls = []
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, method: options.method || 'GET', body: options.body ? JSON.parse(options.body) : undefined })
    const route = routes[`${options.method || 'GET'} ${url}`]
    if (!route) throw new Error(`no route for ${options.method || 'GET'} ${url}`)
    const result = typeof route === 'function' ? route(options) : route
    if (result instanceof Error) throw result
    return { ok: result.status < 400, status: result.status, json: async () => result.body }
  }
  return calls
}
const session = { user: { id: 'u1', email: 'maria@example.com', name: 'Maria', phone: '', relationship: '' }, plan: { id: 'p1', role: 'owner', memberName: null, ownerName: 'Maria', version: 3 } }

test('signing in opens the shared plan and starts syncing from the server copy', async () => {
  mockFetch({
    'POST /api/auth/login': { status: 200, body: session },
    'GET /api/plan': { status: 200, body: { planId: 'p1', version: 3, data: { onboardingComplete: true, members: ['Maria', 'Daniel'], intake: { personName: 'Arthur' } } } },
  })
  const result = await cloudStore.signIn({ email: 'maria@example.com', password: 'a long password' })
  assert.equal(result.accountId, 'maria@example.com')
  assert.equal(result.planId, 'p1')
  assert.equal(result.role, 'owner')
  assert.equal(result.sync.version, 3)
  assert.equal(result.draft.intake.personName, 'Arthur')
  assert.deepEqual(result.draft.members, ['Maria', 'Daniel'])
  assert.equal(result.draft.page, 'overview')
})

test('a brand-new empty plan starts from a fresh plan for that person', async () => {
  mockFetch({
    'POST /api/auth/login': { status: 200, body: session },
    'GET /api/plan': { status: 200, body: { planId: 'p1', version: 1, data: {} } },
  })
  const result = await cloudStore.signIn({ email: 'maria@example.com', password: 'a long password' })
  assert.equal(result.draft.onboardingComplete, false)
  assert.equal(result.draft.page, 'situation')
  assert.deepEqual(result.draft.members, ['Maria', 'Family'])
  assert.deepEqual(result.sync.data, {}) // the server copy is still empty, so the first sync saves this plan
})

test('sign-up sends the fresh plan along, without the screen the device is on', async () => {
  const calls = mockFetch({ 'POST /api/auth/signup': { status: 200, body: { ...session, plan: { ...session.plan, version: 2 } } } })
  const result = await cloudStore.signUp({ email: 'maria@example.com', name: ' Maria ', phone: '', password: 'a long password' })
  const sent = calls[0].body
  assert.equal(sent.name, 'Maria')
  assert.ok(sent.plan && !('page' in sent.plan) && !('returnPage' in sent.plan))
  assert.equal(sent.plan.intake.caregiverName, 'Maria')
  assert.equal(result.sync.version, 2)
  assert.equal(result.draft.page, 'situation')
})

test('signing out: a connection failure is reported, "already signed out" is fine', async () => {
  mockFetch({ 'POST /api/auth/logout': () => Object.assign(new Error('x'), {}) })
  globalThis.fetch = async () => { throw new TypeError('offline') }
  await assert.rejects(cloudStore.signOut(), (error) => error.status === 0)
  mockFetch({ 'POST /api/auth/logout': { status: 401, body: { detail: 'Not signed in.' } } })
  await cloudStore.signOut()
})

test('invite preview: no such invite is null, other problems are raised', async () => {
  mockFetch({ 'GET /api/invites/ABCD2345': { status: 404, body: { detail: 'No invite was found with this code.' } }, 'GET /api/invites/ZZZZ2345': { status: 500, body: null } })
  assert.equal(await cloudStore.preview('ABCD2345'), null)
  await assert.rejects(cloudStore.preview('ZZZZ2345'), (error) => error.status === 500)
})

test('startup: server accounts when the API answers "not signed in"; the browser demo for anything else', async () => {
  globalThis.window = { localStorage: { getItem: () => null, setItem() {} } }
  mockFetch({ 'GET /api/auth/me': { status: 401, body: { detail: 'Not signed in.' } } })
  const cloudResult = await startup()
  assert.equal(cloudResult.store, cloudStore)
  assert.equal(cloudResult.session.accountId, null)

  for (const status of [404, 503, 400, 502]) {
    mockFetch({ 'GET /api/auth/me': { status, body: status === 404 ? { detail: 'Not Found' } : { detail: 'x' } } })
    const result = await startup()
    assert.equal(result.store, localStore, `status ${status}`)
  }
  globalThis.fetch = async () => { throw new TypeError('offline') }
  assert.equal((await startup()).store, localStore)
})

test('startup: signed in but the plan cannot be loaded gives an error instead of a blank plan', async () => {
  globalThis.window = { localStorage: { getItem: () => null, setItem() {} } }
  mockFetch({ 'GET /api/auth/me': { status: 200, body: session }, 'GET /api/plan': { status: 500, body: null } })
  const result = await startup()
  assert.ok(result.error)
  assert.equal(result.store, undefined)
})

test('empty links have the shape the Family tab expects', () => {
  assert.deepEqual(emptyLinks(true), { owner: null, byMember: {}, you: null, isOwner: true })
})
