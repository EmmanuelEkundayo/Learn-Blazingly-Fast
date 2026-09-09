import { useState, useMemo, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import SEO from '../components/ui/SEO.jsx'
import { getPageMeta } from '../utils/seo'
import { useConceptStore }  from '../store/conceptStore.js'
import { useProjectStore }  from '../store/projectStore.js'
import { useProgressStore } from '../store/progressStore.js'
import { generateCertificate } from '../utils/generateCertificate.js'
import { searchAll } from '../utils/search.js'
import { getDailyConcept, isDailyHidden, hideDailyForToday } from '../utils/dailyConcept.js'
import { getLearnerName, setLearnerName } from '../utils/learnerName.js'
import NameModal from '../components/ui/NameModal.jsx'
import { FlameIcon } from '../components/ui/Icons.jsx'
import mathTricks from '../data/mathTricks/index.js'

// ─── domain chip styles (shared across search dropdown + concept rows) ───────
const DOMAIN_CHIP = {
  DSA:                  'bg-dsa-600/20 text-dsa-400',
  ML:                   'bg-ml-500/20 text-ml-400',
  AI:                   'bg-ai-500/20 text-ai-400',
  Frontend:             'bg-frontend-500/20 text-frontend-400',
  Backend:              'bg-backend-500/20 text-backend-400',
  'Software Engineering': 'bg-se-500/20 text-se-400',
  'Business Logic':     'bg-blue-600/20 text-blue-400',
}

// ─── Home ───────────────────────────────────────────────────────────────────

export default function Home() {
  const concepts = useConceptStore(s => s.concepts)
  const projects = useProjectStore(s => s.projects)
  const progress = useProgressStore(s => s.progress)

  // Progress totals
  const total     = concepts.length
  const completed = concepts.filter(c => progress[c.slug]?.exercise_passed).length
  const viewed    = concepts.filter(c => progress[c.slug]?.viewed && !progress[c.slug]?.exercise_passed).length

  // "Continue" — viewed but not passed (up to 4)
  const continueConcepts = useMemo(
    () => concepts.filter(c => progress[c.slug]?.viewed && !progress[c.slug]?.exercise_passed).slice(0, 4),
    [concepts, progress]
  )

  // "Start Here" — one beginner per domain (priority order), fill to 4
  const startHereConcepts = useMemo(() => {
    const DOMAINS = ['DSA', 'ML', 'AI', 'Frontend', 'Backend', 'Software Engineering']
    const picked  = new Set()
    const result  = []
    // Prefer one representative per domain
    for (const d of DOMAINS) {
      const c = concepts.find(c => c.domain === d && c.difficulty === 'beginner' && !progress[c.slug]?.viewed)
      if (c && !picked.has(c.slug)) { picked.add(c.slug); result.push(c) }
    }
    // Fill remainder up to 4 from any remaining beginner concepts
    for (const c of concepts) {
      if (result.length >= 4) break
      if (c.difficulty === 'beginner' && !progress[c.slug]?.viewed && !picked.has(c.slug)) {
        result.push(c)
      }
    }
    return result.slice(0, 4)
  }, [concepts, progress])

  // "Featured Projects" — 3 beginners
  const featuredProjects = useMemo(() => {
    return projects.filter(p => p.difficulty === 'beginner').slice(0, 3)
  }, [projects])

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 sm:py-16 space-y-12 sm:space-y-14">
      <SEO {...getPageMeta('/')} />

      {/* ── Logo + Search ── */}
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-dsa-500">Learn</span>
            <span className="text-ml-500"> Blazingly Fast</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">200+ CS & ML concepts. Under 5 min each.</p>
        </div>

        <ConceptSearch />

        <StreakBadge streak={useProgressStore(s => s.streak)} />
      </div>

      <DailyConceptCard 
        concepts={concepts} 
        viewedSlugs={useProgressStore(s => Object.keys(s.progress))} 
        progress={progress}
      />

      {/* ── Progress ── */}
      {total > 0 && (
        <ProgressSection total={total} completed={completed} viewed={viewed} />
      )}

      {/* ── Continue ── */}
      {continueConcepts.length > 0 && (
        <ConceptSection
          title="Continue"
          subtitle="Visited but not yet exercised"
          concepts={continueConcepts}
          progress={progress}
        />
      )}

      {/* ── Start Here ── */}
      {startHereConcepts.length > 0 && (
        <ConceptSection
          title="Start Here"
          subtitle="One beginner pick per domain — concepts you haven't opened yet"
          concepts={startHereConcepts}
          progress={progress}
        />
      )}

      {/* ── Math Tricks feature ── */}
      <MathTricksSection />

      {/* ── Testimonials Strip ── */}
      <TestimonialsStrip />

      {/* ── Featured Projects ── */}
      {featuredProjects.length > 0 && (
        <ProjectSection
          title="Featured Projects"
          subtitle="Real-world applications to level up your skills"
          projects={featuredProjects}
        />
      )}

      {/* ── All clear state ── */}
      {completed === total && total > 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">
          All {total} concepts completed. Check out the{' '}
          <Link to="/browse" className="text-gray-300 hover:underline">full catalog</Link>{' '}
          or{' '}
          <Link to="/review" className="text-gray-300 hover:underline">review weak spots</Link>.
        </div>
      )}

      {/* ── Achievements ── */}
      <AchievementsSection concepts={concepts} />

    </div>
  )
}

// ─── Search ─────────────────────────────────────────────────────────────────

function ConceptSearch() {
  const [query,    setQuery]    = useState('')
  const [open,     setOpen]     = useState(false)
  const [selected, setSelected] = useState(-1)
  const navigate  = useNavigate()
  const wrapRef   = useRef(null)
  const inputRef  = useRef(null)

  const results = useMemo(() => {
    return searchAll(query)
  }, [query])

  const flatResults = [
    ...results.concepts.map(c => ({ ...c, type: 'concept' })),
    ...results.projects.map(p => ({ ...p, type: 'project' }))
  ]

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleKeyDown(e) {
    if (!open || flatResults.length === 0) {
      if (e.key === 'Enter' && query.trim()) {
        navigate(`/browse?q=${encodeURIComponent(query.trim())}`)
        setOpen(false)
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(s => (s + 1) % flatResults.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(s => (s <= 0 ? flatResults.length - 1 : s - 1))
    } else if (e.key === 'Enter') {
      if (selected >= 0 && flatResults[selected]) {
        const item = flatResults[selected]
        navigate(item.type === 'concept' ? `/concept/${item.slug}` : `/project/${item.slug}`)
        setQuery(''); setOpen(false)
      } else {
        navigate(`/browse?q=${encodeURIComponent(query.trim())}`)
        setOpen(false)
      }
    } else if (e.key === 'Escape') {
      setOpen(false); setSelected(-1)
    }
  }

  return (
    <div ref={wrapRef} className="relative w-full max-w-lg px-0">
      {/* Input */}
      <div className="relative">
        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setSelected(-1) }}
          onFocus={() => { if (query) setOpen(true) }}
          onKeyDown={handleKeyDown}
          placeholder="Search concepts, tags, categories…"
          className="w-full bg-surface-800 border border-surface-600 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-dsa-500/60 focus:ring-1 focus:ring-dsa-500/20 transition-colors"
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus() }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 px-1 transition-colors"
            tabIndex={-1}
          >
            ×
          </button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {open && flatResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full mt-1.5 w-full bg-surface-800 border border-surface-600 rounded-xl overflow-hidden shadow-2xl z-50 p-1"
          >
            {results.concepts.length > 0 && (
              <div className="mb-1">
                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Concepts</div>
                {results.concepts.map((c, i) => (
                  <SearchRow 
                    key={c.slug}
                    item={c}
                    type="concept"
                    isActive={selected === i}
                    onClick={() => { navigate(`/concept/${c.slug}`); setQuery(''); setOpen(false); }}
                  />
                ))}
              </div>
            )}

            {results.projects.length > 0 && (
              <div className="mt-1 border-t border-surface-700/50 pt-1">
                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Projects</div>
                {results.projects.map((p, i) => (
                  <SearchRow 
                    key={p.slug}
                    item={p}
                    type="project"
                    isActive={selected === (results.concepts.length + i)}
                    onClick={() => { navigate(`/project/${p.slug}`); setQuery(''); setOpen(false); }}
                  />
                ))}
              </div>
            )}

            <button
              onMouseDown={() => { navigate(`/browse?q=${encodeURIComponent(query.trim())}`); setOpen(false) }}
              className="w-full px-3 py-2 text-xs text-blue-400 hover:text-blue-300 border-t border-surface-700/50 text-left transition-colors font-medium"
            >
              Browse all results for "{query}" →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard hint */}
      {!open && !query && (
        <p className="text-center text-xs text-gray-400 mt-2">
          Press Enter to browse all  ·  ↑↓ to navigate results
        </p>
      )}
    </div>
  )
}

function SearchRow({ item, type, isActive, onClick }) {
  const isConcept = type === 'concept'
  return (
    <button
      onMouseDown={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors
        ${isActive ? 'bg-surface-700 text-white' : 'text-gray-300 hover:bg-surface-700/50 hover:text-white'}`}
    >
      <div className={`shrink-0 w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold
        ${isConcept ? 'bg-blue-600/20 text-blue-400' : 'bg-purple-600/20 text-purple-400'}`}>
        {isConcept ? 'C' : 'P'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{item.title}</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tight
            ${isConcept ? (DOMAIN_CHIP[item.domain] || 'bg-gray-500/20') : 'bg-purple-600/10 text-purple-400'}`}>
            {isConcept ? (item.domain === 'Software Engineering' ? 'SE' : item.domain) : item.category}
          </span>
        </div>
      </div>
      <span className="text-[10px] text-gray-400 shrink-0">{isConcept ? item.category : item.estimated_time}</span>
    </button>
  )
}

// ─── Progress section ────────────────────────────────────────────────────────

function ProgressSection({ total, completed, viewed }) {
  const pct = total > 0 ? completed / total : 0

  return (
    <div className="flex items-center gap-4 sm:gap-6 p-4 sm:p-5 rounded-xl bg-surface-800 border border-surface-600">
      <ProgressRing completed={completed} total={total} pct={pct} />

      <div className="flex-1 space-y-2 min-w-0">
        <p className="text-sm font-semibold text-gray-300">
          {completed} of {total} completed
        </p>
        <div className="space-y-1">
          <LegendRow color="bg-green-500" label={`${completed} passed`} />
          <LegendRow color="bg-blue-500"  label={`${viewed} in progress`} />
          <LegendRow color="bg-surface-500" label={`${total - completed - viewed} untouched`} />
        </div>
        <Link
          to="/browse"
          className="inline-block text-xs text-gray-400 hover:text-gray-300 transition-colors mt-1"
        >
          View all →
        </Link>
      </div>
    </div>
  )
}

function ProgressRing({ completed, total, pct }) {
  const r    = 36
  const circ = 2 * Math.PI * r
  const dash = circ * pct

  return (
    <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0">
      {/* Track */}
      <circle cx="44" cy="44" r={r} fill="none" stroke="#26262e" strokeWidth="7" />
      {/* Fill */}
      <circle
        cx="44" cy="44" r={r}
        fill="none"
        stroke="#16a34a"
        strokeWidth="7"
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset={0}
        transform="rotate(-90 44 44)"
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
      {/* Center: count */}
      <text x="44" y="40" textAnchor="middle" fill="white" fontSize="18" fontWeight="700" fontFamily="Inter,sans-serif">
        {completed}
      </text>
      <text x="44" y="54" textAnchor="middle" fill="#6b7280" fontSize="10" fontFamily="Inter,sans-serif">
        / {total}
      </text>
    </svg>
  )
}

function LegendRow({ color, label }) {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {label}
    </div>
  )
}

// ─── Concept section ─────────────────────────────────────────────────────────

function ConceptSection({ title, subtitle, concepts, progress }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-gray-300">{title}</h2>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {concepts.map(c => {
          const prog = progress[c.slug] ?? {}
          return (
            <Link
              key={c.slug}
              to={`/concept/${c.slug}`}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border border-surface-600 bg-surface-800 hover:border-surface-400 hover:bg-surface-700 transition-all duration-100 group"
            >
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded shrink-0 ${DOMAIN_CHIP[c.domain] ?? 'bg-gray-500/20 text-gray-400'}`}>
                {c.domain === 'Software Engineering' ? 'SE' : c.domain}
              </span>
              <span className="flex-1 text-sm text-gray-300 truncate group-hover:text-white transition-colors">
                {c.title}
              </span>
              {prog.exercise_passed ? (
                <span className="text-green-400 text-sm shrink-0">✓</span>
              ) : prog.viewed ? (
                <span className="text-gray-400 text-base shrink-0 leading-none">•</span>
              ) : null}
            </Link>
          )
        })}
      </div>
    </section>
  )
}

// ─── icon ────────────────────────────────────────────────────────────────────

function SearchIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="6.5" cy="6.5" r="4.5" />
      <path d="M10 10l3 3" strokeLinecap="round" />
    </svg>
  )
}

// ─── Project section ─────────────────────────────────────────────────────────

function ProjectSection({ title, subtitle, projects }) {
  const CAT_COLORS = {
    'Frontend':           'bg-frontend-500/20 text-frontend-400 border-frontend-500/50',
    'Backend':            'bg-backend-500/20 text-backend-400 border-backend-500/50',
    'AI':              'bg-ml-500/20 text-ml-400 border-ml-500/50',
    'Full-stack':         'bg-dsa-500/20 text-dsa-400 border-dsa-500/50',
    'Web Scraping':       'bg-se-500/20 text-se-400 border-se-500/50',
    'Distributed Systems': 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-300">{title}</h2>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {projects.map(p => (
          <Link
            key={p.id}
            to={`/project/${p.slug}`}
            className="flex flex-col sm:flex-row sm:items-center gap-4 px-4 py-4 rounded-xl border border-surface-600 bg-surface-800 hover:border-surface-400 hover:bg-surface-700 transition-all duration-100 group"
          >
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded border ${CAT_COLORS[p.category] || ''}`}>
                  {p.category}
                </span>
                <h3 className="text-sm font-bold text-gray-100 group-hover:text-white transition-colors">{p.title}</h3>
              </div>
              <p className="text-xs text-gray-400 line-clamp-1">{p.overview.what}</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
               <div className="flex gap-1">
                 {p.stack.slice(0, 2).map(s => (
                   <span key={s} className="text-[10px] bg-surface-600 px-1.5 py-0.5 rounded text-gray-300">{s}</span>
                 ))}
               </div>
               <span className="text-xs font-bold text-violet-400 group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </Link>
        ))}
      </div>
      <Link to="/projects" className="inline-block text-xs text-gray-400 hover:text-gray-300 transition-colors">
        View all projects catalog →
      </Link>
    </section>
  )
}

// ─── Testimonials Strip ──────────────────────────────────────────────────────

function TestimonialsStrip() {
  const [reviews, setReviews] = useState([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReviews() {
      try {
        const res = await fetch('/api/v1/reviews')
        if (!res.ok) throw new Error()
        const data = await res.json()
        setReviews(data)
      } catch {
        console.error('Failed to fetch reviews')
      } finally {
        setLoading(false)
      }
    }
    fetchReviews()
  }, [])

  useEffect(() => {
    if (reviews.length <= 3) return
    const timer = setInterval(() => {
      setIndex(prev => (prev + 3 >= reviews.length ? 0 : prev + 3))
    }, 6000)
    return () => clearInterval(timer)
  }, [reviews])

  if (loading || reviews.length === 0) return null

  const visible = reviews.slice(index, index + 3)

  return (
    <section className="space-y-6 py-4">
      <div className="text-center">
        <h2 className="text-lg font-bold text-white">What developers are saying</h2>
        <p className="text-xs text-gray-400">Real feedback from our community</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AnimatePresence mode="wait">
          {visible.map((r, i) => (
            <motion.div
              key={r.submitted_at + i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <TestimonialCard review={r} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {reviews.length > 3 && (
        <div className="flex justify-center gap-1.5">
          {Array.from({ length: Math.ceil(reviews.length / 3) }).map((_, i) => (
            <div 
              key={i} 
              className={`h-1 rounded-full transition-all duration-300 ${i === Math.floor(index / 3) ? 'w-4 bg-blue-500' : 'w-1 bg-surface-600'}`} 
            />
          ))}
        </div>
      )}
    </section>
  )
}

function TestimonialCard({ review }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = review.review_text.length > 200
  const text = !expanded && isLong ? review.review_text.slice(0, 200) + '...' : review.review_text

  return (
    <div className="bg-surface-800 border border-surface-700 p-5 rounded-xl h-full flex flex-col space-y-4 shadow-xl">
      <div className="flex gap-0.5 text-yellow-500">
        {[...Array(5)].map((_, i) => (
          <span key={i} className="text-xs">★</span>
        ))}
      </div>

      <p className="text-sm text-gray-300 italic leading-relaxed flex-1">
        "{text}"
        {!expanded && isLong && (
          <button 
            onClick={() => setExpanded(true)}
            className="text-blue-400 hover:text-blue-300 ml-1 text-xs not-italic font-medium"
          >
            read more
          </button>
        )}
      </p>

      <div className="pt-4 border-t border-surface-700/50">
        <div className="font-bold text-sm text-white">{review.first_name}</div>
        <div className="text-[11px] text-gray-400 uppercase tracking-widest">{review.occupation}</div>
        <div className="mt-2 text-[10px] text-blue-400 font-medium">
          Explored {review.concepts_seen_count} concepts
        </div>
      </div>
    </div>
  )
}

// ─── Achievements section ────────────────────────────────────────────────────

function AchievementsSection({ concepts }) {
  const getCompletedDomains = useProgressStore(s => s.getCompletedDomains)
  const completionDates = useProgressStore(s => s.completion_dates)
  const [userName, setUserName] = useState(() => getLearnerName())
  
  const completed = getCompletedDomains(concepts)
  const [modalOpen, setModalOpen] = useState(false)
  const [pendingDomain, setPendingDomain] = useState(null)

  if (completed.length === 0) return null

  const handleDownload = (domain) => {
    if (!userName) {
      setPendingDomain(domain)
      setModalOpen(true)
      return
    }
    
    const count = concepts.filter(c => c.domain === domain).length
    const date = completionDates[domain] || Date.now()
    generateCertificate(domain, userName, count, date)
  }

  const handleNameSubmit = (name) => {
    setLearnerName(name)
    setUserName(name)
    setModalOpen(false)
    if (pendingDomain) {
      const count = concepts.filter(c => c.domain === pendingDomain).length
      const date = completionDates[pendingDomain] || Date.now()
      generateCertificate(pendingDomain, name, count, date)
      setPendingDomain(null)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-300">Your Achievements</h2>
          <p className="text-xs text-gray-400">Mastery certificates for completed domains</p>
        </div>
        <Link to="/certificates" className="text-xs text-blue-400 hover:text-blue-300">
          View All →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {completed.map(domain => {
          const count = concepts.filter(c => c.domain === domain).length
          const date = completionDates[domain] || Date.now()
          return (
            <div key={domain} className="bg-surface-800 border border-surface-700 p-4 rounded-xl flex flex-col gap-3 shadow-lg">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400 text-lg">✦</span>
                  <div className="font-bold text-white text-sm">{domain}</div>
                </div>
                <div className="text-[10px] text-gray-400 font-medium">
                  {new Date(date).toLocaleDateString()}
                </div>
              </div>
              <p className="text-xs text-gray-400">Mastered all {count} concepts</p>
              <button
                onClick={() => handleDownload(domain)}
                className="mt-1 w-full py-2 bg-surface-700 hover:bg-surface-600 text-white rounded-lg text-xs font-bold transition-all border border-surface-600"
              >
                Download Certificate
              </button>
            </div>
          )
        })}
      </div>

      <NameModal 
        isOpen={modalOpen} 
        onSubmit={handleNameSubmit} 
        onCancel={() => { setModalOpen(false); setPendingDomain(null) }} 
      />
    </section>
  )
}

// ─── Daily Concept Card ──────────────────────────────────────────────────────

function DailyConceptCard({ concepts, viewedSlugs, progress }) {
  const [hidden, setHidden] = useState(isDailyHidden())
  const concept = useMemo(() => getDailyConcept(concepts, viewedSlugs), [concepts, viewedSlugs])
  const navigate = useNavigate()

  if (!concept || hidden) {
    if (hidden) {
      return (
        <div className="text-center py-4 border border-surface-700/50 rounded-xl bg-surface-800/30">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">See tomorrow's concept after midnight ✺</p>
        </div>
      )
    }
    return null
  }

  const prog = progress[concept.slug] ?? {}
  const isViewed = prog.viewed
  const DOMAIN_ACCENT = {
    DSA: 'border-dsa-500',
    ML: 'border-ml-500',
    AI: 'border-ai-500',
    Frontend: 'border-frontend-500',
    Backend: 'border-backend-500',
    'Software Engineering': 'border-se-500',
  }

  const handleSkip = () => {
    hideDailyForToday()
    setHidden(true)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-surface-800 border border-surface-700 rounded-2xl p-6 shadow-2xl border-l-[6px] ${DOMAIN_ACCENT[concept.domain] || 'border-gray-500'}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black bg-gray-700 text-gray-300 px-2 py-0.5 rounded tracking-tighter">DAILY CONCEPT</span>
            <span className="text-[10px] text-gray-400 font-bold">{new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 text-left">
            {concept.title}
            {isViewed && <span className="text-green-500 text-lg">✓</span>}
          </h2>
          <p className="text-gray-400 text-sm italic text-left">"{concept.card.intuition}"</p>
        </div>
        <button 
          onClick={handleSkip}
          className="text-gray-400 hover:text-gray-400 text-xs font-bold uppercase tracking-widest transition-colors shrink-0 ml-4"
        >
          Skip today
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6 text-[10px] font-bold uppercase tracking-widest">
        <span className={`px-2 py-0.5 rounded border ${DOMAIN_CHIP[concept.domain]}`}>{concept.domain}</span>
        <span className="bg-surface-700 text-gray-400 px-2 py-0.5 rounded border border-surface-600 font-mono tracking-tight">{concept.category}</span>
        <span className={`px-2 py-0.5 rounded border ${DIFF_STYLE_INNER[concept.difficulty]}`}>{concept.difficulty}</span>
      </div>

      <button
        onClick={() => navigate(`/concept/${concept.slug}`)}
        className={`w-full py-3 rounded-xl font-bold transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2
          ${isViewed ? 'bg-surface-700 text-gray-300 border border-surface-600 hover:bg-surface-600' : 'bg-white text-black hover:bg-gray-200'}`}
      >
        {isViewed ? 'Review again →' : 'Start Learning →'}
      </button>
    </motion.div>
  )
}

const DIFF_STYLE_INNER = {
  beginner: 'bg-green-900/10 text-green-400 border-green-800/30',
  intermediate: 'bg-yellow-900/10 text-yellow-400 border-yellow-800/30',
  advanced: 'bg-red-900/10 text-red-400 border-red-800/30',
}

// ─── Math Tricks section ─────────────────────────────────────────────────────

const MATH_CAT_BADGE = {
  'Number Theory':           'bg-amber-500/15 text-amber-400',
  'Geometry & Fractals':     'bg-violet-500/15 text-violet-400',
  'Probability & Statistics':'bg-blue-500/15 text-blue-400',
  'Linear Algebra':          'bg-emerald-500/15 text-emerald-400',
  'Calculus':                'bg-rose-500/15 text-rose-400',
}

function MathTricksSection() {
  const featured = [
    mathTricks.find(t => t.id === 'mandelbrot-set'),
    mathTricks.find(t => t.id === 'fourier-series'),
    mathTricks.find(t => t.id === 'birthday-paradox'),
  ].filter(Boolean)

  if (featured.length === 0) return null

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-300">Explore Mathematics</h2>
        <p className="text-xs text-gray-400">Beautiful math, brought to life with Python</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {featured.map(trick => (
          <Link
            key={trick.id}
            to={`/math/${trick.slug}`}
            className="flex flex-col gap-2 px-4 py-3 rounded-xl border border-surface-600 bg-surface-800 hover:border-surface-400 hover:bg-surface-700 transition-all duration-100 group"
          >
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-bold uppercase tracking-tight px-1.5 py-0.5 rounded ${MATH_CAT_BADGE[trick.category] ?? 'bg-gray-500/10 text-gray-400'}`}>
                {trick.category.split(' ')[0]}
              </span>
              <span className="text-[9px] text-gray-400">{trick.visualization_type}</span>
            </div>
            <span className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors">
              {trick.title}
            </span>
            <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{trick.tagline}</p>
          </Link>
        ))}
      </div>
      <Link to="/math" className="inline-block text-xs text-gray-400 hover:text-gray-300 transition-colors">
        Explore all {mathTricks.length} math tricks →
      </Link>
    </section>
  )
}

// ─── Streak Badge ────────────────────────────────────────────────────────────

function StreakBadge({ streak }) {
  if (!streak || streak.count <= 1) return null
  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex items-center gap-2 bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/20 px-3 py-1 rounded-full"
    >
      <span className="flex items-center justify-center"><FlameIcon className="w-4 h-4 text-orange-400" /></span>
      <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">
        {streak.count} day streak
      </span>
    </motion.div>
  )
}
