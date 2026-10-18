import { useEffect, useRef, useState } from 'react'
import Welcome from './components/Welcome.jsx'
import CarebridgeLogo, { BridgeMark } from './components/CarebridgeLogo.jsx'
import { packingGroups } from './data/packing.js'
import { PrioritySliders, PriorityTuner } from './components/PrioritySliders.jsx'
import FacilityComparison from './components/FacilityComparison.jsx'
import CostPreference from './components/CostPreference.jsx'
import Icon from './components/Icon.jsx'
import { facilities, sampleIntake, buildCareSummary, careQuestions, knowMePrompts } from './data/prototype.js'
import { buildTasks } from './lib/plan.js'
import { blankIntake, toPlanIntake, visibleFacilities, loadDraft, saveDraft } from './lib/demo-model.js'
import { api } from './lib/api.js'
import { normalizePriorityWeights } from './lib/priorities.js'
import { packetListing } from './lib/packet-meta.js'
import { accountDraftKey, acceptInvite, cancelInvite, createDemoAccount, createInvite, familyLinks, freshAccountPlan, loadDemoSession, openPreviousDemoPlan, resumePage, signInDemoAccount, signOutDemoAccount, updateAccountContact } from './lib/demo-accounts.js'
import { FamilyList, InviteReady, JoinForm, MemberForm } from './components/FamilyUI.jsx'
import { inviteCodeFromSearch, inviteLink, inviteMailto, isGroupMember, isValidEmail, isValidPhone, normalizeContact, resolveFamily } from './lib/family.js'
import { facilityFromApi, guidanceFromResponse, intakeKey, toBackendIntake, toKnowMeBody, categoryLabels, liveFilters, knowMeSections, scoreWeights, matchScore, needsProfile, weightShares, scoreReasons } from './lib/api-model.js'
import { LiveOverview, LiveInspection } from './components/FacilityLive.jsx'
import { ScoreHeader, StrengthWatch, ScoreBanner } from './components/ScoreUI.jsx'

const intakeSteps = [
  ['situation', 'Your situation', 'people'],
  ['support', 'Everyday support', 'heart'],
  ['priorities', 'Your family’s priorities', 'leaf'],
  ['knowme', 'Know Me', 'book'],
]
const nav = [
  ['overview', 'Your starting point', 'sun'],
  ['facilities', 'Explore nursing homes', 'home'],
  ['plan', 'Your transition plan', 'list'],
]
const headings = {
  situation: ['', 'Who needs care?', 'Tell us who you’re helping and what’s happening now.'],
  support: ['', 'What help do they need?', 'Choose the help they need with daily activities, mobility, and communication.'],
  priorities: ['', 'What should we look for?', 'Set your search area, travel distance, budget, and priorities.'],
  knowme: ['', 'Help staff get to know them', 'Share routines and what comforts them. Staff can read this before the move.'],
  overview: ['', 'Your starting point', 'Review your answers and decide what to ask the care team before comparing nursing homes.'],
  facilities: ['', 'Compare nursing homes', 'Save homes to your shortlist, then compare their services and questions to ask on a visit.'],
  plan: ['', 'Your transition plan', 'Assign move-in tasks to family members and keep the documents and packing list here.'],
}
const careLevels = ['No help', 'Some help', 'Substantial help', 'Not sure']
const planTabs = ['Checklist', 'Documents & packing', 'Family', 'Downloads']
const colorVisionModes = [
  ['standard', 'Standard'],
  ['protanopia', 'Protanopia'],
  ['deuteranopia', 'Deuteranopia'],
  ['tritanopia', 'Tritanopia'],
]
const colorVisionStorageKey = 'carebridge-color-vision-v1'

function initialColorVisionMode() {
  if (typeof window === 'undefined') return 'standard'
  try {
    const stored = window.localStorage.getItem(colorVisionStorageKey)
    return colorVisionModes.some(([id]) => id === stored) ? stored : 'standard'
  } catch {
    return 'standard'
  }
}

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
function ColorVisionControls({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const activeLabel = colorVisionModes.find(([id]) => id === value)?.[1] || 'Standard'
  return <div className="color-vision-picker" ref={ref} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }} onKeyDown={(event) => { if (event.key === 'Escape') { setOpen(false); event.currentTarget.querySelector('.color-vision-toggle')?.focus() } }}>
    <button type="button" className="color-vision-toggle" aria-label={`Color vision: ${activeLabel}. Change palette`} aria-expanded={open} aria-controls="color-vision-options" title="Color vision settings" onClick={() => setOpen((current) => !current)}><Icon name="eye" size={23} /></button>
    {open && <section className="color-vision-controls" id="color-vision-options" aria-label="Color vision settings">
      <span className="color-vision-label">Color vision</span>
      <div role="group" aria-label="Choose a color vision palette">{colorVisionModes.map(([id, label]) => <button type="button" key={id} className={value === id ? 'active' : ''} aria-pressed={value === id} onClick={() => { onChange(id); setOpen(false); window.requestAnimationFrame(() => ref.current?.querySelector('.color-vision-toggle')?.focus()) }}>{label}</button>)}</div>
    </section>}
    <span className="sr-only" aria-live="polite">{activeLabel} color palette active.</span>
  </div>
}
function Dialog({ title, subtitle, onClose, children, wide, className = '' }) {
  const ref = useRef(null)
  const previousFocus = useRef(document.activeElement)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const previous = previousFocus.current, overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'; ref.current?.focus()
    const keydown = (e) => {
      if (e.key === 'Escape') closeRef.current()
      if (e.key !== 'Tab') return
      const nodes = ref.current.querySelectorAll('button:not(:disabled),input,select,textarea,a[href],[tabindex="0"]')
      const first = nodes[0], last = nodes[nodes.length - 1]
      if (e.shiftKey && [first, ref.current].includes(document.activeElement)) { e.preventDefault(); last?.focus() }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); if (previous?.isConnected) previous.focus() }
  }, [])
  return <div className="modal-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}><section className={`dialog ${wide ? 'dialog-wide' : ''} ${className}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabIndex={-1} ref={ref}><button className="icon-button dialog-close" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button><h2 id="dialog-title">{title}</h2>{subtitle && <p className="dialog-subtitle">{subtitle}</p>}{children}</section></div>
}
function Building({ variant = 0 }) {
  const [bg, green, wall] = [['#dce5d2', '#779a7d', '#e9dfc9'], ['#eee2d0', '#ab8c6d', '#d6c8ae'], ['#e2e6dc', '#8d9d83', '#dbcab8'], ['#dedfce', '#819a87', '#e8dcca']][variant % 4]
  return <svg viewBox="0 0 420 152" className="building-art" aria-hidden="true"><rect width="420" height="152" fill={bg} /><circle cx="345" cy="36" r="21" fill="#f9f1d9" /><path d="M0 126Q92 87 174 127T420 116V152H0Z" fill={green} opacity=".25" /><rect x="145" y="60" width="133" height="74" rx="3" fill="#fbf7ed" /><path d="m132 63 81-43 79 43" fill={green} /><rect x="93" y="86" width="69" height="48" fill={wall} /><path d="m84 88 44-29 43 29" fill={green} /><rect x="209" y="97" width="24" height="37" rx="12" fill={green} /><g fill="#adc4be"><rect x="166" y="79" width="17" height="22" rx="7" /><rect x="246" y="79" width="17" height="22" rx="7" /><rect x="110" y="102" width="16" height="16" rx="2" /></g><path d="M214 134h12l11 18h-35Z" fill="#faf7ef" /><g stroke="#547361" strokeWidth="3"><path d="M62 132V89m271 46V77" /></g><g fill={green}><ellipse cx="62" cy="84" rx="23" ry="33" /><ellipse cx="333" cy="74" rx="29" ry="40" /><circle cx="285" cy="132" r="13" /><circle cx="143" cy="132" r="11" /></g><path d="M0 147h420" stroke="#9ba98b" /></svg>
}
function Distance({ value, onChange }) {
  return <div className="distance-control"><div className="distance-value"><span>Up to <strong>{value}</strong> miles</span><div><button className="icon-button" aria-label="Decrease travel distance" disabled={value <= 5} onClick={() => onChange(Math.max(5, value - 5))}><Icon name="minus" size={16} /></button><button className="icon-button" aria-label="Increase travel distance" disabled={value >= 50} onClick={() => onChange(Math.min(50, value + 5))}><Icon name="plus" size={16} /></button></div></div><input aria-label="Maximum travel distance in miles" type="range" min="5" max="50" step="5" value={value} onChange={(e) => onChange(Number(e.target.value))} /><div className="range-labels"><span>5 miles</span><span>50 miles</span></div></div>
}
function IntakeWorkflow({ page, intake, patch, actions, editing = false, profile = {}, patchProfile = () => {} }) {
  return <div className="intake-layout"><section className="panel form-panel">
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
              <label className="text-field">Where should we look?<span className="field-hint">City or ZIP code. Tennessee only for now.</span><input value={intake.searchLocation} placeholder="e.g. Nashville, TN or 37203" onChange={(e) => patch({ searchLocation: e.target.value })} /></label>
              <Field title="How far can family comfortably travel?" hint="Example distance from your selected area. No route calculation is connected."><Distance value={intake.travelMiles} onChange={(v) => patch({ travelMiles: v })} /></Field>
              <Field title="What monthly cost works for your family?" hint="What your family could pay after coverage. This sets a budget preference, not a facility price estimate."><CostPreference value={intake.monthlyBudget} onChange={(value) => patch({ monthlyBudget: value })} /></Field>
              <Field title="What coverage do you know they have?" hint="Choose all that apply. No policy numbers needed."><Choices name="coverage" options={['Medicare', 'Medicare Advantage', 'Medicaid', 'Private / long-term care insurance', 'Paying privately', 'Not sure about other coverage']} multiple value={intake.coverage} onChange={(v) => patch({ coverage: v })} compact /></Field>
              <Field title="Has the care team recommended rehabilitation?" hint={intake.additionalPriorities?.includes('Rehabilitation services') ? 'Previously marked important. Confirm the need with the care team.' : undefined}><Choices name="rehabilitation-preference" options={['Yes', 'No', 'Not sure']} value={intake.rehabilitationPreference} onChange={(value) => patch({ rehabilitationPreference: value })} compact /></Field>
              <Field title="What type of room would they prefer?" hint={intake.additionalPriorities?.includes('Room preferences') ? 'Previously marked important.' : undefined}><Choices name="room-preference" options={['Private room', 'Shared room', 'No preference', 'Not sure']} value={intake.roomPreference} onChange={(value) => patch({ roomPreference: value })} compact /></Field>
              <Field title="Any language or cultural needs for the facility?" hint={intake.additionalPriorities?.includes('Language & culture') ? 'Previously marked important. Choose any that apply.' : 'Optional. Choose any that apply; spoken language is recorded in Everyday support.'}><Choices name="facility-preferences" options={['Staff who speak their language', 'Interpreter access', 'Religious or cultural practices', 'Food preferences']} multiple value={intake.facilityPreferences} onChange={(value) => patch({ facilityPreferences: value })} compact /></Field>
              <Field title="How much does each of these matter to your family?" hint="Slide toward “Very important” for what matters most. This sets how homes are ranked for you, and you can change it later while looking at results."><PrioritySliders value={intake.priorityWeights} onChange={(topic, value) => patch({ priorityWeights: { ...normalizePriorityWeights(intake.priorityWeights), [topic]: value } })} /></Field>
              <Field title="Who’s helping coordinate?"><Choices name="coordinators" options={['Just me', 'Several relatives', 'Friends or other supporters', 'Still figuring this out']} value={intake.coordinators} onChange={(v) => patch({ coordinators: v })} compact /></Field>
              <Field title="What could your support network help with?" hint="Optional. Assign tasks in your plan later."><Choices name="familySupport" options={['Calls', 'Facility visits', 'Paperwork', 'Packing', 'Transportation']} multiple value={intake.familySupport} onChange={(v) => patch({ familySupport: v })} compact /></Field>
              {actions('support', 'knowme')}
            </>}
            {page === 'knowme' && <>
              <p className="field-hint">Everything here is optional. Share what would help staff get to know {intake.personName.trim() || 'them'} before the move.{editing ? '' : ' You can change it later in My preferences.'}</p>
              {knowMePrompts.filter((prompt) => prompt.id !== 'preferredName').map((prompt) => prompt.choices
                ? <Field key={prompt.id} title={prompt.label}><Choices name={`profile-${prompt.id}`} options={prompt.choices} value={profile[prompt.id] || (prompt.type === 'singleChoice' ? '' : [])} multiple={prompt.type === 'multiChoice'} onChange={(v) => patchProfile({ [prompt.id]: v })} compact /></Field>
                : <label className="text-field" key={prompt.id}>{prompt.label}<span className="optional">Optional</span><textarea rows={3} value={profile.notes || ''} onChange={(e) => patchProfile({ notes: e.target.value })} placeholder="For example, how they like to start the day or what helps when they’re upset." /></label>)}
              {actions('priorities', 'overview', 'See your starting point')}
            </>}
          </section><div className="intake-storage-note"><Icon name="shield" size={18} /><p>{editing ? 'Changes update your plan only when you save.' : 'Answers stay in this browser.'}</p></div></div>
}
function IntakeProgress({ step, onChange }) {
  return <div className="intake-progress" aria-label={`Step ${step + 1} of ${intakeSteps.length}`}>{intakeSteps.map(([id, label], i) => <button key={id} className={i <= step ? 'reached' : ''} aria-current={i === step ? 'step' : undefined} onClick={() => onChange(i)}><span>{i < step ? <Icon name="check" size={13} /> : i + 1}</span>{label}</button>)}</div>
}
function ProfileMenu({ caregiverName, personName, onPreferences, onSignOut }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const triggerRef = useRef(null)
  useEffect(() => {
    if (!open) return
    const outside = (event) => { if (!ref.current?.contains(event.target)) setOpen(false) }
    const escape = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); triggerRef.current?.focus() }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open])
  return <div className="profile-menu" ref={ref} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
    <button ref={triggerRef} className="profile-placeholder" aria-label="Your profile" title="Your profile" aria-expanded={open} aria-controls="profile-dropdown" onClick={() => setOpen((current) => !current)}><Icon name="user" size={24} /></button>
    {open && <section id="profile-dropdown" className="profile-dropdown" aria-label="Your profile">
      <div className="profile-dropdown-summary"><span className="profile-placeholder"><Icon name="user" size={26} /></span><div><h2>{caregiverName || 'Your family'}</h2><p>Planning care for {personName}.</p></div></div>
      <button className="profile-dropdown-action" onClick={() => { setOpen(false); onPreferences() }}><Icon name="settings" size={18} />My preferences</button>
      <button className="profile-dropdown-action sign-out-action" onClick={() => { setOpen(false); onSignOut() }}><Icon name="signout" size={18} />Sign out</button>
    </section>}
  </div>
}
export default function App() {
  const [initialSession] = useState(loadDemoSession)
  const stored = initialSession.draft
  const [accountId, setAccountId] = useState(initialSession.accountId)
  const [planId, setPlanId] = useState(initialSession.planId || null)
  const [accountName, setAccountName] = useState(initialSession.accountName || '')
  const [legacyActive, setLegacyActive] = useState(Boolean(stored && !initialSession.accountId))
  const [authError, setAuthError] = useState('')
  const [page, setPage] = useState(stored ? (stored.page === 'welcome' ? 'welcome' : resumePage(stored)) : 'welcome')
  const [returnPage, setReturnPage] = useState(stored ? resumePage(stored) : 'situation')
  const [intake, setIntake] = useState(stored?.intake || blankIntake())
  const [shortlist, setShortlist] = useState(stored?.shortlist || [])
  const [completed, setCompleted] = useState(stored?.completed || [])
  const [profile, setProfile] = useState(stored?.profile || { morning: '', interests: [], comforts: [], communication: [], notes: '', aiDraft: null })
  const [members, setMembers] = useState(stored?.members || ['Me', 'Family'])
  const [contacts, setContacts] = useState(stored?.contacts || {})
  const [links, setLinks] = useState(() => familyLinks(initialSession.planId, initialSession.accountId))
  const [assignees, setAssignees] = useState(stored?.assignees || {})
  const [chosenFacility, setChosenFacility] = useState(stored?.chosenFacility || '')
  const [joinCode] = useState(() => { try { return inviteCodeFromSearch(window.location.search) } catch { return '' } })
  const [modal, setModal] = useState(() => (joinCode ? { type: 'join' } : null))
  const [onboardingComplete, setOnboardingComplete] = useState(stored?.onboardingComplete || false)
  const [preferenceDraft, setPreferenceDraft] = useState(null)
  const [profileDraft, setProfileDraft] = useState(null)
  const [exportLabel, setExportLabel] = useState('')
  const [preferenceStep, setPreferenceStep] = useState(0)
  const [confirmPreferences, setConfirmPreferences] = useState(false)
  const [detailTab, setDetailTab] = useState('Overview')
  const [planTab, setPlanTab] = useState('Checklist')
  const [sort, setSort] = useState('score')
  const [program, setProgram] = useState('All sample options')
  const [notice, setNotice] = useState('')
  const [exporting, setExporting] = useState(false)
  const [storageSaved, setStorageSaved] = useState(true)
  const [helpTopic, setHelpTopic] = useState('Start here')
  const [guidance, setGuidance] = useState(stored?.guidance || null)
  const [guidanceState, setGuidanceState] = useState('idle')
  const [catalogState, setCatalogState] = useState({ source: 'loading', list: [], center: null, resolved: true })
  const [refreshKey, setRefreshKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [rankShift, setRankShift] = useState(null)
  const [facilityDetails, setFacilityDetails] = useState({})
  const [askState, setAskState] = useState({ ccn: '', question: '', status: 'idle', answer: null })
  const [knowMeState, setKnowMeState] = useState('idle')
  const [colorVisionMode, setColorVisionMode] = useState(initialColorVisionMode)
  const mainRef = useRef(null)
  const firstRender = useRef(true)
  const accountEpoch = useRef(0)
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
  const step = intakeSteps.findIndex(([id]) => id === page)
  const live = catalogState.source === 'live'
  const needs = needsProfile(intake)
  const weights = scoreWeights(intake.priorityWeights, needs)
  const scoreContext = { needs, travelMiles: intake.travelMiles, priorityWeights: intake.priorityWeights }
  const catalog = live ? catalogState.list.map((f) => ({ ...f, ...matchScore(f, weights, scoreContext) })) : facilities
  const effectiveSort = live || sort !== 'score' ? sort : 'distance'
  const selectedHome = catalog.find((f) => f.id === chosenFacility)
  const listed = visibleFacilities(catalog, intake.travelMiles, program, effectiveSort)
  const shares = weightShares(weights, { distance: live && catalogState.resolved })
  const rankIds = live ? [...listed].filter((f) => f.match !== null).sort((a, b) => b.match - a.match || a.name.localeCompare(b.name)).map((f) => f.id) : []
  const savedHomes = catalog.filter((f) => shortlist.includes(f.id))
  const linkedAccounts = { ...(members[0] && links.owner ? { [members[0]]: links.owner } : {}), ...Object.fromEntries(Object.entries(links.byMember).filter(([, link]) => link.account).map(([member, link]) => [member, link.account])) }
  const inviteStatus = Object.fromEntries(Object.entries(links.byMember).map(([member, link]) => [member, link.status]))
  const family = resolveFamily({ members, contacts, linked: linkedAccounts, status: inviteStatus, intake })
  const youName = links.isOwner ? members[0] : links.you
  const packet = packetListing({ facilities: savedHomes })
  // Apply new priority sliders from the results tab: remember today's order, reload the homes, then re-rank.
  const applyPriorities = (next) => {
    setRankShift({ ranks: Object.fromEntries(rankIds.map((id, index) => [id, index + 1])), travelMiles: intake.travelMiles, searchLocation: intake.searchLocation })
    patch({ priorityWeights: next })
    setRefreshKey((key) => key + 1)
    setNotice('Results updated for your new priorities.')
  }
  const rankShiftValid = rankShift && rankShift.travelMiles === intake.travelMiles && rankShift.searchLocation === intake.searchLocation
  const movedFor = (id) => { const before = rankShiftValid ? rankShift.ranks[id] : 0; const now = rankIds.indexOf(id) + 1; return before && now ? before - now : 0 }
  const activeFacility = modal?.type === 'facility' ? catalog.find((f) => f.id === modal.id) : null
  const closeModal = () => setModal(null)
  useEffect(() => {
    if (!accountId && !legacyActive) return
    setStorageSaved(saveDraft({ page, returnPage: page === 'welcome' ? returnPage : page, onboardingComplete, intake, shortlist, completed, profile, members, contacts, assignees, chosenFacility, guidance }, accountId ? accountDraftKey(planId || accountId) : undefined))
  }, [accountId, planId, legacyActive, page, returnPage, onboardingComplete, intake, shortlist, completed, profile, members, contacts, assignees, chosenFacility, guidance])
  // Invites and linked accounts are kept apart from the plan, so another tab or account can change them. Re-read them when this tab regains focus.
  useEffect(() => {
    const refresh = () => setLinks(familyLinks(planId, accountId))
    refresh()
    window.addEventListener('storage', refresh); window.addEventListener('focus', refresh)
    return () => { window.removeEventListener('storage', refresh); window.removeEventListener('focus', refresh) }
  }, [planId, accountId, planTab])
  useEffect(() => { setAuthError('') }, [modal?.type])
  useEffect(() => {
    document.title = page === 'welcome' ? 'carebridge | Nursing home transition planning' : `${headings[page][1]} | carebridge`
    if (!firstRender.current) { window.scrollTo({ top: 0, behavior: 'instant' }); mainRef.current?.focus({ preventScroll: true }) }
    firstRender.current = false
  }, [page])
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 4500); return () => window.clearTimeout(timer) }, [notice])
  useEffect(() => {
    document.documentElement.dataset.colorVision = colorVisionMode
    try { window.localStorage.setItem(colorVisionStorageKey, colorVisionMode) } catch { /* The palette still works for this visit. */ }
  }, [colorVisionMode])
  const started = page !== 'welcome'
  // Real CMS facilities near the search location. If the API is unreachable, fall back to the fictional examples.
  useEffect(() => {
    if (!started) return undefined
    let cancelled = false
    const timer = window.setTimeout(async () => {
      if (refreshKey) setRefreshing(true)
      try {
        const data = await api.listFacilities(intake.searchLocation || 'Nashville')
        const resolved = data.resolved !== false
        if (cancelled) return
        setCatalogState({ source: 'live', list: resolved ? data.results.map(facilityFromApi) : [], center: data.center, resolved })
        setProgram((current) => (liveFilters.includes(current) ? current : 'All facilities'))
      } catch {
        if (cancelled) return
        setCatalogState({ source: 'demo', list: [], center: null, resolved: true })
        setProgram('All sample options')
      } finally {
        if (!cancelled) setRefreshing(false)
      }
    }, refreshKey ? 150 : 500)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [started, intake.searchLocation, accountId, refreshKey])
  // Care explainer, doctor questions, and checklist from the server (AI drafts + rules). Re-run only when answers change.
  useEffect(() => {
    if (!['overview', 'plan'].includes(page) || guidance?.key === backendKey) return undefined
    let cancelled = false
    setGuidanceState('loading')
    api.createIntake(backendBody).then((response) => { if (!cancelled) { setGuidance(guidanceFromResponse(backendKey, response)); setGuidanceState('ready') } }).catch(() => { if (!cancelled) setGuidanceState('error') })
    return () => { cancelled = true }
  }, [page, backendKey, accountId])
  // Inspection records for the open facility.
  useEffect(() => {
    if (!activeFacility || activeFacility.isFictional || detailTab !== 'Inspection' || facilityDetails[activeFacility.ccn]) return
    const ccn = activeFacility.ccn
    setFacilityDetails((current) => ({ ...current, [ccn]: { status: 'loading' } }))
    api.getFacility(ccn).then((data) => setFacilityDetails((current) => ({ ...current, [ccn]: { status: 'ready', data } }))).catch(() => setFacilityDetails((current) => ({ ...current, [ccn]: { status: 'error' } })))
  }, [activeFacility?.ccn, detailTab])
  useEffect(() => {
    if (modal?.type !== 'preferences') return
    const dialog = document.querySelector('.preferences-dialog')
    if (dialog) { dialog.scrollTop = 0; dialog.focus({ preventScroll: true }) }
  }, [modal?.type, preferenceStep, confirmPreferences])
  function restorePlan(draft) {
    accountEpoch.current += 1
    setReturnPage(resumePage(draft))
    setIntake(draft.intake || blankIntake()); setShortlist(draft.shortlist || []); setCompleted(draft.completed || [])
    setProfile(draft.profile || freshAccountPlan('You').profile); setMembers(draft.members || ['Me', 'Family']); setContacts(draft.contacts || {}); setAssignees(draft.assignees || {})
    setChosenFacility(draft.chosenFacility || ''); setGuidance(draft.guidance || null); setOnboardingComplete(Boolean(draft.onboardingComplete))
    setGuidanceState('idle'); setKnowMeState('idle'); setAskState({ ccn: '', question: '', status: 'idle', answer: null })
    setCatalogState({ source: 'loading', list: [], center: null, resolved: true }); setFacilityDetails({}); setSort('score'); setProgram('All sample options')
    setPlanTab('Checklist'); setDetailTab('Overview'); setPreferenceDraft(null); setPreferenceStep(0); setConfirmPreferences(false); setModal(null)
  }
  function applySession(session) {
    setAccountId(session?.accountId || null); setPlanId(session?.planId || null); setAccountName(session?.accountName || ''); setLegacyActive(false)
    setLinks(familyLinks(session?.planId || null, session?.accountId || null))
  }
  function signOut() {
    try { signOutDemoAccount() } catch { setNotice('Your browser could not save the sign-out. Please enable browser storage and try again.'); return }
    applySession(null); restorePlan(freshAccountPlan('')); setPage('welcome'); setNotice('Signed out.')
  }
  function sample() {
    try { signOutDemoAccount() } catch { /* Viewing an example does not require storage. */ }
    applySession(null); restorePlan(freshAccountPlan('Maria'))
    setIntake({ ...blankIntake(), ...sampleIntake, coverage: ['Medicare', 'Not sure about other coverage'] })
    setShortlist([]); setCompleted([]); setChosenFacility(''); setAssignees({}); setMembers(['Maria', 'Daniel', 'Family'])
    setContacts({ Maria: { relationship: 'Grandchild', phone: '(615) 555-0142', email: 'maria@example.com', shareWithHome: true }, Daniel: { relationship: 'Son', phone: '(615) 555-0178', email: 'daniel@example.com', shareWithHome: true } })
    setProfile({ morning: 'Slow start', interests: ['Music', 'Gardening', 'Being with family'], comforts: ['Family photos', 'Favorite music', 'Knowing the plan'], communication: ['Face me when speaking', 'Give me time to respond'], notes: 'Arthur loves jazz and stories about his garden. A calm explanation before a change of plans helps him feel comfortable.', aiDraft: null })
    setOnboardingComplete(true); setModal(null); setPage('overview'); setNotice('Example profile loaded.')
  }
  function toggleSaved(id) { setShortlist((current) => current.includes(id) ? current.filter((v) => v !== id) : [...current, id]) }
  // Best-effort save of checklist changes on the server; the browser copy stays the source for this device.
  function patchTask(id, values) { const task = tasks.find((t) => t.id === id); if (task?.apiId && guidanceReady) api.updateTask(task.apiId, values).catch(() => {}) }
  function toggleDone(id) { patchTask(id, { done: !completed.includes(id) }); setCompleted((current) => current.includes(id) ? current.filter((v) => v !== id) : [...current, id]) }
  async function askFacility(facility, question) {
    const epoch = accountEpoch.current
    const base = { ccn: facility.ccn, question: question.trim() }
    setAskState({ ...base, status: 'loading', answer: null })
    try { const answer = await api.askFacility(facility.ccn, base.question); if (epoch === accountEpoch.current) setAskState({ ...base, status: 'ready', answer }) } catch { if (epoch === accountEpoch.current) setAskState({ ...base, status: 'error', answer: null }) }
  }
  async function draftKnowMe() {
    if (!guidance?.planId) return
    const epoch = accountEpoch.current
    setKnowMeState('loading')
    try { const data = await api.draftKnowMe(guidance.planId, toKnowMeBody(profile, intake.personName.trim())); if (epoch !== accountEpoch.current) return; setProfile((current) => ({ ...current, aiDraft: data.know_me })); setKnowMeState('ready'); setNotice('Know Me draft ready. Review and edit it before sharing.') } catch { if (epoch === accountEpoch.current) setKnowMeState('error') }
  }
  const planData = () => ({ intake, facilities: savedHomes, planningFacility: selectedHome || null, checklist: tasks.map((task) => ({ ...task, completed: completed.includes(task.id), assignedTo: assignees[task.id] || 'Unassigned' })), checkedPackingItems: completed.filter((id) => id.startsWith('packing-')), family: members, familyContacts: family, knowMe: profile, aiAssistedChecklist: Boolean(guidance?.tasks?.length), careTeamQuestions: guidanceReady && guidance.questions.length ? guidance.questions : summary.questions, careExplainer: guidanceReady ? guidance.explainer : '' })
  async function download(kind = 'plan') {
    if (exporting) return
    setExporting(true)
    try {
      const { downloadPlanPdf } = await import('./lib/plan-pdf.js')
      await downloadPlanPdf(planData(), kind)
      setNotice(kind === 'know-me' ? 'Your Know Me PDF has been downloaded.' : 'Your transition plan PDF has been downloaded.')
    } catch {
      setNotice('The PDF could not be created. Please try downloading it again.')
    } finally { setExporting(false) }
  }
  // One button for the whole move-in packet (or a single file from it): each PDF is made in the browser and saved in turn.
  async function downloadPacket(ids) {
    if (exporting) return
    setExporting(true); setExportLabel('Creating files…')
    try {
      const { downloadPacketPdfs } = await import('./lib/plan-pdf.js')
      const count = await downloadPacketPdfs(planData(), { ids, onProgress: (index, total) => setExportLabel(`Saving file ${index} of ${total}…`) })
      setNotice(count === 1 ? 'Your PDF has been downloaded.' : `${count} PDF files have been downloaded. If your browser asks to allow multiple downloads, choose Allow.`)
    } catch {
      setNotice('The files could not be created. Please try downloading them again.')
    } finally { setExporting(false); setExportLabel('') }
  }
  async function downloadComparison() {
    if (exporting || savedHomes.length < 2) return
    setExporting(true)
    try {
      const { downloadComparisonPdf } = await import('./lib/plan-pdf.js')
      await downloadComparisonPdf(savedHomes, intake.personName)
      setNotice('Your comparison PDF has been downloaded.')
    } catch {
      setNotice('The comparison PDF could not be created. Please try again.')
    } finally { setExporting(false) }
  }
  const inviteBase = () => `${window.location.origin}${window.location.pathname}`
  const clearJoinParam = () => { try { if (window.location.search) window.history.replaceState(null, '', window.location.pathname) } catch { /* The address bar is cosmetic. */ } }
  async function copyText(text, message) {
    try { await window.navigator.clipboard.writeText(text); setNotice(message) } catch { setNotice('Copying isn’t available here. Select the text and copy it.') }
  }
  function startInvite(person) {
    try { createInvite(planId, { memberName: person.name, relationship: person.relationship, email: person.email }) } catch (error) { setNotice(error.message); return }
    setLinks(familyLinks(planId, accountId)); setModal({ type: 'invite', name: person.name })
  }
  // Adds a person or updates their details. Returns a message to show in the form when something is wrong.
  function saveMember(values, existing) {
    const person = existing ? existing.name : values.name
    if (!existing) {
      if (!person) return 'Enter a first name or nickname.'
      if (person === 'Unassigned' || isGroupMember(person) || members.some((m) => m.toLowerCase() === person.toLowerCase())) return 'Please choose a different name.'
    }
    if (values.phone && !isValidPhone(values.phone)) return 'Enter a phone number with at least 7 digits, or leave it blank.'
    if (values.email && !isValidEmail(values.email)) return 'Enter an email address like daniel@example.com.'
    const contact = normalizeContact({ relationship: values.relationship, phone: values.phone, email: existing?.hasAccount ? existing.email : values.email, shareWithHome: values.shareWithHome })
    try {
      if (existing?.hasAccount) updateAccountContact(existing.email, { phone: contact.phone, relationship: contact.relationship })
      if (values.invite) createInvite(planId, { memberName: person, relationship: contact.relationship, email: contact.email })
    } catch (error) { return error.message }
    if (!existing) setMembers([...members, person])
    setContacts({ ...contacts, [person]: contact })
    setLinks(familyLinks(planId, accountId))
    if (values.invite) setModal({ type: 'invite', name: person })
    else { setModal(null); setNotice(existing ? 'Contact details saved.' : `${person} was added to the family list.`) }
    return undefined
  }
  function removeInvite(code) {
    try { cancelInvite(planId, code) } catch (error) { setNotice(error.message); return }
    setLinks(familyLinks(planId, accountId)); setModal(null); setNotice('Invite canceled.')
  }
  function joinPlan(values) {
    try {
      const session = acceptInvite(values.code, values)
      applySession(session); restorePlan(session.draft); setPage(resumePage(session.draft)); setAuthError(''); clearJoinParam()
      setNotice('You joined the family plan. Your contact details were added.')
      return undefined
    } catch (error) { return error.message || 'We couldn’t join this plan. Please try again.' }
  }
  function auth(e) {
    e.preventDefault(); const data = new FormData(e.currentTarget)
    try {
      const session = modal.type === 'account' ? createDemoAccount(data.get('email'), String(data.get('name') || ''), String(data.get('phone') || '')) : signInDemoAccount(data.get('email'))
      applySession(session); restorePlan(session.draft); setPage(resumePage(session.draft)); setAuthError(''); setNotice(modal.type === 'account' ? 'Your new plan is ready. Let’s get started.' : 'Your saved plan is open.')
    } catch (error) { setAuthError(error.message || 'We couldn’t open this demo plan. Please try again.') }
  }
  function actions(previous, next, label = 'Continue') {
    return <div className="form-actions"><button className="text-button" onClick={() => setPage(previous)}><Icon name="back" size={17} />Back</button><span className="save-hint"><Icon name="shield" size={15} />{storageSaved ? 'Saved on this device' : 'Browser storage unavailable · download your plan'}</span><button className="button primary" onClick={() => { if (next === 'overview') setOnboardingComplete(true); setPage(next) }}>{label}<Icon name="arrow" size={18} /></button></div>
  }
  function openPreferences(startStep = 0) {
    setPreferenceDraft(window.structuredClone(intake)); setProfileDraft(window.structuredClone(profile)); setPreferenceStep(Number.isInteger(startStep) ? startStep : 0); setConfirmPreferences(false); setModal({ type: 'preferences' })
  }
  function patchPreferences(values) {
    setPreferenceDraft((current) => ({ ...current, ...values, ...('currentSetting' in values && values.currentSetting !== 'Hospital' ? { dischargeDate: '', hospitalStatus: 'Not sure' } : {}) }))
  }
  function savePreferences() {
    setIntake(preferenceDraft); setProfile(profileDraft); setModal(null); setConfirmPreferences(false); setNotice('Your preferences have been saved.')
  }
  function requestClosePreferences() {
    if (JSON.stringify(preferenceDraft) !== JSON.stringify(intake) || JSON.stringify(profileDraft) !== JSON.stringify(profile)) setConfirmPreferences(true)
    else setModal(null)
  }
  function preferenceActions() {
    return <div className="form-actions preference-actions">{preferenceStep > 0 && <button className="text-button" onClick={() => setPreferenceStep(preferenceStep - 1)}><Icon name="back" size={17} />Back</button>}<div className="preference-action-buttons"><button className="button secondary" onClick={savePreferences}>Save changes</button>{preferenceStep < intakeSteps.length - 1 && <button className="button primary" onClick={() => setPreferenceStep(preferenceStep + 1)}>Continue<Icon name="arrow" size={18} /></button>}</div></div>
  }
  function details(id) { setDetailTab('Overview'); setModal({ type: 'facility', id }) }
  function help(topic = 'Start here') { setHelpTopic(topic); setModal({ type: 'help' }) }
  function goHome() { setReturnPage(page); setPage('welcome') }
  return <>
    {page === 'welcome' ? <Welcome onStart={() => setModal({ type: 'account' })} onSignIn={() => setModal({ type: 'signin' })} onJoin={() => setModal({ type: 'join' })} accountControls={(accountId || legacyActive) && <ProfileMenu caregiverName={accountName || intake.caregiverName} personName={name} onPreferences={openPreferences} onSignOut={signOut} />} onResume={(accountId || legacyActive) ? () => setPage(returnPage) : undefined} resumeLabel={onboardingComplete ? 'Open my plan' : 'Continue setup'} /> : <div className={`app-shell ${step >= 0 ? 'onboarding-shell' : ''}`} inert={modal ? true : undefined}>
      <a className="skip-link" href="#main">Skip to content</a>
      {step < 0 && <aside className="sidebar"><CarebridgeLogo onClick={goHome} /><nav className="primary-navigation" aria-label="Your plan navigation">{nav.map(([id, label]) => <button className={`primary-nav-link section-${id} ${page === id ? 'active' : ''}`} key={id} aria-label={label} aria-current={page === id ? 'page' : undefined} onClick={() => setPage(id)}><span className="primary-nav-label">{label}</span></button>)}</nav></aside>}
      <div className="workspace">
        <header className="workspace-header">{step >= 0 ? <><CarebridgeLogo onClick={goHome} /><div className="account-controls"><span className="onboarding-label">Getting started · Step {step + 1} of {intakeSteps.length}</span><ProfileMenu caregiverName={accountName || intake.caregiverName} personName={name} onPreferences={openPreferences} onSignOut={signOut} /></div></> : <div className="account-controls"><ProfileMenu caregiverName={accountName || intake.caregiverName} personName={name} onPreferences={openPreferences} onSignOut={signOut} /><button className="icon-button settings-button" aria-label="Settings — My preferences" title="My preferences" onClick={openPreferences}><Icon name="settings" size={24} /></button></div>}</header>
        <main id="main" tabIndex={-1} ref={mainRef}><div className="page-content" key={page}><div className="page-heading"><div><h1>{headings[page][1]}</h1><p className="intro">{headings[page][2]}</p></div>{page === 'plan' && <button className="button primary" disabled={exporting} onClick={() => downloadPacket()}><Icon name="download" size={17} />{exporting ? (exportLabel || 'Creating files…') : 'Download full plan'}</button>}</div>
          {step >= 0 && <IntakeProgress step={step} onChange={(i) => setPage(intakeSteps[i][0])} />}

          {step >= 0 && <IntakeWorkflow page={page} intake={intake} patch={patch} profile={profile} patchProfile={(values) => setProfile((current) => ({ ...current, ...values }))} actions={actions} />}

          {page === 'overview' && <>
            <div className="overview-grid"><section className="journey-card"><div><h2>Compare homes for {name}</h2><p>Use the needs and priorities you’ve recorded to prepare questions for each nursing home.</p><button className="button cream" onClick={() => setPage('facilities')}>Explore nursing homes <Icon name="arrow" size={18} /></button></div><div className="journey-illustration" aria-hidden="true"><BridgeMark /><span className="illustration-sun" /><span className="illustration-ground" /></div></section><section className="panel at-glance"><h2>Planning details</h2>{[['pin', 'Search area', intake.searchLocation || 'Your area'], ['clock', 'Possible move', intake.dischargeDate || intake.timing], ['people', 'Current setting', intake.currentSetting || 'Still exploring']].map(([icon, label, val]) => <div className="glance-row" key={label}><Icon name={icon} /><span>{label}<strong>{val}</strong></span></div>)}<button className="text-button" onClick={openPreferences}><Icon name="edit" size={15} />Review your answers</button></section></div>
            <div className="section-title-row"><h2>What to do next</h2></div><div className="next-steps">{[{ icon: 'book', title: 'Discuss care options', text: 'Review the support needs you’ve recorded and questions for the care team.', action: () => document.getElementById('care-options').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }), label: 'See care options' }, { icon: 'home', title: 'Compare nursing homes', text: 'Check services and save homes to discuss with your family.', action: () => setPage('facilities'), label: 'Explore nursing homes' }, { icon: 'list', title: 'Prepare for move-in', text: `Your checklist has ${tasks.length} tasks based on the needs you recorded.`, action: () => setPage('plan'), label: 'Open your plan' }].map((item, i) => <button className="next-step-card" key={item.title} onClick={item.action}><div className={`step-art art-${i}`}><Icon name={item.icon} size={27} /></div><h3>{item.title}</h3><p>{item.text}</p><span className="text-link">{item.label}<Icon name="arrow" size={17} /></span></button>)}</div>
            <section className="panel ai-guidance" aria-live="polite"><div className="section-title-row"><div><h2>Care options in plain language</h2></div></div>{guidanceStatus === 'ready' || guidance?.explainer ? <><p>{guidance.explainer}</p>{guidanceStatus === 'loading' && <p className="field-hint">Updating for your latest answers…</p>}</> : guidanceStatus === 'error' ? <p className="field-hint" role="alert">We couldn’t reach the guidance service right now, so the prepared summary below is shown instead.</p> : <p className="field-hint" role="status">Preparing an explainer from your answers…</p>}<span className="draft-note">Informational only · No care level or eligibility has been determined. Ask the doctor or discharge planner.</span></section>
            <div className="summary-grid" id="care-options"><section className="panel"><div className="section-heading"><span className="soft-icon"><Icon name="heart" /></span><div><h2>Care needs to discuss</h2></div></div><p>{summary.supportSummary}</p><p>{summary.prioritiesSummary}</p><div className="care-options">{[['Skilled nursing & recovery', 'Ask the care team whether a nursing home recovery stay fits the support they recommend.'], ['Longer-term nursing care', 'Discuss ongoing daily support, nursing needs, and the person’s preferences.'], ['Other options to discuss', 'Ask about home support, assisted living, or memory care where appropriate.']].map(([title, text]) => <details key={title}><summary>{title}<Icon name="chevron" size={16} /></summary><p>{text}</p></details>)}</div><span className="draft-note">Draft for review · No care level or eligibility has been determined.</span></section><section className="panel questions-panel"><h2>Questions for the care team</h2><ol>{(guidanceReady && guidance.questions.length ? guidance.questions : summary.questions).slice(0, 8).map((q) => <li key={q}>{q}</li>)}</ol>{intake.currentSetting === 'Hospital' && <p className="question-highlight">“Can you confirm whether the hospital stay is inpatient or observation?”</p>}<button className="text-button" onClick={() => help('Care team')}>View care-team questions <Icon name="arrow" size={16} /></button></section></div>
          </>}

          {page === 'facilities' && <>
            <div className="facility-toolbar panel"><div><strong><Icon name="pin" size={17} />{live ? (catalogState.resolved ? `Tennessee · near ${catalogState.center?.label || 'Nashville'}` : `No match for “${intake.searchLocation}”`) : 'Nashville, Tennessee'}</strong><small>{live ? (catalogState.resolved ? 'Real CMS records, ranked by match score. The score combines CMS data with your priorities.' : `We couldn’t find “${intake.searchLocation}” in the Tennessee data. Try a Tennessee city or ZIP code.`) : intake.searchLocation && !/nashville|372/.test(intake.searchLocation.toLowerCase()) ? `Your preference: ${intake.searchLocation}. Showing Nashville examples only.` : 'Fictional options, shown without a best-home ranking.'}</small></div><label>Travel range<select value={intake.travelMiles} onChange={(e) => patch({ travelMiles: Number(e.target.value) })}>{[5, 10, 15, 25, 50].map((v) => <option key={v} value={v}>Within {v} miles</option>)}{![5, 10, 15, 25, 50].includes(intake.travelMiles) && <option value={intake.travelMiles}>Within {intake.travelMiles} miles</option>}</select></label><label>Sort by<select value={effectiveSort} onChange={(e) => setSort(e.target.value)}>{live && <option value="score">Best match score</option>}<option value="distance">Distance</option><option value="name">Name: A–Z</option><option value="staffing">{live ? 'Nurse staffing hours' : 'Sample staffing hours'}</option></select></label></div>
            <div className="filter-row"><div className="filter-chips">{(live ? liveFilters : ['All sample options', 'Short recovery stays', 'Memory support']).map((v) => <button key={v} className={program === v ? 'active' : ''} aria-pressed={program === v} onClick={() => setProgram(v)}>{v}</button>)}</div><span>{listed.length} {live ? 'facilities' : 'sample options'}</span></div>
            {live && catalogState.resolved && rankIds.length > 0 && <ScoreBanner shares={shares} name={name} reasons={scoreReasons(needs, intake.priorityWeights)}><PriorityTuner applied={intake.priorityWeights} onApply={applyPriorities} busy={refreshing} /></ScoreBanner>}
            {catalogState.source === 'loading' && <div className="panel empty-state" role="status"><Icon name="home" size={35} /><h2>Loading nursing homes…</h2><p>Fetching Tennessee records from Medicare Care Compare data.</p></div>}
            <div className="facility-grid">{listed.map((f) => <article className="facility-card" key={f.id}><div className={`facility-image ${f.isFictional ? '' : 'live-rating'}`}>{f.isFictional ? <><Building variant={facilities.indexOf(f)} /><span className="fictional-label">FICTIONAL FACILITY</span></> : <ScoreHeader f={f} rank={rankIds.indexOf(f.id) + 1 || null} total={rankIds.length} moved={movedFor(f.id)} />}<button className={`save-home ${shortlist.includes(f.id) ? 'saved' : ''}`} aria-label={`${shortlist.includes(f.id) ? 'Unsave' : 'Save'} ${f.name}`} aria-pressed={shortlist.includes(f.id)} onClick={() => toggleSaved(f.id)}><Icon name="heart" size={20} /></button></div><div className="facility-body"><div className="facility-title"><h2>{f.name}</h2>{f.distance !== null && f.distance !== undefined && <span><Icon name="pin" size={14} />{f.distance} mi</span>}</div><p className="facility-location">{f.location.replace(' · demo location', '')}</p><div className="facility-features">{f.provides.slice(0, 2).map((v) => <span key={v}>{v}</span>)}{!f.isFictional && <span>{f.overall === null ? 'CMS overall: not rated' : `CMS overall: ${f.overall} of 5 stars`}</span>}</div>{!f.isFictional && <StrengthWatch f={f} />}<button className="button facility-details" onClick={() => details(f.id)}>View facility details <Icon name="arrow" size={17} /></button></div></article>)}</div>
            {!listed.length && catalogState.source !== 'loading' && <div className="panel empty-state"><Icon name="home" size={35} /><h2>{live && !catalogState.resolved ? 'No results for that location.' : 'No sample options in this range.'}</h2><p>{live && !catalogState.resolved ? 'This demo covers Tennessee nursing homes. Change the location in “Your family’s priorities”.' : 'Try a wider travel range or another filter.'}</p>{!(live && !catalogState.resolved) && <button className="button secondary" onClick={() => { patch({ travelMiles: live ? 25 : 15 }); setProgram(live ? 'All facilities' : 'All sample options') }}>Reset filters</button>}</div>}
            <p className="metric-note">{live ? <>Source: CMS Care Compare (Provider Data Catalog), Tennessee. Distances are straight-line from the middle of your search area. The match score is our summary of CMS data and your priorities. It is not medical advice or a guarantee of care. <a href="https://www.medicare.gov/care-compare/" target="_blank" rel="noreferrer">Open Medicare Care Compare <Icon name="external" size={12} /></a></> : <>Distances, services, and staffing figures are invented examples. No provider data or live availability is connected. <a href="https://www.medicare.gov/care-compare/" target="_blank" rel="noreferrer">Find real facilities on Medicare Care Compare <Icon name="external" size={12} /></a></>}</p>
            <div className="shortlist-bar"><div><span className="soft-icon"><Icon name="heart" size={21} /></span><span><strong>{savedHomes.length} places saved</strong><small>{savedHomes.length < 2 ? 'Save at least two to compare the details.' : 'Compare the homes on your shortlist.'}</small></span></div><div><button className="button secondary" disabled={savedHomes.length < 2} onClick={() => setModal({ type: 'comparison' })}>Compare saved</button><button className="button primary" onClick={() => setPage('plan')}>Your move-in plan <Icon name="arrow" size={17} /></button></div></div>
          </>}

          {page === 'plan' && <>
            <div className="plan-top"><section className="plan-progress-card"><span className="progress-ring" style={{ '--progress': `${percent}%` }}><span>{percent}<small>%</small></span></span><div><h2>{done} of {tasks.length} steps complete</h2></div></section><section className="timing-card"><Icon name="clock" size={25} /><div><h2>{intake.dischargeDate || intake.timing}</h2></div></section></div>
            <Tabs items={planTabs} value={planTab} onChange={setPlanTab} label="Transition plan sections" />
            <div className="plan-layout"><section role="tabpanel" aria-labelledby={`tab-${planTab.replaceAll(' ', '-')}`} className="panel plan-panel">
              {planTab === 'Checklist' && <><div className="section-title-row"><div><h2>Move-in checklist</h2></div><span className="draft-badge">FAMILY DRAFT</span></div><p className="field-hint">Based on your answers. Typical items: confirm with your facility. Medicare and Medicaid details change, so verify them at Medicare.gov or your state Medicaid agency.</p>{guidanceStatus === 'loading' && !guidance && <p className="field-hint" role="status">Building your checklist…</p>}<div className="task-list">{tasks.map((task, i) => { const soon = guidance?.tasks?.length ? task.priority === 1 : i < 2; return <div className={`task-row ${completed.includes(task.id) ? 'done' : ''}`} key={task.id}><label><input type="checkbox" checked={completed.includes(task.id)} onChange={() => toggleDone(task.id)} /><span><strong>{task.label}</strong><small>{task.detail}</small><span className={`task-timing ${soon ? 'soon' : ''}`}>{soon ? 'Start here' : 'Before move-in'}</span>{task.category && <span className="task-category">{categoryLabels[task.category] || task.category}</span>}</span></label><label className="task-owner"><span className="sr-only">Assign: {task.label}</span><select value={assignees[task.id] || 'Unassigned'} onChange={(e) => { setAssignees({ ...assignees, [task.id]: e.target.value }); patchTask(task.id, { assignee: e.target.value }) }}><option>Unassigned</option>{members.map((m) => <option key={m}>{m}</option>)}</select></label></div> })}</div></>}
              {planTab === 'Documents & packing' && <><h2>Documents and packing</h2><p className="field-hint">Ask the facility which documents to bring and which supplies it provides.</p>{packingGroups.map(([title, items], group) => <div className="packing-group" key={title}><h3>{title}</h3>{items.map((item, i) => <label className="packing-item" key={item}><input type="checkbox" checked={completed.includes(`packing-${group}-${i}`)} onChange={() => toggleDone(`packing-${group}-${i}`)} />{item}</label>)}</div>)}</>}
              {planTab === 'Family' && <><div className="section-title-row"><div><h2>Family members</h2></div><button className="button secondary small" onClick={() => setModal({ type: 'member' })}><Icon name="plus" size={16} />Add family member</button></div><p className="field-hint">Add family and their contact details. People you mark are listed on the sheet for the nursing home. You can also invite someone to Carebridge so they can see and update this plan. Anyone listed can be given checklist tasks.</p><FamilyList family={family} canInvite={Boolean(planId)} youName={youName} taskCounts={Object.fromEntries(members.map((m) => [m, tasks.filter((t) => assignees[t.id] === m).length]))} onEdit={(person) => setModal({ type: 'member-edit', name: person.name })} onInvite={startInvite} onShowInvite={(person) => setModal({ type: 'invite', name: person.name })} /><div className="gentle-callout"><Icon name="heart" /><p>Include {name} in conversations and choices wherever possible. A plan works best when it reflects their wishes.</p></div><button className="text-button" onClick={() => setPlanTab('Checklist')}>Assign tasks in your checklist <Icon name="arrow" size={16} /></button></>}
              {planTab === 'Downloads' && <><div className="section-title-row"><div><h2>Your move-in packet</h2></div><span className="draft-badge">FAMILY DRAFT</span></div><p className="field-hint">Everything you may want to hand over or take along. Files are made in your browser and are not uploaded anywhere. Review each one before sharing it.</p>
                <div className="packet-actions"><button className="button primary" disabled={exporting} onClick={() => downloadPacket()}><Icon name="download" size={17} />{exporting ? (exportLabel || 'Creating files…') : `Download full plan (${packet.filter((item) => item.available).length} files)`}</button><span className="field-hint">Your browser may ask to allow multiple downloads. Choose Allow.</span></div>
                <ul className="packet-list">{packet.map((item) => <li key={item.id}><div><strong>{item.title}</strong><small>{item.description}</small>{!item.available && <small className="packet-unavailable">{item.unavailableReason}</small>}</div><button className="button secondary small" disabled={exporting || !item.available} onClick={() => downloadPacket([item.id])}><Icon name="download" size={15} />Download</button></li>)}</ul>
                <div className="packet-knowme"><h3>{name}’s Know Me profile</h3><p className="field-hint">Answered in your setup. Review it with {name}, then add or change anything before you share it.</p><div className="know-me-actions"><button className="button secondary" onClick={() => setModal({ type: 'profile' })}><Icon name="book" size={18} />Preview Know Me</button><button className="button secondary" onClick={() => openPreferences(intakeSteps.length - 1)}><Icon name="edit" size={18} />Edit answers</button>{guidance?.planId && <button className="button secondary" disabled={knowMeState === 'loading'} onClick={draftKnowMe}><Icon name="chat" size={18} />{knowMeState === 'loading' ? 'Drafting…' : profile.aiDraft ? 'Redraft with AI' : 'Draft with AI'}</button>}</div>{knowMeState === 'error' && <p className="field-hint" role="alert">We couldn’t draft the profile right now. You can still preview and download what you wrote.</p>}{profile.aiDraft && <p className="field-hint">An AI draft is saved with your plan. Preview it, review it with {name}, and edit before sharing.</p>}</div></>}
            </section><aside className="plan-side"><section className="panel shortlist-panel"><h2>{selectedHome ? 'Selected nursing home' : 'Saved nursing homes'}</h2>{selectedHome ? <>{selectedHome.isFictional && <Building variant={facilities.indexOf(selectedHome)} />}<h3>{selectedHome.name}</h3><p>{selectedHome.isFictional ? 'Fictional selection for planning only. No reservation or admission has been made.' : 'Planning reference only. No reservation or admission has been made.'}</p><button className="text-button" onClick={() => setChosenFacility('')}>Clear selection</button></> : savedHomes.length ? savedHomes.map((f) => <button className="saved-place" key={f.id} onClick={() => details(f.id)}><Icon name="home" size={18} /><span>{f.name}</span><Icon name="arrow" size={15} /></button>) : <p>Save homes from the comparison screen to see them here.</p>}<button className="button secondary full" onClick={() => setPage('facilities')}>Explore nursing homes <Icon name="arrow" size={16} /></button></section><section className="help-card"><Icon name="chat" size={26} /><h3>Questions about the move?</h3><p>Read prepared guidance on care-team conversations, coverage questions, and packing.</p><button className="text-button" onClick={() => help()}>View help topics <Icon name="arrow" size={16} /></button></section></aside></div>
          </>}
        </div></main>
      </div><ColorVisionControls value={colorVisionMode} onChange={setColorVisionMode} /><button className="floating-help" onClick={() => help()} aria-label="Open guided help" title="Guided help"><Icon name="info" size={23} /></button>
    </div>}
    {(modal?.type === 'account' || modal?.type === 'signin') && <Dialog title={modal.type === 'signin' ? 'Open your saved plan' : 'Create a transition plan'} subtitle="Your plan is stored in this browser." onClose={closeModal}>
      <div className="account-demo-note"><Icon name="shield" size={18} />Demo only.</div>
      <form onSubmit={auth} className="account-form" autoComplete="off">
        {modal.type === 'account' && <label className="text-field">Your first name<input name="name" placeholder="e.g. Maria" required maxLength={50} /></label>}
        <label className="text-field">Demo email<input name="email" type="email" placeholder="maria@example.com" required autoComplete="off" /></label>
        {modal.type === 'account' && <label className="text-field">Phone<span className="optional">So the nursing home can reach you</span><input name="phone" type="tel" inputMode="tel" maxLength={30} placeholder="(615) 555-0142" autoComplete="off" /></label>}
        <label className="text-field">Demo password<input name="password" type="password" placeholder="Use any made-up password" required autoComplete="new-password" minLength={4} /></label>
        <p className="field-hint">Your demo email identifies your saved plan on this device. Passwords are not checked, saved, or sent anywhere. This is a simulated account.</p>
        {authError && <p className="account-error" role="alert">{authError}</p>}
        <button className="button primary full" type="submit">{modal.type === 'signin' ? 'Open workspace' : 'Create a plan'}<Icon name="arrow" size={17} /></button>
      </form>
      {loadDraft() && <button className="text-button account-switch" onClick={() => {
        let previous
        try { previous = openPreviousDemoPlan() } catch { setAuthError('Your browser could not open the previous plan.'); return }
        applySession(null); setLegacyActive(true); restorePlan(previous); setPage(resumePage(previous))
      }}>Open the previous unlinked plan on this device</button>}
      <div className="account-divider"><span>or view a completed example</span></div>
      <button className="button secondary full" onClick={sample}>See an example profile.</button>
      <button className="text-button account-switch" onClick={() => setModal({ type: modal.type === 'account' ? 'signin' : 'account' })}>{modal.type === 'account' ? 'Already have a plan? Sign in' : 'New here? Start a plan'}</button>
      <button className="text-button account-switch" onClick={() => setModal({ type: 'join' })}>Have an invite code? Join a family plan</button>
    </Dialog>}
    {modal?.type === 'preferences' && <Dialog wide className="preferences-dialog" title={confirmPreferences ? 'Save your changes?' : 'My preferences'} subtitle={confirmPreferences ? undefined : 'Review your situation, everyday support, family priorities, and Know Me profile.'} onClose={confirmPreferences ? () => setConfirmPreferences(false) : requestClosePreferences}>
      {confirmPreferences ? <div className="unsaved-confirmation"><p>Save your updates before closing, or discard them to keep your previous answers.</p><div className="confirmation-actions"><button className="button primary" onClick={savePreferences}>Save changes</button><button className="button secondary" onClick={() => { setModal(null); setConfirmPreferences(false) }}>Discard changes</button><button className="text-button" onClick={() => setConfirmPreferences(false)}>Keep editing</button></div></div> : <><div className="preferences-section-label"><Icon name="settings" size={18} />My preferences</div><IntakeProgress step={preferenceStep} onChange={setPreferenceStep} /><h3 className="preferences-step-heading">{headings[intakeSteps[preferenceStep][0]][1]}</h3><IntakeWorkflow page={intakeSteps[preferenceStep][0]} intake={preferenceDraft} patch={patchPreferences} profile={profileDraft} patchProfile={(values) => setProfileDraft((current) => ({ ...current, ...values }))} actions={preferenceActions} editing /></>}
    </Dialog>}
    {activeFacility && <Dialog title={activeFacility.name} subtitle={activeFacility.isFictional ? 'Fictional sample facility · no live availability or provider data' : 'CMS Care Compare data · no live availability or costs'} onClose={closeModal} wide>{activeFacility.isFictional && <Building variant={facilities.indexOf(activeFacility)} />}<Tabs items={['Overview', 'Inspection', 'Call questions']} value={detailTab} onChange={setDetailTab} label="Facility details" /><div role="tabpanel" aria-labelledby={`tab-${detailTab.replaceAll(' ', '-')}`} className="facility-dialog-content">{detailTab === 'Overview' && !activeFacility.isFictional && <LiveOverview f={activeFacility} />}{detailTab === 'Overview' && activeFacility.isFictional && <><p>{activeFacility.description}</p><div className="detail-facts">{[['Example distance', `${activeFacility.distance} miles`], ['Sample nursing hours', `${activeFacility.staffingHours} / resident / day`], ['Example languages', activeFacility.languages.join(', ')], ['Example room options', activeFacility.roomOptions.join(', ')]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><h3>Services shown in this example</h3><div className="facility-features">{activeFacility.provides.map((v) => <span key={v}>{v}</span>)}</div><div className="gentle-callout"><Icon name="clock" /><p>Confirm openings, support needs, coverage, and costs. None have been verified in this prototype.</p></div></>}{detailTab === 'Inspection' && !activeFacility.isFictional && <LiveInspection f={activeFacility} detail={facilityDetails[activeFacility.ccn]} ask={askState} onAsk={askFacility} />}{detailTab === 'Inspection' && activeFacility.isFictional && <><span className="draft-badge">ILLUSTRATIVE REPORT</span><h3>{activeFacility.inspectionLabel}</h3><p>{activeFacility.inspectionNote}</p><div className="question-highlight">Ask: “What was identified in the most recent inspection, and what has changed since?”</div><a className="text-link" href="https://www.medicare.gov/care-compare/" target="_blank" rel="noreferrer">Look up real records on Medicare Care Compare <Icon name="external" size={15} /></a></>}{detailTab === 'Call questions' && <><p className="field-hint">A starting script for your family. This demo does not place calls.</p><p className="call-script">“Hello, I’m helping {name} explore a nursing home stay. Could we talk through a few questions?”</p><ol className="question-list">{[...activeFacility.questions, 'Do you have an opening for our possible move date?', 'Who can explain the costs and coverage for our situation?'].map((q) => <li key={q}>{q}</li>)}</ol></>}</div><div className="dialog-actions"><button className="button secondary" aria-pressed={shortlist.includes(activeFacility.id)} onClick={() => toggleSaved(activeFacility.id)}><Icon name="heart" size={17} />{shortlist.includes(activeFacility.id) ? 'Saved to shortlist' : 'Save this place'}</button><button className="button primary" onClick={() => { setChosenFacility(activeFacility.id); setShortlist((current) => current.includes(activeFacility.id) ? current : [...current, activeFacility.id]); setPage('plan'); setModal(null); setNotice(activeFacility.isFictional ? 'Sample facility added to your draft plan. No booking has been made.' : 'Facility added to your draft plan as a planning reference. No booking has been made.') }}>Use in my draft plan <Icon name="arrow" size={17} /></button></div></Dialog>}
    {modal?.type === 'comparison' && <Dialog title="Your shortlist, side by side" wide className="comparison-dialog" onClose={closeModal}><FacilityComparison homes={savedHomes} onDetails={(id) => details(id)} onDownload={downloadComparison} exporting={exporting} /></Dialog>}
    {modal?.type === 'member' && <Dialog title="Add a family member" subtitle="Add their contact details, and invite them to Carebridge if you like." onClose={closeModal}><MemberForm canInvite={Boolean(planId)} residentName={name} onSubmit={(values) => saveMember(values, null)} /></Dialog>}
    {modal?.type === 'member-edit' && family.find((person) => person.name === modal.name) && <Dialog title="Contact details" subtitle="Used on the nursing-home sheet and in your plan." onClose={closeModal}><MemberForm person={family.find((person) => person.name === modal.name)} canInvite={Boolean(planId)} residentName={name} onSubmit={(values) => saveMember(values, family.find((person) => person.name === modal.name))} /></Dialog>}
    {modal?.type === 'invite' && links.byMember[modal.name] && <Dialog title={`Invite ${modal.name}`} subtitle="Share the link or the code." onClose={closeModal}><InviteReady invite={{ memberName: modal.name, code: links.byMember[modal.name].code }} link={inviteLink(inviteBase(), links.byMember[modal.name].code)} ownerName={links.owner?.name} mailto={family.find((person) => person.name === modal.name)?.email ? inviteMailto({ email: family.find((person) => person.name === modal.name).email, ownerName: links.owner?.name, link: inviteLink(inviteBase(), links.byMember[modal.name].code), code: links.byMember[modal.name].code }) : ''} onCopy={copyText} onCancel={() => removeInvite(links.byMember[modal.name].code)} /></Dialog>}
    {modal?.type === 'join' && <Dialog title="Join a family plan" subtitle="Register with your own contact details to see and update a family’s plan." onClose={() => { clearJoinParam(); closeModal() }}><div className="account-demo-note"><Icon name="shield" size={18} />Demo only.</div><JoinForm initialCode={joinCode} onSubmit={joinPlan} /><button className="text-button account-switch" onClick={() => { clearJoinParam(); setModal({ type: 'signin' }) }}>Already registered? Sign in</button></Dialog>}
    {modal?.type === 'profile' && <Dialog title={`Hello, I’m ${name}.`} subtitle="Know Me · a family-written draft to review together" onClose={closeModal}><div className="know-me-preview"><span className="profile-flower"><Icon name="sun" size={46} /></span><p>Review these details with {name} before sharing them with staff.</p>{[['My morning routine', profile.morning], ['Things I enjoy', profile.interests?.join(', ')], ['What brings comfort', profile.comforts?.join(', ')], ['How to connect with me', profile.communication?.join(', ')], ['Other things to know', profile.notes]].filter(([, value]) => value).map(([label, value]) => <div key={label}><h3>{label}</h3><p>{value}</p></div>)}{profile.aiDraft && <><span className="draft-badge">AI DRAFT · REVIEW BEFORE SHARING</span>{knowMeSections.filter(([key]) => profile.aiDraft[key]).map(([key, label]) => <div key={key}><h3>{label}</h3><p>{profile.aiDraft[key]}</p></div>)}</>}</div><button className="button primary full" disabled={exporting} onClick={() => download('know-me')}><Icon name="download" size={17} />{exporting ? 'Creating PDF...' : 'Download Know Me PDF'}</button></Dialog>}
    {modal?.type === 'help' && <Dialog title="Help with your transition plan" onClose={closeModal}><div className="help-topics">{['Start here', 'Care team', 'Coverage', 'What to bring'].map((topic) => <button className={helpTopic === topic ? 'selected' : ''} key={topic} onClick={() => setHelpTopic(topic)}>{topic}</button>)}</div><div className="help-response" aria-live="polite"><span className="soft-icon"><Icon name="chat" size={21} /></span>{helpTopic === 'Start here' && <><h3>Where to start</h3><p>Record what you know about {name} in the intake. You can leave answers blank and update them after speaking with the care team.</p></>}{helpTopic === 'Care team' && <><h3>Questions for the care team</h3><ul>{(intake.currentSetting === 'Hospital' ? careQuestions.hospital : careQuestions.general).map((q) => <li key={q}>{q}</li>)}</ul></>}{helpTopic === 'Coverage' && <><h3>What to ask about coverage</h3><p>Ask the insurer or benefits contact and facility what applies to this person’s situation, what needs approval, and what costs to expect.</p><p>This prototype doesn’t check benefits or determine eligibility.</p><a className="text-link" href="https://www.medicare.gov/" target="_blank" rel="noreferrer">Visit Medicare.gov <Icon name="external" size={14} /></a></>}{helpTopic === 'What to bring' && <><h3>What to pack</h3><p>Ask the facility for its packing list and what it provides. Your plan has a sample checklist for clothing, personal aids, documents, and familiar comforts.</p><button className="button secondary" onClick={() => { setPlanTab('Documents & packing'); setPage('plan'); setModal(null) }}>Open packing checklist <Icon name="arrow" size={16} /></button></>}</div><p className="field-hint">Your family and care team review the plan and make decisions.</p></Dialog>}
    <div className="toast-region" role="status" aria-live="polite">{notice && <div className="toast"><Icon name="check" size={18} />{notice}</div>}</div>
  </>
}
