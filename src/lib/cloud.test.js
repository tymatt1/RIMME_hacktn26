import assert from 'node:assert/strict'
import test from 'node:test'
import { cloud, CloudError, probe } from './cloud.js'

// Fake fetch that records each call and answers from a script.
function mockFetch(handler) {
  const calls = []
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options })
    const result = await handler(url, options)
    if (result instanceof Error) throw result
    return { ok: result.status < 400, status: result.status, json: async () => { if (result.raw) throw new Error('not json'); return result.body } }
  }
  return calls
}

test('reads send no custom header, writes send the Carebridge header and JSON', async () => {
  const calls = mockFetch(() => ({ status: 200, body: { ok: true } }))
  await cloud.getPlan()
  await cloud.putPlan(3, { a: 1 })
  assert.equal(calls[0].url, '/api/plan')
  assert.equal(calls[0].options.headers['x-cb-client'], undefined)
  assert.equal(calls[1].options.method, 'PUT')
  assert.equal(calls[1].options.headers['x-cb-client'], '1')
  assert.equal(calls[1].options.headers['Content-Type'], 'application/json')
  assert.deepEqual(JSON.parse(calls[1].options.body), { version: 3, data: { a: 1 } })
  assert.equal(calls[1].options.credentials, 'same-origin')
})

test('the known version is sent as a query only when it is a number', async () => {
  const calls = mockFetch(() => ({ status: 200, body: {} }))
  await cloud.getPlan(5)
  await cloud.getPlan()
  assert.equal(calls[0].url, '/api/plan?known=5')
  assert.equal(calls[1].url, '/api/plan')
})

test('errors carry the server message, the status and the body', async () => {
  mockFetch(() => ({ status: 409, body: { detail: 'This plan changed on another device.', current: { version: 4 } } }))
  await assert.rejects(cloud.putPlan(1, {}), (error) => {
    assert.ok(error instanceof CloudError)
    assert.equal(error.message, 'This plan changed on another device.')
    assert.equal(error.status, 409)
    assert.equal(error.data.current.version, 4)
    return true
  })
})

test('plain-language messages when the server gives none', async () => {
  mockFetch(() => ({ status: 429, body: null, raw: true }))
  await assert.rejects(cloud.login({}), /Too many attempts/)
  mockFetch(() => ({ status: 500, body: null, raw: true }))
  await assert.rejects(cloud.me(), /on our side/)
  mockFetch(() => ({ status: 422, body: { detail: [{ loc: ['body'] }] } }))
  await assert.rejects(cloud.signup({}), /Check the details/)
})

test('no connection becomes status 0 with a friendly message', async () => {
  mockFetch(() => new TypeError('Failed to fetch'))
  await assert.rejects(cloud.me(), (error) => error.status === 0 && /couldn’t reach/.test(error.message))
})

test('invite codes are URL-encoded', async () => {
  const calls = mockFetch(() => ({ status: 200, body: {} }))
  await cloud.previewInvite('AB/CD')
  assert.equal(calls[0].url, '/api/invites/AB%2FCD')
})

test('probe: signed in, signed out, and every way the service can be missing', async () => {
  mockFetch(() => ({ status: 200, body: { user: { email: 'a@b.co' }, plan: {} } }))
  assert.equal((await probe()).available, true)
  assert.equal((await probe()).session.user.email, 'a@b.co')
  mockFetch(() => ({ status: 401, body: { detail: 'Not signed in.' } }))
  assert.deepEqual(await probe(), { available: true, session: null })
  for (const reply of [{ status: 404, body: { detail: 'Not Found' } }, { status: 503, body: { detail: 'Accounts are not set up on this server yet.' } }, { status: 400, body: { detail: 'Accounts only work over a secure (HTTPS) connection.' } }, { status: 502, body: null, raw: true }, { status: 401, body: null, raw: true }]) {
    mockFetch(() => reply)
    assert.deepEqual(await probe(), { available: false, session: null }, `status ${reply.status}`)
  }
  mockFetch(() => new TypeError('offline'))
  assert.deepEqual(await probe(), { available: false, session: null })
})
