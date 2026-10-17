import { useEffect, useRef, useState } from 'react'
import Welcome from './components/Welcome.jsx'
import ProfileCallout from './components/ProfileCallout.jsx'
import PriorityRanking from './components/PriorityRanking.jsx'
import CostPreference from './components/CostPreference.jsx'
import Icon from './components/Icon.jsx'
import { facilities, sampleIntake, buildCareSummary, careQuestions, knowMePrompts } from './data/prototype.js'
import { buildTasks } from './lib/plan.js'
import { blankIntake, toPlanIntake, visibleFacilities, loadDraft, saveDraft } from './lib/demo-model.js'
import { api } from './lib/api.js'
import { facilityFromApi, guidanceFromResponse, intakeKey, toBackendIntake, toKnowMeBody, categoryLabels, liveFilters, knowMeSections } from './lib/api-model.js'
import { LiveOverview, LiveInspection, liveCompareRows } from './components/FacilityLive.jsx'

const nav = [
  ['situation', 'Your situation', 'people'],
  ['support', 'Everyday support', 'heart'],
  ['priorities', 'Your family’s priorities', 'leaf'],
  ['overview', 'Your starting point', 'sun'],
  ['facilities', 'Explore nursing homes', 'home'],
  ['plan', 'Your transition plan', 'list'],
]
const headings = {
  situation: ['', 'Who needs care?', 'Tell us who you’re helping and what’s happening now.'],
  support: ['', 'What help do they need?', 'Choose the help they need with daily activities, mobility, and communication.'],
  priorities: ['', 'What should we look for?', 'Set your search area, travel distance, budget, and priorities.'],
  overview: ['', 'Your starting point', 'Review your answers and decide what to ask the care team before comparing nursing homes.'],
  facilities: ['', 'Compare nursing homes', 'Save homes to your shortlist, then compare their services and questions to ask on a visit.'],
  plan: ['', 'Your transition plan', 'Assign move-in tasks to family members and keep the documents and packing list here.'],
}
const careLevels = ['No help', 'Some help', 'Substantial help', 'Not sure']
const planTabs = ['Checklist', 'Documents & packing', 'Family', 'Know Me']

function Field({ title, hint, children }) {
  return <fieldset className="field-group"><legend>{title}</legend>{hint && <p className="field-hint">{hint}</p>}{children}</fieldset>
}
function Choices({ name, options, value, onChange, multiple = false, limit, compact = false }) {
  return <div className={`choices ${compact ? 'compact' : ''}`}>{options.map((option) => {
    const item = typeof option === 'string' ? { value: option, label: option } : option
    const selected = multiple ? value.includes(item.value) : value === item.value
    const disabled = multiple && limit && value.length >= limit && !selected
    return <label key={item.value} className={`choice-card ${selected ? 'selected' : ''} ${disabled ? 'limited' : ''}`}><input type={multiple ? 'checkbox' : 'radio'} name={name} checked={selected} disabled={Boolean(disabled)} onChange={() => onChange(multiple ? selected ? value.filter((v) => v !== item.value) : [...value, item.value] : item.value)} /><span>{item.icon && <Icon name={item.icon} />}<span>{item.label}</span></span><span className="choice-mark">{selected && <Icon name="check" size={13} />}</span></label>
  })}</div>
}
function Tabs({ items, value, onChange, label }) {
  return <div className="tab-list" role="tablist" aria-label={label}>{items.map((item, i) => <button key={item} role="tab" id={`tab-${item.replaceAll(' ', '-')}`} aria-selected={value === item} tabIndex={value === item ? 0 : -1} onClick={() => onChange(item)} onKeyDown={(e) => { if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return; e.preventDefault(); const index = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : items.length - 1)) % items.length; onChange(items[index]); e.currentTarget.parentElement.children[index].focus() }}>{item}</button>)}</div>
}
function Dialog({ title, subtitle, onClose, children, wide }) {
  const ref = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const previous = document.activeElement, overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'; ref.current?.focus()
    const keydown = (e) => {
      if (e.key === 'Escape') closeRef.current()
      if (e.key !== 'Tab') return
      const nodes = ref.current.querySelectorAll('button:not(:disabled),input,select,textarea,a[href]')
      const first = nodes[0], last = nodes[nodes.length - 1]
      if (e.shiftKey && [first, ref.current].includes(document.activeElement)) { e.preventDefault(); last?.focus() }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); if (previous?.isConnected) previous.focus() }
  }, [])
  return <div className="modal-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}><section className={`dialog ${wide ? 'dialog-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabIndex={-1} ref={ref}><button className="icon-button dialog-close" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button><h2 id="dialog-title">{title}</h2><p className="dialog-subtitle">{subtitle}</p>{children}</section></div>
}
function Building({ variant = 0 }) {
  const [bg, green, wall] = [['#dce5d2', '#779a7d', '#e9dfc9'], ['#eee2d0', '#ab8c6d', '#d6c8ae'], ['#e2e6dc', '#8d9d83', '#dbcab8'], ['#dedfce', '#819a87', '#e8dcca']][variant % 4]
  return <svg viewBox="0 0 420 152" className="building-art" aria-hidden="true"><rect width="420" height="152" fill={bg} /><circle cx="345" cy="36" r="21" fill="#f9f1d9" /><path d="M0 126Q92 87 174 127T420 116V152H0Z" fill={green} opacity=".25" /><rect x="145" y="60" width="133" height="74" rx="3" fill="#fbf7ed" /><path d="m132 63 81-43 79 43" fill={green} /><rect x="93" y="86" width="69" height="48" fill={wall} /><path d="m84 88 44-29 43 29" fill={green} /><rect x="209" y="97" width="24" height="37" rx="12" fill={green} /><g fill="#adc4be"><rect x="166" y="79" width="17" height="22" rx="7" /><rect x="246" y="79" width="17" height="22" rx="7" /><rect x="110" y="102" width="16" height="16" rx="2" /></g><path d="M214 134h12l11 18h-35Z" fill="#faf7ef" /><g stroke="#547361" strokeWidth="3"><path d="M62 132V89m271 46V77" /></g><g fill={green}><ellipse cx="62" cy="84" rx="23" ry="33" /><ellipse cx="333" cy="74" rx="29" ry="40" /><circle cx="285" cy="132" r="13" /><circle cx="143" cy="132" r="11" /></g><path d="M0 147h420" stroke="#9ba98b" /></svg>
}
function Distance({ value, onChange }) {
  return <div className="distance-control"><div className="distance-value"><span>Up to <strong>{value}</strong> miles</span><div><button className="icon-button" aria-label="Decrease travel distance" disabled={value <= 5} onClick={() => onChange(Math.max(5, value - 5))}><Icon name="minus" size={16} /></button><button className="icon-button" aria-label="Increase travel distance" disabled={value >= 50} onClick={() => onChange(Math.min(50, value + 5))}><Icon name="plus" size={16} /></button></div></div><input aria-label="Maximum travel distance in miles" type="range" min="5" max="50" step="5" value={value} onChange={(e) => onChange(Number(e.target.value))} /><div className="range-labels"><span>5 miles</span><span>50 miles</span></div></div>
}
export default function App() {
  const [stored] = useState(loadDraft)
  const [page, setPage] = useState(stored?.page || 'welcome')
  const [intake, setIntake] = useState(stored?.intake || blankIntake())
  const [shortlist, setShortlist] = useState(stored?.shortlist || [])
  const [completed, setCompleted] = useState(stored?.completed || [])
  const [profile, setProfile] = useState(stored?.profile || { morning: '', interests: [], comforts: [], communication: [], notes: '', aiDraft: null })
  const [members, setMembers] = useState(stored?.members || ['Me', 'Family'])
  const [assignees, setAssignees] = useState(stored?.assignees || {})
  const [chosenFacility, setChosenFacility] = useState(stored?.chosenFacility || '')
  const [modal, setModal] = useState(null)
  const [detailTab, setDetailTab] = useState('Overview')
  const [planTab, setPlanTab] = useState('Checklist')
  const [sort, setSort] = useState('distance')
  const [program, setProgram] = useState('All sample options')
  const [compare, setCompare] = useState(false)
  const [notice, setNotice] = useState('')
  const [storageSaved, setStorageSaved] = useState(true)
  const [helpTopic, setHelpTopic] = useState('Start here')
  const [guidance, setGuidance] = useState(stored?.guidance || null)
  const [guidanceState, setGuidanceState] = useState('idle')
  const [catalogState, setCatalogState] = useState({ source: 'loading', list: [], center: null, resolved: true })
  const [facilityDetails, setFacilityDetails] = useState({})
  const [askState, setAskState] = useState({ ccn: '', question: '', status: 'idle', answer: null })
  const [knowMeState, setKnowMeState] = useState('idle')
  const mainRef = useRef(null)
  const firstRender = useRef(true)
  const patch = (values) => setIntake((current) => ({ ...current, ...values, ...('currentSetting' in values && values.currentSetting !== 'Hospital' ? { dischargeDate: '', hospitalStatus: 'Not sure' } : {}) }))
  const name = intake.personName.trim() || 'your loved one'
  const backendBody = toBackendIntake(intake)
  const backendKey = intakeKey(backendBody)
  const guidanceReady = guidance?.key === backendKey
  const guidanceStatus = guidanceReady ? 'ready' : guidanceState
  const tasks = guidance?.tasks?.length ? guidance.tasks : buildTasks(toPlanIntake(intake))
  const done = tasks.filter((task) => completed.includes(task.id)).length
  const percent = Math.round(done / tasks.length * 100)
  const summary = buildCareSummary(intake)
  const step = ['situation', 'support', 'priorities'].indexOf(page)
  const live = catalogState.source === 'live'
  const catalog = live ? catalogState.list : facilities
  const selectedHome = catalog.find((f) => f.id === chosenFacility)
  const listed = visibleFacilities(catalog, intake.travelMiles, program, sort)
  const savedHomes = catalog.filter((f) => shortlist.includes(f.id))
  const activeFacility = modal?.type === 'facility' ? catalog.find((f) => f.id === modal.id) : null
  const closeModal = () => setModal(null)
  useEffect(() => { setStorageSaved(saveDraft({ page, intake, shortlist, completed, profile, members, assignees, chosenFacility, guidance })) }, [page, intake, shortlist, completed, profile, members, assignees, chosenFacility, guidance])
  useEffect(() => {
    document.title = page === 'welcome' ? 'Carebridge | Nursing home transition planning' : `${headings[page][1]} | Carebridge`
    if (!firstRender.current) { window.scrollTo({ top: 0, behavior: 'instant' }); mainRef.current?.focus({ preventScroll: true }) }
    firstRender.current = false
  }, [page])
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 4500); return () => window.clearTimeout(timer) }, [notice])
  const started = page !== 'welcome'
  // Real CMS facilities near the search location. If the API is unreachable, fall back to the fictional examples.
  useEffect(() => {
    if (!started) return undefined
    let cancelled = false
    const timer = window.setTimeout(async () => {
      try {
        let data = await api.listFacilities(intake.searchLocation || 'Nashville')
        const resolved = data.resolved !== false
        if (!resolved) data = await api.listFacilities('Nashville')
        if (cancelled) return
        setCatalogState({ source: 'live', list: data.results.map(facilityFromApi), center: data.center, resolved })
        setProgram((current) => (liveFilters.includes(current) ? current : 'All facilities'))
      } catch {
        if (cancelled) return
        setCatalogState({ source: 'demo', list: [], center: null, resolved: true })
        setProgram('All sample options')
      }
    }, 500)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [started, intake.searchLocation])
  // Care explainer, doctor questions, and checklist from the server (AI drafts + rules). Re-run only when answers change.
  useEffect(() => {
    if (!['overview', 'plan'].includes(page) || guidance?.key === backendKey) return undefined
    let cancelled = false
    setGuidanceState('loading')
    api.createIntake(backendBody).then((response) => { if (!cancelled) { setGuidance(guidanceFromResponse(backendKey, response)); setGuidanceState('ready') } }).catch(() => { if (!cancelled) setGuidanceState('error') })
    return () => { cancelled = true }
  }, [page, backendKey])
  // Inspection records for the open facility.
  useEffect(() => {
    if (!activeFacility || activeFacility.isFictional || detailTab !== 'Inspection' || facilityDetails[activeFacility.ccn]) return
    const ccn = activeFacility.ccn
    setFacilityDetails((current) => ({ ...current, [ccn]: { status: 'loading' } }))
    api.getFacility(ccn).then((data) => setFacilityDetails((current) => ({ ...current, [ccn]: { status: 'ready', data } }))).catch(() => setFacilityDetails((current) => ({ ...current, [ccn]: { status: 'error' } })))
  }, [activeFacility?.ccn, detailTab])
  function sample() {
    setIntake({ ...blankIntake(), ...sampleIntake, coverage: ['Medicare', 'Not sure about other coverage'] })
    setShortlist([]); setCompleted([]); setChosenFacility(''); setAssignees({}); setMembers(['Maria', 'Daniel', 'Family'])
    setProfile({ morning: 'Slow start', interests: ['Music', 'Gardening', 'Being with family'], comforts: ['Family photos', 'Favorite music', 'Knowing the plan'], communication: ['Face me when speaking', 'Give me time to respond'], notes: 'Arthur loves jazz and stories about his garden. A calm explanation before a change of plans helps him feel comfortable.', aiDraft: null })
    setModal(null); setPage('overview'); setNotice('Example profile loaded.')
  }
  function toggleSaved(id) { setShortlist((current) => current.includes(id) ? current.filter((v) => v !== id) : [...current, id]) }
  // Best-effort save of checklist changes on the server; the browser copy stays the source for this device.
  function patchTask(id, values) { const task = tasks.find((t) => t.id === id); if (task?.apiId && guidanceReady) api.updateTask(task.apiId, values).catch(() => {}) }
  function toggleDone(id) { patchTask(id, { done: !completed.includes(id) }); setCompleted((current) => current.includes(id) ? current.filter((v) => v !== id) : [...current, id]) }
  async function askFacility(facility, question) {
    const base = { ccn: facility.ccn, question: question.trim() }
    setAskState({ ...base, status: 'loading', answer: null })
    try { setAskState({ ...base, status: 'ready', answer: await api.askFacility(facility.ccn, base.question) }) } catch { setAskState({ ...base, status: 'error', answer: null }) }
  }
  async function draftKnowMe() {
    if (!guidance?.planId) return
    setKnowMeState('loading')
    try { const data = await api.draftKnowMe(guidance.planId, toKnowMeBody(profile, intake.personName.trim())); setProfile((current) => ({ ...current, aiDraft: data.know_me })); setKnowMeState('ready'); setNotice('Know Me draft ready. Review and edit it before sharing.') } catch { setKnowMeState('error') }
  }
  function download() {
    const data = { title: 'Carebridge transition plan', status: 'Fictional demo draft for family review', intake, facilities: savedHomes, planningFacility: selectedHome || null, checklist: tasks.map((task) => ({ ...task, completed: completed.includes(task.id), assignedTo: assignees[task.id] || 'Unassigned' })), checkedPackingItems: completed.filter((id) => id.startsWith('packing-')), family: members, knowMe: profile }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = 'carebridge-demo-plan.json'; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); setNotice('Your demo plan has been downloaded.')
  }
  function auth(e) {
    e.preventDefault(); const data = new FormData(e.currentTarget)
    const caregiverName = String(data.get('name') || '').trim() || intake.caregiverName || 'You'
    patch({ caregiverName }); setMembers((current) => [...new Set([caregiverName, ...current.filter((member) => member !== 'Me')])]); setModal(null); setPage('situation'); setNotice('Demo plan opened.')
  }
  function actions(previous, next, label = 'Continue') {
    return <div className="form-actions"><button className="text-button" onClick={() => setPage(previous)}><Icon name="back" size={17} />Back</button><span className="save-hint"><Icon name="shield" size={15} />{storageSaved ? 'Saved on this device' : 'Browser storage unavailable · download your plan'}</span><button className="button primary" onClick={() => setPage(next)}>{label}<Icon name="arrow" size={18} /></button></div>
  }
  function details(id) { setDetailTab('Overview'); setModal({ type: 'facility', id }) }
  function help(topic = 'Start here') { setHelpTopic(topic); setModal({ type: 'help' }) }
  return <>
    {page === 'welcome' ? <Welcome onStart={() => setModal({ type: 'account' })} onSignIn={() => setModal({ type: 'signin' })} /> : <div className="app-shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <aside className="sidebar"><button className="brand" onClick={() => setPage('welcome')} aria-label="Carebridge home"><span className="brand-symbol"><Icon name="bridge" size={28} /></span><span>carebridge</span></button><nav aria-label="Your plan navigation">{nav.map(([id, label, icon], index) => <button className={`nav-item ${page === id ? 'active' : ''}`} key={id} aria-current={page === id ? 'page' : undefined} onClick={() => setPage(id)}><span className="nav-icon">{index < 3 ? `0${index + 1}` : <Icon name={icon} size={18} />}</span><span>{label}</span></button>)}</nav></aside>
      <div className="workspace"><header className="topbar workspace-topbar"><div className="topbar-right">
        <span className="demo-badge"><span />DEMO WORKSPACE</span><span className={`demo-badge data-badge ${live ? 'live' : ''}`} title={live ? 'Facilities come from CMS Care Compare data (Tennessee)' : 'Showing fictional examples because the data service is not reachable'}><span />{live ? 'LIVE CMS DATA · TN' : catalogState.source === 'loading' ? 'CONNECTING…' : 'OFFLINE DEMO DATA'}</span><ProfileCallout caregiverName={intake.caregiverName} personName={name} memberCount={members.length} storageSaved={storageSaved} onFamily={() => { setPage('plan'); setPlanTab('Family') }} /></div></header>
        <main id="main" tabIndex={-1} ref={mainRef}><div className="page-content" key={page}><div className="page-heading"><div><h1>{headings[page][1]}</h1><p className="intro">{headings[page][2]}</p></div>{page === 'plan' && <button className="button secondary" onClick={download}><Icon name="download" size={17} />Download plan</button>}</div>
          {step >= 0 && <div className="intake-progress" aria-label={`Intake step ${step + 1} of 3`}>{['Your situation', 'Everyday support', 'Family priorities'].map((item, i) => <button key={item} className={i <= step ? 'reached' : ''} onClick={() => setPage(nav[i][0])}><span>{i < step ? <Icon name="check" size={13} /> : i + 1}</span>{item}</button>)}</div>}

          {step >= 0 && <div className="intake-layout"><section className="panel form-panel">
            {page === 'situation' && <>
              <Field title="Who are you planning for?"><Choices name="relationship" options={['Myself', 'Parent', 'Grandparent', 'Spouse or partner', 'Someone else']} value={intake.relationship} onChange={(v) => patch({ relationship: v })} compact /></Field>
              <div className="field-columns"><label className="text-field">What should we call them? <span className="optional">Optional</span><input value={intake.personName} placeholder="First name or nickname" maxLength={50} onChange={(e) => patch({ personName: e.target.value })} /></label><label className="text-field">Age range<select value={intake.ageRange} onChange={(e) => patch({ ageRange: e.target.value })}>{['Prefer not to say', 'Under 65', '65–74', '75–84', '85+'].map((v) => <option key={v}>{v}</option>)}</select></label></div>
              <Field title="Where are they staying right now?"><Choices name="setting" options={[{ value: 'Home alone', label: 'At home, on their own', icon: 'home' }, { value: 'Home with others', label: 'At home, with others', icon: 'people' }, { value: 'Hospital', label: 'In the hospital', icon: 'heart' }, { value: 'Another care setting', label: 'Another care setting', icon: 'pin' }]} value={intake.currentSetting} onChange={(v) => patch({ currentSetting: v })} /></Field>
              <Field title="What brought you here?" hint="Choose any that feel relevant, or leave this for later."><Choices name="reasons" options={['Recent hospital stay', 'Daily activities getting harder', 'Memory or safety concerns', 'Caregiver needs support', 'Planning ahead']} value={intake.reasons} multiple onChange={(v) => patch({ reasons: v })} compact /></Field>
              <Field title="When might they need to move?"><Choices name="timing" options={['In 3 days', 'Within 2 weeks', 'Planning ahead', 'Not sure']} value={intake.timing} onChange={(v) => patch({ timing: v })} compact /></Field>
              {intake.currentSetting === 'Hospital' && <div className="conditional-panel"><Field title="Do you know their hospital admission status?"><Choices name="hospitalStatus" options={['Inpatient', 'Observation', 'Not sure']} value={intake.hospitalStatus} onChange={(v) => patch({ hospitalStatus: v })} compact /></Field><p className="field-hint">Unsure? Bring this question to the hospital.</p><label className="text-field">Confirmed discharge date <span className="optional">Optional</span><input type="date" value={intake.dischargeDate} onChange={(e) => patch({ dischargeDate: e.target.value })} /></label></div>}
              <Field title="What kind of stay are you considering?"><Choices name="stay" options={['Short recovery stay', 'Longer-term stay', 'Not sure']} value={intake.stayType} onChange={(v) => patch({ stayType: v })} compact /></Field>
              <Field title="Has a care professional recommended a setting?"><Choices name="recommendation" options={['Yes', 'Not yet', 'Not sure']} value={intake.professionalRecommendation} onChange={(v) => patch({ professionalRecommendation: v })} compact />{intake.professionalRecommendation === 'Yes' && <label className="text-field nested-field">What did they suggest?<select value={intake.recommendedSetting} onChange={(e) => patch({ recommendedSetting: e.target.value })}>{['Not sure of the name', 'Skilled nursing / rehabilitation', 'Longer-term nursing care', 'Discussing several options'].map((v) => <option key={v}>{v}</option>)}</select></label>}</Field>
              {actions('welcome', 'support')}
            </>}
            {page === 'support' && <>
              <Field title="How do they usually get around?" hint="Choose all that apply."><Choices name="mobility" options={['Independently', 'Cane or walker', 'Wheelchair', 'With someone’s help', 'Not sure']} multiple value={intake.mobility} onChange={(v) => patch({ mobility: v })} compact /></Field>
              <Field title="Getting between a bed and a chair"><Choices name="transfer" options={careLevels} value={intake.transferHelp} onChange={(v) => patch({ transferHelp: v })} compact /></Field>
              <Field title="What about everyday activities?" hint="Choose the closest answer. These describe support needs, not a diagnosis."><div className="daily-activities">{[['bathing', 'Bathing'], ['dressing', 'Getting dressed'], ['toileting', 'Using the bathroom'], ['eating', 'Eating'], ['medicines', 'Taking medicines']].map(([id, label]) => <div className="activity-row" key={id} role="radiogroup" aria-label={label}><span>{label}</span><Choices name={id} options={careLevels} value={intake.dailySupport[id]} onChange={(v) => patch({ dailySupport: { ...intake.dailySupport, [id]: v } })} compact /></div>)}</div></Field>
              <Field title="Memory and feeling oriented"><Choices name="memory" options={['No concerns noticed', 'Reminders help', 'Frequent supervision needed', 'Not sure']} value={intake.memorySupport} onChange={(v) => patch({ memorySupport: v })} compact /></Field>
              <Field title="Anything that makes communication easier?" hint="Optional. Choose any that apply."><Choices name="communication" options={['Glasses', 'Hearing aids', 'Larger text', 'Extra time to respond', 'A quieter space']} multiple value={intake.communication} onChange={(v) => patch({ communication: v })} compact /></Field>
              <label className="text-field">Their preferred spoken language<select value={intake.language} onChange={(e) => patch({ language: e.target.value })}>{['English', 'Spanish', 'Arabic', 'Mandarin', 'Another language', 'Not sure'].map((v) => <option key={v}>{v}</option>)}</select></label>
              {actions('situation', 'priorities')}
            </>}
            {page === 'priorities' && <>
              <label className="text-field">Where should we look?<span className="field-hint">City or ZIP code. This preview uses Nashville examples.</span><input value={intake.searchLocation} placeholder="e.g. Nashville, TN or 37203" onChange={(e) => patch({ searchLocation: e.target.value })} /></label>
              <Field title="How far can family comfortably travel?" hint="Example distance from your selected area. No route calculation is connected."><Distance value={intake.travelMiles} onChange={(v) => patch({ travelMiles: v })} /></Field>
              <Field title="What monthly cost works for your family?" hint="What your family could pay after coverage. This sets a budget preference, not a facility price estimate."><CostPreference value={intake.monthlyBudget} onChange={(value) => patch({ monthlyBudget: value })} /></Field>
              <Field title="What coverage do you know they have?" hint="Choose all that apply. No policy numbers needed."><Choices name="coverage" options={['Medicare', 'Medicare Advantage', 'Medicaid', 'Private / long-term care insurance', 'Paying privately', 'Not sure about other coverage']} multiple value={intake.coverage} onChange={(v) => patch({ coverage: v })} compact /></Field>
              <Field title="Rank your family’s priorities" hint="Put the topics in order, from most to least important to your family."><PriorityRanking value={intake.priorities} onChange={(value) => patch({ priorities: value })} /></Field>
              <Field title="Who’s helping coordinate?"><Choices name="coordinators" options={['Just me', 'Several relatives', 'Friends or other supporters', 'Still figuring this out']} value={intake.coordinators} onChange={(v) => patch({ coordinators: v })} compact /></Field>
              <Field title="What could your support network help with?" hint="Optional. Assign tasks in your plan later."><Choices name="familySupport" options={['Calls', 'Facility visits', 'Paperwork', 'Packing', 'Transportation']} multiple value={intake.familySupport} onChange={(v) => patch({ familySupport: v })} compact /></Field>
              {actions('support', 'overview', 'See your starting point')}
            </>}
          </section><div className="intake-storage-note"><Icon name="shield" size={18} /><p>Answers stay in this browser.</p></div></div>}

          {page === 'overview' && <>
            <div className="overview-grid"><section className="journey-card"><div><h2>Compare homes for {name}</h2><p>Use the needs and priorities you’ve recorded to prepare questions for each nursing home.</p><button className="button cream" onClick={() => setPage('facilities')}>Explore nursing homes <Icon name="arrow" size={18} /></button></div><div className="journey-illustration" aria-hidden="true"><Icon name="bridge" size={122} /><span className="illustration-sun" /><span className="illustration-ground" /></div></section><section className="panel at-glance"><h2>Planning details</h2>{[['pin', 'Search area', intake.searchLocation || 'Your area'], ['clock', 'Possible move', intake.dischargeDate || intake.timing], ['people', 'Current setting', intake.currentSetting || 'Still exploring']].map(([icon, label, val]) => <div className="glance-row" key={label}><Icon name={icon} /><span>{label}<strong>{val}</strong></span></div>)}<button className="text-button" onClick={() => setPage('situation')}><Icon name="edit" size={15} />Review your answers</button></section></div>
            <div className="section-title-row"><h2>What to do next</h2></div><div className="next-steps">{[{ icon: 'book', title: 'Discuss care options', text: 'Review the support needs you’ve recorded and questions for the care team.', action: () => document.getElementById('care-options').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }), label: 'See care options' }, { icon: 'home', title: 'Compare nursing homes', text: 'Check services and save homes to discuss with your family.', action: () => setPage('facilities'), label: 'Explore nursing homes' }, { icon: 'list', title: 'Prepare for move-in', text: `Your checklist has ${tasks.length} tasks based on the needs you recorded.`, action: () => setPage('plan'), label: 'Open your plan' }].map((item, i) => <button className="next-step-card" key={item.title} onClick={item.action}><div className={`step-art art-${i}`}><Icon name={item.icon} size={27} /><span>0{i + 1}</span></div><h3>{item.title}</h3><p>{item.text}</p><span className="text-link">{item.label}<Icon name="arrow" size={17} /></span></button>)}</div>
            <section className="panel ai-guidance" aria-live="polite"><div className="section-title-row"><div><h2>Care options in plain language</h2></div><span className="draft-badge">AI DRAFT · REVIEW WITH THE CARE TEAM</span></div>{guidanceStatus === 'ready' || guidance?.explainer ? <><p>{guidance.explainer}</p>{guidanceStatus === 'loading' && <p className="field-hint">Updating for your latest answers…</p>}</> : guidanceStatus === 'error' ? <p className="field-hint" role="alert">We couldn’t reach the guidance service right now, so the prepared summary below is shown instead.</p> : <p className="field-hint" role="status">Preparing an explainer from your answers…</p>}<span className="draft-note">Informational only · No care level or eligibility has been determined. Ask the doctor or discharge planner.</span></section>
            <div className="summary-grid" id="care-options"><section className="panel"><div className="section-heading"><span className="soft-icon"><Icon name="heart" /></span><div><h2>Care needs to discuss</h2></div></div><p>{summary.supportSummary}</p><p>{summary.prioritiesSummary}</p><div className="care-options">{[['Skilled nursing & recovery', 'Ask the care team whether a nursing home recovery stay fits the support they recommend.'], ['Longer-term nursing care', 'Discuss ongoing daily support, nursing needs, and the person’s preferences.'], ['Other options to discuss', 'Ask about home support, assisted living, or memory care where appropriate.']].map(([title, text]) => <details key={title}><summary>{title}<Icon name="chevron" size={16} /></summary><p>{text}</p></details>)}</div><span className="draft-note">Draft for review · No care level or eligibility has been determined.</span></section><section className="panel questions-panel"><h2>Questions for the care team</h2><ol>{(guidanceReady && guidance.questions.length ? guidance.questions : summary.questions).slice(0, 8).map((q) => <li key={q}>{q}</li>)}</ol>{intake.currentSetting === 'Hospital' && <p className="question-highlight">“Can you confirm whether the hospital stay is inpatient or observation?”</p>}<button className="text-button" onClick={() => help('Care team')}>View care-team questions <Icon name="arrow" size={16} /></button></section></div>
          </>}

          {page === 'facilities' && <>
            <div className="facility-toolbar panel"><div><strong><Icon name="pin" size={17} />{live ? `Tennessee · near ${catalogState.center?.label || 'Nashville'}` : 'Nashville, Tennessee'}</strong><small>{live ? (catalogState.resolved ? 'Real CMS records, shown without a best-home ranking.' : `This demo covers Tennessee. Showing homes near Nashville instead of “${intake.searchLocation}”.`) : intake.searchLocation && !/nashville|372/.test(intake.searchLocation.toLowerCase()) ? `Your preference: ${intake.searchLocation}. Showing Nashville examples only.` : 'Fictional options, shown without a best-home ranking.'}</small></div><label>Travel range<select value={intake.travelMiles} onChange={(e) => patch({ travelMiles: Number(e.target.value) })}>{[5, 10, 15, 25, 50].map((v) => <option key={v} value={v}>Within {v} miles</option>)}{![5, 10, 15, 25, 50].includes(intake.travelMiles) && <option value={intake.travelMiles}>Within {intake.travelMiles} miles</option>}</select></label><label>Sort by<select value={sort} onChange={(e) => setSort(e.target.value)}><option value="distance">Distance</option><option value="name">Name: A–Z</option><option value="staffing">{live ? 'Nurse staffing hours' : 'Sample staffing hours'}</option></select></label></div>
            <div className="filter-row"><div className="filter-chips">{(live ? liveFilters : ['All sample options', 'Short recovery stays', 'Memory support']).map((v) => <button key={v} className={program === v ? 'active' : ''} aria-pressed={program === v} onClick={() => setProgram(v)}>{v}</button>)}</div><span>{listed.length} {live ? 'facilities' : 'sample options'}</span></div>
            {catalogState.source === 'loading' && <div className="panel empty-state" role="status"><Icon name="home" size={35} /><h2>Loading nursing homes…</h2><p>Fetching Tennessee records from Medicare Care Compare data.</p></div>}
            <div className="facility-grid">{listed.map((f) => <article className="facility-card" key={f.id}><div className={`facility-image ${f.isFictional ? '' : 'live-rating'}`}>{f.isFictional ? <><Building variant={facilities.indexOf(f)} /><span className="fictional-label">FICTIONAL FACILITY</span></> : <div className="rating-badge"><strong>{f.overall ?? '—'}</strong><span>{f.overall === null ? 'Not rated by CMS' : 'of 5 stars overall (CMS)'}</span></div>}<button className={`save-home ${shortlist.includes(f.id) ? 'saved' : ''}`} aria-label={`${shortlist.includes(f.id) ? 'Unsave' : 'Save'} ${f.name}`} aria-pressed={shortlist.includes(f.id)} onClick={() => toggleSaved(f.id)}><Icon name="heart" size={20} /></button></div><div className="facility-body"><div className="facility-title"><h2>{f.name}</h2>{f.distance !== null && f.distance !== undefined && <span><Icon name="pin" size={14} />{f.distance} mi</span>}</div><p className="facility-location">{f.location.replace(' · demo location', '')}</p><div className="facility-features">{f.provides.slice(0, 2).map((v) => <span key={v}>{v}</span>)}</div><div className="facility-stats"><div><strong>{f.staffingHours === null ? '—' : f.staffingHours.toFixed(1)}<span> hrs</span></strong><small>{f.isFictional ? 'Sample nursing hours / resident / day' : 'Reported nurse hours / resident / day'}</small></div><div><Icon name="book" size={18} /><strong>Inspection details</strong><small>{f.isFictional ? (f.inspectionTone === 'attention' ? 'Sample concern to discuss' : 'Read the sample report') : f.inspectionLabel}</small></div></div><p className="availability-note"><span />Openings & coverage need confirmation</p><button className="button facility-details" onClick={() => details(f.id)}>View facility details <Icon name="arrow" size={17} /></button></div></article>)}</div>
            {!listed.length && catalogState.source !== 'loading' && <div className="panel empty-state"><Icon name="home" size={35} /><h2>No sample options in this range.</h2><p>Try a wider travel range or another filter.</p><button className="button secondary" onClick={() => { patch({ travelMiles: live ? 25 : 15 }); setProgram(live ? 'All facilities' : 'All sample options') }}>Reset filters</button></div>}
            <p className="metric-note">{live ? <>Source: CMS Care Compare (Provider Data Catalog), Tennessee. Distances are straight-line from the middle of your search area. Ratings and counts are CMS’s and are not a recommendation. <a href="https://www.medicare.gov/care-compare/" target="_blank" rel="noreferrer">Open Medicare Care Compare <Icon name="external" size={12} /></a></> : <>Distances, services, and staffing figures are invented examples. No provider data or live availability is connected. <a href="https://www.medicare.gov/care-compare/" target="_blank" rel="noreferrer">Find real facilities on Medicare Care Compare <Icon name="external" size={12} /></a></>}</p>
            {compare && savedHomes.length >= 2 && <section className="panel comparison-panel"><h2>Your shortlist, side by side</h2><div className="table-scroll"><table><caption>{live ? 'CMS data side by side · no ranking' : 'Fictional sample comparison · all figures are invented'}</caption><thead><tr><th scope="col">The details</th>{savedHomes.map((f) => <th scope="col" key={f.id}>{f.name}</th>)}</tr></thead><tbody>{(live ? liveCompareRows : [['Distance (sample)', (f) => `${f.distance} miles`], ['Nursing hours (sample)', (f) => `${f.staffingHours} / resident / day`], ['Services (sample)', (f) => f.provides.join(', ')], ['Languages (sample)', (f) => f.languages.join(', ')], ['Rooms (sample)', (f) => f.roomOptions.join(', ')], ['Openings & coverage', () => 'Confirm with facility']]).map(([label, get]) => <tr key={label}><th scope="row">{label}</th>{savedHomes.map((f) => <td key={f.id}>{get(f)}</td>)}</tr>)}</tbody></table></div></section>}
            <div className="shortlist-bar"><div><span className="soft-icon"><Icon name="heart" size={21} /></span><span><strong>{shortlist.length} places saved</strong><small>{shortlist.length < 2 ? 'Save at least two to compare the details.' : 'Compare the homes on your shortlist.'}</small></span></div><div><button className="button secondary" disabled={shortlist.length < 2} onClick={() => setCompare(!compare)}>{compare ? 'Hide comparison' : 'Compare saved'}</button><button className="button primary" onClick={() => setPage('plan')}>Your move-in plan <Icon name="arrow" size={17} /></button></div></div>
          </>}

          {page === 'plan' && <>
            <div className="plan-top"><section className="plan-progress-card"><span className="progress-ring" style={{ '--progress': `${percent}%` }}><span>{percent}<small>%</small></span></span><div><h2>{done} of {tasks.length} steps complete</h2><p>Check off tasks as you finish them.</p></div></section><section className="timing-card"><Icon name="clock" size={25} /><div><h2>{intake.dischargeDate || intake.timing}</h2><p>Planned move-in timing</p></div></section></div>
            <Tabs items={planTabs} value={planTab} onChange={setPlanTab} label="Transition plan sections" />
            <div className="plan-layout"><section role="tabpanel" aria-labelledby={`tab-${planTab.replaceAll(' ', '-')}`} className="panel plan-panel">
              {planTab === 'Checklist' && <><div className="section-title-row"><div><h2>Move-in checklist</h2></div><span className="draft-badge">FAMILY DRAFT</span></div><p className="field-hint">Based on your answers. Typical items: confirm with your facility. Medicare and Medicaid details change, so verify them at Medicare.gov or your state Medicaid agency.</p>{guidanceStatus === 'loading' && !guidance && <p className="field-hint" role="status">Building your checklist…</p>}<div className="task-list">{tasks.map((task, i) => { const soon = guidance?.tasks?.length ? task.priority === 1 : i < 2; return <div className={`task-row ${completed.includes(task.id) ? 'done' : ''}`} key={task.id}><label><input type="checkbox" checked={completed.includes(task.id)} onChange={() => toggleDone(task.id)} /><span><strong>{task.label}</strong><small>{task.detail}</small><span className={`task-timing ${soon ? 'soon' : ''}`}>{soon ? 'Start here' : 'Before move-in'}</span>{task.category && <span className="task-category">{categoryLabels[task.category] || task.category}</span>}</span></label><label className="task-owner"><span className="sr-only">Assign: {task.label}</span><select value={assignees[task.id] || 'Unassigned'} onChange={(e) => { setAssignees({ ...assignees, [task.id]: e.target.value }); patchTask(task.id, { assignee: e.target.value }) }}><option>Unassigned</option>{members.map((m) => <option key={m}>{m}</option>)}</select></label></div> })}</div></>}
              {planTab === 'Documents & packing' && <><h2>Documents and packing</h2><p className="field-hint">Ask the facility which documents to bring and which supplies it provides.</p>{[['Documents to ask about', ['Identification and coverage information', 'Care team’s medication and allergy list', 'Discharge paperwork, if relevant', 'Care preferences and relevant legal documents']], ['Things family might bring', ['Labeled clothes and comfortable shoes', 'Glasses, hearing aids, and personal aids', 'Family photos and a familiar blanket', 'Favorite toiletries and a phone charger']], ['Confirm with the facility first', ['Furniture, bedding, and laundry', 'Medical equipment and daily supplies', 'Medication and pharmacy arrangements', 'Allowed personal items and arrival details']]].map(([title, items], group) => <div className="packing-group" key={title}><h3>{title}</h3>{items.map((item, i) => <label className="packing-item" key={item}><input type="checkbox" checked={completed.includes(`packing-${group}-${i}`)} onChange={() => toggleDone(`packing-${group}-${i}`)} />{item}</label>)}</div>)}</>}
              {planTab === 'Family' && <><div className="section-title-row"><div><h2>Family members</h2></div><button className="button secondary small" onClick={() => setModal({ type: 'member' })}><Icon name="plus" size={16} />Add family member</button></div><p className="field-hint">Add sample names, then assign checklist tasks. No invitations are sent.</p><div className="family-list">{members.map((m, i) => <div className="family-member" key={m}><span className={`member-avatar member-${i % 3}`}>{m[0]}</span><span><strong>{m}</strong><small>{i === 0 ? 'Main family contact' : 'Family member'}</small></span><span>{tasks.filter((t) => assignees[t.id] === m).length} tasks</span></div>)}</div><div className="gentle-callout"><Icon name="heart" /><p>Include {name} in conversations and choices wherever possible. A plan works best when it reflects their wishes.</p></div><button className="text-button" onClick={() => setPlanTab('Checklist')}>Assign tasks in your checklist <Icon name="arrow" size={16} /></button></>}
              {planTab === 'Know Me' && <><h2>{name}’s Know Me profile</h2><p className="field-hint">Record {name}’s routines and preferences for staff to read before move-in.</p>{knowMePrompts.filter((p) => p.id !== 'preferredName').map((prompt) => prompt.choices ? <Field key={prompt.id} title={prompt.label}><Choices name={`profile-${prompt.id}`} options={prompt.choices} value={profile[prompt.id] || (prompt.type === 'singleChoice' ? '' : [])} multiple={prompt.type === 'multiChoice'} onChange={(v) => setProfile({ ...profile, [prompt.id]: v })} compact /></Field> : <label className="text-field" key={prompt.id}>{prompt.label}<span className="optional">Optional</span><textarea rows={3} value={profile.notes} onChange={(e) => setProfile({ ...profile, notes: e.target.value })} placeholder="For example, how they like to start the day or what helps when they’re upset." /></label>)}<div className="know-me-actions"><button className="button primary" onClick={() => setModal({ type: 'profile' })}><Icon name="book" size={18} />Preview Know Me</button>{guidance?.planId && <button className="button secondary" disabled={knowMeState === 'loading'} onClick={draftKnowMe}><Icon name="chat" size={18} />{knowMeState === 'loading' ? 'Drafting…' : profile.aiDraft ? 'Redraft with AI' : 'Draft with AI'}</button>}</div>{knowMeState === 'error' && <p className="field-hint" role="alert">We couldn’t draft the profile right now. You can still preview and download what you wrote.</p>}{profile.aiDraft && <p className="field-hint">An AI draft is saved with your plan. Preview it, review it with {name}, and edit before sharing.</p>}</>}
            </section><aside className="plan-side"><section className="panel shortlist-panel"><h2>{selectedHome ? 'Selected nursing home' : 'Saved nursing homes'}</h2>{selectedHome ? <>{selectedHome.isFictional && <Building variant={facilities.indexOf(selectedHome)} />}<h3>{selectedHome.name}</h3><p>{selectedHome.isFictional ? 'Fictional selection for planning only. No reservation or admission has been made.' : 'Planning reference only. No reservation or admission has been made.'}</p><button className="text-button" onClick={() => setChosenFacility('')}>Clear selection</button></> : savedHomes.length ? savedHomes.map((f) => <button className="saved-place" key={f.id} onClick={() => details(f.id)}><Icon name="home" size={18} /><span>{f.name}</span><Icon name="arrow" size={15} /></button>) : <p>Save homes from the comparison screen to see them here.</p>}<button className="button secondary full" onClick={() => setPage('facilities')}>Explore nursing homes <Icon name="arrow" size={16} /></button></section><section className="help-card"><Icon name="chat" size={26} /><h3>Questions about the move?</h3><p>Read prepared guidance on care-team conversations, coverage questions, and packing.</p><button className="text-button" onClick={() => help()}>View help topics <Icon name="arrow" size={16} /></button></section></aside></div>
          </>}
          <footer className="app-footer"><span>Your family and care team make the decisions.</span></footer>
        </div></main>
      </div><button className="floating-help" onClick={() => help()} aria-label="Open guided help" title="Guided help"><Icon name="chat" size={23} /></button>
    </div>}
    {(modal?.type === 'account' || modal?.type === 'signin') && <Dialog title={modal.type === 'signin' ? 'Open your saved plan' : 'Create a transition plan'} subtitle="Your plan is stored in this browser." onClose={closeModal}>
      <div className="account-demo-note"><Icon name="shield" size={18} />Demo only.</div>
      <form onSubmit={auth} className="account-form" autoComplete="off">
        {modal.type === 'account' && <label className="text-field">Your first name<input name="name" placeholder="e.g. Maria" required maxLength={50} /></label>}
        <label className="text-field">Demo email<input name="email" type="email" placeholder="maria@example.com" required autoComplete="off" /></label>
        <label className="text-field">Demo password<input name="password" type="password" placeholder="Use any made-up password" required autoComplete="new-password" minLength={4} /></label>
        <p className="field-hint">Email and password are not saved or sent anywhere. Your sample plan is saved in this browser.</p>
        <button className="button primary full" type="submit">{modal.type === 'signin' ? 'Open workspace' : 'Create a plan'}<Icon name="arrow" size={17} /></button>
      </form>
      <div className="account-divider"><span>or view a completed example</span></div>
      <button className="button secondary full" onClick={sample}>See an example profile.</button>
      <button className="text-button account-switch" onClick={() => setModal({ type: modal.type === 'account' ? 'signin' : 'account' })}>{modal.type === 'account' ? 'Already have a plan? Sign in' : 'New here? Start a plan'}</button>
    </Dialog>}
    {activeFacility && <Dialog title={activeFacility.name} subtitle={activeFacility.isFictional ? 'Fictional sample facility · no live availability or provider data' : 'CMS Care Compare data · no live availability or costs'} onClose={closeModal} wide>{activeFacility.isFictional && <Building variant={facilities.indexOf(activeFacility)} />}<Tabs items={['Overview', 'Inspection', 'Call questions']} value={detailTab} onChange={setDetailTab} label="Facility details" /><div role="tabpanel" aria-labelledby={`tab-${detailTab.replaceAll(' ', '-')}`} className="facility-dialog-content">{detailTab === 'Overview' && !activeFacility.isFictional && <LiveOverview f={activeFacility} />}{detailTab === 'Overview' && activeFacility.isFictional && <><p>{activeFacility.description}</p><div className="detail-facts">{[['Example distance', `${activeFacility.distance} miles`], ['Sample nursing hours', `${activeFacility.staffingHours} / resident / day`], ['Example languages', activeFacility.languages.join(', ')], ['Example room options', activeFacility.roomOptions.join(', ')]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><h3>Services shown in this example</h3><div className="facility-features">{activeFacility.provides.map((v) => <span key={v}>{v}</span>)}</div><div className="gentle-callout"><Icon name="clock" /><p>Confirm openings, support needs, coverage, and costs. None have been verified in this prototype.</p></div></>}{detailTab === 'Inspection' && !activeFacility.isFictional && <LiveInspection f={activeFacility} detail={facilityDetails[activeFacility.ccn]} ask={askState} onAsk={askFacility} />}{detailTab === 'Inspection' && activeFacility.isFictional && <><span className="draft-badge">ILLUSTRATIVE REPORT</span><h3>{activeFacility.inspectionLabel}</h3><p>{activeFacility.inspectionNote}</p><div className="question-highlight">Ask: “What was identified in the most recent inspection, and what has changed since?”</div><a className="text-link" href="https://www.medicare.gov/care-compare/" target="_blank" rel="noreferrer">Look up real records on Medicare Care Compare <Icon name="external" size={15} /></a></>}{detailTab === 'Call questions' && <><p className="field-hint">A starting script for your family. This demo does not place calls.</p><p className="call-script">“Hello, I’m helping {name} explore a nursing home stay. Could we talk through a few questions?”</p><ol className="question-list">{[...activeFacility.questions, 'Do you have an opening for our possible move date?', 'Who can explain the costs and coverage for our situation?'].map((q) => <li key={q}>{q}</li>)}</ol></>}</div><div className="dialog-actions"><button className="button secondary" aria-pressed={shortlist.includes(activeFacility.id)} onClick={() => toggleSaved(activeFacility.id)}><Icon name="heart" size={17} />{shortlist.includes(activeFacility.id) ? 'Saved to shortlist' : 'Save this place'}</button><button className="button primary" onClick={() => { setChosenFacility(activeFacility.id); setShortlist((current) => current.includes(activeFacility.id) ? current : [...current, activeFacility.id]); setPage('plan'); setModal(null); setNotice(activeFacility.isFictional ? 'Sample facility added to your draft plan. No booking has been made.' : 'Facility added to your draft plan as a planning reference. No booking has been made.') }}>Use in my draft plan <Icon name="arrow" size={17} /></button></div></Dialog>}
    {modal?.type === 'member' && <Dialog title="Add a family member" subtitle="Add a sample family member. No invitation will be sent." onClose={closeModal}><form className="account-form" onSubmit={(e) => { e.preventDefault(); const value = String(new FormData(e.currentTarget).get('member')).trim(); if (!value) return; if (value === 'Unassigned' || members.some((m) => m.toLowerCase() === value.toLowerCase())) { setNotice('Please choose a different name.'); return } setMembers([...members, value]); setModal(null); setNotice(`${value} was added to the family list.`) }}><label className="text-field">First name or nickname<input name="member" required maxLength={40} placeholder="e.g. Daniel" /></label><button className="button primary" type="submit">Add family member <Icon name="plus" size={17} /></button></form></Dialog>}
    {modal?.type === 'profile' && <Dialog title={`Hello, I’m ${name}.`} subtitle="Know Me · a family-written draft to review together" onClose={closeModal}><div className="know-me-preview"><span className="profile-flower"><Icon name="sun" size={46} /></span><p>Review these details with {name} before sharing them with staff.</p>{[['My morning routine', profile.morning], ['Things I enjoy', profile.interests?.join(', ')], ['What brings comfort', profile.comforts?.join(', ')], ['How to connect with me', profile.communication?.join(', ')], ['Other things to know', profile.notes]].filter(([, value]) => value).map(([label, value]) => <div key={label}><h3>{label}</h3><p>{value}</p></div>)}{profile.aiDraft && <><span className="draft-badge">AI DRAFT · REVIEW BEFORE SHARING</span>{knowMeSections.filter(([key]) => profile.aiDraft[key]).map(([key, label]) => <div key={key}><h3>{label}</h3><p>{profile.aiDraft[key]}</p></div>)}</>}</div><button className="button primary full" onClick={download}><Icon name="download" size={17} />Download with my plan</button></Dialog>}
    {modal?.type === 'help' && <Dialog title="Help with your transition plan" subtitle="Prepared guidance, not live AI" onClose={closeModal}><div className="help-topics">{['Start here', 'Care team', 'Coverage', 'What to bring'].map((topic) => <button className={helpTopic === topic ? 'selected' : ''} key={topic} onClick={() => setHelpTopic(topic)}>{topic}</button>)}</div><div className="help-response" aria-live="polite"><span className="soft-icon"><Icon name="chat" size={21} /></span>{helpTopic === 'Start here' && <><h3>Where to start</h3><p>Record what you know about {name} in the intake. You can leave answers blank and update them after speaking with the care team.</p></>}{helpTopic === 'Care team' && <><h3>Questions for the care team</h3><ul>{(intake.currentSetting === 'Hospital' ? careQuestions.hospital : careQuestions.general).map((q) => <li key={q}>{q}</li>)}</ul></>}{helpTopic === 'Coverage' && <><h3>What to ask about coverage</h3><p>Ask the insurer or benefits contact and facility what applies to this person’s situation, what needs approval, and what costs to expect.</p><p>This prototype doesn’t check benefits or determine eligibility.</p><a className="text-link" href="https://www.medicare.gov/" target="_blank" rel="noreferrer">Visit Medicare.gov <Icon name="external" size={14} /></a></>}{helpTopic === 'What to bring' && <><h3>What to pack</h3><p>Ask the facility for its packing list and what it provides. Your plan has a sample checklist for clothing, personal aids, documents, and familiar comforts.</p><button className="button secondary" onClick={() => { setPlanTab('Documents & packing'); setPage('plan'); setModal(null) }}>Open packing checklist <Icon name="arrow" size={16} /></button></>}</div><p className="field-hint">Your family and care team review the plan and make decisions.</p></Dialog>}
    <div className="toast-region" role="status" aria-live="polite">{notice && <div className="toast"><Icon name="check" size={18} />{notice}</div>}</div>
  </>
}
