import { blankIntake, loadDraft, saveDraft } from './demo-model.js'
import { cleanEmail, cleanPhone, cleanRelationship, createInviteCode, isInviteCode, isValidEmail, isValidPhone, normalizeInviteCode } from './family.js'

const accountsKey = 'carebridge-demo-accounts-v1'
export const accountDraftKey = (email) => `carebridge-demo-plan:${encodeURIComponent(email)}`
const normalizeEmail = (email) => String(email || '').trim().toLowerCase()
const emptyRegistry = () => ({ active: null, accounts: [], invites: [] })
const str = (value, max) => (typeof value === 'string' ? value.slice(0, max) : '')

// The registry holds demo accounts and the invites between them. Linked accounts open the plan of the account that invited them.
function registry() {
  const value = JSON.parse(window.localStorage.getItem(accountsKey) || 'null')
  if (!value || !Array.isArray(value.accounts)) return emptyRegistry()
  return {
    active: typeof value.active === 'string' ? value.active : null,
    accounts: value.accounts.filter((account) => account && typeof account.email === 'string'),
    invites: (Array.isArray(value.invites) ? value.invites : []).filter((invite) => invite && isInviteCode(invite.code) && typeof invite.planId === 'string' && typeof invite.memberName === 'string'),
  }
}
function writeRegistry(next) {
  try { window.localStorage.setItem(accountsKey, JSON.stringify(next)) } catch { throw new Error('Your browser could not save this. Allow browser storage and try again.') }
}
const planIdOf = (account) => (typeof account.planId === 'string' && account.planId ? account.planId : account.email)
const sessionFor = (account, draft) => ({ accountId: account.email, planId: planIdOf(account), accountName: str(account.name, 50), draft })

export function freshAccountPlan(name) {
  return { page: 'situation', onboardingComplete: false, intake: { ...blankIntake(), caregiverName: name }, shortlist: [], completed: [], profile: { morning: '', interests: [], comforts: [], communication: [], notes: '', aiDraft: null }, members: [name, 'Family'], contacts: {}, assignees: {}, chosenFacility: '', guidance: null }
}
export function loadDemoSession() {
  try {
    if (!window.localStorage.getItem(accountsKey)) return { accountId: null, draft: loadDraft() }
    const saved = registry()
    if (saved.active === '__previous_plan__') return { accountId: null, draft: loadDraft() }
    const account = saved.accounts.find((item) => item.email === saved.active)
    if (!account) return { accountId: null, draft: null }
    const owner = saved.accounts.find((item) => item.email === planIdOf(account)) || account
    return sessionFor(account, loadDraft(accountDraftKey(planIdOf(account))) || freshAccountPlan(owner.name || 'You'))
  } catch { return { accountId: null, draft: null } }
}
export function createDemoAccount(email, name, phone = '') {
  const id = normalizeEmail(email)
  if (!id || !name.trim()) throw new Error('Enter your name and a demo email to create a plan.')
  if (!isValidEmail(id)) throw new Error('Enter an email address like maria@example.com.')
  if (!isValidPhone(phone)) throw new Error('Enter a phone number with at least 7 digits, or leave it blank.')
  const saved = registry()
  if (saved.accounts.some((account) => account.email === id)) throw new Error('A demo plan already exists for this email. Choose Sign in to open it.')
  const draft = freshAccountPlan(name.trim())
  if (!saveDraft(draft, accountDraftKey(id))) throw new Error('Your browser could not save this plan. Allow browser storage and try again.')
  const account = { email: id, name: name.trim(), ...(cleanPhone(phone) ? { phone: cleanPhone(phone) } : {}) }
  writeRegistry({ ...saved, active: id, accounts: [...saved.accounts, account] })
  return sessionFor(account, draft)
}
export function signInDemoAccount(email) {
  const id = normalizeEmail(email)
  const saved = registry()
  const account = saved.accounts.find((item) => item.email === id)
  if (!account) throw new Error('No demo plan was found for this email on this device. Choose Create an account to start a new plan, or Join a family plan if you have an invite code.')
  const owner = saved.accounts.find((item) => item.email === planIdOf(account)) || account
  const draft = loadDraft(accountDraftKey(planIdOf(account))) || freshAccountPlan(owner.name || 'You')
  writeRegistry({ ...saved, active: id })
  return sessionFor(account, draft)
}
export function signOutDemoAccount() {
  const saved = registry()
  window.localStorage.setItem(accountsKey, JSON.stringify({ ...saved, active: null }))
}

// ---- Family links and invites (demo: stored in this browser, so they work on this device only) ----

/** Everything the Family tab needs about accounts and invites for one plan. */
export function familyLinks(planId, accountId = null) {
  try {
    const saved = registry()
    const accountFor = (email) => saved.accounts.find((account) => account.email === email)
    const info = (account) => (account ? { name: str(account.name, 50), email: str(account.email, 120), phone: str(account.phone, 30), relationship: cleanRelationship(account.relationship) } : null)
    const byMember = {}
    for (const invite of saved.invites.filter((item) => item.planId === planId)) {
      const account = invite.status === 'accepted' ? accountFor(invite.acceptedBy) : null
      byMember[invite.memberName] = { status: account ? 'joined' : 'invited', code: invite.code, email: str(invite.email, 120), account: info(account) }
    }
    const you = accountId && accountId !== planId ? Object.keys(byMember).find((name) => byMember[name].account?.email === accountId) || null : null
    return { owner: info(accountFor(planId)), byMember, you, isOwner: Boolean(accountId) && accountId === planId }
  } catch { return { owner: null, byMember: {}, you: null, isOwner: false } }
}

/** A family member's own phone and relationship live on their account, so changes made on the Family tab are saved there. */
export function updateAccountContact(email, { phone = '', relationship = '' }) {
  if (!isValidPhone(phone)) throw new Error('Enter a phone number with at least 7 digits, or leave it blank.')
  const saved = registry()
  const id = normalizeEmail(email)
  if (!saved.accounts.some((account) => account.email === id)) return
  writeRegistry({
    ...saved,
    accounts: saved.accounts.map((account) => {
      if (account.email !== id) return account
      const next = { ...account }
      delete next.phone
      delete next.relationship
      return { ...next, ...(cleanPhone(phone) ? { phone: cleanPhone(phone) } : {}), ...(cleanRelationship(relationship) ? { relationship: cleanRelationship(relationship) } : {}) }
    }),
  })
}

/** Creates (or returns the open) invite for a family member of this plan. */
export function createInvite(planId, { memberName, relationship = '', email = '' }) {
  const name = String(memberName || '').trim()
  if (!name) throw new Error('Choose who to invite.')
  const saved = registry()
  const open = saved.invites.find((invite) => invite.planId === planId && invite.memberName === name && invite.status === 'pending')
  if (open) return open
  let code = createInviteCode()
  while (saved.invites.some((invite) => invite.code === code)) code = createInviteCode()
  const invite = { code, planId, memberName: name, relationship: cleanRelationship(relationship), email: isValidEmail(email) ? cleanEmail(email) : '', createdAt: new Date().toISOString(), status: 'pending' }
  writeRegistry({ ...saved, invites: [...saved.invites, invite] })
  return invite
}

export function cancelInvite(planId, code) {
  const saved = registry()
  const target = normalizeInviteCode(code)
  writeRegistry({ ...saved, invites: saved.invites.filter((invite) => !(invite.planId === planId && invite.code === target && invite.status === 'pending')) })
}

/** What the join screen may show about an invite before the person registers: only the inviter's first name. */
export function findInvite(code) {
  try {
    if (!isInviteCode(code)) return null
    const saved = registry()
    const invite = saved.invites.find((item) => item.code === normalizeInviteCode(code))
    if (!invite) return null
    const owner = saved.accounts.find((account) => account.email === invite.planId)
    return { code: invite.code, status: invite.status, memberName: invite.memberName, relationship: invite.relationship, email: invite.email, ownerName: str(owner?.name, 50) }
  } catch { return null }
}

/** Registers a family member's account against the plan they were invited to. */
export function acceptInvite(code, { name = '', email = '', phone = '', relationship = '' } = {}) {
  if (!isInviteCode(code)) throw new Error('Enter the 8-character code from your invite.')
  const saved = registry()
  const invite = saved.invites.find((item) => item.code === normalizeInviteCode(code))
  if (!invite) throw new Error('This invite was not found on this device. This demo keeps plans in the browser, so an invite only works on the device that created it.')
  if (invite.status !== 'pending') throw new Error('This invite has already been used. Choose Sign in to open the plan.')
  const id = normalizeEmail(email)
  if (!String(name).trim()) throw new Error('Enter your first name.')
  if (!isValidEmail(id)) throw new Error('Enter an email address like daniel@example.com.')
  if (!isValidPhone(phone)) throw new Error('Enter a phone number with at least 7 digits, or leave it blank.')
  if (saved.accounts.some((account) => account.email === id)) throw new Error('A demo account already exists for this email. Choose Sign in to open it.')
  if (!saved.accounts.some((account) => account.email === invite.planId)) throw new Error('The plan for this invite is no longer on this device.')
  const account = { email: id, name: String(name).trim().slice(0, 50), planId: invite.planId, ...(cleanPhone(phone) ? { phone: cleanPhone(phone) } : {}), ...(cleanRelationship(relationship) ? { relationship: cleanRelationship(relationship) } : {}) }
  const owner = saved.accounts.find((item) => item.email === invite.planId)
  writeRegistry({
    active: id,
    accounts: [...saved.accounts, account],
    invites: saved.invites.map((item) => (item.code === invite.code ? { ...item, status: 'accepted', acceptedBy: id } : item)),
  })
  return sessionFor(account, loadDraft(accountDraftKey(invite.planId)) || freshAccountPlan(owner?.name || 'You'))
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
