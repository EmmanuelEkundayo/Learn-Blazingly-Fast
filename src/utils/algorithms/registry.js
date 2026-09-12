import { generateQuicksortSteps, DEFAULT_SORT_ARRAY } from './quicksortSteps.js'
import { generateBubbleSortSteps, generateSelectionSortSteps, generateInsertionSortSteps } from './sorting.js'
import {
  generateBfsSteps,
  DEFAULT_GRAPH_NODES,
  DEFAULT_GRAPH_EDGES,
  DEFAULT_GRAPH_ADJACENCY,
} from './bfsSteps.js'
import { generateDfsSteps, generateDijkstraSteps } from './graphAlgorithms.js'
import {
  generateBinarySearchSteps,
  generateLinearSearchSteps,
  generateTwoPointersSteps,
  generateSlidingWindowSteps,
  generateDutchFlagSteps,
} from './searchAlgorithms.js'
import { generateKnapsackSteps, DEFAULT_KNAPSACK } from './knapsackSteps.js'

/**
 * Central registry for algorithm step generators.
 */

const GENERATORS = {
  sorting: {
    'bubble-sort':        generateBubbleSortSteps,
    'selection-sort':     generateSelectionSortSteps,
    'insertion-sort':     generateInsertionSortSteps,
    'quicksort':          generateQuicksortSteps,
    'sort-visualization': generateQuicksortSteps,
    default:              generateQuicksortSteps,
  },
  graph: {
    'bfs':      generateBfsSteps,
    'dfs':      generateDfsSteps,
    'dijkstra': generateDijkstraSteps,
    default:    generateBfsSteps,
  },
  search: {
    'binary-search':       generateBinarySearchSteps,
    'linear-search':       generateLinearSearchSteps,
    'two-pointers':        generateTwoPointersSteps,
    'sliding-window':      generateSlidingWindowSteps,
    'dutch-national-flag': generateDutchFlagSteps,
    default:               generateBinarySearchSteps,
  },
  dp: {
    'knapsack': generateKnapsackSteps,
    default:    generateKnapsackSteps,
  }
}

// ─── Mode-specific sort arrays ────────────────────────────────────────────────
// Each array is designed to make the algorithm's behaviour clearly visible.

const SORT_ARRAYS = {
  // Classic sorting algorithms
  'bubble-sort':    [3, 1, 4, 2, 6, 5, 8, 7, 10, 9],
  'insertion-sort': [9, 1, 8, 2, 7, 3, 6, 4, 10, 5],
  'selection-sort': [8, 3, 6, 1, 9, 4, 7, 2, 10, 5],
  'quicksort':      DEFAULT_SORT_ARRAY,

  // Heap-based structures: max-heap property array
  'heap-operations':  [16, 14, 10, 8, 7, 9, 3, 2, 4, 1],
  'heapify':          [16, 14, 10, 8, 7, 9, 3, 2, 4, 1],
  'max-min-heap':     [16, 14, 10, 8, 7, 9, 3, 2, 4, 1],
  'priority-queue':   [16, 14, 10, 8, 7, 9, 3, 2, 4, 1],

  // Prefix/range queries: small distinct values to show running sums clearly
  'prefix-sum':               [3, 1, 4, 1, 5, 9, 2, 6, 5, 3],
  'square-root-decomposition':[3, 1, 4, 1, 5, 9, 2, 6, 5, 3],

  // Kadane's: classic negative/positive mix for max subarray
  'kadanes-algorithm': [-2, 1, -3, 4, -1, 2, 1, -5, 4],

  // Sliding window / monotonic queue
  'sliding-window-max': [3, -1, -3, 5, 3, 6, 7],
  'monotonic-queue':    [3, -1, -3, 5, 3, 6, 7],

  // Monotonic stack / next greater element
  'monotonic-stack':      [4, 5, 2, 10, 8, 3, 6],
  'next-greater-element': [4, 5, 2, 10, 8, 3, 6],

  // Min-stack
  'min-stack': [5, 3, 7, 3, 8, 1, 4, 6, 2],

  // Hash table internals: values that demonstrate collision/chaining patterns
  'hash-table-internals': [23, 17, 45, 12, 67, 34, 89, 56, 78, 90],
  'chaining':             [23, 17, 45, 12, 67, 34, 89, 56, 78, 90],
  'open-addressing':      [23, 17, 45, 12, 67, 34, 89, 56, 78, 90],

  // Counting/distribution sorts
  'bucket-sort':   [78, 17, 39, 26, 72, 94, 21, 12, 23, 68],
  'counting-sort': [4, 2, 2, 8, 3, 3, 1, 7, 5, 6],
  'radix-sort':    [4, 2, 2, 8, 3, 3, 1, 7, 5, 6],

  // Fenwick / BIT: powers of 2 up to 15 for clear prefix sum demonstration
  'fenwick-tree': [1, 3, 5, 7, 9, 11, 13, 15],
}

export function getDefaultSortArray(mode) {
  return SORT_ARRAYS[mode] ?? DEFAULT_SORT_ARRAY
}

// ─── Mode-specific graph data ─────────────────────────────────────────────────

function makeGraph(edges, n, directed = false) {
  const nodes = Array.from({ length: n }, (_, id) => ({ id }))
  const adjacency = {}
  for (let i = 0; i < n; i++) adjacency[i] = []
  for (const { source, target } of edges) {
    adjacency[source].push(target)
    if (!directed) adjacency[target].push(source)
  }
  return { nodes, edges, adjacency }
}

// BFS: wide, shallow, tree-like — shows level-by-level expansion clearly
//         0
//        / \
//       1   2
//      /|   |\
//     3  4  5  6
//     |
//     7
const BFS_GRAPH = makeGraph([
  { source: 0, target: 1 }, { source: 0, target: 2 },
  { source: 1, target: 3 }, { source: 1, target: 4 },
  { source: 2, target: 5 }, { source: 2, target: 6 },
  { source: 3, target: 7 },
], 8)

// DFS: deep chain with side branches — shows backtracking behaviour
//   0 — 1 — 2 — 3
//   |       |
//   4       5 — 6 — 7
const DFS_GRAPH = makeGraph([
  { source: 0, target: 1 }, { source: 0, target: 4 },
  { source: 1, target: 2 },
  { source: 2, target: 3 }, { source: 2, target: 5 },
  { source: 5, target: 6 },
  { source: 6, target: 7 },
], 8)

// Dijkstra: dense, multiple paths of different lengths to the same destination
const DIJKSTRA_GRAPH = makeGraph([
  { source: 0, target: 1 }, { source: 0, target: 2 },
  { source: 1, target: 2 }, { source: 1, target: 3 }, { source: 1, target: 4 },
  { source: 2, target: 3 },
  { source: 3, target: 5 }, { source: 3, target: 6 },
  { source: 4, target: 5 },
  { source: 6, target: 7 },
], 8)

// Bellman-Ford: linear chain with shortcut — negative edges are conceptual
// 0→1→2→3→4→5 with shortcut 0→3
const BELLMAN_FORD_GRAPH = makeGraph([
  { source: 0, target: 1 }, { source: 1, target: 2 },
  { source: 2, target: 3 }, { source: 3, target: 4 },
  { source: 4, target: 5 }, { source: 0, target: 3 },
], 6)

// Bridges/articulation points: graph with a clear bridge edge
// 0-1-2 (triangle) connected by single bridge 2-3 to 3-4-5 (triangle)
const BRIDGE_GRAPH = makeGraph([
  { source: 0, target: 1 }, { source: 1, target: 2 }, { source: 0, target: 2 },
  { source: 2, target: 3 }, // <-- bridge
  { source: 3, target: 4 }, { source: 4, target: 5 }, { source: 3, target: 5 },
], 6)

// Kruskal/Prim: weighted-style MST graph, 7 nodes
const MST_GRAPH = makeGraph([
  { source: 0, target: 1 }, { source: 0, target: 2 },
  { source: 1, target: 2 }, { source: 1, target: 3 },
  { source: 2, target: 4 }, { source: 3, target: 4 },
  { source: 3, target: 5 }, { source: 4, target: 6 },
  { source: 5, target: 6 },
], 7)

// Topological sort: DAG with clear dependency order
// 0→1→3, 0→2→3, 3→4→5
const TOPO_GRAPH = makeGraph([
  { source: 0, target: 1 }, { source: 0, target: 2 },
  { source: 1, target: 3 }, { source: 2, target: 3 },
  { source: 3, target: 4 }, { source: 4, target: 5 },
], 6, true)

// Cycle detection: graph with one clear cycle (0-1-2-0) plus outlier
const CYCLE_GRAPH = makeGraph([
  { source: 0, target: 1 }, { source: 1, target: 2 }, { source: 2, target: 0 },
  { source: 2, target: 3 }, { source: 3, target: 4 },
], 5)

// Bipartite: left {0,1,2}, right {3,4,5}
const BIPARTITE_GRAPH = makeGraph([
  { source: 0, target: 3 }, { source: 0, target: 4 },
  { source: 1, target: 3 }, { source: 1, target: 5 },
  { source: 2, target: 4 }, { source: 2, target: 5 },
], 6)

// Euler path: graph where Euler path exists (0-2 have odd degree, rest even)
const EULER_GRAPH = makeGraph([
  { source: 0, target: 1 }, { source: 0, target: 2 },
  { source: 1, target: 2 }, { source: 1, target: 3 },
  { source: 2, target: 3 }, { source: 2, target: 4 },
  { source: 3, target: 4 },
], 5)

// SCC (Kosaraju/Tarjan): 3 SCCs: {0,1,2}, {3,4}, {5}
const SCC_GRAPH = makeGraph([
  { source: 0, target: 1 }, { source: 1, target: 2 }, { source: 2, target: 0 },
  { source: 1, target: 3 }, { source: 3, target: 4 }, { source: 4, target: 3 },
  { source: 4, target: 5 },
], 6, true)

// Union-Find: linear chain for union operations
const UNION_FIND_GRAPH = makeGraph([
  { source: 0, target: 1 }, { source: 1, target: 2 },
  { source: 2, target: 3 }, { source: 3, target: 4 },
  { source: 4, target: 5 }, { source: 5, target: 6 },
], 7)

// Network flow: source(0)→sink(5) with branching paths
const FLOW_GRAPH = makeGraph([
  { source: 0, target: 1 }, { source: 0, target: 2 },
  { source: 1, target: 3 }, { source: 2, target: 3 },
  { source: 2, target: 4 }, { source: 3, target: 5 },
  { source: 4, target: 5 },
], 6, true)

// DAG for DP / consistent hashing / git internals: linear with branches
const DAG_GRAPH = makeGraph([
  { source: 0, target: 1 }, { source: 0, target: 2 },
  { source: 1, target: 3 }, { source: 2, target: 3 },
  { source: 3, target: 4 },
], 5, true)

// Johnson's: complete-ish sparse graph for all-pairs shortest path
const JOHNSONS_GRAPH = makeGraph([
  { source: 0, target: 1 }, { source: 0, target: 2 }, { source: 1, target: 3 },
  { source: 2, target: 3 }, { source: 3, target: 4 }, { source: 1, target: 4 },
  { source: 4, target: 5 }, { source: 2, target: 5 },
], 6)

const GRAPH_DATA = {
  'bfs':      BFS_GRAPH,
  'dfs':      DFS_GRAPH,
  'dijkstra': DIJKSTRA_GRAPH,

  // Shortest path
  'bellman-ford':        BELLMAN_FORD_GRAPH,
  'johnsons-algorithm':  JOHNSONS_GRAPH,

  // MST
  'kruskals':  MST_GRAPH,
  'prims':     MST_GRAPH,

  // Topological sort
  'topological-sort-dfs':   TOPO_GRAPH,
  'topological-sort-kahns': TOPO_GRAPH,
  'dp-on-graphs':           TOPO_GRAPH,

  // Cycle detection
  'cycle-detection-directed':   CYCLE_GRAPH,
  'cycle-detection-undirected': CYCLE_GRAPH,

  // Bipartite
  'bipartite-check':    BIPARTITE_GRAPH,
  'bipartite-matching': BIPARTITE_GRAPH,

  // Euler
  'euler-path': EULER_GRAPH,

  // SCC
  'kosarajus':   SCC_GRAPH,
  'tarjans-scc': SCC_GRAPH,

  // Union-Find
  'union-find': UNION_FIND_GRAPH,

  // Network flow
  'network-flow-ford-fulkerson': FLOW_GRAPH,

  // Bridges / articulation points
  'bridges-articulation-points': BRIDGE_GRAPH,

  // DAG-like (git internals, consistent hashing, branch strategies)
  'consistent-hashing-system': DAG_GRAPH,
  'git-internals-dag':         DAG_GRAPH,
  'branch-strategies':         DAG_GRAPH,
}

export function getDefaultGraphData(mode) {
  const g = GRAPH_DATA[mode]
  if (g) return g
  return { nodes: DEFAULT_GRAPH_NODES, edges: DEFAULT_GRAPH_EDGES, adjacency: DEFAULT_GRAPH_ADJACENCY }
}

// ─── Step generator ───────────────────────────────────────────────────────────

export function getSteps(type, mode, ...args) {
  const category = GENERATORS[type]
  if (!category) return []

  const generator = category[mode] || category.default
  return generator(...args)
}

export {
  DEFAULT_SORT_ARRAY,
  DEFAULT_GRAPH_NODES,
  DEFAULT_GRAPH_EDGES,
  DEFAULT_GRAPH_ADJACENCY,
  DEFAULT_KNAPSACK
}
