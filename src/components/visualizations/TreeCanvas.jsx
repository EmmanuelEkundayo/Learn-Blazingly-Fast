import { useState, useMemo, useCallback } from 'react'
import * as d3 from 'd3'
import { motion } from 'framer-motion'
import StepControls from './StepControls.jsx'
import { useInterval } from '../../hooks/useInterval.js'

const SPEED_MS = { 0.5: 1800, 1: 900, 1.5: 600, 2: 450, 3: 300 }

const CLASS_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#a78bfa', '#ef4444']
const NODE_W = 110, NODE_H = 56

// ─── Mode-specific tree data ──────────────────────────────────────────────────

function getModeTree(mode) {
  switch (mode) {

    case 'bst-operations': {
      const tree = {
        id: 'n15', val: 15, color: null,
        children: [
          { id: 'n8', val: 8, color: null, children: [
            { id: 'n3', val: 3, color: null, children: [] },
            { id: 'n11', val: 11, color: null, children: [] },
          ]},
          { id: 'n20', val: 20, color: null, children: [
            { id: 'n17', val: 17, color: null, children: [] },
            { id: 'n25', val: 25, color: null, children: [] },
          ]},
        ],
      }
      const steps = [
        { active: new Set(), annotation: 'BST with values [15, 8, 20, 3, 11, 17, 25]. BST property: left < parent < right.' },
        { active: new Set(['n15']), annotation: 'Search 11: start at root 15. 11 < 15 → go LEFT.' },
        { active: new Set(['n15', 'n8']), annotation: 'At node 8. 11 > 8 → go RIGHT.' },
        { active: new Set(['n15', 'n8', 'n11']), annotation: 'Found 11! BST search: O(log n) average, O(n) worst case.' },
      ]
      return { tree, steps, legend: null, note: 'BST: left < parent < right. Insert/search O(log n) average.' }
    }

    case 'avl-tree': {
      const tree = {
        id: 'n10', val: '10 (bf:0)', color: null,
        children: [
          { id: 'n5', val: '5 (bf:0)', color: null, children: [
            { id: 'n3', val: '3 (bf:0)', color: null, children: [] },
            { id: 'n7', val: '7 (bf:0)', color: null, children: [] },
          ]},
          { id: 'n15', val: '15 (bf:-1)', color: null, children: [
            { id: 'n12', val: '12 (bf:0)', color: null, children: [] },
            { id: 'n20', val: '20 (bf:0)', color: null, children: [] },
          ]},
        ],
      }
      const steps = [
        { active: new Set(), annotation: 'AVL tree: self-balancing BST. bf = balance factor = height(left) − height(right). Must be −1, 0, or 1.' },
        { active: new Set(['n10']), annotation: 'Root 10: bf=0. Both subtrees have equal height.' },
        { active: new Set(['n5', 'n15']), annotation: 'Level 2: node 5 (bf=0), node 15 (bf=−1). All balance factors in {−1,0,1} — tree is balanced.' },
        { active: new Set(['n3', 'n7', 'n12', 'n20']), annotation: 'Leaves: all bf=0. AVL guarantees O(log n) for insert/delete/search via rotations.' },
      ]
      return { tree, steps, legend: null, note: 'AVL: balance factor kept in {-1,0,+1}. Rotations on insert/delete.' }
    }

    case 'red-black-tree': {
      const tree = {
        id: 'n10', val: '10', rbColor: 'B',
        children: [
          { id: 'n5', val: '5', rbColor: 'R', children: [
            { id: 'n3', val: '3', rbColor: 'B', children: [] },
            { id: 'n7', val: '7', rbColor: 'B', children: [] },
          ]},
          { id: 'n15', val: '15', rbColor: 'B', children: [
            { id: 'n12', val: '12', rbColor: 'R', children: [] },
            { id: 'n20', val: '20', rbColor: 'R', children: [] },
          ]},
        ],
      }
      const steps = [
        { active: new Set(), annotation: 'Red-Black tree: 5 RB properties ensure O(log n). B=black, R=red nodes.' },
        { active: new Set(['n10']), annotation: 'Root is always BLACK. Property 2 satisfied.' },
        { active: new Set(['n5']), annotation: 'Red node 5: both children (3, 7) are BLACK. No two consecutive red nodes — property 4 satisfied.' },
        { active: new Set(['n3', 'n7', 'n12', 'n20']), annotation: 'All paths to NULL have same black-height=2. Property 5 satisfied. Tree height ≤ 2·log₂(n+1).' },
      ]
      return { tree, steps, legend: null, note: 'RB tree: 5 properties guarantee balanced. Used in std::map, Java TreeMap.', isRBTree: true }
    }

    case 'trie': {
      const tree = {
        id: 'root', val: '(root)',
        children: [
          { id: 'c', val: 'c', children: [
            { id: 'ca', val: 'a', children: [
              { id: 'cat', val: 't ✓', isEnd: true, children: [] },
              { id: 'car', val: 'r', children: [
                { id: 'card', val: 'd ✓', isEnd: true, children: [] },
                { id: 'care', val: 'e ✓', isEnd: true, children: [] },
              ]},
            ]},
          ]},
        ],
      }
      const steps = [
        { active: new Set(), annotation: 'Trie for words: ["cat", "car", "card", "care"]. Each node represents one character.' },
        { active: new Set(['root', 'c']), annotation: 'All words start with "c". Shared prefix stored once — space efficient.' },
        { active: new Set(['root', 'c', 'ca']), annotation: 'Shared prefix "ca". After "a", words diverge: "t" (cat) vs "r" (car/card/care).' },
        { active: new Set(['root', 'c', 'ca', 'cat']), annotation: '"cat" terminates here (✓). Search time O(m) where m = word length. Independent of vocabulary size.' },
        { active: new Set(['root', 'c', 'ca', 'car', 'card', 'care']), annotation: 'All words inserted. Prefix queries (autocomplete) in O(prefix_len). 4 words, 7 nodes.' },
      ]
      return { tree, steps, legend: null, note: 'Trie: O(m) insert/search. Prefix sharing saves space. Used for autocomplete.' }
    }

    case 'dfs-preorder':
    case 'dfs-inorder':
    case 'dfs-postorder': {
      const tree = {
        id: 'n1', val: '1', children: [
          { id: 'n2', val: '2', children: [
            { id: 'n4', val: '4', children: [] },
            { id: 'n5', val: '5', children: [] },
          ]},
          { id: 'n3', val: '3', children: [
            { id: 'n6', val: '6', children: [] },
            { id: 'n7', val: '7', children: [] },
          ]},
        ],
      }
      const preOrder  = ['n1','n2','n4','n5','n3','n6','n7']
      const inOrder   = ['n4','n2','n5','n1','n6','n3','n7']
      const postOrder = ['n4','n5','n2','n6','n7','n3','n1']
      const isIn   = mode === 'dfs-inorder'
      const isPost = mode === 'dfs-postorder'
      const order  = isIn ? inOrder : isPost ? postOrder : preOrder
      const orderName = isIn ? 'In-order (L→Root→R)' : isPost ? 'Post-order (L→R→Root)' : 'Pre-order (Root→L→R)'
      const steps = [
        { active: new Set(), visited: [], annotation: `DFS ${orderName}: binary tree [1,2,3,4,5,6,7].` },
        ...order.map((id, i) => ({
          active: new Set([id]),
          visited: order.slice(0, i + 1),
          annotation: `Visit node ${id.replace('n', '')} — ${orderName}. Sequence so far: [${order.slice(0, i + 1).map(x => x.replace('n','')).join(', ')}]`,
        })),
        { active: new Set(), visited: order, annotation: `Complete ${orderName} traversal: [${order.map(x => x.replace('n','')).join(', ')}].` },
      ]
      return { tree, steps, legend: null, note: `DFS ${orderName}. Tree: [1,2,3,4,5,6,7].` }
    }

    case 'bfs-tree': {
      const tree = {
        id: 'n1', val: '1',
        children: [
          { id: 'n2', val: '2', children: [
            { id: 'n4', val: '4', children: [] },
            { id: 'n5', val: '5', children: [] },
          ]},
          { id: 'n3', val: '3', children: [
            { id: 'n6', val: '6', children: [] },
            { id: 'n7', val: '7', children: [] },
          ]},
        ],
      }
      const bfsOrder = ['n1','n2','n3','n4','n5','n6','n7']
      const steps = [
        { active: new Set(), annotation: 'BFS tree traversal: level-by-level. Uses queue (FIFO). Tree with 3 levels.' },
        { active: new Set(['n1']), annotation: 'Level 0: visit root 1. Enqueue children [2, 3].' },
        { active: new Set(['n2', 'n3']), annotation: 'Level 1: dequeue 2 (enqueue 4,5), dequeue 3 (enqueue 6,7). BFS explores full level before going deeper.' },
        { active: new Set(['n4', 'n5', 'n6', 'n7']), annotation: 'Level 2: dequeue 4,5,6,7 (leaves). BFS order: [1,2,3,4,5,6,7]. Guarantees shortest path in unweighted graphs.' },
      ]
      return { tree, steps, legend: null, note: 'BFS: level-by-level, queue-based. Shortest path in unweighted graphs.' }
    }

    case 'lowest-common-ancestor': {
      const tree = {
        id: 'n1', val: '1',
        children: [
          { id: 'n2', val: '2', children: [
            { id: 'n4', val: '4', children: [] },
            { id: 'n5', val: '5', children: [] },
          ]},
          { id: 'n3', val: '3', children: [
            { id: 'n6', val: '6', children: [] },
            { id: 'n7', val: '7', children: [] },
          ]},
        ],
      }
      const steps = [
        { active: new Set(), annotation: 'LCA: find Lowest Common Ancestor of nodes 4 and 6.' },
        { active: new Set(['n4', 'n6']), annotation: 'Target nodes: 4 (left-left) and 6 (right-left).' },
        { active: new Set(['n4', 'n6', 'n2', 'n3']), annotation: 'Backtrack: 4→2, 6→3. Parent of 4 is 2, parent of 6 is 3.' },
        { active: new Set(['n4', 'n6', 'n2', 'n3', 'n1']), annotation: 'LCA(4, 6) = 1 (root). Both paths converge here. Used in range queries, tree DP.' },
      ]
      return { tree, steps, legend: null, note: 'LCA: lowest node that is ancestor of both. Binary lifting: O(log n) per query.' }
    }

    case 'adaboost':
    case 'gradient-boosting':
    case 'random-forest':
    case 'lightgbm':
    case 'xgboost': {
      // Three small trees side by side shown as one combined tree structure
      const tree = {
        id: 'ensemble', val: mode.toUpperCase(), color: '#60a5fa',
        children: [
          { id: 't1root', val: 'Tree 1 (w=0.3)', children: [
            { id: 't1l', val: 'y≤0.5?', children: [
              { id: 't1ll', val: 'cls:0', isLeaf: true, children: [] },
              { id: 't1lr', val: 'cls:1', isLeaf: true, children: [] },
            ]},
          ]},
          { id: 't2root', val: 'Tree 2 (w=0.5)', children: [
            { id: 't2l', val: 'x≤3.0?', children: [
              { id: 't2ll', val: 'cls:0', isLeaf: true, children: [] },
              { id: 't2lr', val: 'cls:1', isLeaf: true, children: [] },
            ]},
          ]},
          { id: 't3root', val: 'Tree 3 (w=0.2)', children: [
            { id: 't3l', val: 'z≤0.8?', children: [
              { id: 't3ll', val: 'cls:0', isLeaf: true, children: [] },
              { id: 't3lr', val: 'cls:1', isLeaf: true, children: [] },
            ]},
          ]},
        ],
      }
      const methodNote = {
        adaboost: 'AdaBoost: sequential trees, reweight misclassified points.',
        'gradient-boosting': 'Gradient Boosting: each tree fits residuals of previous ensemble.',
        'random-forest': 'Random Forest: parallel trees on bootstrap samples + random features.',
        lightgbm: 'LightGBM: histogram-based GB, leaf-wise growth, faster than XGBoost.',
        xgboost: 'XGBoost: regularized GB with second-order gradient, prune by gain.',
      }
      const steps = [
        { active: new Set(), annotation: `${mode}: ensemble of weak learners (decision trees). Individual trees shown with weights.` },
        { active: new Set(['t1root', 't1l', 't1ll', 't1lr']), annotation: 'Tree 1 (weight=0.3): simple depth-1 stump. Weak learner — above-chance accuracy.' },
        { active: new Set(['t2root', 't2l', 't2ll', 't2lr']), annotation: 'Tree 2 (weight=0.5): focuses on previously misclassified samples. Higher weight = better learner.' },
        { active: new Set(['t3root', 't3l', 't3ll', 't3lr']), annotation: 'Tree 3 (weight=0.2): further corrects errors. Final prediction = weighted vote of all trees.' },
        { active: new Set(['ensemble']), annotation: `${methodNote[mode]} Final output: weighted combination. Ensemble beats any single tree.` },
      ]
      return { tree, steps, legend: null, note: methodNote[mode] }
    }

    case 'euler-tour': {
      const tree = {
        id: 'n1', val: '1 (in:1,out:14)',
        children: [
          { id: 'n2', val: '2 (in:2,out:7)', children: [
            { id: 'n4', val: '4 (in:3,out:4)', children: [] },
            { id: 'n5', val: '5 (in:5,out:6)', children: [] },
          ]},
          { id: 'n3', val: '3 (in:8,out:13)', children: [
            { id: 'n6', val: '6 (in:9,out:10)', children: [] },
            { id: 'n7', val: '7 (in:11,out:12)', children: [] },
          ]},
        ],
      }
      const steps = [
        { active: new Set(), annotation: 'Euler tour: DFS records entry (in) and exit (out) times for each node.' },
        { active: new Set(['n1']), annotation: 'Enter node 1 (in=1). DFS explores left subtree.' },
        { active: new Set(['n2', 'n4', 'n5']), annotation: 'Subtree of 2 occupies in[2..7]. Subtree check: node u is ancestor of v iff in[u] ≤ in[v] ≤ out[v] ≤ out[u].' },
        { active: new Set(['n3', 'n6', 'n7']), annotation: 'Subtree of 3 occupies in[8..13]. Euler tour enables range-based subtree queries.' },
        { active: new Set(['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7']), annotation: 'Complete Euler tour. Used for: LCA, subtree sum queries, path queries with Fenwick tree.' },
      ]
      return { tree, steps, legend: null, note: 'Euler tour: in/out timestamps. Subtree queries become range queries.' }
    }

    case 'centroid-decomposition': {
      const tree = {
        id: 'n4', val: '4 (centroid)', color: '#ef4444',
        children: [
          { id: 'n2', val: '2', color: '#3b82f6', children: [
            { id: 'n1', val: '1', color: '#3b82f6', children: [] },
            { id: 'n3', val: '3', color: '#3b82f6', children: [] },
          ]},
          { id: 'n6', val: '6', color: '#22c55e', children: [
            { id: 'n5', val: '5', color: '#22c55e', children: [] },
            { id: 'n7', val: '7', color: '#22c55e', children: [] },
          ]},
        ],
      }
      const steps = [
        { active: new Set(), annotation: 'Centroid decomposition: find centroid (node whose removal makes all subtrees ≤ n/2).' },
        { active: new Set(['n4']), annotation: 'Node 4 is the centroid. Removing it splits into subtrees of size ≤ 3 (≤ 7/2). Highlighted red.' },
        { active: new Set(['n2', 'n1', 'n3']), annotation: 'Left subtree (blue): nodes {1,2,3}. Process paths through 4 then recurse.' },
        { active: new Set(['n6', 'n5', 'n7']), annotation: 'Right subtree (green): nodes {5,6,7}. Centroid decomp depth = O(log n). Useful for path queries.' },
        { active: new Set(['n4', 'n2', 'n1', 'n3', 'n6', 'n5', 'n7']), annotation: 'Full decomposition: centroid tree has O(log n) levels. Paths between any two nodes pass through O(log n) centroids.' },
      ]
      return { tree, steps, legend: null, note: 'Centroid decomp: O(n log n) preprocessing. Path query: O(log² n).' }
    }

    default: { // decision-tree and any other
      const tree = {
        id: 'root',
        feature: 'petal_length', threshold: 2.45,
        gini: 0.667, samples: 150,
        children: [
          { id: 'leaf-L', isLeaf: true, label: 'Setosa', classIdx: 0, gini: 0.000, samples: 50 },
          {
            id: 'node-R',
            feature: 'petal_width', threshold: 1.75,
            gini: 0.500, samples: 100,
            children: [
              { id: 'leaf-RL', isLeaf: true, label: 'Versicolor', classIdx: 1, gini: 0.168, samples: 54 },
              { id: 'leaf-RR', isLeaf: true, label: 'Virginica',  classIdx: 2, gini: 0.043, samples: 46 },
            ],
          },
        ],
      }
      const steps = [
        { active: new Set(), annotation: 'Sample: petal_length=5.1, petal_width=1.8. Start at the root node.' },
        { active: new Set(['root']), annotation: 'Root: petal_length=5.1 ≤ 2.45? NO → follow right branch.' },
        { active: new Set(['root', 'node-R']), annotation: 'Node: petal_width=1.8 ≤ 1.75? NO → follow right branch.' },
        { active: new Set(['root', 'node-R', 'leaf-RR']), annotation: 'Leaf: Virginica (Gini=0.043, 46/46 samples). Prediction: Virginica.' },
      ]
      return { tree, steps, legend: ['Setosa', 'Versicolor', 'Virginica'], note: 'CART decision tree: Iris dataset. Splits minimize Gini impurity.', isIris: true }
    }
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TreeCanvas({ config = {} }) {
  const modeTree = useMemo(() => getModeTree(config.mode), [config.mode])
  const { tree, steps, legend, note, isIris, isRBTree } = modeTree

  const [step,    setStep]    = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed,   setSpeed]   = useState(1)

  const cur = steps[Math.min(step, steps.length - 1)]

  useInterval(
    () => { if (step < steps.length - 1) setStep(s => s + 1); else setPlaying(false) },
    playing ? SPEED_MS[speed] : null,
  )

  const handleReset = useCallback(() => { setStep(0); setPlaying(false) }, [])

  const { nodes, links, W, H } = useMemo(() => {
    const W = 560, H = 320
    const root   = d3.hierarchy(tree, d => d.children?.length ? d.children : null)
    const layout = d3.tree().size([W - 120, H - 100])
    layout(root)
    root.each(n => { n.x += 60; n.y += 50 })
    return { nodes: root.descendants(), links: root.links(), W, H }
  }, [tree])

  function nodeColor(d) {
    if (isRBTree) return d.rbColor === 'R' ? '#ef4444' : '#374151'
    if (d.color) return d.color
    if (d.isLeaf) return CLASS_COLORS[d.classIdx ?? 0]
    return '#60a5fa'
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-surface-600 bg-surface-800 overflow-hidden">
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxHeight: 340 }}>
          {/* Links */}
          {links.map((link, i) => {
            const active = cur.active.has(link.source.data.id) && cur.active.has(link.target.data.id)
            return (
              <motion.line key={i}
                x1={link.source.x} y1={link.source.y}
                x2={link.target.x} y2={link.target.y}
                animate={{ stroke: active ? '#60a5fa' : '#374151', strokeWidth: active ? 2.5 : 1.5 }}
                transition={{ duration: 0.25 }}
              />
            )
          })}

          {/* Nodes */}
          {nodes.map(node => {
            const d       = node.data
            const active  = cur.active.has(d.id)
            const color   = nodeColor(d)
            const hw = NODE_W / 2, hh = NODE_H / 2

            return (
              <g key={d.id} transform={`translate(${node.x},${node.y})`}>
                <motion.rect
                  x={-hw} y={-hh} width={NODE_W} height={NODE_H} rx={6}
                  animate={{
                    fill:        active ? `${color}22` : '#1c1c22',
                    stroke:      active ? color : (isRBTree ? color : '#374151'),
                    strokeWidth: active ? 2.5 : (isRBTree ? 2 : 1.5),
                  }}
                  transition={{ duration: 0.25 }}
                />

                {/* Iris CART style */}
                {isIris && !d.isLeaf && (
                  <>
                    <text textAnchor="middle" y={-10} fontSize={10} fontWeight="600"
                      fontFamily="'JetBrains Mono',monospace"
                      fill={active ? '#93c5fd' : '#9ca3af'}>
                      {d.feature} ≤ {d.threshold}
                    </text>
                    <text textAnchor="middle" y={5} fontSize={9} fontFamily="Inter,sans-serif" fill="#6b7280">
                      gini={d.gini?.toFixed(3)}
                    </text>
                    <text textAnchor="middle" y={18} fontSize={9} fontFamily="Inter,sans-serif" fill="#6b7280">
                      n={d.samples}
                    </text>
                  </>
                )}
                {isIris && d.isLeaf && (
                  <>
                    <text textAnchor="middle" y={-10} fontSize={11} fontWeight="700"
                      fontFamily="Inter,sans-serif" fill={active ? color : '#9ca3af'}>
                      {d.label}
                    </text>
                    <text textAnchor="middle" y={5} fontSize={9} fontFamily="Inter,sans-serif" fill="#6b7280">
                      gini={d.gini?.toFixed(3)}
                    </text>
                    <text textAnchor="middle" y={18} fontSize={9} fontFamily="Inter,sans-serif" fill="#6b7280">
                      n={d.samples}
                    </text>
                  </>
                )}

                {/* Generic tree style */}
                {!isIris && (
                  <>
                    <text textAnchor="middle" y={-8} fontSize={10} fontWeight="600"
                      fontFamily="'JetBrains Mono',monospace"
                      fill={active ? color : '#9ca3af'}>
                      {String(d.val ?? d.id).slice(0, 14)}
                    </text>
                    {isRBTree && (
                      <text textAnchor="middle" y={10} fontSize={11} fontWeight="700"
                        fontFamily="Inter,sans-serif"
                        fill={d.rbColor === 'R' ? '#ef4444' : '#9ca3af'}>
                        ●
                      </text>
                    )}
                    {!isRBTree && d.isLeaf && (
                      <text textAnchor="middle" y={10} fontSize={9} fontFamily="Inter,sans-serif" fill="#6b7280">leaf</text>
                    )}
                    {!isRBTree && !d.isLeaf && d.id !== 'root' && d.id !== 'ensemble' && d.children?.length === 0 && null}
                  </>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legend or note */}
      <div className="flex gap-4 text-xs text-gray-400 flex-wrap items-center">
        {isIris && legend && legend.map((name, i) => (
          <span key={name} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ backgroundColor: CLASS_COLORS[i] }} />
            {name}
          </span>
        ))}
        {note && (
          <span className="ml-auto text-gray-400 italic text-xs truncate max-w-xs">{note}</span>
        )}
      </div>

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
