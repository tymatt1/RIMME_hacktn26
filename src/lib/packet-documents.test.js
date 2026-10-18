import assert from 'node:assert/strict'
import test from 'node:test'
import { createChecklistDocument, createHandoffDocument, createQuestionsDocument, packetItems } from './packet-documents.js'
import { packetListing, packetUnavailableReason } from './packet-meta.js'

const intake = {
  personName: 'Margaret Ellis', caregiverName: 'Dana Ellis', relationship: 'Parent', ageRange: '80-89', language: 'English',
  currentSetting: 'Hospital', hospitalStatus: 'Inpatient', mobility: 'Walker', transferHelp: 'One person helps',
  dailySupport: { bathing: 'Some help', eating: 'Independent' }, memorySupport: 'Mild forgetfulness',
  budget: 7500, priorityWeights: { 'Close to family': 90, Staffing: 40, 'Inspection information': 50, 'Quality of care': 50, 'Costs & coverage': 80 },
}
const home = (id, extra = {}) => ({ id, name: `Home ${id}`, questions: [`Is there a waitlist at Home ${id}?`], ...extra })
const data = {
  intake,
  facilities: [home(1), home(2, { isFictional: true })],
  family: ['Me', 'Family', 'Dana Ellis', 'Sam Ellis'],
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

test('handoff document words the relationship from the contact’s side and skips placeholder family names', () => {
  const text = flat(createHandoffDocument(data))
  assert.match(text, /The resident is the family contact’s parent/)
  assert.match(text, /Sam Ellis/)
  assert.doesNotMatch(text, /"Me"|"Family"|Dana Ellis, /)
  assert.match(flat(createHandoffDocument({ ...data, family: ['Me', 'Family'] })), /Other family helping \(names and phone\)/)
  assert.match(flat(createHandoffDocument({ ...data, intake: { ...intake, relationship: 'Myself' } })), /The family contact is the resident/)
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
