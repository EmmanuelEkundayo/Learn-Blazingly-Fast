import { useState, useMemo } from 'react'
import { Link } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import roadmaps from '../data/roadmaps/index.js'
import { useProgressStore } from '../store/progressStore.js'
import { RoadmapIcon, ClockIcon, BookIcon } from '../components/ui/Icons.jsx'
import SEO from '../components/ui/SEO.jsx'
import { getPageMeta } from '../utils/seo'

export default function Roadmaps() {
  const [filter, setFilter] = useState('All')
  const getRoadmapProgress = useProgressStore(s => s.getRoadmapProgress)

  const categories = ['All', 'Career', 'Frontend', 'Backend', 'ML', 'System Design']

  const filtered = useMemo(() => {
    if (filter === 'All') return roadmaps
    return roadmaps.filter(r => r.category === filter)
  }, [filter])

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-12">
      <SEO {...getPageMeta('/roadmaps')} />
      <header className="space-y-4">
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Curated Learning Roadmaps</h1>
        <p className="text-gray-400 max-w-2xl">
          Structured paths to master specific domains. Each roadmap is broken down into logical phases 
          to take you from foundational concepts to advanced mastery.
        </p>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              filter === cat 
                ? 'bg-white text-black shadow-lg' 
                : 'bg-surface-800 text-gray-500 hover:text-gray-300 hover:bg-surface-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filtered.map(roadmap => (
            <RoadmapCard key={roadmap.id} roadmap={roadmap} progress={getRoadmapProgress(roadmap)} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

function RoadmapCard({ roadmap, progress }) {
  const COLORS = {
    blue:    'border-blue-500/30 hover:border-blue-500 bg-blue-500/5',
    violet:  'border-violet-500/30 hover:border-violet-500 bg-violet-500/5',
    emerald: 'border-emerald-500/30 hover:border-emerald-500 bg-emerald-500/5',
    yellow:  'border-yellow-500/30 hover:border-yellow-500 bg-yellow-500/5',
    rose:    'border-rose-500/30 hover:border-rose-500 bg-rose-500/5',
    indigo:  'border-indigo-500/30 hover:border-indigo-500 bg-indigo-500/5',
    cyan:    'border-cyan-500/30 hover:border-cyan-500 bg-cyan-500/5',
    orange:  'border-orange-500/30 hover:border-orange-500 bg-orange-500/5',
  }

  const ACCENTS = {
    blue:    'bg-blue-500',
    violet:  'bg-violet-500',
    emerald: 'bg-emerald-500',
    yellow:  'bg-yellow-500',
    rose:    'bg-rose-500',
    indigo:  'bg-indigo-500',
    cyan:    'bg-cyan-500',
    orange:  'bg-orange-500',
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Link 
        to={`/roadmaps/${roadmap.slug}`}
        className={`group block h-full p-6 rounded-2xl border transition-all duration-300 ${COLORS[roadmap.color] || 'border-surface-700 bg-surface-800'}`}
      >
        <div className="flex justify-between items-start mb-4">
          <RoadmapIcon id={roadmap.id} className="w-10 h-10 text-white" />
          <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-black/40 text-gray-400 group-hover:text-white transition-colors`}>
            {roadmap.category}
          </div>
        </div>

        <div className="space-y-2 mb-6">
          <h3 className="text-xl font-bold text-white group-hover:translate-x-1 transition-transform inline-flex items-center gap-2">
            {roadmap.title}
            <span className="text-gray-600 font-normal">→</span>
          </h3>
          <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">
            {roadmap.description}
          </p>
        </div>

        <div className="mt-auto space-y-4">
          <div className="flex items-center gap-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><ClockIcon className="w-3 h-3" /> {roadmap.estimated_weeks} weeks</span>
            <span className="flex items-center gap-1.5"><BookIcon className="w-3 h-3" /> {roadmap.phases.reduce((acc, p) => acc + p.concepts.length, 0)} concepts</span>
          </div>

          {/* Progress Mini Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
              <span className={progress.percentage > 0 ? 'text-white' : 'text-gray-600'}>
                {progress.percentage}% COMPLETE
              </span>
              <span className="text-gray-600">{progress.completed}/{progress.total}</span>
            </div>
            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress.percentage}%` }}
                className={`h-full ${ACCENTS[roadmap.color] || 'bg-blue-500'}`}
              />
            </div>
          </div>

          <div className="pt-2">
            <div className={`w-full py-2.5 rounded-xl font-black text-xs text-center border transition-all ${
              progress.percentage > 0 
                ? 'bg-transparent text-white border-white/20 hover:bg-white/5' 
                : 'bg-white text-black border-transparent hover:scale-[1.02] shadow-xl shadow-black/20'
            }`}>
              {progress.percentage > 0 ? 'Continue Roadmap →' : 'Start Roadmap →'}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
