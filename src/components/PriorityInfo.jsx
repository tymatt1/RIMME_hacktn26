import { useId, useState } from 'react'

const explanations = {
  'Close to family': 'How near the home is to where you are looking. Closer homes score higher, down to zero at your travel range. Straight-line distance, not a driving route.',
  Staffing: 'Nurse staffing ratings, reported care hours, and staff turnover, measured against the hours this person needs. These figures describe the home overall, not an individual care schedule.',
  'Inspection information': 'Findings from health inspections, including citations and serious safety concerns such as immediate jeopardy, fines and abuse flags. Read the full record and ask what has changed.',
  'Quality of care': 'CMS quality measures, such as how residents do on falls, pressure sores and mobility. They describe the home overall.',
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
