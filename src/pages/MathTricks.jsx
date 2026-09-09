import { useState, useMemo } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import mathTricks from '../data/mathTricks/index.js'
import SEO from '../components/ui/SEO.jsx'
import { getPageMeta } from '../utils/seo'

// ─── Category / type accent colours ──────────────────────────────────────────
const CAT_COLORS = {
  'Number Theory':           { badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',      accent: 'border-amber-500/40',     glow: 'hover:shadow-amber-500/10'  },
  'Geometry & Fractals':     { badge: 'bg-violet-500/15 text-violet-400 border-violet-500/30',   accent: 'border-violet-500/40',    glow: 'hover:shadow-violet-500/10' },
  'Probability & Statistics':{ badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',         accent: 'border-blue-500/40',      glow: 'hover:shadow-blue-500/10'   },
  'Linear Algebra':          { badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',accent: 'border-emerald-500/40',   glow: 'hover:shadow-emerald-500/10'},
  'Calculus':                { badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30',         accent: 'border-rose-500/40',      glow: 'hover:shadow-rose-500/10'   },
}

const TYPE_BADGE = {
  animated:    'bg-amber-500/10 text-amber-300 border-amber-500/20',
  interactive: 'bg-teal-500/10 text-teal-300 border-teal-500/20',
  static:      'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

const DIFF_BADGE = {
  beginner:     'bg-green-500/10 text-green-400',
  intermediate: 'bg-yellow-500/10 text-yellow-400',
  advanced:     'bg-red-500/10 text-red-400',
}

const CATEGORIES = ['All', 'Number Theory', 'Geometry & Fractals', 'Probability & Statistics', 'Linear Algebra', 'Calculus']
const TYPES = ['All', 'Animated', 'Interactive', 'Static']

const TYPE_ICONS = {
  animated:    '▶',
  interactive: '◎',
  static:      '◆',
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MathTricks() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeType,     setActiveType]     = useState('All')

  const filtered = useMemo(() => {
    return mathTricks.filter(t => {
      const catOk  = activeCategory === 'All' || t.category === activeCategory
      const typeOk = activeType === 'All' || t.visualization_type === activeType.toLowerCase()
      return catOk && typeOk
    })
  }, [activeCategory, activeType])

  const counts = useMemo(() => ({
    animated:    mathTricks.filter(t => t.visualization_type === 'animated').length,
    interactive: mathTricks.filter(t => t.visualization_type === 'interactive').length,
    static:      mathTricks.filter(t => t.visualization_type === 'static').length,
  }), [])

  return (
    <div className="min-h-screen bg-[#0d0d0f] px-4 py-12 sm:py-16">
      <SEO {...getPageMeta('/math')} />
      <div className="max-w-7xl mx-auto">

        {/* ── Hero ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold tracking-widest uppercase mb-5">
            <SparkleIcon className="w-3 h-3" />
            Interactive Mathematics
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Math Tricks
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Beautiful mathematics. Brought to life with Python.
          </p>

          {/* Stats row */}
          <div className="flex justify-center gap-6 mt-6 text-sm text-gray-400">
            <span><span className="text-white font-semibold">{mathTricks.length}</span> tricks</span>
            <span><span className="text-amber-400 font-semibold">{counts.animated}</span> animated</span>
            <span><span className="text-teal-400 font-semibold">{counts.interactive}</span> interactive</span>
            <span><span className="text-gray-400 font-semibold">{counts.static}</span> static</span>
          </div>
        </motion.div>

        {/* ── Filters ── */}
        <div className="space-y-3 mb-10">
          {/* Category filters */}
          <div className="flex flex-wrap justify-center gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 border ${
                  activeCategory === cat
                    ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-500/20'
                    : 'bg-surface-800 border-surface-700 text-gray-400 hover:border-surface-600 hover:text-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          {/* Type filters */}
          <div className="flex justify-center gap-2">
            {TYPES.map(type => (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 border ${
                  activeType === type
                    ? 'bg-surface-600 border-surface-500 text-white'
                    : 'bg-surface-800 border-surface-700 text-gray-500 hover:text-gray-300 hover:border-surface-600'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* ── Grid ── */}
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {filtered.map((trick, i) => (
            <TrickCard key={trick.id} trick={trick} index={i} />
          ))}
        </motion.div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400 text-sm">
            No tricks match the selected filters.
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function TrickCard({ trick, index }) {
  const cat = CAT_COLORS[trick.category] ?? CAT_COLORS['Calculus']

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
    >
      <Link
        to={`/math/${trick.slug}`}
        className={`flex flex-col h-full bg-surface-800 border ${cat.accent} rounded-2xl p-4
                    hover:bg-surface-700 transition-all duration-150 shadow-lg ${cat.glow} hover:shadow-xl
                    hover:-translate-y-0.5 group`}
      >
        {/* Top badges */}
        <div className="flex items-center justify-between mb-3">
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${cat.badge}`}>
            {trick.category.replace('Probability & Statistics', 'Probability').replace('Geometry & Fractals', 'Geometry')}
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${TYPE_BADGE[trick.visualization_type]}`}>
            {TYPE_ICONS[trick.visualization_type]} {trick.visualization_type}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-white group-hover:text-white/90 transition-colors mb-1.5 leading-snug">
          {trick.title}
        </h3>

        {/* Tagline */}
        <p className="text-xs text-gray-400 line-clamp-2 flex-1 leading-relaxed mb-3">
          {trick.tagline}
        </p>

        {/* Wow factor preview */}
        <p className="text-[10px] text-gray-400 italic line-clamp-2 mb-3 leading-relaxed border-l-2 border-surface-600 pl-2">
          {trick.wow_factor}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-surface-700/50">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${DIFF_BADGE[trick.difficulty]}`}>
            {trick.difficulty}
          </span>
          <span className="text-gray-400 text-xs group-hover:text-gray-400 transition-colors">Explore →</span>
        </div>
      </Link>
    </motion.div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function SparkleIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5L8 1z"/>
    </svg>
  )
}
