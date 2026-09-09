import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { generateShareCard } from '../utils/shareCard.js'
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
        <p className="text-gray-500 font-mono text-sm mb-3">/{slug}</p>
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
                 {activeRoadmap.title} <span className="text-gray-600 mx-1">•</span> 
                 <span className="text-gray-400 font-normal">Phase {activeRoadmap.phases.indexOf(currentPhase) + 1} of {activeRoadmap.phases.length}</span>
               </p>
             </div>
          </div>
          <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-start border-t sm:border-t-0 border-surface-700 pt-3 sm:pt-0">
             <div className="text-right">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">Path Progress</p>
                <div className="flex items-center gap-2">
                   <div className="w-20 h-1.5 bg-black/40 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${roadmapProgress.percentage}%` }} />
                   </div>
                   <span className="text-xs font-bold text-gray-300">{roadmapProgress.percentage}%</span>
                </div>
             </div>
             <Link 
               to={`/roadmaps/${activeRoadmap.slug}`}
               className="px-4 py-2 bg-white text-black text-xs font-black rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg"
             >
               View Path
             </Link>
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════ */}
      <header className="flex flex-wrap items-center gap-2 mb-5">
        <Link
          to="/browse"
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors flex items-center gap-1"
        >
          ← Back
        </Link>
        <span className="text-gray-700 select-none">|</span>
        <span className={`text-sm font-semibold ${accent.text}`}>{domain}</span>
        <span className="text-gray-700 select-none text-xs">›</span>
        <span className="text-sm text-gray-400">{category}</span>
        <span className={`ml-auto text-xs px-2 py-0.5 rounded border font-medium ${DIFF_STYLE[difficulty]}`}>
          {difficulty}
        </span>
        <ShareMenu concept={concept} accent={accent} />
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
            <span className="ml-2 text-gray-600 font-normal normal-case tracking-normal font-mono text-xs">
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
            <p className="text-gray-500 text-sm font-mono">
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
                  className="text-xs px-2 py-0.5 rounded-full bg-surface-700 text-gray-500 font-mono border border-surface-600"
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
    navigator.clipboard.writeText(`https://learnblazinglyfast.com/concept/${concept.slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    setOpen(false)
  }

  const handleXShare = () => {
    const text = encodeURIComponent(`Just learned ${concept.title} on @BlazinglyFast ✦\n${concept.card.intuition}\nlearnblazinglyfast.com/concept/${concept.slug}`)
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank')
    setOpen(false)
  }

  const handleDownload = async () => {
    setOpen(false)
    // Small delay to ensure hidden card is rendered if we were using conditional rendering
    // but here we render it permanently off-screen or briefly.
    // The prompt says: "Only render when share is triggered, remove after capture"
    // I'll use a local state for that.
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1 rounded bg-surface-700 hover:bg-surface-600 border border-surface-600 text-gray-300 transition-colors text-xs font-bold ml-2"
      >
        <ShareIcon className="w-3.5 h-3.5" />
        Share
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute right-0 mt-2 w-48 bg-surface-800 border border-surface-600 rounded-lg shadow-2xl z-50 overflow-hidden"
          >
            <button 
              onClick={() => generateShareCard(cardRef.current, concept.slug)}
              className="w-full px-4 py-2.5 text-sm text-left text-gray-200 hover:bg-surface-700 transition-colors flex items-center gap-2"
            >
              <ImageIcon className="w-4 h-4" /> Download Card
            </button>
            <button 
              onClick={handleCopy}
              className="w-full px-4 py-2.5 text-sm text-left text-gray-200 hover:bg-surface-700 transition-colors flex items-center gap-2"
            >
              <LinkIcon className="w-4 h-4" /> Copy Link
            </button>
            <button 
              onClick={handleXShare}
              className="w-full px-4 py-2.5 text-sm text-left text-gray-200 hover:bg-surface-700 transition-colors flex items-center gap-2"
            >
              <XIcon className="w-3.5 h-3.5" /> Share on X
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
            className="absolute right-0 -top-8 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-lg"
          >
            Link copied!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden Share Card for html2canvas */}
      <div style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
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
    Frontend: '#8b5cf6',
    Backend: '#10b981',
    'Software Engineering': '#f43f5e'
  }
  const accentColor = DOMAIN_COLORS[concept.domain] || '#6b7280'

  return (
    <div style={{
      width: '600px',
      height: '315px',
      background: 'linear-gradient(135deg, #0f1117 0%, #1a1f2e 100%)',
      padding: '40px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'relative'
    }}>
      {/* Decorative dots */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 4px)',
        gap: '4px',
        opacity: 0.2
      }}>
        {[...Array(25)].map((_, i) => (
          <div key={i} style={{ width: '4px', height: '4px', background: '#fff', borderRadius: '50%' }} />
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ color: '#6b7280', fontSize: '14px', fontWeight: 'bold', letterSpacing: '1px' }}>Learn Blazingly Fast</span>
        <span style={{ 
          background: `${accentColor}33`, 
          color: accentColor, 
          border: `1px solid ${accentColor}66`,
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 'bold',
          textTransform: 'uppercase'
        }}>
          {concept.domain}
        </span>
      </div>

      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '42px', fontWeight: '800', margin: '0 0 12px 0', lineHeight: 1.1 }}>{concept.title}</h1>
        <p style={{ color: '#9ca3af', fontSize: '18px', maxWidth: '80%', margin: '0 auto', lineHeight: 1.4 }}>{concept.card.intuition}</p>
        <div style={{ height: '3px', background: accentColor, width: '60px', margin: '24px auto 0' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '20px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ background: '#111827', border: '1px solid #374151', padding: '6px 10px', borderRadius: '6px' }}>
            <div style={{ color: '#6b7280', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>Time</div>
            <div style={{ color: '#10b981', fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace' }}>{concept.card.time_complexity}</div>
          </div>
          <div style={{ background: '#111827', border: '1px solid #374151', padding: '6px 10px', borderRadius: '6px' }}>
            <div style={{ color: '#6b7280', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>Space</div>
            <div style={{ color: '#3b82f6', fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace' }}>{concept.card.space_complexity}</div>
          </div>
        </div>
        <span style={{ color: '#6b7280', fontSize: '12px', fontWeight: 'medium' }}>learnblazinglyfast.com</span>
      </div>
    </div>
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
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors bg-surface-800/50 border border-surface-700/50 px-4 py-3 rounded-xl w-full"
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
               <span className="text-gray-600">/</span>
               <button onClick={() => setShowConfirm(false)} className="text-gray-500 hover:underline">Cancel</button>
             </div>
           ) : (
             <button onClick={() => setShowConfirm(true)} className="text-gray-500 hover:text-red-400 opacity-60 hover:opacity-100 transition-all">
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
            className="w-full bg-surface-900 border border-surface-700 rounded-lg p-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-surface-600 min-h-[140px] resize-y"
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
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
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
      <span className="text-gray-600 text-xs shrink-0">
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
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</p>
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
      <span className="text-gray-500 text-sm font-mono">{type}</span>
      <span className="text-gray-600 text-xs">visualization — coming in Step 3 expansion</span>
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
