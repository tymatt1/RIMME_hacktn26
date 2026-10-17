// Thin client for the platform's server-side API. No secrets live in the browser:
// the API URL is public configuration, and OCI credentials stay on the server.
//
// VITE_API_URL is optional. By default requests go to the same origin under /api, which the
// Vite dev server (see vite.config.js) or the production web server proxies to the backend.
const BASE = (import.meta.env?.VITE_API_URL ?? '/api').replace(/\/$/, '')

async function request(path, { method = 'GET', body, timeout = 30000 } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(`${BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`API ${response.status}`)
    return await response.json()
  } finally {
    clearTimeout(timer)
  }
}

export const api = {
  // Facilities near a Tennessee city or ZIP, with distance in miles. Never ranked by quality.
  listFacilities: (near) => request(`/facilities?limit=400${near ? `&near=${encodeURIComponent(near)}` : ''}`),
  getFacility: (ccn) => request(`/facilities/${encodeURIComponent(ccn)}`),
  // Answer grounded only in that facility's CMS records (AI draft, cites tags and dates).
  askFacility: (ccn, question) => request(`/facilities/${encodeURIComponent(ccn)}/ask`, { method: 'POST', body: { question }, timeout: 60000 }),
  // Stage 1: care explainer + doctor questions (AI drafts) and the rule-based checklist.
  createIntake: (body) => request('/intake', { method: 'POST', body, timeout: 60000 }),
  updateTask: (id, patch) => request(`/tasks/${id}`, { method: 'PATCH', body: patch }),
  draftKnowMe: (planId, body) => request(`/plans/${planId}/know-me`, { method: 'POST', body, timeout: 60000 }),
}
