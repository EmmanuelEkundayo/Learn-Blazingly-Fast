import { useState, useMemo } from 'react'
import { Link } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { searchProjects } from '../utils/search.js'
import SEO from '../components/ui/SEO.jsx'
import { getPageMeta } from '../utils/seo'

const CATEGORIES = [
  'All', 
  'Frontend', 
  'Backend', 
  'AI-ML', 
  'Full-stack', 
  'Web Scraping', 
  'Distributed Systems'
]

const CAT_COLORS = {
  'Frontend':           'bg-frontend-500/20 text-frontend-400 border-frontend-500/50',
  'Backend':            'bg-backend-500/20 text-backend-400 border-backend-500/50',
  'AI-ML':              'bg-ml-500/20 text-ml-400 border-ml-500/50',
  'Full-stack':         'bg-dsa-500/20 text-dsa-400 border-dsa-500/50',
  'Web Scraping':       'bg-se-500/20 text-se-400 border-se-500/50',
  'Distributed Systems': 'bg-orange-500/20 text-orange-400 border-orange-500/50',
}

const CAT_ACCENTS = {
  'Frontend':           'text-frontend-400',
  'Backend':            'text-backend-400',
  'AI-ML':              'text-ml-400',
  'Full-stack':         'text-dsa-400',
  'Web Scraping':       'text-se-400',
  'Distributed Systems': 'text-orange-400',
}

export default function Projects() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')

  const filtered = useMemo(() => {
    const searchResults = searchProjects(query)
    if (category === 'All') return searchResults
    return searchResults.filter(p => p.category === category)
  }, [category, query])

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <SEO {...getPageMeta('/projects')} />
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-white">Projects</h1>
          <p className="text-gray-400">Apply your knowledge with end-to-end coding guides.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 min-w-[300px]">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search projects..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 pl-10 text-sm focus:outline-none focus:border-surface-400 transition-colors"
            />
          </div>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-surface-400 transition-colors cursor-pointer"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filtered.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          No projects found matching your criteria.
        </div>
      )}
    </div>
  )
}

function ProjectCard({ project }) {
  const colorClass = CAT_COLORS[project.category] || 'bg-gray-500/20 text-gray-400 border-gray-500/50'
  const accentClass = CAT_ACCENTS[project.category] || 'text-gray-400'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Link
        to={`/project/${project.slug}`}
        className="group flex flex-col h-full bg-surface-800 border border-surface-600 rounded-2xl p-5 hover:border-surface-400 transition-all duration-200 hover:-translate-y-1"
      >
        <div className="flex items-start justify-between mb-4">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${colorClass}`}>
            {project.category}
          </span>
          <span className="text-xs text-gray-500">{project.estimated_time}</span>
        </div>

        <h3 className="text-lg font-bold text-gray-100 group-hover:text-white mb-2 transition-colors">
          {project.title}
        </h3>
        
        <p className="text-sm text-gray-400 line-clamp-2 mb-4 flex-1">
          {project.overview.what}
        </p>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {project.stack.slice(0, 3).map(tech => (
            <span key={tech} className="text-[10px] bg-surface-700 text-gray-300 px-2 py-0.5 rounded">
              {tech}
            </span>
          ))}
          {project.stack.length > 3 && (
            <span className="text-[10px] bg-surface-700 text-gray-300 px-2 py-0.5 rounded">
              +{project.stack.length - 3}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-surface-700/50">
          <span className={`text-xs font-medium capitalize ${
            project.difficulty === 'beginner' ? 'text-green-400' :
            project.difficulty === 'intermediate' ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            {project.difficulty}
          </span>
          <span className={`text-xs font-semibold ${accentClass} group-hover:underline`}>
            View Guide →
          </span>
        </div>
      </Link>
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
