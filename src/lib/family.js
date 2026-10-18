// Family members, their contact details, and invite codes. Pure functions, no browser APIs, so they can be tested directly.
// Members stay a list of names (task assignments use the name). Contact details live in a map keyed by that name.

export const relationshipOptions = ['Spouse or partner', 'Son', 'Daughter', 'Sibling', 'Grandchild', 'Friend', 'Other relative', 'Other']

// "Family" is a placeholder for tasks anyone in the family can do. It is not a person, so it has no contact details.
export const isGroupMember = (name) => String(name ?? '').trim().toLowerCase() === 'family'

const text = (value, max) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '')

export const cleanPhone = (value) => text(value, 30)
export const isValidPhone = (value) => {
  const phone = cleanPhone(value)
  if (!phone) return true
  const digits = phone.replace(/\D/g, '').length
  return /^[0-9+().\-\sxX#]+$/.test(phone) && digits >= 7 && digits <= 20
}

export const cleanEmail = (value) => text(value, 120).toLowerCase()
export const isValidEmail = (value) => /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(cleanEmail(value))

export const cleanRelationship = (value) => text(value, 40)

// ---- Invite codes: 8 characters from an alphabet without look-alikes (0/O, 1/I/L), shown as XXXX-XXXX ----
const inviteAlphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const limit = 256 - (256 % inviteAlphabet.length)

function randomBytes(count) {
  const bytes = new Uint8Array(count)
  globalThis.crypto.getRandomValues(bytes)
  return bytes
}

export function createInviteCode(random = randomBytes) {
  let code = ''
  while (code.length < 8) {
    for (const byte of random(16)) {
      if (byte < limit && code.length < 8) code += inviteAlphabet[byte % inviteAlphabet.length]
    }
  }
  return code
}

export const normalizeInviteCode = (value) => String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
export const isInviteCode = (value) => /^[A-HJKMNP-Z2-9]{8}$/.test(normalizeInviteCode(value))
export const formatInviteCode = (value) => {
  const code = normalizeInviteCode(value)
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code
}

// The link carries only the random code. It never carries a name, a plan, or any health information.
export const inviteLink = (base, code) => `${base}?join=${normalizeInviteCode(code)}`
export function inviteCodeFromSearch(search) {
  try {
    const code = new globalThis.URLSearchParams(search).get('join')
    return isInviteCode(code) ? normalizeInviteCode(code) : ''
  } catch { return '' }
}

export function inviteMailto({ email, ownerName, link, code }) {
  const who = text(ownerName, 50) || 'A family member'
  const subject = `${who} invited you to a Carebridge plan`
  const body = [
    `${who} invited you to help plan a move to a nursing home on Carebridge.`,
    '',
    `Open this link: ${link}`,
    `Or choose “Join a family plan” and enter the code ${formatInviteCode(code)}.`,
    '',
    'This is a demo. Use made-up contact details.',
  ].join('\n')
  return `mailto:${encodeURIComponent(cleanEmail(email))}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

// ---- Stored contact details ----
export function normalizeContact(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return {
    relationship: cleanRelationship(source.relationship),
    phone: isValidPhone(source.phone) ? cleanPhone(source.phone) : '',
    email: isValidEmail(source.email) ? cleanEmail(source.email) : '',
    shareWithHome: source.shareWithHome !== false,
    inviteCode: isInviteCode(source.inviteCode) ? normalizeInviteCode(source.inviteCode) : '',
  }
}

// Keeps contact details only for people who are on the family list.
export function normalizeContacts(value, memberNames = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const entries = Object.entries(value).filter(([name]) => memberNames.includes(name) && !isGroupMember(name))
  return Object.fromEntries(entries.map(([name, contact]) => [name, normalizeContact(contact)]))
}

export const contactFor = (contacts, name) => (contacts && Object.hasOwn(contacts, name) ? normalizeContact(contacts[name]) : normalizeContact({}))

/**
 * The family list as the app and the PDFs use it.
 * - `linked[name]` holds what a member typed when they registered ({ name, email, phone, relationship }).
 * - `status[name]` is 'invited' or 'joined', taken from the invites on this device.
 * People with an account keep their own details there, and those win. Details entered by hand are for people without one.
 */
export function resolveFamily({ members = [], contacts = {}, linked = {}, status = {}, intake = {} } = {}) {
  const pick = (map, name) => (map && Object.hasOwn(map, name) ? map[name] : undefined)
  return members.map((name, index) => {
    const group = isGroupMember(name)
    const contact = contactFor(contacts, name)
    const account = pick(linked, name) || {}
    const caregiver = text(intake?.caregiverName, 50)
    const displayName = name === 'Me' && caregiver ? caregiver : name
    return {
      name,
      displayName,
      role: group ? 'group' : index === 0 ? 'main' : 'member',
      relationship: group ? '' : cleanRelationship(account.relationship) || contact.relationship,
      phone: group ? '' : (isValidPhone(account.phone) ? cleanPhone(account.phone) : '') || contact.phone,
      email: group ? '' : (isValidEmail(account.email) ? cleanEmail(account.email) : '') || contact.email,
      hasAccount: !group && isValidEmail(account.email),
      shareWithHome: contact.shareWithHome,
      inviteCode: contact.inviteCode,
      status: group ? 'listed' : pick(status, name) || (index === 0 && isValidEmail(account.email) ? 'joined' : 'listed'),
    }
  })
}

// Who goes on the sheet given to a nursing home: people the family agreed to share, who have a way to be reached.
// The main contact is always listed, with blanks to fill in by hand if needed.
export const handoffContacts = (family = []) =>
  family.filter((person) => person.role === 'main' || (person.role === 'member' && person.shareWithHome && (person.phone || person.email)))

export const statusLabels = { joined: 'On Carebridge', invited: 'Invited, not joined yet', listed: 'Listed for the forms' }
