import { useEffect, useState } from 'react'
import PriorityInfo from './PriorityInfo.jsx'
import { defaultPriorityValue, importanceLabel, normalizePriorityWeights, priorityTopics, prioritiesAreEqual, scoredPriorityTopics } from '../lib/priorities.js'

// One 0-100 importance slider per topic. Used in the intake form and on the results tab.
export function PrioritySliders({ value, onChange, topics = priorityTopics, idPrefix = 'priority', columns = false }) {
  const values = normalizePriorityWeights(value)
  return <div className={`priority-sliders ${columns ? 'two-columns' : ''}`}>
    {topics.map((topic) => {
      const current = values[topic]
      const id = `${idPrefix}-${topic.replace(/[^a-z]+/gi, '-').toLowerCase()}`
      const text = importanceLabel(current)
      return <div className="slider-row" key={topic}>
        <div className="slider-top">
          <span className="slider-label"><label htmlFor={id}>{topic}</label><PriorityInfo topic={topic} /></span>
          <output htmlFor={id} className="slider-value"><b>{text}</b><span>{current}</span></output>
        </div>
        <input id={id} type="range" min="0" max="100" step="5" value={current} style={{ '--fill': `${current}%` }} aria-valuetext={`${text}, ${current} out of 100`} onChange={(event) => onChange(topic, Number(event.target.value))} />
        <div className="slider-ends" aria-hidden="true"><span>Not important</span><span>Very important</span></div>
        {!scoredPriorityTopics.includes(topic) && <p className="slider-note">Not part of the match score. CMS has no cost data, so this guides your questions instead.</p>}
      </div>
    })}
  </div>
}

// Results tab: change the sliders, then press Update results to re-rank the homes and reload the list.
export function PriorityTuner({ applied, onApply, busy = false }) {
  const [draft, setDraft] = useState(() => normalizePriorityWeights(applied))
  useEffect(() => { setDraft(normalizePriorityWeights(applied)) }, [applied])
  const changed = !prioritiesAreEqual(draft, applied)
  const setTopic = (topic, next) => setDraft((current) => ({ ...current, [topic]: next }))
  const makeEqual = () => setDraft((current) => ({ ...current, ...Object.fromEntries(scoredPriorityTopics.map((topic) => [topic, defaultPriorityValue])) }))
  return <details className="priority-tuner" open>
    <summary>Change what matters to you</summary>
    <p className="field-hint">Slide toward “Very important” for what counts most, then update the results. Nothing is fixed. The ranking is recalculated from your sliders.</p>
    <PrioritySliders value={draft} onChange={setTopic} topics={scoredPriorityTopics} idPrefix="tuner" columns />
    <div className="tuner-actions">
      <button type="button" className="button primary" disabled={!changed || busy} onClick={() => onApply(draft)}>{busy ? 'Updating…' : 'Update results'}</button>
      <button type="button" className="text-button" disabled={!changed || busy} onClick={() => setDraft(normalizePriorityWeights(applied))}>Undo changes</button>
      <button type="button" className="text-button" disabled={busy} onClick={makeEqual}>Make all equal</button>
      <span className={`tuner-status ${changed ? 'pending' : ''}`} role="status">{changed ? 'Changes not applied yet. Select “Update results” to re-rank the homes.' : busy ? 'Reloading homes…' : 'Results match your sliders.'}</span>
    </div>
  </details>
}
