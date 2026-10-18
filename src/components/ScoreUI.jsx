import { scoreTone } from '../lib/api-model.js'

const toneWord = { high: 'Strong match', mid: 'Moderate match', low: 'Weaker match', none: 'Not scored' }

// Ring gauge, 0-100. Color comes from the tone class on a parent, so it works in light and dark themes.
export function ScoreGauge({ value, size = 76 }) {
  const radius = 32
  const circumference = 2 * Math.PI * radius
  const filled = (Math.max(0, Math.min(100, value)) / 100) * circumference
  return <svg className="score-gauge" width={size} height={size} viewBox="0 0 80 80" role="img" aria-label={`Match score ${value} out of 100`}>
    <circle className="gauge-track" cx="40" cy="40" r={radius} fill="none" strokeWidth="8" />
    <circle className="gauge-fill" cx="40" cy="40" r={radius} fill="none" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${filled} ${circumference - filled}`} transform="rotate(-90 40 40)" />
    <text x="40" y="47" textAnchor="middle" className="gauge-number">{value}</text>
  </svg>
}

// Top of a live facility card: the score, its rank among the homes shown, and a plain-words label.
export function ScoreHeader({ f, rank, total }) {
  if (f.match === null || f.match === undefined) {
    return <div className="score-header match-none"><span className="score-unscored" aria-hidden="true">–</span><div><strong>Not scored</strong><span>Too little CMS data to score this home. Read its ratings and ask the home.</span></div></div>
  }
  return <div className={`score-header match-${scoreTone(f.match)}`}>
    <ScoreGauge value={f.match} />
    <div><strong>Match score{rank ? <span className="rank-pill">#{rank} of {total}</span> : null}</strong><span>{toneWord[scoreTone(f.match)]} for your needs</span></div>
  </div>
}

// One line on the strongest and weakest part, so the number is never a mystery.
export function StrengthWatch({ f }) {
  const parts = f.matchParts || []
  if (parts.length < 2) return null
  const sorted = [...parts].sort((a, b) => b.value - a.value)
  const best = sorted[0]
  const worst = sorted[sorted.length - 1]
  if (best.value - worst.value < 15) return null
  return <p className="strength-watch"><span><b>Strongest:</b> {best.label} ({best.value})</span><span><b>Weakest:</b> {worst.label} ({worst.value})</span></p>
}

// Above the results: what counts most for THIS family, in percent, and how the score is built.
export function ScoreBanner({ shares, name, reasons }) {
  return <section className="panel score-banner" aria-label="How homes are ranked">
    <div className="score-banner-head"><div><h2>Ranked for {name}</h2></div></div>
    <div className="weight-bar" role="img" aria-label={`What counts most: ${shares.map((s) => `${s.label} ${s.pct} percent`).join(', ')}`}>{shares.map((s) => <span key={s.key} className={`w-${s.key}`} style={{ flex: s.pct }} title={`${s.label} ${s.pct}%`} />)}</div>
    <ul className="weight-legend">{shares.map((s) => <li key={s.key}><i className={`w-${s.key}`} />{s.label} <b>{s.pct}%</b></li>)}</ul>
    <details className="score-explainer"><summary>How is the score calculated?</summary>
      {reasons.length > 0 && <ul className="score-reasons">{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
      <ol>
        <li>Each part is scored 0–100 from CMS data: inspection stars, nurse staffing (against the hours this person needs), quality stars, safety record (serious citations, fines, flags) and distance (against your travel range).</li>
        <li>Parts are averaged using the weights above. A part CMS has no data for is left out, never counted as zero.</li>
        <li>A home with fewer than three CMS parts shows “Not scored”.</li>
      </ol>
      <p className="field-hint">The score summarizes public CMS data. It is not medical advice or a guarantee of care. CMS has no data on memory-care units, languages, room types or Medicaid acceptance, so ask each home.</p>
    </details>
  </section>
}
