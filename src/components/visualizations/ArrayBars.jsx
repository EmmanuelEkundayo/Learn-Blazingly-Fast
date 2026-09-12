import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import * as d3 from 'd3'
import StepControls from './StepControls.jsx'
import { useInterval } from '../../hooks/useInterval.js'
import {
  getSteps,
  getDefaultSortArray,
} from '../../utils/algorithms/registry.js'

const SPEED_MS = { 0.5: 1400, 1: 700, 1.5: 467, 2: 350, 3: 233 }

// Bar colour by role
function barColor(idx, step) {
  if (!step) return '#1d4ed8'
  const { pivot, i, j, swapping, sorted, lo, hi, type } = step
  if (sorted[idx]) return '#16a34a'              // green — in final position
  if (swapping.includes(idx)) return '#ef4444'   // red — being swapped
  if (idx === pivot) return '#f59e0b'            // amber — pivot
  if (idx === j && type === 'compare') return '#fde68a' // yellow — comparison target
  if (idx < lo || idx > hi) return '#374151'     // gray — outside active range
  return '#1d4ed8'                               // blue — active range
}

export default function ArrayBars({
  config = {},
  data,
  step: controlledStep,
  progress,
  compact = false,
}) {
  const svgRef   = useRef(null)
  const barsRef  = useRef(null)
  const labelsRef = useRef(null)
  const initDone = useRef(false)

  const inputArray = useMemo(
    () => data?.array ?? getDefaultSortArray(config.mode),
    [data, config.mode]
  )
  const steps = useMemo(
    () => getSteps('sorting', config.mode, inputArray),
    [inputArray, config.mode]
  )

  const [internalStep, setInternalStep] = useState(0)
  const [playing,      setPlaying]      = useState(false)
  const [speed,        setSpeed]        = useState(1)

  const step = progress !== undefined
    ? Math.min(steps.length - 1, Math.max(0, Math.floor(progress * steps.length)))
    : controlledStep !== undefined
    ? Math.min(steps.length - 1, Math.max(0, controlledStep))
    : internalStep

  const setStep = useCallback((valOrFn) => {
    setInternalStep((prev) => {
      const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn
      return Math.min(steps.length - 1, Math.max(0, next))
    })
  }, [steps.length])

  const current = steps[step] || steps[0]

  useInterval(
    () => {
      if (step < steps.length - 1) setStep(s => s + 1)
      else setPlaying(false)
    },
    playing ? SPEED_MS[speed] : null
  )

  // ── D3 setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (initDone.current || !svgRef.current) return
    initDone.current = true

    const el  = svgRef.current
    const svg = d3.select(el)
    svg.selectAll('*').remove()

    const margin = compact
      ? { top: 16, right: 10, bottom: 28, left: 10 }
      : { top: 20, right: 16, bottom: 36, left: 16 }
    const W = el.clientWidth  || 560
    const H = el.clientHeight || (compact ? 170 : 300)
    const inner_W = W - margin.left - margin.right
    const inner_H = H - margin.top  - margin.bottom

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const arr = steps[0].array
    const n   = arr.length
    const max = d3.max(arr)

    const xScale = d3.scaleBand().domain(d3.range(n)).range([0, inner_W]).padding(0.12)
    const yScale = d3.scaleLinear().domain([0, max]).range([inner_H, 0])

    // Bars
    const bars = g.selectAll('rect')
      .data(arr)
      .enter().append('rect')
      .attr('x',      (_, i) => xScale(i))
      .attr('y',      d => yScale(d))
      .attr('width',  xScale.bandwidth())
      .attr('height', d => inner_H - yScale(d))
      .attr('fill', '#1d4ed8')
      .attr('rx', 3)

    // Value labels above bars
    const valLabels = g.selectAll('.val-label')
      .data(arr)
      .enter().append('text')
      .attr('class', 'val-label')
      .attr('x', (_, i) => xScale(i) + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d) - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', '#9ca3af')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', 11)
      .text(d => d)

    // Index labels below bars
    g.selectAll('.idx-label')
      .data(arr)
      .enter().append('text')
      .attr('class', 'idx-label')
      .attr('x', (_, i) => xScale(i) + xScale.bandwidth() / 2)
      .attr('y', inner_H + 18)
      .attr('text-anchor', 'middle')
      .attr('fill', '#6b7280')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', 10)
      .text((_, i) => i)

    // Partition range bracket (lo…hi indicator)
    g.append('line')
      .attr('class', 'range-line')
      .attr('stroke', '#4b5563')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,3')

    barsRef.current   = { bars, valLabels, xScale, yScale, inner_H, max }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── step update ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!barsRef.current || !current) return
    const { bars, valLabels, xScale, yScale, inner_H, max } = barsRef.current

    const arr    = current.array
    const yS     = d3.scaleLinear().domain([0, max]).range([inner_H, 0])

    bars
      .data(arr)
      .transition().duration(compact ? 70 : 180)
      .attr('y',      d => yS(d))
      .attr('height', d => inner_H - yS(d))
      .attr('fill', (_, i) => barColor(i, current))

    valLabels
      .data(arr)
      .transition().duration(compact ? 70 : 180)
      .attr('y', d => yS(d) - 5)
      .text(d => d)
      .attr('fill', (_, i) =>
        current.sorted[i] ? '#4ade80'
        : current.pivot === i ? '#fde68a'
        : '#9ca3af'
      )
  }, [step, current])

  const handleReset = useCallback(() => { setStep(0); setPlaying(false) }, [])

  // Auxiliary info
  const { pivot, lo, hi, type } = current ?? {}

  return (
    <div className="flex flex-col gap-3">
      {/* Auxiliary bar */}
      <div className="flex flex-wrap gap-3 px-1 text-xs font-mono text-gray-400">
        {pivot >= 0 && (
          <span>
            Pivot: <span className="text-ml-400 font-semibold">{current.array[pivot]}</span>
            <span className="ml-1 text-gray-400">(idx {pivot})</span>
          </span>
        )}
        {lo >= 0 && hi >= 0 && lo !== hi && (
          <span>
            Range: <span className="text-dsa-400">[{lo}…{hi}]</span>
          </span>
        )}
        <span className="sm:ml-auto flex flex-wrap gap-x-3 gap-y-1">
          {[
            { color: 'bg-blue-600',   label: 'Active' },
            { color: 'bg-amber-500',  label: 'Pivot' },
            { color: 'bg-yellow-200', label: 'Comparing' },
            { color: 'bg-red-500',    label: 'Swapping' },
            { color: 'bg-green-600',  label: 'Sorted' },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1">
              <span className={`inline-block w-2.5 h-2.5 rounded-sm ${color}`} />
              {label}
            </span>
          ))}
        </span>
      </div>

      {/* Canvas */}
      <div className="rounded-lg overflow-hidden border border-surface-600 bg-surface-800">
        <svg ref={svgRef} className={`w-full ${compact ? 'h-[160px]' : 'h-[220px] sm:h-[300px]'}`} />
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
