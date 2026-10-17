import { useState } from 'react'
import { facilities, initialIntake, needs } from './data/demo.js'
import { buildTasks } from './lib/plan.js'

const stages = [
  { title: 'Understand the need', subtitle: 'Start with your loved one' },
  { title: 'Choose a place', subtitle: 'Explore your options' },
  { title: 'Prepare for the move', subtitle: 'Bring your plan together' },
]

function App() {
  const [stage, setStage] = useState(0)
  const [intake, setIntake] = useState(initialIntake)
  const [completed, setCompleted] = useState([])
  const [shortlist, setShortlist] = useState([])
  const [profile, setProfile] = useState('I enjoy morning coffee, old jazz records, and hearing stories about my grandchildren. A calm explanation before a change in routine helps me feel comfortable.')
  const tasks = buildTasks(intake)
  const done = tasks.filter((task) => completed.includes(task.id)).length

  function toggleNeed(id) {
    setIntake((current) => ({ ...current, needs: current.needs.includes(id) ? current.needs.filter((item) => item !== id) : [...current.needs, id] }))
  }

  function downloadPlan() {
    const plan = { status: 'Synthetic demo draft for family review', intake, tasks: tasks.map((task) => ({ ...task, complete: completed.includes(task.id) })), shortlist: facilities.filter((facility) => shortlist.includes(facility.id)), knowMe: profile }
    const url = URL.createObjectURL(new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'transition-plan-demo.json'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <aside className="sidebar">
        <a className="brand" href="#main" onClick={() => setStage(0)}><span className="brand-symbol" aria-hidden="true">✳</span><span>The platform<span className="brand-caption">A little clarity. A way forward.</span></span></a>
        <div className="journey-label">YOUR FAMILY’S JOURNEY</div>
        <nav aria-label="Transition stages">
          {stages.map((item, index) => <button className={`nav-item ${stage === index ? 'active' : ''}`} key={item.title} onClick={() => setStage(index)} aria-current={stage === index ? 'step' : undefined}><span className="step-number">{index + 1}</span><span>{item.title}<small>{item.subtitle}</small></span></button>)}
        </nav>
        <div className="sidebar-note"><span aria-hidden="true">♡</span><h3>You don’t have to figure it all out today.</h3><p>One conversation, one question, one step at a time.</p></div>
        <div className="sidebar-bottom"><span className="status-dot" /> Hackathon prototype<span>Synthetic data only</span></div>
      </aside>

      <div className="workspace">
        <header className="topbar"><span>Family workspace <span className="breadcrumb">/ &nbsp; Your transition plan</span></span><span className="demo-badge">DEMO MODE</span></header>
        <main id="main" tabIndex="-1">
          <div className="page-heading"><div><p className="eyebrow">STEP {stage + 1} OF 3 · {stage === 0 ? 'LET’S START HERE' : 'YOUR NEXT STEP'}</p><h1>{['A new chapter, one step at a time.', 'Find a place that feels right.', 'A little preparation. More peace of mind.'][stage]}</h1><p className="intro">{['Moving someone you love into care can feel overwhelming. Let’s start with what matters to them, and build a plan together.', 'Bring your questions and compare the details that matter to your family. The choice stays yours.', 'Your answers become a practical checklist, with room for the little things that make your loved one who they are.'][stage]}</p></div><span className="chapter-art" aria-hidden="true">{['✳', '⌂', '♡'][stage]}</span></div>
          <div className="demo-notice"><span aria-hidden="true">ⓘ</span><span>You’re exploring a fictional family’s journey. Use sample information only. Changes reset when you refresh.</span></div>

          <div className="content-grid">
            <section className="primary-content" aria-label={stages[stage].title}>
              {stage === 0 && <>
                <div className="section-header"><span className="section-icon" aria-hidden="true">01</span><div><h2>Tell us a little about their needs</h2><p>There are no right or wrong answers. You can change these anytime.</p></div></div>
                <div className="panel">
                  <fieldset><legend>Are they coming from a hospital?</legend><p className="field-help">This helps us put the most time-sensitive questions first.</p><div className="choice-row">{[true, false].map((value) => <label className={`choice ${intake.hospital === value ? 'selected' : ''}`} key={String(value)}><input type="radio" name="hospital" checked={intake.hospital === value} onChange={() => setIntake({ ...intake, hospital: value })} />{value ? 'Yes, or planning a discharge' : 'No, they’re at home'}</label>)}</div></fieldset>
                  <fieldset><legend>Where could they use a little support?</legend><p className="field-help">Choose all that apply to this sample journey.</p><div className="needs-grid">{needs.map((need) => <label className={`need-card ${intake.needs.includes(need.id) ? 'selected' : ''}`} key={need.id}><input type="checkbox" checked={intake.needs.includes(need.id)} onChange={() => toggleNeed(need.id)} /><span><strong>{need.label}</strong><small>{need.detail}</small></span></label>)}</div></fieldset>
                  <label className="coverage-choice"><input type="checkbox" checked={intake.medicaid} onChange={(event) => setIntake({ ...intake, medicaid: event.target.checked })} /><span>We’d like help preparing questions about Medicaid<small>We’ll add a reminder to contact the relevant state office.</small></span></label>
                </div>
                <div className="callout"><h3>A starting point for a conversation</h3><p>This intake organizes questions; it does not determine a care level. Ask a doctor or discharge planner which care setting fits your loved one’s needs and preferences.</p><p className="question">“{intake.hospital ? 'What support will be needed after discharge, and who can help us coordinate it?' : 'What support would make daily life safer and more comfortable?'}”</p></div>
                <div className="section-actions"><span>Your checklist updates as you go</span><button className="button primary" onClick={() => setStage(1)}>Explore places <span aria-hidden="true">→</span></button></div>
              </>}

              {stage === 1 && <>
                <div className="section-header"><span className="section-icon" aria-hidden="true">02</span><div><h2>Compare with confidence</h2><p>Fictional examples to help your team build the comparison experience.</p></div></div>
                <div className="panel comparison-panel"><p className="fixture-label">SAMPLE DATA · NOT CMS RECORDS</p><div className="table-scroll"><table><caption>Example nursing homes, shown without ranking</caption><thead><tr><th scope="col">What matters</th>{facilities.map((facility) => <th scope="col" key={facility.id}>{facility.name}</th>)}</tr></thead><tbody><tr><th scope="row">Setting</th>{facilities.map((f) => <td key={f.id}>{f.setting}</td>)}</tr><tr><th scope="row">Nursing hours / resident / day</th>{facilities.map((f) => <td key={f.id}>{f.staffing} <small>(fictional)</small></td>)}</tr><tr><th scope="row">Inspection citations</th>{facilities.map((f) => <td key={f.id}>{f.inspection} <small>(fictional)</small></td>)}</tr><tr><th scope="row">Room options</th>{facilities.map((f) => <td key={f.id}>{f.rooms}</td>)}</tr><tr><th scope="row">Your shortlist</th>{facilities.map((f) => <td key={f.id}><button className="button secondary" aria-pressed={shortlist.includes(f.id)} onClick={() => setShortlist((current) => current.includes(f.id) ? current.filter((id) => id !== f.id) : [...current, f.id])}>{shortlist.includes(f.id) ? '✓ Shortlisted' : 'Add to shortlist'}</button></td>)}</tr></tbody></table></div><p className="field-help">Production data and inspection summaries will need CMS sources and update dates.</p><a className="text-link" href="https://www.medicare.gov/care-compare/" target="_blank" rel="noreferrer">Visit Medicare Care Compare ↗</a></div>
                <div className="callout"><h3>Take these questions on your tour</h3><ul><li>How do residents help shape their daily routines?</li><li>Who can our family contact with questions?</li>{intake.needs.includes('memory') && <li>How do staff support memory and orientation needs?</li>}{intake.needs.includes('mobility') && <li>What help is available for walking and transfers?</li>}</ul></div>
                <div className="section-actions"><button className="text-button" onClick={() => setStage(0)}>← Back to needs</button><button className="button primary" onClick={() => setStage(2)}>Build your move-in plan →</button></div>
              </>}

              {stage === 2 && <>
                <div className="section-header"><span className="section-icon" aria-hidden="true">03</span><div><h2>Your move-in checklist</h2><p>Draft for family review. Confirm details with the facility and care team.</p></div></div>
                <div className="panel task-list">{tasks.map((task) => <label className={`task ${completed.includes(task.id) ? 'done' : ''}`} key={task.id}><input type="checkbox" checked={completed.includes(task.id)} onChange={() => setCompleted((current) => current.includes(task.id) ? current.filter((id) => id !== task.id) : [...current, task.id])} /><span><strong>{task.label}</strong><small>{task.detail}</small></span></label>)}</div>
                <div className="panel profile-panel"><span className="eyebrow">THE PERSON BEHIND THE PAPERWORK</span><h2>Know Me</h2><p>A short introduction for the people who will care for your loved one.</p><label htmlFor="profile">Routines, favorite things, and what brings comfort</label><textarea id="profile" rows="5" value={profile} onChange={(event) => setProfile(event.target.value)} /><small>Synthetic sample only. Review together before sharing.</small></div>
                <div className="section-actions"><button className="text-button" onClick={() => setStage(1)}>← Back to places</button><button className="button primary" onClick={downloadPlan}>Download demo plan ↓</button></div>
              </>}
            </section>

            <aside className="plan-summary" aria-label="Plan summary"><div className="summary-heading"><span className="mini-icon" aria-hidden="true">☷</span><span className="draft-badge">DRAFT</span></div><h2>Your transition plan</h2><p>A little more clarity with every step.</p><div className="progress-label"><strong>{done} of {tasks.length} tasks complete</strong><span>{Math.round(done / tasks.length * 100)}%</span></div><progress aria-label="Transition checklist completion" max={tasks.length} value={done} /><div className="summary-divider" /><p className="eyebrow">COMING TOGETHER</p><ul className="summary-list"><li><span className="list-check">✓</span><span>{intake.needs.length} support areas selected</span></li><li><span className="list-check">✓</span><span>{shortlist.length} places on your shortlist</span></li><li><span className="list-check">✓</span><span>{tasks.length} personalized next steps</span></li></ul><button className="button summary-button" onClick={() => setStage(2)}>View your plan <span aria-hidden="true">↗</span></button><div className="summary-footnote">Built around their needs.<br />Always in your family’s hands.</div></aside>
          </div>
          <footer>Here to explain and organize. Your family and care team make the decisions.<span>Prototype · No AI or backend connected yet</span></footer>
        </main>
      </div>
    </div>
  )
}

export default App
