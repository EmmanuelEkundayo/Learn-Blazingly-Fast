import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import {
  downloadSlidePNG,
  copySlideImageToClipboard,
  exportCarouselZip,
  getTikTokCaption,
  openTikTokUpload
} from '../../utils/tiktokExport.js'
import { trackShare } from '../../services/analytics.js'

export default function TikTokCarouselModal({ isOpen, onClose, concept, accent }) {
  const [mode, setMode] = useState('concept') // 'concept' (7 slides) or 'manifesto' (9 slides)
  const [activeSlide, setActiveSlide] = useState(0)
  const [exportingZip, setExportingZip] = useState(false)
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 7 })
  const [copiedCaption, setCopiedCaption] = useState(false)
  const [capturedVisualUrl, setCapturedVisualUrl] = useState(null)

  // 9 slide references for export rendering
  const slideRefs = [
    useRef(null), useRef(null), useRef(null),
    useRef(null), useRef(null), useRef(null),
    useRef(null), useRef(null), useRef(null)
  ]

  // Capture canvas visualizer if present on the page
  useEffect(() => {
    if (!isOpen) return
    try {
      const vizContainer = document.querySelector('[data-visualization-container]') || document.querySelector('canvas')
      if (vizContainer && vizContainer.tagName === 'CANVAS') {
        setCapturedVisualUrl(vizContainer.toDataURL('image/png'))
      }
    } catch (e) {
      console.debug('Canvas capture note:', e)
    }
  }, [isOpen])

  // Reset active slide if switching modes
  useEffect(() => {
    setActiveSlide(0)
  }, [mode])

  if (!isOpen || !concept) return null

  const domain = concept.domain || 'Computer Science'
  const card = concept.card || {}
  const exercise = concept.exercise || {}

  const CONCEPT_SLIDES = [
    '01. Cover',
    '02. The Dilemma',
    '03. Live Simulation',
    '04. Mental Model',
    '05. Traps & Gotchas',
    '06. Terminal Quiz',
    '07. Open Source CTA',
  ]

  const MANIFESTO_SLIDES = [
    '01. Cover',
    '02. The Problem',
    '03. The Insight',
    '04. The Solution',
    '05. What\'s Inside 1',
    '06. What\'s Inside 2',
    '07. Philosophy',
    '08. Contributors',
    '09. Get Started',
  ]

  const currentSlideList = mode === 'concept' ? CONCEPT_SLIDES : MANIFESTO_SLIDES
  const totalSlides = currentSlideList.length

  const handleDownloadActive = async () => {
    const el = slideRefs[activeSlide]?.current
    if (!el) return
    toast.loading('Rendering slide PNG...', { id: 'slide-dl' })
    const filename = `${concept.slug}-${mode}-slide-0${activeSlide + 1}.png`
    const success = await downloadSlidePNG(el, filename)
    if (success) {
      toast.success(`Downloaded Slide ${activeSlide + 1}!`, { id: 'slide-dl' })
      trackShare({ slug: concept.slug, title: concept.title, platform: 'tiktok_slide_png', method: 'download_single' })
    } else {
      toast.error('Failed to export slide', { id: 'slide-dl' })
    }
  }

  const handleCopyActiveImage = async () => {
    const el = slideRefs[activeSlide]?.current
    if (!el) return
    toast.loading('Copying slide image...', { id: 'slide-copy' })
    const success = await copySlideImageToClipboard(el)
    if (success) {
      toast.success(`Slide ${activeSlide + 1} copied to clipboard`, { id: 'slide-copy' })
      trackShare({ slug: concept.slug, title: concept.title, platform: 'tiktok_slide_copy', method: 'copy_image' })
    } else {
      toast.error('Clipboard copy not supported by your browser. Use Download instead.', { id: 'slide-copy' })
    }
  }

  const handleExportZipAndOpenTikTok = async () => {
    const elements = slideRefs.slice(0, totalSlides).map(r => r.current).filter(Boolean)
    if (elements.length < totalSlides) {
      toast.error('Preparing slides, please try again in a moment.')
      return
    }

    setExportingZip(true)
    toast.loading(`Rendering ${totalSlides} slides (1080x1350)...`, { id: 'zip-dl' })

    const caption = getTikTokCaption(concept, mode)
    try {
      await navigator.clipboard.writeText(caption)
    } catch {
      // ignore clipboard error if unfocused
    }

    const filenames = currentSlideList.map((_, i) => `slide-0${i + 1}.png`)
    const success = await exportCarouselZip(
      elements,
      `${concept.slug}-${mode}`,
      filenames,
      caption,
      (current, total) => setExportProgress({ current, total })
    )

    setExportingZip(false)
    if (success) {
      toast.success('ZIP downloaded & caption copied! Opening TikTok Studio...', { id: 'zip-dl', duration: 4000 })
      trackShare({ slug: concept.slug, title: concept.title, platform: 'tiktok_carousel_zip', method: 'download_and_open' })
      // Automatically open TikTok web upload
      setTimeout(() => {
        openTikTokUpload()
      }, 700)
    } else {
      toast.error('Failed to export ZIP package', { id: 'zip-dl' })
    }
  }

  const handleCopyCaption = () => {
    const caption = getTikTokCaption(concept, mode)
    navigator.clipboard.writeText(caption)
    setCopiedCaption(true)
    toast.success('Caption and hashtags copied to clipboard')
    setTimeout(() => setCopiedCaption(false), 2500)
  }

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      {/* Click outside to close */}
      <div className="fixed inset-0" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.18 }}
        className="relative z-10 w-full max-w-5xl bg-[#0b0e14] border border-[#1e2638] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e2638] bg-[#0d121c]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <ForkIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">Carousel Exporter</h2>
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                  4:5 Clean Theme
                </span>
              </div>
              <p className="text-xs text-slate-400">
                High-density developer carousel matching the platform's visual dictionary aesthetic.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#161d2d] transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-[#090c12] border-b border-[#1e2638] text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Carousel Type:</span>
            <div className="inline-flex rounded-lg bg-[#111622] p-0.5 border border-[#1e2638]">
              <button
                onClick={() => setMode('concept')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  mode === 'concept'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Concept Deep Dive ({CONCEPT_SLIDES.length} Slides)
              </button>
              <button
                onClick={() => setMode('manifesto')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  mode === 'manifesto'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Platform Manifesto ({MANIFESTO_SLIDES.length} Slides)
              </button>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <span className="font-mono text-blue-400 font-semibold">1080 × 1350</span>
            <span>•</span>
            <span>TikTok & Instagram Ready</span>
          </div>
        </div>

        {/* Body: Preview Box & Controls */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-6 items-center lg:items-start justify-center">

          {/* Left: 4:5 Carousel Preview */}
          <div className="flex flex-col items-center gap-3">
            {/* Slide Navigation Buttons */}
            <div className="flex items-center gap-1.5 p-1 bg-[#111622] border border-[#1e2638] rounded-xl overflow-x-auto max-w-full">
              {currentSlideList.map((name, i) => (
                <button
                  key={name}
                  onClick={() => setActiveSlide(i)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activeSlide === i
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-[#161d2d]'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>

            {/* 4:5 Card Mockup Frame */}
            <div className="relative rounded-2xl border border-[#1e2638] shadow-2xl p-1 bg-[#0b0e14] overflow-hidden">
              {/* Preview Window (360x450 in 4:5 ratio) */}
              <div className="w-[320px] sm:w-[360px] aspect-[4/5] overflow-hidden rounded-xl relative bg-[#0b0e14]">
                <SlideContent
                  mode={mode}
                  index={activeSlide}
                  concept={concept}
                  card={card}
                  exercise={exercise}
                  domain={domain}
                  capturedVisualUrl={capturedVisualUrl}
                  totalSlides={totalSlides}
                />
              </div>

              {/* Prev / Next Chevrons */}
              <button
                onClick={() => setActiveSlide((s) => (s > 0 ? s - 1 : totalSlides - 1))}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center transition-transform hover:scale-105"
                title="Previous Slide"
              >
                ←
              </button>
              <button
                onClick={() => setActiveSlide((s) => (s < totalSlides - 1 ? s + 1 : 0))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center transition-transform hover:scale-105"
                title="Next Slide"
              >
                →
              </button>
            </div>

            <div className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
              <span>Slide {String(activeSlide + 1).padStart(2, '0')} / {String(totalSlides).padStart(2, '0')}</span>
              <span>•</span>
              <span className="text-blue-400">learnblazinglyfast.tech</span>
            </div>
          </div>

          {/* Right: Export & Sharing Actions */}
          <div className="w-full lg:w-80 flex flex-col gap-3.5">

            {/* Primary Action: Download All & Open TikTok */}
            <div className="p-4 rounded-xl bg-[#111622] border border-blue-500/30 space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Export & Publish</h3>
                  <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    Auto-Open TikTok
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Downloads all {totalSlides} slides at 1080×1350, copies your caption, and opens TikTok upload directly.
                </p>
              </div>

              <button
                onClick={handleExportZipAndOpenTikTok}
                disabled={exportingZip}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
              >
                {exportingZip ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Rendering ({exportProgress.current}/{exportProgress.total})...</span>
                  </>
                ) : (
                  <>
                    <UploadIcon className="w-4 h-4" />
                    <span>Download All & Open TikTok ↗</span>
                  </>
                )}
              </button>

              <button
                onClick={openTikTokUpload}
                className="w-full py-1.5 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1 transition-colors"
              >
                <span>Just open TikTok Studio</span>
                <span className="text-[10px]">↗</span>
              </button>
            </div>

            {/* Quick Actions for Current Slide */}
            <div className="p-3.5 rounded-xl bg-[#111622] border border-[#1e2638] space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Current Slide Actions</h4>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDownloadActive}
                  className="py-2 px-2.5 rounded-lg text-xs font-medium bg-[#161d2d] hover:bg-[#1f283d] text-white transition-colors flex items-center justify-center gap-1.5"
                >
                  <DownloadIcon className="w-3.5 h-3.5 text-blue-400" />
                  <span>Download PNG</span>
                </button>

                <button
                  onClick={handleCopyActiveImage}
                  className="py-2 px-2.5 rounded-lg text-xs font-medium bg-[#161d2d] hover:bg-[#1f283d] text-white transition-colors flex items-center justify-center gap-1.5"
                >
                  <CopyIcon className="w-3.5 h-3.5 text-slate-300" />
                  <span>Copy Image</span>
                </button>
              </div>
            </div>

            {/* Caption Generator (No Emojis) */}
            <div className="p-3.5 rounded-xl bg-[#111622] border border-[#1e2638] space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Post Caption</h4>
                <button
                  onClick={handleCopyCaption}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold transition-colors flex items-center gap-1"
                >
                  {copiedCaption ? '✓ Copied' : 'Copy Text'}
                </button>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0b0e14] border border-[#1e2638] text-[11px] text-slate-300 font-mono leading-relaxed max-h-24 overflow-y-auto select-all">
                {getTikTokCaption(concept, mode)}
              </div>
            </div>

            {/* Format Notes */}
            <div className="p-3 rounded-xl bg-[#0d121c] border border-[#1e2638] text-[11px] text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300">Format details:</p>
              <p>• Standard 4:5 vertical carousel (1080 × 1350 px).</p>
              <p>• Clean dark slate aesthetic with zero emojis or gradients.</p>
              <p>• Upload as Photo Mode on TikTok or multi-image carousel on LinkedIn.</p>
            </div>

          </div>
        </div>

        {/* Hidden Render Container for High-Resolution 1080x1350 Canvas Export */}
        <div className="fixed -left-[9999px] -top-[9999px] pointer-events-none opacity-0">
          {Array.from({ length: totalSlides }).map((_, idx) => (
            <div
              key={idx}
              ref={slideRefs[idx]}
              className="w-[540px] h-[675px] overflow-hidden bg-[#0b0e14]"
              style={{ width: '540px', height: '675px' }}
            >
              <SlideContent
                mode={mode}
                index={idx}
                concept={concept}
                card={card}
                exercise={exercise}
                domain={domain}
                capturedVisualUrl={capturedVisualUrl}
                totalSlides={totalSlides}
                isExportResolution={true}
              />
            </div>
          ))}
        </div>

      </motion.div>
    </div>
  )
}

// ─── Slide Content Router (Concept vs Manifesto) ───────────────────────────────

function SlideContent({
  mode,
  index,
  concept,
  card,
  exercise,
  domain,
  capturedVisualUrl,
  totalSlides,
  isExportResolution = false,
}) {
  const scaleClass = isExportResolution ? 'p-10 text-sm' : 'p-5 text-xs'

  return (
    <div className={`w-full h-full flex flex-col justify-between select-none bg-[#0b0e14] text-white font-sans ${scaleClass}`}>
      {mode === 'concept' ? (
        <ConceptSlideDispatcher
          index={index}
          concept={concept}
          card={card}
          exercise={exercise}
          domain={domain}
          capturedVisualUrl={capturedVisualUrl}
          totalSlides={totalSlides}
          isExportResolution={isExportResolution}
        />
      ) : (
        <ManifestoSlideDispatcher
          index={index}
          totalSlides={totalSlides}
          isExportResolution={isExportResolution}
        />
      )}
    </div>
  )
}

// ─── Mode 1: Concept Deep Dive Slides ─────────────────────────────────────────

function ConceptSlideDispatcher({ index, concept, card, exercise, domain, capturedVisualUrl, totalSlides, isExportResolution }) {
  const currentStr = String(index + 1).padStart(2, '0')
  const totalStr = String(totalSlides).padStart(2, '0')

  return (
    <>
      {/* Top Header Row */}
      <div className="flex items-center justify-between pb-2">
        <span className="text-[10px] sm:text-[11px] font-bold tracking-widest uppercase text-blue-400 font-mono">
          {domain} · {concept.category || 'ALGORITHMS'}
        </span>
        <span className="text-[10px] sm:text-[11px] font-mono text-slate-500 font-semibold">
          {currentStr} / {totalStr}
        </span>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex flex-col justify-center my-auto py-2">
        {index === 0 && (
          <ConceptSlide1Cover concept={concept} domain={domain} capturedVisualUrl={capturedVisualUrl} />
        )}
        {index === 1 && (
          <ConceptSlide2Dilemma concept={concept} />
        )}
        {index === 2 && (
          <ConceptSlide3Simulation concept={concept} card={card} capturedVisualUrl={capturedVisualUrl} />
        )}
        {index === 3 && (
          <ConceptSlide4MentalModel concept={concept} card={card} />
        )}
        {index === 4 && (
          <ConceptSlide5Gotchas concept={concept} card={card} />
        )}
        {index === 5 && (
          <ConceptSlide6TerminalQuiz concept={concept} exercise={exercise} />
        )}
        {index === 6 && (
          <ConceptSlide7CallToAction />
        )}
      </div>

      {/* Bottom Footer Row */}
      <div className="pt-2 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 font-medium">
        <span>learnblazinglyfast.tech</span>
        <span>{index === 0 ? 'Swipe to explore →' : currentStr}</span>
      </div>
    </>
  )
}

function ConceptSlide1Cover({ concept, domain, capturedVisualUrl }) {
  return (
    <div className="flex flex-col gap-4 my-auto text-left">
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-medium w-fit">
        <ForkIcon className="w-3 h-3" />
        <span>Open Source & Free</span>
      </div>

      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
          The Visual Guide to <span className="text-[#38bdf8]">{concept.title}</span>.
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 font-normal leading-relaxed">
          Why 45-minute tutorials and static documentation don't cut it in the age of AI.
        </p>
      </div>

      {/* Graphic Preview Container */}
      <div className="w-full aspect-[16/9] rounded-xl bg-[#111622] border border-[#1e2638] flex items-center justify-center p-3 relative overflow-hidden">
        {capturedVisualUrl ? (
          <img src={capturedVisualUrl} alt={concept.title} className="max-h-full object-contain filter drop-shadow-sm" />
        ) : (
          <MinimalTreeGraphic />
        )}
      </div>
    </div>
  )
}

function ConceptSlide2Dilemma({ concept }) {
  return (
    <div className="flex flex-col gap-4 my-auto text-left">
      <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
        The Modern Developer's Dilemma
      </h2>

      {/* Two Metric Cards Side by Side */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3.5 rounded-xl bg-[#111622] border border-[#1e2638] space-y-1">
          <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-400">
            <LightningIcon className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-bold text-blue-400">2 seconds</div>
          <div className="text-[11px] text-slate-400">for AI to write your boilerplate</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#111622] border border-[#1e2638] space-y-1">
          <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-slate-300">
            <ClockIcon className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-bold text-white">45 minutes</div>
          <div className="text-[11px] text-slate-400">to explain ONE concept on video</div>
        </div>
      </div>

      {/* Dilemma Bullet Points */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center gap-2.5 text-xs text-slate-300">
          <span className="w-4 h-4 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center font-bold text-[10px] shrink-0">
            ×
          </span>
          <span>45-minute YouTube lectures for a 30-second answer</span>
        </div>

        <div className="flex items-center gap-2.5 text-xs text-slate-300">
          <span className="w-4 h-4 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center font-bold text-[10px] shrink-0">
            ×
          </span>
          <span>3,000-word walls of dry academic documentation</span>
        </div>
      </div>
    </div>
  )
}

function ConceptSlide3Simulation({ concept, card, capturedVisualUrl }) {
  return (
    <div className="flex flex-col gap-3 my-auto text-left">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Why Static Docs Fail Dynamic Logic
        </h2>
        <p className="text-xs text-blue-400 font-semibold mt-1">
          Algorithms are living systems:
        </p>
      </div>

      <div className="space-y-1.5 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span>Memory changes dynamically</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span>Signals propagate across layers</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span>Pointers shift in real time</span>
        </div>
      </div>

      {/* Simulation Frame or Quote */}
      <div className="p-3.5 rounded-xl bg-[#111622] border border-[#1e2638] text-xs text-slate-300 leading-relaxed italic">
        "Reading about {concept.title} in a textbook is like learning how an engine works — from a still photo."
      </div>
    </div>
  )
}

function ConceptSlide4MentalModel({ concept, card }) {
  return (
    <div className="flex flex-col gap-3.5 my-auto text-left">
      <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
        The Mental Model & Intuition
      </h2>

      {/* Intuition Box */}
      <div className="p-3.5 rounded-xl bg-[#111622] border border-[#1e2638] space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block font-mono">
          The Intuition
        </span>
        <p className="text-xs text-slate-200 leading-relaxed">
          {card?.intuition || 'A foundational computing concept solving computational boundaries and memory trade-offs.'}
        </p>
      </div>

      {/* Analogy Box */}
      {card?.analogy && (
        <div className="p-3.5 rounded-xl bg-[#111622] border border-[#1e2638] space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
            Real-World Analogy
          </span>
          <p className="text-xs text-slate-300 leading-relaxed italic">
            "{card.analogy}"
          </p>
        </div>
      )}

      {/* Complexity Stats */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-2.5 rounded-xl bg-[#111622] border border-[#1e2638] text-center">
          <span className="text-[9px] text-slate-400 font-bold uppercase block font-mono">Time Complexity</span>
          <span className="text-sm font-mono font-bold text-emerald-400">
            {card?.time_complexity || 'O(N)'}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-[#111622] border border-[#1e2638] text-center">
          <span className="text-[9px] text-slate-400 font-bold uppercase block font-mono">Space Complexity</span>
          <span className="text-sm font-mono font-bold text-blue-400">
            {card?.space_complexity || 'O(1)'}
          </span>
        </div>
      </div>
    </div>
  )
}

function ConceptSlide5Gotchas({ concept, card }) {
  return (
    <div className="flex flex-col gap-3.5 my-auto text-left">
      <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
        Common Interview Traps
      </h2>

      <div className="space-y-2.5">
        <div className="p-3.5 rounded-xl bg-[#111622] border border-[#1e2638] space-y-1">
          <div className="text-xs font-bold text-slate-200">
            Trap 1: Edge Cases & Boundary Conditions
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Failing to test empty collections, boundary limits, or potential integer overflow on large bounds.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-[#111622] border border-[#1e2638] space-y-1">
          <div className="text-xs font-bold text-slate-200">
            Trap 2: State Mutation & Invariant Drift
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Mutating state across recursive frames instead of preserving immutability.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-[#131926] border border-blue-500/20 text-xs text-slate-300 leading-relaxed">
          <span className="font-bold text-blue-400">Rule of Thumb: </span>
          Before writing code, trace your base condition and constraints. 90% of interview bugs happen at boundary checks.
        </div>
      </div>
    </div>
  )
}

function ConceptSlide6TerminalQuiz({ concept, exercise }) {
  const prompt = exercise?.prompt || 'Test your understanding of this concept:'
  const starterCode = exercise?.starter_code || 'function solution(input) {\n  // What goes here?\n  return result;\n}'

  return (
    <div className="flex flex-col gap-3 my-auto text-left">
      <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
        Terminal Challenge
      </h2>

      {/* Terminal Window */}
      <div className="w-full rounded-xl bg-[#080b11] border border-[#1e2638] overflow-hidden shadow-xl">
        {/* Titlebar */}
        <div className="px-3 py-2 bg-[#0e131d] border-b border-[#1e2638] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
          </div>
          <span className="text-[10px] font-mono text-slate-400">challenge.test.js</span>
          <span className="text-[10px] text-slate-500 font-mono">bash</span>
        </div>

        {/* Terminal Body */}
        <div className="p-3.5 font-mono text-[11px] space-y-2 text-left">
          <div className="text-blue-400">
            ❯ test --concept="{concept.slug}"
          </div>

          <div className="text-slate-300 font-sans text-xs leading-snug">
            {prompt}
          </div>

          <div className="p-2.5 rounded-lg bg-[#05070c] border border-[#1a2130] text-slate-300 font-mono text-[10px] leading-relaxed whitespace-pre-wrap select-all">
            {starterCode}
          </div>

          <div className="text-[10px] text-slate-400 font-sans pt-1">
            ❯ Drop your solution in the comments below!
          </div>
        </div>
      </div>
    </div>
  )
}

function ConceptSlide7CallToAction() {
  return (
    <div className="flex flex-col gap-4 my-auto text-left">
      <div className="space-y-1">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Join the Movement.
        </h2>
        <p className="text-xs text-slate-400">
          Developer tooling shouldn't sit behind a paywall or sponsored gatekeeping.
        </p>
      </div>

      {/* Two Action Cards */}
      <div className="space-y-2.5">
        <div className="p-3.5 rounded-xl bg-[#111622] border border-[#1e2638] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 font-mono">01 Explore</span>
            <div className="text-sm font-bold text-white">learnblazinglyfast.tech</div>
          </div>
          <span className="text-slate-400">→</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#111622] border border-[#1e2638] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 font-mono">02 Contribute</span>
            <div className="text-sm font-bold text-white">github.com/EmmanuelEkundayo</div>
          </div>
          <span className="text-slate-400">→</span>
        </div>
      </div>

      {/* Footer Instructions */}
      <div className="space-y-1.5 pt-1 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <BookmarkIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>Save this post for your next technical interview or study session.</span>
        </div>
        <div className="flex items-center gap-2">
          <ChatIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>Drop a comment if you'd like to contribute!</span>
        </div>
      </div>
    </div>
  )
}

// ─── Mode 2: Platform Manifesto (The 9 Slides from PDF) ───────────────────────

function ManifestoSlideDispatcher({ index, totalSlides, isExportResolution }) {
  const currentStr = String(index + 1).padStart(2, '0')
  const totalStr = String(totalSlides).padStart(2, '0')

  const titles = [
    'OPEN SOURCE · DEV TOOLING',
    'THE PROBLEM',
    'THE INSIGHT',
    'THE SOLUTION',
    'WHAT\'S INSIDE · 01',
    'WHAT\'S INSIDE · 02',
    'THE PHILOSOPHY',
    'JOIN THE BUILD',
    'GET STARTED',
  ]

  return (
    <>
      {/* Top Header Row */}
      <div className="flex items-center justify-between pb-2">
        <span className="text-[10px] sm:text-[11px] font-bold tracking-widest uppercase text-blue-400 font-mono">
          {titles[index] || 'LEARN BLAZINGLY FAST'}
        </span>
        <span className="text-[10px] sm:text-[11px] font-mono text-slate-500 font-semibold">
          {currentStr} / {totalStr}
        </span>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex flex-col justify-center my-auto py-2">
        {index === 0 && <ManifestoSlide1 />}
        {index === 1 && <ManifestoSlide2 />}
        {index === 2 && <ManifestoSlide3 />}
        {index === 3 && <ManifestoSlide4 />}
        {index === 4 && <ManifestoSlide5 />}
        {index === 5 && <ManifestoSlide6 />}
        {index === 6 && <ManifestoSlide7 />}
        {index === 7 && <ManifestoSlide8 />}
        {index === 8 && <ManifestoSlide9 />}
      </div>

      {/* Bottom Footer Row */}
      <div className="pt-2 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 font-medium">
        <span>learnblazinglyfast.tech</span>
        <span>{index === 0 ? 'Swipe to explore →' : currentStr}</span>
      </div>
    </>
  )
}

function ManifestoSlide1() {
  return (
    <div className="flex flex-col gap-4 my-auto text-left">
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-medium w-fit">
        <ForkIcon className="w-3 h-3" />
        <span>Open Source & Free</span>
      </div>

      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
          The Visual Dictionary <br />
          <span className="text-[#38bdf8]">Modern Developers</span> <br />
          Are Missing.
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 font-normal leading-relaxed">
          Why 45-minute tutorials and static documentation don't cut it in the age of AI.
        </p>
      </div>

      <div className="w-full aspect-[16/9] rounded-xl bg-[#111622] border border-[#1e2638] flex items-center justify-center p-3 relative overflow-hidden">
        <MinimalTreeGraphic />
      </div>
    </div>
  )
}

function ManifestoSlide2() {
  return (
    <div className="flex flex-col gap-4 my-auto text-left">
      <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
        The Modern Developer's Dilemma
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3.5 rounded-xl bg-[#111622] border border-[#1e2638] space-y-1">
          <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-400">
            <LightningIcon className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-bold text-blue-400">2 seconds</div>
          <div className="text-[11px] text-slate-400">for AI to write your boilerplate</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#111622] border border-[#1e2638] space-y-1">
          <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-slate-300">
            <ClockIcon className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-bold text-white">45 minutes</div>
          <div className="text-[11px] text-slate-400">to explain ONE concept on video</div>
        </div>
      </div>

      <div className="space-y-2.5 pt-1">
        <div className="flex items-center gap-2.5 text-xs text-slate-300">
          <span className="w-4 h-4 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center font-bold text-[10px] shrink-0">
            ×
          </span>
          <span>45-minute YouTube lectures for a 30-second answer</span>
        </div>

        <div className="flex items-center gap-2.5 text-xs text-slate-300">
          <span className="w-4 h-4 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center font-bold text-[10px] shrink-0">
            ×
          </span>
          <span>3,000-word walls of dry academic documentation</span>
        </div>
      </div>
    </div>
  )
}

function ManifestoSlide3() {
  return (
    <div className="flex flex-col gap-3.5 my-auto text-left">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Why Static Docs Fail Dynamic Logic
        </h2>
        <p className="text-xs text-blue-400 font-semibold mt-1">
          Algorithms are living systems:
        </p>
      </div>

      <div className="space-y-2 text-xs text-slate-300">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span>Memory changes dynamically</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span>Signals propagate across layers</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span>Pointers shift in real time</span>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-[#111622] border border-[#1e2638] text-xs text-slate-300 leading-relaxed italic">
        "Reading about Tree BFS or Transformer Activations in a textbook is like learning how an engine works — from a still photo."
      </div>
    </div>
  )
}

function ManifestoSlide4() {
  return (
    <div className="flex flex-col gap-4 my-auto text-left">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          A Visual Dictionary for Developers
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          What if documentation worked like a dictionary?
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-xl bg-[#111622] border border-[#1e2638] text-center space-y-1">
          <span className="text-[10px] font-mono text-blue-400 font-bold block">01</span>
          <span className="text-[11px] text-slate-200 block font-medium leading-snug">Look up any concept</span>
        </div>
        <div className="p-3 rounded-xl bg-[#111622] border border-[#1e2638] text-center space-y-1">
          <span className="text-[10px] font-mono text-blue-400 font-bold block">02</span>
          <span className="text-[11px] text-slate-200 block font-medium leading-snug">Absorb model in &lt; 5 min</span>
        </div>
        <div className="p-3 rounded-xl bg-[#111622] border border-[#1e2638] text-center space-y-1">
          <span className="text-[10px] font-mono text-blue-400 font-bold block">03</span>
          <span className="text-[11px] text-slate-200 block font-medium leading-snug">Get back to building</span>
        </div>
      </div>

      <div className="w-full py-3 px-4 rounded-xl bg-blue-600 text-white font-bold text-xs text-center shadow-lg shadow-blue-500/20">
        That's why I built learnblazinglyfast.tech
      </div>
    </div>
  )
}

function ManifestoSlide5() {
  return (
    <div className="flex flex-col gap-3.5 my-auto text-left">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Zero Fluff. Pure Visual Intuition.
        </h2>
        <p className="text-xs text-blue-400 font-semibold mt-1">
          550+ CS & ML concepts
        </p>
      </div>

      <div className="space-y-2.5">
        <div className="p-3 rounded-xl bg-[#111622] border border-[#1e2638] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-mono font-bold text-blue-400 text-xs shrink-0">
            #
          </div>
          <div>
            <div className="text-xs font-bold text-white">Activation functions</div>
            <div className="text-[11px] text-slate-400">See them act like circuit switches, live.</div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#111622] border border-[#1e2638] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-mono font-bold text-blue-400 text-xs shrink-0">
            &lt;&gt;
          </div>
          <div>
            <div className="text-xs font-bold text-white">Data structures</div>
            <div className="text-[11px] text-slate-400">Watch them shift, step by step.</div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#111622] border border-[#1e2638] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-mono font-bold text-blue-400 text-xs shrink-0">
            @
          </div>
          <div>
            <div className="text-xs font-bold text-white">Applied math & fractals</div>
            <div className="text-[11px] text-slate-400">Explore them right in your browser.</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ManifestoSlide6() {
  return (
    <div className="flex flex-col gap-3.5 my-auto text-left">
      <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
        Engineered for High-Density Utility
      </h2>

      <div className="space-y-2.5">
        <div className="p-3 rounded-xl bg-[#111622] border border-[#1e2638] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-blue-400 shrink-0">
            <CodeIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">28+ syntax cheat sheets</div>
            <div className="text-[11px] text-slate-400">SQL, Node.js, C++, React Hooks.</div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#111622] border border-[#1e2638] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-blue-400 shrink-0">
            <BookIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Structured roadmaps</div>
            <div className="text-[11px] text-slate-400">FAANG interview prep & system design.</div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#111622] border border-[#1e2638] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-blue-400 shrink-0">
            <PlayIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Multi-language IDE</div>
            <div className="text-[11px] text-slate-400">Run Python, JS, Java, C++ — zero setup.</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ManifestoSlide7() {
  return (
    <div className="flex flex-col gap-4 my-auto text-left">
      <div className="space-y-1">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          100% Free. <br />
          100% Open Source.
        </h2>
        <p className="text-xs text-slate-400">
          Developer tooling shouldn't sit behind a paywall or sponsored gatekeeping.
        </p>
      </div>

      <div className="my-1 flex justify-center text-blue-400">
        <ForkIcon className="w-12 h-12" />
      </div>

      <div className="space-y-2 text-xs text-slate-300">
        <div className="flex items-center gap-2.5">
          <span className="w-4 h-4 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center text-[10px] font-bold">
            ✓
          </span>
          <span>Built with modern web standards</span>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="w-4 h-4 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center text-[10px] font-bold">
            ✓
          </span>
          <span>Community-focused from day one</span>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="w-4 h-4 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center text-[10px] font-bold">
            ✓
          </span>
          <span>Free for every engineer, everywhere</span>
        </div>
      </div>
    </div>
  )
}

function ManifestoSlide8() {
  return (
    <div className="flex flex-col gap-3.5 my-auto text-left">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Calling All Contributors
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          We're turning this into the web's definitive interactive CS dictionary — and we need you.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3 rounded-xl bg-[#111622] border border-[#1e2638] space-y-1">
          <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-blue-400">
            <CodeIcon className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs font-bold text-white">React / Tailwind engineers</div>
        </div>

        <div className="p-3 rounded-xl bg-[#111622] border border-[#1e2638] space-y-1">
          <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-blue-400">
            <CanvasIcon className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs font-bold text-white">Canvas / Three.js / WebGL</div>
        </div>

        <div className="p-3 rounded-xl bg-[#111622] border border-[#1e2638] space-y-1">
          <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-blue-400">
            <BookIcon className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs font-bold text-white">System design writers</div>
        </div>

        <div className="p-3 rounded-xl bg-[#111622] border border-[#1e2638] space-y-1">
          <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-blue-400">
            <ForkIcon className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs font-bold text-white">ML explorers</div>
        </div>
      </div>

      <div className="text-xs text-slate-400 pt-1">
        First PR or fiftieth — everyone's welcome.
      </div>
    </div>
  )
}

function ManifestoSlide9() {
  return (
    <div className="flex flex-col gap-4 my-auto text-left">
      <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
        Join the Movement.
      </h2>

      <div className="space-y-2.5">
        <div className="p-3.5 rounded-xl bg-[#111622] border border-[#1e2638] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 font-mono">01 Explore</span>
            <div className="text-sm font-bold text-white">learnblazinglyfast.tech</div>
          </div>
          <span className="text-slate-400">→</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#111622] border border-[#1e2638] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 font-mono">02 Contribute</span>
            <div className="text-sm font-bold text-white">github.com/emmanuelekundayo</div>
          </div>
          <span className="text-slate-400">→</span>
        </div>
      </div>

      <div className="space-y-1.5 pt-1 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <BookmarkIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>Save this post for your next technical interview or study session.</span>
        </div>
        <div className="flex items-center gap-2">
          <ChatIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>Drop a comment if you'd like to contribute!</span>
        </div>
      </div>
    </div>
  )
}

// ─── Minimal Vector Graphics (Matching PDF) ──────────────────────────────────

function MinimalTreeGraphic() {
  return (
    <svg className="w-48 h-32" viewBox="0 0 200 120" fill="none">
      {/* Edges */}
      <line x1="100" y1="20" x2="60" y2="70" stroke="#1e293b" strokeWidth="1.5" />
      <line x1="100" y1="20" x2="140" y2="70" stroke="#1e293b" strokeWidth="1.5" />
      <line x1="100" y1="20" x2="100" y2="70" stroke="#1e293b" strokeWidth="1.5" />
      <line x1="60" y1="70" x2="40" y2="105" stroke="#1e293b" strokeWidth="1.5" />
      <line x1="60" y1="70" x2="80" y2="105" stroke="#1e293b" strokeWidth="1.5" />
      <line x1="140" y1="70" x2="120" y2="105" stroke="#1e293b" strokeWidth="1.5" />
      <line x1="140" y1="70" x2="160" y2="105" stroke="#1e293b" strokeWidth="1.5" />

      {/* Nodes */}
      <circle cx="100" cy="20" r="7" fill="#38bdf8" />
      <circle cx="100" cy="70" r="6" fill="#38bdf8" />
      <circle cx="60" cy="70" r="6" fill="#38bdf8" />
      <circle cx="140" cy="70" r="6" fill="#38bdf8" />

      <circle cx="40" cy="105" r="4.5" fill="#475569" />
      <circle cx="80" cy="105" r="4.5" fill="#475569" />
      <circle cx="120" cy="105" r="4.5" fill="#475569" />
      <circle cx="160" cy="105" r="4.5" fill="#475569" />
    </svg>
  )
}

// ─── SVG Icons (Clean Line/Solid, Zero Emojis) ───────────────────────────────

function ForkIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  )
}

function LightningIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  )
}

function ClockIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function CodeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  )
}

function BookIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}

function PlayIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}

function CanvasIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  )
}

function BookmarkIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function ChatIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function UploadIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function DownloadIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function CopyIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CloseIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
