import { blankIntake, loadDraft, saveDraft } from './demo-model.js'

const accountsKey = 'carebridge-demo-accounts-v1'
export const accountDraftKey = (email) => `carebridge-demo-plan:${encodeURIComponent(email)}`
const normalizeEmail = (email) => String(email || '').trim().toLowerCase()
const emptyRegistry = () => ({ active: null, accounts: [] })
function registry() {
  const value = JSON.parse(window.localStorage.getItem(accountsKey) || 'null')
  if (!value || !Array.isArray(value.accounts)) return emptyRegistry()
  return { active: typeof value.active === 'string' ? value.active : null, accounts: value.accounts.filter((account) => account && typeof account.email === 'string') }
}
export function freshAccountPlan(name) {
  return { page: 'situation', onboardingComplete: false, intake: { ...blankIntake(), caregiverName: name }, shortlist: [], completed: [], profile: { morning: '', interests: [], comforts: [], communication: [], notes: '', aiDraft: null }, members: [name, 'Family'], assignees: {}, chosenFacility: '', guidance: null }
}
export function loadDemoSession() {
  try {
    if (!window.localStorage.getItem(accountsKey)) return { accountId: null, draft: loadDraft() }
    const saved = registry()
    if (saved.active === '__previous_plan__') return { accountId: null, draft: loadDraft() }
    const account = saved.accounts.find((item) => item.email === saved.active)
    return account ? { accountId: account.email, draft: loadDraft(accountDraftKey(account.email)) || freshAccountPlan(account.name || 'You') } : { accountId: null, draft: null }
  } catch { return { accountId: null, draft: null } }
}
export function createDemoAccount(email, name) {
  const id = normalizeEmail(email)
  if (!id || !name.trim()) throw new Error('Enter your name and a demo email to create a plan.')
  const saved = registry()
  if (saved.accounts.some((account) => account.email === id)) throw new Error('A demo plan already exists for this email. Choose Sign in to open it.')
  const draft = freshAccountPlan(name.trim())
  if (!saveDraft(draft, accountDraftKey(id))) throw new Error('Your browser could not save this plan. Allow browser storage and try again.')
  window.localStorage.setItem(accountsKey, JSON.stringify({ active: id, accounts: [...saved.accounts, { email: id, name: name.trim() }] }))
  return { accountId: id, draft }
}
export function signInDemoAccount(email) {
  const id = normalizeEmail(email)
  const saved = registry()
  const account = saved.accounts.find((item) => item.email === id)
  if (!account) throw new Error('No demo plan was found for this email on this device. Choose Create an account to start a new plan.')
  const draft = loadDraft(accountDraftKey(id)) || freshAccountPlan(account.name || 'You')
  window.localStorage.setItem(accountsKey, JSON.stringify({ ...saved, active: id }))
  return { accountId: id, draft }
}
export function signOutDemoAccount() {
  const saved = registry()
  window.localStorage.setItem(accountsKey, JSON.stringify({ ...saved, active: null }))
}
export function resumePage(draft) {
  const page = draft.page === 'welcome' ? draft.returnPage : draft.page
  if (draft.onboardingComplete) return ['overview', 'facilities', 'plan'].includes(page) ? page : 'overview'
  return ['situation', 'support', 'priorities', 'knowme'].includes(page) ? page : 'situation'
}

export function openPreviousDemoPlan() {
  const saved = registry()
  const draft = loadDraft()
  if (!draft) throw new Error('No previous plan was found on this device.')
  window.localStorage.setItem(accountsKey, JSON.stringify({ ...saved, active: '__previous_plan__' }))
  return draft
}
