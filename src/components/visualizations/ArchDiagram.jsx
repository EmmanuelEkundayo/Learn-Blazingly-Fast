import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import StepControls from './StepControls.jsx'
import { useInterval } from '../../hooks/useInterval.js'

const SPEED_MS = { 0.5: 2000, 1: 1000, 1.5: 667, 2: 500, 3: 333 }

const PALETTE = [
  { bg: 'rgba(59,130,246,0.13)',  border: '#3b82f6', text: '#93c5fd',  item: 'rgba(59,130,246,0.08)'  },
  { bg: 'rgba(139,92,246,0.13)', border: '#8b5cf6', text: '#c4b5fd',  item: 'rgba(139,92,246,0.08)' },
  { bg: 'rgba(16,185,129,0.13)', border: '#10b981', text: '#6ee7b7',  item: 'rgba(16,185,129,0.08)' },
  { bg: 'rgba(245,158,11,0.13)', border: '#f59e0b', text: '#fcd34d',  item: 'rgba(245,158,11,0.08)' },
  { bg: 'rgba(239,68,68,0.13)',  border: '#ef4444', text: '#fca5a5',  item: 'rgba(239,68,68,0.08)'  },
  { bg: 'rgba(236,72,153,0.13)', border: '#ec4899', text: '#f9a8d4',  item: 'rgba(236,72,153,0.08)' },
]

export default function ArchDiagram({ config = {} }) {
  const layers = config.layers || []
  const steps  = config.steps  || [{ active_layer: -1, annotation: 'System architecture — step through to trace request flow.' }]

  const [idx, setIdx]         = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed]     = useState(1)

  const cur         = steps[idx]
  const activeLayer = cur?.active_layer ?? -1

  useInterval(
    () => { if (idx < steps.length - 1) setIdx(i => i + 1); else setPlaying(false) },
    playing ? SPEED_MS[speed] : null,
  )

  const handleReset = useCallback(() => { setIdx(0); setPlaying(false) }, [])

  if (layers.length === 0) {
    return (
      <div className="rounded-lg border border-surface-600 bg-surface-800 min-h-[200px] flex items-center justify-center text-gray-400 text-sm">
        No architecture config provided.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-surface-600 bg-surface-800 p-4 overflow-x-auto">
        <div className="flex items-start gap-0 min-w-max">
          {layers.map((layer, li) => {
            const isActive = activeLayer === li
            const c = PALETTE[li % PALETTE.length]

            return (
              <div key={li} className="flex items-center">
                {/* Layer column */}
                <motion.div
                  animate={{
                    borderColor:     isActive ? c.border : '#374151',
                    backgroundColor: isActive ? c.bg     : 'transparent',
                  }}
                  transition={{ duration: 0.3 }}
                  className="rounded-xl border-2 p-3 flex flex-col gap-1.5"
                  style={{ minWidth: 100 }}
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-wider text-center"
                    style={{ color: isActive ? c.text : '#6b7280' }}
                  >
                    {layer.label}
                  </p>
                  <div className="flex flex-col gap-1">
                    {(layer.items || []).map((item, ii) => (
                      <motion.div
                        key={ii}
                        animate={{
                          backgroundColor: isActive ? c.item : '#1c1c22',
                          borderColor:     isActive ? c.border + '55' : '#2d2d38',
                          color:           isActive ? '#e5e7eb' : '#4b5563',
                        }}
                        transition={{ duration: 0.3 }}
                        className="text-[10px] text-center px-2 py-1 rounded font-mono leading-tight border"
                      >
                        {item}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Flow arrow */}
                {li < layers.length - 1 && (
                  <div className="flex flex-col items-center justify-center w-7 shrink-0 mt-6">
                    <motion.span
                      animate={{ color: activeLayer === li ? '#9ca3af' : '#374151' }}
                      className="text-sm font-mono"
                    >
                      →
                    </motion.span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <StepControls
        step={idx} totalSteps={steps.length} playing={playing} speed={speed}
        annotation={cur?.annotation}
        onPrev={() => { setPlaying(false); setIdx(i => Math.max(0, i - 1)) }}
        onNext={() => { setPlaying(false); setIdx(i => Math.min(steps.length - 1, i + 1)) }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onReset={handleReset}
        onSpeedChange={setSpeed}
      />
    </div>
  )
}
