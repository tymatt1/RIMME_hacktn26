// Keeps one family's plan in step across their devices. Pure functions, no browser APIs.
//
// Every device holds three copies when it syncs:
//   base   = what the server had the last time this device synced
//   local  = what is on this screen now
//   remote = what the server has now (someone else may have saved since)
// A three-way merge keeps what each person changed and only has to pick a side when two people changed the very same thing.

// Which screen you are on belongs to each device, so it is never shared.
const deviceOnly = ['page', 'returnPage']
// These are replaced as a whole instead of mixed together (an AI checklist built for one set of answers).
const wholeKeys = new Set(['guidance'])

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (isObject(value)) return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]))
  return value
}
export const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b))

/** The part of a plan that is shared. */
export function syncable(draft) {
  const copy = { ...(draft || {}) }
  for (const key of deviceOnly) delete copy[key]
  return copy
}

const isPlainList = (value) => Array.isArray(value) && value.every((item) => item === null || typeof item !== 'object')

// Lists of names or ids (checked tasks, saved homes, family): keep what either side added, drop what either side removed.
function mergeLists(base, local, remote) {
  const removed = new Set([...base.filter((item) => !local.includes(item)), ...base.filter((item) => !remote.includes(item))])
  const merged = local.filter((item) => !removed.has(item))
  for (const item of remote) if (!removed.has(item) && !merged.includes(item)) merged.push(item)
  return merged
}

function mergeValue(base, local, remote) {
  if (same(local, base)) return remote
  if (same(remote, base) || same(local, remote)) return local
  if (isObject(local) && isObject(remote)) {
    const origin = isObject(base) ? base : {}
    const merged = {}
    for (const key of new Set([...Object.keys(local), ...Object.keys(remote)])) {
      const value = mergeValue(origin[key], local[key], remote[key])
      if (value !== undefined) merged[key] = value
    }
    return merged
  }
  if (isPlainList(local) && isPlainList(remote)) return mergeLists(isPlainList(base) ? base : [], local, remote)
  return local // both changed the same single value: the person editing right now wins
}

export function mergePlans(base, local, remote) {
  const origin = base || {}
  const merged = {}
  for (const key of new Set([...Object.keys(local), ...Object.keys(remote)])) {
    const value = wholeKeys.has(key) ? (same(local[key], origin[key]) ? remote[key] : local[key]) : mergeValue(origin[key], local[key], remote[key])
    if (value !== undefined) merged[key] = value
  }
  return merged
}
