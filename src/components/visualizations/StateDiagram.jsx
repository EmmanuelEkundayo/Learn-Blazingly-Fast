import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import StepControls from './StepControls.jsx'
import { useInterval } from '../../hooks/useInterval.js'

const SPEED_MS = { 0.5: 2000, 1: 1000, 1.5: 667, 2: 500, 3: 333 }

const BOX_W = 108
const BOX_H = 52
const GAP_X = 64
const GAP_Y = 56

function computeLayout(states) {
  const n    = states.length
  const cols = n <= 3 ? n : n <= 6 ? Math.ceil(n / 2) : Math.ceil(Math.sqrt(n))
  const rows = Math.ceil(n / cols)
  const W    = cols * BOX_W + (cols - 1) * GAP_X + 40
  const H    = rows * BOX_H + (rows - 1) * GAP_Y + 40

  const positions = states.map((_, i) => {
    const row = Math.floor(i / cols)
    const col = i % cols
    // centre-align last partial row
    const rowCount   = Math.min(cols, n - row * cols)
    const rowOffsetX = ((cols - rowCount) * (BOX_W + GAP_X)) / 2
    return {
      x: 20 + rowOffsetX + col * (BOX_W + GAP_X) + BOX_W / 2,
      y: 20 + row * (BOX_H + GAP_Y) + BOX_H / 2,
    }
  })

  return { W, H, positions }
}

export default function StateDiagram({ config = {} }) {
  const states      = config.states      || []
  const transitions = config.transitions || []
  const steps       = config.steps       || [{ active_state: null, active_transition: null, annotation: 'State machine overview.' }]

  const [idx, setIdx]         = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed]     = useState(1)

  const cur              = steps[idx]
  const activeState      = cur?.active_state      ?? null
  const activeTransition = cur?.active_transition ?? null   // { from, to }

  useInterval(
    () => { if (idx < steps.length - 1) setIdx(i => i + 1); else setPlaying(false) },
    playing ? SPEED_MS[speed] : null,
  )

  const handleReset = useCallback(() => { setIdx(0); setPlaying(false) }, [])

  if (states.length === 0) {
    return (
      <div className="rounded-lg border border-surface-600 bg-surface-800 min-h-[200px] flex items-center justify-center text-gray-400 text-sm">
        No states config provided.
      </div>
    )
  }

  const { W, H, positions } = computeLayout(states)
  const stateIdx = Object.fromEntries(states.map((s, i) => [s.id, i]))

  function edgeIsActive(t) {
    return activeTransition && activeTransition.from === t.from && activeTransition.to === t.to
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-surface-600 bg-surface-800 p-2 overflow-x-auto">
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxHeight: 320 }}>
          <defs>
            {transitions.map((t, i) => {
              const color = edgeIsActive(t) ? '#f59e0b' : '#4b5563'
              return (
                <marker key={i} id={`arr-${i}`} markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
                  <path d="M0,0 L0,7 L7,3.5 z" fill={color} />
                </marker>
              )
            })}
          </defs>

          {/* Transition arrows */}
          {transitions.map((t, i) => {
            const fi = stateIdx[t.from]
            const ti = stateIdx[t.to]
            if (fi === undefined || ti === undefined) return null

            const fp     = positions[fi]
            const tp     = positions[ti]
            const active = edgeIsActive(t)
            const color  = active ? '#f59e0b' : '#4b5563'

            const dx = tp.x - fp.x
            const dy = tp.y - fp.y
            const dist = Math.sqrt(dx * dx + dy * dy) || 1
            const ux = dx / dist, uy = dy / dist

            // Offset from box edge
            const hw = BOX_W / 2 + 5, hh = BOX_H / 2 + 4
            const scaleFrom = Math.min(hw / Math.abs(ux || 1), hh / Math.abs(uy || 1))
            const scaleTo   = Math.min(hw / Math.abs(ux || 1), hh / Math.abs(uy || 1))

            const x1 = fp.x + ux * Math.min(scaleFrom, dist / 2 - 2)
            const y1 = fp.y + uy * Math.min(scaleFrom, dist / 2 - 2)
            const x2 = tp.x - ux * Math.min(scaleTo + 6, dist / 2 - 2)
            const y2 = tp.y - uy * Math.min(scaleTo + 6, dist / 2 - 2)

            // Slight curve for self-loops or parallel edges
            const isSelf = t.from === t.to
            const mx = (x1 + x2) / 2 - uy * 18
            const my = (y1 + y2) / 2 + ux * 18

            return (
              <g key={i}>
                {isSelf ? (
                  <path d={`M${fp.x - 12},${fp.y - BOX_H / 2} C${fp.x - 30},${fp.y - 70} ${fp.x + 30},${fp.y - 70} ${fp.x + 12},${fp.y - BOX_H / 2}`}
                    stroke={color} strokeWidth={active ? 2 : 1} fill="none"
                    strokeOpacity={active ? 1 : 0.55} markerEnd={`url(#arr-${i})`} />
                ) : (
                  <path d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`}
                    stroke={color} strokeWidth={active ? 2 : 1} fill="none"
                    strokeOpacity={active ? 1 : 0.55} markerEnd={`url(#arr-${i})`} />
                )}
                {t.label && (
                  <text x={(x1 + x2) / 2 - uy * 22} y={(y1 + y2) / 2 + ux * 22 - 2}
                    textAnchor="middle" fill={color} fontSize={8} fontFamily="monospace"
                    opacity={active ? 1 : 0.7}>
                    {t.label}
                  </text>
                )}
              </g>
            )
          })}

          {/* State boxes */}
          {states.map((state, i) => {
            const pos      = positions[i]
            const isActive = state.id === activeState

            return (
              <g key={state.id} transform={`translate(${pos.x - BOX_W / 2},${pos.y - BOX_H / 2})`}>
                <motion.rect
                  width={BOX_W} height={BOX_H} rx={8}
                  animate={{
                    fill:   isActive ? 'rgba(59,130,246,0.20)' : '#1c1c22',
                    stroke: isActive ? '#3b82f6' : '#374151',
                  }}
                  transition={{ duration: 0.3 }}
                  strokeWidth={2}
                />
                <text x={BOX_W / 2} y={state.sub ? BOX_H / 2 - 7 : BOX_H / 2 + 4}
                  textAnchor="middle"
                  fill={isActive ? '#93c5fd' : '#9ca3af'}
                  fontSize={11} fontFamily="Inter,sans-serif" fontWeight="700">
                  {state.label}
                </text>
                {state.sub && (
                  <text x={BOX_W / 2} y={BOX_H / 2 + 9}
                    textAnchor="middle"
                    fill={isActive ? '#60a5fa' : '#4b5563'}
                    fontSize={8} fontFamily="monospace">
                    {state.sub}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
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
