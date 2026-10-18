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
