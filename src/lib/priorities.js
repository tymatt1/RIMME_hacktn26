export const priorityTopics = [
  'Close to family',
  'Staffing',
  'Inspection information',
  'Rehabilitation services',
  'Room preferences',
  'Language & culture',
  'Costs & coverage',
]

// Keep existing selections first when upgrading an older pick-three draft.
export function completePriorityOrder(value) {
  const valid = Array.isArray(value) ? value.filter((topic) => priorityTopics.includes(topic)) : []
  return [...new Set([...valid, ...priorityTopics])]
}

export function movePriority(order, topic, target) {
  const result = completePriorityOrder(order)
  const from = result.indexOf(topic)
  const to = result.indexOf(target)
  if (from < 0 || to < 0 || from === to) return result
  result.splice(from, 1)
  result.splice(to, 0, topic)
  return result
}

export function normalizeBudget(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.round(Math.min(20000, Math.max(0, value)) / 500) * 500
    : null
}
