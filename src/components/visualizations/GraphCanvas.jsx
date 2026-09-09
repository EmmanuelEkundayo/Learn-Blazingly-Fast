import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import * as d3 from 'd3'
import { motion, AnimatePresence } from 'framer-motion'
import StepControls from './StepControls.jsx'
import { useInterval } from '../../hooks/useInterval.js'
import {
  getSteps,
  getDefaultGraphData,
} from '../../utils/algorithms/registry.js'

// ─── colour palette ──────────────────────────────────────────────────────────
const C = {
  nodeBg:        '#1c1c22',
  nodeStroke:    '#4b5563',
  nodeVisited:   '#1e40af',
  nodeCurrent:   '#f59e0b',
  nodeInQueue:   '#1d4ed8',
  nodeEnqueued:  '#3b82f6',
  edgeDefault:   '#374151',
  edgeActive:    '#60a5fa',
  edgeSkip:      '#ef4444',
  textDefault:   '#9ca3af',
  textActive:    '#ffffff',
}

const SPEED_MS = { 0.5: 1600, 1: 800, 1.5: 533, 2: 400, 3: 267 }
const NODE_R = 22

export default function GraphCanvas({ config = {}, data }) {
  const svgRef   = useRef(null)
  const simRef   = useRef(null)
  const nodesRef = useRef(null) // d3 selection
  const edgesRef = useRef(null) // d3 selection
  const initDone = useRef(false)

  // ── graph data (use mode-specific defaults; caller can override via `data` prop) ──
  const defaultGraph = useMemo(() => getDefaultGraphData(config.mode), [config.mode])
  const graphNodes = useMemo(() => data?.nodes ?? defaultGraph.nodes.map(n => ({ ...n })), [data, defaultGraph])
  const graphEdges = useMemo(() => data?.edges ?? defaultGraph.edges.map(e => ({ ...e })), [data, defaultGraph])
  const adjacency  = useMemo(() => data?.adjacency ?? defaultGraph.adjacency, [data, defaultGraph])
  const startNode  = data?.start ?? 0
  const directed   = config.directed ?? false

  // ── steps ──────────────────────────────────────────────────────────────
  const steps = useMemo(() => getSteps('graph', config.mode, adjacency, startNode), [adjacency, startNode, config.mode])

  const [step,    setStep]    = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed,   setSpeed]   = useState(1)

  const current = steps[step]

  // ── auto-play ──────────────────────────────────────────────────────────
  useInterval(
    () => {
      if (step < steps.length - 1) setStep((s) => s + 1)
      else setPlaying(false)
    },
    playing ? SPEED_MS[speed] : null
  )

  // ── D3 setup (runs once) ───────────────────────────────────────────────
  useEffect(() => {
    if (initDone.current || !svgRef.current) return
    initDone.current = true

    const el    = svgRef.current
    const W     = el.clientWidth  || 560
    const H     = el.clientHeight || 400
    const svg   = d3.select(el)

    svg.selectAll('*').remove()

    // Arrow marker for directed graphs
    if (directed) {
      svg.append('defs').append('marker')
        .attr('id', 'arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', NODE_R + 10)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', C.edgeDefault)
    }

    // Force simulation
    const nodes = graphNodes.map(n => ({ ...n }))
    const edges = graphEdges.map(e => ({
      source: typeof e.source === 'object' ? e.source.id : e.source,
      target: typeof e.target === 'object' ? e.target.id : e.target,
    }))

    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id(d => d.id).distance(90))
      .force('charge', d3.forceManyBody().strength(-350))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide(NODE_R + 8))

    // Edges
    const edgeG = svg.append('g').attr('class', 'edges')
    const edgeEl = edgeG.selectAll('line')
      .data(edges)
      .enter().append('line')
      .attr('class', 'edge')
      .attr('stroke', C.edgeDefault)
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.7)
      .attr('marker-end', directed ? 'url(#arrow)' : null)

    // Node groups
    const nodeG = svg.append('g').attr('class', 'nodes')
    const nodeEl = nodeG.selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('class', 'node')
      .style('cursor', 'grab')
      .call(
        d3.drag()
          .on('start', (event, d) => {
            if (!event.active) sim.alphaTarget(0.3).restart()
            d.fx = d.x; d.fy = d.y
          })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
          .on('end', (event, d) => {
            if (!event.active) sim.alphaTarget(0)
            d.fx = null; d.fy = null
          })
      )

    nodeEl.append('circle')
      .attr('r', NODE_R)
      .attr('fill', C.nodeBg)
      .attr('stroke', C.nodeStroke)
      .attr('stroke-width', 2)

    nodeEl.append('text')
      .text(d => d.id)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', C.textDefault)
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', 13)
      .attr('font-weight', '600')
      .attr('pointer-events', 'none')

    sim.on('tick', () => {
      edgeEl
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
      nodeEl.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    // Store refs for step-update effect
    simRef.current   = sim
    nodesRef.current = nodeEl
    edgesRef.current = { el: edgeEl, data: edges }

    return () => sim.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── step update: repaint highlights ───────────────────────────────────
  useEffect(() => {
    if (!nodesRef.current || !current) return

    const { activeNode, activeEdge, visited, queue, type } = current

    // Node colours
    nodesRef.current.select('circle')
      .transition().duration(200)
      .attr('fill', d => {
        if (d.id === activeNode && type === 'dequeue') return C.nodeCurrent
        if (d.id === activeNode && type === 'enqueue') return C.nodeEnqueued
        if (visited.has(d.id))  return C.nodeVisited
        if (queue.includes(d.id)) return C.nodeInQueue
        return C.nodeBg
      })
      .attr('stroke', d => {
        if (d.id === activeNode) return C.nodeCurrent
        return C.nodeStroke
      })
      .attr('stroke-width', d => d.id === activeNode ? 3 : 2)

    nodesRef.current.select('text')
      .attr('fill', d =>
        visited.has(d.id) || d.id === activeNode ? C.textActive : C.textDefault
      )

    // Edge colours
    if (edgesRef.current) {
      const { el, data: edata } = edgesRef.current
      el.transition().duration(200)
        .attr('stroke', d => {
          const u = typeof d.source === 'object' ? d.source.id : d.source
          const v = typeof d.target === 'object' ? d.target.id : d.target
          if (!activeEdge) return C.edgeDefault
          const [au, av] = activeEdge
          if ((u === au && v === av) || (!directed && u === av && v === au))
            return type === 'skip' ? C.edgeSkip : C.edgeActive
          return C.edgeDefault
        })
        .attr('stroke-width', d => {
          const u = typeof d.source === 'object' ? d.source.id : d.source
          const v = typeof d.target === 'object' ? d.target.id : d.target
          if (!activeEdge) return 2
          const [au, av] = activeEdge
          if ((u === au && v === av) || (!directed && u === av && v === au)) return 3
          return 2
        })
        .attr('stroke-opacity', d => {
          const u = typeof d.source === 'object' ? d.source.id : d.source
          const v = typeof d.target === 'object' ? d.target.id : d.target
          if (!activeEdge) return 0.5
          const [au, av] = activeEdge
          if ((u === au && v === av) || (!directed && u === av && v === au)) return 1
          return 0.35
        })
    }
  }, [step, current, directed])

  // ── controls ───────────────────────────────────────────────────────────
  const handleReset = useCallback(() => { setStep(0); setPlaying(false) }, [])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Canvas */}
        <div className="relative flex-1 rounded-lg overflow-hidden border border-surface-600 bg-surface-800">
          <svg ref={svgRef} className="w-full h-[280px] sm:h-[400px]" />
          {/* Legend */}
          <div className="absolute bottom-2 left-2 flex flex-wrap gap-x-3 gap-y-1">
            {[
              { color: C.nodeBg,      label: 'Unvisited' },
              { color: C.nodeInQueue, label: 'In queue' },
              { color: C.nodeVisited, label: 'Visited' },
              { color: C.nodeCurrent, label: 'Current' },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1 text-xs text-gray-400">
                <span className="inline-block w-2.5 h-2.5 rounded-full border border-gray-500" style={{ backgroundColor: color }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Side panel — queue & visited */}
        {(config.show_queue !== false || config.show_visited !== false) && (
          <div className="w-full sm:w-36 flex flex-col sm:flex-row gap-2 shrink-0">
            {config.show_queue !== false && (
              <SidePanel title="Queue" items={current?.queue ?? []} accent="dsa" />
            )}
            {config.show_visited !== false && (
              <SidePanel title="Visited" items={current?.visitedOrder ?? []} accent="green" />
            )}
          </div>
        )}
      </div>

      {/* Step controls */}
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

function SidePanel({ title, items, accent }) {
  const accentClass = accent === 'dsa' ? 'text-dsa-400' : 'text-green-400'
  return (
    <div className="rounded bg-surface-700 border border-surface-600 p-2">
      <p className={`text-xs font-semibold mb-1.5 font-mono ${accentClass}`}>{title}</p>
      <div className="flex flex-col gap-1">
        <AnimatePresence>
          {items.length === 0 ? (
            <span className="text-xs text-gray-500 font-mono">—</span>
          ) : (
            items.map((id, idx) => (
              <motion.span
                key={`${id}-${idx}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.15 }}
                className="text-xs font-mono px-1.5 py-0.5 rounded bg-surface-600 text-gray-200 w-fit"
              >
                {id}
              </motion.span>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
