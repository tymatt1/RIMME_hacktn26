// Family priorities are importance sliders (0-100), one per topic. They feed the match score directly.
export const priorityTopics = [
  'Close to family',
  'Staffing',
  'Inspection information',
  'Quality of care',
  'Costs & coverage',
]

export const separatePreferenceTopics = ['Rehabilitation services', 'Room preferences', 'Language & culture']

// Topics that change the match score. CMS has no cost or coverage data, so that slider only guides conversations.
export const scoredPriorityTopics = priorityTopics.filter((topic) => topic !== 'Costs & coverage')

export const defaultPriorityValue = 50

export const defaultPriorityWeights = () => Object.fromEntries(priorityTopics.map((topic) => [topic, defaultPriorityValue]))

const clampValue = (value) => Math.min(100, Math.max(0, Math.round(Number(value) / 5) * 5))

// Accepts saved slider values, or an older drafted ranking (most important first) and turns it into sliders.
export function normalizePriorityWeights(value, legacyOrder) {
  const result = defaultPriorityWeights()
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const topic of priorityTopics) if (Number.isFinite(Number(value[topic])) && value[topic] !== null && value[topic] !== '') result[topic] = clampValue(value[topic])
    return result
  }
  const ranked = Array.isArray(legacyOrder) ? [...new Set(legacyOrder.filter((topic) => priorityTopics.includes(topic)))] : []
  ranked.forEach((topic, index) => { result[topic] = Math.max(20, 90 - 20 * index) })
  return result
}

// Topics from most to least important; ties keep the default order. Topics at 0 are left out.
export function rankPriorities(weights) {
  const values = normalizePriorityWeights(weights)
  return priorityTopics
    .map((topic, index) => ({ topic, index, value: values[topic] }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value || a.index - b.index)
    .map((item) => item.topic)
}

export const prioritiesAreEqual = (a, b) => {
  const left = normalizePriorityWeights(a)
  const right = normalizePriorityWeights(b)
  return priorityTopics.every((topic) => left[topic] === right[topic])
}

// True when every slider still sits at the same value, so no real preference has been expressed.
export const prioritiesAreUntouched = (weights) => {
  const values = priorityTopics.map((topic) => normalizePriorityWeights(weights)[topic])
  return values.every((value) => value === values[0])
}

export function importanceLabel(value) {
  const v = Number(value)
  if (v <= 0) return 'Not important'
  if (v < 30) return 'A little'
  if (v < 55) return 'Somewhat'
  if (v < 80) return 'Important'
  return 'Very important'
}

export function normalizeBudget(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.round(Math.min(20000, Math.max(0, value)) / 500) * 500
    : null
}
