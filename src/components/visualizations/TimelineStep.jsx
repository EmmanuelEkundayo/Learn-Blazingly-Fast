import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import StepControls from './StepControls.jsx'
import { useInterval } from '../../hooks/useInterval.js'

const SPEED_MS = { 0.5: 2000, 1: 1000, 1.5: 667, 2: 500, 3: 333 }

// ─── Config-driven pipeline (used when config.steps is present) ──────────────

function PipelineViz({ config }) {
  const steps = config.steps || []
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  const cur = steps[idx]

  useInterval(
    () => { if (idx < steps.length - 1) setIdx(i => i + 1); else setPlaying(false) },
    playing ? SPEED_MS[speed] : null,
  )

  const handleReset = useCallback(() => { setIdx(0); setPlaying(false) }, [])

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-surface-600 bg-surface-800 p-4 overflow-x-auto">
        <div className="flex items-start gap-0 flex-wrap">
          {steps.map((s, i) => {
            const isDone   = i < idx
            const isActive = i === idx
            const showArrow = i < steps.length - 1

            return (
              <div key={i} className="flex items-center">
                <motion.div
                  animate={{
                    borderColor:     isActive ? '#3b82f6' : isDone ? '#22c55e' : '#374151',
                    backgroundColor: isActive ? 'rgba(59,130,246,0.12)' : isDone ? 'rgba(34,197,94,0.07)' : '#1c1c22',
                  }}
                  transition={{ duration: 0.25 }}
                  className="rounded-xl border-2 px-3 py-2 flex flex-col items-center gap-0.5"
                  style={{ minWidth: 84 }}
                >
                  <span
                    className="text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center"
                    style={{
                      color: isActive ? '#93c5fd' : isDone ? '#86efac' : '#4b5563',
                      backgroundColor: isActive ? 'rgba(59,130,246,0.2)' : isDone ? 'rgba(34,197,94,0.15)' : 'transparent',
                    }}
                  >
                    {i + 1}
                  </span>
                  <span
                    className="text-xs font-semibold text-center leading-tight"
                    style={{ color: isActive ? '#e5e7eb' : isDone ? '#d1fae5' : '#6b7280' }}
                  >
                    {s.label}
                  </span>
                  {s.sub && (
                    <span
                      className="text-[9px] font-mono text-center leading-tight"
                      style={{ color: isActive ? '#9ca3af' : isDone ? '#6ee7b7' : '#374151' }}
                    >
                      {s.sub}
                    </span>
                  )}
                </motion.div>

                {showArrow && (
                  <div className="flex items-center justify-center w-5 shrink-0">
                    <span className="text-gray-400 text-sm">›</span>
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

// ─── Fallback: hardcoded backprop (original TimelineStep — kept for any
//     legacy ML concepts that have no config.steps) ────────────────────────────

const BP_LAYERS = [
  { id: 'input',  label: 'Input',  sub: 'x = [0.8, 0.3]' },
  { id: 'hidden', label: 'Hidden', sub: 'ReLU(Wx + b)'    },
  { id: 'output', label: 'Output', sub: 'σ(Wx + b)'       },
  { id: 'loss',   label: 'Loss',   sub: 'MSE(ŷ, y)'       },
]

const BP_STEPS = [
  { forward: new Set(), backward: new Set(), values: {}, phase: 'idle',
    annotation: 'Network ready. Forward pass: activations flow left → right. Backward pass: gradients flow right → left.' },
  { forward: new Set(['input']), backward: new Set(), values: { input: 'x=[0.8, 0.3]' }, phase: 'forward',
    annotation: 'Forward ①: input features x=[0.8, 0.3] fed into the network.' },
  { forward: new Set(['input','hidden']), backward: new Set(), values: { input: 'x=[0.8, 0.3]', hidden: 'h=[0.62,0,0.44]' }, phase: 'forward',
    annotation: 'Forward ②: hidden activations h = ReLU(W₁x + b₁) = [0.62, 0, 0.44].' },
  { forward: new Set(['input','hidden','output']), backward: new Set(), values: { input: 'x=[0.8, 0.3]', hidden: 'h=[0.62,0,0.44]', output: 'ŷ=0.71' }, phase: 'forward',
    annotation: 'Forward ③: output ŷ = σ(W₂h + b₂) = 0.71. Target y = 1.0.' },
  { forward: new Set(['input','hidden','output','loss']), backward: new Set(), values: { input: 'x=[0.8, 0.3]', hidden: 'h=[0.62,0,0.44]', output: 'ŷ=0.71', loss: 'L=0.084' }, phase: 'forward',
    annotation: 'Forward ④: loss L = MSE(0.71, 1.0) = 0.084. Begin backward pass.' },
  { forward: new Set(['input','hidden','output','loss']), backward: new Set(['loss']), values: { loss: 'L=0.084', grad_loss: 'dL=1' }, phase: 'backward',
    annotation: 'Backward ①: dL/dL = 1.0.' },
  { forward: new Set(['input','hidden','output','loss']), backward: new Set(['loss','output']), values: { grad_output: 'dL/dŷ=−0.58' }, phase: 'backward',
    annotation: 'Backward ②: dL/dŷ = 2(ŷ−y)/n = −0.58. Flows to output weights.' },
  { forward: new Set(['input','hidden','output','loss']), backward: new Set(['loss','output','hidden']), values: { grad_hidden: 'δh=W₂ᵀδ' }, phase: 'backward',
    annotation: 'Backward ③: δh = W₂ᵀ · δ (only ReLU>0 neurons pass gradient).' },
  { forward: new Set(['input','hidden','output','loss']), backward: new Set(['loss','output','hidden','input']), values: { grad_input: 'dL/dW₁=δh·xᵀ' }, phase: 'backward',
    annotation: 'Backward ④: dL/dW₁ = δh · xᵀ. All gradients computed — ready for weight update.' },
]

function BackpropFallback() {
  const [step, setStep]     = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed]   = useState(1)

  const cur = BP_STEPS[step]

  useInterval(
    () => { if (step < BP_STEPS.length - 1) setStep(s => s + 1); else setPlaying(false) },
    playing ? SPEED_MS[speed] : null,
  )

  const handleReset = useCallback(() => { setStep(0); setPlaying(false) }, [])
  const isForward  = cur.phase === 'forward'
  const isBackward = cur.phase === 'backward'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3 items-center text-xs font-mono">
        <div className={`px-3 py-1 rounded border font-semibold transition-all ${isForward ? 'bg-dsa-600/20 border-dsa-500 text-dsa-400' : 'border-surface-600 text-gray-600'}`}>
          → Forward pass
        </div>
        <div className={`px-3 py-1 rounded border font-semibold transition-all ${isBackward ? 'bg-ml-500/20 border-ml-500 text-ml-400' : 'border-surface-600 text-gray-600'}`}>
          ← Backward pass
        </div>
      </div>

      <div className="rounded-lg border border-surface-600 bg-surface-800 p-5 overflow-x-auto">
        <div className="flex items-center justify-between gap-3 min-w-[480px]">
          {BP_LAYERS.map((layer, li) => {
            const inF = cur.forward.has(layer.id)
            const inB = cur.backward.has(layer.id)
            const bdr = inB ? '#f59e0b' : inF ? '#3b82f6' : '#374151'
            const bg  = inB ? 'rgba(245,158,11,0.10)' : inF ? 'rgba(59,130,246,0.12)' : '#1c1c22'
            const clr = inB ? '#fcd34d' : inF ? '#93c5fd' : '#6b7280'

            return (
              <div key={layer.id} className="flex items-center gap-3 flex-1">
                <motion.div
                  animate={{ borderColor: bdr, backgroundColor: bg }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 rounded-xl border-2 p-3 flex flex-col items-center gap-1"
                  style={{ minWidth: 90 }}
                >
                  <span className="text-sm font-bold" style={{ color: clr }}>{layer.label}</span>
                  <span className="text-[9px] text-gray-400 font-mono text-center">{layer.sub}</span>
                  {cur.values[layer.id] && (
                    <motion.div key={cur.values[layer.id]}
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-1 px-1.5 py-0.5 rounded bg-surface-600 text-[9px] font-mono text-green-300 text-center">
                      {cur.values[layer.id]}
                    </motion.div>
                  )}
                </motion.div>
                {li < BP_LAYERS.length - 1 && (
                  <div className="flex flex-col items-center gap-1 shrink-0 w-10">
                    <motion.div animate={{ opacity: isForward || cur.phase === 'idle' ? 0.9 : 0.2 }}
                      className="flex items-center gap-0.5 text-dsa-500">
                      <div className="flex-1 h-px bg-current w-7" /><span className="text-xs">›</span>
                    </motion.div>
                    <motion.div animate={{ opacity: isBackward ? 0.9 : 0.15 }}
                      className="flex items-center gap-0.5 text-amber-500">
                      <span className="text-xs">‹</span><div className="flex-1 h-px bg-current w-7" />
                    </motion.div>
                    {isBackward && (() => {
                      const k = `grad_${BP_LAYERS[li + 1]?.id}`
                      return cur.values[k] ? (
                        <motion.span key={k} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="text-[8px] font-mono text-amber-400/80 text-center" style={{ maxWidth: 38 }}>
                          {cur.values[k]}
                        </motion.span>
                      ) : null
                    })()}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block bg-dsa-500" />forward</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block bg-amber-500" />backward</span>
      </div>

      <StepControls
        step={step} totalSteps={BP_STEPS.length} playing={playing} speed={speed}
        annotation={cur?.annotation}
        onPrev={() => { setPlaying(false); setStep(s => Math.max(0, s - 1)) }}
        onNext={() => { setPlaying(false); setStep(s => Math.min(BP_STEPS.length - 1, s + 1)) }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onReset={handleReset}
        onSpeedChange={setSpeed}
      />
    </div>
  )
}

// ─── Export ──────────────────────────────────────────────────────────────────

export default function TimelineStep({ config = {} }) {
  if (config.steps && config.steps.length > 0) {
    return <PipelineViz config={config} />
  }
  return <BackpropFallback />
}
