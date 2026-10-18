import test from 'node:test'
import assert from 'node:assert/strict'
import { accountDraftKey, acceptInvite, cancelInvite, createDemoAccount, createInvite, familyLinks, findInvite, loadDemoSession, openPreviousDemoPlan, resumePage, signInDemoAccount, signOutDemoAccount, updateAccountContact } from './demo-accounts.js'
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

test('home resumes the Know Me intake step', () => {
  assert.equal(resumePage({ page: 'welcome', returnPage: 'knowme', onboardingComplete: false }), 'knowme')
  assert.equal(resumePage({ page: 'knowme', onboardingComplete: false }), 'knowme')
  assert.equal(resumePage({ page: 'knowme', onboardingComplete: true }), 'overview')
})

test('an account can register with a phone number, and a bad number is refused', () => withStorage((values) => {
  assert.throws(() => createDemoAccount('bad@example.com', 'Bad', '12'), /at least 7 digits/)
  assert.throws(() => createDemoAccount('not-an-email', 'Bad'), /email address/)
  assert.equal(values.size, 0)
  const session = createDemoAccount('maria@example.com', 'Maria', '(615) 555-0142')
  assert.equal(session.planId, 'maria@example.com')
  assert.equal(session.accountName, 'Maria')
  assert.equal(familyLinks('maria@example.com', 'maria@example.com').owner.phone, '(615) 555-0142')
  assert.equal(familyLinks('maria@example.com', 'maria@example.com').isOwner, true)
}))

function ownerWithInvite(options = {}) {
  const owner = createDemoAccount('maria@example.com', 'Maria', '(615) 555-0142')
  saveDraft({ ...owner.draft, page: 'plan', onboardingComplete: true, intake: { ...owner.draft.intake, personName: 'Arthur' }, members: ['Maria', 'Family', 'Daniel'] }, accountDraftKey(owner.planId))
  const invite = createInvite(owner.planId, { memberName: 'Daniel', relationship: 'Son', email: 'daniel@example.com', ...options })
  return { owner, invite }
}

test('inviting a family member creates one open invite per person', () => withStorage(() => {
  const { owner, invite } = ownerWithInvite()
  assert.match(invite.code, /^[A-HJKMNP-Z2-9]{8}$/)
  assert.equal(invite.status, 'pending')
  assert.equal(createInvite(owner.planId, { memberName: 'Daniel' }).code, invite.code)
  assert.equal(familyLinks(owner.planId, owner.accountId).byMember.Daniel.status, 'invited')
  assert.throws(() => createInvite(owner.planId, { memberName: '  ' }), /Choose who/)
}))

test('an invite shows only the inviter’s name before someone registers', () => withStorage(() => {
  const { invite } = ownerWithInvite()
  const found = findInvite(invite.code.toLowerCase())
  assert.equal(found.ownerName, 'Maria')
  assert.equal(found.memberName, 'Daniel')
  assert.ok(!JSON.stringify(found).includes('Arthur'))
  assert.equal(findInvite('ZZZZZZZZ'), null)
  assert.equal(findInvite('nope'), null)
}))

test('joining with an invite links a new account to the inviter’s plan', () => withStorage(() => {
  const { owner, invite } = ownerWithInvite()
  const joined = acceptInvite(invite.code, { name: 'Daniel', email: ' Daniel.C@Example.com ', phone: '(615) 555-0199', relationship: 'Son' })
  assert.equal(joined.accountId, 'daniel.c@example.com')
  assert.equal(joined.planId, owner.planId)
  assert.equal(joined.draft.intake.personName, 'Arthur')
  assert.deepEqual(joined.draft.members, ['Maria', 'Family', 'Daniel'])
  assert.equal(loadDemoSession().accountId, 'daniel.c@example.com')
  assert.equal(loadDemoSession().draft.intake.personName, 'Arthur')
  const links = familyLinks(owner.planId, joined.accountId)
  assert.equal(links.byMember.Daniel.status, 'joined')
  assert.equal(links.byMember.Daniel.account.phone, '(615) 555-0199')
  assert.equal(links.byMember.Daniel.account.email, 'daniel.c@example.com')
  assert.equal(links.you, 'Daniel')
  assert.equal(links.isOwner, false)
  assert.equal(findInvite(invite.code).status, 'accepted')
}))

test('linked accounts read and write the same plan', () => withStorage(() => {
  const { owner, invite } = ownerWithInvite()
  const joined = acceptInvite(invite.code, { name: 'Daniel', email: 'daniel@example.com' })
  saveDraft({ ...joined.draft, completed: ['gather-id'], members: ['Maria', 'Family', 'Daniel', 'Lee'] }, accountDraftKey(joined.planId))
  signOutDemoAccount()
  const back = signInDemoAccount('maria@example.com')
  assert.deepEqual(back.draft.completed, ['gather-id'])
  assert.deepEqual(back.draft.members, ['Maria', 'Family', 'Daniel', 'Lee'])
  assert.equal(signInDemoAccount('daniel@example.com').planId, owner.planId)
  assert.equal(loadDraft(accountDraftKey('daniel@example.com')), null)
}))

test('an invite can be used once and cannot take over an existing account', () => withStorage(() => {
  const { invite } = ownerWithInvite()
  assert.throws(() => acceptInvite('nope', { name: 'Daniel', email: 'd@example.com' }), /8-character/)
  assert.throws(() => acceptInvite('ZZZZZZZZ', { name: 'Daniel', email: 'd@example.com' }), /not found on this device/)
  assert.throws(() => acceptInvite(invite.code, { name: '', email: 'd@example.com' }), /first name/)
  assert.throws(() => acceptInvite(invite.code, { name: 'Daniel', email: 'nope' }), /email address/)
  assert.throws(() => acceptInvite(invite.code, { name: 'Daniel', email: 'd@example.com', phone: '1' }), /at least 7 digits/)
  assert.throws(() => acceptInvite(invite.code, { name: 'Daniel', email: 'MARIA@example.com' }), /already exists/)
  assert.equal(findInvite(invite.code).status, 'pending')
  acceptInvite(invite.code, { name: 'Daniel', email: 'd@example.com' })
  assert.throws(() => acceptInvite(invite.code, { name: 'Dan', email: 'dan2@example.com' }), /already been used/)
}))

test('a pending invite can be canceled but a used one cannot', () => withStorage(() => {
  const { owner, invite } = ownerWithInvite()
  cancelInvite(owner.planId, invite.code)
  assert.equal(findInvite(invite.code), null)
  assert.deepEqual(familyLinks(owner.planId, owner.accountId).byMember, {})
  const again = createInvite(owner.planId, { memberName: 'Daniel' })
  acceptInvite(again.code, { name: 'Daniel', email: 'daniel@example.com' })
  cancelInvite(owner.planId, again.code)
  assert.equal(findInvite(again.code).status, 'accepted')
}))

test('invites and linked accounts survive sign out and opening the previous plan', () => withStorage(() => {
  const { owner, invite } = ownerWithInvite()
  signOutDemoAccount()
  assert.equal(findInvite(invite.code).status, 'pending')
  saveDraft({ page: 'overview', onboardingComplete: true, intake: { personName: 'Legacy' } })
  openPreviousDemoPlan()
  assert.equal(findInvite(invite.code).status, 'pending')
  assert.equal(familyLinks(owner.planId, null).byMember.Daniel.status, 'invited')
}))

test('a family member’s own phone and relationship are kept on their account', () => withStorage(() => {
  const { owner, invite } = ownerWithInvite()
  acceptInvite(invite.code, { name: 'Daniel', email: 'daniel@example.com', phone: '(615) 555-0199', relationship: 'Son' })
  assert.throws(() => updateAccountContact('daniel@example.com', { phone: 'abc' }), /at least 7 digits/)
  updateAccountContact('daniel@example.com', { phone: '(615) 555-0100', relationship: 'Grandchild' })
  assert.deepEqual(familyLinks(owner.planId, null).byMember.Daniel.account, { name: 'Daniel', email: 'daniel@example.com', phone: '(615) 555-0100', relationship: 'Grandchild' })
  updateAccountContact('daniel@example.com', { phone: '', relationship: '' })
  assert.equal(familyLinks(owner.planId, null).byMember.Daniel.account.phone, '')
  updateAccountContact('nobody@example.com', { phone: '(615) 555-0100' })
}))

test('storage failures are reported instead of half-creating an invite', () => {
  const values = new Map()
  let failWrites = false
  globalThis.window = { localStorage: { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { if (failWrites) throw new Error('quota'); values.set(key, value) } } }
  try {
    const owner = createDemoAccount('maria@example.com', 'Maria')
    failWrites = true
    assert.throws(() => createInvite(owner.planId, { memberName: 'Daniel' }), /could not save/)
    failWrites = false
    assert.deepEqual(familyLinks(owner.planId, owner.accountId).byMember, {})
  } finally { delete globalThis.window }
})
