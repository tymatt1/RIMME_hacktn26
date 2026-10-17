import assert from 'node:assert/strict'
import test from 'node:test'
import { blankIntake, visibleFacilities } from './demo-model.js'
import { sampleIntake } from '../data/prototype.js'
import { facilityFromApi, guidanceFromResponse, intakeKey, severityLabel, titleCase, toBackendIntake, toKnowMeBody } from './api-model.js'

test('the example family maps to a hospital intake without inventing answers', () => {
  const body = toBackendIntake({ ...blankIntake(), ...sampleIntake, coverage: ['Medicaid'] })
  assert.equal(body.from_hospital, true)
  assert.equal(body.hospital_status, 'unknown')
  assert.equal(body.medicaid_possible, true)
  assert.equal(body.memory, 'mild')
  assert.equal(body.medications, 'many_or_complex')
  assert.equal(body.bathing, 'some_help')
  assert.equal(body.eating, 'independent')
  assert.deepEqual(body.safety, [])
  assert.equal(body.language, 'en')
})

test('blank intake and wheelchair/observation answers map safely', () => {
  const blank = toBackendIntake(blankIntake())
  assert.equal(blank.from_hospital, false)
  assert.equal(blank.persona_name, null)
  assert.equal(blank.mobility, 'walks_alone')
  const body = toBackendIntake({ ...blankIntake(), currentSetting: 'Hospital', hospitalStatus: 'Observation', mobility: ['Wheelchair'], memorySupport: 'Frequent supervision needed', language: 'Spanish' })
  assert.equal(body.hospital_status, 'observation')
  assert.equal(body.mobility, 'wheelchair')
  assert.equal(body.memory, 'dementia')
  assert.equal(body.language, 'es')
  assert.equal(intakeKey(blank), intakeKey(toBackendIntake(blankIntake())))
})

test('server tasks keep stable ids across regenerated plans', () => {
  const first = guidanceFromResponse('k', { plan_id: 3, care_explainer: 'x', doctor_questions: ['q'], tasks: [{ id: 11, title: 'Ask: inpatient or observation status?', detail: 'd', category: 'coverage', priority: 1 }] })
  const second = guidanceFromResponse('k2', { plan_id: 4, tasks: [{ id: 99, title: 'Ask: inpatient or observation status?', detail: 'd', category: 'coverage', priority: 1 }] })
  assert.equal(first.tasks[0].id, second.tasks[0].id)
  assert.match(first.tasks[0].id, /^[a-z][a-z0-9-]*$/i)
  assert.equal(first.planId, 3)
})

test('CMS facilities become cards without a composite score and with honest nulls', () => {
  const card = facilityFromApi({ ccn: '445159', name: 'BETHANY CENTER FOR REHABILITATION AND HEALING LLC', address: '421 OCALA DRIVE', city: 'NASHVILLE', county: 'Davidson', zip: '37211', phone: '6158344214', ownership_type: 'For profit - Limited Liability company', certified_beds: 180, avg_residents: 150.2, overall_rating: 1, health_inspection_rating: 2, staffing_rating: 1, qm_rating: 4, total_nurse_hours_per_resident_day: '3.49', rn_hours_per_resident_day: null, total_nursing_turnover_pct: '61.2', special_focus_status: null, abuse_icon: 'N', num_fines: 0, total_fines_usd: null, distance_miles: 7.1, citations_total: 8, latest_survey: '2025-04-11', serious_citations: 1 })
  assert.equal(card.name, 'Bethany Center For Rehabilitation And Healing LLC')
  assert.equal(card.isFictional, false)
  assert.equal(card.distance, 7.1)
  assert.equal(card.rnHours, null)
  assert.equal(card.inspectionTone, 'attention')
  assert.match(card.questions[0], /severity G or higher/)
  assert.equal('score' in card, false)
  const unrated = facilityFromApi({ ccn: '1', name: 'NEW HOME', city: 'X', county: 'Y', zip: '1', overall_rating: null, staffing_rating: null, distance_miles: null })
  assert.equal(unrated.overall, null)
  assert.equal(unrated.staffingHours, null)
  assert.equal(unrated.inspectionTone, 'neutral')
})

test('live facilities filter by data tags, sort without nulls breaking, and respect distance', () => {
  const list = [
    facilityFromApi({ ccn: 'a', name: 'ALPHA', city: 'N', county: 'D', zip: '1', overall_rating: 5, staffing_rating: 4, total_nurse_hours_per_resident_day: '4.2', distance_miles: 9 }),
    facilityFromApi({ ccn: 'b', name: 'BRAVO', city: 'N', county: 'D', zip: '1', overall_rating: 2, staffing_rating: null, total_nurse_hours_per_resident_day: null, distance_miles: 3 }),
    facilityFromApi({ ccn: 'c', name: 'CHARLIE', city: 'N', county: 'D', zip: '1', overall_rating: null, distance_miles: null }),
  ]
  assert.deepEqual(visibleFacilities(list, 25, 'All facilities').map((f) => f.id), ['b', 'a'])
  assert.deepEqual(visibleFacilities(list, 25, 'Overall 4+ stars').map((f) => f.id), ['a'])
  assert.deepEqual(visibleFacilities(list, Infinity, 'All facilities', 'name').map((f) => f.id), ['a', 'b', 'c'])
  assert.deepEqual(visibleFacilities(list, 25, 'All facilities', 'staffing').map((f) => f.id), ['a', 'b'])
})

test('names, severity letters, and Know Me bodies are formatted for families', () => {
  assert.equal(titleCase('ADAMSPLACE, LLC'), 'Adamsplace, LLC')
  assert.equal(severityLabel('K'), 'K · immediate jeopardy')
  assert.equal(severityLabel('G'), 'G · actual harm')
  const body = toKnowMeBody({ morning: 'Slow start', interests: ['Music'], comforts: [], communication: ['Give me time to respond'], notes: 'Loves jazz' }, 'Arthur')
  assert.deepEqual(JSON.parse(JSON.stringify(body)), { preferred_name: 'Arthur', background: 'Loves jazz', daily_routine: 'Slow start', likes: 'Music', communication: 'Give me time to respond' })
})
