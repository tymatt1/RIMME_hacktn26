// Client for the Carebridge account API: accounts, the shared family plan, and invites.
// Requests go to the same address as the rest of the API (/api, see api.js). The sign-in cookie is set by the
// server and can't be read by this code. Nothing secret is kept in the browser.
const BASE = (import.meta.env?.VITE_API_URL ?? '/api').replace(/\/$/, '')

export class CloudError extends Error {
  constructor(message, status = 0, data = null) {
    super(message)
    this.name = 'CloudError'
    this.status = status
    this.data = data
  }
}

function messageFor(data, status) {
  if (typeof data?.detail === 'string') return data.detail
  if (status === 401) return 'Your session has ended. Sign in again.'
  if (status === 422) return 'Check the details you entered and try again.'
  if (status === 429) return 'Too many attempts. Wait a few minutes and try again.'
  return status >= 500 ? 'Something went wrong on our side. Try again in a moment.' : 'That didn’t work. Try again.'
}

async function call(path, { method = 'GET', body, timeout = 15000 } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  let response
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'same-origin',
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(method === 'GET' ? {} : { 'x-cb-client': '1' }) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } catch {
    throw new CloudError('We couldn’t reach Carebridge. Check your connection and try again.', 0)
  } finally {
    clearTimeout(timer)
  }
  let data = null
  try { data = await response.json() } catch { /* The answer wasn't JSON. */ }
  if (!response.ok) throw new CloudError(messageFor(data, response.status), response.status, data)
  return data
}

export const cloud = {
  me: (timeout) => call('/auth/me', { timeout }),
  signup: (body) => call('/auth/signup', { method: 'POST', body, timeout: 30000 }),
  login: (body) => call('/auth/login', { method: 'POST', body, timeout: 30000 }),
  logout: () => call('/auth/logout', { method: 'POST' }),
  join: (body) => call('/auth/join', { method: 'POST', body, timeout: 30000 }),
  updateProfile: (body) => call('/auth/me', { method: 'PATCH', body }),
  deleteAccount: (password) => call('/auth/me', { method: 'DELETE', body: { password }, timeout: 30000 }),
  getPlan: (known) => call(`/plan${Number.isInteger(known) ? `?known=${known}` : ''}`),
  putPlan: (version, data) => call('/plan', { method: 'PUT', body: { version, data }, timeout: 30000 }),
  family: () => call('/plan/family'),
  createInvite: (body) => call('/plan/invites', { method: 'POST', body }),
  cancelInvite: (code) => call(`/plan/invites/${encodeURIComponent(code)}`, { method: 'DELETE' }),
  previewInvite: (code) => call(`/invites/${encodeURIComponent(code)}`),
}

/**
 * Is the account service there, and is someone signed in?
 * Only a clean "not signed in" answer from the account API counts as available. Anything else (no such route,
 * accounts switched off, no HTTPS yet, server down) means the app keeps using its in-browser demo accounts.
 */
export async function probe() {
  try {
    return { available: true, session: await cloud.me(4000) }
  } catch (error) {
    if (error instanceof CloudError && error.status === 401 && typeof error.data?.detail === 'string') return { available: true, session: null }
    return { available: false, session: null }
  }
}
