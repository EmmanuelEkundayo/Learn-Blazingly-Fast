import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { generateShareCard, copyShareCardImage, shareCardViaNative } from '../utils/shareCard.js'
import { toast } from 'react-hot-toast'
import { trackConceptView, trackExerciseAttempt, trackShare } from '../services/analytics.js'
import TikTokCarouselModal from '../components/ui/TikTokCarouselModal.jsx'
import { useConceptStore }  from '../store/conceptStore.js'
import { useProgressStore } from '../store/progressStore.js'
import SEO from '../components/ui/SEO.jsx'
import { getConceptMeta } from '../utils/seo'
import roadmaps           from '../data/roadmaps/index.js'
import GraphCanvas       from '../components/visualizations/GraphCanvas.jsx'
import ArrayBars         from '../components/visualizations/ArrayBars.jsx'
import MatrixGrid        from '../components/visualizations/MatrixGrid.jsx'
import ArrayPointers     from '../components/visualizations/ArrayPointers.jsx'
import TreeCanvas        from '../components/visualizations/TreeCanvas.jsx'
import LossLandscape     from '../components/visualizations/LossLandscape.jsx'
import ClusterPlot       from '../components/visualizations/ClusterPlot.jsx'
import HeatmapGrid       from '../components/visualizations/HeatmapGrid.jsx'
import TimelineStep      from '../components/visualizations/TimelineStep.jsx'
import DecisionBoundary  from '../components/visualizations/DecisionBoundary.jsx'
import NeuralNetDiagram  from '../components/visualizations/NeuralNetDiagram.jsx'
import VectorSpace       from '../components/visualizations/VectorSpace.jsx'
import ArchDiagram       from '../components/visualizations/ArchDiagram.jsx'
import StateDiagram      from '../components/visualizations/StateDiagram.jsx'
import {
  FillInBlank,
  SpotTheBug,
  ComplexityQuiz,
  OrderSteps,
  TraceOutput,
} from '../components/exercises/index.js'
import { complexityColor } from '../utils/complexity.js'
import { useNotesStore } from '../store/notesStore.js'
import { ImageIcon, LinkIcon } from '../components/ui/Icons.jsx'


// ─── viz registry ──────────────────────────────────────────────────────────────
const VIZ_MAP = {
  'graph-traversal':      GraphCanvas,
  'array-bars':           ArrayBars,
  'matrix-grid':          MatrixGrid,
  'array-pointers':       ArrayPointers,
  'tree-canvas':          TreeCanvas,
  'loss-landscape':       LossLandscape,
  'cluster-plot':         ClusterPlot,
  'heatmap-grid':         HeatmapGrid,
  'timeline-step':        TimelineStep,
  'decision-boundary':    DecisionBoundary,
  'neural-net-diagram':   NeuralNetDiagram,
  'vector-space':         VectorSpace,
  'code-flow':            TimelineStep,
  'state-diagram':        StateDiagram,
  'architecture-diagram': ArchDiagram,
}

// ─── exercise registry ─────────────────────────────────────────────────────────
const EXERCISE_MAP = {
  'fill-in-the-blank': FillInBlank,
  'spot-the-bug':      SpotTheBug,
  'complexity-quiz':   ComplexityQuiz,
  'order-the-steps':   OrderSteps,
  'order-steps':       OrderSteps,
  'trace-the-output':  TraceOutput,
  'trace-output':      TraceOutput,
  'multiple-choice':   ComplexityQuiz,
}

// ─── helpers ───────────────────────────────────────────────────────────────────
const DIFF_STYLE = {
  beginner:     'bg-green-900/30 text-green-400 border-green-900',
  intermediate: 'bg-yellow-900/30 text-yellow-400 border-yellow-900',
  advanced:     'bg-red-900/30 text-red-400 border-red-900',
}

function domainAccent(domain) {
  switch (domain) {
    case 'DSA':
      return { text: 'text-dsa-400',      border: 'border-dsa-500',      ring: 'hover:border-dsa-500      hover:text-dsa-300'      }
    case 'ML':
      return { text: 'text-ml-400',       border: 'border-ml-500',       ring: 'hover:border-ml-400       hover:text-ml-300'       }
    case 'AI':
      return { text: 'text-ai-400',       border: 'border-ai-500',       ring: 'hover:border-ai-400       hover:text-ai-300'       }
    case 'Frontend':
      return { text: 'text-frontend-400', border: 'border-frontend-500', ring: 'hover:border-frontend-500 hover:text-frontend-300' }
    case 'Backend':
      return { text: 'text-backend-400',  border: 'border-backend-500',  ring: 'hover:border-backend-500  hover:text-backend-300'  }
    case 'Software Engineering':
      return { text: 'text-se-400',       border: 'border-se-500',       ring: 'hover:border-se-500       hover:text-se-300'       }
    default:
      return { text: 'text-gray-400',     border: 'border-gray-500',     ring: 'hover:border-gray-400     hover:text-gray-300'     }
  }
}

// ─── page ──────────────────────────────────────────────────────────────────────

export default function Concept() {
  const { slug }        = useParams()
  const navigate        = useNavigate()
  const concept         = useConceptStore(s => s.concepts.find(c => c.slug === slug) ?? null)
  const loaded          = useConceptStore(s => s.loaded)
  const markViewed          = useProgressStore(s => s.markViewed)
  const recordAttempt       = useProgressStore(s => s.recordAttempt)
  const setConfidence       = useProgressStore(s => s.setConfidence)
  const activeRoadmapSlug   = useProgressStore(s => s.active_roadmap_slug)
  const getRoadmapProgress  = useProgressStore(s => s.getRoadmapProgress)
  const getProgress          = useProgressStore(s => s.getProgress)
  const incrementInteractions = useProgressStore(s => s.incrementInteractions)

  const activeRoadmap = useMemo(() => roadmaps.find(r => r.slug === activeRoadmapSlug), [activeRoadmapSlug])
  // Only show if THIS concept is part of the roadmap
  const currentPhase = useMemo(() => {
    if (!activeRoadmap) return null
    return activeRoadmap.phases.find(p => p.concepts.includes(slug))
  }, [activeRoadmap, slug])

  const roadmapProgress = useMemo(() => getRoadmapProgress(activeRoadmap), [activeRoadmap, slug])
  const onScreenCardRef = useRef(null)

  useEffect(() => {
    if (slug) {
      markViewed(slug)
      incrementInteractions()
    }
    if (concept) {
      trackConceptView(concept)
    }
  }, [slug, concept, markViewed, incrementInteractions])

  // ── loading / not found ──
  if (!concept) {
    if (!loaded) {
      return (
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-pulse">
          <div className="h-4 w-48 bg-surface-700 rounded" />
          <div className="h-8 w-2/3 bg-surface-700 rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="h-4 w-24 bg-surface-700 rounded" />
              <div className="h-20 bg-surface-700 rounded" />
              <div className="h-16 bg-surface-700 rounded" />
            </div>
            <div className="h-64 bg-surface-700 rounded-lg" />
          </div>
        </div>
      )
    }
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 font-mono text-sm mb-3">/{slug}</p>
        <h1 className="text-2xl font-bold mb-4">Concept not found</h1>
        <Link to="/browse" className="text-gray-400 hover:underline text-sm">
          ← Browse all concepts
        </Link>
      </div>
    )
  }

  const { id, title, domain, category, difficulty, card, visualization, exercise, related, tags, prerequisites } = concept
  const accent       = domainAccent(domain)
  const VizComp      = VIZ_MAP[visualization?.type]
  const ExComp       = EXERCISE_MAP[exercise?.type]

  function handlePass() {
    recordAttempt(slug, true)
    trackExerciseAttempt({
      slug,
      title: concept?.title,
      domain: concept?.domain,
      passed: true,
      exerciseType: concept?.exercise?.type
    })
  }

  function handleFail() {
    recordAttempt(slug, false)
    trackExerciseAttempt({
      slug,
      title: concept?.title,
      domain: concept?.domain,
      passed: false,
      exerciseType: concept?.exercise?.type
    })
  }

  function handleConfidence(level) {
    setConfidence(slug, level)
  }

  return (
    <>
    <SEO {...getConceptMeta(concept)} />
    <motion.div
      key={slug}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="max-w-7xl mx-auto px-4 py-6 space-y-0"
    >
      {/* Roadmap Banner */}
      {activeRoadmap && currentPhase && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl"
        >
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-xl bg-surface-900 flex items-center justify-center text-2xl shadow-inner border border-surface-700">
               {activeRoadmap.icon}
             </div>
             <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-0.5">Following Roadmap</p>
               <p className="text-sm font-bold text-white">
                 {activeRoadmap.title} <span className="text-gray-400 mx-1">•</span> 
                 <span className="text-gray-400 font-normal">Phase {activeRoadmap.phases.indexOf(currentPhase) + 1} of {activeRoadmap.phases.length}</span>
               </p>
             </div>
          </div>
          <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-start border-t sm:border-t-0 border-surface-700 pt-3 sm:pt-0">
             <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Path Progress</p>
                <div className="flex items-center gap-2">
                   <div className="w-20 h-1.5 bg-black/40 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${roadmapProgress.percentage}%` }} />
                   </div>
                   <span className="text-xs font-bold text-gray-300">{roadmapProgress.percentage}%</span>
                </div>
             </div>
             <Link 
               to={`/roadmaps/${activeRoadmap.slug}`}
               className="px-4 py-2 bg-surface-900 text-gray-100 text-xs font-black rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg"
             >
               View Path
             </Link>
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════ */}
      <header className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-1.5 min-w-0 text-sm overflow-hidden">
          <Link
            to="/browse"
            className="text-gray-400 hover:text-gray-300 transition-colors flex items-center gap-1 shrink-0 font-medium"
          >
            ← Back
          </Link>
          <span className="text-gray-600 select-none shrink-0">|</span>
          <span className={`font-semibold shrink-0 ${accent.text}`}>{domain}</span>
          <span className="text-gray-600 select-none text-xs shrink-0">›</span>
          <span className="text-gray-400 truncate">{category}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded border font-medium ${DIFF_STYLE[difficulty]}`}>
            {difficulty}
          </span>
          <ShareMenu concept={concept} accent={accent} targetRef={onScreenCardRef} />
        </div>
      </header>

      {/* ══════════════════════════════════════════
          ON-SCREEN CAPTURABLE CONCEPT CARD & LIVE VISUALIZATION
      ══════════════════════════════════════════ */}
      <div
        id="concept-screen-card"
        ref={onScreenCardRef}
        className="rounded-xl border border-surface-600 bg-surface-800 p-5 sm:p-7 shadow-xl mb-8 space-y-6"
      >
        {/* Top bar with Domain, Category, Difficulty, Title & Branding */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-surface-700">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-gray-400 font-mono mb-1.5">
              <span className={`font-semibold ${accent.text}`}>{domain}</span>
              <span>›</span>
              <span className="text-gray-300">{category}</span>
              <span className={`px-1.5 py-0.2 rounded border text-[10px] font-medium ${DIFF_STYLE[difficulty]}`}>
                {difficulty}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{title}</h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            <span className="text-gray-300 font-semibold">learnblazinglyfast.tech</span>
          </div>
        </div>

        {/* ROW 1 — CARD  +  VISUALIZATION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── CARD ─────────────────────────────── */}
          <section className="space-y-6">

            {/* Intuition */}
            <div>
              <SectionLabel>Intuition</SectionLabel>
              <p className="text-gray-100 leading-relaxed">{card.intuition}</p>
            </div>

          {/* Analogy */}
          <blockquote className={`px-4 py-3 rounded-r bg-surface-700 border-l-[3px] ${accent.border} text-gray-300 text-sm leading-relaxed`}>
            {card.analogy}
          </blockquote>

          {/* Complexity grid */}
          <div className="grid grid-cols-2 gap-3">
            <ComplexityBadge label="Time"  value={card.time_complexity}  />
            <ComplexityBadge label="Space" value={card.space_complexity} />
          </div>

          {/* When to use */}
          <div>
            <SectionLabel>When to use</SectionLabel>
            <ul className="space-y-2 mt-2">
              {card.when_to_use.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-300 leading-snug">
                  <span className={`shrink-0 mt-[3px] ${accent.text}`}>›</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Gotchas */}
          <div>
            <SectionLabel>Gotchas</SectionLabel>
            <ul className="space-y-3 mt-2">
              {card.gotchas.map((g, i) => (
                <li key={i} className="flex gap-2 text-sm text-amber-200/80 leading-snug">
                  <span className="shrink-0 mt-[2px] text-amber-500 font-bold">›</span>
                  {g}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── VISUALIZATION ────────────────────── */}
        <section id="concept-visualization-section" data-visualization-container>
          <SectionLabel className="mb-3">
            Visualization
            <span className="ml-2 text-gray-400 font-normal normal-case tracking-normal font-mono text-xs">
              {visualization?.type}
            </span>
          </SectionLabel>

          {VizComp ? (
            <VizComp config={visualization?.config ?? {}} />
          ) : (
            <VizPlaceholder type={visualization?.type} />
          )}
        </section>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          ROW 2 — EXERCISE
      ══════════════════════════════════════════ */}
      <section className="rounded-xl border border-surface-600 bg-surface-800 overflow-hidden mb-8">
        {/* Exercise header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-surface-600 bg-surface-700">
          <SectionLabel className="mb-0">Exercise</SectionLabel>
          <ExerciseTypeBadge type={exercise?.type} />
        </div>

        <div className="px-3 py-3 sm:px-5 sm:py-5">
          {ExComp ? (
            <ExComp
              exercise={exercise}
              concept={concept}
              domain={domain}
              onPass={handlePass}
              onFail={handleFail}
              onConfidence={handleConfidence}
            />
          ) : (
            <p className="text-gray-400 text-sm font-mono">
              Exercise type <code className="text-gray-400">{exercise?.type}</code> — coming soon.
            </p>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          ROW 2.5 — PERSONAL NOTES
      ══════════════════════════════════════════ */}
      <PersonalNotes slug={slug} />

      {/* ══════════════════════════════════════════
          ROW 2.5 — PREREQUISITES
      ══════════════════════════════════════════ */}
      {prerequisites?.length > 0 && (
        <section className="mb-8">
          <SectionLabel className="mb-3">Prerequisites</SectionLabel>
          <div className="space-y-2">
            {prerequisites.map((prereqSlug) => (
              <PrerequisiteCard
                key={prereqSlug}
                slug={prereqSlug}
                getProgress={getProgress}
              />
            ))}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════
          ROW 3 — RELATED + TAGS
      ══════════════════════════════════════════ */}
      {(related?.length > 0 || tags?.length > 0) && (
        <section className="border-t border-surface-700 pt-6 space-y-4 pb-8">
          {related?.length > 0 && (
            <div>
              <SectionLabel className="mb-2">Related</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {related.map((relSlug) => (
                  <RelatedChip key={relSlug} slug={relSlug} currentDomain={domain} />
                ))}
              </div>
            </div>
          )}

          {tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full bg-surface-700 text-gray-400 font-mono border border-surface-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

    </motion.div>
    </>
  )
}

// ─── Share components ────────────────────────────────────────────────────────

function ShareMenu({ concept, accent, targetRef }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [isTikTokOpen, setIsTikTokOpen] = useState(false)
  const [exportPlatform, setExportPlatform] = useState('tiktok')
  const menuRef = useRef(null)

  const getTarget = () => targetRef?.current || (typeof document !== 'undefined' ? document.getElementById('concept-screen-card') : null)

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://learnblazinglyfast.tech/concept/${concept.slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    setOpen(false)
    toast.success('Link copied to clipboard!', { duration: 2500 })
    trackShare({ slug: concept.slug, title: concept.title, platform: 'clipboard', method: 'copy_url' })
  }

  const handleXShare = async () => {
    setSharing(true)
    // 1. Automatically copy the on-screen card image to clipboard
    const imageCopied = await copyShareCardImage(getTarget())
    if (imageCopied) {
      toast.success('Card image copied to clipboard. Ready to paste.', {
        duration: 4000,
      })
    }

    // 2. Short, punchy tweet copy without emojis
    const text = encodeURIComponent(`The Visual Guide to ${concept.title}\n\nhttps://learnblazinglyfast.tech/concept/${concept.slug}\nvia Learn Blazingly Fast`)
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank')
    trackShare({ slug: concept.slug, title: concept.title, platform: 'x_twitter', method: 'web_intent' })
    setSharing(false)
    setOpen(false)
  }

  const handleCopyImage = async () => {
    setSharing(true)
    const success = await copyShareCardImage(getTarget())
    if (success) {
      toast.success('Card screenshot copied to clipboard', { duration: 3000 })
      trackShare({ slug: concept.slug, title: concept.title, platform: 'clipboard', method: 'copy_image' })
    } else {
      const downloaded = await generateShareCard(getTarget(), concept.slug)
      if (downloaded) {
        toast('Card downloaded as image', { duration: 3000 })
        trackShare({ slug: concept.slug, title: concept.title, platform: 'download', method: 'fallback_download' })
      } else {
        toast.error('Failed to capture card screenshot')
      }
    }
    setSharing(false)
    setOpen(false)
  }

  const handleDownload = async () => {
    setSharing(true)
    const success = await generateShareCard(getTarget(), concept.slug)
    if (success) {
      toast.success('Downloaded card screenshot', { duration: 2500 })
      trackShare({ slug: concept.slug, title: concept.title, platform: 'download', method: 'png_download' })
    } else {
      toast.error('Failed to capture card screenshot')
    }
    setSharing(false)
    setOpen(false)
  }

  const handleNativeShare = async () => {
    setSharing(true)
    const shared = await shareCardViaNative(getTarget(), concept)
    if (shared) {
      trackShare({ slug: concept.slug, title: concept.title, platform: 'native', method: 'web_share_api' })
      setOpen(false)
    } else {
      handleXShare()
    }
    setSharing(false)
  }

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-700 hover:bg-surface-600 border border-surface-600 text-gray-200 transition-colors text-xs font-semibold"
      >
        <ShareIcon className="w-3.5 h-3.5" />
        <span>Share</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-60 bg-surface-800 border border-surface-600 rounded-xl shadow-2xl z-50 overflow-hidden py-1"
          >
            {canNativeShare && (
              <button
                onClick={handleNativeShare}
                disabled={sharing}
                className="w-full px-3.5 py-2 text-xs font-medium text-left text-gray-200 hover:bg-surface-700 transition-colors flex items-center gap-2.5"
              >
                <ShareIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-gray-200 font-semibold">Share Card...</span>
                  <span className="text-[10px] text-gray-400">Attach card image in apps</span>
                </div>
              </button>
            )}

            <button
              onClick={handleXShare}
              disabled={sharing}
              className={`w-full px-3.5 py-2.5 text-xs font-medium text-left text-gray-200 hover:bg-surface-700 transition-colors flex items-center gap-2.5 ${canNativeShare ? 'border-t border-surface-700' : ''}`}
            >
              <XIcon className="w-3.5 h-3.5 text-white shrink-0" />
              <div className="flex flex-col">
                <span className="font-semibold text-white">Share on X</span>
                <span className="text-[10px] text-gray-400">Short post + auto-copies card</span>
              </div>
            </button>

            <button
              onClick={() => {
                setOpen(false)
                setExportPlatform('tiktok')
                setIsTikTokOpen(true)
              }}
              disabled={sharing}
              className="w-full px-3.5 py-2.5 text-xs font-medium text-left text-gray-200 hover:bg-surface-700 transition-colors flex items-center gap-2.5 border-t border-surface-700"
            >
              <TikTokIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-white">Export to TikTok / Reels</span>
                  <span className="text-[9px] bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.2 rounded font-mono font-bold">4:5</span>
                </div>
                <span className="text-[10px] text-gray-400">Motion video clip or 7-slide carousel</span>
              </div>
            </button>

            <button
              onClick={() => {
                setOpen(false)
                setExportPlatform('pinterest')
                setIsTikTokOpen(true)
              }}
              disabled={sharing}
              className="w-full px-3.5 py-2.5 text-xs font-medium text-left text-gray-200 hover:bg-surface-700 transition-colors flex items-center gap-2.5 border-t border-surface-700"
            >
              <PinterestIcon className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-white">Export to Pinterest</span>
                  <span className="text-[9px] bg-rose-500/15 text-rose-400 border border-rose-500/30 px-1.5 py-0.2 rounded font-mono font-bold">Pin</span>
                </div>
                <span className="text-[10px] text-gray-400">Card, Carousel ZIP, or Video Pin</span>
              </div>
            </button>

            <button
              onClick={() => {
                setOpen(false)
                setExportPlatform('youtube')
                setIsTikTokOpen(true)
              }}
              disabled={sharing}
              className="w-full px-3.5 py-2.5 text-xs font-medium text-left text-gray-200 hover:bg-surface-700 transition-colors flex items-center gap-2.5 border-t border-surface-700"
            >
              <YouTubeIcon className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-white">Export to YouTube Shorts</span>
                  <span className="text-[9px] bg-red-500/15 text-red-400 border border-red-500/30 px-1.5 py-0.2 rounded font-mono font-bold">9:16</span>
                </div>
                <span className="text-[10px] text-gray-400">Vertical video alone with safe zones</span>
              </div>
            </button>

            <button
              onClick={handleCopyImage}
              disabled={sharing}
              className="w-full px-3.5 py-2 text-xs font-medium text-left text-gray-200 hover:bg-surface-700 transition-colors flex items-center gap-2.5 border-t border-surface-700"
            >
              <CopyImageIcon className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <div className="flex flex-col">
                <span className="text-gray-200">Copy Card Image</span>
                <span className="text-[10px] text-gray-400">Paste anywhere (Cmd+V)</span>
              </div>
            </button>

            <button
              onClick={handleDownload}
              disabled={sharing}
              className="w-full px-3.5 py-2 text-xs font-medium text-left text-gray-200 hover:bg-surface-700 transition-colors flex items-center gap-2.5 border-t border-surface-700"
            >
              <ImageIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-gray-200">Download Card (PNG)</span>
            </button>

            <button
              onClick={handleCopy}
              className="w-full px-3.5 py-2 text-xs font-medium text-left text-gray-200 hover:bg-surface-700 transition-colors flex items-center gap-2.5 border-t border-surface-700"
            >
              <LinkIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-gray-200">Copy Link</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute right-0 -top-8 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-lg z-50"
          >
            Link copied!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exporter Modal with initialPlatform support */}
      <TikTokCarouselModal
        isOpen={isTikTokOpen}
        onClose={() => setIsTikTokOpen(false)}
        concept={concept}
        accent={accent}
        initialPlatform={exportPlatform}
      />
    </div>
  )
}

function CopyImageIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  )
}

function ShareIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-5.368 3 3 0 000 5.368zm0 9.368a3 3 0 100-5.368 3 3 0 000 5.368z" />
    </svg>
  )
}

function XIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 1200 1227">
      <path d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z" />
    </svg>
  )
}

function TikTokIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
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

// ─── Personal Notes section ───────────────────────────────────────────────────

function PersonalNotes({ slug }) {
  const note = useNotesStore(s => s.getNote(slug))
  const saveNote = useNotesStore(s => s.saveNote)
  const deleteNote = useNotesStore(s => s.deleteNote)
  
  const [isEditing, setIsEditing] = useState(note !== '')
  const [text, setText] = useState(note)
  const [showConfirm, setShowConfirm] = useState(false)
  const [savedStatus, setSavedStatus] = useState(false)
  const saveTimeout = useRef(null)

  const handleTextChange = (e) => {
    const newText = e.target.value
    if (newText.length > 5000) return
    setText(newText)
    
    // Auto-save debounce
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => {
      saveNote(slug, newText)
      setSavedStatus(true)
      setTimeout(() => setSavedStatus(false), 1500)
    }, 500)
  }

  const handleDelete = () => {
    deleteNote(slug)
    setText('')
    setIsEditing(false)
    setShowConfirm(false)
  }

  if (!isEditing && !note) {
    return (
      <section className="mb-8">
        <button 
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors bg-surface-800 border border-surface-600 px-4 py-3 rounded-xl w-full"
        >
          <span className="text-lg">✎</span>
          <span>+ Add a personal note for this concept...</span>
        </button>
      </section>
    )
  }

  return (
    <section className="bg-surface-800 border border-surface-600 rounded-xl p-5 mb-8 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SectionLabel className="mb-0">My Notes</SectionLabel>
          {savedStatus && <span className="text-[10px] text-green-500 font-bold animate-pulse">SAVED ✓</span>}
        </div>
        <div className="flex items-center gap-3">
           {!isEditing && (
             <button onClick={() => setIsEditing(true)} className="text-xs text-blue-400 hover:underline">Edit</button>
           )}
           {showConfirm ? (
             <div className="flex items-center gap-2 text-[10px]">
               <span className="text-red-400 font-bold uppercase tracking-widest">Are you sure?</span>
               <button onClick={handleDelete} className="text-white hover:underline">Yes</button>
               <span className="text-gray-400">/</span>
               <button onClick={() => setShowConfirm(false)} className="text-gray-400 hover:underline">Cancel</button>
             </div>
           ) : (
             <button onClick={() => setShowConfirm(true)} className="text-gray-400 hover:text-red-400 opacity-60 hover:opacity-100 transition-all">
               <TrashIcon className="w-4 h-4" />
             </button>
           )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={handleTextChange}
            placeholder="Write anything — intuitions, gotchas, connections to other concepts..."
            className="w-full bg-surface-900 border border-surface-600 rounded-lg p-3 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-surface-500 min-h-[140px] resize-y"
          />
          <div className="flex justify-end">
             <span className={`text-[10px] font-mono ${text.length > 4500 ? 'text-orange-500' : 'text-gray-600'}`}>
               {text.length} / 5000
             </span>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-300 leading-relaxed line-clamp-2">
          {note}
        </div>
      )}
    </section>
  )
}

function TrashIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

// ─── Prerequisite card ──────────────────────────────────────────────────────────

function PrerequisiteCard({ slug, getProgress }) {
  const navigate    = useNavigate()
  const concept     = useConceptStore(s => s.getBySlug(slug))
  const completed   = !!getProgress(slug)?.exercise_passed
  const accent      = domainAccent(concept?.domain)

  return (
    <button
      onClick={() => navigate(`/concept/${slug}`)}
      className={`w-full text-left bg-surface-800 border border-surface-600 rounded-xl p-4 flex items-center gap-3 transition-colors ${accent.ring} ${concept ? '' : 'opacity-50 pointer-events-none'}`}
    >
      <div className="w-8 h-8 shrink-0 rounded-lg bg-surface-700 flex items-center justify-center">
        {completed ? (
          <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-100 truncate">
          {concept?.title ?? prettifySlug(slug)}
        </p>
        <p className={`text-xs font-medium mt-0.5 ${accent.text}`}>
          {concept?.domain ?? 'Unknown'}
        </p>
      </div>
      <span className="text-gray-400 text-xs shrink-0">
        {completed ? 'Completed' : 'Not done'}
      </span>
    </button>
  )
}

// ─── sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children, className = '' }) {
  return (
    <p className={`text-xs font-semibold text-gray-500 uppercase tracking-wider ${className}`}>
      {children}
    </p>
  )
}

function ComplexityBadge({ label, value }) {
  return (
    <div className="px-3 py-2.5 rounded-lg bg-surface-700 border border-surface-600">
      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`font-mono font-semibold text-sm leading-none ${complexityColor(value)}`}>
        {value}
      </p>
    </div>
  )
}

function ExerciseTypeBadge({ type }) {
  const labels = {
    'fill-in-the-blank': 'Fill in the blank',
    'spot-the-bug':      'Spot the bug',
    'trace-output':      'Trace the output',
    'order-steps':       'Order the steps',
    'complexity-quiz':   'Complexity quiz',
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded bg-surface-700 text-gray-400 font-medium border border-surface-600">
      {labels[type] ?? type}
    </span>
  )
}

function VizPlaceholder({ type }) {
  return (
    <div className="rounded-lg border border-surface-600 bg-surface-800 min-h-[400px] flex flex-col items-center justify-center gap-2">
      <span className="text-2xl opacity-30">⬡</span>
      <span className="text-gray-400 text-sm font-mono">{type}</span>
      <span className="text-gray-400 text-xs">visualization — coming in Step 3 expansion</span>
    </div>
  )
}

/**
 * Chip that resolves a related slug → title from the store.
 * Falls back to a prettified slug if the concept isn't loaded yet.
 */
function RelatedChip({ slug, currentDomain }) {
  const concept = useConceptStore(s => s.getBySlug(slug))
  const domain  = concept?.domain
  const title   = concept?.title ?? prettifySlug(slug)
  const accent  = domainAccent(domain ?? currentDomain)

  return (
    <Link
      to={`/concept/${slug}`}
      className={`
        flex items-center gap-1.5 px-3 py-1 rounded-full border border-surface-600 text-sm
        text-gray-300 transition-colors ${accent.ring}
        ${!concept ? 'opacity-50 pointer-events-none' : ''}
      `}
      title={concept ? undefined : 'Concept not loaded yet'}
    >
      {domain && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${domainDot(domain)}`}
        />
      )}
      {title}
    </Link>
  )
}

function domainDot(domain) {
  return {
    DSA:                  'bg-dsa-400',
    ML:                   'bg-ml-400',
    AI:                   'bg-ai-400',
    Frontend:             'bg-frontend-400',
    Backend:              'bg-backend-400',
    'Software Engineering': 'bg-se-400',
  }[domain] ?? 'bg-gray-400'
}

function prettifySlug(slug) {
  return slug
    .replace(/-\d+$/, '')          // strip trailing -01 etc.
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
