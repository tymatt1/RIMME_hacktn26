import { sampleIntake } from '../data/prototype.js'
import { normalizeBudget, priorityTopics, separatePreferenceTopics } from './priorities.js'

const draftKey = 'carebridge-prototype-v1'
const pages = new Set(['welcome', 'situation', 'support', 'priorities', 'overview', 'facilities', 'plan'])
const stringList = (value) => Array.isArray(value) ? [...new Set(value.filter((item) => typeof item === 'string'))] : []
const needsHelp = (value) => value === 'Some help' || value === 'Substantial help'

export function blankIntake() {
  return {
    ...sampleIntake,
    caregiverName: '',
    personName: '',
    relationship: 'Parent',
    age: '',
    ageRange: 'Prefer not to say',
    currentSetting: '',
    reasons: [],
    timing: 'Not sure',
    stayType: 'Not sure',
    professionalRecommendation: 'Not sure',
    recommendedSetting: 'Not sure of the name',
    dischargeKnown: 'Not sure',
    dischargeDate: '',
    hospitalStatus: 'Not sure',
    mobility: [],
    transferHelp: 'Not sure',
    dailySupport: Object.fromEntries(Object.keys(sampleIntake.dailySupport).map((key) => [key, 'Not sure'])),
    memorySupport: 'Not sure',
    communication: [],
    knownServices: [],
    coverage: [],
    priorities: [],
    additionalPriorities: [],
    coordinators: 'Still figuring this out',
    familySupport: [],
  }
}

export function toPlanIntake(intake = {}) {
  const needs = []
  const mobility = stringList(intake.mobility)
  const dailySupport = intake.dailySupport || {}
  if (mobility.some((item) => item !== 'Independently' && item !== 'Not sure') || needsHelp(intake.transferHelp)) needs.push('mobility')
  if (['Reminders help', 'Frequent supervision needed', 'Frequent supervision'].includes(intake.memorySupport)) needs.push('memory')
  if (needsHelp(dailySupport.medicines)) needs.push('medications')
  if (['bathing', 'dressing', 'toileting', 'eating'].some((activity) => needsHelp(dailySupport[activity]))) needs.push('daily')
  return { hospital: intake.currentSetting === 'Hospital', medicaid: stringList(intake.coverage).includes('Medicaid'), needs }
}

export function visibleFacilities(facilities, miles = Infinity, program = 'All sample options', sort = 'distance') {
  const parsedMiles = Number(miles)
  const maxDistance = Number.isFinite(parsedMiles) ? Math.max(0, parsedMiles) : Infinity
  // Live facilities carry filterTags; fixtures use provides. A missing distance is kept only when no limit applies.
  const inRange = (facility) => facility.distance === null || facility.distance === undefined ? maxDistance === Infinity : facility.distance <= maxDistance
  const matches = (facility) => program.startsWith('All') || (facility.filterTags ?? facility.provides).includes(program)
  const filtered = facilities.filter((facility) => inRange(facility) && matches(facility))
  const byName = (left, right) => left.name.localeCompare(right.name)
  const hours = (facility) => facility.staffingHours ?? -1
  const miles_ = (facility) => facility.distance ?? Infinity
  return filtered.sort((left, right) => {
    if (sort === 'score') return (right.match ?? -1) - (left.match ?? -1) || miles_(left) - miles_(right) || byName(left, right)
    if (sort === 'name') return byName(left, right)
    if (sort === 'staffing') return hours(right) - hours(left) || byName(left, right)
    return miles_(left) - miles_(right) || byName(left, right)
  })
}

function hydrateIntake(value) {
  const defaults = blankIntake()
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  for (const [key, fallback] of Object.entries(defaults)) {
    if (key === 'dailySupport') {
      defaults.dailySupport = Object.fromEntries(Object.entries(fallback).map(([activity, defaultLevel]) => [activity, typeof source.dailySupport?.[activity] === 'string' ? source.dailySupport[activity] : defaultLevel]))
    } else if (key === 'monthlyBudget') {
      defaults[key] = normalizeBudget(source[key])
    } else if (key === 'priorities') {
      defaults[key] = stringList(source[key]).filter((topic) => priorityTopics.includes(topic))
    } else if (Array.isArray(fallback)) {
      defaults[key] = stringList(source[key])
    } else if (key === 'travelMiles') {
      if (typeof source[key] === 'number' && Number.isFinite(source[key])) defaults[key] = Math.min(50, Math.max(1, source[key]))
    } else if (key === 'age') {
      if (typeof source[key] === 'number' || typeof source[key] === 'string') defaults[key] = source[key]
    } else if (typeof source[key] === 'string') {
      defaults[key] = source[key]
    }
  }
  // Preserve removed ranking topics without inferring answers to the new questions.
  defaults.additionalPriorities = [...new Set([...stringList(source.additionalPriorities), ...stringList(source.priorities)])].filter((topic) => separatePreferenceTopics.includes(topic))
  return defaults
}

const text = (value) => (typeof value === 'string' ? value : '')

// The server-generated plan (AI explainer, doctor questions, checklist) is cached so a refresh does not re-run the AI.
function hydrateGuidance(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.key !== 'string') return null
  const tasks = Array.isArray(value.tasks) ? value.tasks.filter((task) => task && typeof task.id === 'string' && /^[a-z][a-z0-9-]*$/i.test(task.id) && typeof task.label === 'string').map((task) => ({
    id: task.id, apiId: Number.isInteger(task.apiId) ? task.apiId : null, label: task.label, detail: text(task.detail), category: text(task.category), priority: Number(task.priority) || 3,
  })) : []
  return { key: value.key, planId: Number.isInteger(value.planId) ? value.planId : null, explainer: text(value.explainer), questions: stringList(value.questions), tasks }
}

function hydrateAiDraft(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const entries = Object.entries(value).filter(([key, item]) => /^[a-z_]+$/.test(key) && typeof item === 'string')
  return entries.length ? Object.fromEntries(entries) : null
}

function hydrateDraft(draft) {
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) return null
  const profile = draft.profile && typeof draft.profile === 'object' && !Array.isArray(draft.profile) ? draft.profile : {}
  const members = stringList(draft.members).map((member) => member.trim()).filter(Boolean)
  const safeMembers = members.length ? [...new Set(members)] : ['Me', 'Family']
  const assignees = draft.assignees && typeof draft.assignees === 'object' && !Array.isArray(draft.assignees) ? draft.assignees : {}
  return {
    page: pages.has(draft.page) ? draft.page : 'welcome',
    returnPage: pages.has(draft.returnPage) && draft.returnPage !== 'welcome' ? draft.returnPage : null,
    onboardingComplete: typeof draft.onboardingComplete === 'boolean' ? draft.onboardingComplete : ['overview', 'facilities', 'plan'].includes(draft.page),
    intake: hydrateIntake(draft.intake),
    completed: stringList(draft.completed),
    shortlist: stringList(draft.shortlist),
    profile: {
      morning: typeof profile.morning === 'string' ? profile.morning : '',
      interests: stringList(profile.interests),
      comforts: stringList(profile.comforts),
      communication: stringList(profile.communication),
      notes: typeof profile.notes === 'string' ? profile.notes : '',
      aiDraft: hydrateAiDraft(profile.aiDraft),
    },
    members: safeMembers,
    assignees: Object.fromEntries(Object.entries(assignees).filter(([task, member]) => /^[a-z][a-z0-9-]*$/i.test(task) && task !== 'email' && task !== 'password' && (safeMembers.includes(member) || member === 'Unassigned'))),
    chosenFacility: typeof draft.chosenFacility === 'string' ? draft.chosenFacility : '',
    guidance: hydrateGuidance(draft.guidance),
  }
}

export function loadDraft(storageKey = draftKey) {
  try {
    const stored = window.localStorage.getItem(storageKey)
    return stored ? hydrateDraft(JSON.parse(stored)) : null
  } catch {
    return null
  }
}

export function saveDraft(draft, storageKey = draftKey) {
  try {
    const safeDraft = hydrateDraft(draft)
    if (!safeDraft) return false
    window.localStorage.setItem(storageKey, JSON.stringify(safeDraft))
    return true
  } catch {
    return false
  }
}
