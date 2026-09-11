import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import {
  downloadSlidePNG,
  copySlideImageToClipboard,
  exportCarouselZip,
  getTikTokCaption
} from '../../utils/tiktokExport.js'
import { complexityColor } from '../../utils/complexity.js'
import { trackShare } from '../../services/analytics.js'

export default function TikTokCarouselModal({ isOpen, onClose, concept, accent }) {
  const [activeSlide, setActiveSlide] = useState(0)
  const [exportingZip, setExportingZip] = useState(false)
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 6 })
  const [copiedCaption, setCopiedCaption] = useState(false)
  const [capturedVisualUrl, setCapturedVisualUrl] = useState(null)

  // References to the 6 slide elements for capturing
  const slideRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)]

  // Try to capture the live visualization canvas/SVG from the page when modal opens
  useEffect(() => {
    if (!isOpen) return
    try {
      const vizContainer = document.querySelector('[data-visualization-container]') || document.querySelector('canvas')
      if (vizContainer) {
        if (vizContainer.tagName === 'CANVAS') {
          setCapturedVisualUrl(vizContainer.toDataURL('image/png'))
        }
      }
    } catch (e) {
      console.debug('Live canvas capture note:', e)
    }
  }, [isOpen])

  if (!isOpen || !concept) return null

  const domain = concept.domain || 'DSA'
  const difficulty = concept.difficulty || 'intermediate'
  const card = concept.card || {}
  const exercise = concept.exercise || {}

  const SLIDE_NAMES = [
    '1. Hook Cover',
    '2. Visual Simulation',
    '3. Mental Model',
    '4. Traps & Gotchas',
    '5. Terminal Quiz',
    '6. Open Source CTA',
  ]

  // Handlers
  const handleDownloadActive = async () => {
    const el = slideRefs[activeSlide]?.current
    if (!el) return
    toast.loading('Rendering slide PNG...', { id: 'slide-dl' })
    const success = await downloadSlidePNG(el, `${concept.slug}-slide-0${activeSlide + 1}.png`)
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
      toast.success(`📸 Slide ${activeSlide + 1} copied! Paste anywhere.`, { id: 'slide-copy' })
      trackShare({ slug: concept.slug, title: concept.title, platform: 'tiktok_slide_copy', method: 'copy_image' })
    } else {
      toast.error('Clipboard copy not supported by browser. Use Download instead!', { id: 'slide-copy' })
    }
  }

  const handleDownloadAllZip = async () => {
    const elements = slideRefs.map(r => r.current).filter(Boolean)
    if (elements.length < 6) {
      toast.error('Preparing slides, please try again in a moment.')
      return
    }

    setExportingZip(true)
    toast.loading('Generating TikTok Carousel ZIP (1080x1920)...', { id: 'zip-dl' })

    const success = await exportCarouselZip(elements, concept, (current, total) => {
      setExportProgress({ current, total })
    })

    setExportingZip(false)
    if (success) {
      toast.success('🎉 All 6 slides + caption.txt downloaded as ZIP!', { id: 'zip-dl', duration: 4500 })
      trackShare({ slug: concept.slug, title: concept.title, platform: 'tiktok_carousel_zip', method: 'download_zip' })
    } else {
      toast.error('Failed to export ZIP package', { id: 'zip-dl' })
    }
  }

  const handleCopyCaption = () => {
    const caption = getTikTokCaption(concept)
    navigator.clipboard.writeText(caption)
    setCopiedCaption(true)
    toast.success('📋 TikTok Caption & Hashtags copied!', { duration: 3000 })
    setTimeout(() => setCopiedCaption(false), 2500)
  }

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      {/* Click outside to close */}
      <div className="fixed inset-0" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 w-full max-w-5xl bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-700 bg-surface-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <TikTokLogo className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">TikTok Carousel Exporter</h2>
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  9:16 Viral Format
                </span>
              </div>
              <p className="text-xs text-gray-400">
                High-converting, 6-slide swipeable carousel tailored for TikTok, Instagram & LinkedIn.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-surface-700 transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Slide Selector & Export Controls */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-6 items-center lg:items-start justify-center">

          {/* Left: Interactive 9:16 Preview Box */}
          <div className="flex flex-col items-center gap-3">
            {/* Slide Navigation Buttons */}
            <div className="flex items-center gap-1.5 p-1 bg-surface-800 border border-surface-700 rounded-xl overflow-x-auto max-w-full">
              {SLIDE_NAMES.map((name, i) => (
                <button
                  key={name}
                  onClick={() => setActiveSlide(i)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activeSlide === i
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-500/20'
                      : 'text-gray-400 hover:text-white hover:bg-surface-700/60'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>

            {/* The 9:16 Mobile Mockup Frame */}
            <div className="relative rounded-[28px] border-4 border-surface-700 shadow-2xl p-1 bg-[#0a0d14] overflow-hidden">
              {/* Phone Speaker Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-surface-700 rounded-full z-20 pointer-events-none" />

              {/* Render Visible Active Slide */}
              <div className="w-[320px] sm:w-[350px] aspect-[9/16] overflow-hidden rounded-[22px] relative bg-[#0a0d14]">
                <SlideComponent
                  index={activeSlide}
                  concept={concept}
                  card={card}
                  exercise={exercise}
                  domain={domain}
                  difficulty={difficulty}
                  accent={accent}
                  capturedVisualUrl={capturedVisualUrl}
                />
              </div>

              {/* Prev / Next Chevrons */}
              <button
                onClick={() => setActiveSlide((s) => (s > 0 ? s - 1 : 5))}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center transition-transform hover:scale-110"
                title="Previous Slide"
              >
                ←
              </button>
              <button
                onClick={() => setActiveSlide((s) => (s < 5 ? s + 1 : 0))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center transition-transform hover:scale-110"
                title="Next Slide"
              >
                →
              </button>
            </div>

            <div className="text-xs text-gray-400 flex items-center gap-1.5">
              <span>Previewing Slide {activeSlide + 1} of 6</span>
              <span>•</span>
              <span className="text-pink-400 font-mono">1080 × 1920 Export Ready</span>
            </div>
          </div>

          {/* Right: Export Actions & Viral Toolkit */}
          <div className="w-full lg:w-80 flex flex-col gap-4">

            {/* Primary Action: Download All as ZIP */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-pink-950/40 via-surface-800 to-surface-800 border border-pink-500/30 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">📦</span>
                <div>
                  <h3 className="text-sm font-bold text-white">Export Complete Carousel</h3>
                  <p className="text-[11px] text-gray-300">All 6 slides + caption in 1 ZIP</p>
                </div>
              </div>

              <button
                onClick={handleDownloadAllZip}
                disabled={exportingZip}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white shadow-lg shadow-pink-500/25 transition-all flex items-center justify-center gap-2"
              >
                {exportingZip ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Rendering ({exportProgress.current}/{exportProgress.total})...</span>
                  </>
                ) : (
                  <>
                    <DownloadIcon className="w-4 h-4" />
                    <span>Download All Slides (.ZIP)</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Actions for Active Slide */}
            <div className="p-4 rounded-xl bg-surface-800 border border-surface-700 space-y-2.5">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Current Slide Actions</h4>

              <button
                onClick={handleDownloadActive}
                className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-surface-700 hover:bg-surface-600 text-white transition-colors flex items-center justify-center gap-2"
              >
                <DownloadIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>Download Slide {activeSlide + 1} (PNG)</span>
              </button>

              <button
                onClick={handleCopyActiveImage}
                className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-surface-700 hover:bg-surface-600 text-white transition-colors flex items-center justify-center gap-2"
              >
                <CopyIcon className="w-3.5 h-3.5 text-purple-400" />
                <span>Copy Slide Image to Clipboard</span>
              </button>
            </div>

            {/* Viral TikTok Caption Helper */}
            <div className="p-4 rounded-xl bg-surface-800 border border-surface-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">TikTok Caption & Hashtags</h4>
                <button
                  onClick={handleCopyCaption}
                  className="text-[11px] text-pink-400 hover:text-pink-300 font-semibold transition-colors flex items-center gap-1"
                >
                  {copiedCaption ? '✓ Copied!' : 'Copy Caption'}
                </button>
              </div>

              <div className="p-2.5 rounded-lg bg-surface-900 border border-surface-700/80 text-[11px] text-gray-300 font-mono leading-relaxed max-h-28 overflow-y-auto select-all">
                {getTikTokCaption(concept)}
              </div>
            </div>

            {/* Strategy Checklist */}
            <div className="p-3.5 rounded-xl bg-surface-800/60 border border-surface-700/60 text-[11px] text-gray-400 space-y-1.5">
              <p className="font-bold text-gray-200">💡 TikTok Viral Checklist:</p>
              <p>• Post as **Photo Mode (Swipe Carousel)**.</p>
              <p>• Pick a trending audio at low volume.</p>
              <p>• Pin a comment: *"What's your answer to Slide 5?"*</p>
            </div>

          </div>
        </div>

        {/* Hidden Render Container: Holds all 6 slides in true 9:16 layout for batch export */}
        <div className="fixed -left-[9999px] -top-[9999px] pointer-events-none opacity-0">
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <div
              key={idx}
              ref={slideRefs[idx]}
              className="w-[540px] h-[960px] overflow-hidden bg-[#0a0d14]"
              style={{ width: '540px', height: '960px' }}
            >
              <SlideComponent
                index={idx}
                concept={concept}
                card={card}
                exercise={exercise}
                domain={domain}
                difficulty={difficulty}
                accent={accent}
                capturedVisualUrl={capturedVisualUrl}
                isExportResolution={true}
              />
            </div>
          ))}
        </div>

      </motion.div>
    </div>
  )
}

// ─── Individual Slide Renderer (9:16 Vertical Cards) ──────────────────────────

function SlideComponent({
  index,
  concept,
  card,
  exercise,
  domain,
  difficulty,
  accent,
  capturedVisualUrl,
  isExportResolution = false,
}) {
  const scaleClass = isExportResolution ? 'p-8 text-base' : 'p-4 text-xs'

  return (
    <div
      className={`w-full h-full flex flex-col justify-between select-none relative bg-[#0a0d14] text-white ${scaleClass}`}
      style={{
        backgroundImage: 'radial-gradient(ellipse 90% 70% at 50% -15%, rgba(120, 119, 198, 0.15), rgba(255, 255, 255, 0))',
      }}
    >
      {/* ── Top Header Bar (Watermark & Slide Counter) ── */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-[10px] font-black">
            ⚡️
          </div>
          <div>
            <span className="font-extrabold tracking-tight text-white block text-[11px]">
              LEARN BLAZINGLY FAST
            </span>
            <span className="text-[8px] text-gray-400 block tracking-wider uppercase font-semibold">
              The Visual Tech Dictionary
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[9px] font-mono font-bold text-gray-300">
            0{index + 1} / 06
          </span>
        </div>
      </div>

      {/* ── Slide Specific Content ── */}
      <div className="flex-1 flex flex-col justify-center my-auto py-2">
        {index === 0 && (
          <Slide1Cover concept={concept} domain={domain} difficulty={difficulty} />
        )}
        {index === 1 && (
          <Slide2Visual concept={concept} card={card} capturedVisualUrl={capturedVisualUrl} />
        )}
        {index === 2 && (
          <Slide3Intuition concept={concept} card={card} />
        )}
        {index === 3 && (
          <Slide4Gotchas concept={concept} card={card} domain={domain} />
        )}
        {index === 4 && (
          <Slide5TerminalQuiz concept={concept} exercise={exercise} />
        )}
        {index === 5 && (
          <Slide6CallToAction concept={concept} />
        )}
      </div>

      {/* ── Bottom Footer Bar (Open Source & Swipe Hook) ── */}
      <div className="border-t border-white/10 pt-3 flex items-center justify-between text-[9px] text-gray-400">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="text-emerald-400 font-bold">●</span>
          <span>learnblazinglyfast.tech</span>
          <span className="text-gray-500">•</span>
          <span className="text-gray-400 font-mono">MIT Open Source</span>
        </div>

        <div className="flex items-center gap-1 font-bold text-pink-400 animate-pulse">
          <span>{index === 5 ? 'Share with a dev 🚀' : 'Swipe ➔'}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Slide 1: Hook / Cover ───────────────────────────────────────────────────

function Slide1Cover({ concept, domain, difficulty }) {
  const diffColor =
    difficulty === 'beginner'
      ? 'bg-green-500/20 text-green-300 border-green-500/40'
      : difficulty === 'intermediate'
      ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
      : 'bg-red-500/20 text-red-300 border-red-500/40'

  return (
    <div className="flex flex-col gap-4 text-center items-center my-auto">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/15 border border-pink-500/40 text-pink-300 font-bold text-[10px] tracking-wider uppercase shadow-lg shadow-pink-500/20">
        <span>🔥 TECH CONCEPT OF THE DAY</span>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight px-2">
          {concept.title}
        </h1>
        <div className="flex items-center justify-center gap-2">
          <span className="px-2.5 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/30 text-blue-300 font-bold text-[10px]">
            {domain}
          </span>
          <span className={`px-2.5 py-0.5 rounded-md border text-[10px] font-bold capitalize ${diffColor}`}>
            {difficulty}
          </span>
        </div>
      </div>

      {/* Hero Hook Callout */}
      <div className="w-full p-4 rounded-2xl bg-surface-800/80 border border-surface-700 shadow-xl text-left space-y-2.5 mt-2">
        <p className="text-xs text-gray-200 font-medium leading-relaxed">
          "Master this fundamental in 60 seconds with zero textbook fluff."
        </p>
        <div className="grid grid-cols-1 gap-1.5 text-[10px] text-gray-400 font-medium">
          <div className="flex items-center gap-2 text-cyan-300">
            <span>⚡️</span> <span>Interactive Step Simulation</span>
          </div>
          <div className="flex items-center gap-2 text-purple-300">
            <span>🧠</span> <span>Real-World Mental Analogy</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-300">
            <span>💻</span> <span>Terminal Coding Challenge</span>
          </div>
        </div>
      </div>

      {/* Swipe Pill */}
      <div className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2">
        <span>👉 SWIPE TO VISUALIZE</span>
        <span className="text-base">➔</span>
      </div>
    </div>
  )
}

// ─── Slide 2: Visual Simulation ──────────────────────────────────────────────

function Slide2Visual({ concept, card, capturedVisualUrl }) {
  return (
    <div className="flex flex-col gap-3 my-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">👁️</span>
          <h3 className="font-extrabold text-sm text-white tracking-tight">How It Works (Visual Simulation)</h3>
        </div>
        <span className="text-[9px] px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 font-bold">ANIMATED</span>
      </div>

      {/* Visual Frame */}
      <div className="w-full aspect-[4/3] rounded-2xl bg-[#0e121b] border-2 border-purple-500/30 shadow-2xl relative overflow-hidden flex items-center justify-center p-3">
        {capturedVisualUrl ? (
          <img
            src={capturedVisualUrl}
            alt={concept.title}
            className="w-full h-full object-contain filter drop-shadow-md"
          />
        ) : (
          <VisualPlaceholder concept={concept} />
        )}

        <div className="absolute bottom-2 left-2 right-2 px-2.5 py-1.5 rounded-lg bg-black/75 backdrop-blur-md border border-white/10 text-[9px] text-gray-300 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-mono">Step 01: Initial Transition</span>
          </span>
          <span className="text-cyan-400 font-semibold font-mono">Live on site</span>
        </div>
      </div>

      {/* Visual Breakdown Annotation */}
      <div className="p-3 rounded-xl bg-surface-800/90 border border-surface-700 space-y-1.5">
        <p className="text-[11px] font-bold text-purple-300 flex items-center gap-1">
          <span>⚡️</span> Core Takeaway:
        </p>
        <p className="text-[10px] text-gray-300 leading-relaxed">
          {card?.intuition?.slice(0, 140) || 'Watch how data flows through states and memory boundaries.'}...
        </p>
      </div>
    </div>
  )
}

function VisualPlaceholder({ concept }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center p-2">
      <div className="flex items-center gap-2">
        <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-300 font-mono font-black text-sm shadow-lg shadow-blue-500/20">
          IN
        </div>
        <span className="text-purple-400 font-bold text-sm animate-pulse">➔</span>
        <div className="w-14 h-14 rounded-2xl bg-purple-500/25 border-2 border-purple-400 flex flex-col items-center justify-center text-purple-200 font-mono font-bold text-[10px] shadow-xl shadow-purple-500/30">
          <span>CORE</span>
          <span className="text-[8px] text-purple-300">TRANSFORM</span>
        </div>
        <span className="text-purple-400 font-bold text-sm animate-pulse">➔</span>
        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 font-mono font-black text-sm shadow-lg shadow-emerald-500/20">
          OUT
        </div>
      </div>
      <div className="px-3 py-1 rounded-full bg-surface-700/80 border border-surface-600 text-[9px] text-gray-300 font-mono">
        {concept.title} • Reactive State Machine
      </div>
    </div>
  )
}

// ─── Slide 3: Intuition, Analogy & Complexity ────────────────────────────────

function Slide3Intuition({ concept, card }) {
  return (
    <div className="flex flex-col gap-3 my-auto">
      <div className="space-y-0.5">
        <span className="text-[10px] text-cyan-400 font-bold tracking-wider uppercase">03 / 06 • Mental Model</span>
        <h2 className="text-base font-black text-white tracking-tight">The Intuition & Analogy</h2>
      </div>

      {/* Intuition Box */}
      <div className="p-3 rounded-xl bg-surface-800/90 border border-surface-700 space-y-1">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
          <span>💡</span> The Intuition
        </h4>
        <p className="text-[10.5px] text-gray-200 leading-relaxed font-normal">
          {card?.intuition || 'A foundational computing concept solving performance and structure trade-offs.'}
        </p>
      </div>

      {/* Analogy Box */}
      {card?.analogy && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-purple-950/40 to-surface-800 border border-purple-500/30 space-y-1">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1">
            <span>🎭</span> Real-World Analogy
          </h4>
          <p className="text-[10.5px] text-gray-300 leading-relaxed italic">
            "{card.analogy}"
          </p>
        </div>
      )}

      {/* Complexity Matrix */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="p-2.5 rounded-xl bg-surface-800 border border-surface-700 text-center space-y-0.5">
          <span className="text-[9px] text-gray-400 font-bold uppercase block">Time Complexity</span>
          <span className="text-xs font-mono font-black text-emerald-400 block">
            {card?.time_complexity || 'O(N)'}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-surface-800 border border-surface-700 text-center space-y-0.5">
          <span className="text-[9px] text-gray-400 font-bold uppercase block">Space Complexity</span>
          <span className="text-xs font-mono font-black text-cyan-400 block">
            {card?.space_complexity || 'O(1)'}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Slide 4: Gotchas & Interview Traps ───────────────────────────────────────

function Slide4Gotchas({ concept, card, domain }) {
  return (
    <div className="flex flex-col gap-3 my-auto">
      <div className="space-y-0.5">
        <span className="text-[10px] text-yellow-400 font-bold tracking-wider uppercase">04 / 06 • Pro Tips</span>
        <h2 className="text-base font-black text-white tracking-tight">Common Interview Traps</h2>
      </div>

      <div className="space-y-2">
        <div className="p-3 rounded-xl bg-surface-800/90 border border-red-500/30 space-y-1">
          <div className="flex items-center gap-1.5 text-red-400 text-xs font-bold">
            <span>⚠️</span> <span>Trap 1: Edge Cases & Off-by-One</span>
          </div>
          <p className="text-[10px] text-gray-300 leading-relaxed">
            Failing to test empty inputs, boundary bounds (0 or n-1), or integer overflow when computing midpoints.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-surface-800/90 border border-yellow-500/30 space-y-1">
          <div className="flex items-center gap-1.5 text-yellow-400 text-xs font-bold">
            <span>⚡️</span> <span>Trap 2: State Mutation Side-Effects</span>
          </div>
          <p className="text-[10px] text-gray-300 leading-relaxed">
            Directly mutating arguments instead of treating memory as immutable, causing subtle stale-closure bugs.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-950/40 to-surface-800 border border-cyan-500/30 space-y-1">
          <div className="flex items-center gap-1.5 text-cyan-300 text-xs font-bold">
            <span>💡</span> <span>Golden Rule of Thumb:</span>
          </div>
          <p className="text-[10px] text-gray-200 leading-relaxed font-semibold">
            "Before writing code, trace the base case and constraints. 90% of interview rejections happen on edge conditions."
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Slide 5: Terminal Quiz Challenge ────────────────────────────────────────

function Slide5TerminalQuiz({ concept, exercise }) {
  const prompt = exercise?.prompt || 'Test your understanding of this concept:'
  const starterCode = exercise?.starter_code || 'function solution(input) {\n  // What goes here?\n  return ____;\n}'

  return (
    <div className="flex flex-col gap-3 my-auto">
      <div className="space-y-0.5">
        <span className="text-[10px] text-purple-400 font-bold tracking-wider uppercase">05 / 06 • Interactive Quiz</span>
        <h2 className="text-base font-black text-white tracking-tight">Terminal Challenge 💻</h2>
      </div>

      {/* Terminal Window */}
      <div className="w-full rounded-2xl bg-[#0c0f17] border border-surface-600 shadow-2xl overflow-hidden">
        {/* Terminal Titlebar */}
        <div className="px-3 py-2 bg-[#141824] border-b border-surface-700 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
          </div>
          <span className="text-[9px] font-mono text-gray-400">challenge.test.js</span>
          <span className="text-[9px] text-gray-500 font-mono">bash</span>
        </div>

        {/* Terminal Body */}
        <div className="p-3 font-mono text-[10px] space-y-2 text-left">
          <div className="text-emerald-400 font-semibold">
            ❯ run-quiz --concept="{concept.slug}"
          </div>

          <div className="text-gray-300 font-sans text-[11px] leading-snug font-medium pt-1">
            {prompt}
          </div>

          <div className="p-2.5 rounded-lg bg-[#07090e] border border-surface-800 text-cyan-300 font-mono text-[9.5px] leading-relaxed whitespace-pre-wrap select-all">
            {starterCode}
          </div>

          <div className="text-[9px] text-pink-400 font-sans font-bold flex items-center gap-1 pt-1">
            <span>💬</span> <span>Drop your answer in the comments below!</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Slide 6: Call To Action & Open Source ───────────────────────────────────

function Slide6CallToAction({ concept }) {
  return (
    <div className="flex flex-col gap-3 text-center items-center my-auto">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 via-purple-600 to-blue-600 flex items-center justify-center text-white text-2xl shadow-xl shadow-pink-500/25">
        ⚡️
      </div>

      <div className="space-y-1">
        <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
          Level Up Your Dev Skills
        </h2>
        <p className="text-[10px] text-gray-300 max-w-xs mx-auto">
          Master 550+ concepts with visual simulators, quizzes & roadmaps.
        </p>
      </div>

      {/* Feature Pills */}
      <div className="w-full p-3 rounded-xl bg-surface-800/90 border border-surface-700 text-left space-y-1.5 text-[10px]">
        <div className="flex items-center gap-2 text-gray-200">
          <span className="text-cyan-400 font-bold">✓</span> <span>550+ Interactive Visual Simulators</span>
        </div>
        <div className="flex items-center gap-2 text-gray-200">
          <span className="text-purple-400 font-bold">✓</span> <span>Curated Full-Stack & ML Roadmaps</span>
        </div>
        <div className="flex items-center gap-2 text-gray-200">
          <span className="text-emerald-400 font-bold">✓</span> <span>100% Free • No Ads • No Sign-Up Wall</span>
        </div>
      </div>

      {/* Open Source Callout */}
      <div className="w-full p-2.5 rounded-xl bg-gradient-to-r from-blue-950/40 to-surface-800 border border-blue-500/30 text-left space-y-0.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-bold text-white flex items-center gap-1">
            <span>⭐</span> 100% Open Source on GitHub
          </span>
          <span className="text-cyan-400 font-mono text-[9px]">MIT License</span>
        </div>
        <p className="text-[9px] text-gray-400 font-mono">
          github.com/EmmanuelEkundayo/Learn-Blazingly-Fast
        </p>
      </div>

      {/* Social Action Checklist */}
      <div className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white text-[10.5px] font-bold space-y-0.5 shadow-lg shadow-pink-500/20">
        <p>❤️ Like & 🔄 Share if you learned something</p>
        <p className="text-pink-200 text-[9.5px]">➕ Follow for daily visual CS breakdowns!</p>
      </div>
    </div>
  )
}

// ─── SVG Icons ───────────────────────────────────────────────────────────────

function TikTokLogo({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
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
