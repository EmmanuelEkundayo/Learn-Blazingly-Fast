import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import StepControls from './StepControls.jsx'
import { useInterval } from '../../hooks/useInterval.js'

const SPEED_MS = { 0.5: 2000, 1: 1000, 1.5: 667, 2: 500, 3: 333 }

const PALETTE = [
  { bg: 'rgba(59,130,246,0.13)',  border: '#3b82f6', text: '#93c5fd',  item: 'rgba(59,130,246,0.08)'  },
  { bg: 'rgba(139,92,246,0.13)', border: '#8b5cf6', text: '#c4b5fd',  item: 'rgba(139,92,246,0.08)' },
  { bg: 'rgba(16,185,129,0.13)', border: '#10b981', text: '#6ee7b7',  item: 'rgba(16,185,129,0.08)' },
  { bg: 'rgba(245,158,11,0.13)', border: '#f59e0b', text: '#fcd34d',  item: 'rgba(245,158,11,0.08)' },
  { bg: 'rgba(239,68,68,0.13)',  border: '#ef4444', text: '#fca5a5',  item: 'rgba(239,68,68,0.08)'  },
  { bg: 'rgba(236,72,153,0.13)', border: '#ec4899', text: '#f9a8d4',  item: 'rgba(236,72,153,0.08)' },
]

// ─── Preset Architecture Configurations ──────────────────────────────────────
const ARCH_PRESETS = {
  'split-chunking-optimization': {
    layers: [
      { label: 'Entry Chunks', items: ['main.js (35KB)', 'runtime.js'] },
      { label: 'Route Chunks', items: ['home.chunk.js', 'dash.chunk.js', 'auth.chunk.js'] },
      { label: 'Lazy Components', items: ['HeavyChart.chunk.js', 'RichEditor.chunk.js'] },
      { label: 'Vendor Split', items: ['react-vendor.js', 'lodash.chunk.js'] },
    ],
    steps: [
      { active_layer: 0, annotation: 'Initial Page Load: Browser requests only main.js and entry runtime — minimal initial JS payload.' },
      { active_layer: 1, annotation: 'Route Navigation: Navigating to /dashboard dynamically fetches dash.chunk.js on-demand.' },
      { active_layer: 2, annotation: 'Lazy Component: User clicks "View Analytics" -> triggers dynamic import() for HeavyChart.' },
      { active_layer: 3, annotation: 'Long-Term Caching: Vendor chunk hashes stay immutable across builds; browser cache hits 100%.' },
    ],
  },
  'bundle-splitting-graph': {
    layers: [
      { label: 'App Shell', items: ['App.jsx', 'Navbar / Footer'] },
      { label: 'Suspense Boundary', items: ['<Suspense fallback>', 'Error Boundary'] },
      { label: 'Dynamic Import', items: ['React.lazy(() => import())', 'Prefetch Hook'] },
      { label: 'Split Output', items: ['feature.chunk.js', 'shared-ui.chunk.js'] },
    ],
    steps: [
      { active_layer: 0, annotation: 'App Shell: Lightweight container renders immediately with navigation and footer.' },
      { active_layer: 1, annotation: 'Suspense: Wraps lazy component with skeleton fallback while bundle downloads.' },
      { active_layer: 2, annotation: 'Dynamic Import: Webpack/Vite generates separate chunk and loads script tag.' },
      { active_layer: 3, annotation: 'Resolved Module: Chunk downloaded, parsed, and swapped into view seamlessly.' },
    ],
  },
  'treemap-visualization': {
    layers: [
      { label: 'Raw Bundle', items: ['bundle.js (1.8MB)', 'node_modules (78%)'] },
      { label: 'Analyzer Pass', items: ['Stat Size (disk)', 'Parsed Size (JS engine)', 'Gzip Size (wire)'] },
      { label: 'Bloat Detection', items: ['moment.js locales', 'duplicate lodash', 'unused exports'] },
      { label: 'Optimized Output', items: ['app.min.js (140KB)', 'vendor.min.js (210KB)'] },
    ],
    steps: [
      { active_layer: 0, annotation: 'Unanalyzed Bundle: Monolithic bundle containing unnoticed duplicate and bloated dependencies.' },
      { active_layer: 1, annotation: 'Analyzer Inspection: Visual treemap exposes exact bytes contributed by each package.' },
      { active_layer: 2, annotation: 'Bloat Identified: Discovered unused heavy locales, duplicate versions, and missed tree-shaking.' },
      { active_layer: 3, annotation: 'Optimized Build: Replaced bloated packages with modular ESM equivalents; bundle size slashed.' },
    ],
  },
  'bundler-graph-traversal': {
    layers: [
      { label: 'Entry Point', items: ['src/index.js', 'imports crawl'] },
      { label: 'AST Parser', items: ['Babel / SWC', 'Dependency Specifiers'] },
      { label: 'Module Graph', items: ['Dependency DAG', 'Circular Check', 'Topological Sort'] },
      { label: 'Chunk Emission', items: ['Tree-shaking', 'Terser Minify', 'dist/assets/*.js'] },
    ],
    steps: [
      { active_layer: 0, annotation: 'Entry Resolution: Bundler reads entry file specified in configuration.' },
      { active_layer: 1, annotation: 'AST Parsing: Parses source code to find all import and require statements.' },
      { active_layer: 2, annotation: 'Dependency Graph: Recursively builds DAG of all modules and checks for cycles.' },
      { active_layer: 3, annotation: 'Optimization & Emission: Dead code stripped, modules concatenated and emitted as chunks.' },
    ],
  },
  'critical-rendering-path': {
    layers: [
      { label: 'HTML Parse', items: ['Bytes → Tokens', 'DOM Tree'] },
      { label: 'CSS Parse', items: ['Style Rules', 'CSSOM Tree (blocking)'] },
      { label: 'Render Tree', items: ['Computed Styles', 'Visible Nodes'] },
      { label: 'Layout & Paint', items: ['Geometry (Reflow)', 'Rasterize Pixels', 'GPU Composite'] },
    ],
    steps: [
      { active_layer: 0, annotation: 'DOM Construction: Browser parses HTML stream incrementally into DOM nodes.' },
      { active_layer: 1, annotation: 'CSSOM Construction: External and inline CSS parsed into CSSOM — blocks rendering.' },
      { active_layer: 2, annotation: 'Render Tree: DOM and CSSOM merged to identify exactly what is visible on screen.' },
      { active_layer: 3, annotation: 'Layout & Composite: Geometry calculated, pixels rasterized, and composited by GPU.' },
    ],
  },
}

function resolveArchConfig(config) {
  // 1. Explicit layers array
  if (Array.isArray(config.layers) && config.layers.length > 0) {
    return {
      layers: config.layers,
      steps: Array.isArray(config.steps) && config.steps.length > 0
        ? config.steps
        : config.layers.map((_, i) => ({ active_layer: i, annotation: `Layer ${i + 1} active.` })),
    }
  }

  // 2. Preset mode match
  if (config.mode && ARCH_PRESETS[config.mode]) {
    return ARCH_PRESETS[config.mode]
  }

  // 3. Config with steps having label/sub (e.g. CAP theorem, CQRS, etc.)
  if (Array.isArray(config.steps) && config.steps.length > 0 && config.steps[0].label) {
    const layers = config.steps.map((s, i) => ({
      label: s.label || `Stage ${i + 1}`,
      items: s.sub ? [s.sub] : [s.label || `Step ${i + 1}`],
    }))
    const steps = config.steps.map((s, i) => ({
      active_layer: i,
      annotation: s.annotation || `${s.label} (${s.sub || ''})`,
    }))
    return { layers, steps }
  }

  // 4. Numeric layers (e.g. layers: 5 in business-logic concepts)
  if (typeof config.layers === 'number') {
    const defaultTiers = [
      { label: 'Client / UI', items: ['Web Browser', 'Mobile Client', 'SPA View'] },
      { label: 'API Gateway', items: ['Reverse Proxy', 'Rate Limiter', 'Auth Filter'] },
      { label: 'App Services', items: ['Domain Logic', 'Workflow Engine', 'Command Bus'] },
      { label: 'Cache Tier', items: ['Redis Cache', 'Session Store', 'Read Replicas'] },
      { label: 'Data Store', items: ['Primary Database', 'Write Ahead Log', 'Blob Store'] },
      { label: 'Event Broker', items: ['Message Queue', 'Kafka / RabbitMQ', 'Event Stream'] },
    ]
    const count = Math.min(Math.max(2, config.layers), defaultTiers.length)
    const layers = defaultTiers.slice(0, count)
    const steps = layers.map((l, i) => ({
      active_layer: i,
      annotation: `${l.label} processing: handles incoming execution for this architectural tier.`,
    }))
    return { layers, steps }
  }

  // 5. General fallback: standard 4-tier web architecture
  return {
    layers: [
      { label: 'Client Layer', items: ['Single Page App', 'Browser Cache'] },
      { label: 'Gateway Layer', items: ['API Gateway', 'Load Balancer'] },
      { label: 'Service Layer', items: ['Business Logic', 'Microservices'] },
      { label: 'Data Layer', items: ['Database', 'Distributed Cache'] },
    ],
    steps: [
      { active_layer: 0, annotation: 'Client Layer initiates request with state and query parameters.' },
      { active_layer: 1, annotation: 'Gateway routes request, validates auth headers, and checks rate limits.' },
      { active_layer: 2, annotation: 'Service Layer processes business rules and coordinates state updates.' },
      { active_layer: 3, annotation: 'Data Layer persists transaction and updates cache entries.' },
    ],
  }
}

export default function ArchDiagram({ config = {} }) {
  const { layers, steps } = resolveArchConfig(config)

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-surface-600 bg-surface-800 p-4 overflow-x-auto">
        <div className="flex items-start gap-0 min-w-max">
          {layers.map((layer, li) => {
            const isActive = activeLayer === li
            const c = PALETTE[li % PALETTE.length]

            return (
              <div key={li} className="flex items-center">
                {/* Layer column */}
                <motion.div
                  animate={{
                    borderColor:     isActive ? c.border : '#374151',
                    backgroundColor: isActive ? c.bg     : 'transparent',
                  }}
                  transition={{ duration: 0.3 }}
                  className="rounded-xl border-2 p-3 flex flex-col gap-1.5"
                  style={{ minWidth: 100 }}
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-wider text-center"
                    style={{ color: isActive ? c.text : '#6b7280' }}
                  >
                    {layer.label}
                  </p>
                  <div className="flex flex-col gap-1">
                    {(layer.items || []).map((item, ii) => (
                      <motion.div
                        key={ii}
                        animate={{
                          backgroundColor: isActive ? c.item : '#1c1c22',
                          borderColor:     isActive ? c.border + '55' : '#2d2d38',
                          color:           isActive ? '#e5e7eb' : '#4b5563',
                        }}
                        transition={{ duration: 0.3 }}
                        className="text-[10px] text-center px-2 py-1 rounded font-mono leading-tight border"
                      >
                        {item}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Flow arrow */}
                {li < layers.length - 1 && (
                  <div className="flex flex-col items-center justify-center w-7 shrink-0 mt-6">
                    <motion.span
                      animate={{ color: activeLayer === li ? '#9ca3af' : '#374151' }}
                      className="text-sm font-mono"
                    >
                      →
                    </motion.span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
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
