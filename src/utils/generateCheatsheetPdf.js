import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export async function generateCheatsheetPdf(element, title) {
  const canvas = await html2canvas(element, {
    backgroundColor: '#0d0d0f',
    scale: 2,
    useCORS: true,
    logging: false,
  })

  const imgData = canvas.toDataURL('image/png')
  const imgWidth = canvas.width
  const imgHeight = canvas.height

  const pdfWidth = 297
  const pdfHeight = 210

  const ratio = pdfWidth / imgWidth
  const scaledHeight = imgHeight * ratio

  const pdf = new jsPDF({
    orientation: scaledHeight > pdfHeight ? 'portrait' : 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  let position = 0
  const pageContentHeight = pdfHeight

  while (position < scaledHeight) {
    if (position > 0) pdf.addPage()

    pdf.addImage(
      imgData,
      'PNG',
      0,
      -position,
      pdfWidth,
      scaledHeight,
      undefined,
      'FAST'
    )

    position += pageContentHeight
  }

  pdf.save(`${title || 'cheatsheet'}.pdf`)
}
