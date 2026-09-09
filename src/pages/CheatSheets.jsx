import { useState, useMemo } from 'react'
import { Link } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import cheatsheets from '../data/cheatsheets/index.js'
import { SheetIcon } from '../components/ui/Icons.jsx'
import SEO from '../components/ui/SEO.jsx'
import { getPageMeta } from '../utils/seo'

const accentMap = {
  orange:  { bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  text: 'text-orange-400',  btn: 'bg-orange-500 hover:bg-orange-400',  glow: 'shadow-orange-500/20' },
  blue:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    text: 'text-blue-400',    btn: 'bg-blue-500 hover:bg-blue-400',    glow: 'shadow-blue-500/20' },
  yellow:  { bg: 'bg-yellow-500/10',  border: 'border-yellow-500/20',  text: 'text-yellow-400',  btn: 'bg-yellow-500 hover:bg-yellow-400',  glow: 'shadow-yellow-500/20' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', btn: 'bg-emerald-500 hover:bg-emerald-400', glow: 'shadow-emerald-500/20' },
  violet:  { bg: 'bg-violet-500/10',  border: 'border-violet-500/20',  text: 'text-violet-400',  btn: 'bg-violet-500 hover:bg-violet-400',  glow: 'shadow-violet-500/20' },
  rose:    { bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    text: 'text-rose-400',    btn: 'bg-rose-500 hover:bg-rose-400',    glow: 'shadow-rose-500/20' },
  cyan:    { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    text: 'text-cyan-400',    btn: 'bg-cyan-500 hover:bg-cyan-400',    glow: 'shadow-cyan-500/20' },
  indigo:  { bg: 'bg-indigo-500/10',  border: 'border-indigo-500/20',  text: 'text-indigo-400',  btn: 'bg-indigo-500 hover:bg-indigo-400',  glow: 'shadow-indigo-500/20' },
}

const CATEGORIES = ['All', 'Frontend', 'Backend', 'DevOps', 'Languages', 'Fundamentals', 'Interview']

export default function CheatSheets() {
  const [activeCategory, setActiveCategory] = useState('All')

  const filteredSheets = useMemo(() => {
    if (activeCategory === 'All') return cheatsheets
    return cheatsheets.filter(s => s.category === activeCategory)
  }, [activeCategory])

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-16">
      <SEO {...getPageMeta('/cheatsheets')} />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <div className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-widest uppercase mb-4">
            Reference Library
          </div>
          <h1 className="text-5xl font-extrabold text-white mb-4 tracking-tight">
            Learn <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Blazingly</span> Fast
          </h1>
          <p className="text-gray-400 text-xl max-w-2xl mx-auto font-medium">
            28+ high-density syntax cheat sheets for the modern developer.
          </p>
        </motion.div>

        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                activeCategory === cat
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        <motion.div 
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredSheets.map((sheet, i) => {
              const a = accentMap[sheet.color] ?? accentMap.blue
              return (
                <motion.div
                  key={sheet.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
                >
                  <Link
                    to={`/cheatsheets/${sheet.id}`}
                    className={`group relative flex flex-col h-full rounded-2xl border ${a.border} ${a.bg} p-6 hover:translate-y-[-4px] active:translate-y-0 transition-all duration-300 hover:shadow-2xl ${a.glow}`}
                  >
                    {/* Category Tag */}
                    <div className="absolute top-4 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${a.text}`}>
                        {sheet.category}
                      </span>
                    </div>

                    {/* Icon + Title */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`p-2 rounded-xl ${a.bg} border ${a.border}`}>
                        <SheetIcon id={sheet.id} className="w-8 h-8" />
                      </div>
                      <h2 className="text-xl font-bold text-white group-hover:text-white transition-colors">
                        {sheet.title}
                      </h2>
                    </div>

                    {/* Description */}
                    <p className="text-gray-400 text-sm flex-1 leading-relaxed mb-6 font-medium">
                      {sheet.description}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-800/40">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                          Quick Reference
                        </span>
                        <span className="text-xs text-gray-400 font-semibold">
                          {sheet.sections.length} Sections
                        </span>
                      </div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${a.bg} border ${a.border} group-hover:bg-blue-600 group-hover:border-blue-500 transition-all duration-300`}>
                        <svg className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>

        {/* Empty State */}
        {filteredSheets.length === 0 && (
          <div className="text-center py-20">
            <h3 className="text-2xl font-bold text-gray-500">No cheat sheets found in this category.</h3>
            <button 
              onClick={() => setActiveCategory('All')}
              className="mt-4 text-blue-400 hover:text-blue-300 font-semibold"
            >
              Back to all reference sheets
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
