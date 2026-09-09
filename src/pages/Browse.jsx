import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { useConceptStore }  from '../store/conceptStore.js'
import { useProgressStore } from '../store/progressStore.js'
import { searchConcepts } from '../utils/search.js'
import SEO from '../components/ui/SEO.jsx'
import { getPageMeta } from '../utils/seo'

// ─── constants ─────────────────────────────────────────────────────────────

const DIFF_ORDER = ['beginner', 'intermediate', 'advanced']

const DIFF_STYLE = {
  beginner:     'bg-green-900/30 text-green-400 border-green-900',
  intermediate: 'bg-yellow-900/30 text-yellow-400 border-yellow-900',
  advanced:     'bg-red-900/30 text-red-400 border-red-900',
}

// ─── Browse page ────────────────────────────────────────────────────────────

export default function Browse() {
  const [searchParams] = useSearchParams()
  const [query,      setQuery]      = useState(searchParams.get('q') ?? '')
  const [domain,     setDomain]     = useState('All')
  const [category,   setCategory]   = useState('All')
  const [difficulty, setDifficulty] = useState('All')

  const concepts = useConceptStore(s => s.concepts)
  const progress = useProgressStore(s => s.progress)

  // Derive category list from loaded concepts
  const categories = useMemo(() => {
    const set = new Set(concepts.map(c => c.category))
    return ['All', ...Array.from(set).sort()]
  }, [concepts])

  // Apply all filters
  const filtered = useMemo(() => {
    const searchResults = searchConcepts(query)
    return searchResults.filter(c => {
      if (domain !== 'All' && c.domain !== domain) return false
      if (category !== 'All' && c.category !== category) return false
      if (difficulty !== 'All' && c.difficulty !== difficulty) return false
      return true
    })
  }, [query, domain, category, difficulty])

  const totalShown = filtered.length
  const totalAll   = concepts.length

  function clearFilters() {
    setQuery(''); setDomain('All'); setCategory('All'); setDifficulty('All')
  }

  const hasActiveFilter = query || domain !== 'All' || category !== 'All' || difficulty !== 'All'

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <SEO {...getPageMeta('/browse')} />

      {/* ── Page title ── */}
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-bold">Browse</h1>
        <span className="text-sm text-gray-400">
          {hasActiveFilter ? `${totalShown} of ${totalAll}` : totalAll} concepts
        </span>
        {hasActiveFilter && (
          <button
            onClick={clearFilters}
            className="ml-auto text-xs text-gray-400 hover:text-gray-300 transition-colors"
          >
            Clear filters ×
          </button>
        )}
      </div>

      {/* ── Filter bar ── */}
      <div className="space-y-3">
        {/* Row 1: search + category */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by title or tag…"
              className="w-full bg-surface-800 border border-surface-600 rounded-lg px-3 py-2.5 pl-9 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-surface-400 transition-colors"
            />
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 text-sm leading-none"
              >
                ×
              </button>
            )}
          </div>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="bg-surface-800 border border-surface-600 rounded-lg px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-surface-400 transition-colors cursor-pointer shrink-0 max-w-[160px]"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Row 2: domain + difficulty pills (scrollable on mobile) */}
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          <PillGroup
            options={['All', 'DSA', 'ML', 'AI', 'Frontend', 'Backend', 'Software Engineering', 'Business Logic']}
            labels={{ 'Software Engineering': 'SE' }}
            value={domain}
            onChange={setDomain}
            concepts={concepts}
colorFn={v =>
  v === 'DSA'                  ? 'dsa'      :
  v === 'ML'                   ? 'ml'       :
  v === 'AI'                   ? 'ai'       :
  v === 'Frontend'             ? 'frontend' :
  v === 'Backend'              ? 'backend'  :
  v === 'Software Engineering' ? 'se'       :
  v === 'Business Logic'       ? 'bl'       : null
}
          />
          <PillGroup
            options={['All', 'beginner', 'intermediate', 'advanced']}
            labels={{ beginner: 'Beginner', intermediate: 'Mid', advanced: 'Advanced' }}
            value={difficulty}
            onChange={setDifficulty}
            colorFn={v => v === 'beginner' ? 'green' : v === 'intermediate' ? 'yellow' : v === 'advanced' ? 'red' : null}
          />
        </div>
      </div>

      {/* ── Grid ── */}
      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <EmptyState query={query} onClear={clearFilters} />
        ) : (
          <motion.div
            key={`${query}-${domain}-${category}-${difficulty}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            {filtered.map(concept => (
              <ConceptCard
                key={concept.slug}
                concept={concept}
                prog={progress[concept.slug] ?? {}}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── ConceptCard ────────────────────────────────────────────────────────────

function ConceptCard({ concept, prog }) {
  const { slug, title, domain, category, difficulty } = concept
  const passed  = prog.exercise_passed
  const viewed  = prog.viewed

  return (
    <Link
      to={`/concept/${slug}`}
      className="group relative flex flex-col gap-3 p-4 rounded-xl border border-surface-600 bg-surface-800 hover:border-surface-400 hover:bg-surface-700 hover:-translate-y-0.5 transition-all duration-150 cursor-pointer"
    >
      {/* Domain + status row */}
      <div className="flex items-center justify-between">
        <DomainBadge domain={domain} />
        <StatusDot passed={passed} viewed={viewed} />
      </div>

      {/* Title */}
      <div className="flex-1">
        <p className="font-semibold text-sm text-gray-100 leading-snug group-hover:text-white transition-colors">
          {title}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{category}</p>
      </div>

      {/* Difficulty pill */}
      <span className={`self-start text-xs px-2 py-0.5 rounded border font-medium ${DIFF_STYLE[difficulty]}`}>
        {difficulty}
      </span>
    </Link>
  )
}

// ─── small atoms ────────────────────────────────────────────────────────────

const DOMAIN_BADGE_STYLE = {
  DSA:                  'bg-dsa-600/20 text-dsa-400',
  ML:                   'bg-ml-500/20 text-ml-400',
  AI:                   'bg-ai-500/20 text-ai-400',
  Frontend:             'bg-frontend-500/20 text-frontend-400',
  Backend:              'bg-backend-500/20 text-backend-400',
  'Software Engineering': 'bg-se-500/20 text-se-400',
  'Business Logic':     'bg-blue-600/20 text-blue-400',
}

function DomainBadge({ domain }) {
  const style = DOMAIN_BADGE_STYLE[domain] ?? 'bg-gray-500/20 text-gray-400'
  const label = domain === 'Software Engineering' ? 'SE' : domain
  return (
    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${style}`}>
      {label}
    </span>
  )
}

function StatusDot({ passed, viewed }) {
  if (passed)      return <span className="text-green-400 text-sm leading-none" title="Exercise passed">✓</span>
  if (viewed)      return <span className="text-gray-400 text-base leading-none" title="Visited">•</span>
  return null
}

function PillGroup({ options, labels = {}, value, onChange, colorFn, concepts = [] }) {
  const getCompletedDomains = useProgressStore(s => s.getCompletedDomains)
  const completed = getCompletedDomains(concepts)

  return (
    <div className="flex rounded-lg border border-surface-600 overflow-hidden shrink-0">
      {options.map(opt => {
        const active = value === opt
        const color  = colorFn?.(opt)
        const isComplete = completed.includes(opt)
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors border-r last:border-r-0 border-surface-600 whitespace-nowrap flex items-center gap-1.5
              ${active
                ? color === 'dsa'      ? 'bg-dsa-600 text-white'
                : color === 'ml'       ? 'bg-ml-500 text-white'
                : color === 'ai'       ? 'bg-ai-600 text-white'
                : color === 'frontend' ? 'bg-frontend-600 text-white'
                : color === 'backend'  ? 'bg-backend-600 text-white'
                : color === 'se'       ? 'bg-se-600 text-white'
                : color === 'bl'       ? 'bg-blue-600 text-white'
                : color === 'green'    ? 'bg-green-800 text-green-300'
                : color === 'yellow'   ? 'bg-yellow-900 text-yellow-300'
                : color === 'red'      ? 'bg-red-900 text-red-300'
                : 'bg-surface-600 text-white'
                : 'bg-surface-800 text-gray-400 hover:text-gray-200 hover:bg-surface-700'
              }`}
          >
            {labels[opt] ?? opt}
            {isComplete && <span className="text-yellow-400">✦</span>}
          </button>
        )
      })}
    </div>
  )
}

function EmptyState({ query, onClear }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-24 gap-3"
    >
      <span className="text-3xl opacity-20">⬡</span>
      <p className="text-gray-400 font-medium">No concepts match your filters.</p>
      {query && (
        <p className="text-gray-400 text-sm">No results for "{query}".</p>
      )}
      <button
        onClick={onClear}
        className="mt-1 text-sm text-gray-400 hover:underline"
      >
        Clear all filters
      </button>
    </motion.div>
  )
}

function SearchIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="6.5" cy="6.5" r="4.5" />
      <path d="M10 10l3 3" strokeLinecap="round" />
    </svg>
  )
}
