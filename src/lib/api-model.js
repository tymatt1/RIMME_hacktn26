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
