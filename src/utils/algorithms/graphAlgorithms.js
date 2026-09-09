/**
 * Pre-computes steps for various graph algorithms.
 * Each step is a snapshot used by GraphCanvas.
 */

// ─── DFS ─────────────────────────────────────────────────────────────────────
export function generateDfsSteps(adjacency, startNode) {
  const steps = []
  const visited = new Set()
  const visitedOrder = []
  const stack = [startNode]

  steps.push({
    type: 'init',
    activeNode: startNode,
    activeEdge: null,
    queue: [...stack], // We'll reuse the 'queue' field for the stack in the UI
    visited: new Set(visited),
    visitedOrder: [...visitedOrder],
    annotation: `Initialize DFS: push start node ${startNode} onto stack.`,
  })

  function dfs(u, p = null) {
    if (visited.has(u)) {
       steps.push({
         type: 'skip',
         activeNode: u,
         activeEdge: p !== null ? [p, u] : null,
         queue: [...stack],
         visited: new Set(visited),
         visitedOrder: [...visitedOrder],
         annotation: `${u} already visited — skip.`,
       })
       return
    }

    visited.add(u)
    visitedOrder.push(u)
    
    steps.push({
      type: 'visit',
      activeNode: u,
      activeEdge: p !== null ? [p, u] : null,
      queue: [...stack],
      visited: new Set(visited),
      visitedOrder: [...visitedOrder],
      annotation: `Visit ${u}. Mark as visited.`,
    })

    const neighbors = adjacency[u] ?? []
    for (const v of neighbors) {
      if (!visited.has(v)) {
        steps.push({
          type: 'explore',
          activeNode: v,
          activeEdge: [u, v],
          queue: [...stack],
          visited: new Set(visited),
          visitedOrder: [...visitedOrder],
          annotation: `Exploring neighbor ${v} of ${u}.`,
        })
        dfs(v, u)
        
        // Backtrack step
        steps.push({
          type: 'backtrack',
          activeNode: u,
          activeEdge: [u, v],
          queue: [...stack],
          visited: new Set(visited),
          visitedOrder: [...visitedOrder],
          annotation: `Backtracked to ${u}.`,
        })
      } else {
        steps.push({
          type: 'skip',
          activeNode: u,
          activeEdge: [u, v],
          queue: [...stack],
          visited: new Set(visited),
          visitedOrder: [...visitedOrder],
          annotation: `Neighbor ${v} already visited.`,
        })
      }
    }
  }

  dfs(startNode)

  steps.push({
    type: 'done',
    activeNode: null,
    activeEdge: null,
    queue: [],
    visited: new Set(visited),
    visitedOrder: [...visitedOrder],
    annotation: `DFS complete. Visit order: ${visitedOrder.join(' → ')}`,
  })

  return steps
}

// ─── Dijkstra (Simplified - no weights displayed yet) ─────────────────────────
export function generateDijkstraSteps(adjacency, startNode) {
  // For now, this will look similar to BFS but with a priority queue logic
  // (In the UI it will just look like a different order of exploration)
  const steps = []
  const dist = { [startNode]: 0 }
  const visited = new Set()
  const visitedOrder = []
  const pq = [{ node: startNode, d: 0 }]

  steps.push({
    type: 'init',
    activeNode: startNode,
    activeEdge: null,
    queue: pq.map(i => i.node),
    visited: new Set(visited),
    visitedOrder: [...visitedOrder],
    annotation: `Dijkstra: Start at ${startNode} with distance 0.`,
  })

  while (pq.length > 0) {
    pq.sort((a, b) => a.d - b.d)
    const { node: u, d } = pq.shift()

    if (visited.has(u)) continue
    visited.add(u)
    visitedOrder.push(u)

    steps.push({
      type: 'dequeue',
      activeNode: u,
      activeEdge: null,
      queue: pq.map(i => i.node),
      visited: new Set(visited),
      visitedOrder: [...visitedOrder],
      annotation: `Extract min: ${u} (dist: ${d}).`,
    })

    for (const v of (adjacency[u] ?? [])) {
      // Assuming uniform weights of 1 for now since GraphCanvas doesn't show them
      const weight = 1 
      const newDist = d + weight
      
      if (!Object.prototype.hasOwnProperty.call(dist, v) || newDist < dist[v]) {
        dist[v] = newDist
        pq.push({ node: v, d: newDist })
        
        steps.push({
          type: 'relax',
          activeNode: v,
          activeEdge: [u, v],
          queue: pq.map(i => i.node),
          visited: new Set(visited),
          visitedOrder: [...visitedOrder],
          annotation: `Relax edge ${u}→${v}: new distance to ${v} is ${newDist}.`,
        })
      }
    }
  }

  steps.push({
    type: 'done',
    activeNode: null,
    activeEdge: null,
    queue: [],
    visited: new Set(visited),
    visitedOrder: [...visitedOrder],
    annotation: `Dijkstra complete.`,
  })

  return steps
}
