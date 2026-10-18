import test from 'node:test'
import assert from 'node:assert/strict'
import { createPlanDocument, planPdfFilename } from './plan-document.js'
import { sampleIntake, facilities } from '../data/prototype.js'

test('PDF definition includes recorded plan state and distinguishes fictional facilities', () => {
  const data = { intake: { ...sampleIntake, personName: 'Renée Morgan', monthlyBudget: 7500 }, checklist: [{ label: 'Review discharge paperwork', detail: 'Ask the care team.', completed: true, assignedTo: 'Maria' }], checkedPackingItems: ['packing-0-0'], facilities: [facilities[0]], planningFacility: facilities[0], family: ['Maria'], knowMe: { notes: 'Enjoys jazz.', interests: ['Music'] } }
  const snapshot = JSON.stringify(data)
  const doc = createPlanDocument(data, { generatedAt: new Date('2026-10-17T18:00:00Z') })
  const content = JSON.stringify(doc.content)
  assert.equal(doc.pageSize, 'LETTER')
  assert.match(doc.info.title, /Renée Morgan/)
  for (const expected of ['Nursing Home Transition Plan', 'Review discharge paperwork', 'Complete', 'Maria', '$7,500', 'Enjoys jazz.', 'Know Me profile', 'Fictional example', 'Renée Morgan', 'October 17, 2026']) {
    assert.ok((content + JSON.stringify(doc.header())).includes(expected), expected)
  }
  assert.equal(content.split(facilities[0].name).length - 1, 2, 'Selected home appears in overview and only once in detailed list')
  assert.equal(JSON.stringify(data), snapshot)
  assert.ok(JSON.stringify(doc.footer(2, 6)).includes('Page 2 of 6'))
})

test('Know Me download is separate, with no task or family budget information', () => {
  const doc = createPlanDocument({ intake: { personName: 'Arthur', monthlyBudget: 9000 }, checklist: [{ label: 'Private financial task' }], knowMe: { notes: 'Favorite music is jazz.', aiDraft: { communication: 'Please face me when speaking.' } } }, { kind: 'know-me' })
  const content = JSON.stringify(doc.content)
  assert.match(content, /Favorite music is jazz/)
  assert.match(content, /Please face me when speaking/)
  assert.match(content, /AI-generated text/)
  assert.doesNotMatch(content, /Private financial task|9000|Monthly family budget/)
})

test('empty fields are explicit and filenames are safe', () => {
  const content = JSON.stringify(createPlanDocument().content)
  assert.match(content, /Not recorded/)
  assert.match(content, /No checklist tasks recorded/)
  assert.doesNotMatch(content, /undefined/)
  assert.equal(planPdfFilename('Renée / Morgan'), 'carebridge-renee-morgan-transition-plan.pdf')
  assert.equal(planPdfFilename('', 'know-me'), 'carebridge-know-me-profile.pdf')
})
