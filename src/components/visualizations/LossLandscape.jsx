import { useState, useMemo, useCallback } from 'react'
import * as d3 from 'd3'
import { motion } from 'framer-motion'
import StepControls from './StepControls.jsx'
import { useInterval } from '../../hooks/useInterval.js'

const SPEED_MS = { 0.5: 1600, 1: 700, 1.5: 467, 2: 350, 3: 233 }

// ─── Mode config lookup ───────────────────────────────────────────────────────

function normalizeLossMode(rawMode) {
  const m = (rawMode || '').toLowerCase().trim()
  const map = {
    'adam': 'adam-optimizer',
    'bias-variance': 'bias-variance-tradeoff',
    'convex-nonconvex': 'convex-vs-nonconvex',
    'dqn-training': 'deep-q-network',
    'gradient-descent': 'stochastic-gradient-descent',
    'regularization': 'l1-l2-regularization',
    'lr-schedule': 'learning-rate-scheduling',
    'loss-comparison': 'loss-functions',
    'mini-batch-gd': 'mini-batch-gradient-descent',
    'bandit': 'multi-armed-bandit',
    'sgd': 'stochastic-gradient-descent',
    'gradient-flow': 'vanishing-exploding-gradients',
  }
  return map[m] || m
}

function getModeConfig(rawMode) {
  const mode = normalizeLossMode(rawMode)
  switch (mode) {
    case 'stochastic-gradient-descent':
      return {
        fn: w => (w - 3) ** 2 + 1,
        grad: w => 2 * (w - 3),
        w0: 9, lr: 0.15, steps: 24, noise: 0.4,
        optimum: { w: 3, loss: 1 },
        note: 'SGD: f(w)=(w−3)²+1, lr=0.15, high noise (±0.4). Noisy but converges on average.',
        statLabels: ['iter', 'w', 'loss', '∇loss'],
        xLabel: 'Iteration',
      }
    case 'mini-batch-gradient-descent':
      return {
        fn: w => (w - 3) ** 2 + 1,
        grad: w => 2 * (w - 3),
        w0: 9, lr: 0.2, steps: 20, noise: 0.15,
        optimum: { w: 3, loss: 1 },
        note: 'Mini-Batch GD: f(w)=(w−3)²+1, lr=0.2, moderate noise (±0.15). Smoother than SGD.',
        statLabels: ['iter', 'w', 'loss', '∇loss'],
        xLabel: 'Iteration',
      }
    case 'adam-optimizer':
      return {
        fn: w => (w - 3) ** 2 + 1,
        grad: w => 2 * (w - 3),
        w0: 9, lr: 0.8, steps: 12, noise: 0,
        optimum: { w: 3, loss: 1 },
        note: 'Adam: f(w)=(w−3)²+1, lr=0.8, adaptive moments. Fast smooth convergence.',
        statLabels: ['iter', 'w', 'loss', '∇loss'],
        xLabel: 'Iteration',
      }
    case 'adagrad':
      return {
        fn: w => (w - 3) ** 2 + 1,
        grad: w => 2 * (w - 3),
        w0: 9, lr: 0.5, steps: 20, noise: 0,
        optimum: { w: 3, loss: 1 },
        note: 'Adagrad: f(w)=(w−3)²+1, lr decays over time. Slows down as gradient accumulates.',
        statLabels: ['iter', 'w', 'loss', '∇loss'],
        xLabel: 'Iteration',
        adagrad: true,
      }
    case 'rmsprop':
      return {
        fn: w => (w - 3) ** 2 + 1,
        grad: w => 2 * (w - 3),
        w0: 9, lr: 0.4, steps: 16, noise: 0,
        optimum: { w: 3, loss: 1 },
        note: 'RMSProp: f(w)=(w−3)²+1, lr=0.4 with exponential gradient moving average.',
        statLabels: ['iter', 'w', 'loss', '∇loss'],
        xLabel: 'Iteration',
        rmsprop: true,
      }
    case 'learning-rate-scheduling':
      return {
        fn: w => (w - 3) ** 2 + 1,
        grad: w => 2 * (w - 3),
        w0: 9, lr: 0.6, steps: 20, noise: 0,
        optimum: { w: 3, loss: 1 },
        note: 'LR Scheduling: starts at lr=0.6, decays to lr=0.05. Fast then fine-grained.',
        statLabels: ['iter', 'w', 'loss', '∇loss'],
        xLabel: 'Iteration',
        lrSchedule: true,
      }
    case 'saddle-points':
      return {
        fn: w => w ** 2 - 2 * w + 1,
        grad: w => 2 * w - 2,
        w0: 0, lr: 0.2, steps: 20, noise: 0,
        optimum: { w: 1, loss: 0 },
        note: 'Saddle point demo: f(w)=w²−2w+1=(w−1)². Starts at w=0, converges to w=1.',
        statLabels: ['iter', 'w', 'loss', '∇loss'],
        xLabel: 'Iteration',
      }
    case 'convex-vs-nonconvex':
      return {
        fn: w => w ** 4 - 4 * w ** 2 + 4,
        grad: w => 4 * w ** 3 - 8 * w,
        w0: 2.5, lr: 0.05, steps: 20, noise: 0,
        optimum: { w: 1.414, loss: 0 },
        note: 'Non-convex: f(w)=w⁴−4w²+4, start w=2.5, lr=0.05. Gets stuck in local minimum near w≈√2.',
        statLabels: ['iter', 'w', 'loss', '∇loss'],
        xLabel: 'Iteration',
      }
    case 'l1-l2-regularization':
      return {
        fn: w => (w - 3) ** 2 + 0.5 * Math.abs(w),
        grad: w => 2 * (w - 3) + 0.5 * Math.sign(w),
        w0: 9, lr: 0.2, steps: 18, noise: 0,
        optimum: { w: 2.75, loss: 0.0625 },
        note: 'L1 regularization: f(w)=(w−3)²+0.5|w|, lr=0.2. Regularizer shrinks w toward 0.',
        statLabels: ['iter', 'w', 'loss', '∇loss'],
        xLabel: 'Iteration',
      }
    case 'bias-variance-tradeoff':
      return { special: 'bias-variance' }
    case 'loss-functions':
      return { special: 'loss-functions' }
    case 'vanishing-exploding-gradients':
      return { special: 'vanishing-gradients' }
    case 'overfitting-underfitting':
    case 'memory-leaks-backend':
    case 'profiling-benchmarking':
      return {
        fn: w => Math.exp(-w * 0.3) * 5 + 1,
        grad: w => -0.3 * Math.exp(-w * 0.3) * 5,
        w0: 0, lr: 1, steps: 18, noise: 0,
        optimum: { w: 18, loss: 1 },
        note: `Performance over time: exponential improvement curve. Metric improves with ${mode}.`,
        statLabels: ['step', 'param', 'metric', '∇metric'],
        xLabel: 'Step',
      }
    case 'actor-critic':
    case 'deep-q-network':
    case 'multi-armed-bandit':
    case 'policy-gradient':
    case 'ppo':
    case 'thompson-sampling':
      return { special: 'rl-reward', mode }
    default:
      return {
        fn: w => (w - 3) ** 2 + 1,
        grad: w => 2 * (w - 3),
        w0: 9, lr: 0.25, steps: 18, noise: 0,
        optimum: { w: 3, loss: 1 },
        note: 'Gradient descent: f(w)=(w−3)²+1, lr=0.25. Smooth convergence to minimum.',
        statLabels: ['iter', 'w', 'loss', '∇loss'],
        xLabel: 'Iteration',
      }
  }
}

// ─── Step generators ──────────────────────────────────────────────────────────

function generateSteps(cfg) {
  if (cfg.special === 'bias-variance') {
    const steps = []
    for (let i = 0; i < 16; i++) {
      const complexity = i / 15
      const trainLoss = Math.max(0.05, 1.0 - complexity * 0.9)
      const valLoss   = 0.2 + (complexity - 0.4) ** 2 * 2.5
      steps.push({
        iter: i, w: +complexity.toFixed(3),
        loss: +valLoss.toFixed(4), grad: +trainLoss.toFixed(4),
        trainLoss, valLoss,
        annotation: i === 0
          ? 'Bias-variance tradeoff: as model complexity grows, train loss falls but val loss forms U-shape.'
          : `Complexity=${complexity.toFixed(2)}: train=${trainLoss.toFixed(3)}, val=${valLoss.toFixed(3)}.`
            + (complexity < 0.3 ? ' Underfitting region.' : complexity > 0.7 ? ' Overfitting region.' : ' Sweet spot.'),
      })
    }
    return steps
  }

  if (cfg.special === 'loss-functions') {
    const steps = []
    const losses = ['MSE', 'MAE', 'Huber']
    for (let i = 0; i < 4; i++) {
      steps.push({
        iter: i, w: i, loss: 0, grad: 0,
        highlight: i === 0 ? -1 : i - 1,
        annotation: i === 0
          ? 'Loss function comparison: MSE, MAE, and Huber loss plotted over prediction error range.'
          : `Highlighted: ${losses[i - 1]}. ${
              i === 1 ? 'MSE (squared error) penalizes large errors heavily — quadratic.'
              : i === 2 ? 'MAE (absolute error) is robust to outliers — linear.'
              : 'Huber loss: quadratic for small errors, linear for large — best of both.'
            }`,
      })
    }
    return steps
  }

  if (cfg.special === 'vanishing-gradients') {
    const steps = []
    for (let i = 0; i < 9; i++) {
      const gradMag = Math.pow(0.1, i / 1.5)
      steps.push({
        iter: i, w: i, loss: gradMag, grad: gradMag,
        annotation: i === 0
          ? 'Vanishing gradients: gradient magnitude at each layer during backprop.'
          : `Layer ${i}: gradient = ${gradMag.toFixed(5)}. ${gradMag < 0.01 ? 'Nearly vanished — no learning signal.' : gradMag < 0.1 ? 'Fading fast.' : 'Still significant.'}`,
      })
    }
    return steps
  }

  if (cfg.special === 'rl-reward') {
    const steps = []
    for (let i = 0; i < 20; i++) {
      const noise = Math.sin(i * 1.7) * 0.8
      const reward = 10 * (1 - Math.exp(-i / 5)) + noise
      steps.push({
        iter: i, w: +reward.toFixed(3), loss: +reward.toFixed(3), grad: +(10 / 5 * Math.exp(-i / 5)).toFixed(3),
        annotation: i === 0
          ? `${cfg.mode}: reward per episode. Agent learns to maximize cumulative reward over time.`
          : `Episode ${i}: reward=${reward.toFixed(2)}, ∇policy=${(10 / 5 * Math.exp(-i / 5)).toFixed(3)}. ${reward > 8 ? 'Near-optimal policy.' : reward > 4 ? 'Improving.' : 'Exploring.'}`,
      })
    }
    return steps
  }

  const { fn, grad, w0, lr, steps: nSteps, noise, adagrad, rmsprop, lrSchedule } = cfg
  let w = w0
  const steps = []
  let G = 0      // Adagrad accumulated squared grad
  let v = 0      // RMSProp moving avg
  const rho = 0.9

  for (let i = 0; i < nSteps; i++) {
    const loss = fn(w)
    const g = grad(w)
    const noiseTerm = noise ? Math.sin(i * 1.7) * noise : 0
    const effGrad = g + noiseTerm

    let currentLr = lr
    if (lrSchedule) currentLr = lr * Math.exp(-i * 0.12)
    if (adagrad)    { G += effGrad ** 2; currentLr = lr / (Math.sqrt(G) + 1e-8) }
    if (rmsprop)    { v = rho * v + (1 - rho) * effGrad ** 2; currentLr = lr / (Math.sqrt(v) + 1e-8) }

    steps.push({
      iter: i, w: +w.toFixed(4),
      loss: +loss.toFixed(4),
      grad: +g.toFixed(3),
      annotation: i === 0
        ? `Start: w=${w.toFixed(2)}, loss=${loss.toFixed(3)}. Gradient=${g.toFixed(2)}. Stepping downhill…`
        : `Step ${i}: w=${w.toFixed(3)}, loss=${loss.toFixed(4)}, ∇=${g.toFixed(3)}${lrSchedule ? `, lr=${currentLr.toFixed(3)}` : ''}`,
    })
    w = w - currentLr * effGrad
  }
  return steps
}

// ─── Bias-variance special render ────────────────────────────────────────────

function BiasVarianceChart({ steps, step, xScale, yScale, iH, iW }) {
  const cur = steps[step]
  const trainPath = useMemo(() => {
    const pts = steps.slice(0, step + 1)
    if (pts.length < 2) return null
    return d3.line().x((_, i) => xScale(i)).y(d => yScale(d.trainLoss)).curve(d3.curveCatmullRom)(pts)
  }, [steps, step, xScale, yScale])
  const valPath = useMemo(() => {
    const pts = steps.slice(0, step + 1)
    if (pts.length < 2) return null
    return d3.line().x((_, i) => xScale(i)).y(d => yScale(d.valLoss)).curve(d3.curveCatmullRom)(pts)
  }, [steps, step, xScale, yScale])
  const fullTrain = useMemo(() => d3.line().x((_, i) => xScale(i)).y(d => yScale(d.trainLoss)).curve(d3.curveCatmullRom)(steps), [steps, xScale, yScale])
  const fullVal   = useMemo(() => d3.line().x((_, i) => xScale(i)).y(d => yScale(d.valLoss)).curve(d3.curveCatmullRom)(steps), [steps, xScale, yScale])
  return (
    <>
      <path d={fullTrain} fill="none" stroke="#1d3557" strokeWidth={1.5} strokeDasharray="4 3" />
      <path d={fullVal}   fill="none" stroke="#3d1515" strokeWidth={1.5} strokeDasharray="4 3" />
      {trainPath && <path d={trainPath} fill="none" stroke="#3b82f6" strokeWidth={2} />}
      {valPath   && <path d={valPath}   fill="none" stroke="#ef4444" strokeWidth={2} />}
      <motion.circle animate={{ cx: xScale(cur.iter), cy: yScale(cur.trainLoss) }} transition={{ duration: 0.28 }} r={5} fill="#3b82f6" stroke="#93c5fd" strokeWidth={2} />
      <motion.circle animate={{ cx: xScale(cur.iter), cy: yScale(cur.valLoss)   }} transition={{ duration: 0.28 }} r={5} fill="#ef4444" stroke="#fca5a5" strokeWidth={2} />
      <text x={xScale(steps.length - 1) + 4} y={yScale(steps[steps.length - 1].trainLoss)} fill="#3b82f6" fontSize={9} dominantBaseline="middle">train</text>
      <text x={xScale(steps.length - 1) + 4} y={yScale(steps[steps.length - 1].valLoss)} fill="#ef4444" fontSize={9} dominantBaseline="middle">val</text>
    </>
  )
}

// ─── Loss functions special render ───────────────────────────────────────────

function LossFunctionsChart({ step, xScale, yScale, iH, iW }) {
  const errRange = d3.range(-3, 3.1, 0.15)
  const msePath  = d3.line().x(e => xScale((e + 3) / 6 * 15)).y(e => yScale(Math.min(e ** 2, 10))).curve(d3.curveCatmullRom)(errRange)
  const maePath  = d3.line().x(e => xScale((e + 3) / 6 * 15)).y(e => yScale(Math.abs(e))).curve(d3.curveCatmullRom)(errRange)
  const huberPath = d3.line().x(e => xScale((e + 3) / 6 * 15)).y(e => yScale(Math.abs(e) < 1 ? 0.5 * e ** 2 : Math.abs(e) - 0.5)).curve(d3.curveCatmullRom)(errRange)
  const paths = [
    { d: msePath,   color: '#f59e0b', label: 'MSE',   idx: 0 },
    { d: maePath,   color: '#3b82f6', label: 'MAE',   idx: 1 },
    { d: huberPath, color: '#22c55e', label: 'Huber', idx: 2 },
  ]
  const hl = step - 1  // which is highlighted (-1 = none)
  return (
    <>
      {paths.map(({ d, color, label, idx }) => (
        <g key={label}>
          <path d={d} fill="none" stroke={color} strokeWidth={hl === -1 || hl === idx ? 2.5 : 1} strokeOpacity={hl === -1 || hl === idx ? 1 : 0.3} />
          <text x={xScale(15) + 4} y={yScale(idx === 0 ? 9 : idx === 1 ? 3 : 2.5)} fill={color} fontSize={9} dominantBaseline="middle" opacity={hl === -1 || hl === idx ? 1 : 0.3}>{label}</text>
        </g>
      ))}
    </>
  )
}

// ─── Vanishing gradients render ───────────────────────────────────────────────

function VanishingChart({ steps, step, xScale, yScale }) {
  const pts = steps.slice(0, step + 1)
  if (pts.length < 2) return null
  const path = d3.line().x((_, i) => xScale(i)).y(d => yScale(d.loss)).curve(d3.curveCatmullRom)(pts)
  const fullPath = d3.line().x((_, i) => xScale(i)).y(d => yScale(d.loss)).curve(d3.curveCatmullRom)(steps)
  const cur = steps[step]
  return (
    <>
      <path d={fullPath} fill="none" stroke="#374151" strokeWidth={1.5} strokeDasharray="4 3" />
      <path d={path}     fill="none" stroke="#ef4444" strokeWidth={2} />
      <motion.circle animate={{ cx: xScale(cur.iter), cy: yScale(cur.loss) }} transition={{ duration: 0.28 }} r={6} fill="#ef4444" stroke="#fca5a5" strokeWidth={2} />
    </>
  )
}

// ─── RL reward render ─────────────────────────────────────────────────────────

function RLChart({ steps, step, xScale, yScale }) {
  const pts = steps.slice(0, step + 1)
  if (pts.length < 2) return null
  const path = d3.line().x((_, i) => xScale(i)).y(d => yScale(d.loss)).curve(d3.curveCatmullRom)(pts)
  const fullPath = d3.line().x((_, i) => xScale(i)).y(d => yScale(d.loss)).curve(d3.curveCatmullRom)(steps)
  const cur = steps[step]
  return (
    <>
      <path d={fullPath} fill="none" stroke="#374151" strokeWidth={1.5} strokeDasharray="4 3" />
      <path d={path}     fill="none" stroke="#22c55e" strokeWidth={2} />
      <motion.circle animate={{ cx: xScale(cur.iter), cy: yScale(cur.loss) }} transition={{ duration: 0.28 }} r={6} fill="#22c55e" stroke="#86efac" strokeWidth={2} />
    </>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LossLandscape({ config = {} }) {
  const modeConfig = useMemo(() => getModeConfig(config.mode), [config.mode])
  const steps = useMemo(() => generateSteps(modeConfig), [modeConfig])

  const [step,    setStep]    = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed,   setSpeed]   = useState(1)

  const cur = steps[step]

  useInterval(
    () => { if (step < steps.length - 1) setStep(s => s + 1); else setPlaying(false) },
    playing ? SPEED_MS[speed] : null,
  )

  const handleReset = useCallback(() => { setStep(0); setPlaying(false) }, [])

  // Chart geometry
  const W = 480, H = 260
  const mg = { top: 20, right: 40, bottom: 40, left: 50 }
  const iW = W - mg.left - mg.right
  const iH = H - mg.top  - mg.bottom

  const xScale = useMemo(() =>
    d3.scaleLinear().domain([0, steps.length - 1]).range([0, iW]), [steps.length, iW])

  const yDomain = useMemo(() => {
    if (modeConfig.special === 'bias-variance') return [0, 3]
    if (modeConfig.special === 'loss-functions') return [0, 10]
    if (modeConfig.special === 'vanishing-gradients') return [0, 1.05]
    if (modeConfig.special === 'rl-reward') return [-1, 11]
    const losses = steps.map(s => s.loss)
    return [Math.max(0, Math.min(...losses) * 0.9), Math.max(...losses) * 1.05]
  }, [steps, modeConfig.special])

  const yScale = useMemo(() =>
    d3.scaleLinear().domain(yDomain).range([iH, 0]).nice(), [yDomain, iH])

  // Full faded guide path (standard modes)
  const fullPath = useMemo(() => {
    if (modeConfig.special) return null
    return d3.line().x((_, i) => xScale(i)).y(d => yScale(d.loss)).curve(d3.curveCatmullRom)(steps)
  }, [steps, xScale, yScale, modeConfig.special])

  // Traversed path up to current step (standard modes)
  const activePath = useMemo(() => {
    if (modeConfig.special) return null
    const pts = steps.slice(0, step + 1)
    if (pts.length < 2) return null
    return d3.line().x((_, i) => xScale(i)).y(d => yScale(d.loss)).curve(d3.curveCatmullRom)(pts)
  }, [steps, step, xScale, yScale, modeConfig.special])

  const dotX = xScale(cur.iter)
  const dotY = yScale(cur.loss)
  const yTicks = yScale.ticks(5)

  const isRL       = modeConfig.special === 'rl-reward'
  const isVanish   = modeConfig.special === 'vanishing-gradients'
  const isBV       = modeConfig.special === 'bias-variance'
  const isLossFns  = modeConfig.special === 'loss-functions'

  // Stat labels
  const statLabels = isRL
    ? ['episode', 'reward', '∇policy', 'lr']
    : (modeConfig.statLabels ?? ['iter', 'w', 'loss', '∇loss'])

  // Stats row values
  const statsData = [
    { label: statLabels[0], val: cur.iter,               color: 'text-gray-300' },
    { label: statLabels[1], val: isRL ? cur.w : cur.w?.toFixed?.(4) ?? cur.w, color: 'text-dsa-400' },
    { label: statLabels[2], val: isRL ? cur.loss?.toFixed?.(3) : isBV ? `tr=${cur.grad?.toFixed(3)},v=${cur.loss?.toFixed(3)}` : isLossFns ? ['—','MSE','MAE','Huber'][step] : isVanish ? cur.loss?.toFixed?.(5) : cur.loss?.toFixed?.(4), color: 'text-red-400' },
    { label: statLabels[3], val: isRL ? `${modeConfig.mode}` : cur.grad?.toFixed?.(3), color: 'text-yellow-400' },
  ]

  const noteText = modeConfig.special === 'bias-variance'
    ? 'Bias-variance: blue=train loss (decreasing), red=val loss (U-shape). Complexity axis.'
    : modeConfig.special === 'loss-functions'
    ? 'Loss functions compared: MSE=quadratic, MAE=linear (outlier-robust), Huber=hybrid.'
    : modeConfig.special === 'vanishing-gradients'
    ? 'Vanishing gradients: gradient magnitude decays exponentially through layers during backprop.'
    : modeConfig.special === 'rl-reward'
    ? `RL reward curve: f(e)=10·(1−e^{−e/5})+noise. Agent improves as policy is optimized.`
    : (modeConfig.note ?? 'Gradient descent on f(w)=(w−3)²+1.')

  const xLabelText = isRL ? 'Episode' : isVanish ? 'Layer' : isBV ? 'Complexity' : isLossFns ? 'Error' : (modeConfig.xLabel ?? 'Iteration')

  const yLabelText = isRL ? 'Reward' : isVanish ? '|∇|' : isBV ? 'Loss' : isLossFns ? 'Loss' : 'Loss'

  // x-axis ticks
  const xTickVals = useMemo(() => {
    const n = steps.length
    const ticks = [0]
    if (n > 4) ticks.push(Math.floor(n / 4))
    if (n > 2) ticks.push(Math.floor(n / 2))
    if (n > 4) ticks.push(Math.floor(3 * n / 4))
    ticks.push(n - 1)
    return [...new Set(ticks)]
  }, [steps.length])

  return (
    <div className="flex flex-col gap-3">
      {/* Stats row */}
      <div className="flex gap-2 flex-wrap text-xs font-mono">
        {statsData.slice(0, isBV ? 3 : isLossFns ? 3 : 4).map(({ label, val, color }) => (
          <div key={label} className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface-700 border border-surface-600">
            <span className="text-gray-400">{label}:</span>
            <motion.span key={String(val)} animate={{ opacity: [0.4, 1] }} transition={{ duration: 0.2 }}
              className={`font-bold ${color}`}>{val}</motion.span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-lg border border-surface-600 bg-surface-800 overflow-hidden">
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxHeight: 270 }}>
          <g transform={`translate(${mg.left},${mg.top})`}>
            {/* Grid */}
            {yTicks.map(t => (
              <line key={t} x1={0} x2={iW} y1={yScale(t)} y2={yScale(t)}
                stroke="#26262e" strokeWidth={1} />
            ))}

            {/* Y axis */}
            <line x1={0} x2={0} y1={0} y2={iH} stroke="#374151" />
            {yTicks.map(t => (
              <g key={t} transform={`translate(-4,${yScale(t)})`}>
                <line x1={0} x2={4} stroke="#4b5563" />
                <text x={-6} textAnchor="end" dominantBaseline="middle"
                  fill="#6b7280" fontSize={9} fontFamily="monospace">
                  {Math.abs(t) < 0.01 ? t.toFixed(3) : t.toFixed(isVanish ? 2 : 0)}
                </text>
              </g>
            ))}
            <text transform={`translate(-36,${iH / 2}) rotate(-90)`}
              textAnchor="middle" fill="#6b7280" fontSize={10} fontFamily="Inter,sans-serif">
              {yLabelText}
            </text>

            {/* X axis */}
            <line x1={0} x2={iW} y1={iH} y2={iH} stroke="#374151" />
            {xTickVals.map(t => (
              <text key={t} x={xScale(t)} y={iH + 14} textAnchor="middle"
                fill="#6b7280" fontSize={9} fontFamily="monospace">
                {t}
              </text>
            ))}
            <text x={iW / 2} y={iH + 32} textAnchor="middle"
              fill="#6b7280" fontSize={10} fontFamily="Inter,sans-serif">
              {xLabelText}
            </text>

            {/* Special renders */}
            {isBV && (
              <BiasVarianceChart steps={steps} step={step} xScale={xScale} yScale={yScale} iH={iH} iW={iW} />
            )}
            {isLossFns && (
              <LossFunctionsChart step={step} xScale={xScale} yScale={yScale} iH={iH} iW={iW} />
            )}
            {isVanish && (
              <VanishingChart steps={steps} step={step} xScale={xScale} yScale={yScale} />
            )}
            {isRL && (
              <RLChart steps={steps} step={step} xScale={xScale} yScale={yScale} />
            )}

            {/* Standard mode curves */}
            {!modeConfig.special && (
              <>
                {/* Optimal line */}
                {modeConfig.optimum && (
                  <>
                    <line x1={0} x2={iW} y1={yScale(modeConfig.optimum.loss)} y2={yScale(modeConfig.optimum.loss)}
                      stroke="#374151" strokeWidth={1} strokeDasharray="3 3" />
                    <text x={iW + 3} y={yScale(modeConfig.optimum.loss)} dominantBaseline="middle"
                      fill="#4b5563" fontSize={8} fontFamily="monospace">
                      min
                    </text>
                  </>
                )}

                {/* Full guide curve (faded) */}
                {fullPath && (
                  <path d={fullPath} fill="none" stroke="#374151" strokeWidth={1.5} strokeDasharray="4 3" />
                )}

                {/* Active traversed curve */}
                {activePath && (
                  <path d={activePath} fill="none" stroke="#ef4444" strokeWidth={2} />
                )}

                {/* Moving dot */}
                <motion.circle
                  animate={{ cx: dotX, cy: dotY }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                  r={6} fill="#ef4444" stroke="#fca5a5" strokeWidth={2}
                />
              </>
            )}
          </g>
        </svg>
      </div>

      {/* Convergence note */}
      <div className="text-xs text-gray-400 font-mono truncate">
        {noteText}
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
