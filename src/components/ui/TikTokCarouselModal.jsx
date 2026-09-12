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
  openTikTokUpload,
  openPinterestUpload,
  openYouTubeUpload,
  getPinterestPinTitle,
  getPinterestPinDescription,
  getYouTubeShortsTitle,
  getYouTubeShortsDescription
} from '../../utils/tiktokExport.js'
import { generatePinterestCard } from '../../utils/shareCard.js'
import { trackShare } from '../../services/analytics.js'
import LBFLogo from './LBFLogo.jsx'
import AnimatedSlideVisualizer from './AnimatedSlideVisualizer.jsx'
import { getSteps, getDefaultSortArray } from '../../utils/algorithms/registry.js'
import { EXPORT_THEMES, getInitialThemeForConcept } from '../../utils/themePalettes.js'

const SLIDE_NAMES = [
  '01. Cover Hook',
  '02. Visualization',
  '03. Definition',
  '04. Complexity & Use Case',
  '05. Traps & Gotchas',
  '06. Terminal Challenge',
  '07. Platform & Open Source',
]

export default function TikTokCarouselModal({ isOpen, onClose, concept, accent, initialPlatform = 'tiktok' }) {
  const [platform, setPlatform] = useState(initialPlatform || 'tiktok') // 'tiktok' | 'pinterest' | 'youtube'
  const [pinterestMode, setPinterestMode] = useState('card') // 'card' | 'carousel' | 'video'
  const [activeSlide, setActiveSlide] = useState(0)
  const [exportMode, setExportMode] = useState('video') // 'video' | 'carousel'
  const [selectedTheme, setSelectedTheme] = useState(() => getInitialThemeForConcept(concept))
  const [exportingZip, setExportingZip] = useState(false)
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 7 })
  const [exportingVideo, setExportingVideo] = useState(false)
  const [videoProgress, setVideoProgress] = useState({ percent: 0, currentSec: 0, totalSec: 17, message: '' })
  const [videoResult, setVideoResult] = useState(null)
  const [isPlayingPreview, setIsPlayingPreview] = useState(true)
  const [previewTimer, setPreviewTimer] = useState(0)
  const [copiedCaption, setCopiedCaption] = useState(false)
  const [capturedVisualUrl, setCapturedVisualUrl] = useState(null)

  useEffect(() => {
    if (isOpen && concept) {
      setSelectedTheme(getInitialThemeForConcept(concept))
      setPlatform(initialPlatform || 'tiktok')
      if (initialPlatform === 'youtube') {
        setExportMode('video')
      }
      if (exportMode === 'video') {
        setIsPlayingPreview(true)
        setPreviewTimer(0)
        setActiveSlide(0)
      }
    }
  }, [isOpen, initialPlatform, concept?.slug, concept?.domain])

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

          // Target inner HTML stage container (avoid passing bare SVGElement to html2canvas)
          const stageEl = el.querySelector('[class*="overflow-x-auto"], [class*="aspect-"], [class*="grid"]') || el

          if (stageEl && typeof html2canvas === 'function') {
            const renderedCanvas = await html2canvas(stageEl, {
              backgroundColor: '#0b0e14',
              scale: 1.5,
              logging: false,
              useCORS: true,
            }).catch((e) => {
              console.debug('html2canvas snapshot failed:', e)
              return null
            })
            if (active && renderedCanvas) {
              setCapturedVisualUrl(renderedCanvas.toDataURL('image/png'))
            }
          }
        }
      } catch (err) {
        console.debug('Failed to capture visualization element:', err)
      }
    }

    captureViz()
    return () => { active = false }
  }, [isOpen])

  // Slideshow preview playback (17.0s total: 5.0s for visualization)
  useEffect(() => {
    if (!isPlayingPreview) return
    const SCHEDULE = [
      { start: 0, end: 2.0, idx: 0 },
      { start: 2.0, end: 7.0, idx: 1 }, // 5.0s visualization slide
      { start: 7.0, end: 9.0, idx: 2 },
      { start: 9.0, end: 11.0, idx: 3 },
      { start: 11.0, end: 13.0, idx: 4 },
      { start: 13.0, end: 15.0, idx: 5 },
      { start: 15.0, end: 17.0, idx: 6 },
    ]

    const interval = setInterval(() => {
      setPreviewTimer((prev) => {
        const next = Math.round((prev + 0.1) * 10) / 10
        if (next >= 17.0) {
          // Seamless video preview loop
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
  }, [isPlayingPreview, exportMode, activeSlide])

  const [autoVizProgress, setAutoVizProgress] = useState(0)

  useEffect(() => {
    if (exportMode !== 'video' || isPlayingPreview || activeSlide !== 1) {
      return
    }
    const interval = setInterval(() => {
      setAutoVizProgress((p) => {
        const next = Math.round((p + 0.02) * 100) / 100 // 5.0s loop
        return next >= 1.0 ? 0 : next
      })
    }, 100)
    return () => clearInterval(interval)
  }, [exportMode, isPlayingPreview, activeSlide])

  const vizProgress = isPlayingPreview
    ? Math.min(1, Math.max(0, (previewTimer - 2.0) / 5.0))
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
    try {
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
      setVideoProgress({ percent: 0, currentSec: 0, totalSec: 17, message: 'Starting video engine...' })

      const caption = getTikTokCaption(concept)
      try {
        await navigator.clipboard.writeText(caption)
      } catch {
        // ignore
      }

      const result = await exportVideoClip(elements, concept?.slug, (prog) => {
        setVideoProgress(prog)
      }, concept, selectedTheme)

      setExportingVideo(false)

      if (result && result.success) {
        setVideoResult(result)
        toast.success('Motion video downloaded & caption copied! Opening TikTok Studio...', { duration: 4500 })
        trackShare({ slug: concept?.slug, title: concept?.title, platform: 'tiktok_video_17s', method: 'export_video' })
        setTimeout(() => {
          openTikTokUpload()
        }, 800)
      } else {
        toast.error(result?.error || 'Failed to generate video clip')
      }
    } catch (err) {
      console.error('Export video failed:', err)
      setExportingVideo(false)
      toast.error('Video generation encountered an issue. Try the 7-Slide Carousel ZIP export!')
    }
  }

  const handleDownloadActive = async () => {
    try {
      const el = document.getElementById('tiktok-preview-slide') || slideRefs[activeSlide]?.current
      if (!el) return
      toast.loading('Rendering slide PNG...', { id: 'slide-dl' })
      const filename = `${concept?.slug || 'concept'}-slide-0${activeSlide + 1}.png`
      const success = await downloadSlidePNG(el, filename)
      if (success) {
        toast.success(`Downloaded Slide ${activeSlide + 1}!`, { id: 'slide-dl' })
        trackShare({ slug: concept?.slug, title: concept?.title, platform: 'tiktok_slide_png', method: 'download_single' })
      } else {
        toast.error('Failed to export slide', { id: 'slide-dl' })
      }
    } catch (err) {
      console.error('Download slide failed:', err)
      toast.error('Failed to export slide', { id: 'slide-dl' })
    }
  }

  const handleCopyActiveImage = async () => {
    try {
      const el = document.getElementById('tiktok-preview-slide') || slideRefs[activeSlide]?.current
      if (!el) return
      toast.loading('Copying slide image...', { id: 'slide-copy' })
      const success = await copySlideImageToClipboard(el)
      if (success) {
        toast.success(`Slide ${activeSlide + 1} copied to clipboard`, { id: 'slide-copy' })
        trackShare({ slug: concept?.slug, title: concept?.title, platform: 'tiktok_slide_copy', method: 'copy_image' })
      } else {
        toast.error('Clipboard copy not supported by your browser. Use Download instead.', { id: 'slide-copy' })
      }
    } catch (err) {
      console.error('Copy image failed:', err)
      toast.error('Clipboard copy not supported by your browser. Use Download instead.', { id: 'slide-copy' })
    }
  }

  const handleDownloadSummaryCard = async () => {
    try {
      const el = slideRefs[0]?.current || document.getElementById('tiktok-preview-slide')
      if (!el) return
      toast.loading('Rendering Summary Card (1080x1350)...', { id: 'summary-dl' })
      const filename = `${concept?.slug || 'concept'}-summary-card.png`
      const success = await downloadSlidePNG(el, filename)
      if (success) {
        toast.success('Downloaded Summary Card (Slide 1)!', { id: 'summary-dl' })
        trackShare({ slug: concept?.slug, title: concept?.title, platform: 'summary_card_png', method: 'download_summary' })
      } else {
        toast.error('Failed to export summary card', { id: 'summary-dl' })
      }
    } catch (err) {
      console.error('Download summary card failed:', err)
      toast.error('Failed to export summary card', { id: 'summary-dl' })
    }
  }

  const handleExportZipAndOpenTikTok = async () => {
    try {
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
        concept?.slug,
        filenames,
        caption,
        (current, total) => setExportProgress({ current, total })
      )

      setExportingZip(false)
      if (success) {
        toast.success('ZIP downloaded & caption copied! Opening TikTok Studio...', { id: 'zip-dl', duration: 4000 })
        trackShare({ slug: concept?.slug, title: concept?.title, platform: 'tiktok_carousel_zip', method: 'download_and_open' })
        setTimeout(() => {
          openTikTokUpload()
        }, 700)
      } else {
        toast.error('Failed to export ZIP package', { id: 'zip-dl' })
      }
    } catch (err) {
      console.error('Export ZIP failed:', err)
      setExportingZip(false)
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

  const handleExportPinterestCard = async () => {
    try {
      const el = document.getElementById('concept-card-target') || document.querySelector('[data-concept-card]') || slideRefs[0]?.current || document.getElementById('tiktok-preview-slide')
      if (!el) {
        toast.error('Concept card element not found.')
        return
      }
      toast.loading('Generating high-resolution Pinterest Pin Card...', { id: 'pin-card' })
      const success = await generatePinterestCard(el, concept?.slug)
      if (success) {
        toast.success('Pinterest Pin Card downloaded! Opening Pinterest...', { id: 'pin-card', duration: 4000 })
        trackShare({ slug: concept?.slug, title: concept?.title, platform: 'pinterest_card_png', method: 'download_card' })
        setTimeout(() => openPinterestUpload(), 800)
      } else {
        toast.error('Failed to export Pinterest Pin Card', { id: 'pin-card' })
      }
    } catch (err) {
      console.error('Download Pinterest card failed:', err)
      toast.error('Failed to export Pinterest Pin Card', { id: 'pin-card' })
    }
  }

  const handleExportPinterestCarousel = async () => {
    try {
      const elements = slideRefs.map(r => r.current).filter(Boolean)
      if (elements.length < totalSlides) {
        toast.error('Preparing slides, please try again in a moment.')
        return
      }
      setExportingZip(true)
      toast.loading(`Rendering ${totalSlides} Pinterest carousel slides...`, { id: 'zip-dl' })
      const caption = `${getPinterestPinTitle(concept)}\n\n${getPinterestPinDescription(concept)}`
      try {
        await navigator.clipboard.writeText(caption)
      } catch {
        // ignore
      }
      const filenames = SLIDE_NAMES.map((_, i) => `pinterest-slide-0${i + 1}.png`)
      const success = await exportCarouselZip(
        elements,
        concept?.slug,
        filenames,
        caption,
        (current, total) => setExportProgress({ current, total }),
        { platform: 'pinterest' }
      )
      setExportingZip(false)
      if (success) {
        toast.success('Pinterest Carousel ZIP downloaded! Opening Pinterest...', { id: 'zip-dl', duration: 4000 })
        trackShare({ slug: concept?.slug, title: concept?.title, platform: 'pinterest_carousel_zip', method: 'download_and_open' })
        setTimeout(() => openPinterestUpload(), 800)
      } else {
        toast.error('Failed to export Pinterest carousel package', { id: 'zip-dl' })
      }
    } catch (err) {
      console.error('Export Pinterest carousel failed:', err)
      setExportingZip(false)
      toast.error('Failed to export Pinterest carousel package', { id: 'zip-dl' })
    }
  }

  const handleExportPinterestVideo = async () => {
    try {
      const elements = slideRefs.map(r => r.current).filter(Boolean)
      if (elements.length < totalSlides) {
        toast.error('Preparing slide frames, please try again in a moment.')
        return
      }
      if (!isVideoExportSupported()) {
        toast.error('Video recording is not supported in this browser.')
        return
      }
      setExportingVideo(true)
      setVideoProgress({ percent: 0, currentSec: 0, totalSec: 17, message: 'Starting Pinterest video engine...' })
      try {
        await navigator.clipboard.writeText(`${getPinterestPinTitle(concept)}\n\n${getPinterestPinDescription(concept)}`)
      } catch {
        // ignore
      }
      const result = await exportVideoClip(elements, concept?.slug, (prog) => {
        setVideoProgress(prog)
      }, concept, selectedTheme, {
        aspectRatio: '9:16',
        platform: 'pinterest'
      })
      setExportingVideo(false)
      if (result && result.success) {
        setVideoResult(result)
        toast.success('Pinterest Video Pin downloaded & details copied! Opening Pinterest Studio...', { duration: 4500 })
        trackShare({ slug: concept?.slug, title: concept?.title, platform: 'pinterest_video_pin', method: 'export_video' })
        setTimeout(() => openPinterestUpload(), 800)
      } else {
        toast.error(result?.error || 'Failed to generate video pin')
      }
    } catch (err) {
      console.error('Export video failed:', err)
      setExportingVideo(false)
      toast.error('Video generation encountered an issue.')
    }
  }

  const handleExportYouTubeShort = async () => {
    try {
      const elements = slideRefs.map(r => r.current).filter(Boolean)
      if (elements.length < totalSlides) {
        toast.error('Preparing slide frames, please try again in a moment.')
        return
      }
      if (!isVideoExportSupported()) {
        toast.error('Video recording is not supported in this browser.')
        return
      }
      setExportingVideo(true)
      setVideoProgress({ percent: 0, currentSec: 0, totalSec: 17, message: 'Starting YouTube Shorts video engine...' })
      try {
        await navigator.clipboard.writeText(`${getYouTubeShortsTitle(concept)}\n\n${getYouTubeShortsDescription(concept)}`)
      } catch {
        // ignore
      }
      const result = await exportVideoClip(elements, concept?.slug, (prog) => {
        setVideoProgress(prog)
      }, concept, selectedTheme, {
        aspectRatio: '9:16',
        platform: 'youtube'
      })
      setExportingVideo(false)
      if (result && result.success) {
        setVideoResult(result)
        toast.success('YouTube Shorts video downloaded & description copied! Opening YouTube Studio...', { duration: 4500 })
        trackShare({ slug: concept?.slug, title: concept?.title, platform: 'youtube_shorts', method: 'export_video' })
        setTimeout(() => openYouTubeUpload(), 800)
      } else {
        toast.error(result?.error || 'Failed to generate YouTube Shorts video')
      }
    } catch (err) {
      console.error('Export YouTube Shorts failed:', err)
      setExportingVideo(false)
      toast.error('YouTube Shorts generation encountered an issue.')
    }
  }

  const handleCopyPinterestDetails = () => {
    const text = `${getPinterestPinTitle(concept)}\n\n${getPinterestPinDescription(concept)}`
    navigator.clipboard.writeText(text)
    setCopiedCaption(true)
    toast.success('Pinterest Pin Title & Description copied')
    setTimeout(() => setCopiedCaption(false), 2500)
  }

  const handleCopyYouTubeDetails = () => {
    const text = `${getYouTubeShortsTitle(concept)}\n\n${getYouTubeShortsDescription(concept)}`
    navigator.clipboard.writeText(text)
    setCopiedCaption(true)
    toast.success('YouTube Shorts Title & Description copied')
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
                <h2 className="text-sm font-bold text-white tracking-tight">
                  {platform === 'pinterest' ? 'Pinterest Pin Exporter' : platform === 'youtube' ? 'YouTube Shorts Exporter' : 'TikTok & Reels Exporter'}
                </h2>
                <span
                  className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border font-mono"
                  style={{
                    color: selectedTheme.primary,
                    borderColor: `${selectedTheme.primary}50`,
                    backgroundColor: `${selectedTheme.primary}15`,
                  }}
                >
                  {platform === 'youtube'
                    ? '9:16 Video (Shorts)'
                    : platform === 'pinterest'
                    ? (pinterestMode === 'card' ? 'Pin Card' : pinterestMode === 'carousel' ? 'Pin Carousel' : 'Video Pin')
                    : (exportMode === 'video' ? '15s Video Clip' : '4:5 Photo Carousel')}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {platform === 'pinterest'
                  ? `Export ${concept.title} as a Pin Card, multi-slide Carousel, or Video Pin.`
                  : platform === 'youtube'
                  ? `Export ${concept.title} as a 9:16 vertical video for YouTube Shorts.`
                  : `Export ${concept.title} as a 15-second motion video or 7-slide swipe carousel.`}
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

        {/* Platform Selector Tabs */}
        <div className="px-5 py-2 bg-[#090d16] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
              Platform:
            </span>
            <div className="flex items-center gap-1.5 p-1 bg-[#0d121c] border border-[#1e2638] rounded-xl">
              <button
                onClick={() => {
                  setPlatform('tiktok')
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  platform === 'tiktok'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <TikTokIcon className="w-3.5 h-3.5" />
                <span>TikTok / Reels</span>
              </button>

              <button
                onClick={() => {
                  setPlatform('pinterest')
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  platform === 'pinterest'
                    ? 'bg-rose-600/20 text-rose-300 border border-rose-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <PinterestIcon className="w-3.5 h-3.5 text-rose-500" />
                <span>Pinterest</span>
              </button>

              <button
                onClick={() => {
                  setPlatform('youtube')
                  setExportMode('video')
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  platform === 'youtube'
                    ? 'bg-red-600/20 text-red-300 border border-red-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <YouTubeIcon className="w-3.5 h-3.5 text-red-500" />
                <span>YouTube Shorts</span>
                <span className="text-[9px] bg-red-500/25 text-red-200 px-1 py-0.5 rounded font-mono font-medium">Video</span>
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-mono hidden md:flex items-center gap-1.5">
            <span>Zero Fluff</span>
            <span>•</span>
            <span>Ready to Publish</span>
          </div>
        </div>

        {/* PROMINENT TOP THEME PICKER BAR */}
        <div className="px-5 py-2.5 bg-[#111622] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: selectedTheme.primary }} />
              Export Color Theme:
            </span>
            <span
              className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full border"
              style={{
                color: selectedTheme.primary,
                borderColor: `${selectedTheme.primary}60`,
                backgroundColor: `${selectedTheme.primary}20`,
              }}
            >
              {selectedTheme.name}
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              (Auto-matched to {concept.domain || 'concept'})
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {EXPORT_THEMES.map((theme) => {
              const isSelected = selectedTheme.id === theme.id
              return (
                <button
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    isSelected
                      ? 'border-white text-white shadow-md ring-1'
                      : 'border-white/10 bg-[#0b0e14] text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  style={isSelected ? {
                    borderColor: theme.primary,
                    backgroundColor: `${theme.primary}25`,
                    boxShadow: `0 0 10px ${theme.glow}`,
                    color: '#ffffff',
                  } : {}}
                  title={`${theme.name} (${theme.domain})`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/20"
                    style={{ backgroundColor: theme.primary }}
                  />
                  <span>{theme.name}</span>
                  {isSelected && <span className="text-[9px] font-bold">✓</span>}
                </button>
              )
            })}
          </div>
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
                      ? 'text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-[#161d2d]'
                  }`}
                  style={activeSlide === i ? { backgroundColor: selectedTheme.primary } : {}}
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
                            className={`h-full transition-all ${
                              isPast ? 'w-full' : isCurrent ? 'w-full duration-1000' : 'w-0'
                            }`}
                            style={{ backgroundColor: selectedTheme.primary }}
                          />
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 px-0.5">
                    <span className="font-bold flex items-center gap-1" style={{ color: selectedTheme.primary }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: selectedTheme.primary }} />
                      Video Clip Mode
                    </span>
                    <span className="text-slate-300 font-semibold">
                      {isPlayingPreview
                        ? `${previewTimer.toFixed(1)}s / 17.0s`
                        : `Slide 0${activeSlide + 1} / 07`}
                    </span>
                  </div>
                </div>
              )}

              {/* Preview Window (360x450 in 4:5 ratio) */}
              <div id="tiktok-preview-slide" className="w-[320px] sm:w-[360px] aspect-[4/5] overflow-hidden rounded-xl relative bg-[#0b0e14]">
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
                  theme={selectedTheme}
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
                    <span>Play Preview</span>
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

            {/* PLATFORM: PINTEREST */}
            {platform === 'pinterest' && (
              <>
                {/* 3-Way Mode Switcher: Card | Carousel | Video */}
                <div className="flex items-center p-1 bg-[#0d121c] border border-[#1e2638] rounded-xl w-full">
                  <button
                    onClick={() => setPinterestMode('card')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                      pinterestMode === 'card'
                        ? 'text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    style={pinterestMode === 'card' ? {
                      backgroundColor: selectedTheme.primary,
                      boxShadow: `0 0 12px ${selectedTheme.glow}`,
                    } : {}}
                  >
                    <DownloadIcon className="w-3.5 h-3.5" />
                    <span>Pin Card</span>
                  </button>

                  <button
                    onClick={() => setPinterestMode('carousel')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                      pinterestMode === 'carousel'
                        ? 'text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    style={pinterestMode === 'carousel' ? {
                      backgroundColor: selectedTheme.primary,
                      boxShadow: `0 0 12px ${selectedTheme.glow}`,
                    } : {}}
                  >
                    <LayersIcon className="w-3.5 h-3.5" />
                    <span>Carousel</span>
                  </button>

                  <button
                    onClick={() => {
                      setPinterestMode('video')
                      setExportMode('video')
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                      pinterestMode === 'video'
                        ? 'text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    style={pinterestMode === 'video' ? {
                      backgroundColor: selectedTheme.primary,
                      boxShadow: `0 0 12px ${selectedTheme.glow}`,
                    } : {}}
                  >
                    <VideoIcon className="w-3.5 h-3.5" />
                    <span>Video Pin</span>
                  </button>
                </div>

                {/* Option 1: Pin Card */}
                {pinterestMode === 'card' && (
                  <div
                    className="p-4 rounded-xl bg-[#111622] space-y-3 border transition-colors"
                    style={{ borderColor: `${selectedTheme.primary}45` }}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white">Pinterest Pin Card</h3>
                        <span
                          className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
                          style={{
                            color: selectedTheme.primary,
                            backgroundColor: `${selectedTheme.primary}18`,
                            borderColor: `${selectedTheme.primary}40`,
                          }}
                        >
                          PNG Pin
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        High-resolution 760px optimized card with definition, visual state, and balanced padding designed for Pinterest feeds.
                      </p>
                    </div>

                    <button
                      onClick={handleExportPinterestCard}
                      className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white shadow-lg transition-all flex items-center justify-center gap-2 hover:opacity-95"
                      style={{
                        backgroundColor: selectedTheme.primary,
                        boxShadow: `0 4px 14px ${selectedTheme.glow}`,
                      }}
                    >
                      <DownloadIcon className="w-4 h-4" />
                      <span>Download Pin Card & Open Pinterest ↗</span>
                    </button>

                    <button
                      onClick={openPinterestUpload}
                      className="w-full py-1 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1 transition-colors"
                    >
                      <span>Just open Pinterest Pin Studio</span>
                      <span className="text-[10px]">↗</span>
                    </button>
                  </div>
                )}

                {/* Option 2: Pin Carousel (ZIP) */}
                {pinterestMode === 'carousel' && (
                  <div
                    className="p-4 rounded-xl bg-[#111622] space-y-3 border transition-colors"
                    style={{ borderColor: `${selectedTheme.primary}45` }}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white">Pinterest Carousel (7 Slides)</h3>
                        <span
                          className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
                          style={{
                            color: selectedTheme.primary,
                            backgroundColor: `${selectedTheme.primary}18`,
                            borderColor: `${selectedTheme.primary}40`,
                          }}
                        >
                          ZIP Bundle
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Downloads all 7 slides in high-resolution PNG format with pinterest-pin-info.txt for multi-slide Pinterest pins.
                      </p>
                    </div>

                    <button
                      onClick={handleExportPinterestCarousel}
                      disabled={exportingZip}
                      className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white shadow-lg transition-all flex items-center justify-center gap-2 hover:opacity-95"
                      style={{
                        backgroundColor: selectedTheme.primary,
                        boxShadow: `0 4px 14px ${selectedTheme.glow}`,
                      }}
                    >
                      {exportingZip ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Rendering ({exportProgress.current}/{exportProgress.total})...</span>
                        </>
                      ) : (
                        <>
                          <UploadIcon className="w-4 h-4" />
                          <span>Download Carousel ZIP & Open Pinterest ↗</span>
                        </>
                      )}
                    </button>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={handleDownloadSummaryCard}
                        className="py-2 px-2 rounded-lg text-xs font-semibold bg-[#161d2d] hover:bg-[#1f283d] text-white transition-colors flex items-center justify-center gap-1.5 border border-white/10"
                        title="Download Slide 1 Summary Card as high-res PNG"
                      >
                        <DownloadIcon className="w-3.5 h-3.5" style={{ color: selectedTheme.primary }} />
                        <span>Summary Card</span>
                      </button>

                      <button
                        onClick={handleDownloadActive}
                        className="py-2 px-2 rounded-lg text-xs font-medium bg-[#161d2d] hover:bg-[#1f283d] text-white transition-colors flex items-center justify-center gap-1.5"
                        title="Download current active slide PNG"
                      >
                        <DownloadIcon className="w-3.5 h-3.5 text-blue-400" />
                        <span>Active Slide</span>
                      </button>
                    </div>

                    <div className="pt-0.5">
                      <button
                        onClick={handleCopyActiveImage}
                        className="w-full py-1.5 px-2 rounded-lg text-xs font-medium bg-[#111622] hover:bg-[#161d2d] text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-1.5 border border-white/5"
                      >
                        <CopyIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy Current Slide to Clipboard</span>
                      </button>
                    </div>

                    <button
                      onClick={openPinterestUpload}
                      className="w-full py-1 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1 transition-colors"
                    >
                      <span>Just open Pinterest Pin Studio</span>
                      <span className="text-[10px]">↗</span>
                    </button>
                  </div>
                )}

                {/* Option 3: Video Pin */}
                {pinterestMode === 'video' && (
                  <div
                    className="p-4 rounded-xl bg-[#111622] space-y-3 border transition-colors"
                    style={{ borderColor: `${selectedTheme.primary}45` }}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white">Pinterest Video Pin (9:16)</h3>
                        <span
                          className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
                          style={{
                            color: selectedTheme.primary,
                            backgroundColor: `${selectedTheme.primary}18`,
                            borderColor: `${selectedTheme.primary}40`,
                          }}
                        >
                          MP4 Video Pin
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        9:16 vertical motion video pin with 5-second visualization playback, smooth transitions, and story timer.
                      </p>
                    </div>

                    {/* Encoding Progress Bar */}
                    {exportingVideo && (
                      <div className="p-3 rounded-lg bg-[#0b0e14] border border-[#1e2638] space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-300">{videoProgress.message || 'Encoding...'}</span>
                          <span className="font-bold" style={{ color: selectedTheme.primary }}>{videoProgress.percent}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#161d2d] overflow-hidden">
                          <div
                            className="h-full transition-all duration-200"
                            style={{ width: `${videoProgress.percent}%`, backgroundColor: selectedTheme.primary }}
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
                            className="hover:underline"
                            style={{ color: selectedTheme.primary }}
                          >
                            Download Again
                          </a>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleExportPinterestVideo}
                      disabled={exportingVideo}
                      className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white shadow-lg transition-all flex items-center justify-center gap-2 hover:opacity-95"
                      style={{
                        backgroundColor: selectedTheme.primary,
                        boxShadow: `0 4px 14px ${selectedTheme.glow}`,
                      }}
                    >
                      {exportingVideo ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Encoding ({videoProgress.currentSec || 0}s / ${videoProgress.totalSec || 17}.0s)...</span>
                        </>
                      ) : (
                        <>
                          <VideoIcon className="w-4 h-4" />
                          <span>{videoResult ? 'Re-Export Video Pin ↗' : 'Export Video Pin & Open Pinterest ↗'}</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={openPinterestUpload}
                      className="w-full py-1 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1 transition-colors"
                    >
                      <span>Just open Pinterest Pin Studio</span>
                      <span className="text-[10px]">↗</span>
                    </button>
                  </div>
                )}

                {/* Pin Title & Description Box */}
                <div className="p-3.5 rounded-xl bg-[#111622] border border-[#1e2638] space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Pin Title & Info</h4>
                    <button
                      onClick={handleCopyPinterestDetails}
                      className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold transition-colors flex items-center gap-1"
                    >
                      {copiedCaption ? '✓ Copied' : 'Copy Text'}
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-white font-mono bg-[#0b0e14] px-2.5 py-1.5 rounded-lg border border-[#1e2638]">
                      {getPinterestPinTitle(concept)}
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#0b0e14] border border-[#1e2638] text-[11px] text-slate-300 font-mono leading-relaxed max-h-24 overflow-y-auto select-all">
                      {getPinterestPinDescription(concept)}
                    </div>
                  </div>
                </div>

                {/* Pinterest Strategy Notes */}
                <div className="p-3 rounded-xl bg-[#0d121c] border border-[#1e2638] text-[11px] text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-300">Pinterest Strategy:</p>
                  <p>• Save to tech boards: DSA Prep, Computer Science Cheat Sheets, Web Dev.</p>
                  <p>• Clean visual cards generate continuous algorithmic impressions.</p>
                  <p>• Set destination link to concept page on learnblazinglyfast.tech.</p>
                </div>
              </>
            )}

            {/* PLATFORM: YOUTUBE SHORTS (Video alone) */}
            {platform === 'youtube' && (
              <>
                <div
                  className="p-4 rounded-xl bg-[#111622] space-y-3 border transition-colors"
                  style={{ borderColor: `${selectedTheme.primary}45` }}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white">YouTube Shorts (9:16 Video)</h3>
                      <span
                        className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
                        style={{
                          color: selectedTheme.primary,
                          backgroundColor: `${selectedTheme.primary}18`,
                          borderColor: `${selectedTheme.primary}40`,
                        }}
                      >
                        MP4 / WebM
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      High-resolution 9:16 vertical video (720x1280) with centered card and HUD safe zones tailored for YouTube Shorts native overlays.
                    </p>
                  </div>

                  {/* Encoding Progress Bar */}
                  {exportingVideo && (
                    <div className="p-3 rounded-lg bg-[#0b0e14] border border-[#1e2638] space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-300">{videoProgress.message || 'Encoding...'}</span>
                        <span className="font-bold" style={{ color: selectedTheme.primary }}>{videoProgress.percent}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#161d2d] overflow-hidden">
                        <div
                          className="h-full transition-all duration-200"
                          style={{ width: `${videoProgress.percent}%`, backgroundColor: selectedTheme.primary }}
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
                          className="hover:underline"
                          style={{ color: selectedTheme.primary }}
                        >
                          Download Again
                        </a>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleExportYouTubeShort}
                    disabled={exportingVideo}
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white shadow-lg transition-all flex items-center justify-center gap-2 hover:opacity-95"
                    style={{
                      backgroundColor: selectedTheme.primary,
                      boxShadow: `0 4px 14px ${selectedTheme.glow}`,
                    }}
                  >
                    {exportingVideo ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Encoding ({videoProgress.currentSec || 0}s / ${videoProgress.totalSec || 17}.0s)...</span>
                      </>
                    ) : (
                      <>
                        <VideoIcon className="w-4 h-4" />
                        <span>{videoResult ? 'Re-Export Shorts Video ↗' : 'Export Shorts Video & Open Studio ↗'}</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={openYouTubeUpload}
                    className="w-full py-1 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>Just open YouTube Studio</span>
                    <span className="text-[10px]">↗</span>
                  </button>
                </div>

                {/* Shorts Title & Description Box */}
                <div className="p-3.5 rounded-xl bg-[#111622] border border-[#1e2638] space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Title & Tags</h4>
                    <button
                      onClick={handleCopyYouTubeDetails}
                      className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold transition-colors flex items-center gap-1"
                    >
                      {copiedCaption ? '✓ Copied' : 'Copy Text'}
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-white font-mono bg-[#0b0e14] px-2.5 py-1.5 rounded-lg border border-[#1e2638]">
                      {getYouTubeShortsTitle(concept)}
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#0b0e14] border border-[#1e2638] text-[11px] text-slate-300 font-mono leading-relaxed max-h-24 overflow-y-auto select-all">
                      {getYouTubeShortsDescription(concept)}
                    </div>
                  </div>
                </div>

                {/* YouTube Shorts Strategy Notes */}
                <div className="p-3 rounded-xl bg-[#0d121c] border border-[#1e2638] text-[11px] text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-300">YouTube Shorts Strategy:</p>
                  <p>• Fast-paced visual algorithm demo formatted in 9:16 ratio.</p>
                  <p>• High viewer retention with live animated state changes.</p>
                  <p>• Pin comment: "Did you spot the answer to the Slide 6 challenge?"</p>
                </div>
              </>
            )}

            {/* PLATFORM: TIKTOK / REELS */}
            {platform === 'tiktok' && (
              <>
                {/* Export Mode Switcher */}
                <div className="flex items-center p-1 bg-[#0d121c] border border-[#1e2638] rounded-xl w-full">
                  <button
                    onClick={() => {
                      setExportMode('video')
                      setPreviewTimer(0)
                      setActiveSlide(0)
                      setIsPlayingPreview(true)
                    }}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      exportMode === 'video'
                        ? 'text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    style={exportMode === 'video' ? {
                      backgroundColor: selectedTheme.primary,
                      boxShadow: `0 0 12px ${selectedTheme.glow}`,
                    } : {}}
                  >
                    <VideoIcon className="w-3.5 h-3.5" />
                    <span>Video Clip</span>
                  </button>
                  <button
                    onClick={() => {
                      setExportMode('carousel')
                      setIsPlayingPreview(false)
                    }}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      exportMode === 'carousel'
                        ? 'text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    style={exportMode === 'carousel' ? {
                      backgroundColor: selectedTheme.primary,
                      boxShadow: `0 0 12px ${selectedTheme.glow}`,
                    } : {}}
                  >
                    <LayersIcon className="w-3.5 h-3.5" />
                    <span>7-Slide Carousel</span>
                  </button>
                </div>

                {/* Mode A: 15s Video Clip Export */}
                {exportMode === 'video' && (
                  <div
                    className="p-4 rounded-xl bg-[#111622] space-y-3 border transition-colors"
                    style={{ borderColor: `${selectedTheme.primary}45` }}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white">Motion Video Clip</h3>
                        <span
                          className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
                          style={{
                            color: selectedTheme.primary,
                            backgroundColor: `${selectedTheme.primary}18`,
                            borderColor: `${selectedTheme.primary}40`,
                          }}
                        >
                          MP4 / WebM
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Combines all 7 slides into a continuous video clip with 5-second visualization playback, smooth cross-fades, and story timer.
                      </p>
                    </div>

                    {/* Encoding Progress Bar */}
                    {exportingVideo && (
                      <div className="p-3 rounded-lg bg-[#0b0e14] border border-[#1e2638] space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-300">{videoProgress.message || 'Encoding...'}</span>
                          <span className="font-bold" style={{ color: selectedTheme.primary }}>{videoProgress.percent}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#161d2d] overflow-hidden">
                          <div
                            className="h-full transition-all duration-200"
                            style={{ width: `${videoProgress.percent}%`, backgroundColor: selectedTheme.primary }}
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
                            className="hover:underline"
                            style={{ color: selectedTheme.primary }}
                          >
                            Download Again
                          </a>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleExportVideoClipAndOpenTikTok}
                      disabled={exportingVideo}
                      className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white shadow-lg transition-all flex items-center justify-center gap-2 hover:opacity-95"
                      style={{
                        backgroundColor: selectedTheme.primary,
                        boxShadow: `0 4px 14px ${selectedTheme.glow}`,
                      }}
                    >
                      {exportingVideo ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Encoding ({videoProgress.currentSec || 0}s / ${videoProgress.totalSec || 17}.0s)...</span>
                        </>
                      ) : (
                        <>
                          <VideoIcon className="w-4 h-4" />
                          <span>{videoResult ? 'Re-Export Video Clip ↗' : 'Export Video Clip & Open TikTok ↗'}</span>
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
                  <div
                    className="p-4 rounded-xl bg-[#111622] space-y-3 border transition-colors"
                    style={{ borderColor: `${selectedTheme.primary}45` }}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white">7-Slide Photo Carousel</h3>
                        <span
                          className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
                          style={{
                            color: selectedTheme.primary,
                            backgroundColor: `${selectedTheme.primary}18`,
                            borderColor: `${selectedTheme.primary}40`,
                          }}
                        >
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
                      className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white shadow-lg transition-all flex items-center justify-center gap-2 hover:opacity-95"
                      style={{
                        backgroundColor: selectedTheme.primary,
                        boxShadow: `0 4px 14px ${selectedTheme.glow}`,
                      }}
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
                        onClick={handleDownloadSummaryCard}
                        className="py-2 px-2 rounded-lg text-xs font-semibold bg-[#161d2d] hover:bg-[#1f283d] text-white transition-colors flex items-center justify-center gap-1.5 border border-white/10"
                        title="Download Slide 1 Summary Card as high-res 1080x1350 PNG"
                      >
                        <DownloadIcon className="w-3.5 h-3.5" style={{ color: selectedTheme.primary }} />
                        <span>Summary Card</span>
                      </button>

                      <button
                        onClick={handleDownloadActive}
                        className="py-2 px-2 rounded-lg text-xs font-medium bg-[#161d2d] hover:bg-[#1f283d] text-white transition-colors flex items-center justify-center gap-1.5"
                        title="Download current active slide PNG"
                      >
                        <DownloadIcon className="w-3.5 h-3.5 text-blue-400" />
                        <span>Active Slide</span>
                      </button>
                    </div>

                    <div className="pt-0.5">
                      <button
                        onClick={handleCopyActiveImage}
                        className="w-full py-1.5 px-2 rounded-lg text-xs font-medium bg-[#111622] hover:bg-[#161d2d] text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-1.5 border border-white/5"
                      >
                        <CopyIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy Current Slide to Clipboard</span>
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
                      <p>• Post as **Video (with 5s Visualizer)**.</p>
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
              </>
            )}

          </div>
        </div>

      </motion.div>

      {/* Offscreen Render Container for High-Resolution 1080x1350 Canvas Export (completely hidden from view) */}
      <div
        id="tiktok-offscreen-export-container"
        aria-hidden="true"
        tabIndex={-1}
        style={{
          position: 'fixed',
          left: '-99999px',
          top: 0,
          width: '540px',
          height: '675px',
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: -99999,
          visibility: 'visible',
        }}
      >
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
              isExportVideoBase={exportMode === 'video' && idx === 1}
              theme={selectedTheme}
            />
          </div>
        ))}
      </div>
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
  isExportVideoBase = false,
  theme,
}) {
  const currentTheme = theme || getInitialThemeForConcept(concept)
  const scaleClass = isExportResolution ? 'p-8 text-sm' : 'p-5 text-xs'
  const currentStr = String(index + 1).padStart(2, '0')
  const totalStr = String(totalSlides).padStart(2, '0')

  return (
    <div className={`w-full h-full flex flex-col justify-between select-none bg-[#0b0e14] text-white font-sans ${scaleClass}`}>
      {/* Top Header Row with divider */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: currentTheme.primary }} />
          <span
            className="text-[10px] sm:text-[11px] font-bold tracking-widest uppercase font-mono"
            style={{ color: currentTheme.primary }}
          >
            {domain} · {concept.category || 'ALGORITHMS'}
          </span>
        </div>
        <span className="text-[10px] sm:text-[11px] font-mono text-slate-400 font-semibold px-2 py-0.5 rounded bg-white/5 border border-white/10">
          {currentStr} / {totalStr}
        </span>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex flex-col justify-center py-2 overflow-visible">
        {index === 0 && (
          <Slide1Cover concept={concept} domain={domain} capturedVisualUrl={capturedVisualUrl} theme={currentTheme} isVideoMode={isVideoMode} />
        )}
        {index === 1 && (
          <Slide2Visualization
            concept={concept}
            card={card}
            capturedVisualUrl={capturedVisualUrl}
            progress={progress}
            isVideoMode={isVideoMode}
            isExportResolution={isExportResolution}
            isExportVideoBase={isExportVideoBase}
            theme={currentTheme}
          />
        )}
        {index === 2 && (
          <Slide3Definition concept={concept} card={card} theme={currentTheme} />
        )}
        {index === 3 && (
          <Slide4ComplexityAndUseCases concept={concept} card={card} theme={currentTheme} />
        )}
        {index === 4 && (
          <Slide5Gotchas concept={concept} card={card} theme={currentTheme} />
        )}
        {index === 5 && (
          <Slide6TerminalChallenge concept={concept} exercise={exercise} theme={currentTheme} />
        )}
        {index === 6 && (
          <Slide7PlatformAndCTA concept={concept} theme={currentTheme} />
        )}
      </div>

      {/* Bottom Footer Row with divider */}
      <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 font-medium">
        <div className="flex items-center gap-1.5 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          <span>learnblazinglyfast.tech</span>
        </div>
        <span className="font-mono text-slate-400 font-semibold">
          {index === 0 ? 'Swipe to explore →' : `Slide ${currentStr}`}
        </span>
      </div>
    </div>
  )
}

// ─── Visual Graphic Frame Component ───────────────────────────────────────────

function SlideVisualFrame({ concept, capturedVisualUrl, theme, isVideoMode }) {
  if (capturedVisualUrl && !isVideoMode) {
    return (
      <img
        src={capturedVisualUrl}
        alt={concept?.title}
        className="max-h-full max-w-full object-contain filter drop-shadow-sm"
      />
    )
  }
  return <ConceptGraphicIllustration concept={concept} theme={theme} />
}

// ─── 01. Hook / Cover ─────────────────────────────────────────────────────────

function Slide1Cover({ concept, domain, capturedVisualUrl, theme, isVideoMode }) {
  return (
    <div className="flex flex-col gap-3 text-left justify-center flex-1">
      <div className="flex items-center gap-2">
        <span
          className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border"
          style={{
            color: theme?.primary || '#38bdf8',
            borderColor: `${theme?.primary || '#38bdf8'}50`,
            backgroundColor: `${theme?.primary || '#38bdf8'}15`,
          }}
        >
          Tech Concept of the Day
        </span>
        <span className="px-2 py-0.5 rounded-full bg-[#111622] border border-[#1e2638] text-slate-400 text-[10px] font-medium font-mono">
          Open Source
        </span>
      </div>

      <div className="space-y-1">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
          Learn Blazingly Fast · The Visual Tech Dictionary
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
          The Visual Guide to <span style={{ color: theme?.primary || '#38bdf8' }}>{concept.title}</span>.
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
          Master this fundamental in 60 seconds with zero textbook fluff.
        </p>
      </div>

      {/* Graphic Image Frame Container */}
      <div className="w-full aspect-[16/9] max-h-[190px] sm:max-h-[210px] rounded-xl bg-[#111622] border border-[#1e2638] flex items-center justify-center p-2.5 relative overflow-hidden">
        <SlideVisualFrame concept={concept} capturedVisualUrl={capturedVisualUrl} theme={theme} isVideoMode={isVideoMode} />
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
  isExportVideoBase = false,
  theme,
}) {
  return (
    <div className="flex flex-col gap-2.5 text-left justify-center flex-1">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Watch How It Works
        </h2>
        <p className="text-xs font-semibold mt-0.5" style={{ color: theme?.primary || '#38bdf8' }}>
          {isVideoMode ? 'Algorithm playing in real-time execution flow:' : 'Algorithms are living systems. State changes in real time:'}
        </p>
      </div>

      {/* Visualization Image Frame */}
      <div
        data-viz-frame="true"
        className="w-full aspect-[16/10] max-h-[230px] sm:max-h-[250px] rounded-xl bg-[#0b0e14] border border-[#1e2638] flex items-center justify-center relative overflow-hidden"
      >
        {isExportVideoBase ? (
          <div className="w-full h-full bg-[#0b0e14]" />
        ) : capturedVisualUrl && !isVideoMode ? (
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
            isVideoMode={isVideoMode}
            theme={theme}
            fallback={<ConceptGraphicIllustration concept={concept} theme={theme} />}
          />
        )}
      </div>

      {/* Core Flow Annotation */}
      <div className="p-2.5 rounded-xl bg-[#111622] border border-[#1e2638] text-xs text-slate-300 leading-relaxed">
        <span className="font-bold text-white">What's happening: </span>
        {card?.intuition?.slice(0, 150) || 'Data transitions through states step-by-step to optimize execution path and memory boundaries.'}...
      </div>
    </div>
  )
}

// ─── 03. The Definition & Intuition ───────────────────────────────────────────

function Slide3Definition({ concept, card, theme }) {
  return (
    <div className="flex flex-col gap-3 text-left justify-center flex-1">
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
        <span
          className="text-[10px] font-bold uppercase tracking-wider block font-mono"
          style={{ color: theme?.primary || '#38bdf8' }}
        >
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

function Slide4ComplexityAndUseCases({ concept, card, theme }) {
  return (
    <div className="flex flex-col gap-3 text-left justify-center flex-1">
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
          <div
            className="text-lg font-mono font-bold"
            style={{ color: theme?.primary || '#38bdf8' }}
          >
            {card?.space_complexity || 'O(1)'}
          </div>
          <span className="text-[10px] text-slate-400 block">Auxiliary memory footprint</span>
        </div>
      </div>

      {/* When to Use It */}
      <div className="p-3.5 rounded-xl bg-[#111622] border border-[#1e2638] space-y-1">
        <span
          className="text-[10px] font-bold uppercase tracking-wider block font-mono"
          style={{ color: theme?.primary || '#38bdf8' }}
        >
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

function Slide5Gotchas({ concept, card, theme }) {
  return (
    <div className="flex flex-col gap-3 text-left justify-center flex-1">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Common Interview Traps
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Mistakes 90% of candidates make under pressure
        </p>
      </div>

      <div className="space-y-2">
        <div className="p-3 rounded-xl bg-[#111622] border border-[#1e2638] space-y-0.5">
          <div className="text-xs font-bold text-slate-200">
            Trap 1: Edge Cases & Off-by-One Boundaries
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Failing to test empty collections, single-element arrays, or potential integer overflow when computing midpoints.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-[#111622] border border-[#1e2638] space-y-0.5">
          <div className="text-xs font-bold text-slate-200">
            Trap 2: State Mutation & Invariant Drift
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Mutating state across frames instead of preserving clean loop invariants and base conditions.
          </p>
        </div>

        <div
          className="p-2.5 rounded-xl border text-xs text-slate-300 leading-relaxed"
          style={{
            backgroundColor: '#131926',
            borderColor: `${theme?.primary || '#38bdf8'}40`,
          }}
        >
          <span className="font-bold" style={{ color: theme?.primary || '#38bdf8' }}>Rule of Thumb: </span>
          Before writing code, trace your base condition and constraints. 90% of interview bugs happen at boundary checks.
        </div>
      </div>
    </div>
  )
}

// ─── 06. Terminal Coding Challenge ────────────────────────────────────────────

function Slide6TerminalChallenge({ concept, exercise, theme }) {
  const prompt = exercise?.prompt || 'Test your understanding of this concept:'
  const rawCode = exercise?.starter_code || 'function solution(input) {\n  // What goes here?\n  return result;\n}'

  // Keep code compact so it fits cleanly in the vertical video frame without overflow
  const codeLines = rawCode.split('\n')
  const compactCode = codeLines.length > 5
    ? [...codeLines.slice(0, 5), '  // ...'].join('\n')
    : rawCode

  return (
    <div className="flex flex-col gap-2 text-left justify-center flex-1 max-h-full">
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug">
          Terminal Challenge
        </h2>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Can you spot the solution in your head?
        </p>
      </div>

      {/* Terminal Window */}
      <div className="w-full rounded-xl bg-[#080b11] border border-[#1e2638] overflow-hidden shadow-lg">
        {/* Titlebar */}
        <div className="px-2.5 py-1 bg-[#0e131d] border-b border-[#1e2638] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
            <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
            <span className="w-2 h-2 rounded-full bg-[#10b981]" />
          </div>
          <span className="text-[9.5px] font-mono text-slate-400">challenge.test.js</span>
          <span className="text-[9.5px] text-slate-500 font-mono">bash</span>
        </div>

        {/* Terminal Body */}
        <div className="p-2.5 font-mono text-[10px] space-y-1.5 text-left">
          <div style={{ color: theme?.primary || '#38bdf8' }}>
            ❯ test --concept="{concept.slug}"
          </div>

          <div className="text-slate-300 font-sans text-[11px] leading-snug line-clamp-2">
            {prompt}
          </div>

          <div className="p-2 rounded-lg bg-[#05070c] border border-[#1a2130] text-slate-300 font-mono text-[9.5px] leading-tight max-h-[110px] overflow-hidden whitespace-pre-wrap select-all">
            {compactCode}
          </div>

          <div className="text-[9.5px] font-sans font-semibold pt-0.5" style={{ color: theme?.primary || '#38bdf8' }}>
            ❯ Drop your solution in the comments below!
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 07. Platform & Open Source CTA ───────────────────────────────────────────

function Slide7PlatformAndCTA({ concept, theme }) {
  return (
    <div className="flex flex-col gap-3 text-left justify-center flex-1">
      <div className="space-y-0.5">
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
          <span
            className="w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-bold border"
            style={{
              color: theme?.primary || '#38bdf8',
              borderColor: `${theme?.primary || '#38bdf8'}50`,
              backgroundColor: `${theme?.primary || '#38bdf8'}15`,
            }}
          >✓</span>
          <span>550+ interactive step-by-step visual simulators</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-bold border"
            style={{
              color: theme?.primary || '#38bdf8',
              borderColor: `${theme?.primary || '#38bdf8'}50`,
              backgroundColor: `${theme?.primary || '#38bdf8'}15`,
            }}
          >✓</span>
          <span>100% free • No ads • No paywall</span>
        </div>
      </div>

      {/* Footer Prompts */}
      <div className="space-y-1.5 pt-1 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <BookmarkIcon className="w-3.5 h-3.5 shrink-0" style={{ color: theme?.primary || '#38bdf8' }} />
          <span>Save this post for your technical interview prep.</span>
        </div>
        <div className="flex items-center gap-2">
          <ChatIcon className="w-3.5 h-3.5 shrink-0" style={{ color: theme?.primary || '#38bdf8' }} />
          <span>Like & share to help another developer learn!</span>
        </div>
      </div>
    </div>
  )
}

// ─── High-Detail Algorithmic Illustrations (Image Fallbacks) ──────────────────

function ConceptGraphicIllustration({ concept, theme }) {
  const type = concept.visualization?.type || ''
  const slug = (concept.slug || '').toLowerCase()
  const cat = (concept.category || '').toLowerCase()
  const domain = (concept.domain || '').toLowerCase()
  const mode = (concept.visualization?.config?.mode || '').toLowerCase()

  if (slug.includes('lifecycle') || mode === 'lifecycle' || (domain.includes('react') && type.includes('state'))) {
    return <LifecycleIllustration concept={concept} theme={theme} />
  }
  if (type === 'array-pointers' || slug.includes('search') || slug.includes('pointer')) {
    return <ArraySearchIllustration concept={concept} theme={theme} />
  }
  if (type === 'array-bars' || slug.includes('sort')) {
    return <SortingBarsIllustration concept={concept} theme={theme} />
  }
  if (type === 'tree-canvas' || cat.includes('tree') || slug.includes('tree') || slug.includes('bst') || slug.includes('heap')) {
    return <BinaryTreeIllustration concept={concept} theme={theme} />
  }
  if (type === 'graph-traversal' || cat.includes('graph') || slug.includes('dijkstra') || slug.includes('bfs') || slug.includes('dfs')) {
    return <NetworkGraphIllustration concept={concept} theme={theme} />
  }
  if (type === 'matrix-grid' || cat.includes('dynamic') || slug.includes('matrix') || slug.includes('dp')) {
    return <MatrixDPIllustration concept={concept} theme={theme} />
  }
  if (type === 'heatmap-grid') {
    return <HeatmapIllustration concept={concept} theme={theme} />
  }
  if (type.includes('neural') || type.includes('loss') || domain.includes('ml') || domain.includes('ai') || slug.includes('transformer') || slug.includes('attention')) {
    return <NeuralNetworkIllustration concept={concept} theme={theme} />
  }
  if (type === 'timeline-step') {
    return <TimelineStepIllustration concept={concept} theme={theme} />
  }
  if (type === 'state-diagram') {
    return <StateDiagramIllustration concept={concept} theme={theme} />
  }
  if (type.includes('architecture') || slug.includes('cache') || slug.includes('lru') || domain.includes('system')) {
    return <SystemArchitectureIllustration concept={concept} theme={theme} />
  }
  return <DefaultFlowIllustration concept={concept} theme={theme} />
}

function ArraySearchIllustration({ concept, theme }) {
  const primary = theme?.primary || '#38bdf8'
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
        <span className="font-bold" style={{ color: primary }}>TARGET = {target}</span>
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
                    ? 'bg-blue-500/30 border-2 text-white shadow-md'
                    : inRange
                    ? 'bg-[#161d2d] border border-blue-500/40 text-slate-200'
                    : 'bg-[#0e131d] border border-[#1e2638] text-slate-500 opacity-60'
                }`}
                style={isMid ? { borderColor: primary } : {}}
              >
                {val}
              </div>
              <span
                className={`text-[9px] font-mono ${isMid ? 'font-bold' : 'text-slate-500'}`}
                style={isMid ? { color: primary } : {}}
              >
                [{i}]
              </span>
            </div>
          )
        })}
      </div>
      <div className="w-full flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2.5 px-2">
        <span className="text-slate-400">↑ Low: [{curStep.lo ?? 0}]</span>
        <span className="font-bold" style={{ color: primary }}>↑ Mid: [{curStep.mid ?? Math.floor(arr.length / 2)}]</span>
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

function BinaryTreeIllustration({ concept, theme }) {
  const primary = theme?.primary || '#38bdf8'
  return (
    <svg className="w-full h-full max-h-36" viewBox="0 0 280 130" fill="none">
      <line x1="140" y1="24" x2="80" y2="65" stroke="#1e2638" strokeWidth="2" />
      <line x1="140" y1="24" x2="200" y2="65" stroke={primary} strokeWidth="2.5" />
      <line x1="80" y1="65" x2="50" y2="105" stroke="#1e2638" strokeWidth="1.5" />
      <line x1="80" y1="65" x2="110" y2="105" stroke="#1e2638" strokeWidth="1.5" />
      <line x1="200" y1="65" x2="170" y2="105" stroke="#1e2638" strokeWidth="1.5" />
      <line x1="200" y1="65" x2="230" y2="105" stroke={primary} strokeWidth="2.5" />

      <circle cx="140" cy="24" r="14" fill="#161d2d" stroke={primary} strokeWidth="2" />
      <text x="140" y="28" textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">50</text>

      <circle cx="80" cy="65" r="12" fill="#111622" stroke="#1e2638" strokeWidth="1.5" />
      <text x="80" y="69" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">25</text>

      <circle cx="200" cy="65" r="13" fill="#161d2d" stroke={primary} strokeWidth="2" />
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
      <text x="222" y="15" textAnchor="middle" fill={primary} fontSize="8" fontFamily="monospace">Path: 50 ➔ 75 ➔ 90</text>
    </svg>
  )
}

function NetworkGraphIllustration({ concept, theme }) {
  const primary = theme?.primary || '#38bdf8'
  return (
    <svg className="w-full h-full max-h-36" viewBox="0 0 280 120" fill="none">
      <line x1="50" y1="60" x2="110" y2="25" stroke={primary} strokeWidth="2" />
      <line x1="50" y1="60" x2="110" y2="95" stroke="#1e2638" strokeWidth="1.5" />
      <line x1="110" y1="25" x2="170" y2="25" stroke={primary} strokeWidth="2.5" />
      <line x1="110" y1="95" x2="170" y2="95" stroke="#1e2638" strokeWidth="1.5" />
      <line x1="170" y1="25" x2="230" y2="60" stroke="#10b981" strokeWidth="2.5" />
      <line x1="170" y1="95" x2="230" y2="60" stroke="#1e2638" strokeWidth="1.5" />
      <line x1="110" y1="25" x2="170" y2="95" stroke="#1e2638" strokeWidth="1.5" />

      <text x="75" y="38" fill={primary} fontSize="8" fontFamily="monospace" fontWeight="bold">w=2</text>
      <text x="140" y="18" fill={primary} fontSize="8" fontFamily="monospace" fontWeight="bold">w=3</text>
      <text x="205" y="38" fill="#10b981" fontSize="8" fontFamily="monospace" fontWeight="bold">w=1</text>
      <text x="75" y="85" fill="#64748b" fontSize="8" fontFamily="monospace">w=7</text>
      <text x="140" y="108" fill="#64748b" fontSize="8" fontFamily="monospace">w=4</text>

      <circle cx="50" cy="60" r="14" fill="#161d2d" stroke={primary} strokeWidth="2" />
      <text x="50" y="64" textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">A</text>

      <circle cx="110" cy="25" r="13" fill="#161d2d" stroke={primary} strokeWidth="2" />
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

function MatrixDPIllustration({ concept, theme }) {
  const primary = theme?.primary || '#38bdf8'
  const rows = [
    ['0', '0', '0', '0', '0'],
    ['0', '1', '1', '1', '1'],
    ['0', '1', '2', '3', '4'],
    ['0', '1', '3', '6', '10'],
  ]
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-2">
      <div className="w-full flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1.5 px-2">
        <span className="font-bold" style={{ color: primary }}>dp[i][j] = dp[i-1][j] + dp[i][j-1]</span>
      </div>
      <div className="grid grid-cols-5 gap-1.5 w-full max-w-xs">
        {rows.flat().map((val, idx) => {
          const isOptimal = idx === 19 || idx === 18 || idx === 12 || idx === 6 || idx === 0
          return (
            <div
              key={idx}
              className={`h-7 rounded flex items-center justify-center font-mono text-xs font-bold ${
                isOptimal
                  ? 'border shadow-sm'
                  : 'bg-[#161d2d] border border-[#1e2638] text-slate-400'
              }`}
              style={
                isOptimal
                  ? {
                      color: primary,
                      borderColor: primary,
                      backgroundColor: `${primary}25`,
                    }
                  : {}
              }
            >
              {val}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function NeuralNetworkIllustration({ concept, theme }) {
  const primary = theme?.primary || '#38bdf8'
  return (
    <svg className="w-full h-full max-h-36" viewBox="0 0 280 120" fill="none">
      {[30, 60, 90].map((y1, i) =>
        [20, 46, 74, 100].map((y2, j) => (
          <line key={`l1-${i}-${j}`} x1="60" y1={y1} x2="140" y2={y2} stroke="#1e2638" strokeWidth="1" />
        ))
      )}
      <line x1="60" y1="60" x2="140" y2="46" stroke={primary} strokeWidth="2" />
      <line x1="60" y1="60" x2="140" y2="74" stroke={primary} strokeWidth="2" />

      {[20, 46, 74, 100].map((y1, i) =>
        [45, 75].map((y2, j) => (
          <line key={`l2-${i}-${j}`} x1="140" y1={y1} x2="220" y2={y2} stroke="#1e2638" strokeWidth="1" />
        ))
      )}
      <line x1="140" y1="46" x2="220" y2="45" stroke="#10b981" strokeWidth="2.5" />
      <line x1="140" y1="74" x2="220" y2="45" stroke="#10b981" strokeWidth="2.5" />

      {[30, 60, 90].map((y, i) => (
        <circle key={`in-${i}`} cx="60" cy={y} r="8" fill="#161d2d" stroke={primary} strokeWidth="1.5" />
      ))}

      {[20, 46, 74, 100].map((y, i) => (
        <circle key={`hid-${i}`} cx="140" cy={y} r="9" fill="#161d2d" stroke={primary} strokeWidth="1.5" />
      ))}

      <circle cx="220" cy="45" r="10" fill="#161d2d" stroke="#10b981" strokeWidth="2" />
      <circle cx="220" cy="75" r="8" fill="#111622" stroke="#1e2638" strokeWidth="1.5" />

      <text x="60" y="115" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">Input</text>
      <text x="140" y="115" textAnchor="middle" fill={primary} fontSize="8" fontFamily="monospace">Dense</text>
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

function DefaultFlowIllustration({ concept, theme }) {
  const primary = theme?.primary || '#38bdf8'
  return (
    <svg className="w-48 h-32" viewBox="0 0 200 120" fill="none">
      <line x1="100" y1="20" x2="60" y2="70" stroke="#1e2638" strokeWidth="1.5" />
      <line x1="100" y1="20" x2="140" y2="70" stroke="#1e2638" strokeWidth="1.5" />
      <line x1="100" y1="20" x2="100" y2="70" stroke="#1e2638" strokeWidth="1.5" />
      <line x1="60" y1="70" x2="40" y2="105" stroke="#1e2638" strokeWidth="1.5" />
      <line x1="60" y1="70" x2="80" y2="105" stroke="#1e2638" strokeWidth="1.5" />
      <line x1="140" y1="70" x2="120" y2="105" stroke="#1e2638" strokeWidth="1.5" />
      <line x1="140" y1="70" x2="160" y2="105" stroke="#1e2638" strokeWidth="1.5" />

      <circle cx="100" cy="20" r="7" fill={primary} />
      <circle cx="100" cy="70" r="6" fill={primary} />
      <circle cx="60" cy="70" r="6" fill={primary} />
      <circle cx="140" cy="70" r="6" fill={primary} />

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

function PinterestIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
    </svg>
  )
}

function YouTubeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

function TikTokIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.89 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.31 0 .61.05.89.13V9.38a6.33 6.33 0 0 0-.89-.06 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.58a8.28 8.28 0 0 0 4.84 1.56V6.69z" />
    </svg>
  )
}
