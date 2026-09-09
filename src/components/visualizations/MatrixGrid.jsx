import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import StepControls from './StepControls.jsx'
import { useInterval } from '../../hooks/useInterval.js'
import {
  getSteps,
  DEFAULT_KNAPSACK,
} from '../../utils/algorithms/registry.js'

const SPEED_MS = { 0.5: 1400, 1: 700, 1.5: 467, 2: 350, 3: 233 }

export default function MatrixGrid({ config = {}, data }) {
  const knapsack = useMemo(
    () => ({
      weights: data?.weights ?? DEFAULT_KNAPSACK.weights,
      values:  data?.values  ?? DEFAULT_KNAPSACK.values,
      W:       data?.W       ?? DEFAULT_KNAPSACK.W,
      labels:  data?.labels  ?? DEFAULT_KNAPSACK.itemLabels,
    }),
    [data]
  )

  const steps = useMemo(
    () => getSteps('dp', config.mode, knapsack.weights, knapsack.values, knapsack.W),
    [knapsack, config.mode]
  )

  const [step,    setStep]    = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed,   setSpeed]   = useState(1)

  const current = steps[step]

  useInterval(
    () => {
      if (step < steps.length - 1) setStep(s => s + 1)
      else setPlaying(false)
    },
    playing ? SPEED_MS[speed] : null
  )

  const handleReset = useCallback(() => { setStep(0); setPlaying(false) }, [])

  const { dp, activeCell, sourceCells, tookItem } = current ?? {}
  const n = knapsack.weights.length
  const W = knapsack.W

  // Cell colour class
  function cellClass(i, w) {
    if (!activeCell) return ''
    const [ai, aw] = activeCell
    if (i === ai && w === aw) return 'active'
    if (sourceCells?.some(([si, sw]) => si === i && sw === w)) return 'source'
    if (i === 0) return 'header'
    if (dp?.[i]?.[w] > 0) return 'filled'
    return ''
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Items legend */}
      <div className="flex flex-wrap gap-2 text-xs font-mono">
        {knapsack.weights.map((w, i) => (
          <span
            key={i}
            className="px-2 py-0.5 rounded bg-surface-700 border border-surface-600 text-gray-300"
          >
            {knapsack.labels[i]}: w={w}, v={knapsack.values[i]}
          </span>
        ))}
        <span className="ml-auto px-2 py-0.5 rounded bg-surface-700 border border-surface-600 text-gray-400">
          Capacity W = {W}
        </span>
      </div>

      {/* DP Table */}
      <div className="rounded-lg overflow-auto border border-surface-600 bg-surface-800 scrollbar-thin">
        <table className="border-collapse text-xs font-mono">
          <thead>
            <tr>
              <th className="px-2 py-1.5 text-gray-400 text-right font-normal border-b border-r border-surface-600 min-w-[3.5rem]">
                i \ w
              </th>
              {Array.from({ length: W + 1 }, (_, w) => (
                <th
                  key={w}
                  className="px-2 py-1.5 text-gray-400 text-center font-normal border-b border-surface-600 min-w-[2.5rem]"
                >
                  {w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: n + 1 }, (_, i) => (
              <tr key={i}>
                {/* Row header */}
                <td className="px-2 py-1.5 text-gray-400 text-right border-r border-surface-600 whitespace-nowrap">
                  {i === 0 ? '—' : `${knapsack.labels[i - 1]} (${i})`}
                </td>
                {Array.from({ length: W + 1 }, (_, w) => {
                  const cls = cellClass(i, w)
                  return (
                    <td
                      key={w}
                      className={`
                        text-center border border-surface-700 transition-colors duration-150
                        ${cls === 'active'  ? 'bg-ml-500/30 border-ml-400 text-white font-bold' : ''}
                        ${cls === 'source'  ? 'bg-dsa-600/30 border-dsa-400 text-dsa-300' : ''}
                        ${cls === 'filled'  ? 'text-gray-300' : 'text-gray-600'}
                        ${cls === 'header'  ? 'text-gray-500' : ''}
                      `}
                      style={{ padding: '5px 8px' }}
                    >
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={`${i}-${w}-${dp?.[i]?.[w]}`}
                          initial={cls === 'active' ? { scale: 1.4, opacity: 0 } : false}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.15 }}
                        >
                          {dp?.[i]?.[w] ?? 0}
                        </motion.span>
                      </AnimatePresence>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Current decision */}
      {activeCell && activeCell[0] > 0 && (
        <div className="flex items-center gap-2 text-xs font-mono px-1">
          <span className="text-gray-400">Filling dp[{activeCell[0]}][{activeCell[1]}]:</span>
          <span className={tookItem ? 'text-green-400' : 'text-gray-400'}>
            {tookItem ? '✓ TAKE' : '✗ SKIP'}
          </span>
          {tookItem && sourceCells?.[0] && (
            <span className="text-gray-400">
              ← dp[{sourceCells[0][0]}][{sourceCells[0][1]}] + {knapsack.values[activeCell[0] - 1]}
            </span>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 text-xs font-mono px-1">
        {[
          { label: 'Active cell',   className: 'bg-ml-500/40 border border-ml-400' },
          { label: 'Source cell',   className: 'bg-dsa-600/40 border border-dsa-400' },
        ].map(({ label, className }) => (
          <span key={label} className="flex items-center gap-1.5 text-gray-400">
            <span className={`inline-block w-3 h-3 rounded-sm ${className}`} />
            {label}
          </span>
        ))}
      </div>

      <StepControls
        step={step}
        totalSteps={steps.length}
        playing={playing}
        speed={speed}
        annotation={current?.annotation}
        onPrev={() => { setPlaying(false); setStep(s => Math.max(0, s - 1)) }}
        onNext={() => { setPlaying(false); setStep(s => Math.min(steps.length - 1, s + 1)) }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onReset={handleReset}
        onSpeedChange={setSpeed}
      />
    </div>
  )
}
