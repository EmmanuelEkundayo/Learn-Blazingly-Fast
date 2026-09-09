import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import StepControls from './StepControls.jsx'
import { useInterval } from '../../hooks/useInterval.js'

const SPEED_MS = { 0.5: 1600, 1: 800, 1.5: 533, 2: 400, 3: 267 }
const DEFAULT_ARRAY  = [2, 5, 8, 12, 16, 23, 38, 45, 56, 72, 91, 99]
const DEFAULT_TARGET = 23
import { getSteps } from '../../utils/algorithms/registry.js'

export default function ArrayPointers({ config = {} }) {
  const arr    = DEFAULT_ARRAY
  const target = DEFAULT_TARGET
  const steps  = useMemo(() => getSteps('search', config.mode, arr, target), [arr, target, config.mode])

  const [step,    setStep]    = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed,   setSpeed]   = useState(1)

  const cur = steps[step]

  useInterval(
    () => { if (step < steps.length - 1) setStep(s => s + 1); else setPlaying(false) },
    playing ? SPEED_MS[speed] : null,
  )

  const handleReset = useCallback(() => { setStep(0); setPlaying(false) }, [])

  const CELL = 48

  return (
    <div className="flex flex-col gap-4">
      {/* Target banner */}
      <div className="flex items-center gap-3 px-3 py-2 rounded bg-surface-700 border border-surface-600 text-sm font-mono">
        <span className="text-gray-400">target =</span>
        <span className="text-amber-400 font-bold">{target}</span>
        <AnimatePresence>
          {cur.found && (
            <motion.span key="found" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="ml-auto text-green-400 font-semibold text-xs">
              ✓ found at index {cur.mid}
            </motion.span>
          )}
          {cur.done && !cur.found && (
            <motion.span key="nf" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="ml-auto text-red-400 font-semibold text-xs">
              ✗ not found
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Array cells + pointer labels */}
      <div className="overflow-x-auto pb-2">
        <div style={{ display: 'inline-flex', flexDirection: 'column' }}>
          <div className="flex">
            {arr.map((val, i) => {
              const inRange = cur.lo != null && cur.hi != null && i >= cur.lo && i <= cur.hi
              const isMid   = cur.mid === i
              const isLo    = cur.lo  === i
              const isHi    = cur.hi  === i
              const isFound = cur.found && isMid

              let bg = '#0d0d10', border = '#2d2d35', tc = '#4b5563'
              if      (isFound)  { bg = '#14532d'; border = '#22c55e'; tc = '#86efac' }
              else if (isMid)    { bg = '#451a03'; border = '#f59e0b'; tc = '#fcd34d' }
              else if (inRange)  { bg = '#1e293b'; border = '#3b82f6'; tc = '#e2e8f0' }
              if ((isLo || isHi) && !isMid && !isFound) border = '#60a5fa'

              return (
                <motion.div key={i}
                  animate={{ backgroundColor: bg, borderColor: border }}
                  transition={{ duration: 0.22 }}
                  style={{ width: CELL, height: CELL, borderWidth: 2 }}
                  className="flex flex-col items-center justify-center border rounded-sm"
                >
                  <span style={{ color: tc }} className="text-sm font-mono font-bold leading-none">{val}</span>
                  <span className="text-[9px] text-gray-300 font-mono mt-0.5">{i}</span>
                </motion.div>
              )
            })}
          </div>

          {/* Pointer labels below cells */}
          <div className="flex mt-1" style={{ height: 18 }}>
            {arr.map((_, i) => {
              const tags = []
              if (cur.lo  === i) tags.push({ t: 'lo',  c: '#60a5fa' })
              if (cur.hi  === i) tags.push({ t: 'hi',  c: '#60a5fa' })
              if (cur.mid === i) tags.push({ t: 'mid', c: '#f59e0b' })
              return (
                <div key={i} style={{ width: CELL }} className="flex justify-center items-start gap-px">
                  <AnimatePresence>
                    {tags.map(({ t, c }) => (
                      <motion.span key={t} initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                        style={{ color: c }} className="text-[9px] font-mono font-bold leading-none">
                        {t}
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
        {[
          ['#3b82f6', '#1e293b', 'active window (lo…hi)'],
          ['#f59e0b', '#451a03', 'mid — comparing'],
          ['#22c55e', '#14532d', 'found'],
        ].map(([border, bg, label]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-sm border-2 inline-block shrink-0"
              style={{ borderColor: border, backgroundColor: bg }} />
            {label}
          </span>
        ))}
      </div>

      <StepControls
        step={step} totalSteps={steps.length} playing={playing} speed={speed}
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
