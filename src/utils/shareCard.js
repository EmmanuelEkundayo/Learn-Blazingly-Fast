import html2canvas from 'html2canvas'

/**
 * Safely converts a canvas to a Blob, falling back to dataURL if toBlob fails or returns null.
 */
export async function canvasToBlobSafe(canvas) {
  if (!canvas) return null

  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => {
        if (blob && blob.size > 100) {
          resolve(blob)
        } else {
          // Fallback to dataURL conversion
          try {
            const dataUrl = canvas.toDataURL('image/png')
            resolve(dataURItoBlob(dataUrl))
          } catch {
            resolve(null)
          }
        }
      }, 'image/png')
    } catch {
      try {
        const dataUrl = canvas.toDataURL('image/png')
        resolve(dataURItoBlob(dataUrl))
      } catch {
        resolve(null)
      }
    }
  })
}

/**
 * Converts base64 data URI to Blob
 */
export function dataURItoBlob(dataURI) {
  if (!dataURI || !dataURI.includes(',')) return null
  try {
    const byteString = atob(dataURI.split(',')[1])
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i)
    }
    return new Blob([ab], { type: mimeString })
  } catch {
    return null
  }
}

/**
 * Render the on-screen concept card element to a high-resolution canvas.
 * Captures whatever is visible on screen, properly aligned in a mobile-first card format:
 * Definition on top, followed by Visualization below.
 * Spacious card formatting with comfortable padding and large readable typography. Zero emojis added.
 */
export async function renderCardCanvas(element, options = {}) {
  const target = element || (typeof document !== 'undefined' ? document.getElementById('concept-screen-card') : null)
  if (!target) return null

  const cardWidth = options.width || 760

  try {
    // Estimate stacked 1-column height with generous breathing room
    let targetHeight = target.scrollHeight
    const cardSection = target.querySelector('section')
    const vizSection = target.querySelector('#concept-visualization-section')
    if (cardSection && vizSection) {
      const headerHeight = target.querySelector('.border-b')?.offsetHeight || 90
      targetHeight = Math.max(targetHeight, headerHeight + cardSection.scrollHeight + vizSection.scrollHeight + 160)
    } else {
      targetHeight += 120
    }

    const canvas = await html2canvas(target, {
      backgroundColor: '#0d0d0f',
      scale: 2.0, // High-res 2x crisp snapshot
      logging: false,
      useCORS: true,
      allowTaint: false,
      foreignObjectRendering: false,
      windowWidth: cardWidth,
      width: cardWidth,
      height: targetHeight,
      onclone: (clonedDoc) => {
        const clonedCard = clonedDoc.getElementById('concept-screen-card')
        if (clonedCard) {
          clonedCard.style.width = `${cardWidth}px`
          clonedCard.style.maxWidth = `${cardWidth}px`
          clonedCard.style.boxSizing = 'border-box'
          clonedCard.style.margin = '0 auto'
          clonedCard.style.padding = '36px'
          clonedCard.style.backgroundColor = '#141418'
          clonedCard.style.borderColor = '#26262e'
          clonedCard.style.borderWidth = '1px'
          clonedCard.style.borderStyle = 'solid'
          clonedCard.style.borderRadius = '20px'

          // Header spacing & typography
          const titles = clonedCard.querySelectorAll('h1')
          titles.forEach((h1) => {
            h1.style.fontSize = '30px'
            h1.style.lineHeight = '1.25'
            h1.style.letterSpacing = '-0.02em'
          })

          // Re-stack as single column: Definition on top, then Visualization below
          const grid = clonedCard.querySelector('.grid')
          if (grid) {
            grid.classList.remove('lg:grid-cols-2')
            grid.classList.add('grid-cols-1')
            grid.style.display = 'flex'
            grid.style.flexDirection = 'column'
            grid.style.gap = '28px'
          }

          // Enlarge analogy blockquote padding
          const quotes = clonedCard.querySelectorAll('blockquote')
          quotes.forEach((q) => {
            q.style.padding = '14px 18px'
            q.style.fontSize = '14.5px'
            q.style.lineHeight = '1.6'
          })
        }

        // Synchronize active 2D/WebGL canvas states into the cloned DOM
        const origCanvases = target.querySelectorAll('canvas')
        const clonedCanvases = (clonedCard || clonedDoc).querySelectorAll('canvas')
        origCanvases.forEach((orig, idx) => {
          const clone = clonedCanvases[idx]
          if (clone && orig.width && orig.height) {
            const ctx = clone.getContext('2d')
            if (ctx) {
              try {
                ctx.drawImage(orig, 0, 0)
              } catch (e) {
                console.debug('Canvas sync error on clone:', e)
              }
            }
          }
        })
      },
    })
    return canvas
  } catch (err) {
    console.error('Failed to render card canvas:', err)
    return null
  }
}

/**
 * Generates and downloads a share card PNG.
 * @param {HTMLElement} element - The card element to capture (or null to target #concept-screen-card).
 * @param {string} slug - The concept slug for the filename.
 */
export async function generateShareCard(element, slug) {
  try {
    const canvas = await renderCardCanvas(element)
    if (!canvas) return false

    const blob = await canvasToBlobSafe(canvas)
    if (!blob) return false

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${slug || 'concept'}-learnblazinglyfast.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    return true
  } catch (err) {
    console.error('Failed to generate share card:', err)
    return false
  }
}

/**
 * Copies the share card image directly to the system clipboard as a PNG blob.
 * @param {HTMLElement} element - The card element to capture (or null to target #concept-screen-card).
 * @returns {Promise<boolean>} True if copied successfully.
 */
export async function copyShareCardImage(element) {
  try {
    const canvas = await renderCardCanvas(element)
    if (!canvas) return false

    const blob = await canvasToBlobSafe(canvas)
    if (!blob) return false

    if (navigator.clipboard && typeof window.ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ])
      return true
    }
    return false
  } catch (err) {
    console.warn('Direct image clipboard copy not supported or denied:', err)
    return false
  }
}

/**
 * Native OS share sheet with attached PNG card file (for iOS Safari & Android Chrome).
 * @param {HTMLElement} element - The card element to capture (or null to target #concept-screen-card).
 * @param {object} concept - Concept metadata.
 * @returns {Promise<boolean>} True if native share succeeded.
 */
export async function shareCardViaNative(element, concept) {
  if (!navigator.share || !navigator.canShare) return false

  try {
    const canvas = await renderCardCanvas(element)
    if (!canvas) return false

    const blob = await canvasToBlobSafe(canvas)
    if (!blob) return false

    const file = new File([blob], `${concept?.slug || 'concept'}-card.png`, { type: 'image/png' })
    const shareData = {
      title: `${concept?.title || 'Concept'} — Learn Blazingly Fast`,
      text: `The Visual Guide to ${concept?.title || 'this concept'} on Learn Blazingly Fast`,
      url: `https://learnblazinglyfast.tech/concept/${concept?.slug || ''}`,
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

/**
 * Generates and downloads a Pinterest Pin Card PNG.
 * @param {HTMLElement} element - The card element to capture.
 * @param {string} slug - The concept slug.
 */
export async function generatePinterestCard(element, slug) {
  try {
    const canvas = await renderCardCanvas(element, { width: 760 })
    if (!canvas) return false

    const blob = await canvasToBlobSafe(canvas)
    if (!blob) return false

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${slug || 'concept'}-pinterest-pin.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    return true
  } catch (err) {
    console.error('Failed to generate Pinterest card:', err)
    return false
  }
}
