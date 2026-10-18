// Pure adapters between the app's UI model and the backend API. No network, no React.

const acronyms = new Set(['LLC', 'LP', 'LLP', 'INC', 'II', 'III', 'IV', 'TN', 'CM', 'OPCO', 'ALF', 'LTC', 'SNF', 'HCC', 'USA'])

export function titleCase(value = '') {
  return String(value).toLowerCase().split(/(\s+|-)/).map((part) => {
    const upper = part.replace(/[^a-z]/gi, '').toUpperCase()
    if (acronyms.has(upper)) return part.toUpperCase()
    return part.charAt(0).toUpperCase() + part.slice(1)
  }).join('')
}

const needsHelp = (value) => value === 'Some help' || value === 'Substantial help'
const supportLevel = (value) => value === 'Substantial help' ? 'full_help' : value === 'Some help' ? 'some_help' : 'independent'

// App intake answers -> POST /intake body. Only answers the person gave are sent; the first name is optional.
export function toBackendIntake(intake = {}) {
  const mobility = Array.isArray(intake.mobility) ? intake.mobility : []
  const daily = intake.dailySupport || {}
  const coverage = Array.isArray(intake.coverage) ? intake.coverage : []
  const status = intake.hospitalStatus
  return {
    persona_name: intake.personName?.trim() || null,
    mobility: mobility.includes('Wheelchair') ? 'wheelchair'
      : mobility.includes('With someone’s help') || needsHelp(intake.transferHelp) ? 'needs_help'
        : 'walks_alone',
    memory: intake.memorySupport === 'Frequent supervision needed' ? 'dementia'
      : intake.memorySupport === 'Reminders help' ? 'mild' : 'none',
    medications: needsHelp(daily.medicines) ? 'many_or_complex' : 'few',
    bathing: supportLevel(daily.bathing),
    eating: supportLevel(daily.eating),
    safety: [],
    from_hospital: intake.currentSetting === 'Hospital',
    hospital_status: status === 'Inpatient' ? 'inpatient' : status === 'Observation' ? 'observation' : 'unknown',
    medicaid_possible: coverage.includes('Medicaid'),
    language: intake.language === 'Spanish' ? 'es' : 'en',
  }
}

export const intakeKey = (body) => JSON.stringify(body)

const slug = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

// API task -> checklist row. The id is derived from the title so checked/assigned state
// survives regenerating the plan after the intake changes.
export function taskFromApi(task) {
  return {
    id: `api-${slug(task.title)}`,
    apiId: task.id,
    label: task.title,
    detail: task.detail,
    category: task.category,
    priority: task.priority,
  }
}

export const categoryLabels = { document: 'Documents', supply: 'Supplies', logistics: 'Logistics', coverage: 'Coverage', tour: 'Tour questions', home: 'Home & comfort' }

export function guidanceFromResponse(key, response) {
  return {
    key,
    planId: response.plan_id,
    explainer: String(response.care_explainer || ''),
    questions: Array.isArray(response.doctor_questions) ? response.doctor_questions.map(String) : [],
    tasks: (response.tasks || []).map(taskFromApi),
  }
}

export const severityLegend = [
  ['A–C', 'No actual harm; minimal potential for harm'],
  ['D–F', 'No actual harm; potential for more than minimal harm'],
  ['G–I', 'Actual harm'],
  ['J–L', 'Immediate jeopardy (most serious)'],
]

export function severityLabel(letter) {
  if (!letter) return ''
  const code = letter.toUpperCase()
  if ('ABC'.includes(code)) return `${code} · minimal potential harm`
  if ('DEF'.includes(code)) return `${code} · potential for more than minimal harm`
  if ('GHI'.includes(code)) return `${code} · actual harm`
  return `${code} · immediate jeopardy`
}

export const starText = (value) => (value === null || value === undefined ? 'Not rated' : `${value} of 5 stars`)

function facilityQuestions(row, serious) {
  const questions = ['Can your team support the needs we have listed?', 'What does a typical day look like for residents?', 'How can our family stay involved?']
  if (serious > 0) questions.unshift(`The CMS data lists ${serious} citation${serious === 1 ? '' : 's'} at severity G or higher. What happened, and what has changed since?`)
  if (row.staffing_rating !== null && row.staffing_rating <= 2) questions.push('How is nurse staffing on nights and weekends?')
  if (Number(row.total_nursing_turnover_pct) >= 50) questions.push(`Nursing staff turnover is reported at ${Math.round(row.total_nursing_turnover_pct)}%. How do you keep care consistent?`)
  if (row.special_focus_status) questions.push(`CMS lists a special focus status (${row.special_focus_status}). What is being done about it?`)
  if (Number(row.num_fines) > 0) questions.push(`CMS lists ${row.num_fines} fine${row.num_fines === 1 ? '' : 's'}. What were they for?`)
  return questions.slice(0, 6)
}

const num = (value) => (value === null || value === undefined || value === '' ? null : Number(value))

// API facility row -> card model used by the Explore screen.
export function facilityFromApi(row) {
  const serious = Number(row.serious_citations) || 0
  const total = Number(row.citations_total) || 0
  const beds = num(row.certified_beds)
  const label = total === 0
    ? 'No citations on record in this data'
    : `${total} citation${total === 1 ? '' : 's'} on record · latest survey ${String(row.latest_survey || '').slice(0, 10)}`
  return {
    id: row.ccn,
    ccn: row.ccn,
    name: titleCase(row.name),
    location: `${titleCase(row.city)}, TN · ${row.county} County`,
    address: `${titleCase(row.address)}, ${titleCase(row.city)}, TN ${row.zip}`,
    phone: row.phone || '',
    distance: num(row.distance_miles),
    staffingHours: num(row.total_nurse_hours_per_resident_day),
    rnHours: num(row.rn_hours_per_resident_day),
    turnover: num(row.total_nursing_turnover_pct),
    overall: num(row.overall_rating),
    healthRating: num(row.health_inspection_rating),
    staffRating: num(row.staffing_rating),
    qmRating: num(row.qm_rating),
    beds,
    ownership: row.ownership_type || '',
    specialFocus: row.special_focus_status || '',
    abuseIcon: row.abuse_icon === 'Y',
    fines: num(row.num_fines) || 0,
    finesTotal: num(row.total_fines_usd) || 0,
    citationsTotal: total,
    seriousCitations: serious,
    inspectionLabel: label,
    inspectionTone: serious > 0 ? 'attention' : 'neutral',
    inspectionNote: serious > 0
      ? `${serious} citation${serious === 1 ? '' : 's'} at severity G or higher (actual harm or immediate jeopardy) appear in the CMS data loaded here.`
      : 'No citations at severity G or higher appear in the CMS data loaded here.',
    provides: [row.ownership_type, beds ? `${beds} certified beds` : ''].filter(Boolean),
    filterTags: [num(row.overall_rating) >= 4 ? 'Overall 4+ stars' : '', num(row.staffing_rating) >= 4 ? 'Staffing 4+ stars' : ''].filter(Boolean),
    languages: [],
    roomOptions: [],
    description: [row.ownership_type, beds ? `${beds} certified beds` : '', row.avg_residents ? `about ${Math.round(row.avg_residents)} residents per day` : ''].filter(Boolean).join(' · '),
    questions: facilityQuestions({ ...row, staffing_rating: num(row.staffing_rating) }, serious),
    isFictional: false,
    score: num(row.score),
    scoreParts: row.score_parts || {},
    scoreNotes: Array.isArray(row.score_notes) ? row.score_notes : [],
    scoreReason: row.score_reason || '',
    worstSeverity: row.worst_severity || '',
  }
}

export const liveFilters = ['All facilities', 'Overall 4+ stars', 'Staffing 4+ stars']

// Know Me: UI profile -> POST /plans/{id}/know-me body.
export function toKnowMeBody(profile, name) {
  const list = (value) => (Array.isArray(value) && value.length ? value.join(', ') : undefined)
  return {
    preferred_name: name || undefined,
    background: profile.notes || undefined,
    daily_routine: profile.morning || undefined,
    likes: list(profile.interests),
    calming: list(profile.comforts),
    communication: list(profile.communication),
  }
}

export const knowMeSections = [
  ['my_story', 'My story'], ['my_day', 'My day'], ['what_i_enjoy', 'Things I enjoy'],
  ['what_calms_me', 'What calms me'], ['what_upsets_me', 'What upsets me'], ['how_to_talk_with_me', 'How to talk with me'],
]

// ---- Match score (0-100) -------------------------------------------------------------------
// The server returns four 0-100 components built from CMS fields (generic, same for everyone).
// Here the score is re-fit to THIS person: how much care they need sets the staffing a home must show,
// the travel range sets what "close" means, and the ranked priorities set what counts most.
// Missing CMS data is left out, never counted as zero.
export const scoreComponents = [
  ['inspections', 'Inspection results', 'CMS health inspection stars'],
  ['staffing', 'Nurse staffing', 'CMS staffing stars, nurse and RN hours, staff turnover'],
  ['quality', 'Quality measures', 'CMS quality measure stars'],
  ['safety', 'Safety record', 'Serious citations (severity G or higher), immediate jeopardy, fines, abuse icon, special focus'],
  ['distance', 'Distance', 'Straight-line miles from your search area'],
]
const baseWeights = { inspections: 0.30, staffing: 0.25, quality: 0.25, safety: 0.20, distance: 0.10 }
const boosts = [2, 1.6, 1.3]
const clip = (value) => Math.max(0, Math.min(100, value))

export const notMatched = 'CMS has no data on memory-care units, languages, room types, or whether a home accepts Medicaid, so those are not in the score. Ask each home.'

// How much care does this person need? Counts needs from the intake; never guesses missing answers.
export function needsProfile(intake = {}) {
  const reasons = []
  let points = 0
  const daily = Object.entries(intake.dailySupport || {})
  const heavy = daily.filter(([, level]) => level === 'Substantial help').map(([activity]) => activity)
  const some = daily.filter(([, level]) => level === 'Some help').map(([activity]) => activity)
  if (heavy.length) { points += heavy.length; reasons.push(`substantial help with ${heavy.join(', ')}`) }
  if (some.length) { points += some.length * 0.5; reasons.push(`some help with ${some.join(', ')}`) }
  const mobility = Array.isArray(intake.mobility) ? intake.mobility : []
  if (mobility.includes('Wheelchair')) { points += 1; reasons.push('wheelchair use') }
  if (intake.transferHelp === 'Substantial help') { points += 1; reasons.push('substantial help moving or transferring') }
  else if (intake.transferHelp === 'Some help') { points += 0.5; reasons.push('some help moving or transferring') }
  if (intake.memorySupport === 'Frequent supervision needed') { points += 2; reasons.push('frequent supervision for memory') }
  else if (intake.memorySupport === 'Reminders help') { points += 1; reasons.push('memory reminders') }
  points = Math.min(6, points)
  return {
    points,
    reasons,
    targetHours: Math.round((3.6 + 0.15 * points) * 100) / 100,
    targetRn: Math.round((0.5 + 0.07 * points) * 100) / 100,
  }
}

// Ranked priorities count more, and so does staffing when the person needs more hands-on care.
export function scoreWeights(order = [], needs = null) {
  const weights = { ...baseWeights }
  const topics = Array.isArray(order) ? order.slice(0, boosts.length) : []
  topics.forEach((topic, index) => {
    const boost = boosts[index]
    if (topic === 'Staffing') weights.staffing *= boost
    else if (topic === 'Inspection information') { weights.inspections *= boost; weights.safety *= boost }
    else if (topic === 'Close to family') weights.distance *= boost
  })
  if (needs?.points) weights.staffing *= 1 + 0.12 * needs.points
  return weights
}

// 100 at 0 miles down to 0 at the family's travel range (default 50).
export const distanceScore = (miles, range = 50) => (miles === null || miles === undefined ? null : Math.round(clip((1 - miles / (Number(range) > 0 ? Number(range) : 50)) * 100)))

// Nurse staffing measured against what THIS person needs, not a fixed scale.
function staffingFit(f, needs) {
  const bits = [
    [0.40, f.staffRating === null || f.staffRating === undefined ? null : ((f.staffRating - 1) / 4) * 100],
    [0.30, f.staffingHours === null || f.staffingHours === undefined ? null : clip(((f.staffingHours - (needs.targetHours - 1.2)) / 1.2) * 100)],
    [0.15, f.rnHours === null || f.rnHours === undefined ? null : clip(((f.rnHours - (needs.targetRn - 0.45)) / 0.45) * 100)],
    [0.15, f.turnover === null || f.turnover === undefined ? null : clip(((75 - f.turnover) / 40) * 100)],
  ].filter(([, value]) => value !== null)
  if (!bits.length) return null
  return bits.reduce((sum, [w, v]) => sum + w * v, 0) / bits.reduce((sum, [w]) => sum + w, 0)
}

export function scoreReasons(needs, priorities) {
  const reasons = []
  if (needs?.reasons.length) reasons.push(`Staffing is measured against ${needs.targetHours} nurse hours a day and counts more, because of: ${needs.reasons.join('; ')}.`)
  const ranked = (Array.isArray(priorities) ? priorities : []).filter((topic) => ['Close to family', 'Staffing', 'Inspection information'].includes(topic)).slice(0, 3)
  if (ranked.length) reasons.push(`Your ranked priorities count more: ${ranked.join(', ').toLowerCase()}.`)
  return reasons
}

// -> { match: integer 0-100 | null, matchParts: [{ key, label, note, value, weight }], matchReasons: [string] }
export function matchScore(f, weights = baseWeights, ctx = {}) {
  if (f.score === null || f.score === undefined) return { match: null, matchParts: [], matchReasons: [] }
  const needs = ctx.needs
  const values = { ...f.scoreParts, distance: distanceScore(f.distance, ctx.travelMiles) }
  const notes = {}
  if (needs) {
    const fit = staffingFit(f, needs)
    if (fit !== null) values.staffing = Math.round(fit)
    if (f.staffingHours !== null && f.staffingHours !== undefined) notes.staffing = `Needs call for about ${needs.targetHours} nurse hours per resident per day; this home reports ${f.staffingHours.toFixed(2)}. Also CMS staffing stars, RN hours, turnover.`
  }
  if (f.distance !== null && f.distance !== undefined && Number(ctx.travelMiles) > 0) notes.distance = `${f.distance} miles away, out of your ${ctx.travelMiles}-mile range (0 miles = 100, at the limit = 0)`
  const present = scoreComponents.filter(([key]) => values[key] !== null && values[key] !== undefined)
  const total = present.reduce((sum, [key]) => sum + weights[key], 0)
  if (!total) return { match: null, matchParts: [], matchReasons: [] }
  const match = Math.round(present.reduce((sum, [key]) => sum + weights[key] * values[key], 0) / total)
  const matchParts = present.map(([key, label, note]) => ({ key, label, note: notes[key] || note, value: Math.round(values[key]), weight: Math.round((weights[key] / total) * 100) }))
  return { match, matchParts, matchReasons: scoreReasons(needs, ctx.priorities) }
}

export const scoreTone = (match) => (match === null || match === undefined ? 'none' : match >= 75 ? 'high' : match >= 55 ? 'mid' : 'low')

// Percent each part counts for this family (what the results banner shows). Distance only counts when we know where they are looking.
export function weightShares(weights, { distance = true } = {}) {
  const parts = scoreComponents.filter(([key]) => distance || key !== 'distance')
  const total = parts.reduce((sum, [key]) => sum + weights[key], 0)
  const shares = parts.map(([key, label]) => ({ key, label, pct: Math.round((weights[key] / total) * 100) }))
  const drift = 100 - shares.reduce((sum, s) => sum + s.pct, 0)
  shares.sort((a, b) => b.pct - a.pct)
  shares[0].pct += drift
  return shares
}
