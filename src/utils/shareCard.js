import html2canvas from 'html2canvas'

/**
 * Render the share card element to a high-resolution canvas.
 */
export async function renderCardCanvas(element) {
  if (!element) return null

  return await html2canvas(element, {
    backgroundColor: '#0b0e14',
    scale: 1.5, // 1200x630 * 1.5 = 1800x945 ultra-crisp output
    logging: false,
    useCORS: true,
    width: element.offsetWidth || 1200,
    height: element.offsetHeight || 630,
  })
}

/**
 * Generates and downloads a share card PNG.
 * @param {HTMLElement} element - The card element to capture.
 * @param {string} slug - The concept slug for the filename.
 */
export async function generateShareCard(element, slug) {
  try {
    const canvas = await renderCardCanvas(element)
    if (!canvas) return false

    const image = canvas.toDataURL('image/png', 1.0)
    const link = document.createElement('a')
    link.href = image
    link.download = `${slug}-learnblazinglyfast.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    return true
  } catch (err) {
    console.error('Failed to generate share card:', err)
    return false
  }
}

/**
 * Copies the share card image directly to the system clipboard as a PNG blob.
 * @param {HTMLElement} element - The card element to capture.
 * @returns {Promise<boolean>} True if copied successfully.
 */
export async function copyShareCardImage(element) {
  try {
    const canvas = await renderCardCanvas(element)
    if (!canvas) return false

    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) return resolve(false)
        try {
          if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob }),
            ])
            resolve(true)
          } else {
            resolve(false)
          }
        } catch (clipErr) {
          console.warn('Direct image clipboard copy not supported or denied:', clipErr)
          resolve(false)
        }
      }, 'image/png')
    })
  } catch (err) {
    console.error('Failed to copy card image to clipboard:', err)
    return false
  }
}

/**
 * Native OS share sheet with attached PNG card file (for iOS Safari & Android Chrome).
 * @param {HTMLElement} element - The card element to capture.
 * @param {object} concept - Concept metadata.
 * @returns {Promise<boolean>} True if native share succeeded.
 */
export async function shareCardViaNative(element, concept) {
  if (!navigator.share || !navigator.canShare) return false

  try {
    const canvas = await renderCardCanvas(element)
    if (!canvas) return false

    const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'))
    if (!blob) return false

    const file = new File([blob], `${concept.slug}-card.png`, { type: 'image/png' })
    const shareData = {
      title: `${concept.title} — Learn Blazingly Fast`,
      text: `The Visual Guide to ${concept.title} on Learn Blazingly Fast`,
      url: `https://learnblazinglyfast.tech/concept/${concept.slug}`,
      files: [file],
    }

    if (navigator.canShare({ files: [file] })) {
      await navigator.share(shareData)
      return true
    }
    return false
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.warn('Native share failed, falling back:', err)
    }
    return false
  }
}
