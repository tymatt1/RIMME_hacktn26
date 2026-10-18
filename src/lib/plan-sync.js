// Saves a signed-in family's plan to the server and picks up changes other family members made.
// No React and no browser APIs in here, so it can be tested with a fake server and fake timers.
import { mergePlans, same } from './plan-merge.js'

// Browsers throw "Illegal invocation" when setTimeout is called as a method of some other object, so these are wrapped.
const browserTimers = {
  setTimeout: (...args) => setTimeout(...args),
  clearTimeout: (...args) => clearTimeout(...args),
  setInterval: (...args) => setInterval(...args),
  clearInterval: (...args) => clearInterval(...args),
}

/**
 * client       { getPlan(knownVersion), putPlan(version, data) }, throws errors with .status (0 = no connection)
 * getLocal()   the plan as it is on screen right now
 * applyRemote  called with a merged plan whenever someone else's changes were folded in
 * normalize    puts a plan into the shape getLocal() returns, so the two compare fairly
 * onStatus     'saving' | 'saved' | 'offline' | 'error'
 * onSessionEnded  called once if the server says the sign-in has ended
 */
export function createPlanSync({ client, getLocal, applyRemote, normalize = (plan) => plan, onStatus = () => {}, onSessionEnded = () => {}, pollMs = 15000, debounceMs = 1200, retryMs = 8000, isActive = () => true, timers = browserTimers }) {
  let base = null
  let stopped = true
  let pushTimer = null
  let pollTimer = null
  let queue = Promise.resolve()
  let status = 'saved'

  const setStatus = (next) => { if (next !== status) { status = next; onStatus(next) } }
  const local = () => normalize(getLocal())
  const enqueue = (task) => { queue = queue.then(task, task); return queue }

  async function pushNow() {
    let mine = local()
    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (same(mine, base.data)) { setStatus('saved'); return }
      setStatus('saving')
      try {
        const saved = await client.putPlan(base.version, mine)
        base = { version: saved.version, data: mine }
        setStatus('saved')
        return
      } catch (error) {
        if (error?.status === 409 && error.data?.current) {
          // Someone else saved first. Fold their changes into ours, show the result, and save on top of theirs.
          const current = error.data.current
          const theirs = normalize(current.data)
          const merged = mergePlans(base.data, mine, theirs)
          base = { version: current.version, data: theirs }
          if (!same(merged, mine)) applyRemote(merged)
          mine = merged
          continue
        }
        throw error
      }
    }
    throw Object.assign(new Error('The plan keeps changing on another device.'), { status: 409 })
  }

  async function pullNow() {
    const result = await client.getPlan(base.version)
    if (result.unchanged) return false
    const theirs = normalize(result.data)
    const mine = local()
    const merged = mergePlans(base.data, mine, theirs)
    base = { version: result.version, data: theirs }
    if (!same(merged, mine)) applyRemote(merged)
    if (!same(merged, theirs)) schedulePush() // this device holds edits the server doesn't have yet
    return true
  }

  function failed(error) {
    if (stopped) return // a late answer for a plan this device has already walked away from (signed out, account deleted)
    if (error?.status === 401) { stop(); onSessionEnded(); return }
    if (error?.status === 413 || error?.status === 403) { setStatus('error'); return }
    setStatus(error?.status === 0 ? 'offline' : 'error')
    schedulePush(retryMs)
  }

  function schedulePush(delay = debounceMs) {
    if (stopped) return
    timers.clearTimeout(pushTimer)
    pushTimer = timers.setTimeout(() => { flush() }, delay)
  }

  function flush() {
    if (stopped) return Promise.resolve()
    timers.clearTimeout(pushTimer)
    return enqueue(async () => { if (stopped) return; try { await pushNow() } catch (error) { failed(error) } })
  }

  function poll() {
    if (stopped || !isActive()) return Promise.resolve(false)
    return enqueue(async () => {
      if (stopped) return false
      try { return await pullNow() } catch (error) { if (error?.status === 401) failed(error); return false }
    })
  }

  function start(initial) {
    stopped = false
    base = { version: initial.version, data: normalize(initial.data) }
    status = 'saved'
    timers.clearInterval(pollTimer)
    pollTimer = timers.setInterval(() => { poll() }, pollMs)
    schedulePush() // sends a brand-new plan to the server right away
  }

  function stop() {
    stopped = true
    timers.clearTimeout(pushTimer)
    timers.clearInterval(pollTimer)
  }

  return { start, stop, schedulePush, flush, poll, get status() { return status } }
}
