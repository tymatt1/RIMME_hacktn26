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

test('CMS facilities become cards with honest nulls', () => {
  const card = facilityFromApi({ ccn: '445159', name: 'BETHANY CENTER FOR REHABILITATION AND HEALING LLC', address: '421 OCALA DRIVE', city: 'NASHVILLE', county: 'Davidson', zip: '37211', phone: '6158344214', ownership_type: 'For profit - Limited Liability company', certified_beds: 180, avg_residents: 150.2, overall_rating: 1, health_inspection_rating: 2, staffing_rating: 1, qm_rating: 4, total_nurse_hours_per_resident_day: '3.49', rn_hours_per_resident_day: null, total_nursing_turnover_pct: '61.2', special_focus_status: null, abuse_icon: 'N', num_fines: 0, total_fines_usd: null, distance_miles: 7.1, citations_total: 8, latest_survey: '2025-04-11', serious_citations: 1 })
  assert.equal(card.name, 'Bethany Center For Rehabilitation And Healing LLC')
  assert.equal(card.isFictional, false)
  assert.equal(card.distance, 7.1)
  assert.equal(card.rnHours, null)
  assert.equal(card.inspectionTone, 'attention')
  assert.match(card.questions[0], /severity G or higher/)
  assert.equal(card.score, null)
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

import { matchScore, scoreWeights, distanceScore } from './api-model.js'
import { visibleFacilities as visible } from './demo-model.js'

const scored = (score, parts, distance = 5) => ({ id: String(score), name: `n${score}`, score, scoreParts: parts, distance, staffingHours: 4, filterTags: [] })
const parts = { inspections: 100, staffing: 40, quality: 60, safety: 100 }

test('match score combines parts with distance and renormalizes weights', () => {
  const { match, matchParts } = matchScore(scored(80, parts, 0))
  assert.equal(matchParts.length, 5)
  assert.equal(matchParts.reduce((sum, p) => sum + p.weight, 0) >= 99, true)
  assert.ok(match > 60 && match < 90)
})

test('missing parts are left out, and unscored homes stay unscored', () => {
  const some = matchScore(scored(70, { inspections: 50, staffing: null, quality: 50, safety: 50 }, null))
  assert.equal(some.match, 50)
  assert.equal(some.matchParts.length, 3)
  assert.equal(matchScore({ score: null, scoreParts: {}, distance: 2 }).match, null)
})

test('priority sliders pull the score toward what the family cares about most', () => {
  const home = scored(80, { inspections: 40, staffing: 100, quality: 70, safety: 70 }, 20)
  const staffingHigh = matchScore(home, scoreWeights({ 'Staffing': 100, 'Close to family': 0, 'Inspection information': 20, 'Quality of care': 20 })).match
  const distanceHigh = matchScore(home, scoreWeights({ 'Staffing': 0, 'Close to family': 100, 'Inspection information': 20, 'Quality of care': 20 })).match
  assert.ok(staffingHigh > distanceHigh)
  assert.equal(distanceScore(0), 100)
  assert.equal(distanceScore(80), 0)
})

test('weights come only from the sliders, move smoothly, and a slider at 0 removes that part', () => {
  const base = { 'Close to family': 50, 'Staffing': 50, 'Inspection information': 50, 'Quality of care': 50 }
  const low = scoreWeights({ ...base, Staffing: 25 })
  const high = scoreWeights({ ...base, Staffing: 75 })
  assert.ok(high.staffing > scoreWeights(base).staffing && scoreWeights(base).staffing > low.staffing)
  const off = scoreWeights({ ...base, 'Close to family': 0 })
  assert.equal(off.distance, 0)
  const near = scored(80, parts, 1), far = scored(80, parts, 45)
  assert.equal(matchScore(near, off, { travelMiles: 50 }).match, matchScore(far, off, { travelMiles: 50 }).match)
  assert.ok(matchScore(near, scoreWeights(base), { travelMiles: 50 }).match > matchScore(far, scoreWeights(base), { travelMiles: 50 }).match)
  assert.equal(scoreWeights({ ...base, 'Costs & coverage': 100 }).staffing, scoreWeights(base).staffing)
  const inspection = scoreWeights({ ...base, 'Inspection information': 100 })
  assert.ok(Math.abs(inspection.inspections / inspection.safety - 1.5) < 1e-9)
})

test('all sliders at 0, or none that fit the available data, fall back to counting parts equally', () => {
  const zero = { 'Close to family': 0, 'Staffing': 0, 'Inspection information': 0, 'Quality of care': 0 }
  const weights = scoreWeights(zero)
  assert.ok(Object.values(weights).every((weight) => weight > 0))
  const onlyDistance = { ...zero, 'Close to family': 100 }
  const noDistance = { ...scored(80, parts, null) }
  const result = matchScore(noDistance, scoreWeights(onlyDistance), { travelMiles: 25 })
  assert.ok(Number.isInteger(result.match))
  const shares = weightShares(scoreWeights(onlyDistance), { distance: false })
  assert.equal(shares.reduce((sum, share) => sum + share.pct, 0), 100)
})

test('score reasons say when sliders are untouched or switched off', () => {
  const equal = scoreReasons(null, { 'Close to family': 50, 'Staffing': 50, 'Inspection information': 50, 'Quality of care': 50, 'Costs & coverage': 50 })
  assert.match(equal[0], /same level/)
  const set = scoreReasons(null, { 'Close to family': 0, 'Staffing': 90, 'Inspection information': 60, 'Quality of care': 30, 'Costs & coverage': 50 })
  assert.match(set[0], /staffing, inspection information, quality of care/)
  assert.match(set[1], /close to family/)
})

test('sorting by score puts the highest match first and unscored last', () => {
  const list = [{ ...scored(1, parts), match: 40 }, { ...scored(2, parts), match: null }, { ...scored(3, parts), match: 90 }]
  assert.deepEqual(visible(list, Infinity, 'All facilities', 'score').map((f) => f.match), [90, 40, null])
})

import { needsProfile } from './api-model.js'

test('a person who needs more care raises the staffing bar and its weight', () => {
  const light = needsProfile({ dailySupport: { bathing: 'No help' }, memorySupport: 'Not sure' })
  const heavy = needsProfile({ dailySupport: { bathing: 'Substantial help', eating: 'Substantial help' }, mobility: ['Wheelchair'], memorySupport: 'Frequent supervision needed' })
  assert.ok(heavy.targetHours > light.targetHours)
  assert.ok(scoreWeights({}, heavy).staffing > scoreWeights({}, light).staffing)
  const home = { score: 70, scoreParts: { inspections: 75, staffing: 60, quality: 75, safety: 100 }, distance: 5, staffingHours: 3.8, rnHours: 0.5, turnover: 45, staffRating: 3 }
  const lightFit = matchScore(home, scoreWeights({}, light), { needs: light, travelMiles: 25 })
  const heavyFit = matchScore(home, scoreWeights({}, heavy), { needs: heavy, travelMiles: 25 })
  const staffing = (r) => r.matchParts.find((p) => p.key === 'staffing').value
  assert.ok(staffing(heavyFit) < staffing(lightFit))
  assert.ok(heavyFit.matchReasons[0].includes('substantial help'))
})

test('distance is judged against the family’s own travel range', () => {
  assert.equal(distanceScore(10, 10), 0)
  assert.equal(distanceScore(10, 50), 80)
  assert.equal(distanceScore(null, 25), null)
})

import { scoreReasons, weightShares } from './api-model.js'

test('weight shares add up to 100 and drop distance when the place is unknown', () => {
  const withDistance = weightShares(scoreWeights({ 'Staffing': 90, 'Inspection information': 60, 'Close to family': 30, 'Quality of care': 10 }))
  assert.equal(withDistance.reduce((sum, s) => sum + s.pct, 0), 100)
  assert.equal(withDistance[0].key, 'staffing')
  const noDistance = weightShares(scoreWeights({}), { distance: false })
  assert.equal(noDistance.some((s) => s.key === 'distance'), false)
  assert.equal(noDistance.reduce((sum, s) => sum + s.pct, 0), 100)
})

test('equal sliders show equal shares, with inspections and safety grouped under their one slider', () => {
  const equal = { 'Close to family': 50, 'Staffing': 50, 'Inspection information': 50, 'Quality of care': 50, 'Costs & coverage': 50 }
  const shares = weightShares(scoreWeights(equal))
  assert.deepEqual(shares.map((share) => share.pct), [25, 25, 25, 25])
  assert.equal(shares.some((share) => share.key === 'safety'), false)
  const inspection = weightShares(scoreWeights({ ...equal, 'Inspection information': 100 })).find((share) => share.key === 'inspections')
  assert.equal(inspection.pct, 40)
  assert.deepEqual(weightShares(scoreWeights(equal), { distance: false }).map((share) => share.pct), [34, 33, 33])
})
