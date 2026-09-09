import { useNotesStore } from '../store/notesStore.js'
import { useConceptStore } from '../store/conceptStore.js'
import { Link } from 'react-router'
import { motion } from 'framer-motion'

export default function Notes() {
  const notes = useNotesStore(s => s.notes)
  const notesCount = useNotesStore(s => s.notesCount)
  const getConcept = useConceptStore(s => s.getBySlug)

  const noteItems = Object.entries(notes).map(([slug, text]) => {
    const concept = getConcept(slug)
    return {
      slug,
      text,
      title: concept?.title || slug,
      domain: concept?.domain || 'Unknown',
    }
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
      <header className="space-y-2">
        <h1 className="text-4xl font-bold text-white tracking-tight">My Notes</h1>
        <p className="text-gray-400 text-lg">
          {notesCount} {notesCount === 1 ? 'concept' : 'concepts'} with personal insights.
        </p>
      </header>

      {noteItems.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {noteItems.map((item, i) => (
            <motion.div
              key={item.slug}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-surface-800 border border-surface-700 rounded-xl p-6 hover:border-surface-600 transition-all group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${domainBadge(item.domain)}`}>
                      {item.domain}
                    </span>
                    <h3 className="text-xl font-bold text-gray-100 truncate">{item.title}</h3>
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-1 italic">
                    {item.text.split('\n')[0]}
                  </p>
                </div>
                <Link
                  to={`/concept/${item.slug}`}
                  className="shrink-0 px-5 py-2.5 bg-surface-700 hover:bg-surface-600 text-white rounded-lg text-sm font-bold transition-all border border-surface-600 group-hover:border-surface-500 text-center"
                >
                  View Concept →
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-32 space-y-6">
          <div className="text-6xl opacity-10">✎</div>
          <p className="text-gray-500 max-w-sm mx-auto">
            You haven't written any notes yet. Notes appear here after you add them on any concept page.
          </p>
          <Link 
            to="/browse" 
            className="inline-block px-6 py-3 bg-surface-800 border border-surface-700 rounded-xl text-sm font-bold text-gray-300 hover:text-white"
          >
            Start Learning
          </Link>
        </div>
      )}
    </div>
  )
}

function domainBadge(domain) {
  return {
    DSA:                  'bg-dsa-600/20 text-dsa-400 border-dsa-500/30',
    ML:                   'bg-ml-500/20 text-ml-400 border-ml-500/30',
    Frontend:             'bg-frontend-500/20 text-frontend-400 border-frontend-500/30',
    Backend:              'bg-backend-500/20 text-backend-400 border-backend-500/30',
    'Software Engineering': 'bg-se-500/20 text-se-400 border-se-500/30',
  }[domain] ?? 'bg-gray-500/20 text-gray-400 border-gray-500/30'
}
