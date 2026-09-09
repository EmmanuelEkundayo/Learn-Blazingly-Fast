import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { searchAllFiltered, highlightMatches } from '../../utils/search.js'

function HighlightedText({ text, query }) {
  const parts = highlightMatches(text, query)
  return (
    <>
      {parts.map((part, i) =>
        part.highlight
          ? <mark key={i} className="bg-blue-500/30 text-blue-200 rounded px-0.5">{part.text}</mark>
          : <span key={i}>{part.text}</span>
      )}
    </>
  )
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'concept', label: 'Concepts' },
  { key: 'project', label: 'Projects' },
  { key: 'cheatsheet', label: 'Cheat Sheets' },
]

export default function SearchPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [activeType, setActiveType] = useState('all')
  const navigate = useNavigate()
  const inputRef = useRef(null)

  const filters = activeType === 'all' ? {} : { types: [activeType] }
  const results = searchAllFiltered(query, filters)
  const flatResults = [
    ...results.concepts.map(c => ({ ...c, type: 'concept' })),
    ...results.projects.map(p => ({ ...p, type: 'project' })),
    ...(results.cheatsheets || []).map(cs => ({ ...cs, type: 'cheatsheet' })),
  ]

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setActiveType('all')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query, activeType])

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(s => (s + 1) % Math.max(flatResults.length, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(s => (s <= 0 ? Math.max(flatResults.length - 1, 0) : s - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (flatResults[selectedIndex]) {
        const item = flatResults[selectedIndex]
        if (item.type === 'concept') navigate(`/concept/${item.slug}`)
        else if (item.type === 'project') navigate(`/project/${item.slug}`)
        else if (item.type === 'cheatsheet') navigate(`/cheatsheets/${item.sheetId}`)
        onClose()
      }
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[10000] flex items-start justify-center sm:pt-[12vh] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: -12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: -12 }}
          transition={{ duration: 0.15 }}
          className="bg-surface-900 w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl overflow-hidden border-b sm:border border-surface-700 sm:mx-4 h-[100dvh] sm:h-auto flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          <div className="relative border-b border-surface-700 flex items-center">
            <SearchIcon className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search concepts, projects, anything..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent py-5 px-4 pl-12 sm:pl-14 text-base sm:text-lg text-white outline-none placeholder-gray-500"
            />
            <button
              onClick={onClose}
              className="shrink-0 mr-4 sm:mr-6 text-gray-500 hover:text-gray-300 transition-colors"
              aria-label="Close"
            >
              <span className="hidden sm:inline">
                <kbd className="px-1.5 py-0.5 rounded bg-surface-800 border border-surface-700 text-[10px]">ESC</kbd>
              </span>
              <span className="sm:hidden text-xl leading-none">×</span>
            </button>
          </div>

          <div className="flex-1 sm:flex-none sm:max-h-[60vh] overflow-y-auto">
            {query.trim() && (
              <div className="flex gap-2 px-4 pt-3 pb-2 overflow-x-auto">
                {FILTERS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setActiveType(f.key)}
                    className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors
                      ${activeType === f.key ? 'bg-blue-600 text-white' : 'bg-surface-800 text-gray-400 hover:text-gray-300'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            <div className="p-2">
              {query.trim() === '' ? (
                <div className="py-10 text-center space-y-2">
                  <p className="text-gray-400 font-medium">Type to search the platform</p>
                  <p className="text-xs text-gray-600">Concepts · Projects · Cheat Sheets</p>
                </div>
              ) : flatResults.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <p className="text-gray-500">No results for &quot;{query}&quot;</p>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>Try a different keyword or check the filter</p>
                    <p>Search tips: try &quot;recursion&quot;, &quot;binary tree&quot;, &quot;react&quot;</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-2">
                  {results.concepts.length > 0 && (
                    <div>
                      <h4 className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-600">Concepts</h4>
                      {results.concepts.map((c, i) => (
                        <ResultRow
                          key={c.slug}
                          item={c}
                          type="concept"
                          query={query}
                          isSelected={selectedIndex === i}
                          onSelect={() => { navigate(`/concept/${c.slug}`); onClose(); }}
                        />
                      ))}
                    </div>
                  )}

                  {results.projects.length > 0 && (
                    <div>
                      <h4 className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-600 border-t border-surface-800 mt-2 pt-4">Projects</h4>
                      {results.projects.map((p, i) => (
                        <ResultRow
                          key={p.slug}
                          item={p}
                          type="project"
                          query={query}
                          isSelected={selectedIndex === (results.concepts.length + i)}
                          onSelect={() => { navigate(`/project/${p.slug}`); onClose(); }}
                        />
                      ))}
                    </div>
                  )}

                  {results.cheatsheets && results.cheatsheets.length > 0 && (
                    <div>
                      <h4 className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-600 border-t border-surface-800 mt-2 pt-4">Cheat Sheets</h4>
                      {results.cheatsheets.map((cs, i) => (
                        <ResultRow
                          key={`${cs.sheetId}-${cs.label}-${i}`}
                          item={cs}
                          type="cheatsheet"
                          query={query}
                          isSelected={selectedIndex === (results.concepts.length + results.projects.length + i)}
                          onSelect={() => { navigate(`/cheatsheets/${cs.sheetId}`); onClose(); }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="hidden sm:flex bg-surface-800/50 px-6 py-3 border-t border-surface-700 justify-between items-center text-[10px] text-gray-500 font-medium">
            <div className="flex gap-4">
               <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-surface-700 border border-surface-600">↑↓</kbd> Navigate</span>
               <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-surface-700 border border-surface-600">↵</kbd> Select</span>
            </div>
            <span>Learn Blazingly Fast</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

function ResultRow({ item, type, query, isSelected, onSelect }) {
  const DOMAIN_COLORS = {
    DSA: 'bg-dsa-600/20 text-dsa-400',
    ML: 'bg-ml-500/20 text-ml-400',
    Frontend: 'bg-frontend-500/20 text-frontend-400',
    Backend: 'bg-backend-500/20 text-backend-400',
    'Software Engineering': 'bg-se-500/20 text-se-400'
  }

  const CAT_COLORS = {
    'Frontend': 'bg-frontend-600/20 text-frontend-400',
    'Backend': 'bg-backend-600/20 text-backend-400',
    'AI-ML': 'bg-ml-500/20 text-ml-400',
    'Full-stack': 'bg-dsa-500/20 text-dsa-400'
  }

  const title = type === 'cheatsheet' ? item.label : item.title

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors text-left
        ${isSelected ? 'bg-surface-700 ring-1 ring-blue-500/50' : 'hover:bg-surface-800/50'}`}
    >
      <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs
        ${type === 'concept' ? 'bg-blue-600/20 text-blue-400' : type === 'project' ? 'bg-purple-600/20 text-purple-400' : 'bg-emerald-600/20 text-emerald-400'}`}>
        {type === 'concept' ? 'C' : type === 'project' ? 'P' : 'CS'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-gray-100 truncate">
            <HighlightedText text={title} query={query} />
          </span>
          {type !== 'cheatsheet' && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter
              ${type === 'concept' ? (DOMAIN_COLORS[item.domain] || 'bg-gray-500/20 text-gray-400') : (CAT_COLORS[item.category] || 'bg-gray-500/20 text-gray-400')}`}>
              {type === 'concept' ? (item.domain === 'Software Engineering' ? 'SE' : item.domain) : item.category}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-0.5 truncate">
          {type === 'concept' && item.category}
          {type === 'project' && item.stack.slice(0, 3).join(' · ')}
          {type === 'cheatsheet' && `${item.sheetTitle} · ${item.sectionTitle}`}
        </div>
      </div>
      <span className={`text-[10px] font-bold transition-opacity ${isSelected ? 'opacity-100 text-blue-400' : 'opacity-0'}`}>
        Enter ↵
      </span>
    </button>
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
