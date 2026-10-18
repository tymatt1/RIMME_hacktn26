import { createPlanDocument, planPdfFilename } from './plan-document.js'
import { createComparisonDocument, comparisonPdfFilename } from './comparison-document.js'

// Loaded only when requested; fonts are bundled and no report data leaves the browser.
async function loadPdfMake() {
  const [{ default: pdfMake }, { default: fonts }] = await Promise.all([
    import('pdfmake/build/pdfmake.js'),
    import('pdfmake/build/vfs_fonts.js'),
  ])
  pdfMake.addVirtualFileSystem(fonts)
  return pdfMake
}

async function downloadPdf(document, filename) {
  const pdfMake = await loadPdfMake()
  await pdfMake.createPdf(document).download(filename)
}

const pause = (ms) => new Promise((resolve) => { setTimeout(resolve, ms) })

// Download every available file in the move-in packet (or only the ids given), one after another.
export async function downloadPacketPdfs(data, { ids, onProgress } = {}) {
  const { packetItems } = await import('./packet-documents.js')
  const items = packetItems(data).filter((item) => item.available && (!ids || ids.includes(item.id)))
  const pdfMake = await loadPdfMake()
  for (const [index, item] of items.entries()) {
    onProgress?.(index + 1, items.length)
    await pdfMake.createPdf(item.create()).download(item.filename)
    if (index < items.length - 1) await pause(450)
  }
  return items.length
}

export async function downloadPlanPdf(data, kind = 'plan') {
  await downloadPdf(createPlanDocument(data, { kind }), planPdfFilename(data.intake?.personName, kind))
}

export async function downloadComparisonPdf(homes, name) {
  await downloadPdf(createComparisonDocument(homes, name), comparisonPdfFilename(name))
}
