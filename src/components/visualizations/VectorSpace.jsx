import { useState, useMemo, useCallback } from 'react'
import * as d3 from 'd3'
import { motion, AnimatePresence } from 'framer-motion'
import StepControls from './StepControls.jsx'
import { useInterval } from '../../hooks/useInterval.js'

const SPEED_MS = { 0.5: 2000, 1: 1000, 1.5: 667, 2: 500, 3: 333 }

// Seeded RNG
function makeRng(seed) {
  let s = seed >>> 0
  return {
    next() { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 0xffffffff },
    normal() {
      const u = this.next() || 1e-9, v = this.next()
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
    },
  }
}

// ─── Default word2vec config ──────────────────────────────────────────────────

const DEFAULT_WORDS = [
  { id: 'king',   x: 6.8, y: 7.2, group: 'royalty', color: '#a78bfa' },
  { id: 'queen',  x: 5.2, y: 6.8, group: 'royalty', color: '#a78bfa' },
  { id: 'prince', x: 7.1, y: 5.9, group: 'royalty', color: '#a78bfa' },
  { id: 'man',    x: 6.5, y: 3.5, group: 'gender',  color: '#60a5fa' },
  { id: 'woman',  x: 4.8, y: 3.1, group: 'gender',  color: '#f472b6' },
  { id: 'boy',    x: 7.2, y: 2.4, group: 'gender',  color: '#60a5fa' },
  { id: 'girl',   x: 5.5, y: 2.0, group: 'gender',  color: '#f472b6' },
  { id: 'cat',    x: 2.1, y: 7.5, group: 'animal',  color: '#34d399' },
  { id: 'dog',    x: 1.5, y: 6.3, group: 'animal',  color: '#34d399' },
  { id: 'kitten', x: 2.8, y: 8.1, group: 'animal',  color: '#34d399' },
  { id: 'paris',  x: 2.0, y: 2.5, group: 'city',    color: '#fbbf24' },
  { id: 'london', x: 1.4, y: 3.5, group: 'city',    color: '#fbbf24' },
  { id: 'france', x: 3.0, y: 1.8, group: 'city',    color: '#fb923c' },
]

const DEFAULT_STEPS = [
  { highlight: new Set(), arrows: [], annotation: '13 words projected to 2D (PCA). Semantically similar words cluster together.' },
  { highlight: new Set(['royalty']), arrows: [], annotation: 'Royalty cluster: "king", "queen", "prince" are close in vector space.' },
  { highlight: new Set(['animal']), arrows: [], annotation: 'Animal cluster: "cat", "kitten", "dog" share semantic context from co-occurrence.' },
  { highlight: new Set(['gender']), arrows: [], annotation: 'Gender axis: "man"/"boy" and "woman"/"girl" separated by a consistent direction.' },
  { highlight: new Set(['cat']), arrows: [{ from: 'cat', to: 'kitten' }, { from: 'cat', to: 'dog' }], annotation: 'Nearest neighbors of "cat": ["kitten", "dog"] — semantically similar words.' },
  { highlight: new Set(['king', 'man', 'woman', 'queen']), arrows: [{ from: 'king', to: 'queen', label: 'king − man + woman', color: '#a78bfa', dashed: true }], annotation: 'Vector arithmetic: king − man + woman ≈ queen. The gender direction is consistent across domains.' },
]

// ─── Mode configs ──────────────────────────────────────────────────────────────

function normalizeVectorMode(rawMode) {
  const m = (rawMode || '').toLowerCase().trim()
  const map = {
    'rag': 'rag-retrieval-augmented-generation',
    'semantic-clusters': 'vector-databases',
    'faiss': 'vector-embeddings-faiss',
  }
  return map[m] || m
}

function getModeConfig(rawMode) {
  const mode = normalizeVectorMode(rawMode)
  switch (mode) {

    case 'vector-databases': {
      const rng = makeRng(42)
      const docs = Array.from({ length: 20 }, (_, i) => ({
        id: `doc${i}`, x: 1 + rng.next() * 8.5, y: 1 + rng.next() * 8.5,
        group: 'doc', color: '#60a5fa',
      }))
      const query = { id: 'query', x: 5.0, y: 5.2, group: 'query', color: '#ef4444' }
      // Pre-sort by distance to query
      const dists = docs.map(d => ({ d, dist: Math.hypot(d.x - query.x, d.y - query.y) })).sort((a, b) => a.dist - b.dist)
      const nearest3 = new Set(dists.slice(0, 3).map(({ d }) => d.id))
      const words = [...docs, query]
      const steps = [
        { highlight: new Set(), arrows: [], circles: [], annotation: 'Vector database: 20 document embeddings in 2D space. Query vector (red star) will find nearest neighbors.' },
        { highlight: new Set(['query']), arrows: [], circles: [{ cx: query.x, cy: query.y, r: 2.5 }, { cx: query.x, cy: query.y, r: 4.5 }], annotation: 'Expanding search radius from query. Concentric circles show distance thresholds (ANN index scan).' },
        { highlight: new Set([...nearest3, 'query']), arrows: [], circles: [], annotation: `Top-3 nearest neighbors found (highlighted). Distance metric: Euclidean (L2). ANN index avoids brute-force scan.` },
        { highlight: new Set([...nearest3, 'query']), arrows: dists.slice(0, 3).map(({ d }) => ({ from: 'query', to: d.id, color: '#22c55e' })), circles: [], annotation: 'Results returned: nearest 3 documents. Vector DB (FAISS, Pinecone, Weaviate) enables sub-millisecond retrieval at scale.' },
      ]
      return { words, steps, groupLabels: [{ group: 'doc', label: 'Documents', color: '#60a5fa' }, { group: 'query', label: 'Query', color: '#ef4444' }], axisLabel: 'Embedding space (2D projection)' }
    }

    case 'umap': {
      const rng = makeRng(55)
      const classes = [
        { name: 'Class A', color: '#3b82f6', cx: 2.5, cy: 7.5 },
        { name: 'Class B', color: '#22c55e', cx: 7.5, cy: 7.5 },
        { name: 'Class C', color: '#f59e0b', cx: 2.5, cy: 2.5 },
        { name: 'Class D', color: '#a78bfa', cx: 7.5, cy: 2.5 },
      ]
      const words = classes.flatMap((cls, ci) =>
        Array.from({ length: 8 }, (_, i) => ({
          id: `${cls.name.toLowerCase().replace(' ', '')}_${i}`,
          x: cls.cx + rng.normal() * 0.9,
          y: cls.cy + rng.normal() * 0.9,
          group: cls.name, color: cls.color,
        }))
      )
      const steps = [
        { highlight: new Set(), arrows: [], annotation: 'UMAP embedding: 32 high-dimensional points projected to 2D. 4 well-separated clusters.' },
        { highlight: new Set(['Class A']), arrows: [], annotation: 'Class A (blue): tight cluster — similar items in original high-dimensional space.' },
        { highlight: new Set(['Class B']), arrows: [], annotation: 'Class B (green): well-separated from other classes. UMAP preserves local structure.' },
        { highlight: new Set(['Class C', 'Class D']), arrows: [], annotation: 'Classes C & D: bottom clusters. UMAP places globally dissimilar points far apart.' },
        { highlight: new Set(), arrows: [], annotation: 'Final UMAP layout: local and global structure preserved. Better than t-SNE for large datasets.' },
      ]
      return { words, steps, groupLabels: classes.map(c => ({ group: c.name, label: c.name, color: c.color })), axisLabel: 'UMAP Dimension' }
    }

    case 'rag-retrieval-augmented-generation': {
      const rng = makeRng(77)
      const docs = Array.from({ length: 15 }, (_, i) => ({
        id: `doc${i}`, x: 1 + rng.next() * 8.5, y: 1 + rng.next() * 8.5,
        group: 'doc', color: '#60a5fa',
      }))
      const query = { id: 'query', x: 4.8, y: 5.5, group: 'query', color: '#ef4444' }
      const dists = docs.map(d => ({ d, dist: Math.hypot(d.x - query.x, d.y - query.y) })).sort((a, b) => a.dist - b.dist)
      const top3 = new Set(dists.slice(0, 3).map(({ d }) => d.id))
      const words = [...docs, query]
      const steps = [
        { highlight: new Set(), arrows: [], annotation: 'RAG: document corpus embedded in vector space. Query will retrieve relevant context.' },
        { highlight: new Set(['query']), arrows: [], annotation: 'User query embedded: same model encodes query and documents into shared space.' },
        { highlight: new Set([...top3, 'query']), arrows: [], annotation: 'Top-3 retrieved documents (green): closest to query in embedding space.' },
        { highlight: new Set([...top3, 'query']), arrows: dists.slice(0, 3).map(({ d }) => ({ from: 'query', to: d.id, color: '#22c55e' })), annotation: 'Retrieved context injected into LLM prompt. Grounds generation in factual documents.' },
      ]
      return { words, steps, groupLabels: [{ group: 'doc', label: 'Documents', color: '#60a5fa' }, { group: 'query', label: 'Query', color: '#ef4444' }, { group: 'retrieved', label: 'Retrieved', color: '#22c55e' }], axisLabel: 'Embedding space' }
    }

    case 'curse-of-dimensionality': {
      // Grid of 16 points showing concentration at edges
      const words = []
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          const x = 1.5 + i * 2.33 + (Math.sin(i * 2.7 + j) * 0.3)
          const y = 1.5 + j * 2.33 + (Math.cos(i + j * 1.9) * 0.3)
          words.push({ id: `p${i}${j}`, x, y, group: 'point', color: '#60a5fa' })
        }
      }
      const steps = [
        { highlight: new Set(), arrows: [], annotation: 'Curse of dimensionality: in 2D, 16 grid points look spread out with clear distances.' },
        { highlight: new Set(), arrows: [], annotation: 'In high dimensions (100D+), all pairwise distances converge to the same value. Points become equidistant.' },
        { highlight: new Set(), arrows: [], annotation: 'Most volume of a high-dim hypercube concentrates near its surface — nearest neighbor becomes meaningless.' },
        { highlight: new Set(), arrows: [], annotation: 'Solutions: PCA/UMAP dimensionality reduction, or approximate nearest neighbor (FAISS, Annoy).' },
      ]
      return { words, steps, groupLabels: [{ group: 'point', label: 'Data points', color: '#60a5fa' }], axisLabel: '2D projection of high-dim space' }
    }

    case 'vector-embeddings-faiss': {
      const rng = makeRng(88)
      const voronoiCenters = [[2.5, 2.5], [7.5, 2.5], [5.0, 7.5]]
      const words = voronoiCenters.flatMap((c, ci) =>
        Array.from({ length: 10 }, (_, i) => ({
          id: `v${ci}_${i}`, x: c[0] + rng.normal() * 1.2, y: c[1] + rng.normal() * 1.2,
          group: `region${ci}`, color: ['#60a5fa', '#22c55e', '#f59e0b'][ci],
        }))
      )
      const centroids = voronoiCenters.map((c, ci) => ({
        id: `centroid${ci}`, x: c[0], y: c[1], group: 'centroid', color: '#ef4444',
      }))
      const allWords = [...words, ...centroids]
      const steps = [
        { highlight: new Set(), arrows: [], annotation: 'FAISS IVF index: 30 vectors organized into 3 Voronoi regions. Centroids mark region boundaries.' },
        { highlight: new Set(['region0']), arrows: [], annotation: 'Region 0 (blue): vectors closest to centroid at (2.5, 2.5). Indexed together.' },
        { highlight: new Set(['region1']), arrows: [], annotation: 'Region 1 (green): vectors in the right cluster. Query only scans relevant regions (nprobe).' },
        { highlight: new Set(['region2']), arrows: [], annotation: 'Region 2 (amber): top cluster. FAISS IVF: search is O(n/k) instead of O(n). 3 regions, nprobe=1.' },
        { highlight: new Set(), arrows: [], annotation: 'FAISS IVF at scale: millions of vectors, sub-linear search. Product quantization for memory efficiency.' },
      ]
      return { words: allWords, steps, groupLabels: [{ group: 'region0', label: 'Region 0', color: '#60a5fa' }, { group: 'region1', label: 'Region 1', color: '#22c55e' }, { group: 'region2', label: 'Region 2', color: '#f59e0b' }, { group: 'centroid', label: 'Centroid', color: '#ef4444' }], axisLabel: 'FAISS IVF embedding space' }
    }

    default: // word2vec-cbow and any other
      return {
        words: DEFAULT_WORDS,
        steps: DEFAULT_STEPS,
        groupLabels: [
          { group: 'royalty', label: 'Royalty',  color: '#a78bfa' },
          { group: 'gender',  label: 'Gender',   color: '#60a5fa' },
          { group: 'animal',  label: 'Animals',  color: '#34d399' },
          { group: 'city',    label: 'Places',   color: '#fbbf24' },
        ],
        axisLabel: 'Principal Component',
      }
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VectorSpace({ config = {} }) {
  const modeConfig = useMemo(() => getModeConfig(config.mode), [config.mode])
  const { words, steps, groupLabels, axisLabel } = modeConfig

  const [step,    setStep]    = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed,   setSpeed]   = useState(1)

  const cur = steps[Math.min(step, steps.length - 1)]

  useInterval(
    () => { if (step < steps.length - 1) setStep(s => s + 1); else setPlaying(false) },
    playing ? SPEED_MS[speed] : null,
  )

  const handleReset = useCallback(() => { setStep(0); setPlaying(false) }, [])

  // Chart geometry
  const W = 480, H = 340
  const mg = { top: 16, right: 16, bottom: 30, left: 36 }
  const iW = W - mg.left - mg.right
  const iH = H - mg.top  - mg.bottom

  const xScale = useMemo(() => d3.scaleLinear().domain([0, 10]).range([0, iW]), [iW])
  const yScale = useMemo(() => d3.scaleLinear().domain([0, 10]).range([iH, 0]), [iH])

  function wordPos(id) {
    const w = words.find(x => x.id === id)
    return w ? { x: xScale(w.x), y: yScale(w.y) } : null
  }

  // Highlight logic: accept group name or id
  const highlight = cur.highlight ?? new Set()

  return (
    <div className="flex flex-col gap-3">
      {/* Plot */}
      <div className="rounded-lg border border-surface-600 bg-surface-800 overflow-hidden">
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxHeight: 360 }}>
          <g transform={`translate(${mg.left},${mg.top})`}>
            {/* Axis labels */}
            <text x={iW / 2} y={iH + 22} textAnchor="middle"
              fill="#4b5563" fontSize={9} fontFamily="Inter,sans-serif">{axisLabel} 1</text>
            <text transform={`translate(-24,${iH / 2}) rotate(-90)`}
              textAnchor="middle" fill="#4b5563" fontSize={9} fontFamily="Inter,sans-serif">
              {axisLabel} 2
            </text>

            {/* Light grid */}
            {[2, 4, 6, 8].map(t => (
              <g key={t}>
                <line x1={xScale(t)} x2={xScale(t)} y1={0} y2={iH} stroke="#1e1e26" strokeWidth={1} />
                <line x1={0} x2={iW} y1={yScale(t)} y2={yScale(t)} stroke="#1e1e26" strokeWidth={1} />
              </g>
            ))}

            {/* Distance circles (vector-databases / RAG) */}
            {(cur.circles ?? []).map((c, i) => (
              <circle key={i} cx={xScale(c.cx)} cy={yScale(c.cy)} r={xScale(c.r) - xScale(0)}
                fill="none" stroke="#ef4444" strokeWidth={1} strokeDasharray="4 3" strokeOpacity={0.4} />
            ))}

            {/* Annotation arrows */}
            <AnimatePresence>
              {(cur.arrows ?? []).map((arrow, i) => {
                const from = wordPos(arrow.from)
                const to   = wordPos(arrow.to)
                if (!from || !to) return null
                const color = arrow.color ?? '#6b7280'
                return (
                  <motion.line key={i}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke={color} strokeWidth={1.5} strokeOpacity={0.7}
                    strokeDasharray={arrow.dashed ? '5 3' : 'none'}
                  />
                )
              })}
            </AnimatePresence>

            {/* Word / vector points */}
            {words.map(w => {
              const isHighlighted = highlight.size === 0 || highlight.has(w.group) || highlight.has(w.id)
              const cx = xScale(w.x), cy = yScale(w.y)
              const isCentroid = w.group === 'centroid'

              return (
                <g key={w.id}>
                  {isCentroid ? (
                    // Render centroid as ✕
                    <g transform={`translate(${cx},${cy})`}>
                      <line x1={-6} y1={-6} x2={6} y2={6} stroke={w.color} strokeWidth={2.5} strokeLinecap="round" opacity={isHighlighted ? 1 : 0.2} />
                      <line x1={6}  y1={-6} x2={-6} y2={6} stroke={w.color} strokeWidth={2.5} strokeLinecap="round" opacity={isHighlighted ? 1 : 0.2} />
                    </g>
                  ) : (
                    <motion.circle
                      cx={cx} cy={cy}
                      animate={{ r: isHighlighted ? 5 : 3.5, fill: w.color, fillOpacity: isHighlighted ? 0.9 : 0.2, stroke: w.color, strokeOpacity: isHighlighted ? 0.5 : 0.1 }}
                      transition={{ duration: 0.25 }}
                      strokeWidth={6}
                    />
                  )}
                  <motion.text
                    x={cx + 7} y={cy + 3}
                    animate={{ opacity: isHighlighted ? 1 : 0.2, fill: w.color }}
                    transition={{ duration: 0.25 }}
                    fontSize={10} fontFamily="'JetBrains Mono',monospace" fontWeight="600"
                  >
                    {w.id}
                  </motion.text>
                </g>
              )
            })}
          </g>
        </svg>
      </div>

      {/* Group legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
        {groupLabels.map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>

      <StepControls
        step={Math.min(step, steps.length - 1)} totalSteps={steps.length} playing={playing} speed={speed}
        annotation={cur?.annotation}
        onPrev={()  => { setPlaying(false); setStep(s => Math.max(0, s - 1)) }}
        onNext={()  => { setPlaying(false); setStep(s => Math.min(steps.length - 1, s + 1)) }}
        onPlay={()  => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onReset={handleReset}
        onSpeedChange={setSpeed}
      />
    </div>
  )
}
