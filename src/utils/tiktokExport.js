import html2canvas from 'html2canvas'
import JSZip from 'jszip'
import { drawCanvasVizFrame } from './visualizerPlayback.js'
import { getInitialThemeForConcept } from './themePalettes.js'

/**
 * Open TikTok Web Upload studio in a new tab.
 */
export function openTikTokUpload() {
  window.open('https://www.tiktok.com/upload?from=webapp', '_blank', 'noopener,noreferrer')
}

/**
 * Open Pinterest Pin creation studio in a new tab.
 */
export function openPinterestUpload() {
  window.open('https://www.pinterest.com/pin-creation-tool/', '_blank', 'noopener,noreferrer')
}

/**
 * Open YouTube Studio for Shorts upload in a new tab.
 */
export function openYouTubeUpload() {
  window.open('https://studio.youtube.com', '_blank', 'noopener,noreferrer')
}

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
 * Renders a slide element to a high-resolution canvas formatted in 4:5 vertical carousel ratio (1080x1350).
 */
export async function renderSlideCanvas(element) {
  if (!element) return null

  try {
    if (typeof HTMLCanvasElement !== 'undefined' && element instanceof HTMLCanvasElement) {
      return element
    }

    const rect = typeof element.getBoundingClientRect === 'function' ? element.getBoundingClientRect() : null
    const isPreview = rect && rect.width > 0 && rect.width < 450
    // If element is on-screen preview (~360px), scale by 3.0 for native 1080x1350
    // If element is full export frame (540x675), scale by 2.0 for native 1080x1350
    const scale = isPreview ? 3.0 : 2.0

    return await html2canvas(element, {
      backgroundColor: '#0b0e14',
      scale,
      logging: false,
      useCORS: true,
      allowTaint: false,
      foreignObjectRendering: false,
      removeContainer: true,
      windowWidth: 1920,
      windowHeight: 10000,
      onclone: (clonedDoc, clonedEl) => {
        // In cloned iframe, ensure offscreen export container is positioned in view for clean canvas capture
        const offscreenContainer = clonedDoc.getElementById('tiktok-offscreen-export-container')
        if (offscreenContainer) {
          offscreenContainer.style.position = 'absolute'
          offscreenContainer.style.left = '0px'
          offscreenContainer.style.top = '0px'
          offscreenContainer.style.overflow = 'visible'
          offscreenContainer.style.visibility = 'visible'
          offscreenContainer.style.display = 'block'
        }
        if (clonedEl && clonedEl.style) {
          clonedEl.style.visibility = 'visible'
        }

        // Sync any live canvas elements
        const origCanvases = element.querySelectorAll('canvas')
        const clonedCanvases = clonedDoc.querySelectorAll('canvas')
        origCanvases.forEach((orig, idx) => {
          const clone = clonedCanvases[idx]
          if (clone && orig.width && orig.height) {
            const ctx = clone.getContext('2d')
            if (ctx) {
              try {
                ctx.drawImage(orig, 0, 0)
              } catch (e) {
                // ignore
              }
            }
          }
        })
      },
    })
  } catch (err) {
    console.error('Failed to render slide canvas with html2canvas:', err)
    return null
  }
}

/**
 * Downloads a single slide as a high-res PNG.
 */
export async function downloadSlidePNG(element, filename) {
  try {
    const canvas = await renderSlideCanvas(element)
    if (!canvas) return false

    const blob = await canvasToBlobSafe(canvas)
    if (!blob) return false

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || 'carousel-slide.png'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 2000)
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
    console.error('Failed to copy slide to clipboard:', err)
    return false
  }
}

/**
 * Exports all slides bundled as a single ZIP file containing:
 * - 01-*.png through 0N-*.png
 * - caption text (clean, developer-tailored caption with zero emojis)
 */
export async function exportCarouselZip(slideElements, slug, filenames, captionText, onProgress, options = {}) {
  try {
    const isPinterest = options?.platform === 'pinterest'
    const zip = new JSZip()
    const folderName = `${slug || 'concept'}-${isPinterest ? 'pinterest-carousel' : 'carousel-slides'}`
    const folder = zip.folder(folderName)

    for (let i = 0; i < slideElements.length; i++) {
      if (onProgress) {
        onProgress(i + 1, slideElements.length)
      }

      // Yield to browser event loop before rendering each slide to eliminate UI freeze/lag
      await new Promise((resolve) => setTimeout(resolve, 50))

      const el = slideElements[i]
      if (!el) continue

      const canvas = await renderSlideCanvas(el)
      if (canvas) {
        const blob = await canvasToBlobSafe(canvas)
        if (blob) {
          const fname = filenames?.[i] || `slide-0${i + 1}.png`
          folder.file(fname, blob)
        }
      }
    }

    // Include caption file
    const captionFilename = isPinterest ? 'pinterest-pin-info.txt' : 'caption.txt'
    folder.file(captionFilename, captionText || '')

    const zipContent = await zip.generateAsync({ type: 'blob' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(zipContent)
    link.href = url
    link.download = `${folderName}.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 2000)

    return true
  } catch (err) {
    console.error('Failed to generate carousel ZIP:', err)
    return false
  }
}

/**
 * Detects supported video MIME types and file extension.
 */
export function getSupportedVideoMimeType() {
  if (typeof window === 'undefined' || !window.MediaRecorder) {
    return { mimeType: 'video/webm', extension: 'webm' }
  }

  const candidates = [
    { mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', extension: 'mp4' },
    { mimeType: 'video/mp4;codecs=avc1', extension: 'mp4' },
    { mimeType: 'video/mp4;codecs=h264', extension: 'mp4' },
    { mimeType: 'video/mp4', extension: 'mp4' },
    { mimeType: 'video/webm;codecs=vp9', extension: 'webm' },
    { mimeType: 'video/webm;codecs=vp8', extension: 'webm' },
    { mimeType: 'video/webm', extension: 'webm' },
  ]

  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c.mimeType)) {
        return c
      }
    } catch {
      // ignore
    }
  }

  return { mimeType: 'video/webm', extension: 'webm' }
}

/**
 * Checks if browser supports in-canvas video capture and MediaRecorder.
 */
export function isVideoExportSupported() {
  if (typeof window === 'undefined') return false
  const hasMediaRecorder = typeof window.MediaRecorder !== 'undefined'
  const hasCaptureStream = typeof HTMLCanvasElement !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function'
  return hasMediaRecorder && hasCaptureStream
}

/**
 * Exports all slides as a vertical video clip (MP4 / WebM).
 * Plays through all 7 slides with live pacing, smooth cross-fades,
 * and a story segment progress bar at the top.
 * Supports standard 4:5 vertical video (TikTok/Reels/Pinterest) or 9:16 (YouTube Shorts).
 */
export async function exportVideoClip(slideElements, slug, onProgress, concept, theme, options = {}) {
  try {
    if (!isVideoExportSupported()) {
      throw new Error('Video recording is not supported in this browser. Use the 7-Slide Carousel ZIP export instead.')
    }

    const resolvedTheme = (typeof theme === 'string' ? { primary: theme, secondary: theme } : theme) || getInitialThemeForConcept(concept)
    const primaryColor = resolvedTheme?.primary || '#38bdf8'

    // Step 1: Pre-render all slides to high-res canvases
    const renderedCanvases = []
    const total = slideElements.length
    for (let i = 0; i < total; i++) {
      if (onProgress) {
        onProgress({
          phase: 'rendering',
          percent: Math.round(((i + 1) / total) * 30),
          currentSec: 0,
          totalSec: 15,
          message: `Rendering slide frame ${i + 1} of ${total}...`
        })
      }
      const el = slideElements[i]
      if (!el) continue
      const c = await renderSlideCanvas(el)
      if (c) renderedCanvases.push(c)
    }

    if (renderedCanvases.length === 0) {
      throw new Error('No slide frames could be captured.')
    }

    // Step 2: Offscreen recording canvas
    const is9x16 = options?.aspectRatio === '9:16' || options?.platform === 'youtube'
    const width = 720
    const height = is9x16 ? 1280 : 900 // 9:16 vertical video (YouTube Shorts) or 4:5 (TikTok/Pinterest)
    const recCanvas = document.createElement('canvas')
    recCanvas.width = width
    recCanvas.height = height
    const ctx = recCanvas.getContext('2d', { alpha: false })

    // Safe zone spacing: clean breathing space at top and bottom of video canvas
    let cardW, cardH, cardX, cardY
    if (is9x16) {
      cardW = 660
      cardH = Math.round(cardW * (675 / 540)) // 825px
      cardX = Math.round((width - cardW) / 2) // 30px
      cardY = Math.round((height - cardH) / 2) // 227px (vertically centered)
    } else {
      const topSafeSpace = 32
      const bottomSafeSpace = 30
      cardH = height - topSafeSpace - bottomSafeSpace // 838px
      cardW = Math.round(cardH * (540 / 675)) // 670px
      cardX = Math.round((width - cardW) / 2) // 25px
      cardY = topSafeSpace // 32px
    }
    const cardRadius = 12

    // Prime the canvas with the first slide
    ctx.fillStyle = '#070a10'
    ctx.fillRect(0, 0, width, height)
    ctx.save()
    fillSafeRoundRect(ctx, cardX, cardY, cardW, cardH, cardRadius)
    ctx.clip()
    ctx.drawImage(renderedCanvases[0], cardX, cardY, cardW, cardH)
    ctx.restore()

    const stream = recCanvas.captureStream(30)
    const { mimeType, extension } = getSupportedVideoMimeType()
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 3500000
    })

    const chunks = []
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data)
    }

    const vizBox = getVizBox(slideElements[1], width, height, cardX, cardY, cardW, cardH)

    // Timing plan: 17.0s total (5.0s dedicated to live visualization playback on slide 2)
    // 7 slides: [2000, 5000, 2000, 2000, 2000, 2000, 2000]
    const defaultDurations = [2000, 5000, 2000, 2000, 2000, 2000, 2000]
    const slideDurations = renderedCanvases.map((_, i) => defaultDurations[i] || 2000)
    const totalDurationMs = slideDurations.reduce((a, b) => a + b, 0) // 17000ms
    const totalSec = parseFloat((totalDurationMs / 1000).toFixed(1))

    const startTimes = []
    let acc = 0
    for (const d of slideDurations) {
      startTimes.push(acc)
      acc += d
    }

    const CROSSFADE_MS = 250

    return new Promise((resolve, reject) => {
      recorder.onstop = () => {
        try {
          const blob = new Blob(chunks, { type: mimeType })
          const url = URL.createObjectURL(blob)
          let platformPrefix = `${Math.round(totalSec)}s-clip`
          if (options?.platform === 'youtube') {
            platformPrefix = 'youtube-shorts'
          } else if (options?.platform === 'pinterest') {
            platformPrefix = 'pinterest-video'
          }
          const filename = `${slug || 'concept'}-${platformPrefix}.${extension}`

          // Trigger automatic download
          const link = document.createElement('a')
          link.href = url
          link.download = filename
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)

          resolve({ success: true, blob, url, filename, extension, mimeType })
        } catch (err) {
          reject(err)
        }
      }

      recorder.onerror = (e) => reject(e)

      recorder.start(1000)

      const startTime = performance.now()

      const frameInterval = setInterval(() => {
        const elapsed = performance.now() - startTime
        const progressRatio = Math.min(1, elapsed / totalDurationMs)
        const currentSec = Math.min(totalSec, parseFloat((elapsed / 1000).toFixed(1)))

        if (onProgress) {
          onProgress({
            phase: 'recording',
            percent: 30 + Math.round(progressRatio * 70),
            currentSec,
            totalSec,
            message: `Encoding ${totalSec.toFixed(1)}s clip... ${currentSec.toFixed(1)}s / ${totalSec.toFixed(1)}s`
          })
        }

        if (elapsed >= totalDurationMs) {
          clearInterval(frameInterval)
          // Draw final clean frame
          ctx.fillStyle = '#070a10'
          ctx.fillRect(0, 0, width, height)
          const lastCanvas = renderedCanvases[renderedCanvases.length - 1]
          ctx.save()
          fillSafeRoundRect(ctx, cardX, cardY, cardW, cardH, cardRadius)
          ctx.clip()
          ctx.drawImage(lastCanvas, cardX, cardY, cardW, cardH)
          ctx.restore()

          // Subtle card border
          ctx.save()
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
          ctx.lineWidth = 1.5
          if (typeof ctx.roundRect === 'function') {
            ctx.beginPath()
            ctx.roundRect(cardX, cardY, cardW, cardH, cardRadius)
            ctx.stroke()
          }
          ctx.restore()

          drawStoryBars(ctx, width, renderedCanvases.length, renderedCanvases.length - 1, 1, primaryColor)
          drawFooterBar(ctx, width, height, totalSec, totalSec, primaryColor)

          setTimeout(() => {
            if (recorder.state !== 'inactive') {
              recorder.stop()
            }
          }, 200)
          return
        }

        // Determine current slide
        let currentIdx = 0
        for (let i = startTimes.length - 1; i >= 0; i--) {
          if (elapsed >= startTimes[i]) {
            currentIdx = i
            break
          }
        }

        const slideStart = startTimes[currentIdx]
        const slideDur = slideDurations[currentIdx]
        const slideElapsed = elapsed - slideStart
        const slideRemaining = slideDur - slideElapsed

        // Clear canvas with dark base
        ctx.fillStyle = '#070a10'
        ctx.fillRect(0, 0, width, height)

        // Draw slide inside card area with crossfade if near transition
        ctx.save()
        fillSafeRoundRect(ctx, cardX, cardY, cardW, cardH, cardRadius)
        ctx.clip()

        if (slideRemaining < CROSSFADE_MS && currentIdx < renderedCanvases.length - 1) {
          const fade = (CROSSFADE_MS - slideRemaining) / CROSSFADE_MS
          ctx.globalAlpha = 1 - fade
          ctx.drawImage(renderedCanvases[currentIdx], cardX, cardY, cardW, cardH)
          if (currentIdx === 1 && concept) {
            const vizRatio = Math.min(1, Math.max(0, slideElapsed / slideDur))
            try {
              drawCanvasVizFrame(ctx, concept, vizBox, vizRatio, resolvedTheme)
            } catch (vizErr) {
              console.warn('Live viz frame render error:', vizErr)
            }
          }
          ctx.globalAlpha = fade
          ctx.drawImage(renderedCanvases[currentIdx + 1], cardX, cardY, cardW, cardH)
          ctx.globalAlpha = 1.0
        } else {
          ctx.globalAlpha = 1.0
          ctx.drawImage(renderedCanvases[currentIdx], cardX, cardY, cardW, cardH)
          // Live playing visualization on Slide 2 (index 1)
          if (currentIdx === 1 && concept) {
            const vizRatio = Math.min(1, Math.max(0, slideElapsed / slideDur))
            try {
              drawCanvasVizFrame(ctx, concept, vizBox, vizRatio, resolvedTheme)
            } catch (vizErr) {
              console.warn('Live viz frame render error:', vizErr)
            }
          }
        }
        ctx.restore()

        // Subtle card border
        ctx.save()
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
        ctx.lineWidth = 1.5
        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath()
          ctx.roundRect(cardX, cardY, cardW, cardH, cardRadius)
          ctx.stroke()
        }
        ctx.restore()

        // Draw Story Segment Progress Bars at top
        const slideRatio = Math.min(1, Math.max(0, slideElapsed / slideDur))
        const storyBarY = is9x16 ? Math.max(20, cardY - 26) : 12
        drawStoryBars(ctx, width, renderedCanvases.length, currentIdx, slideRatio, primaryColor, storyBarY)

        // Draw Footer Bar with live second counter
        const footerBarY = is9x16 ? cardY + cardH + 8 : height - 26
        const footerLabel = is9x16 ? 'YouTube Shorts · 9:16' : 'learnblazinglyfast.tech'
        drawFooterBar(ctx, width, height, currentSec, totalSec, primaryColor, footerBarY, footerLabel)
      }, 1000 / 30) // 30 fps
    })
  } catch (err) {
    console.error('Failed to export video clip:', err)
    return { success: false, error: err.message }
  }
}

function getVizBox(slideEl, canvasWidth, canvasHeight, cardX = 0, cardY = 0, cardW = canvasWidth, cardH = canvasHeight) {
  const frameEl = slideEl?.querySelector?.('[data-viz-frame]')
  if (frameEl && slideEl) {
    const slideRect = slideEl.getBoundingClientRect()
    const frameRect = frameEl.getBoundingClientRect()
    if (slideRect.width > 0 && frameRect.width > 0 && slideRect.height > 0) {
      const scaleX = cardW / slideRect.width
      const scaleY = cardH / slideRect.height
      return {
        x: Math.round(cardX + (frameRect.left - slideRect.left) * scaleX),
        y: Math.round(cardY + (frameRect.top - slideRect.top) * scaleY),
        width: Math.round(frameRect.width * scaleX),
        height: Math.round(frameRect.height * scaleY),
      }
    }
  }
  // Pixel-accurate fallback derived from 540x675 card dimensions scaled to cardW x cardH
  const scale = cardW / 540
  const marginX = Math.round(cardX + 40 * scale)
  const boxW = Math.round(cardW - 80 * scale)
  const boxH = Math.round(boxW / 1.6)
  const boxY = Math.round(cardY + 192 * (cardH / 675))
  return { x: marginX, y: boxY, width: boxW, height: boxH }
}

function fillSafeRoundRect(ctx, x, y, w, h, r) {
  if (w <= 0) return
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
    ctx.fill()
  } else {
    ctx.fillRect(x, y, w, h)
  }
}

function drawStoryBars(ctx, width, totalSegments, currentIdx, currentRatio, primaryColor = '#38bdf8', customBarY = 12) {
  const margin = 24
  const barY = customBarY
  const barH = 3.5
  const gap = 5
  const totalGaps = (totalSegments - 1) * gap
  const segW = (width - margin * 2 - totalGaps) / totalSegments

  ctx.save()
  for (let s = 0; s < totalSegments; s++) {
    const x = margin + s * (segW + gap)
    // Background pill
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
    fillSafeRoundRect(ctx, x, barY, segW, barH, 2)

    // Active fill pill
    if (s < currentIdx) {
      ctx.fillStyle = primaryColor
      fillSafeRoundRect(ctx, x, barY, segW, barH, 2)
    } else if (s === currentIdx) {
      const fillW = Math.max(0, segW * currentRatio)
      ctx.fillStyle = primaryColor
      fillSafeRoundRect(ctx, x, barY, fillW, barH, 2)
    }
  }
  ctx.restore()
}

function drawFooterBar(ctx, width, height, currentSec, totalSec = 17.0, primaryColor = '#38bdf8', customBarY = null, label = 'learnblazinglyfast.tech') {
  ctx.save()
  const barH = 24
  const barY = customBarY !== null ? customBarY : height - 26
  ctx.fillStyle = 'rgba(7, 10, 16, 0.95)'
  ctx.fillRect(0, barY - 2, width, barH + 4)

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, barY - 2)
  ctx.lineTo(width, barY - 2)
  ctx.stroke()

  ctx.fillStyle = '#94a3b8'
  ctx.font = '11px monospace'
  ctx.textBaseline = 'middle'
  const textY = barY + barH / 2
  ctx.fillText(label, 24, textY)

  const timeText = `${parseFloat(currentSec).toFixed(1)}s / ${parseFloat(totalSec).toFixed(1)}s`
  const textW = ctx.measureText(timeText).width
  ctx.fillStyle = primaryColor
  ctx.fillText(timeText, width - textW - 24, textY)
  ctx.restore()
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

/**
 * Generates a clean, SEO-optimized Pinterest Pin title without emojis.
 */
export function getPinterestPinTitle(concept) {
  const title = concept?.title || 'Computer Science Concept'
  return `${title} | Visual Explanation & Complexity`
}

/**
 * Generates a clean, SEO-optimized Pinterest Pin description without emojis.
 */
export function getPinterestPinDescription(concept) {
  const title = concept?.title || 'Computer Science Concept'
  const domain = concept?.domain || 'DSA'
  const time = concept?.card?.time_complexity || 'N/A'
  const space = concept?.card?.space_complexity || 'N/A'
  const intuition = concept?.card?.intuition || ''

  return `Visual guide to ${title} (${domain}).

Time Complexity: ${time}
Space Complexity: ${space}

Intuition:
${intuition}

Master algorithms, data structures, and computer science concepts with free interactive visual step-by-step simulations:
https://learnblazinglyfast.tech/concept/${concept?.slug || ''}

#programming #coding #computerscience #algorithms #datastructures #learntocode #softwareengineering #webdev`
}

/**
 * Generates a clean YouTube Shorts title without emojis.
 */
export function getYouTubeShortsTitle(concept) {
  const title = concept?.title || 'Concept'
  return `${title} Explained Visually in 60s #Shorts`
}

/**
 * Generates a clean YouTube Shorts description without emojis.
 */
export function getYouTubeShortsDescription(concept) {
  const title = concept?.title || 'Concept'
  const domain = concept?.domain || 'Computer Science'
  const time = concept?.card?.time_complexity || 'N/A'
  const space = concept?.card?.space_complexity || 'N/A'

  return `The Visual Guide to ${title} (${domain}).

Time Complexity: ${time}
Space Complexity: ${space}

Interactive algorithm playground & step-by-step simulations:
https://learnblazinglyfast.tech/concept/${concept?.slug || ''}

#Shorts #programming #coding #computerscience #algorithms #tech #developer`
}
