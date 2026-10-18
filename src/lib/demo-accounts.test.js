import test from 'node:test'
import assert from 'node:assert/strict'
import { accountDraftKey, createDemoAccount, loadDemoSession, openPreviousDemoPlan, resumePage, signInDemoAccount, signOutDemoAccount } from './demo-accounts.js'
import { loadDraft, saveDraft } from './demo-model.js'

function withStorage(run) {
  const values = new Map()
  globalThis.window = { localStorage: { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) } }
  try { run(values) } finally { delete globalThis.window }
}

test('a different signup starts blank onboarding and cannot inherit an existing plan', () => withStorage(() => {
  const first = createDemoAccount('first@example.com', 'First')
  saveDraft({ ...first.draft, page: 'plan', onboardingComplete: true, intake: { ...first.draft.intake, personName: 'First relative' }, shortlist: ['home-a'], completed: ['packing'], profile: { notes: 'First profile' }, guidance: { key: 'first', planId: 42, explainer: 'First guidance', tasks: [] } }, accountDraftKey(first.accountId))
  const second = createDemoAccount('second@example.com', 'Second')
  assert.equal(resumePage(second.draft), 'situation')
  assert.equal(second.draft.onboardingComplete, false)
  assert.equal(second.draft.intake.caregiverName, 'Second')
  assert.equal(second.draft.intake.personName, '')
  assert.deepEqual(second.draft.shortlist, [])
  assert.deepEqual(second.draft.completed, [])
  assert.equal(second.draft.profile.notes, '')
  assert.equal(second.draft.guidance, null)
  assert.deepEqual(second.draft.members, ['Second', 'Family'])
  const restored = signInDemoAccount(' FIRST@EXAMPLE.COM ')
  assert.equal(restored.draft.intake.personName, 'First relative')
  assert.equal(restored.draft.profile.notes, 'First profile')
  assert.equal(restored.draft.guidance.planId, 42)
  assert.equal(resumePage(restored.draft), 'plan')
}))

test('sign out survives refresh and incomplete onboarding resumes at the saved step', () => withStorage(() => {
  const session = createDemoAccount('resume@example.com', 'Resume')
  saveDraft({ ...session.draft, page: 'support', intake: { ...session.draft.intake, personName: 'Saved relative' } }, accountDraftKey(session.accountId))
  assert.equal(loadDemoSession().accountId, session.accountId)
  signOutDemoAccount()
  assert.deepEqual(loadDemoSession(), { accountId: null, draft: null })
  const restored = signInDemoAccount(session.accountId)
  assert.equal(resumePage(restored.draft), 'support')
  assert.equal(restored.draft.intake.personName, 'Saved relative')
  assert.equal(loadDemoSession().draft.intake.personName, 'Saved relative')
}))

test('duplicate signup and unknown email never open or overwrite another account', () => withStorage(() => {
  const session = createDemoAccount('existing@example.com', 'Existing')
  assert.throws(() => createDemoAccount(' EXISTING@example.com ', 'Replacement'), /already exists/)
  assert.throws(() => signInDemoAccount('unknown@example.com'), /No demo plan/)
  assert.equal(loadDemoSession().accountId, session.accountId)
  assert.equal(loadDemoSession().draft.intake.caregiverName, 'Existing')
}))

test('the previous unlinked plan remains separate from new accounts', () => withStorage(() => {
  saveDraft({ page: 'overview', onboardingComplete: true, intake: { personName: 'Legacy relative' } })
  assert.equal(loadDemoSession().draft.intake.personName, 'Legacy relative')
  createDemoAccount('new@example.com', 'New')
  assert.equal(loadDemoSession().draft.intake.personName, '')
  assert.equal(loadDraft().intake.personName, 'Legacy relative')
  signOutDemoAccount()
  assert.equal(loadDemoSession().draft, null)
  openPreviousDemoPlan()
  assert.equal(loadDemoSession().draft.intake.personName, 'Legacy relative')
}))

test('visiting home keeps the active account and restores its plan after sign-out and sign-in', () => withStorage(() => {
  const session = createDemoAccount('home@example.com', 'Maria')
  const homeDraft = { ...session.draft, page: 'welcome', returnPage: 'plan', onboardingComplete: true, intake: { ...session.draft.intake, personName: 'Arthur' }, completed: ['packing'] }
  saveDraft(homeDraft, accountDraftKey(session.accountId))
  const restored = loadDemoSession()
  assert.equal(restored.accountId, session.accountId)
  assert.equal(restored.draft.page, 'welcome')
  assert.equal(resumePage(restored.draft), 'plan')
  assert.equal(restored.draft.intake.personName, 'Arthur')
  assert.deepEqual(restored.draft.completed, ['packing'])
  signOutDemoAccount()
  assert.deepEqual(loadDemoSession(), { accountId: null, draft: null })
  assert.deepEqual(loadDraft(accountDraftKey(session.accountId)).completed, ['packing'])
  assert.equal(resumePage(signInDemoAccount(session.accountId).draft), 'plan')
  const other = createDemoAccount('other@example.com', 'Other')
  assert.equal(resumePage(other.draft), 'situation')
  assert.deepEqual(other.draft.completed, [])
}))

test('home remembers incomplete onboarding and validates stale return pages', () => withStorage(() => {
  const session = createDemoAccount('setup@example.com', 'Setup')
  saveDraft({ ...session.draft, page: 'welcome', returnPage: 'support' }, accountDraftKey(session.accountId))
  assert.equal(resumePage(loadDemoSession().draft), 'support')
  saveDraft({ ...session.draft, page: 'welcome', returnPage: 'invalid' }, accountDraftKey(session.accountId))
  assert.equal(resumePage(loadDemoSession().draft), 'situation')
  assert.equal(resumePage({ page: 'welcome', returnPage: 'support', onboardingComplete: true }), 'overview')
  assert.equal(resumePage({ page: 'welcome', returnPage: 'plan', onboardingComplete: false }), 'situation')
}))
