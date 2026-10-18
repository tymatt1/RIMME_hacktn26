import assert from 'node:assert/strict'
import test from 'node:test'
import {
  cleanPhone, createInviteCode, formatInviteCode, handoffContacts, inviteCodeFromSearch, inviteLink, inviteMailto, isGroupMember, isInviteCode,
  isValidEmail, isValidPhone, normalizeContact, normalizeContacts, normalizeInviteCode, resolveFamily,
} from './family.js'

test('phone numbers accept common formats and reject nonsense', () => {
  for (const phone of ['', '(615) 555-0142', '615.555.0142', '+1 615 555 0142', '615-555-0142 x12']) assert.equal(isValidPhone(phone), true, phone)
  for (const phone of ['12', 'call me', '555-CALL-NOW', '1234567890123456789012']) assert.equal(isValidPhone(phone), false, phone)
  assert.equal(cleanPhone('  (615)   555-0142 '), '(615) 555-0142')
})

test('emails need one @ and a dot, with no spaces or lists', () => {
  assert.equal(isValidEmail(' Maria@Example.com '), true)
  for (const email of ['', 'maria', 'maria@', 'maria@example', 'a b@example.com', 'a@example.com, b@example.com']) assert.equal(isValidEmail(email), false, email)
})

test('invite codes are 8 characters without look-alike characters', () => {
  const codes = Array.from({ length: 300 }, () => createInviteCode())
  assert.ok(codes.every((code) => /^[A-HJKMNP-Z2-9]{8}$/.test(code)))
  assert.ok(new Set(codes).size > 290)
})

test('invite codes skip biased random bytes', () => {
  const calls = []
  const code = createInviteCode((count) => { calls.push(count); return Uint8Array.from({ length: count }, (_, index) => (index < 4 ? 255 : index)) })
  assert.equal(code.length, 8)
  assert.ok(!code.includes('undefined'))
})

test('invite codes normalize, format and validate', () => {
  assert.equal(normalizeInviteCode(' abcd-2345 '), 'ABCD2345')
  assert.equal(formatInviteCode('abcd2345'), 'ABCD-2345')
  assert.equal(formatInviteCode('abc'), 'ABC')
  assert.equal(isInviteCode('abcd-2345'), true)
  for (const code of ['', 'ABCD-234', 'ABCD-2340', 'ABCD-23I5', 'ABCD-23O5', null]) assert.equal(isInviteCode(code), false, String(code))
})

test('invite links carry only the code', () => {
  assert.equal(inviteLink('https://carebridge.example/app', 'abcd-2345'), 'https://carebridge.example/app?join=ABCD2345')
  assert.equal(inviteCodeFromSearch('?join=abcd-2345'), 'ABCD2345')
  assert.equal(inviteCodeFromSearch('?join=nope'), '')
  assert.equal(inviteCodeFromSearch(''), '')
  assert.equal(inviteCodeFromSearch('?x=1'), '')
})

test('invite email draft names the inviter, includes the link and code, and leaves the resident out', () => {
  const link = inviteLink('https://carebridge.example/', 'ABCD2345')
  const url = inviteMailto({ email: 'Daniel@Example.com', ownerName: 'Maria', link, code: 'ABCD2345' })
  assert.match(url, /^mailto:daniel%40example\.com\?subject=/)
  const body = decodeURIComponent(url.split('body=')[1])
  assert.match(body, /Maria invited you/)
  assert.ok(body.includes(link))
  assert.ok(body.includes('ABCD-2345'))
})

test('normalizeContact trims, drops invalid details and defaults to shareable', () => {
  assert.deepEqual(normalizeContact({ relationship: ' Son ', phone: '(615) 555-0142', email: 'DAN@example.com' }), { relationship: 'Son', phone: '(615) 555-0142', email: 'dan@example.com', shareWithHome: true, inviteCode: '' })
  const bad = normalizeContact({ phone: 'abc', email: 'nope', shareWithHome: false, inviteCode: 'bad' })
  assert.equal(bad.phone, '')
  assert.equal(bad.email, '')
  assert.equal(bad.shareWithHome, false)
  assert.equal(bad.inviteCode, '')
  assert.deepEqual(normalizeContact(null), normalizeContact({}))
})

test('stored contacts only keep people on the family list', () => {
  const result = normalizeContacts({ Daniel: { phone: '(615) 555-0178' }, Stranger: { phone: '(615) 555-0100' }, Family: { phone: '(615) 555-0199' } }, ['Maria', 'Daniel', 'Family'])
  assert.deepEqual(Object.keys(result), ['Daniel'])
  assert.deepEqual(normalizeContacts(['x'], ['Daniel']), {})
  assert.deepEqual(normalizeContacts(null, ['Daniel']), {})
})

test('a member named like an object property cannot read inherited values', () => {
  const [person] = resolveFamily({ members: ['__proto__'], contacts: {}, intake: {} })
  assert.equal(person.phone, '')
  assert.equal(person.status, 'listed')
})

const intake = { caregiverName: 'Maria' }
const contacts = {
  Maria: { phone: '(615) 555-0100' },
  Daniel: { relationship: 'Son', phone: '(615) 555-0178', email: 'daniel@example.com' },
  Pat: { phone: '(615) 555-0122', shareWithHome: false },
}

test('the first member is the main contact and Family is a group with no contact details', () => {
  const family = resolveFamily({ members: ['Maria', 'Family', 'Daniel'], contacts: { ...contacts, Family: { phone: '(615) 555-0111' } }, intake })
  assert.deepEqual(family.map((person) => person.role), ['main', 'group', 'member'])
  assert.equal(family[1].phone, '')
  assert.equal(isGroupMember('family'), true)
  assert.equal(isGroupMember('Daniel'), false)
})

test('people with an account keep their own details, and manual details fill gaps', () => {
  const linked = { Daniel: { name: 'Daniel', email: 'daniel.c@example.com', phone: '(615) 555-0199', relationship: 'Grandchild' }, Maria: { email: 'maria@example.com' } }
  const family = resolveFamily({ members: ['Maria', 'Daniel'], contacts, linked, status: { Daniel: 'joined' }, intake })
  assert.equal(family[1].phone, '(615) 555-0199')
  assert.equal(family[1].email, 'daniel.c@example.com')
  assert.equal(family[1].relationship, 'Grandchild')
  assert.equal(family[1].hasAccount, true)
  assert.equal(family[1].status, 'joined')
  assert.equal(family[0].phone, '(615) 555-0100')
  assert.equal(family[0].email, 'maria@example.com')
})

test('status comes from the invites on this device', () => {
  const family = resolveFamily({ members: ['Maria', 'Daniel', 'Pat'], contacts, linked: { Maria: { email: 'maria@example.com' } }, status: { Daniel: 'invited' }, intake })
  assert.deepEqual(family.map((person) => person.status), ['joined', 'invited', 'listed'])
  assert.equal(resolveFamily({ members: ['Maria'], intake })[0].status, 'listed')
})

test('the placeholder name Me prints as the caregiver name', () => {
  const [main] = resolveFamily({ members: ['Me', 'Family'], intake: { caregiverName: 'Maria' } })
  assert.equal(main.name, 'Me')
  assert.equal(main.displayName, 'Maria')
})

test('the nursing-home list has the main contact and shared people who can be reached', () => {
  const family = resolveFamily({ members: ['Maria', 'Daniel', 'Pat', 'Lee'], contacts, intake })
  assert.deepEqual(handoffContacts(family).map((person) => person.name), ['Maria', 'Daniel'])
  assert.deepEqual(handoffContacts(resolveFamily({ members: ['Maria'], intake })).map((person) => person.name), ['Maria'])
})
