import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import StepControls from './StepControls.jsx'
import { useInterval } from '../../hooks/useInterval.js'

const SPEED_MS = { 0.5: 2000, 1: 1000, 1.5: 667, 2: 500, 3: 333 }

const BOX_W = 108
const BOX_H = 52
const GAP_X = 64
const GAP_Y = 56

function computeLayout(states) {
  const n    = states.length
  const cols = n <= 3 ? n : n <= 6 ? Math.ceil(n / 2) : Math.ceil(Math.sqrt(n))
  const rows = Math.ceil(n / cols)
  const W    = cols * BOX_W + (cols - 1) * GAP_X + 40
  const H    = rows * BOX_H + (rows - 1) * GAP_Y + 40

  const positions = states.map((_, i) => {
    const row = Math.floor(i / cols)
    const col = i % cols
    // centre-align last partial row
    const rowCount   = Math.min(cols, n - row * cols)
    const rowOffsetX = ((cols - rowCount) * (BOX_W + GAP_X)) / 2
    return {
      x: 20 + rowOffsetX + col * (BOX_W + GAP_X) + BOX_W / 2,
      y: 20 + row * (BOX_H + GAP_Y) + BOX_H / 2,
    }
  })

  return { W, H, positions }
}

// ─── Preset State Machine Configurations ─────────────────────────────────────
const STATE_PRESETS = {
  'circuit-breaker': {
    states: [
      { id: 'closed',    label: 'Closed',    sub: 'Normal traffic' },
      { id: 'open',      label: 'Open',      sub: 'Fail fast (tripped)' },
      { id: 'half_open', label: 'Half-Open', sub: 'Canary probe' },
    ],
    transitions: [
      { from: 'closed',    to: 'open',      label: 'Errors > threshold' },
      { from: 'open',      to: 'half_open', label: 'Cooldown expires' },
      { from: 'half_open', to: 'closed',    label: 'Canary succeeds' },
      { from: 'half_open', to: 'open',      label: 'Canary fails' },
    ],
    steps: [
      { active_state: 'closed', annotation: 'Circuit CLOSED: All traffic routed downstream. Latency and error rates normal.' },
      { active_state: 'closed', active_transition: { from: 'closed', to: 'open' }, annotation: 'Error Surge: Consecutive 500 responses breach threshold; circuit trips OPEN.' },
      { active_state: 'open', annotation: 'Circuit OPEN: Inbound requests fail fast immediately without loading downstream services.' },
      { active_state: 'open', active_transition: { from: 'open', to: 'half_open' }, annotation: 'Reset Timeout: Cooldown period ends; circuit transitions to HALF-OPEN to test recovery.' },
      { active_state: 'half_open', active_transition: { from: 'half_open', to: 'closed' }, annotation: 'Recovery Confirmed: Canary requests succeed; circuit resets to CLOSED.' },
    ],
  },
  'lifecycle': {
    states: [
      { id: 'mount',   label: 'Mounting',   sub: 'Initial render' },
      { id: 'mounted', label: 'Mounted',    sub: 'DOM ready / effects' },
      { id: 'update',  label: 'Updating',   sub: 'Props / state change' },
      { id: 'unmount', label: 'Unmounting', sub: 'Cleanup & teardown' },
    ],
    transitions: [
      { from: 'mount',   to: 'mounted', label: 'DOM paint' },
      { from: 'mounted', to: 'update',  label: 'setState()' },
      { from: 'update',  to: 'mounted', label: 'Re-rendered' },
      { from: 'mounted', to: 'unmount', label: 'Removed' },
    ],
    steps: [
      { active_state: 'mount', annotation: 'Mount Phase: Constructor runs, initial state created, JSX converted to Virtual DOM.' },
      { active_state: 'mounted', annotation: 'Mounted: DOM nodes inserted into document; useEffect and ref hooks execute.' },
      { active_state: 'update', annotation: 'Updating: Props change or setState triggers re-render and DOM reconciliation.' },
      { active_state: 'unmount', annotation: 'Unmounting: Component detached from DOM; subscriptions and timers cleaned up.' },
    ],
  },
  'error-states': {
    states: [
      { id: 'healthy',   label: 'Healthy',     sub: 'Normal render' },
      { id: 'caught',    label: 'Catching',    sub: 'Boundary catch' },
      { id: 'fallback',  label: 'Fallback UI', sub: 'User alert view' },
      { id: 'recovered', label: 'Recovered',   sub: 'State reset' },
    ],
    transitions: [
      { from: 'healthy',   to: 'caught',    label: 'Runtime error' },
      { from: 'caught',    to: 'fallback',  label: 'getDerivedStateFromError' },
      { from: 'fallback',  to: 'recovered', label: 'User retry' },
      { from: 'recovered', to: 'healthy',   label: 'Remount clean' },
    ],
    steps: [
      { active_state: 'healthy', annotation: 'Healthy: Subtree renders normally with zero unhandled exceptions.' },
      { active_state: 'caught', annotation: 'Exception Caught: Child component throws runtime error, caught by nearest Error Boundary.' },
      { active_state: 'fallback', annotation: 'Fallback UI: Boundary displays graceful error screen while protecting the rest of the application.' },
      { active_state: 'recovered', annotation: 'Recovery: User triggers reset, clearing error state and re-mounting subtree.' },
    ],
  },
  'browser-events': {
    states: [
      { id: 'callstack', label: 'Call Stack', sub: 'Sync execution' },
      { id: 'webapi',    label: 'Web APIs',   sub: 'Timer / Fetch' },
      { id: 'microtask', label: 'Microtasks', sub: 'Promise.then' },
      { id: 'macrotask', label: 'Macrotasks', sub: 'setTimeout / I/O' },
    ],
    transitions: [
      { from: 'callstack', to: 'webapi',    label: 'async call' },
      { from: 'webapi',    to: 'microtask', label: 'resolved' },
      { from: 'microtask', to: 'callstack', label: 'drain queue' },
      { from: 'macrotask', to: 'callstack', label: 'next tick' },
    ],
    steps: [
      { active_state: 'callstack', annotation: 'Call Stack: Synchronous JavaScript functions execute in LIFO order.' },
      { active_state: 'webapi', annotation: 'Web APIs: Browser handles background tasks (timers, fetch) off the main thread.' },
      { active_state: 'microtask', annotation: 'Microtasks: Promise callbacks and queueMicrotask drained completely before rendering.' },
      { active_state: 'macrotask', annotation: 'Macrotasks: Callback queue tasks (setTimeout, event listeners) execute one per tick.' },
    ],
  },
  'nodejs-events': {
    states: [
      { id: 'timers',  label: 'Timers',      sub: 'setTimeout / interval' },
      { id: 'pending', label: 'Pending I/O', sub: 'OS callbacks' },
      { id: 'poll',    label: 'Poll Phase',  sub: 'Incoming I/O' },
      { id: 'check',   label: 'Check Phase', sub: 'setImmediate()' },
    ],
    transitions: [
      { from: 'timers',  to: 'pending', label: 'next' },
      { from: 'pending', to: 'poll',    label: 'next' },
      { from: 'poll',    to: 'check',   label: 'next' },
      { from: 'check',   to: 'timers',  label: 'next loop' },
    ],
    steps: [
      { active_state: 'timers', annotation: 'Timers: Executes expired callbacks from setTimeout() and setInterval().' },
      { active_state: 'pending', annotation: 'Pending I/O: Executes system callbacks (TCP errors, write completions).' },
      { active_state: 'poll', annotation: 'Poll Phase: Retrieves new I/O events; blocks for incoming connections if queue empty.' },
      { active_state: 'check', annotation: 'Check Phase: setImmediate() callbacks invoked right after the poll phase.' },
    ],
  },
  'promise-lifecycle': {
    states: [
      { id: 'pending',   label: 'Pending',   sub: 'Initial async state' },
      { id: 'settling',  label: 'Settling',  sub: 'Executor running' },
      { id: 'fulfilled', label: 'Fulfilled', sub: 'resolve(value)' },
      { id: 'rejected',  label: 'Rejected',  sub: 'reject(error)' },
    ],
    transitions: [
      { from: 'pending',  to: 'settling',  label: 'async work' },
      { from: 'settling', to: 'fulfilled', label: 'resolve()' },
      { from: 'settling', to: 'rejected',  label: 'reject()' },
    ],
    steps: [
      { active_state: 'pending', annotation: 'Pending: The initial state of the Promise. Neither fulfilled nor rejected.' },
      { active_state: 'settling', annotation: 'Executor Running: Background task executes; consumer attaches .then() / .catch().' },
      { active_state: 'fulfilled', annotation: 'Fulfilled: resolve(val) called. State locks permanently; .then() handlers queued.' },
      { active_state: 'rejected', annotation: 'Rejected: reject(err) called or exception thrown. .catch() handlers invoked.' },
    ],
  },
  'tdd-cycle': {
    states: [
      { id: 'red',      label: 'Red',      sub: 'Failing test' },
      { id: 'green',    label: 'Green',    sub: 'Minimal code' },
      { id: 'refactor', label: 'Refactor', sub: 'Clean design' },
    ],
    transitions: [
      { from: 'red',      to: 'green',    label: 'write code' },
      { from: 'green',    to: 'refactor', label: 'test passes' },
      { from: 'refactor', to: 'red',      label: 'new test' },
    ],
    steps: [
      { active_state: 'red', annotation: 'Red: Write an automated test that defines the desired requirement and watch it fail.' },
      { active_state: 'green', annotation: 'Green: Write the minimal implementation required to make the test pass.' },
      { active_state: 'refactor', annotation: 'Refactor: Clean up structure, improve readability and eliminate duplication.' },
    ],
  },
  'service-worker-lifecycle': {
    states: [
      { id: 'installing', label: 'Installing', sub: 'Pre-caching' },
      { id: 'installed',  label: 'Installed',  sub: 'Waiting' },
      { id: 'activating', label: 'Activating', sub: 'Purging caches' },
      { id: 'active',     label: 'Active',     sub: 'Intercepting' },
    ],
    transitions: [
      { from: 'installing', to: 'installed',  label: 'skipWaiting()' },
      { from: 'installed',  to: 'activating', label: 'claim()' },
      { from: 'activating', to: 'active',     label: 'ready' },
    ],
    steps: [
      { active_state: 'installing', annotation: 'Installing: Service worker script downloaded; precaches critical static assets.' },
      { active_state: 'installed', annotation: 'Installed / Waiting: Waiting for older workers running on other tabs to exit.' },
      { active_state: 'activating', annotation: 'Activating: Cleans up obsolete cache storage; claims active clients.' },
      { active_state: 'active', annotation: 'Active: Controls all page fetch requests, handling offline responses and caching.' },
    ],
  },
  'pwa-lifecycle': {
    states: [
      { id: 'online',    label: 'Online',          sub: 'Direct network' },
      { id: 'offline',   label: 'Offline',         sub: 'Cache storage' },
      { id: 'syncing',   label: 'Background Sync', sub: 'Replay mutations' },
      { id: 'installed', label: 'Installed App',   sub: 'Standalone window' },
    ],
    transitions: [
      { from: 'online',  to: 'offline',   label: 'network drop' },
      { from: 'offline', to: 'syncing',   label: 'network return' },
      { from: 'syncing', to: 'online',    label: 'sync complete' },
      { from: 'online',  to: 'installed', label: 'A2HS prompt' },
    ],
    steps: [
      { active_state: 'online', annotation: 'Online: Direct internet connection; assets cached dynamically during navigation.' },
      { active_state: 'offline', annotation: 'Offline: Network loss detected; Service Worker serves views from CacheStorage.' },
      { active_state: 'syncing', annotation: 'Background Sync: Queued offline mutations replay automatically to server.' },
      { active_state: 'installed', annotation: 'Installed: App runs in standalone window without browser navigation bar.' },
    ],
  },
  'session-lifecycle': {
    states: [
      { id: 'anonymous',     label: 'Anonymous',      sub: 'Public visitor' },
      { id: 'authenticating',label: 'Authenticating', sub: 'Credentials check' },
      { id: 'active',        label: 'Active Session', sub: 'HttpOnly cookie' },
      { id: 'expired',       label: 'Expired',        sub: 'TTL timeout' },
    ],
    transitions: [
      { from: 'anonymous',      to: 'authenticating', label: 'login' },
      { from: 'authenticating', to: 'active',         label: 'auth success' },
      { from: 'active',         to: 'expired',        label: 'timeout' },
      { from: 'expired',        to: 'anonymous',      label: 'logout' },
    ],
    steps: [
      { active_state: 'anonymous', annotation: 'Anonymous: Unauthenticated user accessing public pages.' },
      { active_state: 'authenticating', annotation: 'Authenticating: Server verifies credentials and evaluates security tokens.' },
      { active_state: 'active', annotation: 'Active Session: Cryptographically signed session key saved in Redis & browser cookie.' },
      { active_state: 'expired', annotation: 'Expired: Inactivity timeout or logout destroys session token.' },
    ],
  },
  'feature-flags': {
    states: [
      { id: 'init',      label: 'Config Load', sub: 'Flag schema' },
      { id: 'eval',      label: 'Evaluation',  sub: 'Targeting rules' },
      { id: 'variant_a', label: 'Variant A',   sub: 'Feature active' },
      { id: 'variant_b', label: 'Variant B',   sub: 'Baseline fallback' },
    ],
    transitions: [
      { from: 'init', to: 'eval',      label: 'user context' },
      { from: 'eval', to: 'variant_a', label: 'flag == true' },
      { from: 'eval', to: 'variant_b', label: 'flag == false' },
    ],
    steps: [
      { active_state: 'init', annotation: 'Config Load: Client initializes feature flag definitions from remote config.' },
      { active_state: 'eval', annotation: 'Evaluation: Evaluates user ID, percentage rollouts, and geographic cohorts.' },
      { active_state: 'variant_a', annotation: 'Variant A: User matches rollout criteria; new feature UI activates.' },
      { active_state: 'variant_b', annotation: 'Variant B: User not in cohort; standard baseline experience rendered.' },
    ],
  },
  'web-worker-lifecycle': {
    states: [
      { id: 'spawn', label: 'Spawn Worker', sub: 'new Worker()' },
      { id: 'idle',  label: 'Idle / Ready', sub: 'Awaiting tasks' },
      { id: 'busy',  label: 'Computing',    sub: 'Off main thread' },
      { id: 'term',  label: 'Terminated',   sub: 'Memory freed' },
    ],
    transitions: [
      { from: 'spawn', to: 'idle', label: 'ready' },
      { from: 'idle',  to: 'busy', label: 'postMessage()' },
      { from: 'busy',  to: 'idle', label: 'result' },
      { from: 'idle',  to: 'term', label: 'terminate()' },
    ],
    steps: [
      { active_state: 'spawn', annotation: 'Spawn: Main UI thread instantiates worker thread with dedicated isolate.' },
      { active_state: 'idle', annotation: 'Idle: Worker thread ready, listening for messages without blocking 60fps UI.' },
      { active_state: 'busy', annotation: 'Computing: Worker performs heavy data crunching or sorting off the main thread.' },
      { active_state: 'term', annotation: 'Terminated: Worker terminated, releasing memory allocation and OS thread.' },
    ],
  },
  'state-management': {
    states: [
      { id: 'idle',     label: 'State Store',    sub: 'Immutable tree' },
      { id: 'dispatch', label: 'Dispatched',     sub: 'Action payload' },
      { id: 'reducer',  label: 'Reducer Mutate', sub: 'Next state' },
      { id: 'notify',   label: 'Notify Views',   sub: 'Selective render' },
    ],
    transitions: [
      { from: 'idle',     to: 'dispatch', label: 'dispatch(action)' },
      { from: 'dispatch', to: 'reducer',  label: 'apply action' },
      { from: 'reducer',  to: 'notify',   label: 'state change' },
      { from: 'notify',   to: 'idle',     label: 'DOM update' },
    ],
    steps: [
      { active_state: 'idle', annotation: 'State Store: Single source of truth holds application state.' },
      { active_state: 'dispatch', annotation: 'Dispatch: User interaction triggers action object describing the state change.' },
      { active_state: 'reducer', annotation: 'Reducer: Pure function computes next immutable state snapshot.' },
      { active_state: 'notify', annotation: 'Notify: Subscribed components re-render if selected state changed.' },
    ],
  },
  'stateless-lifecycle': {
    states: [
      { id: 'req',  label: 'Inbound Request', sub: 'Payload & headers' },
      { id: 'proc', label: 'Pure Compute',    sub: 'No side-effects' },
      { id: 'res',  label: 'Return Response', sub: 'Serialized output' },
      { id: 'dest', label: 'Context Freed',   sub: 'Ephemeral cleanup' },
    ],
    transitions: [
      { from: 'req',  to: 'proc', label: 'invoke' },
      { from: 'proc', to: 'res',  label: 'result' },
      { from: 'res',  to: 'dest', label: 'complete' },
    ],
    steps: [
      { active_state: 'req', annotation: 'Request: Any available worker instance receives the request without affinity.' },
      { active_state: 'proc', annotation: 'Processing: Computes output purely from input parameters.' },
      { active_state: 'res', annotation: 'Response: Result returned immediately to caller.' },
      { active_state: 'dest', annotation: 'Ephemeral Cleanup: Context garbage collected; instance ready for next request.' },
    ],
  },
}

function resolveStateConfig(config) {
  // 1. Explicit states array
  if (Array.isArray(config.states) && config.states.length > 0) {
    return {
      states: config.states,
      transitions: config.transitions || [],
      steps: config.steps || [{ active_state: config.states[0]?.id || null, active_transition: null, annotation: 'State machine overview.' }],
    }
  }

  // 2. Preset match
  if (config.mode && STATE_PRESETS[config.mode]) {
    return STATE_PRESETS[config.mode]
  }

  // 3. General fallback state machine
  return {
    states: [
      { id: 'idle',    label: 'Initial State', sub: 'Awaiting event' },
      { id: 'active',  label: 'Active State',  sub: 'Executing logic' },
      { id: 'success', label: 'Success State', sub: 'Task complete' },
      { id: 'error',   label: 'Error State',   sub: 'Handled failure' },
    ],
    transitions: [
      { from: 'idle',   to: 'active',  label: 'trigger' },
      { from: 'active', to: 'success', label: 'success' },
      { from: 'active', to: 'error',   label: 'failure' },
      { from: 'error',  to: 'idle',    label: 'retry' },
    ],
    steps: [
      { active_state: 'idle', annotation: 'Initial State: System idle, listening for domain trigger events.' },
      { active_state: 'active', active_transition: { from: 'idle', to: 'active' }, annotation: 'Active State: Trigger received, transition guards pass, operation executing.' },
      { active_state: 'success', active_transition: { from: 'active', to: 'success' }, annotation: 'Success State: Operation completed successfully, output state recorded.' },
      { active_state: 'error', active_transition: { from: 'active', to: 'error' }, annotation: 'Error State: Failure caught, error handler triggered, ready to retry.' },
    ],
  }
}

export default function StateDiagram({ config = {} }) {
  const { states, transitions, steps } = resolveStateConfig(config)

  const [idx, setIdx]         = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed]     = useState(1)

  const cur              = steps[idx]
  const activeState      = cur?.active_state      ?? null
  const activeTransition = cur?.active_transition ?? null   // { from, to }

  useInterval(
    () => { if (idx < steps.length - 1) setIdx(i => i + 1); else setPlaying(false) },
    playing ? SPEED_MS[speed] : null,
  )

  const handleReset = useCallback(() => { setIdx(0); setPlaying(false) }, [])

  const { W, H, positions } = computeLayout(states)
  const stateIdx = Object.fromEntries(states.map((s, i) => [s.id, i]))

  function edgeIsActive(t) {
    return activeTransition && activeTransition.from === t.from && activeTransition.to === t.to
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-surface-600 bg-surface-800 p-2 overflow-x-auto">
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxHeight: 320 }}>
          <defs>
            {transitions.map((t, i) => {
              const color = edgeIsActive(t) ? '#f59e0b' : '#4b5563'
              return (
                <marker key={i} id={`arr-${i}`} markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
                  <path d="M0,0 L0,7 L7,3.5 z" fill={color} />
                </marker>
              )
            })}
          </defs>

          {/* Transition arrows */}
          {transitions.map((t, i) => {
            const fi = stateIdx[t.from]
            const ti = stateIdx[t.to]
            if (fi === undefined || ti === undefined) return null

            const fp     = positions[fi]
            const tp     = positions[ti]
            const active = edgeIsActive(t)
            const color  = active ? '#f59e0b' : '#4b5563'

            const dx = tp.x - fp.x
            const dy = tp.y - fp.y
            const dist = Math.sqrt(dx * dx + dy * dy) || 1
            const ux = dx / dist, uy = dy / dist

            // Offset from box edge
            const hw = BOX_W / 2 + 5, hh = BOX_H / 2 + 4
            const scaleFrom = Math.min(hw / Math.abs(ux || 1), hh / Math.abs(uy || 1))
            const scaleTo   = Math.min(hw / Math.abs(ux || 1), hh / Math.abs(uy || 1))

            const x1 = fp.x + ux * Math.min(scaleFrom, dist / 2 - 2)
            const y1 = fp.y + uy * Math.min(scaleFrom, dist / 2 - 2)
            const x2 = tp.x - ux * Math.min(scaleTo + 6, dist / 2 - 2)
            const y2 = tp.y - uy * Math.min(scaleTo + 6, dist / 2 - 2)

            // Slight curve for self-loops or parallel edges
            const isSelf = t.from === t.to
            const mx = (x1 + x2) / 2 - uy * 18
            const my = (y1 + y2) / 2 + ux * 18

            return (
              <g key={i}>
                {isSelf ? (
                  <path d={`M${fp.x - 12},${fp.y - BOX_H / 2} C${fp.x - 30},${fp.y - 70} ${fp.x + 30},${fp.y - 70} ${fp.x + 12},${fp.y - BOX_H / 2}`}
                    stroke={color} strokeWidth={active ? 2 : 1} fill="none"
                    strokeOpacity={active ? 1 : 0.55} markerEnd={`url(#arr-${i})`} />
                ) : (
                  <path d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`}
                    stroke={color} strokeWidth={active ? 2 : 1} fill="none"
                    strokeOpacity={active ? 1 : 0.55} markerEnd={`url(#arr-${i})`} />
                )}
                {t.label && (
                  <text x={(x1 + x2) / 2 - uy * 22} y={(y1 + y2) / 2 + ux * 22 - 2}
                    textAnchor="middle" fill={color} fontSize={8} fontFamily="monospace"
                    opacity={active ? 1 : 0.7}>
                    {t.label}
                  </text>
                )}
              </g>
            )
          })}

          {/* State boxes */}
          {states.map((state, i) => {
            const pos      = positions[i]
            const isActive = state.id === activeState

            return (
              <g key={state.id} transform={`translate(${pos.x - BOX_W / 2},${pos.y - BOX_H / 2})`}>
                <motion.rect
                  width={BOX_W} height={BOX_H} rx={8}
                  animate={{
                    fill:   isActive ? 'rgba(59,130,246,0.20)' : '#1c1c22',
                    stroke: isActive ? '#3b82f6' : '#374151',
                  }}
                  transition={{ duration: 0.3 }}
                  strokeWidth={2}
                />
                <text x={BOX_W / 2} y={state.sub ? BOX_H / 2 - 7 : BOX_H / 2 + 4}
                  textAnchor="middle"
                  fill={isActive ? '#93c5fd' : '#9ca3af'}
                  fontSize={11} fontFamily="Inter,sans-serif" fontWeight="700">
                  {state.label}
                </text>
                {state.sub && (
                  <text x={BOX_W / 2} y={BOX_H / 2 + 9}
                    textAnchor="middle"
                    fill={isActive ? '#60a5fa' : '#4b5563'}
                    fontSize={8} fontFamily="monospace">
                    {state.sub}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      <StepControls
        step={idx} totalSteps={steps.length} playing={playing} speed={speed}
        annotation={cur?.annotation}
        onPrev={() => { setPlaying(false); setIdx(i => Math.max(0, i - 1)) }}
        onNext={() => { setPlaying(false); setIdx(i => Math.min(steps.length - 1, i + 1)) }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onReset={handleReset}
        onSpeedChange={setSpeed}
      />
    </div>
  )
}
