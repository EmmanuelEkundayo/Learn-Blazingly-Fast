/**
 * Visualizer Playback Engine for TikTok & Shorts Video Mode.
 * Dynamically renders animated step-by-step visualizations on a 2D canvas
 * or SVG element, compressed or expanded to the slide's active time frame.
 */

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
  const initial = [18, 42, 28, 70, 35, 55, 88, 62]
  const sorted = [18, 28, 35, 42, 55, 62, 70, 88]
  const n = initial.length

  // Interpolate values based on progress
  const stepIdx = Math.min(n - 1, Math.floor(progress * n))
  const isComplete = progress >= 0.92

  const marginX = 40
  const marginY = 50
  const usableW = box.width - marginX * 2
  const usableH = box.height - marginY * 2
  const barW = (usableW / n) - 12
  const maxH = 88

  // Header caption
  ctx.fillStyle = '#94a3b8'
  ctx.font = 'bold 13px Inter, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('SORTING IN PROGRESS', box.x + 24, box.y + 32)

  ctx.textAlign = 'right'
  ctx.fillStyle = isComplete ? '#10b981' : '#f59e0b'
  ctx.font = 'bold 12px JetBrains Mono, monospace'
  ctx.fillText(isComplete ? 'COMPLETED O(N log N)' : `STEP 0${stepIdx + 1} / 0${n}`, box.x + box.width - 24, box.y + 32)

  for (let i = 0; i < n; i++) {
    const startVal = initial[i]
    const endVal = sorted[i]
    const currentVal = Math.round(startVal + (endVal - startVal) * Math.min(1, progress * 1.2))
    const h = (currentVal / maxH) * (usableH - 30)
    const x = box.x + marginX + i * (barW + 12)
    const y = box.y + box.height - 45 - h

    // Bar state color
    let barFill = '#1d4ed8' // default blue
    if (isComplete || i <= stepIdx) {
      barFill = '#10b981' // sorted green
    } else if (i === stepIdx + 1) {
      barFill = '#f59e0b' // comparing amber
    }

    ctx.fillStyle = barFill
    fillRoundRect(ctx, x, y, barW, h, 6)

    // Number label
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 11px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    ctx.fillText(String(currentVal), x + barW / 2, y - 8)

    // Index label
    ctx.fillStyle = '#64748b'
    ctx.font = '10px JetBrains Mono, monospace'
    ctx.fillText(`[${i}]`, x + barW / 2, box.y + box.height - 28)
  }
}

function drawSearchPointers(ctx, concept, box, progress) {
  const items = [2, 5, 8, 12, 16, 23, 38, 56]
  const target = 12
  const targetIdx = 3
  const isFound = progress >= 0.65

  // Header
  ctx.fillStyle = '#38bdf8'
  ctx.font = 'bold 13px Inter, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`BINARY SEARCH: Target = ${target}`, box.x + 24, box.y + 32)

  ctx.textAlign = 'right'
  ctx.fillStyle = isFound ? '#10b981' : '#f59e0b'
  ctx.font = 'bold 12px JetBrains Mono, monospace'
  ctx.fillText(isFound ? 'FOUND IN O(log N)' : 'EVALUATING MID...', box.x + box.width - 24, box.y + 32)

  const n = items.length
  const marginX = 24
  const cellW = (box.width - marginX * 2) / n - 8
  const cellH = 56
  const startY = box.y + (box.height - cellH) / 2 - 10

  for (let i = 0; i < n; i++) {
    const x = box.x + marginX + i * (cellW + 8)
    const isMid = i === targetIdx
    const isTarget = isMid && isFound

    ctx.fillStyle = isTarget ? '#10b981' : isMid ? 'rgba(56, 189, 248, 0.25)' : '#161d2d'
    ctx.strokeStyle = isTarget ? '#10b981' : isMid ? '#38bdf8' : '#1e2638'
    ctx.lineWidth = isMid ? 2 : 1
    fillRoundRect(ctx, x, startY, cellW, cellH, 8)
    ctx.stroke()

    ctx.fillStyle = isTarget ? '#ffffff' : '#f8fafc'
    ctx.font = 'bold 16px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    ctx.fillText(String(items[i]), x + cellW / 2, startY + cellH / 2 + 5)

    ctx.fillStyle = isMid ? '#38bdf8' : '#64748b'
    ctx.font = '10px JetBrains Mono, monospace'
    ctx.fillText(`[${i}]`, x + cellW / 2, startY + cellH + 18)

    if (isMid) {
      ctx.fillStyle = isFound ? '#10b981' : '#38bdf8'
      ctx.font = 'bold 11px Inter, sans-serif'
      ctx.fillText('▲ MID', x + cellW / 2, startY + cellH + 34)
    }
  }
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
