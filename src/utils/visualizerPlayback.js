/**
 * Visualizer Playback Engine for TikTok & Shorts Video Mode.
 * Dynamically renders animated step-by-step visualizations on a 2D canvas
 * or SVG element, compressed or expanded to the slide's active time frame.
 */
import { getSteps, getDefaultSortArray } from './algorithms/registry.js'
import { computeLayout, resolveStateConfig, BOX_W, BOX_H } from '../components/visualizations/StateDiagram.jsx'
import { getInitialThemeForConcept } from './themePalettes.js'
import { TIMELINE_PRESETS, DEFAULT_TIMELINE_STEPS } from '../components/visualizations/TimelineStep.jsx'

function hexToRgba(hex = '#38bdf8', alpha = 0.2) {
  const clean = String(hex).replace('#', '')
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16)
    const g = parseInt(clean.substring(2, 4), 16)
    const b = parseInt(clean.substring(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return `rgba(56, 189, 248, ${alpha})`
}

/**
 * Determines the visualization category for a concept.
 */
export function getConceptVizCategory(concept = {}) {
  const type = (concept.visualization?.type || '').toLowerCase()
  const slug = (concept.slug || '').toLowerCase()
  const cat = (concept.category || '').toLowerCase()
  const domain = (concept.domain || '').toLowerCase()
  const mode = (concept.visualization?.config?.mode || '').toLowerCase()

  if (type === 'state-diagram' || type === 'state' || slug.includes('lifecycle') || mode === 'lifecycle' || (domain.includes('react') && type.includes('state'))) {
    return 'state-diagram'
  }
  if (type === 'array-bars' || slug.includes('sort')) {
    return 'sorting'
  }
  if (type === 'array-pointers' || slug.includes('search') || slug.includes('pointer') || slug.includes('binary-search')) {
    return 'search'
  }
  if (type === 'tree-canvas' || cat.includes('tree') || slug.includes('tree') || slug.includes('bst') || slug.includes('heap')) {
    return 'tree'
  }
  if (type === 'graph-traversal' || type === 'graph-canvas' || cat.includes('graph') || slug.includes('dijkstra') || slug.includes('bfs') || slug.includes('dfs')) {
    return 'graph'
  }
  if (type === 'matrix-grid' || cat.includes('dynamic') || slug.includes('matrix') || slug.includes('dp')) {
    return 'dp'
  }
  if (type.includes('neural') || type.includes('loss') || domain.includes('ml') || domain.includes('ai') || slug.includes('transformer') || slug.includes('attention')) {
    return 'neural'
  }
  if (type.includes('architecture') || type === 'arch-diagram' || slug.includes('cache') || slug.includes('lru') || domain.includes('system')) {
    return 'architecture'
  }
  return 'timeline'
}

/**
 * Draws the dynamic animated visualization frame on a 2D canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} concept
 * @param {{x: number, y: number, width: number, height: number}} box
 * @param {number} rawProgress 0.0 to 1.0
 * @param {Object|string} [theme] theme object or hex color string
 */
export function drawCanvasVizFrame(ctx, concept, box, rawProgress = 0, theme) {
  const progress = Math.min(1, Math.max(0, rawProgress))
  const category = getConceptVizCategory(concept)

  const resolvedTheme = (typeof theme === 'string' ? { primary: theme, secondary: theme } : theme) || getInitialThemeForConcept(concept)
  const primaryColor = resolvedTheme?.primary || '#38bdf8'

  ctx.save()

  // Background card with rounded corners
  ctx.fillStyle = '#111622'
  ctx.strokeStyle = '#1e2638'
  ctx.lineWidth = 2
  fillRoundRect(ctx, box.x, box.y, box.width, box.height, 16)
  ctx.stroke()

  // Clip inside card
  ctx.beginPath()
  roundRectPath(ctx, box.x, box.y, box.width, box.height, 16)
  ctx.clip()

  switch (category) {
    case 'state-diagram':
    case 'lifecycle':
      drawStateDiagram(ctx, concept, box, progress, primaryColor)
      break
    case 'sorting':
      drawSortingBars(ctx, concept, box, progress, primaryColor)
      break
    case 'search':
      drawSearchPointers(ctx, concept, box, progress, primaryColor)
      break
    case 'graph':
      drawGraphTraversal(ctx, concept, box, progress, primaryColor)
      break
    case 'tree':
      drawTreeTraversal(ctx, concept, box, progress, primaryColor)
      break
    case 'dp':
      drawMatrixGrid(ctx, concept, box, progress, primaryColor)
      break
    case 'neural':
      drawNeuralNetwork(ctx, concept, box, progress, primaryColor)
      break
    case 'architecture':
      drawSystemArchitecture(ctx, concept, box, progress, primaryColor)
      break
    case 'timeline':
    default:
      drawTimelineExecution(ctx, concept, box, progress, primaryColor)
      break
  }

  // Draw bottom progress strip & live indicator
  drawBottomStatusBar(ctx, box, progress, primaryColor)

  ctx.restore()
}

// ─── Visualizer Renderers ─────────────────────────────────────────────────────

function drawSortingBars(ctx, concept, box, progress, primaryColor = '#3b82f6') {
  let mode = concept.visualization?.config?.mode || concept.slug || 'quicksort'
  if (mode === 'sort-visualization') mode = concept.slug || 'quicksort'
  const defaultArr = getDefaultSortArray(mode) || [9, 3, 7, 4, 6, 2, 8, 5]
  const rawArray = concept.visualization?.config?.array || defaultArr
  // Keep array within 8-10 elements for high-impact visual clarity on vertical screens
  const inputArray = rawArray.length > 10 ? rawArray.slice(0, 10) : rawArray

  let steps = getSteps('sorting', mode, inputArray)
  if (!steps || steps.length === 0) {
    steps = getSteps('sorting', 'quicksort', inputArray)
  }
  if (!steps || steps.length === 0) return

  const totalSteps = steps.length
  const stepIdx = Math.min(totalSteps - 1, Math.floor(progress * totalSteps))
  const currentStep = (steps && steps.length > 0) ? (steps[stepIdx] || steps[0]) : { array: inputArray, swapping: [], sorted: [] }
  const arr = currentStep?.array || inputArray
  const n = arr.length
  const maxVal = Math.max(...arr, 1)

  // ── 1. Top Auxiliary Bar (exact site layout) ──────────────────────────────────
  ctx.textAlign = 'left'
  ctx.font = '10px JetBrains Mono, monospace'
  const auxY = box.y + 22
  let auxX = box.x + 16

  if (currentStep.pivot != null && currentStep.pivot >= 0) {
    ctx.fillStyle = '#9ca3af'
    ctx.fillText('Pivot: ', auxX, auxY)
    auxX += ctx.measureText('Pivot: ').width
    ctx.fillStyle = '#f59e0b'
    ctx.font = 'bold 10px JetBrains Mono, monospace'
    const pivValStr = String(arr[currentStep.pivot] ?? '')
    ctx.fillText(pivValStr, auxX, auxY)
    auxX += ctx.measureText(pivValStr).width
    ctx.fillStyle = '#64748b'
    ctx.font = '10px JetBrains Mono, monospace'
    const pivIdxStr = ` (idx ${currentStep.pivot})   `
    ctx.fillText(pivIdxStr, auxX, auxY)
    auxX += ctx.measureText(pivIdxStr).width
  }

  if (currentStep.lo != null && currentStep.hi != null && currentStep.lo >= 0) {
    ctx.fillStyle = '#9ca3af'
    ctx.fillText('Range: ', auxX, auxY)
    auxX += ctx.measureText('Range: ').width
    ctx.fillStyle = '#60a5fa'
    ctx.font = 'bold 10px JetBrains Mono, monospace'
    const rangeStr = `[${currentStep.lo}…${currentStep.hi}]`
    ctx.fillText(rangeStr, auxX, auxY)
  }

  // Right-aligned legend matching the site
  const legendItems = [
    { color: '#1d4ed8', text: 'Active' },
    { color: '#f59e0b', text: 'Pivot' },
    { color: '#fde68a', text: 'Comparing' },
    { color: '#ef4444', text: 'Swapping' },
    { color: '#16a34a', text: 'Sorted' },
  ]
  ctx.textAlign = 'right'
  ctx.font = '9px JetBrains Mono, monospace'
  let legRight = box.x + box.width - 16
  for (let k = legendItems.length - 1; k >= 0; k--) {
    const item = legendItems[k]
    ctx.fillStyle = '#9ca3af'
    ctx.fillText(item.text, legRight, auxY)
    legRight -= ctx.measureText(item.text).width + 4
    ctx.fillStyle = item.color
    ctx.fillRect(legRight - 8, auxY - 7, 7, 7)
    legRight -= 14
  }

  // ── 2. SVG Canvas Container (exact site appearance) ───────────────────────────
  const canvasY = box.y + 34
  const canvasH = box.height - 122
  ctx.fillStyle = '#0f1420'
  ctx.strokeStyle = '#1e2638'
  ctx.lineWidth = 1
  fillRoundRect(ctx, box.x + 12, canvasY, box.width - 24, canvasH, 8)
  ctx.stroke()

  const marginX = 28
  const usableW = box.width - marginX * 2
  const barAreaH = canvasH - 58
  const barW = Math.max(14, Math.floor(usableW / n) - 8)
  const gap = (usableW - barW * n) / (n - 1)
  const baseY = canvasY + canvasH - 24

  // Dashed range line indicator (lo..hi)
  if (currentStep.lo != null && currentStep.hi != null && currentStep.lo <= currentStep.hi) {
    const xLo = box.x + marginX + currentStep.lo * (barW + gap)
    const xHi = box.x + marginX + currentStep.hi * (barW + gap) + barW
    ctx.strokeStyle = '#4b5563'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 3])
    ctx.beginPath()
    ctx.moveTo(xLo, baseY + 14)
    ctx.lineTo(xHi, baseY + 14)
    ctx.stroke()
    ctx.setLineDash([])
  }

  for (let i = 0; i < n; i++) {
    const val = arr[i]
    const h = Math.max(14, Math.round((val / maxVal) * barAreaH))
    const x = box.x + marginX + i * (barW + gap)
    const y = baseY - h

    let fill = primaryColor // default active theme color
    const isSorted = currentStep.sorted && currentStep.sorted[i]
    const isSwapping = currentStep.swapping && currentStep.swapping.includes(i)
    const isPivot = currentStep.pivot === i
    const isCompare =
      currentStep.j === i ||
      (currentStep.type === 'compare' && (currentStep.j === i || currentStep.j + 1 === i)) ||
      currentStep.i === i ||
      currentStep.minIdx === i

    if (isSorted) fill = '#16a34a'
    else if (isSwapping) fill = '#ef4444'
    else if (isPivot) fill = '#f59e0b'
    else if (isCompare) fill = '#fde68a'
    else if (currentStep.lo != null && currentStep.hi != null && (i < currentStep.lo || i > currentStep.hi)) fill = '#374151'

    ctx.fillStyle = fill
    fillRoundRect(ctx, x, y, barW, h, 3)

    // Bar Value above
    ctx.fillStyle = isSorted ? '#4ade80' : isPivot ? '#fde68a' : '#9ca3af'
    ctx.font = '11px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    ctx.fillText(String(val), x + barW / 2, y - 5)

    // Bar Index below
    ctx.fillStyle = '#6b7280'
    ctx.font = '10px JetBrains Mono, monospace'
    ctx.fillText(String(i), x + barW / 2, baseY + 12)
  }

  // ── 3. StepControls Bar (exact site component) ─────────────────────────────────
  const ctrlY = canvasY + canvasH + 8

  // Annotation container
  ctx.fillStyle = '#161d2d'
  ctx.strokeStyle = '#1e2638'
  ctx.lineWidth = 1
  fillRoundRect(ctx, box.x + 12, ctrlY, box.width - 24, 30, 6)
  ctx.stroke()

  ctx.fillStyle = '#d1d5db'
  ctx.font = '11px JetBrains Mono, monospace'
  ctx.textAlign = 'left'
  const annot = currentStep.annotation || 'Executing sorting step...'
  ctx.fillText(annot.length > 70 ? annot.slice(0, 68) + '…' : annot, box.x + 22, ctrlY + 19)

  // Progress bar line below annotation
  const pct = totalSteps > 1 ? stepIdx / (totalSteps - 1) : 1
  ctx.fillStyle = '#1e2638'
  fillRoundRect(ctx, box.x + 12, ctrlY + 34, box.width - 24, 3, 1.5)
  ctx.fillStyle = primaryColor
  fillRoundRect(ctx, box.x + 12, ctrlY + 34, (box.width - 24) * pct, 3, 1.5)

  // Non-interactive Video HUD
  const btnRowY = ctrlY + 48
  ctx.fillStyle = primaryColor
  ctx.beginPath()
  ctx.arc(box.x + 16, btnRowY - 3, 3, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = primaryColor
  ctx.font = 'bold 10px JetBrains Mono, monospace'
  ctx.textAlign = 'left'
  ctx.fillText(`Step ${stepIdx + 1} / ${totalSteps}`, box.x + 24, btnRowY)

  ctx.textAlign = 'right'
  ctx.fillStyle = '#94a3b8'
  ctx.font = 'bold 9px JetBrains Mono, monospace'
  ctx.fillText('LIVE SIMULATION', box.x + box.width - 12, btnRowY)
}

function drawSearchPointers(ctx, concept, box, progress, primaryColor = '#3b82f6') {
  let mode = concept.visualization?.config?.mode || concept.slug || 'binary-search'
  if (mode === 'pointer-visualization') mode = concept.slug || 'binary-search'
  const arr = concept.visualization?.config?.array || [2, 5, 8, 12, 16, 23, 38, 45, 56, 72]
  const target = concept.visualization?.config?.target ?? (mode === 'sliding-window' ? (concept.visualization?.config?.k ?? 3) : (mode === 'binary-search' ? 23 : 16))

  let steps = getSteps('search', mode, arr, target)
  if (!steps || steps.length === 0) {
    steps = getSteps('search', 'binary-search', arr, target)
  }
  if (!steps || steps.length === 0) return

  const totalSteps = steps.length
  const stepIdx = Math.min(totalSteps - 1, Math.floor(progress * totalSteps))
  const step = (steps && steps.length > 0) ? (steps[stepIdx] || steps[0]) : { found: false, done: false }
  const n = arr.length

  // ── 1. Target Banner (exact site layout) ───────────────────────────────────────
  const bannerY = box.y + 12
  ctx.fillStyle = '#161d2d'
  ctx.strokeStyle = '#1e2638'
  ctx.lineWidth = 1
  fillRoundRect(ctx, box.x + 12, bannerY, box.width - 24, 32, 6)
  ctx.stroke()

  ctx.textAlign = 'left'
  ctx.font = '11px JetBrains Mono, monospace'
  ctx.fillStyle = '#9ca3af'
  ctx.fillText(mode === 'sliding-window' ? 'window k = ' : 'target = ', box.x + 22, bannerY + 20)
  ctx.fillStyle = '#f59e0b'
  ctx.font = 'bold 12px JetBrains Mono, monospace'
  ctx.fillText(String(target), box.x + 22 + ctx.measureText(mode === 'sliding-window' ? 'window k = ' : 'target = ').width, bannerY + 20)

  ctx.textAlign = 'right'
  if (step?.found) {
    ctx.fillStyle = '#4ade80'
    ctx.font = 'bold 11px JetBrains Mono, monospace'
    ctx.fillText(mode === 'sliding-window' ? `✓ max sum window [${step.lo}…${step.hi}]` : `✓ found at index ${step.mid ?? step.i}`, box.x + box.width - 24, bannerY + 20)
  } else if (step?.done && !step?.found) {
    ctx.fillStyle = '#ef4444'
    ctx.font = 'bold 11px JetBrains Mono, monospace'
    ctx.fillText('✗ not found', box.x + box.width - 24, bannerY + 20)
  }

  // ── 2. Array Cells + Pointer Labels (exact site appearance) ───────────────────
  const cellAreaY = bannerY + 44
  const marginX = 20
  const usableW = box.width - marginX * 2
  const cellW = Math.max(26, Math.floor(usableW / n) - 6)
  const gap = (usableW - cellW * n) / (n - 1)
  const cellH = 44

  for (let i = 0; i < n; i++) {
    const val = arr[i]
    const x = box.x + marginX + i * (cellW + gap)
    const inRange = step.lo != null && step.hi != null && i >= step.lo && i <= step.hi
    const isMid = step.mid === i || step.i === i
    const isFound = step.found && isMid

    let bg = '#0d0d10'
    let stroke = '#2d2d35'
    let tc = '#4b5563'

    if (isFound) {
      bg = '#14532d'
      stroke = '#22c55e'
      tc = '#86efac'
    } else if (isMid) {
      bg = '#451a03'
      stroke = '#f59e0b'
      tc = '#fcd34d'
    } else if (inRange) {
      bg = '#1e293b'
      stroke = primaryColor
      tc = '#e2e8f0'
    }

    ctx.fillStyle = bg
    ctx.strokeStyle = stroke
    ctx.lineWidth = 2
    fillRoundRect(ctx, x, cellAreaY, cellW, cellH, 4)
    ctx.stroke()

    // Value
    ctx.fillStyle = tc
    ctx.font = 'bold 14px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    ctx.fillText(String(val), x + cellW / 2, cellAreaY + 22)

    // Index
    ctx.fillStyle = '#6b7280'
    ctx.font = '9px JetBrains Mono, monospace'
    ctx.fillText(String(i), x + cellW / 2, cellAreaY + 36)

    // Pointer labels below cells
    let tag = null
    let tagColor = primaryColor
    if (step.lo === i && step.hi === i) {
      tag = 'lo=hi'
    } else if (step.lo === i) {
      tag = 'lo'
    } else if (step.hi === i) {
      tag = 'hi'
    } else if (step.mid === i) {
      tag = 'mid'
      tagColor = '#f59e0b'
    }

    if (tag) {
      ctx.fillStyle = tagColor
      ctx.font = 'bold 9px JetBrains Mono, monospace'
      ctx.fillText(tag, x + cellW / 2, cellAreaY + cellH + 14)
    }
  }

  // ── 3. Legend (exact site appearance) ──────────────────────────────────────────
  const legY = cellAreaY + cellH + 30
  ctx.textAlign = 'left'
  ctx.font = '10px JetBrains Mono, monospace'
  let curLegX = box.x + 16
  const searchLegend = [
    { border: '#3b82f6', bg: '#1e293b', label: 'active window (lo…hi)' },
    { border: '#f59e0b', bg: '#451a03', label: 'mid — comparing' },
    { border: '#22c55e', bg: '#14532d', label: 'found' },
  ]
  searchLegend.forEach((item) => {
    ctx.fillStyle = item.bg
    ctx.strokeStyle = item.border
    ctx.lineWidth = 1.5
    ctx.fillRect(curLegX, legY - 8, 10, 10)
    ctx.strokeRect(curLegX, legY - 8, 10, 10)
    ctx.fillStyle = '#9ca3af'
    ctx.fillText(item.label, curLegX + 14, legY)
    curLegX += ctx.measureText(item.label).width + 24
  })

  // ── 4. StepControls (exact site component) ─────────────────────────────────────
  const ctrlY = legY + 16

  // Annotation container
  ctx.fillStyle = '#161d2d'
  ctx.strokeStyle = '#1e2638'
  ctx.lineWidth = 1
  fillRoundRect(ctx, box.x + 12, ctrlY, box.width - 24, 30, 6)
  ctx.stroke()

  ctx.fillStyle = '#d1d5db'
  ctx.font = '11px JetBrains Mono, monospace'
  ctx.textAlign = 'left'
  const annot = step.annotation || 'Evaluating search boundaries...'
  ctx.fillText(annot.length > 70 ? annot.slice(0, 68) + '…' : annot, box.x + 22, ctrlY + 19)

  // Progress bar line
  const pct = totalSteps > 1 ? stepIdx / (totalSteps - 1) : 1
  ctx.fillStyle = '#1e2638'
  fillRoundRect(ctx, box.x + 12, ctrlY + 34, box.width - 24, 3, 1.5)
  ctx.fillStyle = primaryColor
  fillRoundRect(ctx, box.x + 12, ctrlY + 34, (box.width - 24) * pct, 3, 1.5)

  // Non-interactive Video HUD
  const btnRowY = ctrlY + 48
  ctx.fillStyle = primaryColor
  ctx.beginPath()
  ctx.arc(box.x + 16, btnRowY - 3, 3, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = primaryColor
  ctx.font = 'bold 10px JetBrains Mono, monospace'
  ctx.textAlign = 'left'
  ctx.fillText(`Step ${stepIdx + 1} / ${totalSteps}`, box.x + 24, btnRowY)

  ctx.textAlign = 'right'
  ctx.fillStyle = '#94a3b8'
  ctx.font = 'bold 9px JetBrains Mono, monospace'
  ctx.fillText('LIVE SIMULATION', box.x + box.width - 12, btnRowY)
}

function drawGraphTraversal(ctx, concept, box, progress, primaryColor = '#3b82f6') {
  const nodes = [
    { id: 'A', x: box.x + 80, y: box.y + box.height / 2, label: 'Start' },
    { id: 'B', x: box.x + 220, y: box.y + box.height / 2 - 60 },
    { id: 'C', x: box.x + 220, y: box.y + box.height / 2 + 60 },
    { id: 'D', x: box.x + 380, y: box.y + box.height / 2 - 60 },
    { id: 'E', x: box.x + 380, y: box.y + box.height / 2 + 60 },
    { id: 'F', x: box.x + 520, y: box.y + box.height / 2, label: 'Target' },
  ]

  const edges = [
    [0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5]
  ]

  // Header
  ctx.fillStyle = primaryColor
  ctx.font = 'bold 13px Inter, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('GRAPH TRAVERSAL: Shortest Path Search', box.x + 24, box.y + 32)

  ctx.textAlign = 'right'
  ctx.fillStyle = progress >= 0.85 ? '#10b981' : '#f59e0b'
  ctx.font = 'bold 12px JetBrains Mono, monospace'
  ctx.fillText(progress >= 0.85 ? 'TARGET REACHED: A ➔ B ➔ D ➔ F' : 'EXPANDING FRONTIER...', box.x + box.width - 24, box.y + 32)

  // Draw edges
  edges.forEach(([u, v], idx) => {
    const active = progress >= (idx + 1) * 0.14
    ctx.strokeStyle = active ? primaryColor : '#1e2638'
    ctx.lineWidth = active ? 3 : 1.5
    ctx.beginPath()
    ctx.moveTo(nodes[u].x, nodes[u].y)
    ctx.lineTo(nodes[v].x, nodes[v].y)
    ctx.stroke()
  })

  // Draw nodes
  nodes.forEach((n, idx) => {
    const visited = progress >= idx * 0.16
    const isTarget = idx === 5 && progress >= 0.85

    ctx.fillStyle = isTarget ? '#10b981' : visited ? primaryColor : '#161d2d'
    ctx.strokeStyle = visited ? '#ffffff' : '#334155'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(n.x, n.y, 20, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = visited ? '#0b0e14' : '#94a3b8'
    ctx.font = 'bold 13px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    ctx.fillText(n.id, n.x, n.y + 5)
  })
}

function drawTreeTraversal(ctx, concept, box, progress, primaryColor = '#3b82f6') {
  const nodes = [
    { id: '10', x: box.x + box.width / 2, y: box.y + 75 },
    { id: '5',  x: box.x + box.width / 2 - 120, y: box.y + 155 },
    { id: '15', x: box.x + box.width / 2 + 120, y: box.y + 155 },
    { id: '2',  x: box.x + box.width / 2 - 180, y: box.y + 235 },
    { id: '7',  x: box.x + box.width / 2 - 60,  y: box.y + 235 },
    { id: '12', x: box.x + box.width / 2 + 60,  y: box.y + 235 },
    { id: '20', x: box.x + box.width / 2 + 180, y: box.y + 235 },
  ]
  const edges = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]]

  // Header
  ctx.fillStyle = primaryColor
  ctx.font = 'bold 13px Inter, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('BINARY SEARCH TREE: In-Order Traversal', box.x + 24, box.y + 32)

  ctx.textAlign = 'right'
  ctx.fillStyle = progress >= 0.9 ? '#10b981' : '#f59e0b'
  ctx.font = 'bold 12px JetBrains Mono, monospace'
  ctx.fillText(progress >= 0.9 ? 'SORTED OUTPUT: [2, 5, 7, 10, 12, 15, 20]' : 'VISITING SUBTREES...', box.x + box.width - 24, box.y + 32)

  edges.forEach(([u, v]) => {
    ctx.strokeStyle = '#1e2638'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(nodes[u].x, nodes[u].y)
    ctx.lineTo(nodes[v].x, nodes[v].y)
    ctx.stroke()
  })

  nodes.forEach((n, idx) => {
    const visited = progress >= (idx + 1) * 0.13
    ctx.fillStyle = visited ? '#10b981' : '#161d2d'
    ctx.strokeStyle = visited ? '#ffffff' : '#334155'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(n.x, n.y, 18, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = visited ? '#0b0e14' : '#e2e8f0'
    ctx.font = 'bold 11px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    ctx.fillText(n.id, n.x, n.y + 4)
  })
}

function drawMatrixGrid(ctx, concept, box, progress, primaryColor = '#3b82f6') {
  const rows = 4
  const cols = 5
  const totalCells = rows * cols
  const filledCells = Math.min(totalCells, Math.floor(progress * totalCells))

  ctx.fillStyle = primaryColor
  ctx.font = 'bold 13px Inter, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('DYNAMIC PROGRAMMING: Tabulation Matrix', box.x + 24, box.y + 32)

  ctx.textAlign = 'right'
  ctx.fillStyle = progress >= 0.9 ? '#10b981' : '#f59e0b'
  ctx.font = 'bold 12px JetBrains Mono, monospace'
  ctx.fillText(`CELLS COMPUTED: ${filledCells} / ${totalCells}`, box.x + box.width - 24, box.y + 32)

  const cellW = (box.width - 120) / cols
  const cellH = (box.height - 100) / rows
  const startX = box.x + 60
  const startY = box.y + 55

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c
      const isFilled = idx <= filledCells
      const isCurrent = idx === filledCells
      const x = startX + c * cellW
      const y = startY + r * cellH

      ctx.fillStyle = isCurrent ? '#f59e0b' : isFilled ? hexToRgba(primaryColor, 0.2) : '#161d2d'
      ctx.strokeStyle = isCurrent ? '#f59e0b' : '#1e2638'
      ctx.lineWidth = 1
      fillRoundRect(ctx, x + 2, y + 2, cellW - 4, cellH - 4, 6)
      ctx.stroke()

      if (isFilled) {
        ctx.fillStyle = isCurrent ? '#0b0e14' : '#ffffff'
        ctx.font = 'bold 13px JetBrains Mono, monospace'
        ctx.textAlign = 'center'
        ctx.fillText(String(r * 10 + c * 3 + 1), x + cellW / 2, y + cellH / 2 + 4)
      }
    }
  }
}

function drawArrowHead(ctx, x, y, angle, size, color) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(-size, -size / 2)
  ctx.lineTo(-size, size / 2)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawStateDiagram(ctx, concept, box, progress, primaryColor = '#3b82f6') {
  const config = concept.visualization?.config || { mode: concept.slug }
  const { states, transitions, steps } = resolveStateConfig(config)
  if (!states || states.length === 0 || !steps || steps.length === 0) return

  const totalSteps = steps.length
  const stepIdx = Math.min(totalSteps - 1, Math.max(0, Math.floor(progress * totalSteps)))
  const currentStep = steps[stepIdx] || steps[0]
  const activeState = currentStep?.active_state
  const activeTransition = currentStep?.active_transition

  const { W, H, positions } = computeLayout(states)
  const stateIdx = Object.fromEntries(states.map((s, i) => [s.id, i]))

  // Title header
  const titleY = box.y + 20
  ctx.textAlign = 'left'
  ctx.font = 'bold 12px Inter, sans-serif'
  ctx.fillStyle = primaryColor
  ctx.fillText(concept?.title ? `${concept.title.toUpperCase()}: State Machine` : 'STATE MACHINE', box.x + 16, titleY)

  // Subheader on right
  ctx.textAlign = 'right'
  ctx.font = '10px JetBrains Mono, monospace'
  ctx.fillStyle = '#9ca3af'
  ctx.fillText(`Step ${stepIdx + 1} of ${totalSteps}`, box.x + box.width - 16, titleY)

  // Usable area for diagram
  const diagramY = box.y + 32
  const diagramH = box.height - 110
  const diagramW = box.width - 28
  const startX = box.x + 14

  // Background frame
  ctx.fillStyle = '#0f1420'
  ctx.strokeStyle = '#1e2638'
  ctx.lineWidth = 1
  fillRoundRect(ctx, startX, diagramY, diagramW, diagramH, 8)
  ctx.stroke()

  // Calculate scale to fit layout (W x H) into diagramW x diagramH
  const scale = Math.min(diagramW / (W + 20), diagramH / (H + 20), 0.95)
  const offsetX = startX + (diagramW - W * scale) / 2
  const offsetY = diagramY + (diagramH - H * scale) / 2

  const mapX = (x) => offsetX + x * scale
  const mapY = (y) => offsetY + y * scale
  const scaledBoxW = BOX_W * scale
  const scaledBoxH = BOX_H * scale

  // 1. Draw Transition Arrows
  transitions.forEach((t) => {
    const fi = stateIdx[t.from]
    const ti = stateIdx[t.to]
    if (fi === undefined || ti === undefined) return

    const fp = positions[fi]
    const tp = positions[ti]
    const isActive = activeTransition && activeTransition.from === t.from && activeTransition.to === t.to
    const color = isActive ? '#f59e0b' : '#4b5563'

    const x1 = mapX(fp.x)
    const y1 = mapY(fp.y)
    const x2 = mapX(tp.x)
    const y2 = mapY(tp.y)

    const dx = x2 - x1
    const dy = y2 - y1
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const ux = dx / dist
    const uy = dy / dist

    const isSelf = t.from === t.to
    ctx.strokeStyle = color
    ctx.lineWidth = isActive ? 2.5 : 1.5
    ctx.fillStyle = color

    if (isSelf) {
      ctx.beginPath()
      ctx.arc(x1, y1 - scaledBoxH / 2 - 12 * scale, 12 * scale, 0, Math.PI * 2)
      ctx.stroke()
    } else {
      const mx = (x1 + x2) / 2 - uy * 16 * scale
      const my = (y1 + y2) / 2 + ux * 16 * scale

      ctx.beginPath()
      ctx.moveTo(x1 + ux * (scaledBoxW / 2), y1 + uy * (scaledBoxH / 2))
      ctx.quadraticCurveTo(mx, my, x2 - ux * (scaledBoxW / 2 + 3), y2 - uy * (scaledBoxH / 2 + 3))
      ctx.stroke()

      const arrowX = x2 - ux * (scaledBoxW / 2)
      const arrowY = y2 - uy * (scaledBoxH / 2)
      drawArrowHead(ctx, arrowX, arrowY, Math.atan2(dy, dx), 7 * scale, color)

      if (t.label) {
        ctx.font = `${Math.max(8, Math.round(9 * scale))}px JetBrains Mono, monospace`
        ctx.textAlign = 'center'
        ctx.fillStyle = isActive ? '#fde68a' : '#64748b'
        ctx.fillText(t.label, mx, my - 3 * scale)
      }
    }
  })

  // 2. Draw State Boxes
  states.forEach((st, i) => {
    const p = positions[i]
    if (!p) return
    const bx = mapX(p.x) - scaledBoxW / 2
    const by = mapY(p.y) - scaledBoxH / 2
    const isActive = st.id === activeState

    ctx.fillStyle = isActive ? hexToRgba(primaryColor, 0.22) : '#161d2d'
    ctx.strokeStyle = isActive ? primaryColor : '#334155'
    ctx.lineWidth = isActive ? 2 : 1.2
    fillRoundRect(ctx, bx, by, scaledBoxW, scaledBoxH, 6 * scale)
    ctx.stroke()

    // State title
    ctx.font = `bold ${Math.max(9, Math.round(11 * scale))}px Inter, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillStyle = isActive ? primaryColor : '#e2e8f0'
    const textY = st.sub ? by + scaledBoxH / 2 - 2 * scale : by + scaledBoxH / 2 + 4 * scale
    ctx.fillText(st.label, bx + scaledBoxW / 2, textY)

    // State subtext
    if (st.sub) {
      ctx.font = `${Math.max(7, Math.round(8 * scale))}px JetBrains Mono, monospace`
      ctx.fillStyle = isActive ? '#93c5fd' : '#64748b'
      ctx.fillText(st.sub, bx + scaledBoxW / 2, by + scaledBoxH / 2 + 10 * scale)
    }
  })

  // 3. StepControls Bar (annotation, progress bar, step counter)
  const ctrlY = diagramY + diagramH + 6
  ctx.fillStyle = '#161d2d'
  ctx.strokeStyle = '#1e2638'
  ctx.lineWidth = 1
  fillRoundRect(ctx, startX, ctrlY, diagramW, 26, 6)
  ctx.stroke()

  ctx.fillStyle = '#d1d5db'
  ctx.font = '10px JetBrains Mono, monospace'
  ctx.textAlign = 'left'
  const annot = currentStep.annotation || 'State transition in progress...'
  ctx.fillText(annot.length > 74 ? annot.slice(0, 72) + '…' : annot, startX + 10, ctrlY + 17)

  // Progress line
  const pct = totalSteps > 1 ? (stepIdx + 1) / totalSteps : 1
  ctx.fillStyle = '#1e2638'
  fillRoundRect(ctx, startX, ctrlY + 30, diagramW, 3, 1.5)
  ctx.fillStyle = primaryColor
  fillRoundRect(ctx, startX, ctrlY + 30, diagramW * pct, 3, 1.5)

  // Non-interactive Video HUD
  const btnRowY = ctrlY + 44
  ctx.fillStyle = primaryColor
  ctx.beginPath()
  ctx.arc(startX + 4, btnRowY - 3, 3, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = primaryColor
  ctx.font = 'bold 10px JetBrains Mono, monospace'
  ctx.textAlign = 'left'
  ctx.fillText(`Step ${stepIdx + 1} / ${totalSteps}`, startX + 12, btnRowY)

  ctx.textAlign = 'right'
  ctx.fillStyle = '#94a3b8'
  ctx.font = 'bold 9px JetBrains Mono, monospace'
  ctx.fillText('LIVE SIMULATION', startX + diagramW, btnRowY)
}

function drawNeuralNetwork(ctx, concept, box, progress, primaryColor = '#3b82f6') {
  ctx.fillStyle = primaryColor
  ctx.font = 'bold 13px Inter, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('NEURAL NETWORK: Forward Pass & Activation', box.x + 24, box.y + 32)

  const loss = Math.max(0.012, 0.842 * (1 - progress)).toFixed(3)
  ctx.textAlign = 'right'
  ctx.fillStyle = progress >= 0.85 ? '#10b981' : '#f59e0b'
  ctx.font = 'bold 12px JetBrains Mono, monospace'
  ctx.fillText(`LOSS: ${loss} · EPOCH 100`, box.x + box.width - 24, box.y + 32)

  // Layers: 3 inputs, 4 hidden, 2 outputs
  const layers = [
    [box.y + 90, box.y + 150, box.y + 210],
    [box.y + 70, box.y + 120, box.y + 170, box.y + 220],
    [box.y + 120, box.y + 180],
  ]
  const layerX = [box.x + 120, box.x + box.width / 2, box.x + box.width - 120]

  // Draw connections
  for (let l = 0; l < 2; l++) {
    for (const y1 of layers[l]) {
      for (const y2 of layers[l + 1]) {
        ctx.strokeStyle = hexToRgba(primaryColor, 0.2)
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(layerX[l], y1)
        ctx.lineTo(layerX[l + 1], y2)
        ctx.stroke()
      }
    }
  }

  // Draw nodes with pulse
  layers.forEach((nodes, lIdx) => {
    const x = layerX[lIdx]
    const isFired = progress >= lIdx * 0.4
    nodes.forEach((y) => {
      ctx.fillStyle = isFired ? primaryColor : '#161d2d'
      ctx.strokeStyle = isFired ? '#ffffff' : '#334155'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, y, 14, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    })
  })
}

function drawSystemArchitecture(ctx, concept, box, progress, primaryColor = '#3b82f6') {
  const steps = ['Client', 'API Gateway', 'Cache (O(1))', 'Database']
  ctx.fillStyle = primaryColor
  ctx.font = 'bold 13px Inter, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('SYSTEM ARCHITECTURE: Cache-Aside Pipeline', box.x + 24, box.y + 32)

  ctx.textAlign = 'right'
  ctx.fillStyle = progress >= 0.7 ? '#10b981' : '#f59e0b'
  ctx.font = 'bold 12px JetBrains Mono, monospace'
  ctx.fillText(progress >= 0.7 ? 'CACHE HIT: 1.8ms RESPONSE' : 'PROPAGATING REQUEST...', box.x + box.width - 24, box.y + 32)

  const marginX = 30
  const n = steps.length
  const cardW = (box.width - marginX * 2) / n - 14
  const cardH = 68
  const y = box.y + (box.height - cardH) / 2

  const activeIdx = Math.min(n - 1, Math.floor(progress * n))

  steps.forEach((st, idx) => {
    const x = box.x + marginX + idx * (cardW + 14)
    const isActive = idx === activeIdx
    const isPast = idx < activeIdx

    ctx.fillStyle = isActive ? hexToRgba(primaryColor, 0.2) : isPast ? 'rgba(16, 185, 129, 0.15)' : '#161d2d'
    ctx.strokeStyle = isActive ? primaryColor : isPast ? '#10b981' : '#1e2638'
    ctx.lineWidth = isActive ? 2 : 1
    fillRoundRect(ctx, x, y, cardW, cardH, 10)
    ctx.stroke()

    ctx.fillStyle = isActive ? primaryColor : isPast ? '#10b981' : '#e2e8f0'
    ctx.font = 'bold 13px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(st, x + cardW / 2, y + cardH / 2 + 5)
  })
}

function drawTimelineExecution(ctx, concept, box, progress, primaryColor = '#8b5cf6') {
  const config = concept?.visualization?.config || {}
  const rawSteps = (config.steps && config.steps.length > 0)
    ? config.steps
    : (config.mode && TIMELINE_PRESETS[config.mode]?.steps)
    ? TIMELINE_PRESETS[config.mode].steps
    : DEFAULT_TIMELINE_STEPS

  const steps = rawSteps.map((st, i) => {
    if (typeof st === 'string') return { label: st, sub: `Step ${i + 1}`, annotation: '' }
    return {
      label: st.label || `Step ${i + 1}`,
      sub: st.sub || '',
      annotation: st.annotation || '',
    }
  })

  const n = steps.length
  const activeIdx = Math.min(n - 1, Math.max(0, Math.floor(progress * n)))
  const currentStep = steps[activeIdx] || steps[0]

  // 1. Title & Header
  ctx.textAlign = 'left'
  ctx.font = 'bold 12px Inter, sans-serif'
  ctx.fillStyle = primaryColor
  const titleText = concept?.title ? `${concept.title.toUpperCase()}: Pipeline Flow` : 'PIPELINE EXECUTION'
  ctx.fillText(titleText, box.x + 16, box.y + 22)

  ctx.textAlign = 'right'
  ctx.font = 'bold 11px JetBrains Mono, monospace'
  ctx.fillStyle = progress >= 0.95 ? '#10b981' : primaryColor
  ctx.fillText(`STAGE 0${activeIdx + 1} / 0${n}`, box.x + box.width - 16, box.y + 22)

  // 2. Stage Canvas Container
  const containerY = box.y + 32
  const containerH = box.height - 40
  const containerW = box.width - 24
  const containerX = box.x + 12

  ctx.fillStyle = '#0f1420'
  ctx.strokeStyle = '#1e2638'
  ctx.lineWidth = 1
  fillRoundRect(ctx, containerX, containerY, containerW, containerH, 8)
  ctx.stroke()

  // 3. Step Cards Row
  const usableW = containerW - 20
  const gap = 8
  const cardW = Math.min(105, Math.floor((usableW - (n - 1) * gap) / n))
  const cardH = 68
  const totalStepsW = n * cardW + (n - 1) * gap
  const startX = containerX + (containerW - totalStepsW) / 2
  const cardY = containerY + 14

  for (let i = 0; i < n; i++) {
    const st = steps[i]
    const x = startX + i * (cardW + gap)
    const isActive = i === activeIdx
    const isDone = i < activeIdx

    // Card background
    ctx.fillStyle = isActive
      ? hexToRgba(primaryColor, 0.25)
      : isDone
      ? 'rgba(16, 185, 129, 0.12)'
      : '#161d2d'
    ctx.strokeStyle = isActive ? primaryColor : isDone ? '#10b981' : '#1e2638'
    ctx.lineWidth = isActive ? 2 : 1
    fillRoundRect(ctx, x, cardY, cardW, cardH, 6)
    ctx.stroke()

    // Step Number Badge
    const badgeR = 8
    const badgeX = x + cardW / 2
    const badgeY = cardY + 14
    ctx.beginPath()
    ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2)
    ctx.fillStyle = isActive ? primaryColor : isDone ? '#10b981' : '#263147'
    ctx.fill()

    ctx.fillStyle = isActive || isDone ? '#ffffff' : '#9ca3af'
    ctx.font = 'bold 9px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    ctx.fillText(String(i + 1), badgeX, badgeY + 3)

    // Step Label
    ctx.font = 'bold 10px Inter, sans-serif'
    ctx.fillStyle = isActive ? '#ffffff' : isDone ? '#d1fae5' : '#94a3b8'
    ctx.textAlign = 'center'
    let labelText = st.label
    if (ctx.measureText(labelText).width > cardW - 6) {
      labelText = labelText.slice(0, 10) + '…'
    }
    ctx.fillText(labelText, x + cardW / 2, cardY + 36)

    // Step Sublabel
    if (st.sub) {
      ctx.font = '8px JetBrains Mono, monospace'
      ctx.fillStyle = isActive ? primaryColor : isDone ? '#6ee7b7' : '#64748b'
      let subText = st.sub
      if (ctx.measureText(subText).width > cardW - 4) {
        subText = subText.slice(0, 11) + '…'
      }
      ctx.fillText(subText, x + cardW / 2, cardY + 52)
    }

    // Arrow to next step
    if (i < n - 1) {
      const arrowX = x + cardW + gap / 2
      const arrowY = cardY + cardH / 2
      ctx.fillStyle = isDone ? '#10b981' : '#4b5563'
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('›', arrowX, arrowY + 4)
    }
  }

  // 4. Live Annotation Box at Bottom
  const annotY = cardY + cardH + 12
  const annotH = containerH - (cardH + 26) - 10
  const annotW = containerW - 20
  const annotX = containerX + 10

  ctx.fillStyle = '#111622'
  ctx.strokeStyle = hexToRgba(primaryColor, 0.4)
  ctx.lineWidth = 1
  fillRoundRect(ctx, annotX, annotY, annotW, Math.max(34, annotH), 6)
  ctx.stroke()

  // Status pulse dot
  ctx.beginPath()
  ctx.arc(annotX + 14, annotY + 18, 4, 0, Math.PI * 2)
  ctx.fillStyle = primaryColor
  ctx.fill()

  // Annotation text
  ctx.font = '10px JetBrains Mono, monospace'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#e2e8f0'
  const annot = currentStep.annotation || `Executing phase ${activeIdx + 1}: ${currentStep.label}`
  let displayAnnot = annot
  if (ctx.measureText(displayAnnot).width > annotW - 36) {
    displayAnnot = annot.slice(0, 75) + '…'
  }
  ctx.fillText(displayAnnot, annotX + 26, annotY + 22)
}

function drawBottomStatusBar(ctx, box, progress, primaryColor = '#38bdf8') {
  const barH = 4
  const y = box.y + box.height - barH
  ctx.fillStyle = '#1e2638'
  ctx.fillRect(box.x, y, box.width, barH)

  ctx.fillStyle = primaryColor
  ctx.fillRect(box.x, y, box.width * progress, barH)
}

// ─── Canvas Helper Utilities ──────────────────────────────────────────────────

function fillRoundRect(ctx, x, y, w, h, r) {
  if (w <= 0 || h <= 0) return
  ctx.beginPath()
  roundRectPath(ctx, x, y, w, h, r)
  ctx.fill()
}

function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2)
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
