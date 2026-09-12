import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import html2canvas from 'html2canvas'
import {
  downloadSlidePNG,
  copySlideImageToClipboard,
  exportCarouselZip,
  exportVideoClip,
  isVideoExportSupported,
  getTikTokCaption,
  openTikTokUpload
} from '../../utils/tiktokExport.js'
import { trackShare } from '../../services/analytics.js'
import LBFLogo from './LBFLogo.jsx'
import AnimatedSlideVisualizer from './AnimatedSlideVisualizer.jsx'
import { getSteps, getDefaultSortArray } from '../../utils/algorithms/registry.js'

const SLIDE_NAMES = [
  '01. Cover Hook',
  '02. Visualization',
  '03. Definition',
  '04. Complexity & Use Case',
  '05. Traps & Gotchas',
  '06. Terminal Challenge',
  '07. Platform & Open Source',
]

export default function TikTokCarouselModal({ isOpen, onClose, concept, accent }) {
  const [activeSlide, setActiveSlide] = useState(0)
  const [exportMode, setExportMode] = useState('video') // 'video' | 'carousel'
  const [exportingZip, setExportingZip] = useState(false)
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 7 })
  const [exportingVideo, setExportingVideo] = useState(false)
  const [videoProgress, setVideoProgress] = useState({ percent: 0, currentSec: 0, totalSec: 15, message: '' })
  const [videoResult, setVideoResult] = useState(null)
  const [isPlayingPreview, setIsPlayingPreview] = useState(false)
  const [previewTimer, setPreviewTimer] = useState(0)
  const [copiedCaption, setCopiedCaption] = useState(false)
  const [capturedVisualUrl, setCapturedVisualUrl] = useState(null)

  // 7 slide references for export rendering
  const slideRefs = [
    useRef(null), useRef(null), useRef(null),
    useRef(null), useRef(null), useRef(null),
    useRef(null)
  ]

  // Capture canvas or SVG/DOM visualizer if present on the page
  useEffect(() => {
    if (!isOpen) return
    let active = true

    const captureViz = async () => {
      try {
        const el = document.getElementById('concept-visualization-section') || document.querySelector('[data-visualization-container]')
        if (el) {
          const canvasEl = el.querySelector('canvas')
          if (canvasEl) {
            try {
              const dataUrl = canvasEl.toDataURL('image/png')
              if (dataUrl && dataUrl.length > 100) {
                if (active) setCapturedVisualUrl(dataUrl)
                return
              }
            } catch (e) {
              // canvas might be tainted
            }
          }

          // Target inner visualization stage to avoid capturing outer step controls
          const stageEl = el.querySelector('svg, canvas, [class*="overflow-x-auto"], [class*="aspect-"], [class*="grid"]') || el

          // Use html2canvas to snapshot the SVG / DOM visualizer
          const renderedCanvas = await html2canvas(stageEl, {
            backgroundColor: '#0b0e14',
            scale: 1.5,
            logging: false,
            useCORS: true,
          })
          if (active && renderedCanvas) {
            setCapturedVisualUrl(renderedCanvas.toDataURL('image/png'))
          }
        }
      } catch (err) {
        console.debug('Failed to capture visualization element:', err)
      }
    }

    captureViz()
    return () => { active = false }
  }, [isOpen])

  // 15-second slideshow preview playback
  useEffect(() => {
    if (!isPlayingPreview) return
    const SCHEDULE = [
      { start: 0, end: 2.0, idx: 0 },
      { start: 2.0, end: 5.0, idx: 1 },
      { start: 5.0, end: 7.0, idx: 2 },
      { start: 7.0, end: 9.0, idx: 3 },
      { start: 9.0, end: 11.0, idx: 4 },
      { start: 11.0, end: 13.0, idx: 5 },
      { start: 13.0, end: 15.0, idx: 6 },
    ]

    const interval = setInterval(() => {
      setPreviewTimer((prev) => {
        const next = Math.round((prev + 0.1) * 10) / 10
        if (next >= 15.0) {
          setIsPlayingPreview(false)
          setActiveSlide(0)
          return 0
        }
        const currentSlot = SCHEDULE.find((s) => next >= s.start && next < s.end)
        if (currentSlot && currentSlot.idx !== activeSlide) {
          setActiveSlide(currentSlot.idx)
        }
        return next
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isPlayingPreview, activeSlide])

  const [autoVizProgress, setAutoVizProgress] = useState(0)

  useEffect(() => {
    if (exportMode !== 'video' || isPlayingPreview || activeSlide !== 1) {
      return
    }
    const interval = setInterval(() => {
      setAutoVizProgress((p) => {
        const next = Math.round((p + 0.04) * 100) / 100
        return next >= 1.0 ? 0 : next
      })
    }, 120)
    return () => clearInterval(interval)
  }, [exportMode, isPlayingPreview, activeSlide])

  const vizProgress = isPlayingPreview
    ? Math.min(1, Math.max(0, (previewTimer - 2.0) / 3.0))
    : autoVizProgress

  if (!isOpen || !concept) return null

  const domain = concept.domain || 'Computer Science'
  const card = concept.card || {}
  const exercise = concept.exercise || {}
  const totalSlides = SLIDE_NAMES.length

  const togglePlayPreview = () => {
    if (isPlayingPreview) {
      setIsPlayingPreview(false)
    } else {
      setPreviewTimer(0)
      setActiveSlide(0)
      setIsPlayingPreview(true)
    }
  }

  const handleExportVideoClipAndOpenTikTok = async () => {
    const elements = slideRefs.map(r => r.current).filter(Boolean)
    if (elements.length < totalSlides) {
      toast.error('Preparing slide frames, please try again in a moment.')
      return
    }

    if (!isVideoExportSupported()) {
      toast.error('Video recording is not supported in this browser. Please use the 7-Slide Carousel ZIP export.', { duration: 5000 })
      setExportMode('carousel')
      return
    }

    setExportingVideo(true)
    setVideoProgress({ percent: 0, currentSec: 0, totalSec: 15, message: 'Starting video engine...' })

    const caption = getTikTokCaption(concept)
    try {
      await navigator.clipboard.writeText(caption)
    } catch {
      // ignore
    }

    const result = await exportVideoClip(elements, concept.slug, (prog) => {
      setVideoProgress(prog)
    }, concept)

    setExportingVideo(false)

    if (result && result.success) {
      setVideoResult(result)
      toast.success('15-Second video downloaded & caption copied! Opening TikTok Studio...', { duration: 4500 })
      trackShare({ slug: concept.slug, title: concept.title, platform: 'tiktok_video_15s', method: 'export_video' })
      setTimeout(() => {
        openTikTokUpload()
      }, 800)
    } else {
      toast.error(result?.error || 'Failed to generate video clip')
    }
  }

  const handleDownloadActive = async () => {
    const el = slideRefs[activeSlide]?.current
    if (!el) return
    toast.loading('Rendering slide PNG...', { id: 'slide-dl' })
    const filename = `${concept.slug}-slide-0${activeSlide + 1}.png`
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
    const elements = slideRefs.map(r => r.current).filter(Boolean)
    if (elements.length < totalSlides) {
      toast.error('Preparing slides, please try again in a moment.')
      return
    }

    setExportingZip(true)
    toast.loading(`Rendering ${totalSlides} slides (1080x1350)...`, { id: 'zip-dl' })

    const caption = getTikTokCaption(concept)
    try {
      await navigator.clipboard.writeText(caption)
    } catch {
      // ignore clipboard error if unfocused
    }

    const filenames = SLIDE_NAMES.map((_, i) => `slide-0${i + 1}.png`)
    const success = await exportCarouselZip(
      elements,
      concept.slug,
      filenames,
      caption,
      (current, total) => setExportProgress({ current, total })
    )

    setExportingZip(false)
    if (success) {
      toast.success('ZIP downloaded & caption copied! Opening TikTok Studio...', { id: 'zip-dl', duration: 4000 })
      trackShare({ slug: concept.slug, title: concept.title, platform: 'tiktok_carousel_zip', method: 'download_and_open' })
      setTimeout(() => {
        openTikTokUpload()
      }, 700)
    } else {
      toast.error('Failed to export ZIP package', { id: 'zip-dl' })
    }
  }

  const handleCopyCaption = () => {
    const caption = getTikTokCaption(concept)
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
            <LBFLogo className="w-8 h-8 rounded-lg" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">TikTok & Shorts Exporter</h2>
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                  {exportMode === 'video' ? '15s Video Clip' : '4:5 Photo Carousel'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Export {concept.title} as a 15-second motion video or 7-slide swipe carousel.
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

        {/* Body: Preview Box & Controls */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-6 items-center lg:items-start justify-center">

          {/* Left: 4:5 Carousel & Video Preview */}
          <div className="flex flex-col items-center gap-3">
            {/* Slide Navigation Buttons */}
            <div className="flex items-center gap-1.5 p-1 bg-[#111622] border border-[#1e2638] rounded-xl overflow-x-auto max-w-full">
              {SLIDE_NAMES.map((name, i) => (
                <button
                  key={name}
                  onClick={() => {
                    setIsPlayingPreview(false)
                    setActiveSlide(i)
                  }}
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
              {/* Story Segment Progress Bar Overlay when in Video Mode */}
              {exportMode === 'video' && (
                <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex flex-col gap-1 pointer-events-none">
                  <div className="grid grid-cols-7 gap-1">
                    {SLIDE_NAMES.map((_, i) => {
                      const isPast = i < activeSlide
                      const isCurrent = i === activeSlide
                      return (
                        <div key={i} className="h-1 rounded-full bg-white/20 overflow-hidden">
                          <div
                            className={`h-full bg-[#38bdf8] transition-all ${
                              isPast ? 'w-full' : isCurrent ? 'w-full duration-1000' : 'w-0'
                            }`}
                          />
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 px-0.5">
                    <span className="text-blue-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      15s Video Clip Mode
                    </span>
                    <span className="text-slate-300 font-semibold">
                      {isPlayingPreview
                        ? `${previewTimer.toFixed(1)}s / 15.0s`
                        : `Slide 0${activeSlide + 1} / 07`}
                    </span>
                  </div>
                </div>
              )}

              {/* Preview Window (360x450 in 4:5 ratio) */}
              <div className="w-[320px] sm:w-[360px] aspect-[4/5] overflow-hidden rounded-xl relative bg-[#0b0e14]">
                <SlideContent
                  index={activeSlide}
                  concept={concept}
                  card={card}
                  exercise={exercise}
                  domain={domain}
                  capturedVisualUrl={capturedVisualUrl}
                  totalSlides={totalSlides}
                  progress={vizProgress}
                  isVideoMode={exportMode === 'video'}
                />
              </div>

              {/* Prev / Next Chevrons */}
              <button
                onClick={() => {
                  setIsPlayingPreview(false)
                  setActiveSlide((s) => (s > 0 ? s - 1 : totalSlides - 1))
                }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center transition-transform hover:scale-105"
                title="Previous Slide"
              >
                ←
              </button>
              <button
                onClick={() => {
                  setIsPlayingPreview(false)
                  setActiveSlide((s) => (s < totalSlides - 1 ? s + 1 : 0))
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center transition-transform hover:scale-105"
                title="Next Slide"
              >
                →
              </button>
            </div>

            {/* Bottom Preview Controls Row */}
            <div className="flex items-center justify-between w-full max-w-[360px] px-1">
              <button
                onClick={togglePlayPreview}
                className="py-1.5 px-3 rounded-lg bg-[#111622] hover:bg-[#1a2234] border border-[#1e2638] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors shadow-sm"
              >
                {isPlayingPreview ? (
                  <>
                    <PauseIcon className="w-3 h-3 text-amber-400" />
                    <span>Pause Preview</span>
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-3 h-3 text-blue-400" />
                    <span>Play 15s Preview</span>
                  </>
                )}
              </button>

              <div className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
                <span>Slide {String(activeSlide + 1).padStart(2, '0')} / {String(totalSlides).padStart(2, '0')}</span>
                <span>•</span>
                <span className="text-blue-400">learnblazinglyfast.tech</span>
              </div>
            </div>
          </div>

          {/* Right: Export & Sharing Actions */}
          <div className="w-full lg:w-80 flex flex-col gap-3.5">

            {/* Export Mode Switcher */}
            <div className="flex items-center p-1 bg-[#0d121c] border border-[#1e2638] rounded-xl w-full">
              <button
                onClick={() => setExportMode('video')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  exportMode === 'video'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <VideoIcon className="w-3.5 h-3.5" />
                <span>15s Video Clip</span>
              </button>
              <button
                onClick={() => setExportMode('carousel')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  exportMode === 'carousel'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayersIcon className="w-3.5 h-3.5" />
                <span>7-Slide Carousel</span>
              </button>
            </div>

            {/* Mode A: 15s Video Clip Export */}
            {exportMode === 'video' && (
              <div className="p-4 rounded-xl bg-[#111622] border border-blue-500/30 space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">15-Second Motion Video</h3>
                    <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                      MP4 / WebM
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Combines all 7 slides into a continuous 15-second video clip with smooth cross-fades, live visualizer frame, and story timer.
                  </p>
                </div>

                {/* Encoding Progress Bar */}
                {exportingVideo && (
                  <div className="p-3 rounded-lg bg-[#0b0e14] border border-[#1e2638] space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300">{videoProgress.message || 'Encoding...'}</span>
                      <span className="text-blue-400 font-bold">{videoProgress.percent}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#161d2d] overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-200"
                        style={{ width: `${videoProgress.percent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Generated Video Player */}
                {videoResult && !exportingVideo && (
                  <div className="space-y-2">
                    <div className="relative rounded-lg overflow-hidden border border-[#1e2638] bg-black aspect-[4/5] max-h-48">
                      <video
                        src={videoResult.url}
                        controls
                        loop
                        autoPlay
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-emerald-400 font-semibold">✓ {videoResult.filename}</span>
                      <a
                        href={videoResult.url}
                        download={videoResult.filename}
                        className="text-blue-400 hover:underline"
                      >
                        Download Again
                      </a>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleExportVideoClipAndOpenTikTok}
                  disabled={exportingVideo}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {exportingVideo ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Encoding ({videoProgress.currentSec || 0}s / 15.0s)...</span>
                    </>
                  ) : (
                    <>
                      <VideoIcon className="w-4 h-4" />
                      <span>{videoResult ? 'Re-Export 15s Video Clip ↗' : 'Export 15s Video Clip & Open TikTok ↗'}</span>
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
            )}

            {/* Mode B: 7-Slide Carousel ZIP Export */}
            {exportMode === 'carousel' && (
              <div className="p-4 rounded-xl bg-[#111622] border border-blue-500/30 space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">7-Slide Photo Carousel</h3>
                    <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                      ZIP Bundle
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Downloads all 7 slides at 1080×1350 for swipeable TikTok / Instagram Photo Mode.
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
                      <span>Download All Slides & Open TikTok ↗</span>
                    </>
                  )}
                </button>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={handleDownloadActive}
                    className="py-2 px-2 rounded-lg text-xs font-medium bg-[#161d2d] hover:bg-[#1f283d] text-white transition-colors flex items-center justify-center gap-1.5"
                  >
                    <DownloadIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span>Slide PNG</span>
                  </button>

                  <button
                    onClick={handleCopyActiveImage}
                    className="py-2 px-2 rounded-lg text-xs font-medium bg-[#161d2d] hover:bg-[#1f283d] text-white transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CopyIcon className="w-3.5 h-3.5 text-slate-300" />
                    <span>Copy Image</span>
                  </button>
                </div>

                <button
                  onClick={openTikTokUpload}
                  className="w-full py-1 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1 transition-colors"
                >
                  <span>Just open TikTok Studio</span>
                  <span className="text-[10px]">↗</span>
                </button>
              </div>
            )}

            {/* Caption Generator */}
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
                {getTikTokCaption(concept)}
              </div>
            </div>

            {/* Strategy Notes */}
            <div className="p-3 rounded-xl bg-[#0d121c] border border-[#1e2638] text-[11px] text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300">Format Strategy:</p>
              {exportMode === 'video' ? (
                <>
                  <p>• Post as **Video (15 Seconds)**.</p>
                  <p>• Fast-paced algorithm demo with zero textbook fluff.</p>
                  <p>• Ask viewers in comments: *"Did you solve the quiz at 0:11?"*</p>
                </>
              ) : (
                <>
                  <p>• Post as **Photo Mode (Swipe Carousel)**.</p>
                  <p>• Swipe through 7 cards at viewer's own pace.</p>
                  <p>• Pin comment: *"What's your solution to Slide 6?"*</p>
                </>
              )}
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
                index={idx}
                concept={concept}
                card={card}
                exercise={exercise}
                domain={domain}
                capturedVisualUrl={capturedVisualUrl}
                totalSlides={totalSlides}
                isExportResolution={true}
                progress={1.0}
                isVideoMode={exportMode === 'video'}
              />
            </div>
          ))}
        </div>

      </motion.div>
    </div>
  )
}

// ─── Slide Content Router ─────────────────────────────────────────────────────

function SlideContent({
  index,
  concept,
  card,
  exercise,
  domain,
  capturedVisualUrl,
  totalSlides,
  isExportResolution = false,
  progress = 1.0,
  isVideoMode = false,
}) {
  const scaleClass = isExportResolution ? 'p-10 text-sm' : 'p-5 text-xs'
  const currentStr = String(index + 1).padStart(2, '0')
  const totalStr = String(totalSlides).padStart(2, '0')

  return (
    <div className={`w-full h-full flex flex-col justify-between select-none bg-[#0b0e14] text-white font-sans ${scaleClass}`}>
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
          <Slide1Cover concept={concept} domain={domain} capturedVisualUrl={capturedVisualUrl} />
        )}
        {index === 1 && (
          <Slide2Visualization
            concept={concept}
            card={card}
            capturedVisualUrl={capturedVisualUrl}
            progress={progress}
            isVideoMode={isVideoMode}
            isExportResolution={isExportResolution}
          />
        )}
        {index === 2 && (
          <Slide3Definition concept={concept} card={card} />
        )}
        {index === 3 && (
          <Slide4ComplexityAndUseCases concept={concept} card={card} />
        )}
        {index === 4 && (
          <Slide5Gotchas concept={concept} card={card} />
        )}
        {index === 5 && (
          <Slide6TerminalChallenge concept={concept} exercise={exercise} />
        )}
        {index === 6 && (
          <Slide7PlatformAndCTA concept={concept} />
        )}
      </div>

      {/* Bottom Footer Row */}
      <div className="pt-2 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 font-medium">
        <span>learnblazinglyfast.tech</span>
        <span>{index === 0 ? 'Swipe to explore →' : currentStr}</span>
      </div>
    </div>
  )
}

// ─── Visual Graphic Frame Component ───────────────────────────────────────────

function SlideVisualFrame({ concept, capturedVisualUrl, isExportResolution = false }) {
  if (capturedVisualUrl) {
    return (
      <img
        src={capturedVisualUrl}
        alt={concept.title}
        className="max-h-full max-w-full object-contain filter drop-shadow-sm"
      />
    )
  }
  return <AnimatedSlideVisualizer concept={concept} progress={1.0} isExportResolution={isExportResolution} />
}

// ─── 01. Hook / Cover ─────────────────────────────────────────────────────────

function Slide1Cover({ concept, domain, capturedVisualUrl }) {
  return (
    <div className="flex flex-col gap-3.5 my-auto text-left">
      <div className="flex items-center gap-2">
        <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-mono font-bold tracking-wider uppercase">
          Tech Concept of the Day
        </span>
        <span className="px-2 py-0.5 rounded-full bg-[#111622] border border-[#1e2638] text-slate-400 text-[10px] font-medium">
          Open Source
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Learn Blazingly Fast · The Visual Tech Dictionary
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
          The Visual Guide to <span className="text-[#38bdf8]">{concept.title}</span>.
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
          Master this fundamental in 60 seconds with zero textbook fluff.
        </p>
      </div>

      {/* Graphic Image Frame Container */}
      <div className="w-full aspect-[16/9] rounded-xl bg-[#111622] border border-[#1e2638] flex items-center justify-center p-2.5 relative overflow-hidden">
        <SlideVisualFrame concept={concept} capturedVisualUrl={capturedVisualUrl} />
      </div>
    </div>
  )
}

// ─── 02. The Visualization (How It Works) ─────────────────────────────────────

function Slide2Visualization({
  concept,
  card,
  capturedVisualUrl,
  progress = 1.0,
  isVideoMode = false,
  isExportResolution = false,
}) {
  return (
    <div className="flex flex-col gap-3 my-auto text-left">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Watch How It Works
        </h2>
        <p className="text-xs text-blue-400 font-semibold mt-0.5">
          {isVideoMode ? 'Algorithm playing in real-time execution flow:' : 'Algorithms are living systems. State changes in real time:'}
        </p>
      </div>

      {/* Visualization Image Frame */}
      <div className="w-full aspect-[16/10] rounded-xl bg-[#0b0e14] border border-[#1e2638] flex items-center justify-center relative overflow-hidden">
        {capturedVisualUrl && !isVideoMode ? (
          <img
            src={capturedVisualUrl}
            alt={concept?.title}
            className="max-h-full max-w-full object-contain filter drop-shadow-sm"
          />
        ) : (
          <AnimatedSlideVisualizer
            concept={concept}
            progress={progress}
            isExportResolution={isExportResolution}
          />
        )}
      </div>

      {/* Core Flow Annotation */}
      <div className="p-3 rounded-xl bg-[#111622] border border-[#1e2638] text-xs text-slate-300 leading-relaxed">
        <span className="font-bold text-white">What's happening: </span>
        {card?.intuition?.slice(0, 150) || 'Data transitions through states step-by-step to optimize execution path and memory boundaries.'}...
      </div>
    </div>
  )
}

// ─── 03. The Definition & Intuition ───────────────────────────────────────────

function Slide3Definition({ concept, card }) {
  return (
    <div className="flex flex-col gap-3.5 my-auto text-left">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          The Definition & Intuition
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          What is {concept.title} and why do we use it?
        </p>
      </div>

      {/* Definition Box */}
      <div className="p-3.5 rounded-xl bg-[#111622] border border-[#1e2638] space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block font-mono">
          The Definition
        </span>
        <p className="text-xs text-slate-200 leading-relaxed">
          {card?.intuition || 'A core computational structure solving performance and memory constraints.'}
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
    </div>
  )
}

// ─── 04. Complexity & Use Cases ───────────────────────────────────────────────

function Slide4ComplexityAndUseCases({ concept, card }) {
  return (
    <div className="flex flex-col gap-3.5 my-auto text-left">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Complexity & Use Cases
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Performance guarantees and real-world application
        </p>
      </div>

      {/* Complexity Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3.5 rounded-xl bg-[#111622] border border-[#1e2638] space-y-1">
          <span className="text-[9px] text-slate-400 font-bold uppercase block font-mono">Time Complexity</span>
          <div className="text-lg font-mono font-bold text-emerald-400">
            {card?.time_complexity || 'O(log N)'}
          </div>
          <span className="text-[10px] text-slate-400 block">Worst & Average runtime</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#111622] border border-[#1e2638] space-y-1">
          <span className="text-[9px] text-slate-400 font-bold uppercase block font-mono">Space Complexity</span>
          <div className="text-lg font-mono font-bold text-blue-400">
            {card?.space_complexity || 'O(1)'}
          </div>
          <span className="text-[10px] text-slate-400 block">Auxiliary memory footprint</span>
        </div>
      </div>

      {/* When to Use It */}
      <div className="p-3.5 rounded-xl bg-[#111622] border border-[#1e2638] space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block font-mono">
          When to Use It
        </span>
        <p className="text-xs text-slate-300 leading-relaxed">
          {card?.use_cases || 'Ideal when searching large datasets, optimizing lookup latency, or operating under strict space constraints in system architecture.'}
        </p>
      </div>
    </div>
  )
}

// ─── 05. The Gotchas & Traps ──────────────────────────────────────────────────

function Slide5Gotchas({ concept, card }) {
  return (
    <div className="flex flex-col gap-3.5 my-auto text-left">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Common Interview Traps
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Mistakes 90% of candidates make under pressure
        </p>
      </div>

      <div className="space-y-2.5">
        <div className="p-3.5 rounded-xl bg-[#111622] border border-[#1e2638] space-y-1">
          <div className="text-xs font-bold text-slate-200">
            Trap 1: Edge Cases & Off-by-One Boundaries
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Failing to test empty collections, single-element arrays, or potential integer overflow when computing midpoints.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-[#111622] border border-[#1e2638] space-y-1">
          <div className="text-xs font-bold text-slate-200">
            Trap 2: State Mutation & Invariant Drift
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Mutating state across frames instead of preserving clean loop invariants and base conditions.
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

// ─── 06. Terminal Coding Challenge ────────────────────────────────────────────

function Slide6TerminalChallenge({ concept, exercise }) {
  const prompt = exercise?.prompt || 'Test your understanding of this concept:'
  const starterCode = exercise?.starter_code || 'function solution(input) {\n  // What goes here?\n  return result;\n}'

  return (
    <div className="flex flex-col gap-3 my-auto text-left">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Terminal Challenge
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Can you spot the solution in your head?
        </p>
      </div>

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

          <div className="text-[10px] text-blue-400 font-sans font-semibold pt-1">
            ❯ Drop your solution in the comments below!
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 07. Platform & Open Source CTA ───────────────────────────────────────────

function Slide7PlatformAndCTA({ concept }) {
  return (
    <div className="flex flex-col gap-4 my-auto text-left">
      <div className="space-y-1">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Level Up on Learn Blazingly Fast
        </h2>
        <p className="text-xs text-slate-400">
          The interactive visual dictionary for developers. 100% free & open source.
        </p>
      </div>

      {/* Two Action Cards */}
      <div className="space-y-2.5">
        <div className="p-3.5 rounded-xl bg-[#111622] border border-[#1e2638] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 font-mono">01 Explore Visual Simulators</span>
            <div className="text-sm font-bold text-white">learnblazinglyfast.tech</div>
          </div>
          <span className="text-slate-400">→</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#111622] border border-[#1e2638] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 font-mono">02 Open Source Project</span>
            <div className="text-sm font-bold text-white">Free & Community Driven</div>
          </div>
          <span className="text-slate-400">→</span>
        </div>
      </div>

      {/* Feature Checkmarks */}
      <div className="space-y-1.5 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center text-[10px] font-bold">✓</span>
          <span>550+ interactive step-by-step visual simulators</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center text-[10px] font-bold">✓</span>
          <span>100% free • No ads • No paywall</span>
        </div>
      </div>

      {/* Footer Prompts */}
      <div className="space-y-1.5 pt-1 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <BookmarkIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>Save this post for your technical interview prep.</span>
        </div>
        <div className="flex items-center gap-2">
          <ChatIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>Like & share to help another developer learn!</span>
        </div>
      </div>
    </div>
  )
}

// ─── High-Detail Algorithmic Illustrations (Image Fallbacks) ──────────────────

function ConceptGraphicIllustration({ concept }) {
  const type = concept.visualization?.type || ''
  const slug = (concept.slug || '').toLowerCase()
  const cat = (concept.category || '').toLowerCase()
  const domain = (concept.domain || '').toLowerCase()
  const mode = (concept.visualization?.config?.mode || '').toLowerCase()

  if (slug.includes('lifecycle') || mode === 'lifecycle' || (domain.includes('react') && type.includes('state'))) {
    return <LifecycleIllustration concept={concept} />
  }
  if (type === 'array-pointers' || slug.includes('search') || slug.includes('pointer')) {
    return <ArraySearchIllustration concept={concept} />
  }
  if (type === 'array-bars' || slug.includes('sort')) {
    return <SortingBarsIllustration concept={concept} />
  }
  if (type === 'tree-canvas' || cat.includes('tree') || slug.includes('tree') || slug.includes('bst') || slug.includes('heap')) {
    return <BinaryTreeIllustration concept={concept} />
  }
  if (type === 'graph-traversal' || cat.includes('graph') || slug.includes('dijkstra') || slug.includes('bfs') || slug.includes('dfs')) {
    return <NetworkGraphIllustration concept={concept} />
  }
  if (type === 'matrix-grid' || cat.includes('dynamic') || slug.includes('matrix') || slug.includes('dp')) {
    return <MatrixDPIllustration concept={concept} />
  }
  if (type === 'heatmap-grid') {
    return <HeatmapIllustration concept={concept} />
  }
  if (type.includes('neural') || type.includes('loss') || domain.includes('ml') || domain.includes('ai') || slug.includes('transformer') || slug.includes('attention')) {
    return <NeuralNetworkIllustration concept={concept} />
  }
  if (type === 'timeline-step') {
    return <TimelineStepIllustration concept={concept} />
  }
  if (type === 'state-diagram') {
    return <StateDiagramIllustration concept={concept} />
  }
  if (type.includes('architecture') || slug.includes('cache') || slug.includes('lru') || domain.includes('system')) {
    return <SystemArchitectureIllustration concept={concept} />
  }
  return <TimelineStepIllustration concept={concept} />
}

function ArraySearchIllustration({ concept }) {
  const mode = concept?.visualization?.config?.mode || concept?.slug || 'binary-search'
  const rawArr = concept?.visualization?.config?.array || [2, 5, 8, 12, 16, 23, 38, 56]
  const arr = rawArr.length > 8 ? rawArr.slice(0, 8) : rawArr
  const target = concept?.visualization?.config?.target ?? (mode === 'binary-search' ? (arr[3] || 12) : 16)
  let steps = getSteps('search', mode, arr, target)
  if (!steps || steps.length === 0) steps = getSteps('search', 'binary-search', arr, target)
  const matchStep = steps.find((s) => s.found) || steps[Math.floor(steps.length / 2)] || steps[0]
  const curStep = matchStep || {}

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-2">
      <div className="w-full flex items-center justify-between text-[10px] font-mono text-slate-400 mb-2 px-1">
        <span className="text-blue-400 font-bold">TARGET = {target}</span>
        <span className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded text-[9px]">
          {curStep.found ? `Found at idx ${curStep.mid ?? curStep.i}` : (curStep.annotation || 'Active Step')}
        </span>
      </div>
      <div className="grid grid-cols-8 gap-1.5 w-full">
        {arr.map((val, i) => {
          const isMid = curStep.mid === i || curStep.i === i
          const isMatch = curStep.found && isMid
          const inRange = curStep.lo != null && curStep.hi != null && i >= curStep.lo && i <= curStep.hi

          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={`w-full aspect-square rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                  isMatch
                    ? 'bg-emerald-500/30 border-2 border-emerald-400 text-white shadow-lg shadow-emerald-500/30'
                    : isMid
                    ? 'bg-blue-500/30 border-2 border-[#38bdf8] text-white shadow-md shadow-blue-500/30'
                    : inRange
                    ? 'bg-[#161d2d] border border-blue-500/40 text-slate-200'
                    : 'bg-[#0e131d] border border-[#1e2638] text-slate-500 opacity-60'
                }`}
              >
                {val}
              </div>
              <span className={`text-[9px] font-mono ${isMid ? 'text-blue-400 font-bold' : 'text-slate-500'}`}>
                [{i}]
              </span>
            </div>
          )
        })}
      </div>
      <div className="w-full flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2.5 px-2">
        <span className="text-slate-400">↑ Low: [{curStep.lo ?? 0}]</span>
        <span className="text-[#38bdf8] font-bold">↑ Mid: [{curStep.mid ?? Math.floor(arr.length / 2)}]</span>
        <span className="text-slate-400">↑ High: [{curStep.hi ?? arr.length - 1}]</span>
      </div>
    </div>
  )
}

function SortingBarsIllustration({ concept }) {
  const mode = concept?.visualization?.config?.mode || concept?.slug || 'quicksort'
  const defaultArr = getDefaultSortArray(mode) || [9, 3, 7, 4, 6, 2, 8, 5]
  const rawArray = concept?.visualization?.config?.array || defaultArr
  const arr = rawArray.length > 8 ? rawArray.slice(0, 8) : rawArray
  let steps = getSteps('sorting', mode, arr)
  if (!steps || steps.length === 0) steps = getSteps('sorting', 'quicksort', arr)
  const activeStep = steps[Math.min(steps.length - 1, Math.max(1, Math.floor(steps.length * 0.55)))] || steps[0]
  const curArr = activeStep.array || arr
  const maxVal = Math.max(...curArr, 1)

  return (
    <div className="w-full h-full flex flex-col items-center justify-end p-2">
      <div className="w-full flex items-center justify-between text-[10px] font-mono text-slate-400 mb-2 px-1">
        <span className="text-emerald-400 font-semibold">● Sorted</span>
        <span className="text-amber-400 font-semibold">● Compare</span>
        <span className="text-red-400 font-semibold">● Swap</span>
        <span className="text-blue-400 font-semibold">● Pivot</span>
      </div>
      <div className="flex items-end justify-between gap-1.5 w-full h-24 border-b border-[#1e2638] pb-1">
        {curArr.map((val, i) => {
          const isSorted = activeStep.sorted && activeStep.sorted[i]
          const isSwapping = activeStep.swapping && activeStep.swapping.includes(i)
          const isPivot = activeStep.pivot === i
          const isCompare =
            activeStep.j === i ||
            activeStep.i === i ||
            (activeStep.type === 'compare' && (activeStep.j === i || activeStep.j + 1 === i))
          const isOut = activeStep.lo != null && activeStep.hi != null && (i < activeStep.lo || i > activeStep.hi)

          let bg = 'bg-blue-600 border-blue-400'
          if (isSorted) bg = 'bg-emerald-500/80 border-emerald-400'
          else if (isSwapping) bg = 'bg-red-500 border-red-400'
          else if (isPivot) bg = 'bg-amber-500 border-amber-400'
          else if (isCompare) bg = 'bg-amber-200 border-amber-100 text-black'
          else if (isOut) bg = 'bg-[#1e2638] border-slate-700 opacity-40'

          const hPct = Math.max(18, Math.round((val / maxVal) * 100))

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <div style={{ height: `${hPct}%` }} className={`w-full rounded-t-md border-t border-x ${bg}`} />
              <span className="text-[8px] font-mono text-slate-400">{val}</span>
            </div>
          )
        })}
      </div>
      <div className="w-full flex items-center justify-between text-[9px] font-mono text-slate-400 mt-1.5 px-1 truncate">
        <span className="text-blue-400 font-bold mr-1">›</span>
        <span className="truncate">{activeStep.annotation || 'Executing partition step...'}</span>
      </div>
    </div>
  )
}

function BinaryTreeIllustration({ concept }) {
  return (
    <svg className="w-full h-full max-h-36" viewBox="0 0 280 130" fill="none">
      <line x1="140" y1="24" x2="80" y2="65" stroke="#1e2638" strokeWidth="2" />
      <line x1="140" y1="24" x2="200" y2="65" stroke="#38bdf8" strokeWidth="2.5" />
      <line x1="80" y1="65" x2="50" y2="105" stroke="#1e2638" strokeWidth="1.5" />
      <line x1="80" y1="65" x2="110" y2="105" stroke="#1e2638" strokeWidth="1.5" />
      <line x1="200" y1="65" x2="170" y2="105" stroke="#1e2638" strokeWidth="1.5" />
      <line x1="200" y1="65" x2="230" y2="105" stroke="#38bdf8" strokeWidth="2.5" />

      <circle cx="140" cy="24" r="14" fill="#161d2d" stroke="#38bdf8" strokeWidth="2" />
      <text x="140" y="28" textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">50</text>

      <circle cx="80" cy="65" r="12" fill="#111622" stroke="#1e2638" strokeWidth="1.5" />
      <text x="80" y="69" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">25</text>

      <circle cx="200" cy="65" r="13" fill="#161d2d" stroke="#38bdf8" strokeWidth="2" />
      <text x="200" y="69" textAnchor="middle" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">75</text>

      <circle cx="50" cy="105" r="10" fill="#111622" stroke="#1e2638" strokeWidth="1.5" />
      <text x="50" y="108" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">15</text>

      <circle cx="110" cy="105" r="10" fill="#111622" stroke="#1e2638" strokeWidth="1.5" />
      <text x="110" y="108" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">35</text>

      <circle cx="170" cy="105" r="10" fill="#111622" stroke="#1e2638" strokeWidth="1.5" />
      <text x="170" y="108" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">65</text>

      <circle cx="230" cy="105" r="11" fill="#161d2d" stroke="#10b981" strokeWidth="2" />
      <text x="230" y="108" textAnchor="middle" fill="#10b981" fontSize="8" fontFamily="monospace" fontWeight="bold">90</text>

      <rect x="175" y="4" width="95" height="16" rx="8" fill="#161d2d" stroke="#1e2638" />
      <text x="222" y="15" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="monospace">Path: 50 ➔ 75 ➔ 90</text>
    </svg>
  )
}

function NetworkGraphIllustration({ concept }) {
  return (
    <svg className="w-full h-full max-h-36" viewBox="0 0 280 120" fill="none">
      <line x1="50" y1="60" x2="110" y2="25" stroke="#38bdf8" strokeWidth="2" />
      <line x1="50" y1="60" x2="110" y2="95" stroke="#1e2638" strokeWidth="1.5" />
      <line x1="110" y1="25" x2="170" y2="25" stroke="#38bdf8" strokeWidth="2.5" />
      <line x1="110" y1="95" x2="170" y2="95" stroke="#1e2638" strokeWidth="1.5" />
      <line x1="170" y1="25" x2="230" y2="60" stroke="#10b981" strokeWidth="2.5" />
      <line x1="170" y1="95" x2="230" y2="60" stroke="#1e2638" strokeWidth="1.5" />
      <line x1="110" y1="25" x2="170" y2="95" stroke="#1e2638" strokeWidth="1.5" />

      <text x="75" y="38" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">w=2</text>
      <text x="140" y="18" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">w=3</text>
      <text x="205" y="38" fill="#10b981" fontSize="8" fontFamily="monospace" fontWeight="bold">w=1</text>
      <text x="75" y="85" fill="#64748b" fontSize="8" fontFamily="monospace">w=7</text>
      <text x="140" y="108" fill="#64748b" fontSize="8" fontFamily="monospace">w=4</text>

      <circle cx="50" cy="60" r="14" fill="#161d2d" stroke="#38bdf8" strokeWidth="2" />
      <text x="50" y="64" textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">A</text>

      <circle cx="110" cy="25" r="13" fill="#161d2d" stroke="#38bdf8" strokeWidth="2" />
      <text x="110" y="29" textAnchor="middle" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">B</text>

      <circle cx="110" cy="95" r="12" fill="#111622" stroke="#1e2638" strokeWidth="1.5" />
      <text x="110" y="99" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">C</text>

      <circle cx="170" cy="25" r="13" fill="#161d2d" stroke="#38bdf8" strokeWidth="2" />
      <text x="170" y="29" textAnchor="middle" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">D</text>

      <circle cx="170" cy="95" r="12" fill="#111622" stroke="#1e2638" strokeWidth="1.5" />
      <text x="170" y="99" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">E</text>

      <circle cx="230" cy="60" r="14" fill="#161d2d" stroke="#10b981" strokeWidth="2.5" />
      <text x="230" y="64" textAnchor="middle" fill="#10b981" fontSize="10" fontFamily="monospace" fontWeight="bold">F</text>
    </svg>
  )
}

function MatrixDPIllustration({ concept }) {
  const rows = [
    ['0', '0', '0', '0', '0'],
    ['0', '1', '1', '1', '1'],
    ['0', '1', '2', '3', '4'],
    ['0', '1', '3', '6', '10'],
  ]
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-2">
      <div className="w-full flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1.5 px-2">
        <span className="text-blue-400 font-bold">dp[i][j] = dp[i-1][j] + dp[i][j-1]</span>
      </div>
      <div className="grid grid-cols-5 gap-1.5 w-full max-w-xs">
        {rows.flat().map((val, idx) => {
          const isOptimal = idx === 19 || idx === 18 || idx === 12 || idx === 6 || idx === 0
          return (
            <div
              key={idx}
              className={`h-7 rounded flex items-center justify-center font-mono text-xs font-bold ${
                isOptimal
                  ? 'bg-blue-500/25 border border-[#38bdf8] text-[#38bdf8]'
                  : 'bg-[#161d2d] border border-[#1e2638] text-slate-400'
              }`}
            >
              {val}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function NeuralNetworkIllustration({ concept }) {
  return (
    <svg className="w-full h-full max-h-36" viewBox="0 0 280 120" fill="none">
      {[30, 60, 90].map((y1, i) =>
        [20, 46, 74, 100].map((y2, j) => (
          <line key={`l1-${i}-${j}`} x1="60" y1={y1} x2="140" y2={y2} stroke="#1e2638" strokeWidth="1" />
        ))
      )}
      <line x1="60" y1="60" x2="140" y2="46" stroke="#38bdf8" strokeWidth="2" />
      <line x1="60" y1="60" x2="140" y2="74" stroke="#38bdf8" strokeWidth="2" />

      {[20, 46, 74, 100].map((y1, i) =>
        [45, 75].map((y2, j) => (
          <line key={`l2-${i}-${j}`} x1="140" y1={y1} x2="220" y2={y2} stroke="#1e2638" strokeWidth="1" />
        ))
      )}
      <line x1="140" y1="46" x2="220" y2="45" stroke="#10b981" strokeWidth="2.5" />
      <line x1="140" y1="74" x2="220" y2="45" stroke="#10b981" strokeWidth="2.5" />

      {[30, 60, 90].map((y, i) => (
        <circle key={`in-${i}`} cx="60" cy={y} r="8" fill="#161d2d" stroke="#38bdf8" strokeWidth="1.5" />
      ))}

      {[20, 46, 74, 100].map((y, i) => (
        <circle key={`hid-${i}`} cx="140" cy={y} r="9" fill="#161d2d" stroke="#38bdf8" strokeWidth="1.5" />
      ))}

      <circle cx="220" cy="45" r="10" fill="#161d2d" stroke="#10b981" strokeWidth="2" />
      <circle cx="220" cy="75" r="8" fill="#111622" stroke="#1e2638" strokeWidth="1.5" />

      <text x="60" y="115" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">Input</text>
      <text x="140" y="115" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="monospace">Dense</text>
      <text x="220" y="115" textAnchor="middle" fill="#10b981" fontSize="8" fontFamily="monospace">Softmax</text>
    </svg>
  )
}

function SystemArchitectureIllustration({ concept }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-2">
      <div className="flex items-center gap-1.5 w-full justify-between">
        <div className="p-2 rounded-lg bg-[#161d2d] border border-[#1e2638] text-center">
          <span className="text-[8px] font-mono text-slate-400 block">CLIENT</span>
          <span className="text-[10px] font-bold text-white">Requests</span>
        </div>
        <span className="text-slate-500 font-mono text-xs">➔</span>
        <div className="p-2 rounded-lg bg-[#161d2d] border border-blue-500/40 text-center">
          <span className="text-[8px] font-mono text-blue-400 block">GATEWAY</span>
          <span className="text-[10px] font-bold text-blue-300">Balancer</span>
        </div>
        <span className="text-slate-500 font-mono text-xs">➔</span>
        <div className="p-2 rounded-lg bg-[#161d2d] border border-emerald-500/40 text-center">
          <span className="text-[8px] font-mono text-emerald-400 block">CACHE</span>
          <span className="text-[10px] font-bold text-emerald-300">O(1) LRU</span>
        </div>
        <span className="text-slate-500 font-mono text-xs">➔</span>
        <div className="p-2 rounded-lg bg-[#161d2d] border border-[#1e2638] text-center">
          <span className="text-[8px] font-mono text-slate-400 block">DB</span>
          <span className="text-[10px] font-bold text-slate-300">Storage</span>
        </div>
      </div>
      <div className="mt-2.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[9px] font-mono text-blue-400">
        High Availability • Low Latency • Horizontal Scalability
      </div>
    </div>
  )
}

function LifecycleIllustration({ concept }) {
  return (
    <div className="w-full h-full flex flex-col justify-center p-2 text-left">
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-2 px-1">
        <span className="text-blue-400 font-bold">React Lifecycle Pipeline</span>
        <span className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded text-[9px]">
          Mount ➔ Update ➔ Unmount
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 w-full">
        {/* Phase 1: Mount */}
        <div className="p-2.5 rounded-lg bg-[#161d2d] border border-blue-500/40 flex flex-col gap-1 relative">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-blue-400 font-mono">01. MOUNT</span>
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          </div>
          <span className="text-xs font-bold text-white">Initial Render</span>
          <span className="text-[9px] text-slate-400 font-mono">useEffect(fn, [])</span>
          <span className="text-[8px] text-blue-300">DOM insertion</span>
        </div>

        {/* Phase 2: Update */}
        <div className="p-2.5 rounded-lg bg-[#161d2d] border border-amber-500/40 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-400 font-mono">02. UPDATE</span>
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          </div>
          <span className="text-xs font-bold text-white">State / Props</span>
          <span className="text-[9px] text-slate-400 font-mono">useEffect(fn, [id])</span>
          <span className="text-[8px] text-amber-300">Re-render / Diff</span>
        </div>

        {/* Phase 3: Unmount */}
        <div className="p-2.5 rounded-lg bg-[#161d2d] border border-rose-500/40 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-400 font-mono">03. UNMOUNT</span>
            <span className="w-2 h-2 rounded-full bg-rose-400" />
          </div>
          <span className="text-xs font-bold text-white">Cleanup</span>
          <span className="text-[9px] text-slate-400 font-mono">return () =&gt; cleanup</span>
          <span className="text-[8px] text-rose-300">Memory freed</span>
        </div>
      </div>
      <div className="w-full flex items-center justify-between text-[9px] font-mono text-slate-400 mt-2 px-1">
        <span>Trigger: setState() / deps change</span>
        <span className="text-blue-400">Fiber Reconciliation</span>
      </div>
    </div>
  )
}

function TimelineStepIllustration({ concept }) {
  const steps = [
    { num: '01', title: 'Dispatch', sub: 'Event / Trigger', active: false },
    { num: '02', title: 'Validate', sub: 'Schema & Auth', active: false },
    { num: '03', title: 'Execute', sub: 'State Mutation', active: true },
    { num: '04', title: 'Commit', sub: 'Persistence', active: false },
  ]
  return (
    <div className="w-full h-full flex flex-col justify-center p-2 text-left">
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-2 px-1">
        <span className="text-blue-400 font-bold">Execution Timeline</span>
        <span className="text-slate-400 font-mono text-[9px]">Sequential State Flow</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5 w-full">
        {steps.map((st) => (
          <div
            key={st.num}
            className={`p-2 rounded-lg border flex flex-col gap-0.5 ${
              st.active
                ? 'bg-blue-500/20 border-blue-400 text-white shadow-lg shadow-blue-500/20'
                : 'bg-[#161d2d] border-[#1e2638] text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[9px] font-mono font-bold ${st.active ? 'text-blue-400' : 'text-slate-500'}`}>
                {st.num}
              </span>
              {st.active && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
            </div>
            <span className="text-[11px] font-bold leading-tight">{st.title}</span>
            <span className="text-[8px] text-slate-400 leading-tight">{st.sub}</span>
          </div>
        ))}
      </div>
      <div className="mt-2.5 px-2.5 py-1 rounded-lg bg-[#0d121c] border border-[#1e2638] flex items-center justify-between text-[9px] font-mono text-slate-400">
        <span className="text-blue-400">▶ Active Phase: 03. Execute</span>
        <span>Deterministic Pipeline</span>
      </div>
    </div>
  )
}

function StateDiagramIllustration({ concept }) {
  return (
    <div className="w-full h-full flex flex-col justify-center p-2 text-left">
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-2 px-1">
        <span className="text-blue-400 font-bold">Finite State Machine (FSM)</span>
        <span className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded text-[9px]">
          Deterministic Transitions
        </span>
      </div>
      <div className="flex items-center justify-between gap-1.5 w-full">
        <div className="p-2.5 rounded-lg bg-[#161d2d] border border-blue-500/40 text-center flex-1">
          <span className="text-[8px] font-mono text-blue-400 block">INIT</span>
          <span className="text-xs font-bold text-white">Closed</span>
        </div>
        <span className="text-slate-500 text-xs">➔</span>
        <div className="p-2.5 rounded-lg bg-[#161d2d] border border-amber-500/40 text-center flex-1">
          <span className="text-[8px] font-mono text-amber-400 block">TRIPPED</span>
          <span className="text-xs font-bold text-white">Open</span>
        </div>
        <span className="text-slate-500 text-xs">➔</span>
        <div className="p-2.5 rounded-lg bg-[#161d2d] border border-emerald-500/40 text-center flex-1">
          <span className="text-[8px] font-mono text-emerald-400 block">PROBE</span>
          <span className="text-xs font-bold text-white">Half-Open</span>
        </div>
      </div>
      <div className="mt-2 text-[9px] font-mono text-slate-400 text-center">
        State invariants maintained across all concurrent transitions
      </div>
    </div>
  )
}

function HeatmapIllustration({ concept }) {
  const cells = [
    [0.1, 0.85, 0.3, 0.15],
    [0.9, 0.2, 0.45, 0.1],
    [0.05, 0.4, 0.95, 0.6],
    [0.3, 0.1, 0.7, 0.8],
  ]
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-2">
      <div className="w-full flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1.5 px-2">
        <span className="text-blue-400 font-bold">Attention & Heatmap Matrix</span>
        <span className="text-slate-400 font-mono text-[9px]">Normalized Activation</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5 w-full max-w-[240px]">
        {cells.flat().map((val, idx) => {
          const opacity = Math.max(0.15, val)
          const isHot = val > 0.7
          return (
            <div
              key={idx}
              style={{ backgroundColor: `rgba(56, 189, 248, ${opacity})` }}
              className={`h-7 rounded flex items-center justify-center font-mono text-[10px] font-bold ${
                isHot ? 'text-black font-extrabold border border-white/60' : 'text-slate-200 border border-blue-500/20'
              }`}
            >
              {val.toFixed(2)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DefaultFlowIllustration({ concept }) {
  return (
    <svg className="w-48 h-32" viewBox="0 0 200 120" fill="none">
      <line x1="100" y1="20" x2="60" y2="70" stroke="#1e2638" strokeWidth="1.5" />
      <line x1="100" y1="20" x2="140" y2="70" stroke="#1e2638" strokeWidth="1.5" />
      <line x1="100" y1="20" x2="100" y2="70" stroke="#1e2638" strokeWidth="1.5" />
      <line x1="60" y1="70" x2="40" y2="105" stroke="#1e2638" strokeWidth="1.5" />
      <line x1="60" y1="70" x2="80" y2="105" stroke="#1e2638" strokeWidth="1.5" />
      <line x1="140" y1="70" x2="120" y2="105" stroke="#1e2638" strokeWidth="1.5" />
      <line x1="140" y1="70" x2="160" y2="105" stroke="#1e2638" strokeWidth="1.5" />

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

// ─── SVG Icons ───────────────────────────────────────────────────────────────

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
      <line x1="12" y1="3" x2="12" y2="15" />
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

function VideoIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  )
}

function PlayIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
  )
}

function PauseIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}

function LayersIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  )
}
