import { useMemo } from 'react'
import { getConceptVizCategory } from '../../utils/visualizerPlayback.js'
import { getSteps, getDefaultSortArray } from '../../utils/algorithms/registry.js'

/**
 * Animated Concept Visualizer Component for Slide 2 in TikTok Exporter.
 * Plays the concept visualization dynamically across the slide's time frame.
 * Displays accurate algorithmic steps, pointer annotations, and execution states.
 */
export default function AnimatedSlideVisualizer({ concept, progress = 1.0, capturedVisualUrl }) {
  const category = useMemo(() => getConceptVizCategory(concept), [concept])

  // If user has a captured snapshot and is in static carousel mode, use captured image
  if (capturedVisualUrl && progress === 1.0) {
    return (
      <img
        src={capturedVisualUrl}
        alt={concept?.title || 'Concept Visualization'}
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
          <span>ALGORITHM SIMULATION</span>
        </span>
        <span className="text-slate-400 font-medium">
          {Math.round(progress * 100)}% EXECUTED
        </span>
      </div>

      {/* Dynamic Animated Body */}
      <div className="flex-1 flex flex-col items-center justify-center my-auto py-1.5 w-full overflow-hidden">
        {category === 'sorting' && <AnimatedSortingBars concept={concept} progress={progress} />}
        {category === 'search' && <AnimatedSearchPointers concept={concept} progress={progress} />}
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
          className="h-full bg-gradient-to-r from-blue-500 via-amber-400 to-emerald-400 transition-all duration-100 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
        />
      </div>
    </div>
  )
}

// ─── Real Step-by-Step Sorting Bars ───────────────────────────────────────────

function AnimatedSortingBars({ concept, progress }) {
  const mode = concept?.visualization?.config?.mode || concept?.slug || 'quicksort'
  const defaultArr = getDefaultSortArray(mode) || [9, 3, 7, 4, 6, 2, 8, 5]
  const rawArray = concept?.visualization?.config?.array || defaultArr
  const inputArray = useMemo(() => {
    return rawArray.length > 10 ? rawArray.slice(0, 10) : rawArray
  }, [rawArray])

  const steps = useMemo(() => {
    let s = getSteps('sorting', mode, inputArray)
    if (!s || s.length === 0) {
      s = getSteps('sorting', 'quicksort', inputArray)
    }
    return s || []
  }, [mode, inputArray])

  const totalSteps = steps.length || 1
  const stepIdx = Math.min(totalSteps - 1, Math.floor(progress * totalSteps))
  const currentStep = steps[stepIdx] || { array: inputArray, sorted: [], swapping: [] }
  const arr = currentStep.array || inputArray
  const maxVal = Math.max(...arr, 1)

  const type = currentStep.type || 'step'
  let badgeStyle = 'bg-blue-500/20 text-blue-300 border-blue-500/40'
  let actionLabel = type.toUpperCase().replace(/_/g, ' ')
  if (type === 'compare') {
    badgeStyle = 'bg-amber-400/20 text-amber-300 border-amber-400/40'
  } else if (type === 'swap') {
    badgeStyle = 'bg-red-500/20 text-red-300 border-red-500/40'
  } else if (type === 'done') {
    badgeStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    actionLabel = 'SORTED ✓'
  } else if (type === 'select_min' || currentStep.pivot != null) {
    badgeStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  }

  return (
    <div className="w-full h-full flex flex-col justify-between py-1">
      {/* Step Info Row */}
      <div className="flex items-center justify-between text-[10px] font-mono mb-1.5 px-0.5">
        <div className="flex items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${badgeStyle}`}>
            {actionLabel}
          </span>
          <span className="text-slate-400 font-medium">
            {(concept?.title || 'Sorting Algorithm').slice(0, 24)}
          </span>
        </div>
        <span className="text-amber-400 font-bold">
          STEP {String(stepIdx + 1).padStart(2, '0')} / {String(totalSteps).padStart(2, '0')}
        </span>
      </div>

      {/* Array Bars Visualization */}
      <div className="w-full flex items-end justify-center gap-1.5 h-28 px-1">
        {arr.map((val, i) => {
          const isSorted = currentStep.sorted && currentStep.sorted[i]
          const isSwapping = currentStep.swapping && currentStep.swapping.includes(i)
          const isPivot = currentStep.pivot === i
          const isCompare =
            currentStep.j === i ||
            (currentStep.type === 'compare' && (currentStep.j === i || currentStep.j + 1 === i)) ||
            currentStep.i === i ||
            currentStep.minIdx === i
          const isOut =
            currentStep.lo != null &&
            currentStep.hi != null &&
            (i < currentStep.lo || i > currentStep.hi)

          let barBg = 'bg-blue-600 border-blue-400'
          let labelTag = null
          let tagColor = ''

          if (isSorted) {
            barBg = 'bg-emerald-500 border-emerald-400 shadow-sm shadow-emerald-500/30'
            labelTag = 'SORTED'
            tagColor = 'text-emerald-400'
          } else if (isSwapping) {
            barBg = 'bg-red-500 border-red-400 shadow-sm shadow-red-500/30'
            labelTag = 'SWAP'
            tagColor = 'text-red-400'
          } else if (isPivot) {
            barBg = 'bg-amber-500 border-amber-400 shadow-sm shadow-amber-500/30'
            labelTag = 'PIVOT'
            tagColor = 'text-amber-400'
          } else if (isCompare) {
            barBg = 'bg-amber-200 border-amber-100 text-black shadow-sm shadow-amber-300/30'
            labelTag = 'CMP'
            tagColor = 'text-amber-300'
          } else if (isOut) {
            barBg = 'bg-[#1e2638] border-slate-700 opacity-40'
          }

          const hPct = Math.max(16, Math.round((val / maxVal) * 100))

          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
              <span className={`text-[10px] font-mono font-bold leading-none mb-1 ${isCompare ? 'text-amber-200' : 'text-slate-300'}`}>
                {val}
              </span>
              <div
                className={`w-full rounded-t-md border-t border-x transition-all duration-150 ${barBg}`}
                style={{ height: `${hPct}%` }}
              />
              <div className="flex flex-col items-center mt-1">
                <span className="text-[8px] font-mono text-slate-500 leading-none">[{i}]</span>
                {labelTag ? (
                  <span className={`text-[7px] font-mono font-bold leading-none mt-0.5 tracking-tighter ${tagColor}`}>
                    {labelTag}
                  </span>
                ) : (
                  <span className="text-[7px] font-mono leading-none mt-0.5 opacity-0">-</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Step Annotation Box */}
      <div className="w-full px-2.5 py-1.5 rounded-lg bg-[#0b0e14] border border-[#1e2638] flex items-center text-[10px] font-mono mt-2 overflow-hidden">
        <span className="text-blue-400 font-bold mr-1.5 shrink-0">›</span>
        <span className="text-slate-300 truncate">
          {currentStep.annotation || 'Executing algorithm step...'}
        </span>
      </div>
    </div>
  )
}

// ─── Real Step-by-Step Searching Pointers ──────────────────────────────────────

function AnimatedSearchPointers({ concept, progress }) {
  const mode = concept?.visualization?.config?.mode || concept?.slug || 'binary-search'
  const rawArr = concept?.visualization?.config?.array || [2, 5, 8, 12, 16, 23, 38, 45, 56, 72]
  const arr = useMemo(() => {
    return rawArr.length > 10 ? rawArr.slice(0, 10) : rawArr
  }, [rawArr])
  const target = concept?.visualization?.config?.target ?? (mode === 'binary-search' ? 23 : 16)

  const steps = useMemo(() => {
    let s = getSteps('search', mode, arr, target)
    if (!s || s.length === 0) {
      s = getSteps('search', 'binary-search', arr, target)
    }
    return s || []
  }, [mode, arr, target])

  const totalSteps = steps.length || 1
  const stepIdx = Math.min(totalSteps - 1, Math.floor(progress * totalSteps))
  const step = steps[stepIdx] || { lo: 0, hi: arr.length - 1, mid: 0, found: false }

  const statusLabel = step.found
    ? 'FOUND ✓'
    : step.done
    ? 'NOT FOUND'
    : 'SEARCHING...'
  const statusColor = step.found
    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    : step.done
    ? 'bg-red-500/20 text-red-300 border-red-500/40'
    : 'bg-blue-500/20 text-blue-300 border-blue-500/40'

  return (
    <div className="w-full h-full flex flex-col justify-between py-1">
      {/* Header Row */}
      <div className="flex items-center justify-between text-[10px] font-mono mb-1.5 px-0.5">
        <div className="flex items-center gap-1.5">
          <span className="text-blue-400 font-bold">TARGET: {target}</span>
          <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
        <span className="text-amber-400 font-bold">
          STEP {String(stepIdx + 1).padStart(2, '0')} / {String(totalSteps).padStart(2, '0')}
        </span>
      </div>

      {/* Array Cells with Pointers */}
      <div className="flex items-center justify-center gap-1.5 w-full my-auto px-0.5">
        {arr.map((val, i) => {
          const inRange = step.lo != null && step.hi != null && i >= step.lo && i <= step.hi
          const isMid = step.mid === i || step.i === i
          const isLo = step.lo === i
          const isHi = step.hi === i
          const isFound = step.found && isMid

          let cellBg = 'bg-[#0d111a] border-[#1e2638] text-slate-400'
          let ptrLabel = null
          let ptrColor = ''

          if (isFound) {
            cellBg = 'bg-emerald-500/25 border-2 border-emerald-400 text-white shadow-lg shadow-emerald-500/20'
            ptrLabel = 'FOUND ✓'
            ptrColor = 'text-emerald-400'
          } else if (isMid) {
            cellBg = 'bg-blue-500/25 border-2 border-blue-400 text-white shadow-md shadow-blue-500/20'
            ptrLabel = '▲ MID'
            ptrColor = 'text-blue-400'
          } else if (isLo && isHi) {
            cellBg = 'bg-[#161d2d] border border-blue-500/40 text-slate-200'
            ptrLabel = 'LO=HI'
            ptrColor = 'text-blue-400'
          } else if (isLo) {
            cellBg = 'bg-[#161d2d] border border-blue-500/40 text-slate-200'
            ptrLabel = '▲ LO'
            ptrColor = 'text-blue-400'
          } else if (isHi) {
            cellBg = 'bg-[#161d2d] border border-blue-500/40 text-slate-200'
            ptrLabel = '▲ HI'
            ptrColor = 'text-blue-400'
          } else if (inRange) {
            cellBg = 'bg-[#161d2d] border border-slate-700 text-slate-300'
          } else {
            cellBg = 'bg-[#090d14] border-[#161d26] text-slate-600 opacity-40'
          }

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <div
                className={`w-full aspect-square rounded-lg flex items-center justify-center font-mono font-bold text-xs transition-all duration-150 ${cellBg}`}
              >
                {val}
              </div>
              <span className="text-[8px] font-mono text-slate-500 leading-none">[{i}]</span>
              {ptrLabel ? (
                <span className={`text-[7px] font-mono font-bold leading-none tracking-tighter ${ptrColor}`}>
                  {ptrLabel}
                </span>
              ) : (
                <span className="text-[7px] font-mono leading-none opacity-0">-</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Step Annotation Box */}
      <div className="w-full px-2.5 py-1.5 rounded-lg bg-[#0b0e14] border border-[#1e2638] flex items-center text-[10px] font-mono mt-2 overflow-hidden">
        <span className="text-blue-400 font-bold mr-1.5 shrink-0">›</span>
        <span className="text-slate-300 truncate">
          {step.annotation || 'Evaluating search boundaries...'}
        </span>
      </div>
    </div>
  )
}

// ─── Static / Flow Renderers for Other Categories ─────────────────────────────

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
