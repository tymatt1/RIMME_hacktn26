import { baseDocument, clean, createPlanDocument, details, heading, ink, knowMeDraftBlocks, knowMeRows, muted, paragraph, planPdfFilename, recorded, row, tableLayout } from './plan-document.js'
import { comparisonPdfFilename, createComparisonDocument } from './comparison-document.js'
import { packetListing } from './packet-meta.js'
import { packingGroups } from '../data/packing.js'
import { careQuestions } from '../data/prototype.js'

const activityLabels = { bathing: 'Bathing', dressing: 'Dressing', toileting: 'Bathroom assistance', eating: 'Eating', medicines: 'Medicines' }
const blankRow = (label) => [{ text: label, color: muted, fontSize: 9.5 }, { text: ' ', margin: [0, 7, 0, 7] }]
// Keep a heading together with its table so a section never starts at the bottom of a page.
const section = (title, ...blocks) => ({ stack: [heading(title), ...blocks], unbreakable: true })
const residentName = (intake) => clean(intake?.personName) || 'Resident name not recorded'
const note = (text, margin = [0, 0, 0, 10]) => ({ text, style: 'note', margin })
// The intake asks "Who are you planning for?", so the answer describes the resident, not the contact.
const relationshipText = (value) => {
  const answer = clean(value)
  if (!answer) return ''
  if (answer === 'Myself') return 'The family contact is the resident'
  if (answer === 'Someone else') return 'Someone the family contact is helping'
  return `The resident is the family contact’s ${answer.toLowerCase()}`
}
// The family list starts with placeholder names ("Me", "Family"); only real names belong on a handoff sheet.
const otherFamily = (data) => {
  const skip = new Set(['me', 'family', clean(data.intake?.caregiverName).toLowerCase()])
  return (Array.isArray(data.family) ? data.family : []).map(clean).filter((member) => member && !skip.has(member.toLowerCase()))
}
const checkbox = (checked) => ({ canvas: [{ type: 'rect', x: 0, y: 1, w: 11, h: 11, lineWidth: 1, lineColor: ink, ...(checked ? { color: ink } : {}) }], width: 14 })

/**
 * A short sheet the family can hand to the nursing home. It repeats what the family recorded and leaves
 * blanks for medical details the app never collects. It adds no advice and leaves out the family's budget and priorities.
 */
export function createHandoffDocument(data = {}, { generatedAt = new Date() } = {}) {
  const intake = data.intake || {}
  const name = residentName(intake)
  const home = data.planningFacility
  const content = [
    { text: 'Resident Information for the Care Team', style: 'title' },
    { text: name, style: 'residentName' },
    note('Prepared by the family to share with the nursing home. It reflects what the family reported. It is not a medical record or a clinical assessment, so the care team should confirm the details with the resident and family.'),
    ...(home ? [{ text: `Prepared for: ${clean(home.name)}`, bold: true, color: ink, margin: [0, 0, 0, 6] }] : []),
    section('About the resident', details([
      row('Preferred name', intake.personName), row('Age range', intake.ageRange), row('Spoken language', intake.language), row('Communication supports', intake.communication),
      row('Current setting', intake.currentSetting), row('Planned move or discharge date', intake.dischargeDate || intake.timing), row('Type of stay', intake.stayType),
      ...(intake.currentSetting === 'Hospital' ? [row('Hospital admission status', intake.hospitalStatus)] : []),
    ])),
    section('Family contact', details([row('Main family contact', intake.caregiverName), row('Relationship', relationshipText(intake.relationship)), blankRow('Phone'), blankRow('Email'), otherFamily(data).length ? row('Other family helping', otherFamily(data)) : blankRow('Other family helping (names and phone)')])),
    section('Daily support needs (family-reported)', details([
      row('Mobility', intake.mobility), row('Bed and chair transfers', intake.transferHelp),
      ...Object.entries(intake.dailySupport || {}).map(([key, value]) => row(activityLabels[key] || key, value)),
      row('Memory and orientation', intake.memorySupport),
    ])),
    section('Preferences', details([
      row('Room preference', intake.roomPreference), row('Rehabilitation recommended by the care team', intake.rehabilitationPreference),
      row('Language or cultural needs', intake.facilityPreferences), row('Coverage the family knows about', intake.coverage),
    ])),
    section('What helps them feel at home', details(knowMeRows(data.knowMe).map(([label, value]) => row(label, value))),
      ...(clean(data.knowMe?.notes) ? [{ text: 'Other things staff should know', style: 'subheading' }, paragraph(data.knowMe.notes)] : [])),
    ...(knowMeDraftBlocks(data.knowMe).length ? [{ stack: knowMeDraftBlocks(data.knowMe), unbreakable: true }] : []),
    section('To complete with the care team', note('Carebridge does not collect medical details. Fill these in with the care team, or attach their own records.'), details([
      blankRow('Primary doctor and phone'), blankRow('Diagnoses and medical history'), blankRow('Medications and allergies (attach the care team’s list)'),
      blankRow('Pharmacy'), blankRow('Dietary needs or restrictions'), blankRow('Who decides if the resident cannot (name and phone)'), blankRow('Advance directive or care wishes on file (where kept)'),
    ])),
    { text: 'Reviewed with the care team by: ________________________    Date: ______________', style: 'note', margin: [0, 18, 0, 0] },
  ]
  return {
    ...baseDocument({ title: `${name} - Resident Information for the Care Team`, subject: 'Family-prepared resident information for a nursing home', footerLabel: 'Family-prepared summary - confirm with the care team', generatedAt }),
    content,
  }
}

/** Printable move-in tasks and packing list, with empty boxes to tick by hand and filled boxes for what is done. */
export function createChecklistDocument(data = {}, { generatedAt = new Date() } = {}) {
  const intake = data.intake || {}
  const name = residentName(intake)
  const tasks = Array.isArray(data.checklist) ? data.checklist : []
  const checkedPacking = new Set(data.checkedPackingItems || [])
  const content = [
    { text: 'Move-in Checklist and Packing List', style: 'title' },
    { text: `Prepared for ${name}`, style: 'residentName' },
    note('A filled box means the task is marked done in Carebridge. Tick the empty boxes by hand. Confirm documents and packing rules with the facility before move-in.'),
    heading('Move-in tasks'),
    ...(data.aiAssistedChecklist ? [note('AI-assisted draft checklist. Review tasks with the family and care team.', [0, 0, 0, 8])] : []),
    tasks.length
      ? { table: { headerRows: 1, keepWithHeaderRows: 1, dontBreakRows: true, widths: [20, '*', 86], body: [
        [{ text: '', fillColor: '#edf1e7' }, { text: 'Task and notes', bold: true, color: ink, fillColor: '#edf1e7', fontSize: 9.5 }, { text: 'Assigned to', bold: true, color: ink, fillColor: '#edf1e7', fontSize: 9.5 }],
        ...tasks.map((task) => [
          checkbox(Boolean(task.completed)),
          { stack: [{ text: clean(task.label), bold: true }, ...(task.detail ? [{ text: clean(task.detail), fontSize: 9.5, color: muted, margin: [0, 3, 0, 0] }] : [])] },
          { text: recorded(task.assignedTo || 'Unassigned'), fontSize: 9.5 },
        ]),
      ] }, layout: tableLayout, margin: [0, 0, 0, 14] }
      : paragraph('No checklist tasks recorded.'),
    heading('Documents and packing'),
    ...packingGroups.map(([group, items], groupIndex) => ({ unbreakable: true, stack: [
      { text: group, style: 'subheading' },
      { table: { widths: [20, '*'], body: items.map((item, index) => [checkbox(checkedPacking.has(`packing-${groupIndex}-${index}`)), { text: clean(item) }]) }, layout: tableLayout, margin: [0, 0, 0, 10] },
    ] })),
    { text: 'Notes from the facility', style: 'subheading' },
    ...Array.from({ length: 4 }, () => ({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 520, y2: 0, lineWidth: 0.5, lineColor: '#9aa896' }], margin: [0, 16, 0, 0] })),
  ]
  return {
    ...baseDocument({ title: `${name} - Move-in Checklist and Packing List`, subject: 'Printable move-in checklist', footerLabel: 'Move-in checklist - family planning document', generatedAt }),
    content,
  }
}

/** Questions for the care team and for nursing homes, ready to take along to calls and visits. */
export function createQuestionsDocument(data = {}, { generatedAt = new Date() } = {}) {
  const intake = data.intake || {}
  const name = residentName(intake)
  const careTeam = (Array.isArray(data.careTeamQuestions) ? data.careTeamQuestions : []).map(clean).filter(Boolean)
  const homes = (data.facilities || []).filter((home) => Array.isArray(home.questions) && home.questions.length)
  const generic = [...careQuestions.facility, 'Do you have an opening for our possible move date?', 'Who can explain the costs and coverage for our situation?']
  const numbered = (items) => ({ ol: items.map(clean), margin: [0, 0, 0, 10] })
  const content = [
    { text: 'Questions to Ask', style: 'title' },
    { text: `For ${name}`, style: 'residentName' },
    note('Starting points for conversations. They are not medical, legal or financial advice.'),
    heading('Questions for the care team'),
    careTeam.length ? numbered(careTeam) : paragraph('No questions recorded.'),
    ...(clean(data.careExplainer) ? [{ text: 'Care options to talk through', style: 'subheading' }, note('AI-generated draft. It does not decide a level of care. Confirm with the care team.', [0, 0, 0, 6]), paragraph(data.careExplainer)] : []),
    heading('When you call a nursing home'),
    { text: `“Hello, I’m helping ${name === 'Resident name not recorded' ? 'a family member' : name} explore a nursing home stay. Could we talk through a few questions?”`, italics: true, margin: [0, 0, 0, 10] },
    { text: 'Questions for any home', style: 'subheading' },
    numbered(generic),
    ...homes.flatMap((home) => [
      { text: clean(home.name), style: 'subheading' },
      ...(home.isFictional ? [note('Fictional example - not a real care option.', [0, 0, 0, 6])] : []),
      numbered(home.questions),
    ]),
  ]
  return {
    ...baseDocument({ title: `${name} - Questions to Ask`, subject: 'Questions for the care team and nursing homes', footerLabel: 'Questions to ask - family planning document', generatedAt }),
    content,
  }
}

/** Every file in the move-in packet, in the order they download. Nothing here touches the browser or network. */
export function packetItems(data = {}, { generatedAt = new Date() } = {}) {
  const name = data.intake?.personName
  const homes = data.facilities || []
  const options = { generatedAt }
  const files = {
    plan: [planPdfFilename(name, 'plan'), () => createPlanDocument(data, { kind: 'plan', ...options })],
    handoff: [planPdfFilename(name, 'resident-information-for-nursing-home'), () => createHandoffDocument(data, options)],
    'know-me': [planPdfFilename(name, 'know-me'), () => createPlanDocument(data, { kind: 'know-me', ...options })],
    checklist: [planPdfFilename(name, 'move-in-checklist'), () => createChecklistDocument(data, options)],
    questions: [planPdfFilename(name, 'questions-to-ask'), () => createQuestionsDocument(data, options)],
    comparison: [comparisonPdfFilename(name), () => createComparisonDocument(homes, name || '', options)],
  }
  return packetListing(data).map((item) => ({ ...item, filename: files[item.id][0], create: files[item.id][1] }))
}
