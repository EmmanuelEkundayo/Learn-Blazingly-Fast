/**
 * Visualizer Playback Engine for TikTok & Shorts Video Mode.
 * Dynamically renders animated step-by-step visualizations on a 2D canvas
 * or SVG element, compressed or expanded to the slide's active time frame.
 */
import { getSteps, getDefaultSortArray } from './algorithms/registry.js'

/**
 * Determines the visualization category for a concept.
 */
export function getConceptVizCategory(concept = {}) {
  const type = (concept.visualization?.type || '').toLowerCase()
  const slug = (concept.slug || '').toLowerCase()
  const cat = (concept.category || '').toLowerCase()
  const domain = (concept.domain || '').toLowerCase()
  const mode = (concept.visualization?.config?.mode || '').toLowerCase()

  if (slug.includes('lifecycle') || mode === 'lifecycle' || (domain.includes('react') && type.includes('state'))) {
    return 'lifecycle'
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
  if (type === 'graph-traversal' || cat.includes('graph') || slug.includes('dijkstra') || slug.includes('bfs') || slug.includes('dfs')) {
    return 'graph'
  }
  if (type === 'matrix-grid' || cat.includes('dynamic') || slug.includes('matrix') || slug.includes('dp')) {
    return 'dp'
  }
  if (type.includes('neural') || type.includes('loss') || domain.includes('ml') || domain.includes('ai') || slug.includes('transformer') || slug.includes('attention')) {
    return 'neural'
  }
  if (type.includes('architecture') || slug.includes('cache') || slug.includes('lru') || domain.includes('system')) {
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
 */
export function drawCanvasVizFrame(ctx, concept, box, rawProgress = 0) {
  const progress = Math.min(1, Math.max(0, rawProgress))
  const category = getConceptVizCategory(concept)

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
    case 'sorting':
      drawSortingBars(ctx, concept, box, progress)
      break
    case 'search':
      drawSearchPointers(ctx, concept, box, progress)
      break
    case 'graph':
      drawGraphTraversal(ctx, concept, box, progress)
      break
    case 'tree':
      drawTreeTraversal(ctx, concept, box, progress)
      break
    case 'dp':
      drawMatrixGrid(ctx, concept, box, progress)
      break
    case 'lifecycle':
      drawLifecycleFlow(ctx, concept, box, progress)
      break
    case 'neural':
      drawNeuralNetwork(ctx, concept, box, progress)
      break
    case 'architecture':
      drawSystemArchitecture(ctx, concept, box, progress)
      break
    case 'timeline':
    default:
      drawTimelineExecution(ctx, concept, box, progress)
      break
  }

  // Draw bottom progress strip & live indicator
  drawBottomStatusBar(ctx, box, progress)

  ctx.restore()
}

// ─── Visualizer Renderers ─────────────────────────────────────────────────────

function drawSortingBars(ctx, concept, box, progress) {
  const mode = concept.visualization?.config?.mode || concept.slug || 'quicksort'
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
  const currentStep = steps[stepIdx]
  const arr = currentStep.array || inputArray
  const n = arr.length
  const maxVal = Math.max(...arr, 1)

  // 1. Header with Concept Title, Action Badge, and Step Counter
  const actionLabel = (currentStep.type || 'STEP').toUpperCase().replace(/_/g, ' ')
  ctx.fillStyle = '#38bdf8'
  ctx.font = 'bold 13px Inter, sans-serif'
  ctx.textAlign = 'left'
  const titleText = (concept.title || 'Sorting Algorithm').toUpperCase()
  ctx.fillText(`${titleText} · [${actionLabel}]`, box.x + 20, box.y + 28)

  ctx.textAlign = 'right'
  const isDone = stepIdx === totalSteps - 1 || currentStep.type === 'done'
  ctx.fillStyle = isDone ? '#10b981' : '#f59e0b'
  ctx.font = 'bold 12px JetBrains Mono, monospace'
  ctx.fillText(`STEP ${String(stepIdx + 1).padStart(2, '0')} / ${String(totalSteps).padStart(2, '0')}`, box.x + box.width - 20, box.y + 28)

  // 2. Legend
  ctx.textAlign = 'left'
  ctx.font = '10px Inter, sans-serif'
  const legendY = box.y + 48
  let legX = box.x + 20
  const legendItems = [
    { color: '#f59e0b', text: 'Pivot' },
    { color: '#fde68a', text: 'Compare' },
    { color: '#ef4444', text: 'Swap' },
    { color: '#10b981', text: 'Sorted' },
  ]
  legendItems.forEach(item => {
    ctx.fillStyle = item.color
    ctx.fillRect(legX, legendY - 8, 8, 8)
    ctx.fillStyle = '#94a3b8'
    ctx.fillText(item.text, legX + 12, legendY)
    legX += 70
  })

  // 3. Array Bars
  const marginX = 24
  const usableW = box.width - marginX * 2
  const barAreaH = box.height - 165
  const barW = Math.max(16, Math.floor(usableW / n) - 8)
  const gap = (usableW - barW * n) / (n - 1)
  const baseY = box.y + box.height - 75

  for (let i = 0; i < n; i++) {
    const val = arr[i]
    const h = Math.max(14, Math.round((val / maxVal) * barAreaH))
    const x = box.x + marginX + i * (barW + gap)
    const y = baseY - h

    // Color logic matching platform
    let fill = '#1d4ed8' // default active blue
    const isSorted = currentStep.sorted && currentStep.sorted[i]
    const isSwapping = currentStep.swapping && currentStep.swapping.includes(i)
    const isPivot = currentStep.pivot === i
    const isCompare = currentStep.j === i || (currentStep.type === 'compare' && (currentStep.j === i || currentStep.j + 1 === i)) || currentStep.i === i || currentStep.minIdx === i

    if (isSorted) fill = '#10b981'
    else if (isSwapping) fill = '#ef4444'
    else if (isPivot) fill = '#f59e0b'
    else if (isCompare) fill = '#fde68a'
    else if (currentStep.lo != null && currentStep.hi != null && (i < currentStep.lo || i > currentStep.hi)) fill = '#374151'

    ctx.fillStyle = fill
    fillRoundRect(ctx, x, y, barW, h, 5)

    // Bar Value
    ctx.fillStyle = isCompare ? '#0b0e14' : '#ffffff'
    ctx.font = 'bold 11px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    ctx.fillText(String(val), x + barW / 2, y - 6)

    // Bar Index
    ctx.fillStyle = '#64748b'
    ctx.font = '10px JetBrains Mono, monospace'
    ctx.fillText(`[${i}]`, x + barW / 2, baseY + 14)

    // Pointer Label under bar if pivot or swapping
    if (isPivot) {
      ctx.fillStyle = '#f59e0b'
      ctx.font = 'bold 9px JetBrains Mono, monospace'
      ctx.fillText('PIVOT', x + barW / 2, baseY + 26)
    } else if (isSwapping) {
      ctx.fillStyle = '#ef4444'
      ctx.font = 'bold 9px JetBrains Mono, monospace'
      ctx.fillText('SWAP', x + barW / 2, baseY + 26)
    }
  }

  // 4. Step Annotation Box at bottom
  const annotY = box.y + box.height - 44
  ctx.fillStyle = '#0b0e14'
  ctx.strokeStyle = '#1e2638'
  ctx.lineWidth = 1
  fillRoundRect(ctx, box.x + 16, annotY, box.width - 32, 34, 6)
  ctx.stroke()

  ctx.fillStyle = '#e2e8f0'
  ctx.font = '11px JetBrains Mono, monospace'
  ctx.textAlign = 'left'
  const annot = currentStep.annotation || 'Executing algorithm step...'
  ctx.fillText(annot.length > 70 ? annot.slice(0, 68) + '…' : annot, box.x + 26, annotY + 21)
}

function drawSearchPointers(ctx, concept, box, progress) {
  const mode = concept.visualization?.config?.mode || concept.slug || 'binary-search'
  const arr = concept.visualization?.config?.array || [2, 5, 8, 12, 16, 23, 38, 45, 56, 72]
  const target = concept.visualization?.config?.target ?? (mode === 'binary-search' ? 23 : 16)

  let steps = getSteps('search', mode, arr, target)
  if (!steps || steps.length === 0) {
    steps = getSteps('search', 'binary-search', arr, target)
  }
  if (!steps || steps.length === 0) return

  const totalSteps = steps.length
  const stepIdx = Math.min(totalSteps - 1, Math.floor(progress * totalSteps))
  const step = steps[stepIdx]
  const n = arr.length

  // 1. Header with Concept Title & Step Counter
  ctx.fillStyle = '#38bdf8'
  ctx.font = 'bold 13px Inter, sans-serif'
  ctx.textAlign = 'left'
  const titleText = (concept.title || 'Search Algorithm').toUpperCase()
  ctx.fillText(`${titleText} · TARGET = ${target}`, box.x + 20, box.y + 28)

  ctx.textAlign = 'right'
  ctx.fillStyle = step.found ? '#10b981' : '#f59e0b'
  ctx.font = 'bold 12px JetBrains Mono, monospace'
  ctx.fillText(`STEP ${String(stepIdx + 1).padStart(2, '0')} / ${String(totalSteps).padStart(2, '0')}`, box.x + box.width - 20, box.y + 28)

  // 2. Legend / Active Pointers summary
  ctx.textAlign = 'left'
  ctx.font = '10px Inter, sans-serif'
  const legendY = box.y + 48
  let legX = box.x + 20
  const pointers = []
  if (step.lo != null) pointers.push(`Low: [${step.lo}] (${arr[step.lo]})`)
  if (step.mid != null) pointers.push(`Mid: [${step.mid}] (${arr[step.mid]})`)
  if (step.hi != null) pointers.push(`High: [${step.hi}] (${arr[step.hi]})`)
  if (step.i != null) pointers.push(`Idx: [${step.i}] (${arr[step.i]})`)

  ctx.fillStyle = '#94a3b8'
  ctx.fillText(pointers.join('  •  ') || 'Evaluating search boundaries...', legX, legendY)

  // 3. Array Cells with Pointers
  const marginX = 20
  const usableW = box.width - marginX * 2
  const cellW = Math.max(28, Math.floor(usableW / n) - 6)
  const gap = (usableW - cellW * n) / (n - 1)
  const cellH = 50
  const startY = box.y + 105

  for (let i = 0; i < n; i++) {
    const val = arr[i]
    const x = box.x + marginX + i * (cellW + gap)
    const inRange = step.lo != null && step.hi != null && i >= step.lo && i <= step.hi
    const isMid = step.mid === i || step.i === i
    const isLo = step.lo === i
    const isHi = step.hi === i
    const isFound = step.found && isMid

    let bg = '#0d0d12'
    let stroke = '#1e2638'
    let textFill = '#64748b'

    if (isFound) {
      bg = '#14532d'
      stroke = '#10b981'
      textFill = '#ffffff'
    } else if (isMid) {
      bg = 'rgba(56, 189, 248, 0.25)'
      stroke = '#38bdf8'
      textFill = '#ffffff'
    } else if (inRange) {
      bg = '#161d2d'
      stroke = (isLo || isHi) ? '#60a5fa' : '#334155'
      textFill = '#e2e8f0'
    } else {
      bg = '#090d14'
      stroke = '#161d26'
      textFill = '#334155'
    }

    ctx.fillStyle = bg
    ctx.strokeStyle = stroke
    ctx.lineWidth = isMid || isFound ? 2 : 1
    fillRoundRect(ctx, x, startY, cellW, cellH, 8)
    ctx.stroke()

    // Value
    ctx.fillStyle = textFill
    ctx.font = 'bold 15px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    ctx.fillText(String(val), x + cellW / 2, startY + cellH / 2 + 5)

    // Index
    ctx.fillStyle = '#64748b'
    ctx.font = '10px JetBrains Mono, monospace'
    ctx.fillText(`[${i}]`, x + cellW / 2, startY + cellH + 16)

    // Pointer Labels below
    if (isFound) {
      ctx.fillStyle = '#10b981'
      ctx.font = 'bold 10px JetBrains Mono, monospace'
      ctx.fillText('FOUND ✓', x + cellW / 2, startY + cellH + 32)
    } else if (isMid) {
      ctx.fillStyle = '#38bdf8'
      ctx.font = 'bold 10px JetBrains Mono, monospace'
      ctx.fillText('▲ MID', x + cellW / 2, startY + cellH + 32)
    } else if (isLo && isHi) {
      ctx.fillStyle = '#60a5fa'
      ctx.font = 'bold 9px JetBrains Mono, monospace'
      ctx.fillText('LO=HI', x + cellW / 2, startY + cellH + 32)
    } else if (isLo) {
      ctx.fillStyle = '#60a5fa'
      ctx.font = 'bold 9px JetBrains Mono, monospace'
      ctx.fillText('▲ LO', x + cellW / 2, startY + cellH + 32)
    } else if (isHi) {
      ctx.fillStyle = '#60a5fa'
      ctx.font = 'bold 9px JetBrains Mono, monospace'
      ctx.fillText('▲ HI', x + cellW / 2, startY + cellH + 32)
    }
  }

  // 4. Step Annotation Box at bottom
  const annotY = box.y + box.height - 44
  ctx.fillStyle = '#0b0e14'
  ctx.strokeStyle = '#1e2638'
  ctx.lineWidth = 1
  fillRoundRect(ctx, box.x + 16, annotY, box.width - 32, 34, 6)
  ctx.stroke()

  ctx.fillStyle = '#e2e8f0'
  ctx.font = '11px JetBrains Mono, monospace'
  ctx.textAlign = 'left'
  const annot = step.annotation || 'Evaluating search boundaries...'
  ctx.fillText(annot.length > 70 ? annot.slice(0, 68) + '…' : annot, box.x + 26, annotY + 21)
}

function drawGraphTraversal(ctx, concept, box, progress) {
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
  ctx.fillStyle = '#38bdf8'
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
    ctx.strokeStyle = active ? '#38bdf8' : '#1e2638'
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

    ctx.fillStyle = isTarget ? '#10b981' : visited ? '#38bdf8' : '#161d2d'
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

function drawTreeTraversal(ctx, concept, box, progress) {
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
  ctx.fillStyle = '#38bdf8'
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

function drawMatrixGrid(ctx, concept, box, progress) {
  const rows = 4
  const cols = 5
  const totalCells = rows * cols
  const filledCells = Math.min(totalCells, Math.floor(progress * totalCells))

  ctx.fillStyle = '#38bdf8'
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

      ctx.fillStyle = isCurrent ? '#f59e0b' : isFilled ? 'rgba(56, 189, 248, 0.2)' : '#161d2d'
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

function drawLifecycleFlow(ctx, concept, box, progress) {
  const stages = [
    { title: '01. MOUNT', sub: 'Initial Render', code: 'useEffect(fn, [])' },
    { title: '02. UPDATE', sub: 'State / Props', code: 'useEffect(fn, [id])' },
    { title: '03. UNMOUNT', sub: 'Cleanup & Teardown', code: 'return () => cleanup' }
  ]

  ctx.fillStyle = '#38bdf8'
  ctx.font = 'bold 13px Inter, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('REACT LIFECYCLE: State Execution Flow', box.x + 24, box.y + 32)

  const activeStage = progress < 0.35 ? 0 : progress < 0.72 ? 1 : 2

  const marginX = 24
  const cardW = (box.width - marginX * 2) / 3 - 12
  const cardH = box.height - 110
  const startY = box.y + 60

  stages.forEach((st, idx) => {
    const x = box.x + marginX + idx * (cardW + 12)
    const isActive = idx === activeStage
    const isPast = idx < activeStage

    ctx.fillStyle = isActive ? 'rgba(56, 189, 248, 0.15)' : '#161d2d'
    ctx.strokeStyle = isActive ? '#38bdf8' : isPast ? '#10b981' : '#1e2638'
    ctx.lineWidth = isActive ? 2 : 1
    fillRoundRect(ctx, x, startY, cardW, cardH, 12)
    ctx.stroke()

    // Title
    ctx.fillStyle = isActive ? '#38bdf8' : isPast ? '#10b981' : '#94a3b8'
    ctx.font = 'bold 12px JetBrains Mono, monospace'
    ctx.textAlign = 'left'
    ctx.fillText(st.title, x + 16, startY + 28)

    // Subtitle
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 14px Inter, sans-serif'
    ctx.fillText(st.sub, x + 16, startY + 56)

    // Code
    ctx.fillStyle = '#64748b'
    ctx.font = '11px JetBrains Mono, monospace'
    ctx.fillText(st.code, x + 16, startY + 84)

    // Status Badge
    if (isActive) {
      ctx.fillStyle = '#38bdf8'
      ctx.font = 'bold 10px JetBrains Mono, monospace'
      ctx.fillText('● ACTIVE RUNNING', x + 16, startY + cardH - 18)
    } else if (isPast) {
      ctx.fillStyle = '#10b981'
      ctx.font = 'bold 10px JetBrains Mono, monospace'
      ctx.fillText('✓ PASSED', x + 16, startY + cardH - 18)
    }
  })
}

function drawNeuralNetwork(ctx, concept, box, progress) {
  ctx.fillStyle = '#38bdf8'
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
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)'
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
      ctx.fillStyle = isFired ? '#38bdf8' : '#161d2d'
      ctx.strokeStyle = isFired ? '#ffffff' : '#334155'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, y, 14, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    })
  })
}

function drawSystemArchitecture(ctx, concept, box, progress) {
  const steps = ['Client', 'API Gateway', 'Cache (O(1))', 'Database']
  ctx.fillStyle = '#38bdf8'
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

    ctx.fillStyle = isActive ? 'rgba(56, 189, 248, 0.2)' : isPast ? 'rgba(16, 185, 129, 0.15)' : '#161d2d'
    ctx.strokeStyle = isActive ? '#38bdf8' : isPast ? '#10b981' : '#1e2638'
    ctx.lineWidth = isActive ? 2 : 1
    fillRoundRect(ctx, x, y, cardW, cardH, 10)
    ctx.stroke()

    ctx.fillStyle = isActive ? '#38bdf8' : isPast ? '#10b981' : '#e2e8f0'
    ctx.font = 'bold 13px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(st, x + cardW / 2, y + cardH / 2 + 5)
  })
}

function drawTimelineExecution(ctx, concept, box, progress) {
  const steps = ['01. Dispatch', '02. Validate', '03. Execute', '04. Commit']
  const n = steps.length
  const activeIdx = Math.min(n - 1, Math.floor(progress * n))

  ctx.fillStyle = '#38bdf8'
  ctx.font = 'bold 13px Inter, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('STATE MACHINE: Sequential Execution Flow', box.x + 24, box.y + 32)

  ctx.textAlign = 'right'
  ctx.fillStyle = progress >= 0.9 ? '#10b981' : '#f59e0b'
  ctx.font = 'bold 12px JetBrains Mono, monospace'
  ctx.fillText(`STAGE 0${activeIdx + 1} / 04`, box.x + box.width - 24, box.y + 32)

  const marginX = 24
  const cardW = (box.width - marginX * 2) / n - 10
  const cardH = 64
  const y = box.y + (box.height - cardH) / 2

  steps.forEach((st, idx) => {
    const x = box.x + marginX + idx * (cardW + 10)
    const isActive = idx === activeIdx
    const isPast = idx < activeIdx

    ctx.fillStyle = isActive ? 'rgba(56, 189, 248, 0.2)' : isPast ? 'rgba(16, 185, 129, 0.15)' : '#161d2d'
    ctx.strokeStyle = isActive ? '#38bdf8' : isPast ? '#10b981' : '#1e2638'
    ctx.lineWidth = isActive ? 2 : 1
    fillRoundRect(ctx, x, y, cardW, cardH, 8)
    ctx.stroke()

    ctx.fillStyle = isActive ? '#38bdf8' : isPast ? '#10b981' : '#e2e8f0'
    ctx.font = 'bold 12px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    ctx.fillText(st, x + cardW / 2, y + cardH / 2 + 4)
  })
}

function drawBottomStatusBar(ctx, box, progress) {
  const barH = 4
  const y = box.y + box.height - barH
  ctx.fillStyle = '#1e2638'
  ctx.fillRect(box.x, y, box.width, barH)

  ctx.fillStyle = '#38bdf8'
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
