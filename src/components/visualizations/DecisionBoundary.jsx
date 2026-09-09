import { useState, useMemo, useCallback } from 'react'
import * as d3 from 'd3'
import { motion } from 'framer-motion'
import StepControls from './StepControls.jsx'
import { useInterval } from '../../hooks/useInterval.js'

const SPEED_MS = { 0.5: 1800, 1: 900, 1.5: 600, 2: 450, 3: 300 }

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

// ─── Mode configs ─────────────────────────────────────────────────────────────

function getModeConfig(mode) {
  switch (mode) {

    case 'linear-regression': {
      const rng = makeRng(42)
      const points = Array.from({ length: 30 }, (_, i) => {
        const x = 1 + (i / 29) * 8
        const y = 1.5 * x + 1.0 + rng.normal() * 1.2
        return { id: i, x, y, cls: 0 }
      })
      const steps = [
        { type: 'scatter', lineParams: null, annotation: 'Linear regression: 30 data points. Y is continuous — not a classification task.' },
        { type: 'scatter', lineParams: { slope: 2.5, intercept: -1.0 }, annotation: 'Init: random line y=2.5x−1. Poor fit — residuals are large.' },
        { type: 'scatter', lineParams: { slope: 1.8, intercept: 0.5 }, showResiduals: true, annotation: 'Gradient descent: adjusting slope. Minimizing MSE = mean squared residuals (shown as vertical lines).' },
        { type: 'scatter', lineParams: { slope: 1.5, intercept: 1.0 }, showResiduals: true, annotation: 'Converging: y=1.5x+1.0. Residuals shrinking. OLS solution: β=(XᵀX)⁻¹Xᵀy.' },
        { type: 'scatter', lineParams: { slope: 1.5, intercept: 1.0 }, annotation: 'Fitted line: ŷ=1.5x+1.0. R²≈0.91. Residuals minimized — line explains ~91% of variance.' },
      ]
      return { points, steps, mode: 'regression', statLabel: 'R²', statValue: s => s.lineParams ? '0.91' : '—' }
    }

    case 'svm-linear': {
      const rng = makeRng(17)
      const points = []
      for (let i = 0; i < 20; i++) points.push({ id: i, x: 2.5 + rng.normal() * 1.0, y: 4 + rng.normal() * 1.0, cls: 0 })
      for (let i = 0; i < 20; i++) points.push({ id: 20 + i, x: 7.5 + rng.normal() * 1.0, y: 6 + rng.normal() * 1.0, cls: 1 })
      // Support vectors: points closest to margin
      const svIds = new Set([3, 7, 22, 27])
      const steps = [
        { boundaryIdx: null, annotation: 'SVM: find hyperplane with maximum margin between two linearly-separable classes.' },
        { boundaryIdx: 0, annotation: 'Iteration 1: initial boundary. No margin optimization yet.' },
        { boundaryIdx: 1, annotation: 'Maximizing margin: pushing boundary away from nearest points (support vectors).' },
        { boundaryIdx: 2, showMargins: true, showSV: true, annotation: 'Optimal hyperplane: maximum margin (dashed lines). Support vectors (circled) define the boundary.' },
      ]
      const BOUNDARY_STATES = [
        { w1: -0.5, w2: 0.5, b: 0.2 },
        { w1: -0.9, w2: 1.0, b: 1.5 },
        { w1: -1.1, w2: 1.2, b: 2.8 },
      ]
      return { points, steps, svIds, BOUNDARY_STATES, mode: 'svm-linear', statLabel: 'margin', statValue: s => s.showMargins ? '2.14' : '—' }
    }

    case 'svm-kernel': {
      const rng = makeRng(99)
      const points = []
      // XOR-like pattern: 4 quadrants
      for (let i = 0; i < 12; i++) points.push({ id: i, x: 2 + rng.normal() * 1.0, y: 2 + rng.normal() * 1.0, cls: 0 })
      for (let i = 0; i < 12; i++) points.push({ id: 12 + i, x: 7 + rng.normal() * 1.0, y: 7 + rng.normal() * 1.0, cls: 0 })
      for (let i = 0; i < 12; i++) points.push({ id: 24 + i, x: 7 + rng.normal() * 1.0, y: 2 + rng.normal() * 1.0, cls: 1 })
      for (let i = 0; i < 12; i++) points.push({ id: 36 + i, x: 2 + rng.normal() * 1.0, y: 7 + rng.normal() * 1.0, cls: 1 })
      const steps = [
        { curveType: null, annotation: 'SVM with RBF kernel: 4 clusters in XOR pattern — NOT linearly separable.' },
        { curveType: null, annotation: 'Linear SVM would fail: no straight line can separate blue from amber.' },
        { curveType: 'kernel', annotation: 'RBF kernel: maps to higher dimension. Boundary becomes non-linear (curved) in original space.' },
        { curveType: 'kernel', showBoundary: true, annotation: 'Kernel trick SVM: curved boundary separates XOR clusters. φ(x) maps to feature space where linear SVM works.' },
      ]
      return { points, steps, mode: 'svm-kernel', statLabel: 'kernel', statValue: () => 'RBF' }
    }

    case 'one-class-svm': {
      const rng = makeRng(55)
      const points = []
      for (let i = 0; i < 35; i++) points.push({ id: i, x: 5 + rng.normal() * 1.2, y: 5 + rng.normal() * 1.2, cls: 0 })
      const outliers = [[1.0, 2.0], [9.0, 8.5], [1.5, 8.0], [9.5, 1.5], [0.5, 5.0]]
      outliers.forEach((pos, i) => points.push({ id: 35 + i, x: pos[0], y: pos[1], cls: 1 }))
      const steps = [
        { showBoundary: false, annotation: 'One-Class SVM: trained only on "normal" data (blue). Goal: detect outliers.' },
        { showBoundary: false, annotation: 'Normal points form a dense cluster. The model learns their distribution.' },
        { showBoundary: true,  annotation: 'Elliptical decision boundary fitted around normal data. Outside = anomaly.' },
        { showBoundary: true,  annotation: 'Outliers (red) fall outside the boundary. One-Class SVM useful for novelty/anomaly detection.' },
      ]
      return { points, steps, mode: 'one-class-svm', statLabel: 'nu', statValue: () => '0.1' }
    }

    case 'vc-dimension': {
      // 3 points, showing different labelings being shattered
      const points = [
        { id: 0, x: 3.0, y: 4.0, cls: 0 },
        { id: 1, x: 6.0, y: 7.0, cls: 0 },
        { id: 2, x: 8.0, y: 3.0, cls: 0 },
      ]
      const steps = [
        { labelingIdx: null, annotation: 'VC dimension: how many points can a hypothesis class shatter? 3 points placed.' },
        { labelingIdx: 0, annotation: 'Labeling 1: all blue. A linear classifier can separate these.' },
        { labelingIdx: 1, annotation: 'Labeling 2: point 0 is amber. Different boundary rotated to fit.' },
        { labelingIdx: 2, annotation: 'Labeling 3: point 1 is amber. Another boundary position works.' },
        { labelingIdx: 3, annotation: 'Labeling 4: two points amber. A line can still separate.' },
        { labelingIdx: null, annotation: 'VC dim of linear classifiers in 2D = 3: can shatter any 3 points (not all sets of 4). Fundamental limit of model capacity.' },
      ]
      const LABELINGS = [
        [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
      ]
      const BOUNDARY_LINES = [
        { w1: -0.3, w2: 0.4, b: -0.5 },
        { w1: -1.0, w2: 0.5, b: 2.0 },
        { w1: 0.5,  w2: -1.0, b: 2.0 },
        { w1: -0.8, w2: 0.8, b: 0.5 },
      ]
      return { points, steps, LABELINGS, BOUNDARY_LINES, mode: 'vc-dimension', statLabel: 'VC dim', statValue: () => '3' }
    }

    default: // logistic-regression
      return getModeConfigLogistic()
  }
}

function getModeConfigLogistic() {
  const rng = makeRng(17)
  const points = []
  for (let i = 0; i < 25; i++) points.push({ id: i, x: 3 + rng.normal() * 1.2, y: 4 + rng.normal() * 1.2, cls: 0 })
  for (let i = 0; i < 25; i++) points.push({ id: 50 + i, x: 7 + rng.normal() * 1.2, y: 6 + rng.normal() * 1.2, cls: 1 })
  const BOUNDARY_STATES = [
    { w1: -0.5, w2: 0.5, b: 0.2, accuracy: null,  note: 'Iteration 0' },
    { w1: -0.6, w2: 0.7, b: 0.5, accuracy: 72,     note: 'Iteration 5' },
    { w1: -0.8, w2: 0.9, b: 1.2, accuracy: 84,     note: 'Iteration 15' },
    { w1: -1.0, w2: 1.1, b: 2.0, accuracy: 90,     note: 'Iteration 30' },
    { w1: -1.15, w2: 1.2, b: 2.6, accuracy: 94,    note: 'Iteration 50' },
    { w1: -1.2, w2: 1.25, b: 2.8, accuracy: 96,    note: 'Converged' },
  ]
  const steps = [
    { boundaryIdx: null, annotation: '50 data points, 2 classes. Logistic regression will find a linear decision boundary.' },
    ...BOUNDARY_STATES.map((bs, i) => ({
      boundaryIdx: i,
      annotation: `${bs.note}: gradient descent updates boundary.` + (bs.accuracy ? ` Training accuracy: ${bs.accuracy}%.` : ''),
    })),
  ]
  return { points, steps, BOUNDARY_STATES, mode: 'logistic', statLabel: 'accuracy', statValue: s => s.boundaryIdx != null && BOUNDARY_STATES[s.boundaryIdx]?.accuracy ? `${BOUNDARY_STATES[s.boundaryIdx].accuracy}%` : '—' }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DecisionBoundary({ config = {} }) {
  const modeConfig = useMemo(() => getModeConfig(config.mode), [config.mode])
  const { points, steps, mode, statLabel, statValue, BOUNDARY_STATES, svIds, LABELINGS, BOUNDARY_LINES } = modeConfig

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
  const mg = { top: 16, right: 16, bottom: 36, left: 40 }
  const iW = W - mg.left - mg.right
  const iH = H - mg.top  - mg.bottom

  const xScale = useMemo(() => d3.scaleLinear().domain([0, 10]).range([0, iW]), [iW])
  const yScale = useMemo(() => d3.scaleLinear().domain([0, 10]).range([iH, 0]), [iH])

  const gridTicks = [0, 2, 4, 6, 8, 10]

  // Compute boundary line endpoints from w1, w2, b params
  function boundaryLine(w1, w2, b) {
    const y0  = (-w1 * 0 - b) / w2
    const y10 = (-w1 * 10 - b) / w2
    return { x1: xScale(0), y1: yScale(y0), x2: xScale(10), y2: yScale(y10) }
  }

  // Regression line from slope/intercept
  function regressionLine(slope, intercept) {
    return { x1: xScale(0), y1: yScale(intercept), x2: xScale(10), y2: yScale(slope * 10 + intercept) }
  }

  const statVal = statValue(cur)

  // ── Point color logic ──
  function pointColor(p, idx) {
    if (mode === 'vc-dimension' && cur.labelingIdx != null && LABELINGS) {
      const label = LABELINGS[cur.labelingIdx][idx]
      return label === 1 ? '#f59e0b' : '#3b82f6'
    }
    if (mode === 'one-class-svm') return p.cls === 1 ? '#ef4444' : '#3b82f6'
    if (mode === 'svm-kernel') return p.cls === 0 ? '#3b82f6' : '#f59e0b'
    return p.cls === 0 ? '#3b82f6' : '#f59e0b'
  }

  // ── Active boundary ──
  const activeBoundary = useMemo(() => {
    if (mode === 'logistic' && cur.boundaryIdx != null) return BOUNDARY_STATES[cur.boundaryIdx]
    if (mode === 'svm-linear' && cur.boundaryIdx != null) return modeConfig.BOUNDARY_STATES?.[cur.boundaryIdx]
    if (mode === 'vc-dimension' && cur.labelingIdx != null) return BOUNDARY_LINES?.[cur.labelingIdx]
    return null
  }, [cur, mode, BOUNDARY_STATES, BOUNDARY_LINES, modeConfig])

  const bLine = useMemo(() => {
    if (!activeBoundary) return null
    if (mode === 'regression' && cur.lineParams) {
      return regressionLine(cur.lineParams.slope, cur.lineParams.intercept)
    }
    if (activeBoundary.w1 != null) return boundaryLine(activeBoundary.w1, activeBoundary.w2, activeBoundary.b)
    return null
  }, [activeBoundary, cur, mode, xScale, yScale])

  // Regression line for linear-regression mode
  const rLine = useMemo(() => {
    if (mode !== 'regression' || !cur.lineParams) return null
    return regressionLine(cur.lineParams.slope, cur.lineParams.intercept)
  }, [cur, mode, xScale, yScale])

  // Margin lines for SVM
  const marginLines = useMemo(() => {
    if (mode !== 'svm-linear' || !cur.showMargins || !activeBoundary) return null
    const { w1, w2, b } = activeBoundary
    const offset = 1.2 // margin distance in data coords
    return [
      boundaryLine(w1, w2, b - offset * Math.sqrt(w1 ** 2 + w2 ** 2)),
      boundaryLine(w1, w2, b + offset * Math.sqrt(w1 ** 2 + w2 ** 2)),
    ]
  }, [cur, mode, activeBoundary, xScale, yScale])

  // One-class SVM ellipse
  const ellipse = useMemo(() => {
    if (mode !== 'one-class-svm' || !cur.showBoundary) return null
    return { cx: xScale(5), cy: yScale(5), rx: xScale(3) - xScale(0), ry: yScale(2) - yScale(5) }
  }, [cur, mode, xScale, yScale])

  // Kernel SVM curved boundary (approximated as ellipse)
  const kernelBoundary = useMemo(() => {
    if (mode !== 'svm-kernel' || !cur.showBoundary) return null
    return null // rendered as SVG path below
  }, [cur, mode])

  return (
    <div className="flex flex-col gap-3">
      {/* Stat pill */}
      <div className="flex items-center gap-3 px-3 py-2 rounded bg-surface-700 border border-surface-600 text-xs font-mono">
        <span className="text-gray-400">model:</span>
        <span className="text-gray-300">{config.mode || 'logistic-regression'}</span>
        <span className="text-gray-400">|</span>
        <span className="text-gray-400">{statLabel}:</span>
        <span className={`font-bold ${statVal !== '—' ? 'text-green-400' : 'text-gray-600'}`}>{statVal}</span>
      </div>

      {/* Plot */}
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
            {points.map((p, idx) => {
              const color = pointColor(p, idx)
              const isSV = svIds && svIds.has(p.id) && cur.showSV
              const isOutlier = mode === 'one-class-svm' && p.cls === 1

              return (
                <g key={p.id}>
                  <motion.circle
                    cx={xScale(p.x)} cy={yScale(p.y)}
                    animate={{ fill: color }}
                    r={5} fillOpacity={0.8}
                    stroke={p.cls === 0 ? '#1d4ed8' : '#b45309'}
                    strokeWidth={1}
                  />
                  {isSV && (
                    <circle cx={xScale(p.x)} cy={yScale(p.y)} r={10}
                      fill="none" stroke={color} strokeWidth={2} strokeOpacity={0.8} />
                  )}
                </g>
              )
            })}

            {/* Residual lines (regression) */}
            {mode === 'regression' && cur.showResiduals && cur.lineParams && points.map(p => {
              const { slope, intercept } = cur.lineParams
              const yhat = slope * p.x + intercept
              return (
                <line key={`r${p.id}`}
                  x1={xScale(p.x)} y1={yScale(p.y)} x2={xScale(p.x)} y2={yScale(yhat)}
                  stroke="#ef4444" strokeWidth={1} strokeOpacity={0.4} strokeDasharray="2 2"
                />
              )
            })}

            {/* Regression / decision boundary line */}
            {rLine && (
              <motion.line
                animate={{ x1: rLine.x1, y1: rLine.y1, x2: rLine.x2, y2: rLine.y2 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                stroke="#22c55e" strokeWidth={2.5} strokeOpacity={0.9}
              />
            )}

            {/* Logistic / SVM / VC boundary */}
            {bLine && mode !== 'regression' && (
              <motion.line
                animate={{ x1: bLine.x1, y1: bLine.y1, x2: bLine.x2, y2: bLine.y2 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                stroke="#22c55e" strokeWidth={2.5} strokeDasharray={step < steps.length - 1 ? '5 3' : 'none'}
                strokeOpacity={0.9}
              />
            )}

            {/* SVM margin lines */}
            {marginLines && marginLines.map((ml, i) => (
              <motion.line key={i}
                animate={{ x1: ml.x1, y1: ml.y1, x2: ml.x2, y2: ml.y2 }}
                transition={{ duration: 0.4 }}
                stroke="#22c55e" strokeWidth={1.2} strokeDasharray="6 3" strokeOpacity={0.5}
              />
            ))}

            {/* One-Class SVM ellipse */}
            {ellipse && (
              <motion.ellipse
                animate={{ cx: ellipse.cx, cy: ellipse.cy, rx: ellipse.rx, ry: Math.abs(ellipse.ry) }}
                transition={{ duration: 0.4 }}
                fill="none" stroke="#22c55e" strokeWidth={2} strokeDasharray="6 3" strokeOpacity={0.8}
              />
            )}

            {/* Kernel SVM curved boundary (two "S" curves forming quadrant boundaries) */}
            {mode === 'svm-kernel' && cur.showBoundary && (
              <>
                <ellipse cx={xScale(4.5)} cy={yScale(4.5)} rx={xScale(2.2) - xScale(0)} ry={yScale(2) - yScale(4.5)}
                  fill="none" stroke="#22c55e" strokeWidth={2} strokeDasharray="6 3" strokeOpacity={0.7} />
                <ellipse cx={xScale(5.5)} cy={yScale(5.5)} rx={xScale(2.2) - xScale(0)} ry={yScale(2) - yScale(4.5)}
                  fill="none" stroke="#22c55e" strokeWidth={2} strokeDasharray="6 3" strokeOpacity={0.7} />
              </>
            )}

            {/* Axes */}
            <line x1={0} x2={iW} y1={iH} y2={iH} stroke="#374151" />
            <line x1={0} x2={0}  y1={0}  y2={iH} stroke="#374151" />
            {gridTicks.filter(t => t > 0).map(t => (
              <text key={t} x={xScale(t)} y={iH + 14} textAnchor="middle"
                fill="#4b5563" fontSize={9} fontFamily="monospace">{t}</text>
            ))}
            {gridTicks.filter(t => t > 0).map(t => (
              <text key={t} x={-6} y={yScale(t)} textAnchor="end" dominantBaseline="middle"
                fill="#4b5563" fontSize={9} fontFamily="monospace">{t}</text>
            ))}

            {/* Axis labels for regression */}
            {mode === 'regression' && (
              <>
                <text x={iW / 2} y={iH + 30} textAnchor="middle" fill="#4b5563" fontSize={10} fontFamily="Inter,sans-serif">Feature X</text>
                <text transform={`translate(-28,${iH / 2}) rotate(-90)`} textAnchor="middle" fill="#4b5563" fontSize={10} fontFamily="Inter,sans-serif">Target Y</text>
              </>
            )}
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
        {mode === 'regression' ? (
          <>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: '#3b82f6' }} />Data points</span>
            {cur.lineParams && <span className="flex items-center gap-1.5"><span className="w-6 h-0.5 inline-block bg-green-500" />Fitted line</span>}
            {cur.showResiduals && <span className="flex items-center gap-1.5"><span className="w-6 h-0.5 inline-block bg-red-500" />Residuals</span>}
          </>
        ) : mode === 'one-class-svm' ? (
          <>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: '#3b82f6' }} />Normal</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: '#ef4444' }} />Outlier</span>
            {cur.showBoundary && <span className="flex items-center gap-1.5"><span className="w-6 h-0.5 inline-block bg-green-500" />Decision boundary</span>}
          </>
        ) : mode === 'svm-linear' ? (
          <>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: '#3b82f6' }} />Class 0</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: '#f59e0b' }} />Class 1</span>
            {cur.showSV && <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full inline-block border-2 border-gray-400" />Support vector</span>}
            {cur.showMargins && <span className="flex items-center gap-1.5"><span className="w-6 h-0.5 inline-block bg-green-500 opacity-50" />Margin</span>}
          </>
        ) : (
          <>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: '#3b82f6' }} />Class 0</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: '#f59e0b' }} />Class 1</span>
            {(bLine || rLine) && <span className="flex items-center gap-1.5"><span className="w-6 h-0.5 inline-block bg-green-500" />boundary</span>}
          </>
        )}
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
