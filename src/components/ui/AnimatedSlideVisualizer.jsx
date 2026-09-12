import { useMemo } from 'react'
import { getConceptVizCategory } from '../../utils/visualizerPlayback.js'

/**
 * Animated Concept Visualizer Component for Slide 2 in TikTok Exporter.
 * Plays the concept visualization dynamically across the slide's time frame.
 */
export default function AnimatedSlideVisualizer({ concept, progress = 1.0, capturedVisualUrl }) {
  const category = useMemo(() => getConceptVizCategory(concept), [concept])

  // If user has a captured snapshot and is in static carousel mode (progress === 1), use captured image
  if (capturedVisualUrl && progress === 1.0) {
    return (
      <img
        src={capturedVisualUrl}
        alt={concept.title}
        className="max-h-full max-w-full object-contain filter drop-shadow-sm"
      />
    )
  }

  return (
    <div className="w-full h-full flex flex-col justify-between p-3 relative overflow-hidden bg-[#111622] rounded-xl border border-[#1e2638]">
      {/* Live Active Header */}
      <div className="flex items-center justify-between text-[11px] font-mono border-b border-[#1e2638]/70 pb-2">
        <span className="flex items-center gap-1.5 text-blue-400 font-bold">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span>LIVE SIMULATION</span>
        </span>
        <span className="text-slate-400 font-medium">
          {Math.round(progress * 100)}% EXECUTED
        </span>
      </div>

      {/* Dynamic Animated Body */}
      <div className="flex-1 flex items-center justify-center my-auto py-2">
        {category === 'sorting' && <AnimatedSortingBars progress={progress} />}
        {category === 'search' && <AnimatedSearchPointers progress={progress} />}
        {category === 'graph' && <AnimatedGraphTraversal progress={progress} />}
        {category === 'tree' && <AnimatedTreeTraversal progress={progress} />}
        {category === 'dp' && <AnimatedMatrixGrid progress={progress} />}
        {category === 'lifecycle' && <AnimatedLifecycleFlow progress={progress} />}
        {category === 'neural' && <AnimatedNeuralNet progress={progress} />}
        {category === 'architecture' && <AnimatedArchitecture progress={progress} />}
        {category === 'timeline' && <AnimatedTimeline progress={progress} />}
      </div>

      {/* Synchronized Progress Track */}
      <div className="w-full bg-[#1e2638] h-1.5 rounded-full overflow-hidden mt-1">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-100 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
        />
      </div>
    </div>
  )
}

function AnimatedSortingBars({ progress }) {
  const initial = [18, 42, 28, 70, 35, 55, 88, 62]
  const sorted = [18, 28, 35, 42, 55, 62, 70, 88]
  const n = initial.length
  const stepIdx = Math.min(n - 1, Math.floor(progress * n))
  const isComplete = progress >= 0.92

  return (
    <div className="w-full flex items-end justify-center gap-2 h-36 px-2">
      {initial.map((startVal, i) => {
        const endVal = sorted[i]
        const currentVal = Math.round(startVal + (endVal - startVal) * Math.min(1, progress * 1.2))
        const hPct = Math.round((currentVal / 88) * 100)
        const isSorted = isComplete || i <= stepIdx
        const isComparing = !isSorted && i === stepIdx + 1

        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] font-mono font-bold text-slate-300">{currentVal}</span>
            <div
              className={`w-full rounded-t-md transition-all duration-150 ${
                isSorted
                  ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30'
                  : isComparing
                  ? 'bg-amber-400 shadow-sm shadow-amber-400/30'
                  : 'bg-blue-600'
              }`}
              style={{ height: `${Math.max(15, hPct)}%` }}
            />
            <span className="text-[9px] font-mono text-slate-500">[{i}]</span>
          </div>
        )
      })}
    </div>
  )
}

function AnimatedSearchPointers({ progress }) {
  const items = [2, 5, 8, 12, 16, 23, 38, 56]
  const targetIdx = 3
  const isFound = progress >= 0.65

  return (
    <div className="w-full flex flex-col items-center gap-3">
      <div className="grid grid-cols-8 gap-1.5 w-full">
        {items.map((val, i) => {
          const isMid = i === targetIdx
          const isTarget = isMid && isFound

          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={`w-full aspect-square rounded-lg flex items-center justify-center font-mono font-bold text-xs transition-all duration-200 ${
                  isTarget
                    ? 'bg-emerald-500/30 border-2 border-emerald-400 text-white shadow-lg shadow-emerald-500/30'
                    : isMid
                    ? 'bg-blue-500/20 border-2 border-blue-400 text-white shadow-md shadow-blue-500/20'
                    : 'bg-[#161d2d] border border-[#1e2638] text-slate-300'
                }`}
              >
                {val}
              </div>
              <span className={`text-[9px] font-mono ${isMid ? 'text-blue-400 font-bold' : 'text-slate-500'}`}>
                [{i}]
              </span>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-2 text-xs font-mono">
        <span className="text-slate-400">Low: [0]</span>
        <span className="text-blue-400 font-bold">▲ Mid: [3]</span>
        <span className="text-slate-400">High: [7]</span>
      </div>
    </div>
  )
}

function AnimatedGraphTraversal({ progress }) {
  const nodes = ['A', 'B', 'C', 'D', 'E', 'F']
  const activeCount = Math.min(6, Math.floor(progress * 6) + 1)
  const isComplete = progress >= 0.85

  return (
    <div className="w-full flex flex-col items-center gap-3">
      <div className="flex items-center justify-center gap-3">
        {nodes.map((node, i) => {
          const isVisited = i < activeCount
          const isTarget = i === 5 && isComplete

          return (
            <div key={node} className="flex items-center gap-2">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-mono font-bold text-xs transition-all duration-200 ${
                  isTarget
                    ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/40 border-2 border-white'
                    : isVisited
                    ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30 border border-blue-300'
                    : 'bg-[#161d2d] text-slate-500 border border-[#1e2638]'
                }`}
              >
                {node}
              </div>
              {i < nodes.length - 1 && (
                <span className={`text-xs ${i < activeCount - 1 ? 'text-blue-400 font-bold' : 'text-slate-700'}`}>➔</span>
              )}
            </div>
          )
        })}
      </div>
      <span className="text-xs font-mono text-slate-300">
        {isComplete ? 'Path Found: A ➔ B ➔ D ➔ F' : 'Exploring Neighbors in Queue...'}
      </span>
    </div>
  )
}

function AnimatedTreeTraversal({ progress }) {
  const steps = ['Root (10)', 'Left (5)', 'Sub (2)', 'Sub (7)', 'Right (15)', 'Complete']
  const idx = Math.min(steps.length - 1, Math.floor(progress * steps.length))

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="flex gap-2">
        {steps.map((st, i) => (
          <span
            key={st}
            className={`px-2 py-1 rounded text-[10px] font-mono transition-all ${
              i <= idx
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                : 'bg-[#161d2d] text-slate-600 border border-[#1e2638]'
            }`}
          >
            {st}
          </span>
        ))}
      </div>
      <span className="text-xs font-mono text-blue-400 mt-2">In-Order Traversal Active</span>
    </div>
  )
}

function AnimatedMatrixGrid({ progress }) {
  const total = 12
  const filled = Math.min(total, Math.floor(progress * total))

  return (
    <div className="grid grid-cols-4 gap-2 w-full max-w-xs">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-9 rounded-lg flex items-center justify-center font-mono text-xs transition-all ${
            i < filled
              ? 'bg-blue-500/20 border border-blue-400 text-blue-300 font-bold'
              : 'bg-[#161d2d] border border-[#1e2638] text-slate-600'
          }`}
        >
          {i < filled ? String(i * 3 + 2) : '—'}
        </div>
      ))}
    </div>
  )
}

function AnimatedLifecycleFlow({ progress }) {
  const stages = [
    { title: '01. MOUNT', desc: 'Initial Render', code: 'useEffect(fn, [])' },
    { title: '02. UPDATE', desc: 'State / Props', code: 'useEffect(fn, [id])' },
    { title: '03. UNMOUNT', desc: 'Cleanup', code: 'return () => cleanup' },
  ]
  const activeStage = progress < 0.35 ? 0 : progress < 0.72 ? 1 : 2

  return (
    <div className="grid grid-cols-3 gap-2 w-full">
      {stages.map((st, i) => {
        const isActive = i === activeStage
        const isPast = i < activeStage

        return (
          <div
            key={st.title}
            className={`p-2.5 rounded-xl border flex flex-col gap-1 transition-all duration-200 ${
              isActive
                ? 'bg-blue-500/20 border-blue-400 text-white shadow-lg shadow-blue-500/20 scale-[1.02]'
                : isPast
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                : 'bg-[#161d2d] border-[#1e2638] text-slate-500'
            }`}
          >
            <span className="text-[10px] font-mono font-bold text-blue-400">{st.title}</span>
            <span className="text-xs font-bold text-white">{st.desc}</span>
            <span className="text-[9px] font-mono text-slate-400">{st.code}</span>
          </div>
        )
      })}
    </div>
  )
}

function AnimatedNeuralNet({ progress }) {
  const loss = Math.max(0.012, 0.842 * (1 - progress)).toFixed(3)
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-6">
        <span className="px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-400 text-blue-300 font-mono text-xs">Input Tokens</span>
        <span className="text-blue-400 animate-pulse text-base">➔</span>
        <span className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-400 text-amber-300 font-mono text-xs">Q·K·V Attention</span>
        <span className="text-emerald-400 animate-pulse text-base">➔</span>
        <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-mono text-xs">Softmax Logits</span>
      </div>
      <span className="text-xs font-mono text-emerald-400 font-bold">Cross-Entropy Loss: {loss}</span>
    </div>
  )
}

function AnimatedArchitecture({ progress }) {
  const steps = ['Client', 'Gateway', 'Cache O(1)', 'Database']
  const activeIdx = Math.min(steps.length - 1, Math.floor(progress * steps.length))

  return (
    <div className="grid grid-cols-4 gap-2 w-full">
      {steps.map((st, i) => {
        const isActive = i === activeIdx
        const isPast = i < activeIdx

        return (
          <div
            key={st}
            className={`p-2 rounded-lg text-center font-mono text-xs border transition-all ${
              isActive
                ? 'bg-blue-500/20 border-blue-400 text-white shadow-md shadow-blue-500/30'
                : isPast
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-[#161d2d] border-[#1e2638] text-slate-500'
            }`}
          >
            {st}
          </div>
        )
      })}
    </div>
  )
}

function AnimatedTimeline({ progress }) {
  const steps = ['Dispatch', 'Validate', 'Execute', 'Commit']
  const activeIdx = Math.min(steps.length - 1, Math.floor(progress * steps.length))

  return (
    <div className="grid grid-cols-4 gap-2 w-full">
      {steps.map((st, i) => (
        <div
          key={st}
          className={`p-2 rounded-lg text-center font-mono text-xs border transition-all ${
            i <= activeIdx
              ? 'bg-blue-500/20 border-blue-400 text-white'
              : 'bg-[#161d2d] border-[#1e2638] text-slate-600'
          }`}
        >
          {st}
        </div>
      ))}
    </div>
  )
}
