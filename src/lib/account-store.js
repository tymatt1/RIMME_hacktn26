// One interface for accounts, whether they live on the Carebridge server ("cloud") or only in this browser ("local" demo).
// The app asks startup() which one is available. If the account service isn't reachable, the in-browser demo still works.
import { cloud, probe } from './cloud.js'
import { acceptInvite, cancelInvite, createDemoAccount, createInvite, familyLinks, findInvite, freshAccountPlan, loadDemoSession, signInDemoAccount, signOutDemoAccount, updateAccountContact } from './demo-accounts.js'
import { hydrateDraft, loadDraft } from './demo-model.js'
import { syncable } from './plan-merge.js'

const emptyLinks = (isOwner = false) => ({ owner: null, byMember: {}, you: null, isOwner })

// Which screen a device was on is remembered on that device only (just a page name, never plan details).
const pageKey = 'carebridge-last-page-v1'
export function rememberPage(planId, page) {
  try { window.localStorage.setItem(pageKey, JSON.stringify({ planId, page })) } catch { /* Not remembering the screen is harmless. */ }
}
function recallPage(planId) {
  try {
    const saved = JSON.parse(window.localStorage.getItem(pageKey) || 'null')
    return saved && saved.planId === planId && typeof saved.page === 'string' ? saved.page : ''
  } catch { return '' }
}

// ---- In this browser only (the original demo). Not shared between devices. ----
export const localStore = {
  mode: 'local',
  signUp: async ({ email, name, phone }) => createDemoAccount(email, name, phone),
  signIn: async ({ email }) => signInDemoAccount(email),
  join: async (values) => acceptInvite(values.code, values),
  signOut: async () => signOutDemoAccount(),
  links: async (planId, accountId) => familyLinks(planId, accountId),
  invite: async (planId, args) => { createInvite(planId, args) },
  cancelInvite: async (planId, code) => { cancelInvite(planId, code) },
  updateContact: async (email, details) => updateAccountContact(email, details),
  deleteAccount: async () => { throw new Error('Demo accounts only live in this browser. Clear this site’s data to remove them.') },
  preview: async (code) => {
    const found = findInvite(code)
    return found ? { ...found, status: found.status === 'pending' ? 'pending' : 'used' } : null
  },
}

// ---- On the Carebridge server: encrypted, and the same plan on every device. ----
// A session carries everything the app needs plus `sync`, the server's copy that syncing starts from.
function sessionFrom(payload, planResponse, fallbackName) {
  const empty = !planResponse.data || Object.keys(planResponse.data).length === 0 // a plan that was just created for this person
  const recalled = recallPage(payload.plan.id)
  const draft = empty ? freshAccountPlan(fallbackName || payload.user.name || 'You') : hydrateDraft({ ...planResponse.data, page: recalled || 'welcome' })
  const landing = !empty && recalled && draft.page === recalled ? recalled : draft.onboardingComplete ? 'overview' : 'situation'
  return {
    accountId: payload.user.email,
    planId: payload.plan.id,
    accountName: payload.user.name,
    draft: { ...draft, page: landing, returnPage: null },
    sync: { version: planResponse.version, data: empty ? {} : planResponse.data },
    role: payload.plan.role,
  }
}

export const cloudStore = {
  mode: 'cloud',
  async signUp({ email, name, phone, password }) {
    const plan = syncable(freshAccountPlan(name.trim()))
    const payload = await cloud.signup({ email: email.trim(), name: name.trim(), phone, password, plan })
    return { ...sessionFrom(payload, { version: payload.plan.version, data: plan }, name.trim()), draft: freshAccountPlan(name.trim()) }
  },
  async signIn({ email, password }) {
    const payload = await cloud.login({ email, password })
    return sessionFrom(payload, await cloud.getPlan())
  },
  async join({ code, name, email, phone, relationship, password }) {
    const payload = await cloud.join({ code, name, email, phone, relationship, password })
    return sessionFrom(payload, await cloud.getPlan())
  },
  // If the server can't be reached the sign-in cookie is still valid, so this says so (the app tells the person) instead of
  // pretending they are signed out on a shared computer. "Already signed out" (401) counts as success.
  async signOut() {
    try { await cloud.logout() } catch (error) { if (error?.status !== 401) throw error }
  },
  links: async () => cloud.family(),
  invite: async (_planId, args) => cloud.createInvite(args),
  cancelInvite: async (_planId, code) => { await cloud.cancelInvite(code) },
  updateContact: async (_email, { phone, relationship }) => { await cloud.updateProfile({ phone, relationship }) },
  deleteAccount: async (password) => { await cloud.deleteAccount(password) },
  async preview(code) {
    try { return await cloud.previewInvite(code) } catch (error) { if (error.status === 404) return null; throw error }
  },
}

/**
 * Works out what the app starts with.
 *   { store, session }   ready to go. `session.accountId` is null when nobody is signed in.
 *   { error }            the person is signed in on the server but their plan couldn't be loaded. Showing a blank plan
 *                        here could overwrite the real one later, so the app offers a retry instead.
 */
export async function startup() {
  const { available, session } = await probe()
  if (!available) return { store: localStore, session: loadDemoSession() }
  if (!session) return { store: cloudStore, session: { accountId: null, draft: loadDraft() } }
  try {
    return { store: cloudStore, session: sessionFrom(session, await cloud.getPlan()) }
  } catch (error) {
    return { error }
  }
}

export { emptyLinks }
