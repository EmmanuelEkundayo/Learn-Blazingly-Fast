import { useState, useMemo, useCallback } from 'react'
import * as d3 from 'd3'
import { motion, AnimatePresence } from 'framer-motion'
import StepControls from './StepControls.jsx'
import { useInterval } from '../../hooks/useInterval.js'

const SPEED_MS = { 0.5: 2000, 1: 1000, 1.5: 667, 2: 500, 3: 333 }

// ─── Mode-specific matrix configs ─────────────────────────────────────────────

function getModeMatrix(mode) {
  switch (mode) {

    case 'transformer-attention': {
      const tokens = ['I','am','the','model','you','seek','now','!']
      const attn = [
        [0.45, 0.08, 0.06, 0.15, 0.06, 0.06, 0.08, 0.06],
        [0.10, 0.38, 0.12, 0.10, 0.12, 0.08, 0.05, 0.05],
        [0.06, 0.10, 0.40, 0.08, 0.10, 0.10, 0.10, 0.06],
        [0.12, 0.10, 0.08, 0.42, 0.08, 0.08, 0.06, 0.06],
        [0.06, 0.12, 0.10, 0.08, 0.44, 0.08, 0.06, 0.06],
        [0.06, 0.08, 0.10, 0.08, 0.10, 0.42, 0.10, 0.06],
        [0.07, 0.06, 0.10, 0.06, 0.06, 0.12, 0.46, 0.07],
        [0.12, 0.06, 0.06, 0.06, 0.06, 0.06, 0.08, 0.50],
      ]
      return { tokens, attn, title: 'Multi-head Transformer attention (8 tokens). Diagonal emphasis + cross-token patterns.', colorDomain: [0, 0.5] }
    }

    case 'transformer-encoder': {
      const tokens = ['The', 'cat', 'sat', 'on', 'the', 'mat']
      const attn = [
        [0.40, 0.12, 0.10, 0.08, 0.22, 0.08],
        [0.08, 0.42, 0.20, 0.06, 0.06, 0.18],
        [0.07, 0.28, 0.30, 0.12, 0.06, 0.17],
        [0.10, 0.14, 0.14, 0.34, 0.10, 0.18],
        [0.36, 0.08, 0.08, 0.08, 0.34, 0.06],
        [0.08, 0.22, 0.16, 0.20, 0.06, 0.28],
      ]
      return { tokens, attn, title: 'Encoder self-attention: bidirectional — all tokens attend to all tokens (no masking).', colorDomain: [0, 0.5] }
    }

    case 'transformer-decoder': {
      const tokens = ['<s>', 'The', 'cat', 'sat', 'on', 'mat']
      // Causal: strict lower triangular (upper = 0, future masked)
      const attn = [
        [1.00, 0.00, 0.00, 0.00, 0.00, 0.00],
        [0.55, 0.45, 0.00, 0.00, 0.00, 0.00],
        [0.12, 0.38, 0.50, 0.00, 0.00, 0.00],
        [0.08, 0.12, 0.36, 0.44, 0.00, 0.00],
        [0.06, 0.10, 0.12, 0.32, 0.40, 0.00],
        [0.05, 0.08, 0.18, 0.24, 0.12, 0.33],
      ]
      return { tokens, attn, title: 'Decoder causal attention: upper triangle = 0 (future tokens masked). Auto-regressive.', colorDomain: [0, 1] }
    }

    case 'mixture-of-experts': {
      const tokens = ['tok0','tok1','tok2','tok3','tok4','tok5','tok6','tok7']
      const experts = ['Exp0','Exp1','Exp2','Exp3']
      // Sparse routing: each token routes to 1-2 experts
      const attn = [
        [0.92, 0.05, 0.02, 0.01],
        [0.04, 0.91, 0.03, 0.02],
        [0.03, 0.04, 0.90, 0.03],
        [0.90, 0.04, 0.04, 0.02],
        [0.02, 0.03, 0.03, 0.92],
        [0.03, 0.92, 0.03, 0.02],
        [0.04, 0.03, 0.91, 0.02],
        [0.02, 0.02, 0.04, 0.92],
      ]
      return { tokens, colTokens: experts, attn, title: 'MoE routing: 8 tokens × 4 experts. Sparse — each token routes to 1 expert (top-1 gating).', colorDomain: [0, 1], rowLabel: 'Token', colLabel: 'Expert' }
    }

    case 'pruning': {
      const rows = ['w0','w1','w2','w3','w4','w5','w6','w7']
      // ~70% zeros, sparse weight matrix
      const attn = [
        [0.82, 0.00, 0.00, 0.71, 0.00, 0.00, 0.55, 0.00],
        [0.00, 0.00, 0.68, 0.00, 0.00, 0.79, 0.00, 0.00],
        [0.00, 0.63, 0.00, 0.00, 0.87, 0.00, 0.00, 0.00],
        [0.74, 0.00, 0.00, 0.00, 0.00, 0.00, 0.60, 0.00],
        [0.00, 0.00, 0.91, 0.00, 0.00, 0.00, 0.00, 0.73],
        [0.00, 0.58, 0.00, 0.00, 0.00, 0.84, 0.00, 0.00],
        [0.66, 0.00, 0.00, 0.77, 0.00, 0.00, 0.00, 0.00],
        [0.00, 0.00, 0.00, 0.00, 0.70, 0.00, 0.89, 0.00],
      ]
      return { tokens: rows, attn, title: 'Pruned weight matrix: ~70% sparsity. Zeros = pruned weights. Reduces model size.', colorDomain: [0, 1], rowLabel: 'Row', colLabel: 'Col' }
    }

    case 'knowledge-distillation': {
      // Two 4×4 matrices: teacher (sharp) vs student (softer)
      const tokens = ['A','B','C','D']
      const attn = [
        [0.95, 0.02, 0.02, 0.01],
        [0.01, 0.97, 0.01, 0.01],
        [0.02, 0.01, 0.95, 0.02],
        [0.01, 0.02, 0.02, 0.95],
      ]
      return { tokens, attn, title: 'Knowledge distillation — Teacher output (sharp logits). Student learns softer targets.', colorDomain: [0, 1], special: 'distillation',
        studentAttn: [
          [0.70, 0.10, 0.12, 0.08],
          [0.08, 0.72, 0.10, 0.10],
          [0.10, 0.08, 0.68, 0.14],
          [0.09, 0.11, 0.10, 0.70],
        ]
      }
    }

    case 'cross-validation': {
      const folds = ['Fold 1','Fold 2','Fold 3','Fold 4','Fold 5']
      const cols  = ['Train','Val','Test']
      // 0=train(blue), 0.5=val(yellow), 1=test(orange) coded as values
      const attn = [
        [0.9, 0.5, 0.1],
        [0.9, 0.1, 0.5],
        [0.5, 0.9, 0.1],
        [0.1, 0.9, 0.5],
        [0.1, 0.5, 0.9],
      ]
      return { tokens: folds, colTokens: cols, attn, title: '5-fold cross-validation: each fold is used as validation once. Test set held out.', colorDomain: [0, 1], rowLabel: 'Fold', colLabel: 'Split' }
    }

    case 'few-shot-vs-zero-shot': {
      const rows = ['query0','query1','query2','query3']
      const cols = ['proto0','proto1','proto2','proto3','proto4','proto5']
      const attn = [
        [0.85, 0.04, 0.04, 0.03, 0.02, 0.02],
        [0.03, 0.82, 0.07, 0.04, 0.02, 0.02],
        [0.02, 0.03, 0.06, 0.84, 0.03, 0.02],
        [0.01, 0.02, 0.02, 0.03, 0.88, 0.04],
      ]
      return { tokens: rows, colTokens: cols, attn, title: 'Few-shot prototype matching: queries vs class prototypes. High similarity → correct class.', colorDomain: [0, 1], rowLabel: 'Query', colLabel: 'Prototype' }
    }

    case 'naive-bayes': {
      const features = ['word_ml','word_ai','word_cat','word_dog','urgent']
      const classes  = ['Spam','Ham','Tech','Sports']
      const attn = [
        [0.85, 0.05, 0.02, 0.02, 0.06],
        [0.05, 0.80, 0.06, 0.04, 0.05],
        [0.02, 0.04, 0.90, 0.03, 0.01],
        [0.03, 0.03, 0.04, 0.88, 0.02],
      ]
      return { tokens: classes, colTokens: features, attn, title: 'Naïve Bayes: P(feature|class) likelihood table. High value = feature strongly predicts class.', colorDomain: [0, 1], rowLabel: 'Class', colLabel: 'Feature' }
    }

    case 'rlhf': {
      const responses = ['resp0','resp1','resp2','resp3','resp4']
      const criteria  = ['helpful','harmless','honest','concise','correct']
      const attn = [
        [0.85, 0.80, 0.78, 0.70, 0.82],
        [0.60, 0.55, 0.65, 0.88, 0.58],
        [0.40, 0.92, 0.88, 0.50, 0.45],
        [0.72, 0.68, 0.70, 0.60, 0.90],
        [0.30, 0.45, 0.50, 0.40, 0.35],
      ]
      return { tokens: responses, colTokens: criteria, attn, title: 'RLHF reward model: response scores by criterion. Reward = weighted sum of criteria.', colorDomain: [0, 1], rowLabel: 'Response', colLabel: 'Criterion' }
    }

    case 'color-contrast-wcag': {
      const textColors = ['#fff','#eee','#aaa','#888','#555']
      const bgColors   = ['#000','#111','#333','#555','#fff','#eee']
      // Contrast ratio (approx): white-on-black=21, grey-on-dark varies
      const attn = [
        [1.00, 0.95, 0.90, 0.55, 0.30, 0.25],
        [0.95, 0.90, 0.85, 0.50, 0.28, 0.22],
        [0.55, 0.52, 0.45, 0.22, 0.08, 0.06],
        [0.35, 0.32, 0.28, 0.12, 0.04, 0.03],
        [0.10, 0.09, 0.08, 0.05, 0.02, 0.01],
      ]
      return { tokens: textColors, colTokens: bgColors, attn, title: 'WCAG contrast ratio matrix: text × background. ≥0.63 → AA pass (4.5:1), ≥0.86 → AAA (7:1).', colorDomain: [0, 1], rowLabel: 'Text', colLabel: 'Background' }
    }

    case 'core-web-vitals': {
      const pages   = ['Home','Listing','Detail','Checkout','Blog']
      const metrics = ['LCP','FID','CLS','TTFB','TBT']
      const attn = [
        [0.90, 0.85, 0.50, 0.80, 0.70],
        [0.55, 0.75, 0.80, 0.50, 0.60],
        [0.80, 0.90, 0.40, 0.75, 0.85],
        [0.30, 0.45, 0.92, 0.20, 0.30],
        [0.70, 0.65, 0.55, 0.60, 0.75],
      ]
      return { tokens: metrics, colTokens: pages, attn, title: 'Core Web Vitals: 5 metrics × 5 pages. Green (high) = good score, red (low) = needs improvement.', colorDomain: [0, 1], rowLabel: 'Metric', colLabel: 'Page' }
    }

    case 'keyboard-navigation': {
      const elements = ['button','input','link','select','modal','tooltip']
      const attrs    = ['tabIndex','focus-vis','aria-label','role']
      const attn = [
        [1.00, 0.95, 0.80, 0.90],
        [1.00, 0.85, 0.90, 0.85],
        [1.00, 0.90, 0.70, 0.95],
        [1.00, 0.80, 0.85, 0.90],
        [0.60, 0.50, 0.55, 0.70],
        [0.30, 0.20, 0.40, 0.35],
      ]
      return { tokens: elements, colTokens: attrs, attn, title: 'Keyboard accessibility: 6 elements × 4 attributes. High value = attribute correctly implemented.', colorDomain: [0, 1], rowLabel: 'Element', colLabel: 'Attribute' }
    }

    case 'lighthouse-scoring': {
      const pages      = ['Home','Blog','Shop','Login']
      const categories = ['Perf','Access','Best-P','SEO','PWA']
      const attn = [
        [0.72, 0.55, 0.80, 0.65],
        [0.88, 0.90, 0.85, 0.92],
        [0.90, 0.85, 0.88, 0.87],
        [0.95, 0.78, 0.90, 0.85],
        [0.60, 0.30, 0.70, 0.40],
      ]
      return { tokens: categories, colTokens: pages, attn, title: 'Lighthouse scores (0–1): 5 categories × 4 pages. Performance often weakest — largest gains available.', colorDomain: [0, 1], rowLabel: 'Category', colLabel: 'Page' }
    }

    case 'owasp-top-10': {
      const vulns  = ['Inj.','BrkAuth','XSS','XXE','MissCfg']
      const types  = ['Web App','API','Mobile','IoT','Desktop']
      const attn = [
        [0.90, 0.85, 0.60, 0.45, 0.40],
        [0.85, 0.90, 0.70, 0.50, 0.30],
        [0.80, 0.50, 0.75, 0.40, 0.35],
        [0.40, 0.35, 0.30, 0.55, 0.20],
        [0.70, 0.75, 0.55, 0.50, 0.65],
      ]
      return { tokens: vulns, colTokens: types, attn, title: 'OWASP risk: 5 vulnerability classes × 5 app types. Darker = higher risk. Injection + auth flaws top every category.', colorDomain: [0, 1], rowLabel: 'Vuln', colLabel: 'App Type' }
    }

    case 'screen-reader-compatibility': {
      const roles    = ['button','dialog','listbox','slider','alert','menu']
      const browsers = ['Chrome','Firefox','Safari','Edge']
      const attn = [
        [0.95, 0.92, 0.88, 0.94],
        [0.85, 0.80, 0.70, 0.82],
        [0.90, 0.85, 0.78, 0.88],
        [0.75, 0.72, 0.60, 0.74],
        [0.92, 0.90, 0.85, 0.90],
        [0.80, 0.75, 0.65, 0.78],
      ]
      return { tokens: roles, colTokens: browsers, attn, title: 'Screen reader support: 6 ARIA roles × 4 browsers. High = well-supported, low = inconsistent behaviour.', colorDomain: [0, 1], rowLabel: 'Role', colLabel: 'Browser' }
    }

    case 'static-analysis': {
      const rules = ['unused-var','no-any','complexity','null-deref','sec-inject','style']
      const files = ['auth.ts','api.ts','utils.ts','models.ts','routes.ts']
      const attn = [
        [0.10, 0.40, 0.20, 0.05, 0.60],
        [0.80, 0.60, 0.30, 0.90, 0.50],
        [0.20, 0.50, 0.70, 0.10, 0.40],
        [0.00, 0.70, 0.10, 0.00, 0.30],
        [0.90, 0.00, 0.10, 0.80, 0.00],
        [0.50, 0.30, 0.60, 0.20, 0.70],
      ]
      return { tokens: rules, colTokens: files, attn, title: 'Static analysis: 6 rule categories × 5 files. Darker = more violations. Security rules (sec-inject) need urgent attention.', colorDomain: [0, 1], rowLabel: 'Rule', colLabel: 'File' }
    }

    case 'technical-debt': {
      const categories = ['Tests','Docs','Arch','Perf','Deps']
      const dimensions = ['Effort','Impact','Urgency','Visibility']
      const attn = [
        [0.60, 0.80, 0.70, 0.90],
        [0.30, 0.50, 0.40, 0.30],
        [0.90, 0.85, 0.75, 0.40],
        [0.50, 0.70, 0.60, 0.55],
        [0.20, 0.60, 0.85, 0.35],
      ]
      return { tokens: categories, colTokens: dimensions, attn, title: 'Technical debt: 5 categories × 4 dimensions. High urgency + low visibility (deps) = highest hidden risk.', colorDomain: [0, 1], rowLabel: 'Category', colLabel: 'Dimension' }
    }

    // Default attention (attention-mechanism) and all generic modes
    default: {
      // Generic metric comparison for unknown modes
      const isGeneric = mode && !['attention-mechanism', 'transformer-attention'].includes(mode)
      if (isGeneric) {
        const metrics  = ['metric0','metric1','metric2','metric3','metric4','metric5']
        const variants = ['var0','var1','var2','var3','var4','var5']
        const attn = [
          [0.90, 0.45, 0.30, 0.60, 0.20, 0.75],
          [0.35, 0.85, 0.55, 0.25, 0.70, 0.40],
          [0.60, 0.40, 0.80, 0.50, 0.35, 0.55],
          [0.25, 0.65, 0.45, 0.88, 0.60, 0.30],
          [0.70, 0.30, 0.65, 0.40, 0.82, 0.50],
          [0.45, 0.75, 0.35, 0.55, 0.45, 0.86],
        ]
        return { tokens: metrics, colTokens: variants, attn, title: `${mode}: metric comparison matrix. Darker cells = higher value.`, colorDomain: [0, 1], rowLabel: 'Metric', colLabel: 'Variant' }
      }
      // attention-mechanism default
      const tokens = ['The', 'cat', 'sat', 'on', 'the', 'mat']
      const attn = [
        [0.42, 0.08, 0.10, 0.05, 0.30, 0.05],
        [0.06, 0.45, 0.18, 0.04, 0.05, 0.22],
        [0.05, 0.30, 0.32, 0.10, 0.04, 0.19],
        [0.08, 0.12, 0.12, 0.36, 0.08, 0.24],
        [0.38, 0.06, 0.08, 0.06, 0.36, 0.06],
        [0.06, 0.20, 0.14, 0.22, 0.05, 0.33],
      ]
      return { tokens, attn, title: 'Transformer self-attention: 6×6 weight matrix. Rows = queries, cols = keys. Darker = higher attention.', colorDomain: [0, 0.5] }
    }
  }
}

function buildSteps(matrixCfg) {
  const { tokens, attn, title, colTokens, special, studentAttn } = matrixCfg
  const rowTokens = tokens
  const cols = colTokens ?? tokens

  if (special === 'distillation') {
    return [
      { activeRow: -1, showStudent: false, annotation: title },
      { activeRow: -1, showStudent: false, annotation: 'Teacher network: sharp, high-confidence predictions. Softmax temperature T=1 (hard targets).' },
      { activeRow: -1, showStudent: true,  annotation: 'Student network: softer predictions (T=4). Learns from teacher\'s soft targets — captures dark knowledge.' },
      { activeRow: 0,  showStudent: false, annotation: `Teacher class A: high confidence [0.95, 0.02, 0.02, 0.01]. Student learns this distribution, not just the argmax.` },
      { activeRow: 0,  showStudent: true,  annotation: `Student class A: softened [0.70, 0.10, 0.12, 0.08]. Preserves relative similarities between classes.` },
    ]
  }

  return [
    { activeRow: -1, annotation: title },
    ...rowTokens.map((tok, i) => ({
      activeRow: i,
      annotation: (() => {
        const row = attn[i]
        const maxJ = row.indexOf(Math.max(...row))
        const maxCol = cols[maxJ]
        return `Row "${tok}": highest value → "${maxCol}" (${Math.max(...row).toFixed(2)}). ${
          attn[i].filter(v => v < 0.05).length > attn[i].length * 0.4 ? 'Sparse row — focused attention.' : 'Distributed attention.'
        }`
      })(),
    })),
  ]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HeatmapGrid({ config = {} }) {
  const matrixCfg = useMemo(() => getModeMatrix(config.mode), [config.mode])
  const steps = useMemo(() => buildSteps(matrixCfg), [matrixCfg])

  const [step,    setStep]    = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed,   setSpeed]   = useState(1)

  const cur = steps[Math.min(step, steps.length - 1)]

  useInterval(
    () => { if (step < steps.length - 1) setStep(s => s + 1); else setPlaying(false) },
    playing ? SPEED_MS[speed] : null,
  )

  const handleReset = useCallback(() => { setStep(0); setPlaying(false) }, [])

  const colorScale = useMemo(() =>
    d3.scaleSequential(d3.interpolateYlOrRd).domain(matrixCfg.colorDomain ?? [0, 0.5]), [matrixCfg])

  const rowTokens = matrixCfg.tokens
  const colTokens = matrixCfg.colTokens ?? matrixCfg.tokens

  // For distillation: which matrix to show
  const activeMatrix = (matrixCfg.special === 'distillation' && cur.showStudent)
    ? matrixCfg.studentAttn
    : matrixCfg.attn

  const CELL = Math.min(58, Math.floor(360 / Math.max(rowTokens.length, colTokens.length)))

  return (
    <div className="flex flex-col gap-3">
      {/* Heatmap grid */}
      <div className="rounded-lg border border-surface-600 bg-surface-800 p-4 overflow-x-auto">
        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 2 }}>
          {/* Column headers */}
          <div style={{ display: 'flex', marginLeft: CELL + 8 }}>
            {colTokens.map((tok, j) => (
              <div key={j} style={{ width: CELL }} className="flex items-end justify-center pb-1">
                <span className="text-[10px] font-mono text-gray-400 leading-none"
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 32 }}>
                  {tok}
                </span>
              </div>
            ))}
          </div>

          {/* Rows */}
          {rowTokens.map((qTok, i) => {
            const isActiveRow = cur.activeRow === i
            const rowData = activeMatrix[i] ?? []
            return (
              <div key={i} style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                {/* Row header */}
                <div style={{ width: CELL }} className="flex items-center justify-end pr-2">
                  <span className={`text-[11px] font-mono font-semibold ${isActiveRow ? 'text-dsa-300' : 'text-gray-500'}`}>
                    {qTok}
                  </span>
                </div>

                {/* Cells */}
                {rowData.map((w, j) => {
                  const bg = colorScale(w)
                  const textColor = w > 0.28 ? '#000' : '#fff'
                  return (
                    <motion.div key={j}
                      style={{ width: CELL, height: CELL }}
                      animate={{
                        backgroundColor: bg,
                        opacity: cur.activeRow === -1 ? 1 : isActiveRow ? 1 : 0.35,
                        scale: isActiveRow && w === Math.max(...rowData) ? 1.08 : 1,
                        outline: isActiveRow ? '1.5px solid #60a5fa' : '0px solid transparent',
                      }}
                      transition={{ duration: 0.25 }}
                      className="rounded-sm flex items-center justify-center"
                    >
                      <span style={{ color: textColor }} className="text-[10px] font-mono font-semibold">
                        {w.toFixed(2)}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Distillation indicator */}
      {matrixCfg.special === 'distillation' && (
        <div className="flex gap-3 text-xs font-mono">
          <div className={`px-2 py-1 rounded border ${!cur.showStudent ? 'border-dsa-500/60 text-dsa-400' : 'border-surface-600 text-gray-600'}`}>
            Teacher (T=1, sharp)
          </div>
          <div className={`px-2 py-1 rounded border ${cur.showStudent ? 'border-green-500/60 text-green-400' : 'border-surface-600 text-gray-600'}`}>
            Student (T=4, soft)
          </div>
        </div>
      )}

      {/* Color scale legend */}
      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span>{(matrixCfg.colorDomain?.[0] ?? 0).toFixed(2)}</span>
        <div className="flex-1 h-2 rounded overflow-hidden" style={{
          background: 'linear-gradient(to right, #1a0533, #7c1d0d, #d94e13, #facc15)',
        }} />
        <span>{(matrixCfg.colorDomain?.[1] ?? 0.5).toFixed(2)}+</span>
        <span className="text-gray-400 ml-2">{matrixCfg.special === 'distillation' ? 'probability' : matrixCfg.rowLabel ? 'value' : 'attention weight'}</span>
      </div>

      {/* Active row stats */}
      <AnimatePresence>
        {cur.activeRow >= 0 && (
          <motion.div key={cur.activeRow}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex gap-2 flex-wrap text-xs font-mono"
          >
            {(activeMatrix[cur.activeRow] ?? []).map((w, j) => (
              <div key={j} className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface-700 border border-surface-600">
                <span className="text-gray-400">{colTokens[j]}:</span>
                <span className="font-bold" style={{ color: w > 0.3 ? '#facc15' : '#9ca3af' }}>
                  {w.toFixed(2)}
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

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
