import test from 'node:test'
import assert from 'node:assert/strict'
import { formatPhone } from './format.js'
import { comparisonRows, comparisonScale } from './facility-comparison.js'
import { createComparisonDocument, comparisonPdfFilename, comparisonPdfValue } from './comparison-document.js'

test('phone numbers use standard dashes, retain extensions, and leave unknown formats intact', () => {
  assert.equal(formatPhone('6158902020'), '615-890-2020')
  assert.equal(formatPhone('(615) 890-2020'), '615-890-2020')
  assert.equal(formatPhone('+1 6158902020 ext 123'), '+1 615-890-2020 ext. 123')
  assert.equal(formatPhone(6158902020), '615-890-2020')
  assert.equal(formatPhone(null), '')
  assert.equal(formatPhone('Not listed'), 'Not listed')
  assert.equal(formatPhone('+44 20 7946 0000'), '+44 20 7946 0000')
})

test('comparison facts distinguish missing data, reported zeroes, and fictional examples', () => {
  const facts = (home) => Object.fromEntries(comparisonRows.map(([id, , get]) => [id, get(home)]))
  const live = facts({ match: 81, distance: 0, staffingHours: 4.15, phone: '6158902020', seriousCitations: 0, overall: 5 })
  assert.equal(live.match, '81 / 100')
  assert.equal(live.distance, '0 miles')
  assert.equal(live.serious, '0')
  assert.equal(live.hours, '4.15')
  assert.equal(live.phone, '615-890-2020')
  const missing = facts({ match: null, distance: null, staffingHours: null, seriousCitations: null })
  assert.equal(missing.hours, 'Not reported')
  assert.equal(missing.overall, 'Not rated')
  assert.equal(missing.phone, 'Not listed')
  const sample = facts({ isFictional: true, staffingHours: 4, distance: 2 })
  assert.equal(sample.source, 'Fictional sample')
  assert.equal(sample.match, 'Not scored (sample)')
  assert.equal(sample.hours, '4.00 (sample)')
})

test('comparison PDF groups all homes into landscape pages with repeated labels and safe names', () => {
  const homes = Array.from({ length: 8 }, (_, i) => ({ id: String(i), name: `Saved Home ${i}`, match: 80 - i, staffingHours: 4, seriousCitations: 0, phone: '6158902020' }))
  const before = JSON.stringify(homes)
  const doc = createComparisonDocument(homes, 'Renée', { generatedAt: new Date('2026-10-18T18:00:00Z') })
  const tables = doc.content.filter((node) => node.table)
  assert.equal(doc.pageOrientation, 'landscape')
  assert.equal(tables.length, 3)
  assert.deepEqual(tables.map((node) => node.table.widths.length), [4, 4, 3])
  for (const home of homes) assert.equal(JSON.stringify(doc.content).split(home.name).length - 1, 1)
  for (const table of tables) assert.equal(table.table.body[1][0].text, 'Record source')
  assert.match(JSON.stringify(doc.header()), /carebridge|svg/)
  assert.match(JSON.stringify(doc.footer(2, 3)), /Page 2 of 3/)
  assert.match(JSON.stringify(doc.content), /615-890-2020/)
  assert.equal(JSON.stringify(homes), before)
  assert.equal(comparisonPdfFilename('Renée / Morgan'), 'carebridge-renee-morgan-nursing-home-comparison.pdf')
  assert.match(JSON.stringify(createComparisonDocument().content), /No saved nursing homes/)
})

test('comparison scales use bounded ratings and scores, not missing values or unbounded counts', () => {
  assert.deepEqual(comparisonScale('overall', { overall: 3 }), { kind: 'stars', value: 3, max: 5, label: '3 of 5 stars' })
  assert.equal(comparisonScale('staffing', { staffRating: 5 }).value, 5)
  assert.equal(comparisonScale('inspection', { healthRating: 1 }).value, 1)
  assert.equal(comparisonScale('match', { match: 0 }).value, 0)
  assert.equal(comparisonScale('match', { match: 100 }).value, 100)
  for (const value of [null, undefined, NaN, -1, 101, '85']) assert.equal(comparisonScale('match', { match: value }), null)
  for (const value of [null, 0, 6, 3.5]) assert.equal(comparisonScale('overall', { overall: value }), null)
  assert.equal(comparisonScale('match', { match: 90, isFictional: true }), null)
  assert.equal(comparisonScale('hours', { staffingHours: 4.2 }), null)
  assert.equal(comparisonScale('serious', { seriousCitations: 3 }), null)
})

test('PDF graphics retain exact numeric labels and match their scale proportions', () => {
  const stars = comparisonPdfValue('overall', { overall: 3 }, '3 of 5 stars')
  assert.equal((stars.columns[0].svg.match(/fill="#987129"/g) || []).length, 3)
  assert.equal((stars.columns[0].svg.match(/<path /g) || []).length, 5)
  assert.equal(stars.columns[1].text, '3 / 5')
  const score = comparisonPdfValue('match', { match: 75 }, '75 / 100')
  assert.equal(score.columns[0].canvas[1].w / score.columns[0].canvas[0].w, 0.75)
  assert.equal(score.columns[1].text, '75 / 100')
  assert.equal(comparisonPdfValue('match', { match: 0 }, '0 / 100').columns[0].canvas.length, 1)
  assert.deepEqual(comparisonPdfValue('overall', { overall: null }, 'Not rated'), { text: 'Not rated' })
})
