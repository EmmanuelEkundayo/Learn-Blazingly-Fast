import html2canvas from 'html2canvas'
import JSZip from 'jszip'
import { drawCanvasVizFrame } from './visualizerPlayback.js'

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
 * Exports all slides as a 15-second vertical video clip (MP4 / WebM).
 * Plays through all 7 slides with live pacing, smooth cross-fades,
 * and a story segment progress bar at the top.
 */
export async function exportVideoClip(slideElements, slug, onProgress, concept) {
  try {
    if (!isVideoExportSupported()) {
      throw new Error('Video recording is not supported in this browser. Use the 7-Slide Carousel ZIP export instead.')
    }

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
    const width = 720
    const height = 900 // 4:5 vertical video
    const recCanvas = document.createElement('canvas')
    recCanvas.width = width
    recCanvas.height = height
    const ctx = recCanvas.getContext('2d', { alpha: false })

    // Prime the canvas with the first slide
    ctx.fillStyle = '#0b0e14'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(renderedCanvases[0], 0, 0, width, height)

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

    // Timing plan: 15.0s (15,000ms) total
    // 7 slides: [2000, 3000, 2000, 2000, 2000, 2000, 2000]
    const defaultDurations = [2000, 3000, 2000, 2000, 2000, 2000, 2000]
    const slideDurations = renderedCanvases.map((_, i) => defaultDurations[i] || 2000)
    const totalDurationMs = slideDurations.reduce((a, b) => a + b, 0) // 15000ms

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
          const filename = `${slug || 'concept'}-15s-clip.${extension}`

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
        const currentSec = Math.min(15, parseFloat((elapsed / 1000).toFixed(1)))

        if (onProgress) {
          onProgress({
            phase: 'recording',
            percent: 30 + Math.round(progressRatio * 70),
            currentSec,
            totalSec: 15,
            message: `Encoding 15s clip... ${currentSec.toFixed(1)}s / 15.0s`
          })
        }

        if (elapsed >= totalDurationMs) {
          clearInterval(frameInterval)
          // Draw final clean frame
          const lastCanvas = renderedCanvases[renderedCanvases.length - 1]
          ctx.drawImage(lastCanvas, 0, 0, width, height)
          drawStoryBars(ctx, width, renderedCanvases.length, renderedCanvases.length - 1, 1)
          drawFooterBar(ctx, width, height, 15.0)

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

        // Clear canvas
        ctx.fillStyle = '#0b0e14'
        ctx.fillRect(0, 0, width, height)

        // Draw slide with crossfade if near transition
        if (slideRemaining < CROSSFADE_MS && currentIdx < renderedCanvases.length - 1) {
          const fade = (CROSSFADE_MS - slideRemaining) / CROSSFADE_MS
          ctx.globalAlpha = 1 - fade
          ctx.drawImage(renderedCanvases[currentIdx], 0, 0, width, height)
          if (currentIdx === 1 && concept) {
            const vizRatio = Math.min(1, Math.max(0, slideElapsed / slideDur))
            drawCanvasVizFrame(ctx, concept, { x: 44, y: 195, width: width - 88, height: 380 }, vizRatio)
          }
          ctx.globalAlpha = fade
          ctx.drawImage(renderedCanvases[currentIdx + 1], 0, 0, width, height)
          ctx.globalAlpha = 1.0
        } else {
          ctx.globalAlpha = 1.0
          ctx.drawImage(renderedCanvases[currentIdx], 0, 0, width, height)
          // Live playing visualization on Slide 2 (index 1)
          if (currentIdx === 1 && concept) {
            const vizRatio = Math.min(1, Math.max(0, slideElapsed / slideDur))
            drawCanvasVizFrame(ctx, concept, { x: 44, y: 195, width: width - 88, height: 380 }, vizRatio)
          }
        }

        // Draw Story Segment Progress Bars at top
        const slideRatio = Math.min(1, Math.max(0, slideElapsed / slideDur))
        drawStoryBars(ctx, width, renderedCanvases.length, currentIdx, slideRatio)

        // Draw Footer Bar with live second counter
        drawFooterBar(ctx, width, height, currentSec)
      }, 1000 / 30) // 30 fps
    })
  } catch (err) {
    console.error('Failed to export video clip:', err)
    return { success: false, error: err.message }
  }
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

function drawStoryBars(ctx, width, totalSegments, currentIdx, currentRatio) {
  const margin = 16
  const barY = 12
  const barH = 3.5
  const gap = 4
  const totalGaps = (totalSegments - 1) * gap
  const segW = (width - margin * 2 - totalGaps) / totalSegments

  ctx.save()
  for (let s = 0; s < totalSegments; s++) {
    const x = margin + s * (segW + gap)
    // Background pill
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)'
    fillSafeRoundRect(ctx, x, barY, segW, barH, 2)

    // Active fill pill
    if (s < currentIdx) {
      ctx.fillStyle = '#38bdf8'
      fillSafeRoundRect(ctx, x, barY, segW, barH, 2)
    } else if (s === currentIdx) {
      const fillW = Math.max(0, segW * currentRatio)
      ctx.fillStyle = '#38bdf8'
      fillSafeRoundRect(ctx, x, barY, fillW, barH, 2)
    }
  }
  ctx.restore()
}

function drawFooterBar(ctx, width, height, currentSec) {
  ctx.save()
  ctx.fillStyle = 'rgba(11, 14, 20, 0.75)'
  ctx.fillRect(0, height - 24, width, 24)

  ctx.fillStyle = '#94a3b8'
  ctx.font = '10px monospace'
  ctx.textBaseline = 'middle'
  ctx.fillText('learnblazinglyfast.tech', 16, height - 12)

  const timeText = `${parseFloat(currentSec).toFixed(1)}s / 15.0s`
  const textW = ctx.measureText(timeText).width
  ctx.fillStyle = '#38bdf8'
  ctx.fillText(timeText, width - textW - 16, height - 12)
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
