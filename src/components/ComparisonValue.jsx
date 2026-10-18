import { comparisonScale } from '../lib/facility-comparison.js'

export default function ComparisonValue({ id, home, fallback }) {
  const scale = comparisonScale(id, home)
  if (!scale) return fallback
  if (scale.kind === 'stars') return <div className="comparison-rating" role="img" aria-label={scale.label}>
    <span className="comparison-stars" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <svg key={index} className={index < scale.value ? 'filled' : ''} viewBox="0 0 24 24" width="19" height="19"><path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L2.9 9.4l6.3-.9Z" /></svg>)}</span>
    <span className="comparison-scale-number" aria-hidden="true">{scale.value} / 5</span>
  </div>
  return <div className="comparison-score" role="meter" aria-label="Match score" aria-valuemin={0} aria-valuemax={100} aria-valuenow={scale.value} aria-valuetext={scale.label}>
    <span className="comparison-score-track" aria-hidden="true"><span style={{ width: `${scale.value}%` }} /></span>
    <span className="comparison-scale-number" aria-hidden="true">{scale.value} / 100</span>
  </div>
}
