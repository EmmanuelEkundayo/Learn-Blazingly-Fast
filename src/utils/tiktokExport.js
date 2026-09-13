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

  const isSafari = typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

  // WebM candidates (pure video codecs, rock-solid for Chromium and Firefox)
  const webmCandidates = [
    { mimeType: 'video/webm;codecs=vp9', extension: 'webm' },
    { mimeType: 'video/webm;codecs=vp8', extension: 'webm' },
    { mimeType: 'video/webm', extension: 'webm' },
  ]

  // MP4 candidates (pure video codecs, native for Safari/WebKit, never include mp4a audio codec on video stream!)
  const mp4Candidates = [
    { mimeType: 'video/mp4;codecs=avc1', extension: 'mp4' },
    { mimeType: 'video/mp4;codecs=h264', extension: 'mp4' },
    { mimeType: 'video/mp4', extension: 'mp4' },
  ]

  const candidates = isSafari
    ? [...mp4Candidates, ...webmCandidates]
    : [...webmCandidates, ...mp4Candidates]

  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c.mimeType)) {
        return c
      }
    } catch {
      // ignore
    }
  }

  return { mimeType: '', extension: isSafari ? 'mp4' : 'webm' }
}

/**
 * Attaches a silent Web Audio track to a MediaStream so video muxers
 * never stall or produce empty recordings waiting for audio samples.
 */
function attachSilentAudioTrack(stream) {
  try {
    const AudioContextClass = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
    if (!AudioContextClass) return null
    const audioCtx = new AudioContextClass()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    gain.gain.value = 0 // completely silent
    osc.connect(gain)
    const dst = audioCtx.createMediaStreamDestination()
    gain.connect(dst)
    osc.start()
    const track = dst.stream.getAudioTracks()[0]
    if (track) {
      stream.addTrack(track)
      return { audioCtx, osc }
    }
  } catch (e) {
    console.warn('Silent audio track attachment skipped:', e)
  }
  return null
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  if (!text) return
  const words = text.split(' ')
  let line = ''
  let curY = y

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' '
    const metrics = ctx.measureText(testLine)
    const testWidth = metrics.width
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, curY)
      line = words[n] + ' '
      curY += lineHeight
    } else {
      line = testLine
    }
  }
  ctx.fillText(line, x, curY)
}

function createFallbackCoverCanvas(concept, domain, theme) {
  const c = document.createElement('canvas')
  c.width = 1080
  c.height = 1350
  const ctx = c.getContext('2d')
  if (!ctx) return c

  const primary = theme?.primary || '#38bdf8'
  const grad = ctx.createLinearGradient(0, 0, 0, 1350)
  grad.addColorStop(0, '#0f172a')
  grad.addColorStop(0.5, '#0b0e14')
  grad.addColorStop(1, '#05070a')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 1080, 1350)

  ctx.save()
  // Badge
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)'
  ctx.strokeStyle = primary
  ctx.lineWidth = 2
  fillSafeRoundRect(ctx, 80, 110, 440, 60, 30)
  ctx.stroke()

  ctx.fillStyle = primary
  ctx.font = 'bold 22px monospace'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${domain || 'CODE'} · ${concept?.category || 'ALGORITHMS'}`, 105, 140)

  // Title
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 64px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  const title = concept?.title || 'Tech Concept'
  wrapCanvasText(ctx, title, 80, 260, 920, 76)

  // Subtitle / intuition
  ctx.fillStyle = '#94a3b8'
  ctx.font = '32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  const subtitle = concept?.card?.intuition || 'Master this core computer science concept visually.'
  wrapCanvasText(ctx, subtitle, 80, 460, 920, 44)

  // Graphic card
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.fillStyle = '#111622'
  fillSafeRoundRect(ctx, 80, 620, 920, 500, 24)
  ctx.stroke()

  ctx.fillStyle = primary
  ctx.font = 'bold 40px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('▶ VISUAL GUIDE', 540, 880)
  ctx.textAlign = 'left'

  ctx.fillStyle = '#64748b'
  ctx.font = 'bold 24px monospace'
  ctx.fillText('learnblazinglyfast.tech', 80, 1260)
  ctx.restore()

  return c
}

function createFallbackVizBaseCanvas(concept, domain, theme) {
  const c = document.createElement('canvas')
  c.width = 1080
  c.height = 1350
  const ctx = c.getContext('2d')
  if (!ctx) return c

  const primary = theme?.primary || '#38bdf8'
  ctx.fillStyle = '#0b0e14'
  ctx.fillRect(0, 0, 1080, 1350)

  ctx.save()
  ctx.fillStyle = primary
  ctx.font = 'bold 22px monospace'
  ctx.fillText(`${domain || 'CODE'} · ${concept?.category || 'ALGORITHMS'}`, 60, 60)

  ctx.fillStyle = '#94a3b8'
  ctx.font = 'bold 22px monospace'
  ctx.textAlign = 'right'
  ctx.fillText('02 / 07', 1020, 60)
  ctx.textAlign = 'left'

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.beginPath()
  ctx.moveTo(60, 80)
  ctx.lineTo(1020, 80)
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.fillText('How It Works In Motion', 60, 140)

  ctx.fillStyle = '#94a3b8'
  ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.fillText(`Step-by-step visual simulation of ${concept?.title || 'the concept'}`, 60, 185)

  ctx.fillStyle = '#111622'
  ctx.strokeStyle = '#1e2638'
  fillSafeRoundRect(ctx, 60, 1140, 960, 120, 20)
  ctx.stroke()

  ctx.fillStyle = '#38bdf8'
  ctx.font = 'bold 22px monospace'
  ctx.fillText("What's happening: ", 90, 1185)
  ctx.fillStyle = '#cbd5e1'
  ctx.font = '22px sans-serif'
  const intuition = concept?.card?.intuition?.slice(0, 140) || 'Data transitions through states step-by-step to optimize execution path and memory.'
  wrapCanvasText(ctx, intuition, 90, 1220, 900, 28)

  ctx.restore()
  return c
}

function createFallbackEndCanvas(concept, domain, theme) {
  const c = document.createElement('canvas')
  c.width = 1080
  c.height = 1350
  const ctx = c.getContext('2d')
  if (!ctx) return c

  const primary = theme?.primary || '#38bdf8'
  const grad = ctx.createLinearGradient(0, 0, 0, 1350)
  grad.addColorStop(0, '#0b0e14')
  grad.addColorStop(0.5, '#111622')
  grad.addColorStop(1, '#070a10')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 1080, 1350)

  ctx.save()
  // Badge
  ctx.fillStyle = 'rgba(56, 189, 248, 0.12)'
  ctx.strokeStyle = primary
  ctx.lineWidth = 2
  fillSafeRoundRect(ctx, 80, 130, 380, 56, 28)
  ctx.stroke()
  ctx.fillStyle = primary
  ctx.font = 'bold 22px monospace'
  ctx.textBaseline = 'middle'
  ctx.fillText('100% FREE & OPEN SOURCE', 105, 158)

  // Headline
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 56px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  wrapCanvasText(ctx, 'Level Up on Learn Blazingly Fast', 80, 270, 920, 68)

  // Subtitle
  ctx.fillStyle = '#94a3b8'
  ctx.font = '28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  wrapCanvasText(ctx, 'The interactive visual dictionary for developers. 550+ algorithm visualizers.', 80, 440, 920, 40)

  // Card 1
  ctx.fillStyle = '#0b0e14'
  ctx.strokeStyle = '#1e2638'
  fillSafeRoundRect(ctx, 80, 580, 920, 170, 20)
  ctx.stroke()
  ctx.fillStyle = primary
  ctx.font = 'bold 28px monospace'
  ctx.fillText('⚡ Interactive Visualizers', 120, 640)
  ctx.fillStyle = '#cbd5e1'
  ctx.font = '22px sans-serif'
  ctx.fillText('Step through algorithms and data structures frame-by-frame.', 120, 695)

  // Card 2
  ctx.fillStyle = '#0b0e14'
  ctx.strokeStyle = '#1e2638'
  fillSafeRoundRect(ctx, 80, 790, 920, 170, 20)
  ctx.stroke()
  ctx.fillStyle = '#10b981'
  ctx.font = 'bold 28px monospace'
  ctx.fillText('★ Star on GitHub', 120, 850)
  ctx.fillStyle = '#cbd5e1'
  ctx.font = '22px sans-serif'
  ctx.fillText('Open-source developer education built for the community.', 120, 905)

  // CTA Button
  ctx.fillStyle = primary
  fillSafeRoundRect(ctx, 80, 1030, 920, 96, 24)
  ctx.fillStyle = '#070a10'
  ctx.font = 'bold 34px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('learnblazinglyfast.tech', 540, 1088)
  ctx.restore()

  return c
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
 * Exports video clip (TikTok/Reels 4:5, Pinterest 9:16, YouTube Shorts 9:16).
 * Flow:
 * 1. Intro Hook (Slide 1 Cover) capped at 2.0s
 * 2. Looping Visualization (Slide 2) taking the bulk of the duration
 * 3. Outro CTA (Slide 7) giving the viewer the clear next step
 * Supports 17s / 30s / 60s durations.
 */
export async function exportVideoClip(slideElements, slug, onProgress, concept, theme, options = {}) {
  try {
    if (!isVideoExportSupported()) {
      throw new Error('Video recording is not supported in this browser. Use the 7-Slide Carousel ZIP export instead.')
    }

    const resolvedTheme = (typeof theme === 'string' ? { primary: theme, secondary: theme } : theme) || getInitialThemeForConcept(concept)
    const primaryColor = resolvedTheme?.primary || '#38bdf8'
    const domain = concept?.domain || 'Computer Science'

    const is9x16 = options?.aspectRatio === '9:16' || options?.platform === 'youtube' || options?.platform === 'pinterest'
    const width = 720
    const height = is9x16 ? 1280 : 900 // 9:16 vertical video (YouTube Shorts/Pinterest) or 4:5 (TikTok/Reels)
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
    const cardRadius = 16

    // Pre-render the 3 essential slides for the motion video
    if (onProgress) {
      onProgress({
        phase: 'rendering',
        percent: 10,
        currentSec: 0,
        totalSec: options?.videoDuration || 17,
        message: 'Preparing intro hook frame...'
      })
    }
    let coverCanvas = null
    if (slideElements?.[0]) {
      coverCanvas = await renderSlideCanvas(slideElements[0])
    }
    if (!coverCanvas) {
      coverCanvas = createFallbackCoverCanvas(concept, domain, resolvedTheme)
    }

    if (onProgress) {
      onProgress({
        phase: 'rendering',
        percent: 20,
        currentSec: 0,
        totalSec: options?.videoDuration || 17,
        message: 'Preparing visualization layout...'
      })
    }
    let vizBaseCanvas = null
    if (slideElements?.[1]) {
      vizBaseCanvas = await renderSlideCanvas(slideElements[1])
    }
    if (!vizBaseCanvas) {
      vizBaseCanvas = createFallbackVizBaseCanvas(concept, domain, resolvedTheme)
    }

    if (onProgress) {
      onProgress({
        phase: 'rendering',
        percent: 30,
        currentSec: 0,
        totalSec: options?.videoDuration || 17,
        message: 'Preparing outro CTA frame...'
      })
    }
    const endEl = slideElements?.[slideElements.length - 1] || slideElements?.[6]
    let endCanvas = null
    if (endEl) {
      endCanvas = await renderSlideCanvas(endEl)
    }
    if (!endCanvas) {
      endCanvas = createFallbackEndCanvas(concept, domain, resolvedTheme)
    }

    const vizBox = getVizBox(slideElements?.[1], width, height, cardX, cardY, cardW, cardH)

    // Timing plan:
    // 1. First slide (Cover): capped at 2.0s
    // 2. Outro (End CTA): 2.5s (17s) or 3.0s (30s/60s)
    // 3. Visualization: Takes all remaining duration and LOOPS continuously!
    const targetSec = Number(options?.videoDuration) || 17
    const totalDurationMs = targetSec * 1000
    const introDurationMs = 2000 // 2.0s intro cap
    const endDurationMs = targetSec >= 30 ? 3000 : 2500
    const vizDurationMs = Math.max(2000, totalDurationMs - introDurationMs - endDurationMs)
    const totalSec = parseFloat((totalDurationMs / 1000).toFixed(1))

    const CROSSFADE_MS = 250
    const LOOP_PERIOD = 4000 // 4.0s per complete visualization cycle

    // Prime the canvas with the cover slide
    ctx.fillStyle = '#070a10'
    ctx.fillRect(0, 0, width, height)
    ctx.save()
    fillSafeRoundRect(ctx, cardX, cardY, cardW, cardH, cardRadius)
    ctx.clip()
    ctx.drawImage(coverCanvas, cardX, cardY, cardW, cardH)
    ctx.restore()

    const stream = recCanvas.captureStream(30)
    const audioCleanup = attachSilentAudioTrack(stream)
    const { mimeType, extension } = getSupportedVideoMimeType()
    const recorderOptions = mimeType ? { mimeType, videoBitsPerSecond: 3500000 } : { videoBitsPerSecond: 3500000 }
    const recorder = new MediaRecorder(stream, recorderOptions)

    const chunks = []
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data)
    }

    return new Promise((resolve, reject) => {
      recorder.onstop = () => {
        try {
          if (audioCleanup) {
            try {
              audioCleanup.osc.stop()
              audioCleanup.audioCtx.close()
            } catch (e) {
              // ignore
            }
          }

          const totalBytes = chunks.reduce((acc, c) => acc + (c.size || 0), 0)
          console.log(`Video recording completed: ${chunks.length} chunks, ${totalBytes} bytes (${(totalBytes / (1024 * 1024)).toFixed(2)} MB), mime: ${mimeType}`)

          if (chunks.length === 0 || totalBytes === 0) {
            reject(new Error('Video recording produced an empty file. Please try again or use Carousel ZIP export.'))
            return
          }

          const actualMime = mimeType || (recorder.mimeType || 'video/webm')
          const blob = new Blob(chunks, { type: actualMime })
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

          resolve({ success: true, blob, url, filename, extension, mimeType: actualMime, size: totalBytes })
        } catch (err) {
          reject(err)
        }
      }

      recorder.onerror = (e) => reject(e)

      // Start recording with 250ms timeslice to ensure continuous chunk delivery
      recorder.start(250)

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

        const storyBarY = is9x16 ? Math.max(20, cardY - 26) : 12
        const footerBarY = is9x16 ? cardY + cardH + 8 : height - 26
        const footerLabel = options?.platform === 'youtube'
          ? 'YouTube Shorts · 9:16'
          : options?.platform === 'pinterest'
            ? 'Pinterest Video Pin · 9:16'
            : 'learnblazinglyfast.tech'

        if (elapsed >= totalDurationMs) {
          clearInterval(frameInterval)
          // Draw final clean frame
          ctx.fillStyle = '#070a10'
          ctx.fillRect(0, 0, width, height)
          ctx.save()
          fillSafeRoundRect(ctx, cardX, cardY, cardW, cardH, cardRadius)
          ctx.clip()
          ctx.drawImage(endCanvas, cardX, cardY, cardW, cardH)
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

          drawStoryBars(ctx, width, 3, 2, 1.0, primaryColor, storyBarY)
          drawFooterBar(ctx, width, height, totalSec, totalSec, primaryColor, footerBarY, footerLabel)

          setTimeout(() => {
            try {
              if (recorder.state === 'recording' && typeof recorder.requestData === 'function') {
                recorder.requestData()
              }
            } catch (e) {
              // ignore
            }

            setTimeout(() => {
              try {
                if (recorder.state !== 'inactive') {
                  recorder.stop()
                }
              } catch (e) {
                // ignore
              }
            }, 100)
          }, 100)
          return
        }

        // Clear canvas with dark base
        ctx.fillStyle = '#070a10'
        ctx.fillRect(0, 0, width, height)

        let phaseIdx = 0
        let phaseRatio = 0

        ctx.save()
        fillSafeRoundRect(ctx, cardX, cardY, cardW, cardH, cardRadius)
        ctx.clip()

        if (elapsed < introDurationMs) {
          // ─── Phase 0: Intro Hook (Slide 1 Cover) ───
          phaseIdx = 0
          phaseRatio = Math.min(1, elapsed / introDurationMs)
          const introRemaining = introDurationMs - elapsed

          if (introRemaining < CROSSFADE_MS) {
            const fade = (CROSSFADE_MS - introRemaining) / CROSSFADE_MS
            ctx.globalAlpha = 1 - fade
            ctx.drawImage(coverCanvas, cardX, cardY, cardW, cardH)
            ctx.globalAlpha = fade
            ctx.drawImage(vizBaseCanvas, cardX, cardY, cardW, cardH)
            if (concept) {
              try {
                drawCanvasVizFrame(ctx, concept, vizBox, 0, resolvedTheme)
              } catch (vizErr) {
                console.warn('Viz frame render error:', vizErr)
              }
            }
            ctx.globalAlpha = 1.0
          } else {
            ctx.globalAlpha = 1.0
            ctx.drawImage(coverCanvas, cardX, cardY, cardW, cardH)
          }
        } else if (elapsed < introDurationMs + vizDurationMs) {
          // ─── Phase 1: Looping Visualization (Slide 2) ───
          phaseIdx = 1
          const vizElapsed = elapsed - introDurationMs
          phaseRatio = Math.min(1, vizElapsed / vizDurationMs)
          const vizRemaining = vizDurationMs - vizElapsed
          const loopProgress = (vizElapsed % LOOP_PERIOD) / LOOP_PERIOD

          if (vizRemaining < CROSSFADE_MS) {
            const fade = (CROSSFADE_MS - vizRemaining) / CROSSFADE_MS
            ctx.globalAlpha = 1 - fade
            ctx.drawImage(vizBaseCanvas, cardX, cardY, cardW, cardH)
            if (concept) {
              try {
                drawCanvasVizFrame(ctx, concept, vizBox, loopProgress, resolvedTheme)
              } catch (vizErr) {
                console.warn('Viz frame render error:', vizErr)
              }
            }
            ctx.globalAlpha = fade
            ctx.drawImage(endCanvas, cardX, cardY, cardW, cardH)
            ctx.globalAlpha = 1.0
          } else {
            ctx.globalAlpha = 1.0
            ctx.drawImage(vizBaseCanvas, cardX, cardY, cardW, cardH)
            if (concept) {
              try {
                drawCanvasVizFrame(ctx, concept, vizBox, loopProgress, resolvedTheme)
              } catch (vizErr) {
                console.warn('Live viz frame loop error:', vizErr)
              }
            }
          }
        } else {
          // ─── Phase 2: Outro CTA (Slide 7) ───
          phaseIdx = 2
          const endElapsed = elapsed - (introDurationMs + vizDurationMs)
          phaseRatio = Math.min(1, endElapsed / endDurationMs)
          ctx.globalAlpha = 1.0
          ctx.drawImage(endCanvas, cardX, cardY, cardW, cardH)
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

        // 3 Story Segment Progress Bars (Hook, Looping Visual, CTA)
        drawStoryBars(ctx, width, 3, phaseIdx, phaseRatio, primaryColor, storyBarY)

        // Footer Bar
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
