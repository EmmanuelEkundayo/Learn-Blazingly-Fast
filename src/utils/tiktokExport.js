import html2canvas from 'html2canvas'
import JSZip from 'jszip'

/**
 * Renders a slide element to a high-resolution canvas formatted for TikTok (9:16).
 */
export async function renderSlideCanvas(element) {
  if (!element) return null

  return await html2canvas(element, {
    backgroundColor: '#0a0d14',
    scale: 2.5, // Crisp 1080x1920 equivalent
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
    link.download = filename || 'tiktok-slide.png'
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
 * - 01-cover.png
 * - 02-simulation.png
 * - 03-intuition.png
 * - 04-gotchas.png
 * - 05-terminal-exercise.png
 * - 06-call-to-action.png
 * - caption.txt (pre-formatted TikTok caption & hashtags)
 */
export async function exportCarouselZip(slideElements, concept, onProgress) {
  try {
    const zip = new JSZip()
    const folderName = `${concept.slug}-tiktok-carousel`
    const folder = zip.folder(folderName)

    const filenames = [
      '01-cover.png',
      '02-visual-simulation.png',
      '03-intuition-analogy.png',
      '04-gotchas-pro-tips.png',
      '05-terminal-exercise.png',
      '06-call-to-action.png',
    ]

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
          folder.file(filenames[i] || `slide-0${i + 1}.png`, blob)
        }
      }
    }

    // Include pre-written viral TikTok caption file
    const captionText = getTikTokCaption(concept)
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
 * Generates an engaging, algorithm-optimized TikTok caption.
 */
export function getTikTokCaption(concept) {
  const title = concept.title || 'Tech Concept'
  const domain = concept.domain || 'Computer Science'

  return `Master ${title} in 60 seconds ⚡️ (Swipe for the breakdown)

💡 Tech Concept of the Day: ${title}
📚 Domain: ${domain}
🧠 Can you spot the answer in Slide 5? Drop your solution in the comments! 👇

Learn 550+ concepts with interactive step-by-step simulators:
🔗 learnblazinglyfast.tech (Link in bio)

⭐ 100% Free & Open Source on GitHub:
EmmanuelEkundayo/Learn-Blazingly-Fast

Like & share to help another developer level up! 🚀

#coding #programming #developer #softwareengineer #tech #computerscience #algorithms #learnblazinglyfast #webdev #frontend #systemdesign #codinginterview`
}
