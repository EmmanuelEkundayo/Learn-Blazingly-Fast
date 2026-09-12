import { useState, useMemo, useCallback } from 'react'
import * as d3 from 'd3'
import { motion, AnimatePresence } from 'framer-motion'
import StepControls from './StepControls.jsx'
import { useInterval } from '../../hooks/useInterval.js'

const SPEED_MS = { 0.5: 2000, 1: 1000, 1.5: 667, 2: 500, 3: 333 }

// Seeded xorshift RNG for reproducible data
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

const CLUSTER_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#a78bfa']
const UNASSIGNED     = '#4b5563'
const NOISE_COLOR    = '#ef4444'
const QUERY_COLOR    = '#ef4444'
const KNN_COLOR      = '#22c55e'

// ─── Mode-specific data generators ───────────────────────────────────────────

function generateKMeansSteps() {
  const rng = makeRng(42)
  const centers = [[2.5, 2.5], [8.0, 2.5], [5.5, 8.5]]
  const N_PER = 20
  const rawPoints = centers.flatMap((c, ci) =>
    Array.from({ length: N_PER }, (_, i) => ({ id: ci * N_PER + i, x: c[0] + rng.normal() * 1.1, y: c[1] + rng.normal() * 1.1, trueCluster: ci }))
  )
  let centroids = [[1.5, 6.5], [8.5, 7.0], [3.5, 1.5]]

  function assign(pts, ctrs) {
    return pts.map(p => {
      const dists = ctrs.map(c => (p.x - c[0]) ** 2 + (p.y - c[1]) ** 2)
      return { ...p, cluster: dists.indexOf(Math.min(...dists)) }
    })
  }
  function moveCentroids(pts, ctrs) {
    return ctrs.map((c, k) => {
      const clPts = pts.filter(p => p.cluster === k)
      if (clPts.length === 0) return c
      return [clPts.reduce((s, p) => s + p.x, 0) / clPts.length, clPts.reduce((s, p) => s + p.y, 0) / clPts.length]
    })
  }

  const steps = []
  steps.push({ points: rawPoints.map(p => ({ ...p, cluster: -1 })), centroids: null, annotation: `${rawPoints.length} data points plotted. K-Means will partition into k=3 clusters.` })
  steps.push({ points: rawPoints.map(p => ({ ...p, cluster: -1 })), centroids: centroids.map(c => [...c]), annotation: 'Step 1: randomly initialize 3 centroids (✕). They start in poor positions.' })
  for (let iter = 0; iter < 4; iter++) {
    const assigned = assign(rawPoints, centroids)
    steps.push({ points: assigned, centroids: centroids.map(c => [...c]), annotation: `Iteration ${iter + 1}: assign each point to nearest centroid (Euclidean distance).` })
    centroids = moveCentroids(assigned, centroids)
    steps.push({ points: assigned, centroids: centroids.map(c => [...c]), annotation: `Iteration ${iter + 1}: move each centroid to the mean of its assigned points.` })
    if (iter === 3) {
      const finalAssigned = assign(rawPoints, centroids)
      const changed = finalAssigned.some((p, i) => p.cluster !== assigned[i].cluster)
      if (!changed) steps.push({ points: finalAssigned, centroids: centroids.map(c => [...c]), annotation: `Converged: no point changed cluster. Final 3 clusters found after ${iter + 1} iterations.` })
    }
  }
  return { steps, mode: 'kmeans', legend: ['Cluster 0', 'Cluster 1', 'Cluster 2'], showCentroids: true }
}

function generateDbscanSteps() {
  const rng = makeRng(77)
  const points = []
  let id = 0
  // Arc cluster A
  for (let i = 0; i < 18; i++) {
    const t = (i / 17) * Math.PI
    points.push({ id: id++, x: 2.5 + Math.cos(t) * 1.8 + rng.normal() * 0.2, y: 3.0 + Math.sin(t) * 1.8 + rng.normal() * 0.2, cluster: 0 })
  }
  // Dense blob cluster B
  for (let i = 0; i < 16; i++) {
    points.push({ id: id++, x: 7.5 + rng.normal() * 0.8, y: 7.0 + rng.normal() * 0.8, cluster: 1 })
  }
  // Elongated line cluster C
  for (let i = 0; i < 14; i++) {
    points.push({ id: id++, x: 3.0 + i * 0.4 + rng.normal() * 0.2, y: 8.5 + rng.normal() * 0.3, cluster: 2 })
  }
  // Noise
  for (let i = 0; i < 8; i++) {
    points.push({ id: id++, x: 1 + rng.next() * 9, y: 1 + rng.next() * 9, cluster: -2 /* noise */ })
  }

  const steps = [
    { points: points.map(p => ({ ...p, cluster: -1 })), centroids: null, annotation: 'DBSCAN: density-based clustering. Works on arbitrary shapes without specifying k.' },
    { points: points.map(p => ({ ...p, cluster: -1 })), centroids: null, annotation: 'DBSCAN scan: find core points (≥minPts neighbors within ε). Expanding cluster A (arc).' },
    { points: points.map(p => p.cluster === 0 ? p : { ...p, cluster: -1 }), centroids: null, annotation: 'Cluster A found: arc-shaped region. DBSCAN connects dense neighborhoods — no centroid needed.' },
    { points: points.map(p => p.cluster <= 1 ? p : { ...p, cluster: -1 }), centroids: null, annotation: 'Cluster B found: dense blob at (7.5, 7.0). Density threshold separates it cleanly.' },
    { points, centroids: null, annotation: 'All clusters found. Red points = NOISE (not in any cluster, below density threshold). DBSCAN: 3 clusters, 8 noise points.' },
  ]
  return { steps, mode: 'dbscan', legend: ['Cluster A (arc)', 'Cluster B (blob)', 'Cluster C (line)', 'Noise'], showCentroids: false }
}

function generateHierarchicalSteps() {
  const rng = makeRng(55)
  // 4 tight clusters in 2×2 grid
  const clusterCenters = [[2.5, 2.5], [8.0, 2.5], [2.5, 8.0], [8.0, 8.0]]
  const points = clusterCenters.flatMap((c, ci) =>
    Array.from({ length: 10 }, (_, i) => ({ id: ci * 10 + i, x: c[0] + rng.normal() * 0.7, y: c[1] + rng.normal() * 0.7, cluster: ci }))
  )

  const steps = [
    { points: points.map(p => ({ ...p, cluster: -1 })), centroids: null, annotation: 'Hierarchical clustering: 40 points in 4 tight groups. Will merge bottom-up.' },
    { points, centroids: null, annotation: 'Leaf clusters: 4 individual clusters (k=4). Each tight group is its own cluster.' },
    { points: points.map(p => ({ ...p, cluster: p.cluster < 2 ? 0 : 2 })), centroids: null, annotation: 'Merge step 1: bottom clusters (0,1) merge → 2 large clusters by Ward linkage.' },
    { points: points.map(p => ({ ...p, cluster: 0 })), centroids: null, annotation: 'Merge step 2: all merge into 1 super-cluster. Dendrogram shows hierarchy of merges.' },
  ]
  return { steps, mode: 'hierarchical', legend: ['Cluster 0', 'Cluster 1', 'Cluster 2', 'Cluster 3'], showCentroids: false }
}

function generateGmmSteps() {
  const rng = makeRng(33)
  const centers = [[3.5, 3.5], [7.0, 3.5], [5.5, 7.5]]
  const points = centers.flatMap((c, ci) =>
    Array.from({ length: 20 }, (_, i) => ({ id: ci * 20 + i, x: c[0] + rng.normal() * 1.8, y: c[1] + rng.normal() * 1.5, cluster: ci }))
  )

  const steps = [
    { points: points.map(p => ({ ...p, cluster: -1 })), centroids: null, annotation: 'GMM-EM: 3 overlapping Gaussian distributions. More overlap than k-means — uses soft assignments.' },
    { points: points.map(p => ({ ...p, cluster: -1 })), centroids: centers.map(c => [...c]), annotation: 'E-step (init): initialize mixture parameters. Each point gets probability of belonging to each Gaussian.' },
    { points, centroids: centers.map(c => [...c]), annotation: 'E-step: compute posterior probabilities (responsibilities). Points near overlap assigned partial membership.' },
    { points, centroids: [[3.6, 3.4], [7.1, 3.6], [5.4, 7.6]], annotation: 'M-step: update μ, σ², π using weighted sums. Elliptical boundaries fit the data covariance.' },
    { points, centroids: [[3.5, 3.5], [7.0, 3.5], [5.5, 7.5]], annotation: 'Converged: GMM models elliptical clusters with overlap probability. More flexible than k-means.' },
  ]
  return { steps, mode: 'gmm', legend: ['Gaussian 0', 'Gaussian 1', 'Gaussian 2'], showCentroids: true }
}

function generateIsolationForestSteps() {
  const rng = makeRng(99)
  const points = []
  // Normal cluster
  for (let i = 0; i < 40; i++) {
    points.push({ id: i, x: 5 + rng.normal() * 1.2, y: 5 + rng.normal() * 1.2, cluster: 0 })
  }
  // Outliers
  const outlierPos = [[1.0, 1.5], [9.5, 8.5], [1.5, 9.0], [9.0, 1.0], [0.5, 5.5]]
  outlierPos.forEach((pos, i) => points.push({ id: 40 + i, x: pos[0], y: pos[1], cluster: -2 }))

  const steps = [
    { points: points.map(p => ({ ...p, cluster: -1 })), centroids: null, annotation: 'Isolation Forest: anomaly detection. Normal points form a dense cluster.' },
    { points: points.map(p => ({ ...p, cluster: p.cluster === 0 ? 0 : -1 })), centroids: [[5, 5]], annotation: 'Normal region identified. Dense center cluster — requires many random splits to isolate.' },
    { points, centroids: [[5, 5]], annotation: 'Outliers detected (red): far from center, isolated quickly by random partitioning. Short path length = anomaly.' },
  ]
  return { steps, mode: 'isolation', legend: ['Normal', 'Outlier'], showCentroids: true }
}

function generateKnnSteps() {
  const rng = makeRng(11)
  const points = []
  // Class 0: bottom-left
  for (let i = 0; i < 18; i++) {
    points.push({ id: i, x: 3 + rng.normal() * 1.5, y: 3 + rng.normal() * 1.5, cluster: 0 })
  }
  // Class 1: top-right
  for (let i = 0; i < 18; i++) {
    points.push({ id: 18 + i, x: 7.5 + rng.normal() * 1.5, y: 7.5 + rng.normal() * 1.5, cluster: 1 })
  }
  // Query point
  const query = { id: 999, x: 5.5, y: 5.5, cluster: -3, isQuery: true }
  // k=5 nearest: distances pre-computed
  const knnIds = new Set([3, 7, 12, 18, 22])

  const stepsPoints = [
    points.map(p => ({ ...p, cluster: -1 })),
    points,
    [...points.map(p => knnIds.has(p.id) ? { ...p, cluster: -4 } : p)],
    [...points.map(p => knnIds.has(p.id) ? { ...p, cluster: -4 } : p)],
  ]

  const steps = [
    { points: stepsPoints[0], centroids: null, query: null, annotation: 'KNN: k=5 nearest neighbors. 36 points, 2 classes. Query point will be classified.' },
    { points: stepsPoints[1], centroids: null, query, annotation: 'Query point (red star) placed at (5.5, 5.5). Finding 5 nearest neighbors by Euclidean distance.' },
    { points: stepsPoints[2], centroids: null, query, annotation: 'k=5 nearest neighbors highlighted (green). 3 from class 0, 2 from class 1. Majority vote → Class 0.' },
    { points: stepsPoints[2], centroids: null, query: { ...query, predicted: 0 }, annotation: 'Prediction: Class 0 (3 votes vs 2). KNN is non-parametric — no training phase, just distance.' },
  ]
  return { steps, mode: 'knn', legend: ['Class 0', 'Class 1', 'k-NN neighbor', 'Query'], showCentroids: false }
}

function generateFeatureScalingSteps() {
  const rng = makeRng(66)
  const n = 20
  // Unscaled: x in [0,100], y in [0,1]
  const rawUnscaled = Array.from({ length: n }, (_, i) => ({
    id: i,
    rawX: rng.next() * 100,
    rawY: rng.next(),
    cluster: Math.floor(i / (n / 3))
  }))
  const steps = [
    { points: rawUnscaled.map(p => ({ ...p, x: p.rawX / 10, y: p.rawY * 10, cluster: -1 })), centroids: null, annotation: 'Feature scaling: original features. Feature 1: [0-100], Feature 2: [0-1]. Very different ranges.' },
    { points: rawUnscaled.map(p => ({ ...p, x: p.rawX / 10, y: p.rawY * 10, cluster: p.cluster })), centroids: null, annotation: 'Unscaled: distance metrics distorted by large feature 1. ML algorithms biased toward Feature 1.' },
    { points: rawUnscaled.map(p => ({ ...p, x: 1 + (p.rawX / 100) * 9, y: 1 + p.rawY * 9, cluster: p.cluster })), centroids: null, annotation: 'After normalization [0-1]: both features equally scaled. Distances now meaningful in all directions.' },
    { points: rawUnscaled.map(p => {
        const meanX = 50, stdX = 28.9, meanY = 0.5, stdY = 0.29
        return { ...p, x: 5.5 + ((p.rawX - meanX) / stdX) * 2, y: 5.5 + ((p.rawY - meanY) / stdY) * 2, cluster: p.cluster }
      }), centroids: null, annotation: 'After standardization (z-score): μ=0, σ=1 per feature. Circular cluster shapes — ideal for distance-based algorithms.' },
  ]
  return { steps, mode: 'scaling', legend: ['Group 0', 'Group 1', 'Group 2'], showCentroids: false }
}

// ─── Main mode dispatcher ─────────────────────────────────────────────────────

function getModeSteps(mode) {
  switch (mode) {
    case 'dbscan':                  return generateDbscanSteps()
    case 'hierarchical':
    case 'hierarchical-clustering': return generateHierarchicalSteps()
    case 'gmm-em':                  return generateGmmSteps()
    case 'isolation-forest':        return generateIsolationForestSteps()
    case 'knn':                     return generateKnnSteps()
    case 'feature-scaling':         return generateFeatureScalingSteps()
    case 'kmeans':
    case 'k-means':
    default:                        return generateKMeansSteps()
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClusterPlot({ config = {}, progress, compact = false, readOnly = false }) {
  const isReadOnly = readOnly || progress !== undefined
  const modeData = useMemo(() => getModeSteps(config.mode), [config.mode])
  const { steps, mode, legend, showCentroids } = modeData

  const [internalStep, setInternalStep] = useState(0)
  const [playing,      setPlaying]      = useState(false)
  const [speed,        setSpeed]        = useState(1)

  const step = progress !== undefined
    ? Math.min(steps.length - 1, Math.max(0, Math.floor(progress * steps.length)))
    : internalStep

  const cur = steps[Math.min(step, steps.length - 1)]

  useInterval(
    () => { if (step < steps.length - 1) setStep(s => s + 1); else setPlaying(false) },
    playing ? SPEED_MS[speed] : null,
  )

  const handleReset = useCallback(() => { setStep(0); setPlaying(false) }, [])

  // Chart geometry
  const W = 480, H = 340
  const mg = { top: 16, right: 16, bottom: 40, left: 44 }
  const iW = W - mg.left - mg.right
  const iH = H - mg.top  - mg.bottom

  const xScale = useMemo(() => d3.scaleLinear().domain([-0.5, 11.5]).range([0, iW]), [iW])
  const yScale = useMemo(() => d3.scaleLinear().domain([-0.5, 11.5]).range([iH, 0]), [iH])

  const gridTicks = [0, 2, 4, 6, 8, 10]

  function pointColor(p) {
    if (p.isQuery) return QUERY_COLOR
    if (p.cluster === -2) return NOISE_COLOR
    if (p.cluster === -4) return KNN_COLOR
    if (p.cluster === -3) return QUERY_COLOR
    if (p.cluster < 0) return UNASSIGNED
    return CLUSTER_COLORS[p.cluster % CLUSTER_COLORS.length]
  }

  const iterNum = mode === 'kmeans'
    ? (step <= 1 ? 0 : Math.ceil((step - 1) / 2))
    : step

  return (
    <div className="flex flex-col gap-3">
      {/* Stats */}
      <div className="flex items-center gap-3 text-xs font-mono px-3 py-2 rounded bg-surface-700 border border-surface-600">
        <span className="text-gray-400">mode:</span>
        <span className="text-dsa-400 font-bold">{config.mode || 'k-means'}</span>
        <span className="text-gray-400">|</span>
        <span className="text-gray-400">step:</span>
        <span className="text-dsa-400 font-bold">{iterNum}</span>
        <span className="text-gray-400">|</span>
        <span className="text-gray-400">points:</span>
        <span className="text-gray-300 font-bold">{cur.points.length}</span>
      </div>

      {/* Scatter plot */}
      <div className="rounded-lg border border-surface-600 bg-surface-800 overflow-hidden">
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxHeight: 360 }}>
          <g transform={`translate(${mg.left},${mg.top})`}>
            {/* Grid */}
            {gridTicks.map(t => (
              <g key={t}>
                <line x1={xScale(t)} x2={xScale(t)} y1={0} y2={iH} stroke="#1e1e26" strokeWidth={1} />
                <line x1={0} x2={iW} y1={yScale(t)} y2={yScale(t)} stroke="#1e1e26" strokeWidth={1} />
              </g>
            ))}

            {/* Points */}
            {cur.points.map(p => {
              const color = pointColor(p)
              return (
                <motion.circle key={p.id}
                  animate={{ cx: xScale(p.x), cy: yScale(p.y), fill: color }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  r={p.cluster === -2 ? 3 : 4} fillOpacity={0.85}
                  stroke={color} strokeWidth={p.cluster === -4 ? 1.5 : 0.5} strokeOpacity={0.5}
                />
              )
            })}

            {/* Query point (KNN) */}
            <AnimatePresence>
              {cur.query && (
                <motion.g key="query" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <motion.polygon
                    points="0,-9 2.5,-4 8,-4 3.5,0 5.5,6 0,2 -5.5,6 -3.5,0 -8,-4 -2.5,-4"
                    transform={`translate(${xScale(cur.query.x)},${yScale(cur.query.y)})`}
                    fill={QUERY_COLOR} stroke="#fca5a5" strokeWidth={1.5}
                  />
                  {cur.query.predicted !== undefined && (
                    <text x={xScale(cur.query.x) + 12} y={yScale(cur.query.y) + 4}
                      fill="#22c55e" fontSize={9} fontFamily="monospace" fontWeight="700">
                      → C{cur.query.predicted}
                    </text>
                  )}
                </motion.g>
              )}
            </AnimatePresence>

            {/* Centroids */}
            <AnimatePresence>
              {showCentroids && cur.centroids && cur.centroids.map((c, k) => {
                const cx = xScale(c[0])
                const cy = yScale(c[1])
                const color = CLUSTER_COLORS[k % CLUSTER_COLORS.length]
                return (
                  <motion.g key={k} animate={{ x: cx, y: cy }} transition={{ duration: 0.45, ease: 'easeOut' }}>
                    <line x1={-8} y1={-8} x2={8} y2={8} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
                    <line x1={8}  y1={-8} x2={-8} y2={8} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
                    <circle r={10} fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={0.5} />
                  </motion.g>
                )
              })}
            </AnimatePresence>

            {/* Axes */}
            <line x1={0} x2={iW} y1={iH} y2={iH} stroke="#374151" />
            <line x1={0} x2={0}  y1={0}  y2={iH} stroke="#374151" />
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
        {legend.map((label, i) => {
          const color = label === 'Noise' || label === 'Outlier' ? NOISE_COLOR
            : label === 'k-NN neighbor' ? KNN_COLOR
            : label === 'Query' ? QUERY_COLOR
            : CLUSTER_COLORS[i % CLUSTER_COLORS.length]
          return (
            <span key={label} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: color }} />
              {label}
            </span>
          )
        })}
        {showCentroids && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 text-center font-bold leading-none text-gray-400" style={{ fontSize: 12 }}>✕</span>
            centroid
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: UNASSIGNED }} />
          unassigned
        </span>
      </div>

      <StepControls
        step={Math.min(step, steps.length - 1)} totalSteps={steps.length} playing={playing} speed={speed}
        annotation={cur?.annotation}
        onPrev={()  => { setPlaying(false); setInternalStep(s => Math.max(0, s - 1)) }}
        onNext={()  => { setPlaying(false); setInternalStep(s => Math.min(steps.length - 1, s + 1)) }}
        onPlay={()  => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onReset={handleReset}
        onSpeedChange={setSpeed}
        readOnly={isReadOnly}
      />
    </div>
  )
}
