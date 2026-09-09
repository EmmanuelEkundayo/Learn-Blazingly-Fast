import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import StepControls from './StepControls.jsx'
import { useInterval } from '../../hooks/useInterval.js'

const SPEED_MS = { 0.5: 2000, 1: 1000, 1.5: 667, 2: 500, 3: 333 }

const LAYER_COLORS = {
  idle:    { fill: '#1c1c22', stroke: '#374151', text: '#6b7280' },
  active:  { fill: '#1d3557', stroke: '#3b82f6', text: '#93c5fd' },
  done:    { fill: '#14532d', stroke: '#22c55e', text: '#86efac' },
  frozen:  { fill: '#1c1c22', stroke: '#4b5563', text: '#6b7280' },
  dropped: { fill: '#1f1f28', stroke: '#374151', text: '#4b5563' },
}

// ─── Mode configs ─────────────────────────────────────────────────────────────

function getModeConfig(mode) {
  switch (mode) {
    case 'perceptron':
      return {
        arch: [3, 1],
        layerLabels: ['Input', 'Perceptron'],
        steps: [
          { activeLayer: -1, doneLayer: -1, values: {}, annotation: 'Perceptron: single neuron with weighted inputs and threshold activation. No hidden layer.' },
          { activeLayer: 0,  doneLayer: -1, values: { 0: ['0.80', '0.30', '0.50'] }, annotation: 'Input: x = [0.80, 0.30, 0.50] — features provided to the perceptron.' },
          { activeLayer: 1,  doneLayer: 0,  values: { 0: ['0.80', '0.30', '0.50'], 1: ['z=1.24'] }, annotation: 'Weighted sum: z = w·x + b = 1.24. Then threshold: if z > 0 → output 1.' },
          { activeLayer: 1,  doneLayer: 0,  values: { 0: ['0.80', '0.30', '0.50'], 1: ['1'] }, annotation: 'Output: step(1.24) = 1. Perceptron fires. Binary classification complete.' },
        ],
        note: 'Perceptron: earliest neural unit, linear decision boundary only.',
      }
    case 'activation-functions':
      return {
        arch: [1, 6, 1],
        layerLabels: ['Input', 'Activations', 'Output'],
        steps: [
          { activeLayer: -1, doneLayer: -1, values: {}, annotation: 'Activation functions: 6 neurons each apply a different activation to same input z=0.8.' },
          { activeLayer: 0,  doneLayer: -1, values: { 0: ['0.80'] }, annotation: 'Input z=0.80 enters the hidden layer — each neuron applies its activation function.' },
          { activeLayer: 1,  doneLayer: 0,  values: { 0: ['0.80'], 1: ['0.69', '0.66', '0.80', '0.08', '0.69', '0.62'] }, annotation: 'Activations: σ(z)=0.69, tanh(z)=0.66, ReLU(z)=0.80, Leaky(z)=0.08↑, ELU(z)=0.69, Swish(z)=0.62.' },
          { activeLayer: 2,  doneLayer: 1,  values: { 0: ['0.80'], 1: ['0.69', '0.66', '0.80', '0.08', '0.69', '0.62'], 2: ['0.62'] }, annotation: 'Output aggregates activations. Different activations affect gradient flow and expressiveness.' },
        ],
        note: 'Activation functions: sigmoid, tanh, ReLU, Leaky ReLU, ELU, Swish.',
      }
    case 'dropout':
      return {
        arch: [4, 6, 3],
        layerLabels: ['Input', 'Hidden (dropout=0.33)', 'Output'],
        droppedNodes: new Set([1, 4]),  // indices in hidden layer to drop
        steps: [
          { activeLayer: -1, doneLayer: -1, values: {}, annotation: 'Dropout: during training, randomly zeroing neurons (p=0.33) prevents co-adaptation.' },
          { activeLayer: 0,  doneLayer: -1, values: { 0: ['0.8', '0.3', '0.5', '0.9'] }, annotation: 'Input layer: 4 features x=[0.8, 0.3, 0.5, 0.9] ready for forward pass.' },
          { activeLayer: 1,  doneLayer: 0,  values: { 0: ['0.8', '0.3', '0.5', '0.9'], 1: ['0.72', '0.00', '0.45', '0.00', '0.61', '0.38'] }, annotation: 'Hidden layer: neurons 2 and 5 DROPPED (zeroed). Remaining neurons [0.72, 0.45, 0.61, 0.38] propagate.' },
          { activeLayer: 2,  doneLayer: 1,  values: { 0: ['0.8', '0.3', '0.5', '0.9'], 1: ['0.72', '0.00', '0.45', '0.00', '0.61', '0.38'], 2: ['0.58', '0.27', '0.15'] }, annotation: 'Output: softmax over [0.58, 0.27, 0.15]. Dropout forces redundant representations — reduces overfitting.' },
        ],
        note: 'Dropout: randomly drops hidden neurons during training. Acts as ensemble method.',
      }
    case 'batch-normalization':
      return {
        arch: [3, 4, 4, 2],
        layerLabels: ['Input', 'Hidden', 'BatchNorm', 'Output'],
        steps: [
          { activeLayer: -1, doneLayer: -1, values: {}, annotation: 'Batch Normalization: normalize activations before the next layer to stabilize training.' },
          { activeLayer: 0,  doneLayer: -1, values: { 0: ['0.80', '0.30', '0.50'] }, annotation: 'Input: x=[0.80, 0.30, 0.50] fed to hidden layer.' },
          { activeLayer: 1,  doneLayer: 0,  values: { 0: ['0.80', '0.30', '0.50'], 1: ['2.10', '-0.50', '1.30', '0.80'] }, annotation: 'Hidden: pre-activation values h=[2.10, -0.50, 1.30, 0.80]. Wide range — needs normalization.' },
          { activeLayer: 2,  doneLayer: 1,  values: { 0: ['0.80', '0.30', '0.50'], 1: ['2.10', '-0.50', '1.30', '0.80'], 2: ['0.92', '-1.14', '0.45', '-0.23'] }, annotation: 'BatchNorm: μ=0.93, σ=1.07. Normalized: [(h−μ)/σ × γ + β]. Accelerates convergence.' },
          { activeLayer: 3,  doneLayer: 2,  values: { 0: ['0.80', '0.30', '0.50'], 1: ['2.10', '-0.50', '1.30', '0.80'], 2: ['0.92', '-1.14', '0.45', '-0.23'], 3: ['0.68', '0.32'] }, annotation: 'Output: softmax([0.68, 0.32]). BatchNorm allows higher learning rates and reduces sensitivity to initialization.' },
        ],
        note: 'BatchNorm: normalizes activations per mini-batch. Adds learnable scale γ and shift β.',
      }
    case 'transfer-learning':
      return {
        arch: [4, 8, 8, 3],
        layerLabels: ['Input', 'Frozen L1', 'Frozen L2', 'Fine-tuned'],
        frozenLayers: new Set([0, 1, 2]),
        steps: [
          { activeLayer: -1, doneLayer: -1, values: {}, annotation: 'Transfer learning: first layers frozen (pretrained), last layer fine-tuned on new task.' },
          { activeLayer: 0,  doneLayer: -1, values: { 0: ['0.8', '0.3', '0.5', '0.9'] }, annotation: 'Input: new task features fed into the pretrained network.' },
          { activeLayer: 1,  doneLayer: 0,  values: { 0: ['0.8', '0.3', '0.5', '0.9'], 1: ['0.9', '0.1', '0.6', '0.4', '0.7', '0.2', '0.8', '0.3'] }, annotation: 'Frozen Layer 1: pretrained weights LOCKED — generic low-level features (edges, textures).' },
          { activeLayer: 2,  doneLayer: 1,  values: { 0: ['0.8', '0.3', '0.5', '0.9'], 1: ['0.9', '0.1', '0.6', '0.4', '0.7', '0.2', '0.8', '0.3'], 2: ['0.7', '0.5', '0.3', '0.8', '0.2', '0.6', '0.4', '0.9'] }, annotation: 'Frozen Layer 2: mid-level features also locked. Gradients do NOT flow through frozen layers.' },
          { activeLayer: 3,  doneLayer: 2,  values: { 0: ['0.8', '0.3', '0.5', '0.9'], 1: ['0.9', '0.1', '0.6', '0.4', '0.7', '0.2', '0.8', '0.3'], 2: ['0.7', '0.5', '0.3', '0.8', '0.2', '0.6', '0.4', '0.9'], 3: ['0.72', '0.18', '0.10'] }, annotation: 'Fine-tuned output: only this layer trains. softmax → [0.72, 0.18, 0.10]. Much less data needed!' },
        ],
        note: 'Transfer learning: reuse pretrained layers, fine-tune output for new task.',
      }
    case 'weight-initialization':
      return {
        arch: [3, 5, 2],
        layerLabels: ['Input', 'Hidden', 'Output'],
        steps: [
          { activeLayer: -1, doneLayer: -1, values: {}, annotation: 'Weight initialization matters. Bad init → vanishing/exploding gradients. 3 strategies compared.' },
          { activeLayer: 0,  doneLayer: -1, values: { 0: ['0.80', '0.30', '0.50'] }, annotation: 'Input: x=[0.80, 0.30, 0.50]. Same input for all three initialization experiments.' },
          { activeLayer: 1,  doneLayer: 0,  values: { 0: ['0.80', '0.30', '0.50'], 1: ['0.00', '0.00', '0.00', '0.00', '0.00'] }, annotation: 'ZEROS init: all weights=0. All neurons identical — symmetry breaking fails. Network cannot learn.' },
          { activeLayer: 1,  doneLayer: 0,  values: { 0: ['0.80', '0.30', '0.50'], 1: ['2.41', '-3.1', '1.87', '-2.5', '3.22'] }, annotation: 'RANDOM init (large): weights~N(0,1). Activations explode — unstable, vanishing/exploding gradients.' },
          { activeLayer: 1,  doneLayer: 0,  values: { 0: ['0.80', '0.30', '0.50'], 1: ['0.41', '-0.3', '0.52', '-0.2', '0.37'] }, annotation: 'XAVIER init: weights~N(0, 1/fan_in). Activations well-scaled — optimal for deep networks.' },
          { activeLayer: 2,  doneLayer: 1,  values: { 0: ['0.80', '0.30', '0.50'], 1: ['0.41', '-0.3', '0.52', '-0.2', '0.37'], 2: ['0.68', '0.32'] }, annotation: 'Output with Xavier init: stable softmax [0.68, 0.32]. Training will converge reliably.' },
        ],
        note: 'Xavier/Glorot init: var(W)=2/(fan_in+fan_out). He init for ReLU: var(W)=2/fan_in.',
      }
    default: // mlp and any other
      return {
        arch: [3, 4, 2],
        layerLabels: ['Input', 'Hidden', 'Output'],
        steps: [
          { activeLayer: -1, doneLayer: -1, values: {}, annotation: 'Network: 3 inputs → 4 hidden (ReLU) → 2 outputs (softmax). Ready for forward pass.' },
          { activeLayer: 0,  doneLayer: -1, values: { 0: ['0.80', '0.30', '0.50'] }, annotation: 'Layer 0 (Input): features x = [0.80, 0.30, 0.50] fed into the network.' },
          { activeLayer: 1,  doneLayer: 0,  values: { 0: ['0.80', '0.30', '0.50'], 1: ['0.72', '0.00', '0.45', '0.61'] }, annotation: 'Layer 1 (Hidden): z = W₁x + b₁, then h = ReLU(z) = [0.72, 0.00, 0.45, 0.61]. Note: one neuron gated off by ReLU.' },
          { activeLayer: 2,  doneLayer: 1,  values: { 0: ['0.80', '0.30', '0.50'], 1: ['0.72', '0.00', '0.45', '0.61'], 2: ['0.73', '0.27'] }, annotation: 'Layer 2 (Output): softmax gives class probabilities [0.73, 0.27]. Predicted class: 0.' },
        ],
        note: 'MLP forward pass: Input → ReLU hidden layer → softmax output.',
      }
  }
}

// ─── Layout builder ───────────────────────────────────────────────────────────

function buildLayout(arch) {
  const W = 480, H = 320
  const maxLayers = 5
  const layerX = arch.length <= 3
    ? [80, 240, 400]
    : arch.length === 4
    ? [60, 180, 300, 420]
    : [50, 145, 240, 335, 430]

  const nodes = []
  const edges = []

  arch.forEach((n, li) => {
    const spacing = H / (n + 1)
    for (let ni = 0; ni < n; ni++) {
      nodes.push({ id: `L${li}N${ni}`, layer: li, idx: ni, x: layerX[li], y: spacing * (ni + 1) })
    }
  })

  arch.forEach((_, li) => {
    if (li === arch.length - 1) return
    const fromNodes = nodes.filter(nd => nd.layer === li)
    const toNodes   = nodes.filter(nd => nd.layer === li + 1)
    fromNodes.forEach(f => toNodes.forEach(t => {
      edges.push({ from: f.id, to: t.id, fromLayer: li, toLayer: li + 1 })
    }))
  })

  return { nodes, edges, W, H }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NeuralNetDiagram({ config = {} }) {
  const modeConfig = useMemo(() => getModeConfig(config.mode), [config.mode])
  const { arch, layerLabels, steps, droppedNodes, frozenLayers } = modeConfig

  const [step,    setStep]    = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed,   setSpeed]   = useState(1)

  // Reset step when mode changes
  const stepsKey = steps.length + arch.join(',')
  const cur = steps[Math.min(step, steps.length - 1)]

  useInterval(
    () => { if (step < steps.length - 1) setStep(s => s + 1); else setPlaying(false) },
    playing ? SPEED_MS[speed] : null,
  )

  const handleReset = useCallback(() => { setStep(0); setPlaying(false) }, [])

  const { nodes, edges, W, H } = useMemo(() => buildLayout(arch), [arch])

  function nodeState(node) {
    const isDropped = droppedNodes && node.layer === 1 && droppedNodes.has(node.idx) && cur.activeLayer >= 1
    const isFrozen  = frozenLayers && frozenLayers.has(node.layer)
    if (isDropped) return 'dropped'
    if (isFrozen && cur.doneLayer >= node.layer) return 'frozen'
    if (node.layer === cur.activeLayer) return 'active'
    if (node.layer <= cur.doneLayer)   return 'done'
    return 'idle'
  }

  function edgeOpacity(edge) {
    const isDrop = droppedNodes && (edge.fromLayer === 1 || edge.toLayer === 1)
    if (isDrop && cur.activeLayer >= 1) return 0.08
    if (edge.fromLayer === cur.doneLayer && edge.toLayer === cur.activeLayer) return 0.8
    if (edge.toLayer <= cur.doneLayer) return 0.5
    return 0.12
  }

  function edgeColor(edge) {
    const isDrop = droppedNodes && (edge.fromLayer === 1 || edge.toLayer === 1)
    if (isDrop && cur.activeLayer >= 1) return '#374151'
    if (edge.fromLayer === cur.doneLayer && edge.toLayer === cur.activeLayer) return '#3b82f6'
    return '#374151'
  }

  const layerX = arch.length <= 3 ? [80, 240, 400]
    : arch.length === 4 ? [60, 180, 300, 420]
    : [50, 145, 240, 335, 430]

  return (
    <div className="flex flex-col gap-3">
      {/* SVG diagram */}
      <div className="rounded-lg border border-surface-600 bg-surface-800 overflow-hidden">
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxHeight: 340 }}>
          {/* Layer labels */}
          {arch.map((_, li) => (
            <text key={li} x={layerX[li]} y={14} textAnchor="middle"
              fill={frozenLayers && frozenLayers.has(li) ? '#4b5563' : '#4b5563'}
              fontSize={arch.length > 3 ? 9 : 11} fontFamily="Inter,sans-serif" fontWeight="600">
              {layerLabels[li]}
            </text>
          ))}

          {/* Edges */}
          {edges.map((e, i) => (
            <motion.line key={i}
              x1={nodes.find(n => n.id === e.from).x}
              y1={nodes.find(n => n.id === e.from).y}
              x2={nodes.find(n => n.id === e.to).x}
              y2={nodes.find(n => n.id === e.to).y}
              animate={{ stroke: edgeColor(e), strokeOpacity: edgeOpacity(e), strokeWidth: edgeOpacity(e) > 0.5 ? 1.5 : 0.8 }}
              transition={{ duration: 0.3 }}
            />
          ))}

          {/* Nodes */}
          {nodes.map(node => {
            const state  = nodeState(node)
            const colors = LAYER_COLORS[state] ?? LAYER_COLORS.idle
            const valArr = cur.values[node.layer]
            const val    = valArr ? valArr[node.idx] : null
            const isZero = val === '0.00'
            const r = arch[node.layer] > 7 ? 16 : 20

            return (
              <g key={node.id} transform={`translate(${node.x},${node.y})`}>
                <motion.circle r={r}
                  animate={{ fill: isZero ? '#1f1f28' : colors.fill, stroke: isZero ? '#374151' : colors.stroke }}
                  transition={{ duration: 0.3 }}
                  strokeWidth={2}
                />
                {val ? (
                  <text textAnchor="middle" dominantBaseline="central"
                    fill={isZero ? '#4b5563' : colors.text}
                    fontSize={arch[node.layer] > 7 ? 7 : 9} fontFamily="'JetBrains Mono',monospace" fontWeight="700">
                    {val}
                  </text>
                ) : (
                  <text textAnchor="middle" dominantBaseline="central"
                    fill={colors.text} fontSize={11} fontFamily="Inter,sans-serif">
                    {node.idx + 1}
                  </text>
                )}
                {/* Dropped overlay */}
                {droppedNodes && node.layer === 1 && droppedNodes.has(node.idx) && cur.activeLayer >= 1 && (
                  <text textAnchor="middle" dominantBaseline="central" fill="#ef4444" fontSize={16} fontWeight="bold">×</text>
                )}
                {/* Frozen indicator */}
                {frozenLayers && frozenLayers.has(node.layer) && cur.doneLayer >= node.layer && (
                  <text x={r - 2} y={-r + 2} textAnchor="middle" fill="#6b7280" fontSize={8}>🔒</text>
                )}
              </g>
            )
          })}

          {/* Output predictions */}
          <AnimatePresence>
            {cur.activeLayer === arch.length - 1 && (() => {
              const outLayer = arch.length - 1
              const outVals = cur.values[outLayer]
              if (!outVals) return null
              const outNodes = nodes.filter(n => n.layer === outLayer)
              return outNodes.map((node, i) => {
                const pct = parseFloat(outVals[i])
                const isWinner = !isNaN(pct) && outVals.every((v, j) => j === i || pct >= parseFloat(v))
                return (
                  <motion.text key={i}
                    initial={{ opacity: 0, x: node.x + 28 }} animate={{ opacity: 1, x: node.x + 32 }}
                    y={node.y + 4} textAnchor="start" dominantBaseline="middle"
                    fill={isWinner ? '#22c55e' : '#6b7280'}
                    fontSize={10} fontFamily="'JetBrains Mono',monospace" fontWeight="600">
                    C{i} {isWinner ? '✓' : ''}
                  </motion.text>
                )
              })
            })()}
          </AnimatePresence>
        </svg>
      </div>

      {/* Layer info */}
      <div className={`grid gap-2 text-xs font-mono`} style={{ gridTemplateColumns: `repeat(${arch.length}, 1fr)` }}>
        {arch.map((n, li) => {
          const state = li === cur.activeLayer ? 'active' : li <= cur.doneLayer ? 'done' : 'idle'
          return (
            <div key={li} className={`px-2 py-1.5 rounded border text-center transition-all truncate ${
              state === 'active' ? 'bg-dsa-600/10 border-dsa-500/60 text-dsa-400'
              : state === 'done' ? 'bg-green-900/10 border-green-900/40 text-green-500'
              : 'border-surface-600 text-gray-600'
            }`}>
              {layerLabels[li]} ({n})
            </div>
          )
        })}
      </div>

      {/* Note */}
      {modeConfig.note && (
        <div className="text-xs text-gray-400 font-mono truncate">{modeConfig.note}</div>
      )}

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
