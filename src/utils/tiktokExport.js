import html2canvas from 'html2canvas'
import JSZip from 'jszip'

/**
 * Open TikTok Web Upload studio in a new tab.
 */
export function openTikTokUpload() {
  window.open('https://www.tiktok.com/upload?from=webapp', '_blank', 'noopener,noreferrer')
}

/**
 * Renders a slide element to a high-resolution canvas formatted in 4:5 vertical carousel ratio (1080x1350).
 */
export async function renderSlideCanvas(element) {
  if (!element) return null

  return await html2canvas(element, {
    backgroundColor: '#0b0e14',
    scale: 2.0, // 540x675 * 2 = 1080x1350 crisp native resolution
    logging: false,
    useCORS: true,
    allowTaint: true,
  })
}

/**
 * Downloads a single slide as a high-res PNG.
 */
export async function downloadSlidePNG(element, filename) {
  try {
    const canvas = await renderSlideCanvas(element)
    if (!canvas) return false

    const image = canvas.toDataURL('image/png', 1.0)
    const link = document.createElement('a')
    link.href = image
    link.download = filename || 'carousel-slide.png'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    return true
  } catch (err) {
    console.error('Failed to download slide PNG:', err)
    return false
  }
}

/**
 * Copies a slide image directly to the system clipboard.
 */
export async function copySlideImageToClipboard(element) {
  try {
    const canvas = await renderSlideCanvas(element)
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
          console.warn('Clipboard image copy failed or denied:', clipErr)
          resolve(false)
        }
      }, 'image/png')
    })
  } catch (err) {
    console.error('Failed to copy slide to clipboard:', err)
    return false
  }
}

/**
 * Exports all slides bundled as a single ZIP file containing:
 * - 01-*.png through 0N-*.png
 * - caption.txt (clean, developer-tailored TikTok/LinkedIn caption with zero emojis)
 */
export async function exportCarouselZip(slideElements, slug, filenames, captionText, onProgress) {
  try {
    const zip = new JSZip()
    const folderName = `${slug}-carousel-slides`
    const folder = zip.folder(folderName)

    for (let i = 0; i < slideElements.length; i++) {
      if (onProgress) {
        onProgress(i + 1, slideElements.length)
      }
      const el = slideElements[i]
      if (!el) continue

      const canvas = await renderSlideCanvas(el)
      if (canvas) {
        const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'))
        if (blob) {
          const fname = filenames?.[i] || `slide-0${i + 1}.png`
          folder.file(fname, blob)
        }
      }
    }

    // Include caption file
    folder.file('caption.txt', captionText)

    const zipContent = await zip.generateAsync({ type: 'blob' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(zipContent)
    link.download = `${folderName}.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)

    return true
  } catch (err) {
    console.error('Failed to generate carousel ZIP:', err)
    return false
  }
}

/**
 * Generates a clean, developer-tailored TikTok caption without emojis.
 */
export function getTikTokCaption(concept) {
  const title = concept?.title || 'Tech Concept'
  const domain = concept?.domain || 'Computer Science'

  return `The Visual Guide to ${title}.

Tech Concept of the Day: ${title}
Domain: ${domain}
Category: Visual Tech Dictionary for Developers

Can you solve the coding challenge on Slide 06? Drop your answer in the comments.

Explore 550+ interactive step-by-step visualizers:
learnblazinglyfast.tech (Visit site for GitHub repo link)

100% Free & Open Source developer education.

Like and share to support open-source developer tooling.

#coding #programming #developer #softwareengineer #computerscience #algorithms #learnblazinglyfast #webdev #frontend #systemdesign #codinginterview`
}
