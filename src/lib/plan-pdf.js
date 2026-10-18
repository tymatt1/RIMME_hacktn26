import { createPlanDocument, planPdfFilename } from './plan-document.js'
import { createComparisonDocument, comparisonPdfFilename } from './comparison-document.js'

// Loaded only when requested; fonts are bundled and no report data leaves the browser.
async function downloadPdf(document, filename) {
  const [{ default: pdfMake }, { default: fonts }] = await Promise.all([
    import('pdfmake/build/pdfmake.js'),
    import('pdfmake/build/vfs_fonts.js'),
  ])
  pdfMake.addVirtualFileSystem(fonts)
  await pdfMake.createPdf(document).download(filename)
}

export async function downloadPlanPdf(data, kind = 'plan') {
  await downloadPdf(createPlanDocument(data, { kind }), planPdfFilename(data.intake?.personName, kind))
}

export async function downloadComparisonPdf(homes, name) {
  await downloadPdf(createComparisonDocument(homes, name), comparisonPdfFilename(name))
}
