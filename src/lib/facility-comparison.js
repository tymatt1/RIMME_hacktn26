import { starText } from './api-model.js'
import { formatPhone } from './format.js'

const number = (value, format) => Number.isFinite(value) ? format(value) : 'Not reported'
const rating = (key) => (f) => f.isFictional ? 'Not rated (sample)' : starText(f[key])

const scales = {
  match: { kind: 'score', field: 'match', min: 0, max: 100 },
  overall: { kind: 'stars', field: 'overall', min: 1, max: 5 },
  staffing: { kind: 'stars', field: 'staffRating', min: 1, max: 5 },
  inspection: { kind: 'stars', field: 'healthRating', min: 1, max: 5 },
}

// Both the screen and PDF use actual scale values, never a guessed maximum for raw counts.
export function comparisonScale(id, home) {
  const scale = scales[id]
  if (!scale || home.isFictional) return null
  const value = home[scale.field]
  if (!Number.isFinite(value) || value < scale.min || value > scale.max || (scale.kind === 'stars' && !Number.isInteger(value))) return null
  return { kind: scale.kind, value, max: scale.max, label: scale.kind === 'stars' ? `${value} of 5 stars` : `${value} out of 100` }
}

// The dialog and downloadable comparison use the same concise, source-labeled facts.
export const comparisonRows = [
  ['source', 'Record source', (f) => f.isFictional ? 'Fictional sample' : 'CMS Care Compare'],
  ['location', 'Location', (f) => f.address || f.location || 'Not listed'],
  ['match', 'Match score', (f) => f.isFictional ? 'Not scored (sample)' : number(f.match, (n) => `${n} / 100`)],
  ['distance', 'Distance', (f) => number(f.distance, (n) => `${n} miles${f.isFictional ? ' (sample)' : ''}`)],
  ['overall', 'Overall rating', rating('overall')],
  ['staffing', 'Staffing rating', rating('staffRating')],
  ['hours', 'Nurse hours / resident / day', (f) => number(f.staffingHours, (n) => `${n.toFixed(2)}${f.isFictional ? ' (sample)' : ''}`)],
  ['inspection', 'Health inspections', (f) => f.isFictional ? f.inspectionLabel || 'Sample report' : starText(f.healthRating)],
  ['serious', 'Citations at severity G or higher', (f) => f.isFictional ? 'Not applicable (sample)' : number(f.seriousCitations, String)],
  ['phone', 'Phone', (f) => formatPhone(f.phone) || 'Not listed'],
  ['coverage', 'Costs, coverage & openings', () => 'Confirm with facility'],
]
