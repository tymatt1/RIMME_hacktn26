import { useId, useState } from 'react'

const explanations = {
  Staffing: 'Nurse staffing ratings, reported care hours, and staff turnover. These figures describe the home overall, not an individual care schedule.',
  'Inspection information': 'Findings from health inspections, including citations and serious safety concerns. Read the full record and ask what has changed.',
  'Costs & coverage': 'What the family may pay and which insurance or benefits a home accepts. Facility prices and coverage are not in the match score; confirm them directly.',
}

export default function PriorityInfo({ topic }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  if (!explanations[topic]) return null
  return <span className="priority-info" onPointerDown={(e) => e.stopPropagation()}>
    <button type="button" className="info-circle" aria-label={`About ${topic}`} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)} onBlur={() => setOpen(false)} onKeyDown={(e) => { if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false) } }}>i</button>
    <span id={id} className="priority-info-text" role="note" hidden={!open}>{explanations[topic]}</span>
  </span>
}
