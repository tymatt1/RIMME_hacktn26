import { createPlanDocument, planPdfFilename } from './plan-document.js'

// Loaded only when requested; fonts are bundled and no report data leaves the browser.
export async function downloadPlanPdf(data, kind = 'plan') {
  const [{ default: pdfMake }, { default: fonts }] = await Promise.all([
    import('pdfmake/build/pdfmake.js'),
    import('pdfmake/build/vfs_fonts.js'),
  ])
  pdfMake.addVirtualFileSystem(fonts)
  await pdfMake.createPdf(createPlanDocument(data, { kind })).download(planPdfFilename(data.intake?.personName, kind))
}
