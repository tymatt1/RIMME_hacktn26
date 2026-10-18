import assert from 'node:assert/strict'
import test from 'node:test'
import { createChecklistDocument, createHandoffDocument, createQuestionsDocument, packetItems } from './packet-documents.js'
import { packetListing, packetUnavailableReason } from './packet-meta.js'
import { resolveFamily } from './family.js'

const intake = {
  personName: 'Margaret Ellis', caregiverName: 'Dana Ellis', relationship: 'Parent', ageRange: '80-89', language: 'English',
  currentSetting: 'Hospital', hospitalStatus: 'Inpatient', mobility: 'Walker', transferHelp: 'One person helps',
  dailySupport: { bathing: 'Some help', eating: 'Independent' }, memorySupport: 'Mild forgetfulness',
  budget: 7500, priorityWeights: { 'Close to family': 90, Staffing: 40, 'Inspection information': 50, 'Quality of care': 50, 'Costs & coverage': 80 },
}
const members = ['Dana Ellis', 'Family', 'Sam Ellis', 'Pat Ellis', 'Lee Ellis']
const contacts = {
  'Dana Ellis': { relationship: 'Daughter', phone: '(615) 555-0100', email: 'dana@example.com' },
  'Sam Ellis': { relationship: 'Son', phone: '(615) 555-0111' },
  'Pat Ellis': { relationship: 'Sibling', phone: '(615) 555-0122', shareWithHome: false },
}
const home = (id, extra = {}) => ({ id, name: `Home ${id}`, questions: [`Is there a waitlist at Home ${id}?`], ...extra })
const data = {
  intake,
  facilities: [home(1), home(2, { isFictional: true })],
  family: members,
  familyContacts: resolveFamily({ members, contacts, intake }),
  checklist: [
    { id: 'a', label: 'Call the insurer', detail: 'Ask about coverage', completed: true, assignedTo: 'Dana' },
    { id: 'b', label: 'Tour two homes', completed: false, assignedTo: 'Unassigned' },
  ],
  checkedPackingItems: ['packing-0-0'],
  knowMe: { morning: 'Early riser', interests: ['Gardening'], comforts: [], communication: [], notes: 'Likes tea at 3pm', aiDraft: null },
  careTeamQuestions: ['What rehab can she get?'],
  careExplainer: '',
}
const flat = (doc) => JSON.stringify(doc.content)

test('handoff document records family answers and leaves blanks for medical details', () => {
  const text = flat(createHandoffDocument(data))
  assert.match(text, /Resident Information for the Care Team/)
  assert.match(text, /Margaret Ellis/)
  assert.match(text, /Dana Ellis/)
  assert.match(text, /Likes tea at 3pm/)
  assert.match(text, /Primary doctor and phone/)
  assert.match(text, /Medications and allergies/)
  assert.match(text, /not a medical record/)
})

test('handoff document words the relationship from the contact’s side', () => {
  assert.match(flat(createHandoffDocument(data)), /The resident is the family contact’s parent/)
  assert.match(flat(createHandoffDocument({ ...data, intake: { ...intake, relationship: 'Myself' } })), /The family contact is the resident/)
})

test('handoff document lists the main contact and shared family with their contact details', () => {
  const text = flat(createHandoffDocument(data))
  assert.match(text, /Family contacts/)
  assert.match(text, /Dana Ellis/)
  assert.match(text, /\(615\) 555-0100/)
  assert.match(text, /dana@example\.com/)
  assert.match(text, /Sam Ellis/)
  assert.match(text, /\(615\) 555-0111/)
})

test('handoff document leaves out people marked private, people with no contact details, and the Family placeholder', () => {
  const text = flat(createHandoffDocument(data))
  assert.doesNotMatch(text, /Pat Ellis|555-0122/)
  assert.doesNotMatch(text, /Lee Ellis/)
  assert.doesNotMatch(text, /"Family"/)
})

test('handoff document keeps blank lines for the nursing home to add contacts by hand', () => {
  const doc = createHandoffDocument({ ...data, familyContacts: resolveFamily({ members: ['Dana Ellis', 'Family'], intake }) })
  const tables = []
  const walk = (node) => { if (Array.isArray(node)) node.forEach(walk); else if (node && typeof node === 'object') { if (node.table?.body?.[0]?.[0]?.text === 'Name') tables.push(node.table); Object.values(node).forEach(walk) } }
  walk(doc.content)
  assert.equal(tables.length, 1)
  assert.equal(tables[0].body.length, 4)
})

test('handoff document falls back to the caregiver name when there is no family list', () => {
  const text = flat(createHandoffDocument({ intake }))
  assert.match(text, /Dana Ellis/)
  assert.match(text, /main contact/)
})

test('handoff document does not share the budget or the family priorities', () => {
  const text = flat(createHandoffDocument(data))
  assert.doesNotMatch(text, /7500|7,500/)
  assert.doesNotMatch(text, /Close to family|Costs & coverage|Quality of care/)
})

test('handoff document names the facility it is prepared for', () => {
  const text = flat(createHandoffDocument({ ...data, planningFacility: home(1) }))
  assert.match(text, /Prepared for: Home 1/)
})

test('handoff document copes with empty data', () => {
  const doc = createHandoffDocument({})
  assert.ok(doc.content.length > 0)
  assert.match(flat(doc), /Resident name not recorded/)
})

test('checklist fills boxes for finished tasks and packed items only', () => {
  const doc = createChecklistDocument(data)
  const text = flat(doc)
  assert.match(text, /Call the insurer/)
  assert.match(text, /Tour two homes/)
  const boxes = []
  const walk = (node) => { if (Array.isArray(node)) node.forEach(walk); else if (node && typeof node === 'object') { if (Array.isArray(node.canvas)) boxes.push(...node.canvas.filter((shape) => shape.type === 'rect')); Object.values(node).forEach(walk) } }
  walk(doc.content)
  assert.ok(boxes.length > 2)
  assert.equal(boxes.filter((box) => box.color).length, 2)
})

test('checklist handles no tasks', () => {
  assert.match(flat(createChecklistDocument({ intake })), /No checklist tasks recorded/)
})

test('questions document lists care-team, generic and per-home questions', () => {
  const text = flat(createQuestionsDocument(data))
  assert.match(text, /What rehab can she get\?/)
  assert.match(text, /Is there a waitlist at Home 1\?/)
  assert.match(text, /Fictional example/)
  assert.match(text, /When you call a nursing home/)
})

test('questions document labels the AI explainer as a draft only when present', () => {
  assert.doesNotMatch(flat(createQuestionsDocument(data)), /AI-generated draft/)
  assert.match(flat(createQuestionsDocument({ ...data, careExplainer: 'Short-term rehab can help.' })), /AI-generated draft/)
})

test('comparison is unavailable with fewer than two saved homes', () => {
  assert.match(packetUnavailableReason('comparison', { facilities: [home(1)] }), /at least two/)
  assert.equal(packetUnavailableReason('comparison', { facilities: [home(1), home(2)] }), '')
  assert.equal(packetUnavailableReason('plan', {}), '')
  const listing = packetListing({ facilities: [] })
  assert.equal(listing.find((file) => file.id === 'comparison').available, false)
  assert.ok(listing.filter((file) => file.id !== 'comparison').every((file) => file.available))
})

test('packet items keep a fixed order and unique, safe filenames', () => {
  const items = packetItems(data)
  assert.deepEqual(items.map((item) => item.id), ['plan', 'handoff', 'know-me', 'checklist', 'questions', 'comparison'])
  assert.equal(new Set(items.map((item) => item.filename)).size, items.length)
  for (const item of items) {
    assert.match(item.filename, /\.pdf$/)
    assert.doesNotMatch(item.filename, /[\s/\\]/)
    assert.equal(typeof item.create, 'function')
  }
})

test('every available packet item builds a pdfmake document', () => {
  for (const item of packetItems(data).filter((entry) => entry.available)) {
    const doc = item.create()
    assert.ok(Array.isArray(doc.content) && doc.content.length > 0, item.id)
    assert.equal(doc.pageSize, 'LETTER', item.id)
  }
})

test('packet items mark comparison unavailable with one saved home', () => {
  const items = packetItems({ ...data, facilities: [home(1)] })
  assert.equal(items.find((item) => item.id === 'comparison').available, false)
  assert.equal(items.filter((item) => item.available).length, 5)
})
