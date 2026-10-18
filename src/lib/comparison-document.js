import { createPlanDocument, planPdfFilename, reportHeader } from './plan-document.js'
import { comparisonRows, comparisonScale } from './facility-comparison.js'

const clean = (value) => String(value ?? '').replace(/[\u2010-\u2015\u2212]/g, '-').replaceAll(String.fromCharCode(0), '')

export function comparisonPdfValue(id, home, fallback) {
  const scale = comparisonScale(id, home)
  if (!scale) return { text: clean(fallback) }
  const label = { text: `${scale.value} / ${scale.max}`, fontSize: 9, margin: [7, 1, 0, 0] }
  if (scale.kind === 'stars') {
    const stars = Array.from({ length: 5 }, (_, index) => `<path transform="translate(${index * 20} 0)" d="M8 1.1 10.1 5.4 14.9 6.1 11.4 9.5 12.2 14.2 8 12 3.8 14.2 4.6 9.5 1.1 6.1 5.9 5.4Z" fill="${index < scale.value ? '#987129' : '#ffffff'}" stroke="${index < scale.value ? '#987129' : '#9ca68d'}" stroke-width="1"/>`).join('')
    return { columns: [{ width: 82, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="17" viewBox="0 0 100 17">${stars}</svg>`, height: 14 }, label] }
  }
  return { columns: [{ width: 90, margin: [0, 4, 0, 0], canvas: [
    { type: 'rect', x: 0, y: 0, w: 90, h: 7, color: '#e3e8db' },
    ...(scale.value > 0 ? [{ type: 'rect', x: 0, y: 0, w: 90 * scale.value / 100, h: 7, color: '#48715c' }] : []),
  ] }, label] }
}

export function comparisonPdfFilename(name) {
  return planPdfFilename(name).replace(/transition-plan\.pdf$/, 'nursing-home-comparison.pdf')
}

export function createComparisonDocument(homes = [], name = '', { generatedAt = new Date() } = {}) {
  const base = createPlanDocument({}, { kind: 'know-me', generatedAt })
  const date = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'America/Chicago' }).format(generatedAt)
  const content = []
  for (let start = 0; start < homes.length; start += 3) {
    const group = homes.slice(start, start + 3)
    content.push(
      { text: 'Nursing Home Comparison', style: 'title', ...(start ? { pageBreak: 'before' } : {}) },
      { text: `${name.trim() ? `Prepared for ${clean(name.trim())} | ` : ''}Homes ${start + 1}-${start + group.length} of ${homes.length}`, fontSize: 11, margin: [0, 0, 0, 12] },
      {
        table: { headerRows: 1, keepWithHeaderRows: 1, dontBreakRows: true, widths: [136, ...group.map(() => '*')], body: [
          [{ text: 'Key facts', bold: true }, ...group.map((home) => ({ text: clean(home.name), bold: true, color: '#174d43' }))],
          ...comparisonRows.map(([id, label, get]) => [{ text: label, color: '#596658', fontSize: 9 }, ...group.map((home) => comparisonPdfValue(id, home, get(home)))]),
        ] },
        layout: {
          hLineWidth: () => 0.5, vLineWidth: () => 0.5,
          hLineColor: () => '#dce2d5', vLineColor: () => '#dce2d5',
          fillColor: (row) => row === 0 ? '#edf1e7' : null,
          paddingTop: () => 6, paddingBottom: () => 6, paddingLeft: () => 8, paddingRight: () => 8,
        }, fontSize: 9.5, lineHeight: 1.15,
      },
      { text: 'Source: CMS Care Compare for real facility records. Fictional examples are labeled. Match scores summarize CMS data and recorded priorities; they do not establish care suitability or admission eligibility. Confirm current costs, coverage, and openings with each facility.', style: 'note', margin: [0, 12, 0, 0] },
    )
  }
  if (!homes.length) content.push({ text: 'Nursing Home Comparison', style: 'title' }, { text: 'No saved nursing homes.' })
  return {
    ...base, pageOrientation: 'landscape', pageMargins: [46, 88, 46, 44],
    info: { ...base.info, title: `${clean(name) || 'Saved homes'} - Nursing Home Comparison`, subject: 'Saved nursing home comparison' },
    header: () => reportHeader(date, 700),
    footer: (page, pages) => ({ margin: [46, 12, 46, 0], columns: [
      { text: 'Nursing home comparison', color: '#596658', fontSize: 8 },
      { text: `Page ${page} of ${pages}`, alignment: 'right', color: '#596658', fontSize: 8 },
    ] }),
    content,
  }
}
