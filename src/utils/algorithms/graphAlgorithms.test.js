import { describe, it, expect } from 'vitest'
import { generateDfsSteps, generateDijkstraSteps } from './graphAlgorithms.js'

// Undirected graph:  A—B, A—C, B—D, C—D
const graph = {
  A: ['B', 'C'],
  B: ['A', 'D'],
  C: ['A', 'D'],
  D: ['B', 'C'],
}

const finalOrder = (steps) => steps[steps.length - 1].visitedOrder

describe('DFS', () => {
  it('starts at the source node', () => {
    expect(finalOrder(generateDfsSteps(graph, 'A'))[0]).toBe('A')
  })

  it('visits every reachable node exactly once', () => {
    const order = finalOrder(generateDfsSteps(graph, 'A'))
    expect(order).toHaveLength(4)
    expect(new Set(order)).toEqual(new Set(['A', 'B', 'C', 'D']))
  })

  it('produces the expected depth-first order from A', () => {
    // A -> B (first neighbor) -> D -> C (D's unvisited neighbor)
    expect(finalOrder(generateDfsSteps(graph, 'A'))).toEqual(['A', 'B', 'D', 'C'])
  })

  it('handles a single isolated node', () => {
    const order = finalOrder(generateDfsSteps({ X: [] }, 'X'))
    expect(order).toEqual(['X'])
  })
})

describe('Dijkstra (unit weights)', () => {
  it('starts at the source node', () => {
    expect(finalOrder(generateDijkstraSteps(graph, 'A'))[0]).toBe('A')
  })

  it('visits every reachable node exactly once', () => {
    const order = finalOrder(generateDijkstraSteps(graph, 'A'))
    expect(order).toHaveLength(4)
    expect(new Set(order)).toEqual(new Set(['A', 'B', 'C', 'D']))
  })
})
