import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Testimonials() {
  const [reviews, setReviews] = useState([])
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReviews() {
      try {
        const res = await fetch('/api/v1/reviews')
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

  const filtered = useMemo(() => {
    if (filter === 'All') return reviews
    return reviews.filter(r => {
      const occ = r.occupation.toLowerCase()
      if (filter === 'Student') return occ.includes('student') || occ.includes('university') || occ.includes('college')
      if (filter === 'Engineer') return occ.includes('engineer') || occ.includes('developer') || occ.includes('architect')
      if (filter === 'Data Scientist') return occ.includes('data') || occ.includes('ml') || occ.includes('ai')
      return !occ.includes('student') && !occ.includes('engineer') && !occ.includes('developer') && !occ.includes('data')
    })
  }, [reviews, filter])

  const categories = ['All', 'Student', 'Engineer', 'Data Scientist', 'Other']

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-500">
        Loading testimonials...
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-16 space-y-12">
      <header className="text-center space-y-4 max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-white tracking-tight">Developers learning with Learn Blazingly Fast</h1>
        <p className="text-gray-400 text-lg">
          Real reviews from real developers. Unfiltered, anonymous.
        </p>
      </header>

      {/* Filter Bar */}
      <div className="flex flex-wrap justify-center gap-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === cat 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' 
                : 'bg-surface-800 text-gray-400 hover:bg-surface-700 hover:text-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Masonry Grid */}
      <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
        <AnimatePresence>
          {filtered.map((r, i) => (
            <motion.div
              key={r.submitted_at + i}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4 }}
              className="break-inside-avoid"
            >
              <div className="bg-surface-800 border border-surface-700 p-6 rounded-2xl flex flex-col space-y-4 hover:border-surface-600 transition-colors shadow-xl">
                <div className="flex gap-0.5 text-yellow-500">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-xs">★</span>
                  ))}
                </div>

                <p className="text-gray-200 text-base italic leading-relaxed">
                  "{r.review_text}"
                </p>

                <div className="pt-4 border-t border-surface-700/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-white">{r.first_name}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-widest">{r.occupation}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-blue-400 font-bold mb-1">
                        EXPLORED {r.concepts_seen_count} CONCEPTS
                      </div>
                      <div className="text-[10px] text-gray-600 uppercase font-medium">
                        {new Date(r.submitted_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-gray-500 italic">
          No testimonials found for this category yet.
        </div>
      )}
    </div>
  )
}
