import { useMemo } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { useConceptStore }  from '../store/conceptStore.js'
import { useProgressStore } from '../store/progressStore.js'

// ─── helpers ───────────────────────────────────────────────────────────────

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000

function relativeTime(ts) {
  if (!ts) return 'never'
  const days = Math.floor((Date.now() - ts) / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7)  return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

function byLastSeen(progress, asc = false) {
  return (a, b) => {
    const ta = progress[a.slug]?.last_seen ?? 0
    const tb = progress[b.slug]?.last_seen ?? 0
    return asc ? ta - tb : tb - ta
  }
}

// ─── page ──────────────────────────────────────────────────────────────────

export default function Review() {
  const concepts = useConceptStore(s => s.concepts)
  const progress = useProgressStore(s => s.progress)
  const now      = Date.now()

  const { failed, notPracticed, stale } = useMemo(() => {
    const failed       = []
    const notPracticed = []
    const stale        = []

    for (const c of concepts) {
      const p = progress[c.slug]
      if (!p) continue

      if ((p.exercise_attempts ?? 0) > 0 && !p.exercise_passed)        failed.push(c)
      else if (p.viewed && !(p.exercise_attempts > 0))                  notPracticed.push(c)

      if (p.viewed && p.last_seen && (now - p.last_seen) > SEVEN_DAYS) stale.push(c)
    }

    failed.sort(byLastSeen(progress, false))        // most recently failed first
    notPracticed.sort(byLastSeen(progress, false))  // most recently viewed first
    stale.sort(byLastSeen(progress, true))           // oldest first (most overdue)

    return { failed, notPracticed, stale }
  }, [concepts, progress])

  const total = failed.length + notPracticed.length + stale.length

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Review</h1>
        <p className="text-sm text-gray-400 mt-1">
          {total > 0
            ? `${total} concept${total > 1 ? 's' : ''} need${total === 1 ? 's' : ''} attention`
            : 'Nothing to review right now.'}
        </p>
      </div>

      {/* All-clear */}
      {total === 0 && concepts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center py-16 gap-3 text-center"
        >
          <span className="text-4xl">✓</span>
          <p className="text-gray-300 font-medium">You're all caught up.</p>
          <p className="text-gray-400 text-sm">
            No failed exercises, no pending practice, nothing stale.
          </p>
          <Link to="/browse" className="mt-2 text-sm text-dsa-400 hover:underline">
            Explore more concepts →
          </Link>
        </motion.div>
      )}

      {concepts.length === 0 && (
        <p className="text-gray-400 text-sm">
          No concepts loaded.{' '}
          <Link to="/browse" className="text-dsa-400 hover:underline">Browse the catalog</Link>.
        </p>
      )}

      {/* Section 1 — Failed */}
      <ReviewSection
        title="Failed"
        description="Attempted but not yet passing"
        accent="red"
        items={failed}
        progress={progress}
        emptyLabel="No failed exercises."
      />

      {/* Section 2 — Not practiced */}
      <ReviewSection
        title="Not practiced"
        description="Visited but exercise never attempted"
        accent="yellow"
        items={notPracticed}
        progress={progress}
        emptyLabel="Every visited concept has been attempted."
      />

      {/* Section 3 — Stale */}
      <ReviewSection
        title="Not seen in 7 days"
        description="Concepts you haven't revisited recently"
        accent="gray"
        items={stale}
        progress={progress}
        emptyLabel="Nothing stale — you've been active."
      />

    </div>
  )
}

// ─── ReviewSection ──────────────────────────────────────────────────────────

const ACCENT = {
  red:    { dot: 'bg-red-500',    label: 'text-red-400',    border: 'border-red-900/60'    },
  yellow: { dot: 'bg-yellow-500', label: 'text-yellow-400', border: 'border-yellow-900/60' },
  gray:   { dot: 'bg-gray-500',   label: 'text-gray-400',   border: 'border-surface-600'   },
}

function ReviewSection({ title, description, accent, items, progress, emptyLabel }) {
  const { dot, label, border } = ACCENT[accent]

  return (
    <section>
      {/* Section header */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className={`inline-block w-2 h-2 rounded-full ${dot} shrink-0 mb-0.5`} />
        <h2 className={`text-sm font-semibold ${label}`}>{title}</h2>
        {items.length > 0 && (
          <span className="text-xs text-gray-400">({items.length})</span>
        )}
        <p className="ml-1 text-xs text-gray-400 hidden sm:block">— {description}</p>
      </div>

      {/* Rows */}
      <div className={`rounded-xl border ${border} overflow-hidden`}>
        {items.length === 0 ? (
          <p className="px-4 py-3 text-sm text-gray-400 italic">{emptyLabel}</p>
        ) : (
          items.map((concept, i) => (
            <ConceptRow
              key={concept.slug}
              concept={concept}
              prog={progress[concept.slug] ?? {}}
              divider={i < items.length - 1}
            />
          ))
        )}
      </div>
    </section>
  )
}

// ─── ConceptRow ─────────────────────────────────────────────────────────────

function ConceptRow({ concept, prog, divider }) {
  const attempts = prog.exercise_attempts ?? 0

  return (
    <div className={`flex items-center gap-3 px-4 py-3 bg-surface-800 hover:bg-surface-700 transition-colors
      ${divider ? 'border-b border-surface-700' : ''}`}>

      {/* Domain badge */}
      <span className={`shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded ${
        concept.domain === 'DSA'
          ? 'bg-dsa-600/20 text-dsa-400'
          : 'bg-ml-500/20 text-ml-400'
      }`}>
        {concept.domain}
      </span>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-300 truncate">{concept.title}</p>
        <p className="text-xs text-gray-400">
          {concept.category}
          {attempts > 0 && (
            <span className="ml-2 text-red-400/80">
              {attempts} attempt{attempts > 1 ? 's' : ''}
            </span>
          )}
        </p>
      </div>

      {/* Last seen */}
      <span className="text-xs text-gray-400 shrink-0 tabular-nums">
        {relativeTime(prog.last_seen)}
      </span>

      {/* Practice button */}
      <Link
        to={`/concept/${concept.slug}`}
        className="shrink-0 text-xs text-dsa-400 hover:text-dsa-300 font-medium transition-colors flex items-center gap-0.5 whitespace-nowrap"
      >
        Practice →
      </Link>
    </div>
  )
}
