import { bridgeMarkSvg } from './brand.js'
import { packingGroups } from '../data/packing.js'
import { statusLabels } from './family.js'
import { importanceLabel, normalizePriorityWeights, priorityTopics } from './priorities.js'

export const ink = '#174d43'
export const muted = '#596658'
const line = '#dce2d5'
export function reportHeader(date, width = 520) {
  return { margin: [46, 25, 46, 0], stack: [
    { columns: [
      { width: 32, svg: bridgeMarkSvg, height: 29 },
      { text: [{ text: 'carebridge', color: ink, fontSize: 23, bold: true }, { text: '.', color: '#b57f61', fontSize: 23, bold: true }], width: 155, margin: [7, 2, 0, 0] },
      { text: date, alignment: 'right', fontSize: 9, color: muted, margin: [0, 9, 0, 0] },
    ] },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: width, y2: 0, lineWidth: 0.7, lineColor: line }], margin: [0, 9, 0, 0] },
  ] }
}
export const clean = (value) => String(value ?? '').replace(/[\u2010-\u2015\u2212]/g, '-').replaceAll(String.fromCharCode(0), '').trim()
export const list = (value) => Array.isArray(value) ? value.map(clean).filter(Boolean).join(', ') : clean(value)
export const recorded = (value) => list(value) || 'Not recorded'
export const row = (label, value) => [{ text: label, color: muted, fontSize: 9.5 }, { text: recorded(value) }]
export const heading = (text, pageBreak) => ({ text, style: 'sectionHeading', ...(pageBreak ? { pageBreak: 'before' } : {}) })
export const paragraph = (text) => ({ text: clean(text), margin: [0, 0, 0, 10] })
export const tableLayout = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0,
  hLineColor: () => line,
  paddingLeft: () => 8,
  paddingRight: () => 8,
  paddingTop: () => 5,
  paddingBottom: () => 5,
}

export function details(rows) {
  return { table: { widths: [140, '*'], body: rows }, layout: { ...tableLayout, paddingTop: () => 3.5, paddingBottom: () => 3.5 }, fontSize: 10, lineHeight: 1.15, margin: [0, 0, 0, 12] }
}

export function records(headers, rows, widths) {
  return {
    table: { headerRows: 1, keepWithHeaderRows: 1, widths, body: [headers.map((text) => ({ text, bold: true, color: ink, fillColor: '#edf1e7', fontSize: 9.5 })), ...rows] },
    layout: tableLayout,
    margin: [0, 0, 0, 14],
  }
}

export function knowMeRows(profile = {}) {
  return [
    ['Morning routine', profile.morning],
    ['Interests', list(profile.interests)],
    ['Comfort and reassurance', list(profile.comforts)],
    ['Communication preferences', list(profile.communication)],
  ]
}

export function knowMeDraftBlocks(profile = {}) {
  const content = []
  if (profile.aiDraft && Object.values(profile.aiDraft).some(Boolean)) {
    content.push({ text: 'Supplemental profile draft', style: 'subheading' }, { text: 'AI-generated text. Review with the resident and family before sharing.', style: 'note', margin: [0, 0, 0, 10] })
    for (const [key, value] of Object.entries(profile.aiDraft)) {
      if (typeof value !== 'string' || !value.trim()) continue
      content.push({ text: clean(key.replaceAll('_', ' ')).replace(/^./, (letter) => letter.toUpperCase()), style: 'subheading' }, paragraph(value))
    }
  }
  return content
}

function knowMeContent(name, profile = {}, startPage = false, includeHeading = true) {
  const content = [...(includeHeading ? [heading('Know Me profile', startPage)] : []), { text: name, style: 'residentName' }, paragraph('Resident preferences and routines for the receiving care team.'), details(knowMeRows(profile).map(([label, value]) => row(label, value)))]
  content.push({ text: 'Additional information', style: 'subheading' }, paragraph(profile.notes || 'No additional information recorded.'), ...knowMeDraftBlocks(profile))
  return content
}

/** Shared page setup so every Carebridge PDF looks the same. */
export function baseDocument({ title, subject = 'Family nursing home transition planning', footerLabel = 'Family planning document', generatedAt = new Date() } = {}) {
  const date = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'America/Chicago' }).format(generatedAt)
  return {
    pageSize: 'LETTER', pageMargins: [46, 88, 46, 52],
    info: { title, author: 'Carebridge', subject, creator: 'Carebridge', creationDate: generatedAt },
    defaultStyle: { font: 'Roboto', fontSize: 10.5, lineHeight: 1.25, color: '#25382f' },
    styles: {
      title: { fontSize: 24, bold: true, color: ink, margin: [0, 0, 0, 10] },
      residentName: { fontSize: 15, color: ink, margin: [0, 0, 0, 12] },
      sectionHeading: { fontSize: 15, bold: true, color: ink, margin: [0, 12, 0, 10] },
      subheading: { fontSize: 12, bold: true, color: ink, margin: [0, 12, 0, 8] },
      note: { fontSize: 9, color: muted, lineHeight: 1.4 },
    },
    header: () => reportHeader(date),
    footer: (page, pages) => ({ margin: [46, 15, 46, 0], columns: [
      { text: footerLabel, color: muted, fontSize: 8 },
      { text: `Page ${page} of ${pages}`, alignment: 'right', color: muted, fontSize: 8 },
    ] }),
  }
}

/** Pure report definition. It includes recorded facts, without generating new advice. */
export function createPlanDocument(data = {}, { kind = 'plan', generatedAt = new Date() } = {}) {
  const intake = data.intake || {}
  const priorityWeights = normalizePriorityWeights(intake.priorityWeights)
  const name = clean(intake.personName) || 'Resident name not recorded'
  const isProfile = kind === 'know-me'
  const title = isProfile ? 'Know Me Profile' : 'Nursing Home Transition Plan'
  const tasks = Array.isArray(data.checklist) ? data.checklist : []
  const completedPacking = new Set(data.checkedPackingItems || [])
  const facilities = [...new Map([...(data.facilities || []), ...(data.planningFacility ? [data.planningFacility] : [])].map((facility) => [facility.id, facility])).values()]
  const content = [{ text: title, style: 'title' }]

  if (isProfile) {
    content.push(...knowMeContent(name, data.knowMe, false, false), { text: 'Reviewed by: ________________________    Date: ______________', style: 'note', margin: [0, 24, 0, 0] })
  } else {
    content.push(
      { text: `Prepared for ${name}`, style: 'residentName' },
      paragraph('Family planning document. Review care arrangements, facility availability, costs, and coverage with the receiving facility and care team.'),
      heading('Planning details'),
      details([
        row('Resident', intake.personName), row('Age range', intake.ageRange), row('Family contact', intake.caregiverName),
        row('Relationship', intake.relationship), row('Current setting', intake.currentSetting), row('Planned move', intake.dischargeDate || intake.timing),
        row('Type of stay', intake.stayType), row('Selected nursing home', data.planningFacility?.name || 'Not selected'),
      ]),
      heading('Daily support needs'),
      details([
        row('Mobility', intake.mobility), row('Bed and chair transfers', intake.transferHelp),
        ...Object.entries(intake.dailySupport || {}).map(([key, value]) => row(({ bathing: 'Bathing', dressing: 'Dressing', toileting: 'Bathroom assistance', eating: 'Eating', medicines: 'Medicines' })[key] || key, value)),
        row('Memory and orientation', intake.memorySupport), row('Communication support', intake.communication), row('Spoken language', intake.language),
      ]),
      heading('Family preferences', true),
      details([
        row('Search area', intake.searchLocation), row('Family travel range', Number.isFinite(intake.travelMiles) ? `Up to ${intake.travelMiles} miles` : ''),
        row('Monthly family budget', Number.isFinite(intake.monthlyBudget) ? `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(intake.monthlyBudget)} out of pocket` : 'Not yet determined'),
        row('Coverage recorded', intake.coverage), row('Rehabilitation recommended', intake.rehabilitationPreference), row('Room preference', intake.roomPreference),
        row('Language or cultural needs', intake.facilityPreferences), row('Coordination', intake.coordinators), row('Available family help', intake.familySupport),
      ]),
      heading('What matters most'),
      data.intake?.priorityWeights
        ? records(['Priority', 'How much it matters (0–100)'], priorityTopics.map((topic) => [clean(topic), `${importanceLabel(priorityWeights[topic])} (${priorityWeights[topic]})`]), ['*', 150])
        : paragraph('No priorities have been recorded.'),
      ...(intake.additionalPriorities?.length ? [paragraph(`Other topics previously marked important: ${list(intake.additionalPriorities)}.`)] : []),
      heading('Move-in checklist', true),
      paragraph(`${tasks.filter((task) => task.completed).length} of ${tasks.length} recorded tasks completed.`),
      ...(data.aiAssistedChecklist ? [{ text: 'AI-assisted draft checklist. Review tasks with the family and care team.', style: 'note', margin: [0, 0, 0, 12] }] : []),
      tasks.length ? records(['Status', 'Task and notes', 'Assigned to'], tasks.map((task) => [
        { text: task.completed ? 'Complete' : 'Pending', fontSize: 9, color: task.completed ? ink : muted },
        { stack: [{ text: clean(task.label), bold: true }, ...(task.detail ? [{ text: clean(task.detail), fontSize: 10, color: muted, margin: [0, 4, 0, 0] }] : [])] },
        { text: recorded(task.assignedTo || 'Unassigned'), fontSize: 10 },
      ]), [48, '*', 78]) : paragraph('No checklist tasks recorded.'),
      heading('Documents and packing', true),
      paragraph('Confirm admission documents and packing requirements with the facility before move-in.'),
      ...packingGroups.flatMap(([group, items], groupIndex) => [
        records(['Status', group], items.map((item, index) => [
          { text: completedPacking.has(`packing-${groupIndex}-${index}`) ? 'Complete' : 'Pending', fontSize: 9, color: muted }, clean(item),
        ]), [48, '*']),
      ]),
      heading('Family contacts'),
      ...(Array.isArray(data.familyContacts) && data.familyContacts.some((person) => person.role !== 'group')
        ? [records(['Name', 'Role', 'Phone', 'Email', 'Carebridge'], data.familyContacts.filter((person) => person.role !== 'group').map((person) => [
          { text: clean(person.displayName || person.name), bold: true },
          { text: [person.role === 'main' ? 'Main contact' : 'Family member', clean(person.relationship)].filter(Boolean).join(', '), fontSize: 9.5 },
          { text: clean(person.phone) || 'Not recorded', fontSize: 9.5 },
          { text: clean(person.email) || 'Not recorded', fontSize: 9.5 },
          { text: statusLabels[person.status] || '', fontSize: 9 },
        ]), [70, 90, 85, '*', 70]), { text: 'Contact details were entered by the family. People marked private are left off the sheet for the nursing home.', style: 'note', margin: [0, 0, 0, 10] }]
        : [data.family?.length ? paragraph(data.family.map(clean).join(', ')) : paragraph('No family contacts recorded.')]),
    )

    if (facilities.length) {
      content.push(heading('Nursing homes under consideration', true))
      for (const facility of facilities) {
        const source = facility.isFictional ? 'Fictional example - not a real care option' : 'CMS Care Compare records'
        content.push(
          { text: clean(facility.name), style: 'subheading' },
          details([
            row('Location', facility.location), row('Record source', source), row('Planning status', facility.id === data.planningFacility?.id ? 'Selected for planning; admission not confirmed' : 'Saved to shortlist'),
            row('Distance', Number.isFinite(facility.distance) ? `${facility.distance} miles` : 'Not recorded'),
            row('Services listed', facility.provides), row('Nursing hours reported', Number.isFinite(facility.staffingHours) ? `${facility.staffingHours} hours per resident per day${facility.isFictional ? ' (fictional figure)' : ''}` : 'Not recorded'),
          ]),
        )
        if (!facility.isFictional) content.push({ text: 'Verify current facility records on Medicare Care Compare.', link: 'https://www.medicare.gov/care-compare/', color: ink, fontSize: 9.5, margin: [0, 0, 0, 16] })
      }
    }
    content.push(...knowMeContent(name, data.knowMe, true))
  }

  return {
    ...baseDocument({ title: `${name} - ${title}`, footerLabel: isProfile ? 'Resident profile - family review required' : 'Family planning document', generatedAt }),
    content,
  }
}

export function planPdfFilename(name, kind = 'plan') {
  const safeName = clean(name).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 60)
  const slug = { plan: 'transition-plan', 'know-me': 'know-me-profile' }[kind] || kind
  return `carebridge-${safeName ? `${safeName}-` : ''}${slug}.pdf`
}
