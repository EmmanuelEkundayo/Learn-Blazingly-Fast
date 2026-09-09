import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { generateShareCard, copyShareCardImage, shareCardViaNative } from '../utils/shareCard.js'
import { toast } from 'react-hot-toast'
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
  beginner:     'bg-green-900/30 text-green-400 border-green-800',
  intermediate: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
  advanced:     'bg-red-900/30 text-red-400 border-red-800',
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

  useEffect(() => {
    if (slug) {
      markViewed(slug)
      incrementInteractions()
    }
  }, [slug, markViewed, incrementInteractions])

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
  }

  function handleFail() {
    recordAttempt(slug, false)
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
          <ShareMenu concept={concept} accent={accent} />
        </div>
      </header>

      <h1 className="text-2xl font-bold mb-7">{title}</h1>

      {/* ══════════════════════════════════════════
          ROW 1 — CARD  +  VISUALIZATION
      ══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

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
                  <span className="shrink-0 mt-[2px] text-amber-500">⚠</span>
                  {g}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── VISUALIZATION ────────────────────── */}
        <section>
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

      {/* ══════════════════════════════════════════
          ROW 2 — EXERCISE
      ══════════════════════════════════════════ */}
      <section className="rounded-xl border border-surface-600 bg-surface-800 overflow-hidden mb-8">
        {/* Exercise header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-surface-600 bg-surface-700/50">
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

function ShareMenu({ concept, accent }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sharing, setSharing] = useState(false)
  const menuRef = useRef(null)
  const cardRef = useRef(null)

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
  }

  const handleXShare = async () => {
    setSharing(true)
    // 1. Automatically copy the high-res card image to clipboard
    const imageCopied = await copyShareCardImage(cardRef.current)
    if (imageCopied) {
      toast.success('📸 Card image copied! Paste (Cmd+V) directly into your tweet.', {
        duration: 4500,
        icon: '⚡️',
      })
    }

    // 2. Short, punchy tweet copy without @BlazinglyFast tag and without full paragraph
    const text = encodeURIComponent(`Mastering ${concept.title} ⚡️\n\nhttps://learnblazinglyfast.tech/concept/${concept.slug}\nvia Learn Blazingly Fast`)
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank')
    setSharing(false)
    setOpen(false)
  }

  const handleCopyImage = async () => {
    setSharing(true)
    const success = await copyShareCardImage(cardRef.current)
    if (success) {
      toast.success('📸 Card image copied to clipboard! Ready to paste.', { duration: 3500 })
    } else {
      await generateShareCard(cardRef.current, concept.slug)
      toast('Card downloaded as image!', { icon: '💾', duration: 3000 })
    }
    setSharing(false)
    setOpen(false)
  }

  const handleDownload = async () => {
    setSharing(true)
    await generateShareCard(cardRef.current, concept.slug)
    toast.success('Downloaded share card!', { duration: 2500 })
    setSharing(false)
    setOpen(false)
  }

  const handleNativeShare = async () => {
    setSharing(true)
    const shared = await shareCardViaNative(cardRef.current, concept)
    if (shared) {
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
            className="absolute right-0 mt-2 w-56 bg-surface-800 border border-surface-600 rounded-xl shadow-2xl z-50 overflow-hidden py-1"
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
              className={`w-full px-3.5 py-2.5 text-xs font-medium text-left text-gray-200 hover:bg-surface-700 transition-colors flex items-center gap-2.5 ${canNativeShare ? 'border-t border-surface-700/60' : ''}`}
            >
              <XIcon className="w-3.5 h-3.5 text-white shrink-0" />
              <div className="flex flex-col">
                <span className="font-semibold text-white">Share on X</span>
                <span className="text-[10px] text-gray-400">Short post + auto-copies card</span>
              </div>
            </button>

            <button
              onClick={handleCopyImage}
              disabled={sharing}
              className="w-full px-3.5 py-2 text-xs font-medium text-left text-gray-200 hover:bg-surface-700 transition-colors flex items-center gap-2.5 border-t border-surface-700/60"
            >
              <CopyImageIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-gray-200">Copy Card Image</span>
                <span className="text-[10px] text-gray-400">Paste anywhere (Cmd+V)</span>
              </div>
            </button>

            <button
              onClick={handleDownload}
              disabled={sharing}
              className="w-full px-3.5 py-2 text-xs font-medium text-left text-gray-200 hover:bg-surface-700 transition-colors flex items-center gap-2.5 border-t border-surface-700/60"
            >
              <ImageIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-gray-200">Download Card (PNG)</span>
            </button>

            <button
              onClick={handleCopy}
              className="w-full px-3.5 py-2 text-xs font-medium text-left text-gray-200 hover:bg-surface-700 transition-colors flex items-center gap-2.5 border-t border-surface-700/60"
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

      {/* Hidden Share Card for html2canvas rendering */}
      <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}>
        <div ref={cardRef}>
          <HiddenShareCard concept={concept} />
        </div>
      </div>
    </div>
  )
}

function HiddenShareCard({ concept }) {
  const DOMAIN_COLORS = {
    DSA: '#3b82f6',
    ML: '#f59e0b',
    AI: '#06b6d4',
    Frontend: '#8b5cf6',
    Backend: '#10b981',
    'Software Engineering': '#f43f5e',
  }
  const accentColor = DOMAIN_COLORS[concept.domain] || '#3b82f6'

  return (
    <div style={{
      width: '600px',
      height: '315px',
      background: 'linear-gradient(145deg, #0b0d13 0%, #131722 55%, #181d2a 100%)',
      padding: '26px 36px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      color: '#ffffff',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      position: 'relative',
      overflow: 'hidden',
      border: '1px solid #2a3142',
    }}>
      {/* Decorative background glow */}
      <div style={{
        position: 'absolute',
        top: '-40px',
        right: '-40px',
        width: '200px',
        height: '200px',
        background: `radial-gradient(circle, ${accentColor}33 0%, transparent 70%)`,
        borderRadius: '50%',
        pointerEvents: 'none',
      }} />

      {/* Header bar: Brand + Domain */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>⚡️</span>
          <span style={{ color: '#e5e7eb', fontSize: '13px', fontWeight: '800', letterSpacing: '1.2px', textTransform: 'uppercase' }}>
            Learn Blazingly Fast
          </span>
        </div>
        <span style={{
          background: `${accentColor}22`,
          color: accentColor,
          border: `1px solid ${accentColor}66`,
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: '700',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}>
          {concept.domain}
        </span>
      </div>

      {/* Main Content: Title + Intuition */}
      <div style={{ textAlign: 'left', margin: '8px 0' }}>
        <h1 style={{
          fontSize: concept.title.length > 28 ? '26px' : '32px',
          fontWeight: '800',
          margin: '0 0 8px 0',
          lineHeight: '1.15',
          color: '#ffffff',
          letterSpacing: '-0.5px',
        }}>
          {concept.title}
        </h1>
        <p style={{
          color: '#9ca3af',
          fontSize: '13px',
          margin: 0,
          lineHeight: '1.45',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        }}>
          {(concept.card?.intuition || 'Master software engineering and system architecture with interactive visualizations.').slice(0, 130)}
          {(concept.card?.intuition?.length || 0) > 130 ? '…' : ''}
        </p>
      </div>

      {/* Footer bar: Complexity + Domain URL */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '12px',
        borderTop: '1px solid #1f2937',
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {concept.card?.time_complexity && (
            <div style={{ background: '#111827', border: '1px solid #374151', padding: '4px 10px', borderRadius: '6px', display: 'flex', gap: '6px', alignItems: 'center', height: '26px', whiteSpace: 'nowrap' }}>
              <span style={{ color: '#6b7280', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', lineHeight: '1', whiteSpace: 'nowrap' }}>Time</span>
              <span style={{ color: '#10b981', fontSize: '11px', fontWeight: 'bold', fontFamily: 'monospace', lineHeight: '1', whiteSpace: 'nowrap' }}>
                {concept.card.time_complexity}
              </span>
            </div>
          )}
          {concept.card?.space_complexity && (
            <div style={{ background: '#111827', border: '1px solid #374151', padding: '4px 10px', borderRadius: '6px', display: 'flex', gap: '6px', alignItems: 'center', height: '26px', whiteSpace: 'nowrap' }}>
              <span style={{ color: '#6b7280', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', lineHeight: '1', whiteSpace: 'nowrap' }}>Space</span>
              <span style={{ color: '#3b82f6', fontSize: '11px', fontWeight: 'bold', fontFamily: 'monospace', lineHeight: '1', whiteSpace: 'nowrap' }}>
                {concept.card.space_complexity}
              </span>
            </div>
          )}
        </div>
        <span style={{ color: '#9ca3af', fontSize: '12px', fontWeight: '700', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
          learnblazinglyfast.tech
        </span>
      </div>
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
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors bg-surface-800/50 border border-surface-700/50 px-4 py-3 rounded-xl w-full"
        >
          <span className="text-lg">✎</span>
          <span>+ Add a personal note for this concept...</span>
        </button>
      </section>
    )
  }

  return (
    <section className="bg-surface-800 border border-surface-700 rounded-xl p-5 mb-8 space-y-4">
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
            className="w-full bg-surface-900 border border-surface-700 rounded-lg p-3 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-surface-600 min-h-[140px] resize-y"
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
      className={`w-full text-left bg-surface-800 border border-surface-700 rounded-xl p-4 flex items-center gap-3 transition-colors ${accent.ring} ${concept ? '' : 'opacity-50 pointer-events-none'}`}
    >
      <div className="w-8 h-8 shrink-0 rounded-lg bg-surface-700/60 flex items-center justify-center">
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
    <span className="text-xs px-2 py-0.5 rounded bg-surface-600 text-gray-400 font-medium border border-surface-500">
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
        flex items-center gap-1.5 px-3 py-1 rounded-full border border-surface-500 text-sm
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
