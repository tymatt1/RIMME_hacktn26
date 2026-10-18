import Icon from './Icon.jsx'
import { formatPhone } from '../lib/format.js'
import { notMatched, scoreTone, severityLabel, severityLegend, starText } from '../lib/api-model.js'

const fmtDate = (value) => String(value || '').slice(0, 10)
const money = (value) => `$${Number(value || 0).toLocaleString('en-US')}`

// Overview tab for a real (CMS) facility: ratings and reported figures, with the source named.
export function LiveOverview({ f }) {
  const ratings = [['Overall', f.overall], ['Health inspections', f.healthRating], ['Staffing', f.staffRating], ['Quality measures', f.qmRating]]
  const facts = [
    ['Address', f.address], ['Phone', formatPhone(f.phone) || 'Not listed'],
    ['Nurse hours / resident / day', f.staffingHours === null ? 'Not reported' : `${f.staffingHours.toFixed(2)} total${f.rnHours === null ? '' : `, ${f.rnHours.toFixed(2)} RN`}`],
    ['Nursing staff turnover', f.turnover === null ? 'Not reported' : `${Math.round(f.turnover)}%`],
    ['Certified beds', f.beds ?? 'Not reported'], ['Ownership', f.ownership || 'Not reported'],
    ['Fines on record', f.fines ? `${f.fines} (${money(f.finesTotal)})` : 'None listed'],
    ['Special focus status', f.specialFocus || 'None listed'],
  ]
  return <>
    <p>{f.description}</p>
    <ScoreBreakdown f={f} />
    <div className="rating-grid">{ratings.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value === null ? 'Not rated' : <>{value}<small> / 5</small></>}</strong></div>)}</div>
    <div className="detail-facts">{facts.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    {f.abuseIcon && <div className="question-highlight">CMS shows an abuse icon for this facility. Ask the facility about it, and read the inspection details.</div>}
    <div className="gentle-callout"><Icon name="clock" /><p>Source: CMS Care Compare (Provider Data Catalog). Ratings are CMS’s, not ours. Confirm openings, coverage, and costs with the facility; none are shown here.</p></div>
  </>
}

// Inspection tab: real citations from CMS records, penalties, and a grounded Q&A box (AI draft, cites its sources).
export function LiveInspection({ f, detail, ask, onAsk }) {
  const mine = ask.ccn === f.ccn ? ask : { status: 'idle' }
  return <>
    <span className="draft-badge">CMS RECORDS</span>
    <h3>{f.inspectionLabel}</h3>
    <p>{f.inspectionNote}</p>
    {(!detail || detail.status === 'loading') && <p className="field-hint" role="status">Loading inspection records…</p>}
    {detail?.status === 'error' && <p className="field-hint" role="alert">We couldn’t load the inspection records right now. Try again in a moment.</p>}
    {detail?.status === 'ready' && <>
      {detail.data.citations.length > 0 && <div className="table-scroll"><table className="citation-table"><caption>Citations on record (most recent first)</caption><thead><tr><th scope="col">Tag</th><th scope="col">What the rule requires</th><th scope="col">Times cited</th><th scope="col">Latest survey</th><th scope="col">Worst severity</th></tr></thead><tbody>{detail.data.citations.map((c) => <tr key={c.tag_number}><th scope="row">F{Number(c.tag_number)}</th><td>{c.description}</td><td>{c.times_cited}</td><td>{fmtDate(c.latest_survey)}</td><td><span className={`severity sev-${'ABC'.includes(c.worst_severity) ? 'low' : 'DEF'.includes(c.worst_severity) ? 'mid' : 'high'}`}>{severityLabel(c.worst_severity)}</span></td></tr>)}</tbody></table></div>}
      {detail.data.penalties.length > 0 && <><h3>Penalties</h3><ul className="penalty-list">{detail.data.penalties.map((p, i) => <li key={`${p.penalty_date}-${i}`}>{fmtDate(p.penalty_date)} · {p.penalty_type}{p.fine_amount ? ` · ${money(p.fine_amount)}` : ''}{p.payment_denial_days ? ` · payment denial ${p.payment_denial_days} days` : ''}</li>)}</ul></>}
      <details className="severity-legend"><summary>What do the severity letters mean?</summary><ul>{severityLegend.map(([code, text]) => <li key={code}><strong>{code}</strong> {text}</li>)}</ul></details>
    </>}
    <form className="ask-box" onSubmit={(e) => { e.preventDefault(); const q = String(new FormData(e.currentTarget).get('question') || ''); if (q.trim()) onAsk(f, q) }}>
      <label className="text-field">Ask about this facility’s inspection record<span className="field-hint">Answers use only this facility’s CMS records and cite them. They are drafts, not advice.</span>
        <input name="question" maxLength={200} placeholder="e.g. What was this place cited for most recently?" defaultValue={mine.question || ''} /></label>
      <button className="button secondary" type="submit" disabled={mine.status === 'loading'}>{mine.status === 'loading' ? 'Reading the records…' : 'Ask'}</button>
    </form>
    {mine.status === 'error' && <p className="field-hint" role="alert">We couldn’t get an answer right now. The records above are still accurate.</p>}
    {mine.status === 'ready' && <div className="ai-answer" aria-live="polite"><span className="draft-badge">AI DRAFT · CHECK THE SOURCES</span><p>{mine.answer.answer}</p><small>{mine.answer.note}</small></div>}
    <a className="text-link" href="https://www.medicare.gov/care-compare/" target="_blank" rel="noreferrer">See this facility on Medicare Care Compare <Icon name="external" size={15} /></a>
  </>
}

export const liveCompareRows = [
  ['Match score', (f) => (f.match === null || f.match === undefined ? 'Not scored' : `${f.match} / 100`)],
  ...[['inspections', '· Inspection results'], ['staffing', '· Nurse staffing'], ['quality', '· Quality measures'], ['safety', '· Safety record'], ['distance', '· Distance']].map(([key, label]) => [label, (f) => { const part = f.matchParts?.find((p) => p.key === key); return part ? `${part.value} / 100` : '–' }]),
  ['Overall rating', (f) => starText(f.overall)], ['Health inspection', (f) => starText(f.healthRating)],
  ['Staffing rating', (f) => starText(f.staffRating)], ['Quality measures', (f) => starText(f.qmRating)],
  ['Nurse hours / resident / day', (f) => (f.staffingHours === null ? 'Not reported' : f.staffingHours.toFixed(2))],
  ['RN hours / resident / day', (f) => (f.rnHours === null ? 'Not reported' : f.rnHours.toFixed(2))],
  ['Nursing staff turnover', (f) => (f.turnover === null ? 'Not reported' : `${Math.round(f.turnover)}%`)],
  ['Certified beds', (f) => f.beds ?? 'Not reported'], ['Ownership', (f) => f.ownership || 'Not reported'],
  ['Citations on record', (f) => f.citationsTotal], ['Citations at severity G or higher', (f) => f.seriousCitations],
  ['Fines', (f) => (f.fines ? `${f.fines} (${money(f.finesTotal)})` : 'None listed')],
  ['Openings & coverage', () => 'Confirm with facility'],
]

// How the match score is built: each component, its 0-100 value, and how much it counts.
export function ScoreBreakdown({ f }) {
  if (f.match === null || f.match === undefined) return <div className="gentle-callout"><Icon name="clock" /><p>{f.scoreReason || 'Not enough CMS data to score this home.'} Use the ratings below and ask the facility.</p></div>
  return <section className={`score-card match-${scoreTone(f.match)}`} aria-label="Match score breakdown">
    <div className="score-head"><div className="score-number"><strong>{f.match}</strong><span>/ 100</span></div><div><h3>Match score</h3><p>Built from CMS data and your priorities. It is not medical advice or a guarantee of care.</p></div></div>
    <ul className="score-parts">{f.matchParts.map((part) => <li key={part.key}><div className="score-part-top"><strong>{part.label}</strong><span>{part.value}/100 · counts {part.weight}%</span></div><div className="score-bar" role="presentation"><span style={{ width: `${part.value}%` }} /></div><small>{part.note}</small></li>)}</ul>
    {f.matchReasons?.length > 0 && <ul className="score-reasons">{f.matchReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
    {f.scoreNotes.length > 0 && <p className="field-hint">Flags included: {f.scoreNotes.join('; ')}.</p>}
    <p className="field-hint">Parts CMS has no data for are left out, not counted as zero. {notMatched}</p>
  </section>
}
