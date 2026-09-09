import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import Editor from '@monaco-editor/react'
import { runPython, getPyodideStatus, subscribePyodideStatus } from '../utils/pyodide.js'
import { useProgressStore } from '../store/progressStore.js'
import mathTricks from '../data/mathTricks/index.js'
import SEO from '../components/ui/SEO.jsx'

// ─── Category colours ─────────────────────────────────────────────────────────
const CAT_BADGE = {
  'Number Theory':           'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'Geometry & Fractals':     'bg-violet-500/15 text-violet-400 border-violet-500/30',
  'Probability & Statistics':'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'Linear Algebra':          'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Calculus':                'bg-rose-500/15 text-rose-400 border-rose-500/30',
}

const DIFF_BADGE = {
  beginner:     'bg-green-500/10 text-green-400 border-green-500/20',
  intermediate: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  advanced:     'bg-red-500/10 text-red-400 border-red-500/20',
}

const TYPE_LABEL = {
  animated:    { icon: '▶', label: 'Animated',    color: 'text-amber-400' },
  interactive: { icon: '◎', label: 'Interactive', color: 'text-teal-400'  },
  static:      { icon: '◆', label: 'Static',      color: 'text-gray-400'  },
}

// ─── Parse IMG: lines from Python stdout ─────────────────────────────────────
function parseFrames(stdout) {
  return stdout
    .split('\n')
    .filter(line => line.startsWith('IMG:'))
    .map(line => line.slice(4).trim())
    .filter(Boolean)
}

// ─── Build injected code for interactive tricks ───────────────────────────────
function buildCode(trick, sliderValues) {
  if (trick.visualization_type !== 'interactive') return trick.python_code
  const assignments = trick.interactive_config.sliders
    .map(s => `${s.id} = ${sliderValues[s.id] ?? s.default}`)
    .join('\n')
  return assignments + '\n' + trick.python_code
}

// ─── Monaco theme setup ───────────────────────────────────────────────────────
function beforeMount(monaco) {
  if (!monaco.editor.getModel('lbf-math-dark')) {
    monaco.editor.defineTheme('lbf-math-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6b7280' },
        { token: 'keyword', foreground: '60a5fa' },
        { token: 'string',  foreground: '86efac' },
        { token: 'number',  foreground: 'fde68a' },
      ],
      colors: {
        'editor.background':              '#0a0a0f',
        'editor.lineHighlightBackground': '#1c1c22',
        'editorLineNumber.foreground':    '#4b5563',
      },
    })
  }
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function MathTrick() {
  const { slug } = useParams()
  const navigate  = useNavigate()
  const incrementInteractions = useProgressStore(s => s.incrementInteractions)

  const trick = mathTricks.find(t => t.slug === slug)

  // Increment interaction on mount
  useEffect(() => {
    if (trick) incrementInteractions()
  }, [trick, incrementInteractions])

  if (!trick) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
        Trick not found.{' '}
        <Link to="/math" className="text-violet-400 hover:underline ml-1">Browse all →</Link>
      </div>
    )
  }

  const metaDesc = trick.tagline
    ? `${trick.tagline} — ${trick.category} concept on Learn Blazingly Fast.`
    : `Explore ${trick.title} interactively on Learn Blazingly Fast.`

  return (
    <>
    <SEO
      title={`${trick.title} — Learn Blazingly Fast`}
      description={metaDesc}
      url={`https://learnblazinglyfast.tech/math/${slug}`}
      type="article"
    />
    <div className="min-h-screen bg-[#0d0d0f] flex flex-col lg:flex-row">
      <LeftPanel trick={trick} />
      <RightPanel trick={trick} navigate={navigate} />
    </div>
    </>
  )
}

// ─── Left panel (40%) ────────────────────────────────────────────────────────
function LeftPanel({ trick }) {
  const catBadge  = CAT_BADGE[trick.category] ?? 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  const diffBadge = DIFF_BADGE[trick.difficulty] ?? ''

  return (
    <div className="lg:w-[40%] lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto border-r border-surface-700/50 px-6 py-8 sm:px-8 space-y-6">

      {/* Back */}
      <Link to="/math" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
        ← Math Tricks
      </Link>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border ${catBadge}`}>
          {trick.category}
        </span>
        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${diffBadge}`}>
          {trick.difficulty}
        </span>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight mb-2">
          {trick.title}
        </h1>
        {/* The Trick */}
        <p className="text-base text-gray-300 font-medium leading-relaxed">
          {trick.tagline}
        </p>
      </div>

      {/* Explanation */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Explanation</h2>
        <div className="space-y-3 text-sm text-gray-300 leading-relaxed">
          {trick.explanation.split('\n').filter(Boolean).map((para, i) => (
            <p key={i}>{para.trim()}</p>
          ))}
        </div>
      </div>

      {/* Why it's beautiful */}
      <div>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Why it's beautiful</h2>
        <blockquote className="border-l-2 border-violet-500/50 pl-4 italic text-sm text-gray-400 leading-relaxed">
          {trick.wow_factor}
        </blockquote>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {trick.tags.map(tag => (
          <span key={tag} className="text-[10px] text-gray-600 bg-surface-800 border border-surface-700 px-2 py-0.5 rounded-full">
            #{tag}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Right panel (60%) ───────────────────────────────────────────────────────
function RightPanel({ trick, navigate }) {
  const [pyStatus, setPyStatus] = useState(getPyodideStatus())
  const [frames,   setFrames]   = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error,    setError]    = useState(null)
  const [copied,   setCopied]   = useState(false)

  // Slider state (interactive)
  const [sliderValues, setSliderValues] = useState(() => {
    if (trick.visualization_type !== 'interactive') return {}
    return Object.fromEntries(
      trick.interactive_config.sliders.map(s => [s.id, s.default])
    )
  })

  // Animated flipbook state
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying,    setIsPlaying]    = useState(false)
  const playIntervalRef = useRef(null)

  // Debounce ref for interactive
  const debounceRef = useRef(null)

  // Subscribe to Pyodide status
  useEffect(() => subscribePyodideStatus(setPyStatus), [])

  // ── Execute Python ──
  const execute = useCallback(async (codeToRun) => {
    setIsLoading(true)
    setError(null)

    try {
      const { stdout, stderr, error: execError } = await runPython(codeToRun)

      if (execError) {
        setError(execError)
        setFrames([])
        return
      }
      if (stderr && !stdout.includes('IMG:')) {
        setError(stderr)
        setFrames([])
        return
      }

      const parsed = parseFrames(stdout)
      if (parsed.length === 0) {
        setError(stderr || 'No image output. Make sure the code prints "IMG:" + base64.')
        setFrames([])
        return
      }

      setFrames(parsed)
      setCurrentFrame(0)
      setIsPlaying(false)
    } catch (err) {
      setError(err.message)
      setFrames([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ── Initial run ──
  useEffect(() => {
    const code = buildCode(trick, sliderValues)
    execute(code)
    // Stop any existing flipbook
    clearInterval(playIntervalRef.current)
    setIsPlaying(false)
    setCurrentFrame(0)
  }, [trick]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Slider change → debounced re-run ──
  const handleSliderChange = (id, value) => {
    const next = { ...sliderValues, [id]: value }
    setSliderValues(next)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const code = buildCode(trick, next)
      execute(code)
    }, 800)
  }

  // ── Flipbook play/pause ──
  useEffect(() => {
    clearInterval(playIntervalRef.current)
    if (isPlaying && frames.length > 1) {
      playIntervalRef.current = setInterval(() => {
        setCurrentFrame(f => (f + 1) % frames.length)
      }, Math.round(1000 / 12)) // 12 fps
    }
    return () => clearInterval(playIntervalRef.current)
  }, [isPlaying, frames.length])

  // ── Copy code ──
  const copyCode = () => {
    navigator.clipboard.writeText(trick.python_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Run in Playground ──
  const openPlayground = () => {
    localStorage.setItem('pg_code_python', trick.python_code)
    localStorage.setItem('pg_lang', 'python')
    navigate('/playground')
  }

  const currentImage = frames[currentFrame] ?? null

  return (
    <div className="lg:w-[60%] px-4 py-8 sm:px-6 space-y-5 overflow-auto">

      {/* ── Interactive sliders ── */}
      {trick.visualization_type === 'interactive' && (
        <div className="bg-surface-800 border border-surface-700 rounded-xl p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Parameters</p>
          {trick.interactive_config.sliders.map(slider => (
            <SliderControl
              key={slider.id}
              slider={slider}
              value={sliderValues[slider.id] ?? slider.default}
              onChange={val => handleSliderChange(slider.id, val)}
            />
          ))}
        </div>
      )}

      {/* ── Visualization area ── */}
      <div className="relative bg-[#0f1117] border border-surface-700 rounded-xl overflow-hidden min-h-[300px]">

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f1117]/90 z-10 gap-3">
            <Spinner />
            <p className="text-xs text-gray-500">
              {pyStatus === 'loading' ? 'Loading Python runtime…' : 'Running visualization…'}
            </p>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="p-4">
            <pre className="text-xs text-red-400 font-mono whitespace-pre-wrap leading-relaxed">{error}</pre>
          </div>
        )}

        {/* Image output */}
        {!error && currentImage && (
          <img
            src={`data:image/png;base64,${currentImage}`}
            alt={trick.title}
            className="w-full object-contain"
          />
        )}

        {/* Empty state */}
        {!error && !currentImage && !isLoading && (
          <div className="flex items-center justify-center min-h-[300px] text-gray-700 text-sm">
            No output yet
          </div>
        )}
      </div>

      {/* ── Animated flipbook controls ── */}
      {trick.visualization_type === 'animated' && frames.length > 1 && (
        <div className="flex items-center gap-3 bg-surface-800 border border-surface-700 rounded-xl px-4 py-3">
          <button
            onClick={() => setCurrentFrame(f => (f - 1 + frames.length) % frames.length)}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-700 hover:bg-surface-600 text-gray-300 transition-colors text-xs"
            title="Previous frame"
          >
            ‹
          </button>

          <button
            onClick={() => setIsPlaying(p => !p)}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-700 hover:bg-surface-600 text-gray-300 transition-colors"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <button
            onClick={() => setCurrentFrame(f => (f + 1) % frames.length)}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-700 hover:bg-surface-600 text-gray-300 transition-colors text-xs"
            title="Next frame"
          >
            ›
          </button>

          {/* Frame progress */}
          <div className="flex-1 h-1 bg-surface-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500/70 rounded-full transition-all duration-75"
              style={{ width: `${((currentFrame + 1) / frames.length) * 100}%` }}
            />
          </div>

          <span className="text-[10px] text-gray-500 tabular-nums">
            {currentFrame + 1}/{frames.length}
          </span>
        </div>
      )}

      {/* ── Static regenerate button ── */}
      {trick.visualization_type === 'static' && (
        <button
          onClick={() => execute(trick.python_code)}
          disabled={isLoading}
          className="px-4 py-2 bg-surface-700 hover:bg-surface-600 border border-surface-600 text-gray-300 text-sm rounded-lg transition-colors disabled:opacity-50"
        >
          ↻ Regenerate
        </button>
      )}

      {/* ── Action buttons ── */}
      <div className="flex gap-2">
        <button
          onClick={openPlayground}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          <ZapIcon className="w-3.5 h-3.5" />
          Run in Playground
        </button>
      </div>

      {/* ── Python code viewer ── */}
      <div className="bg-[#0a0a0f] border border-surface-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-700/50">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <PythonIcon className="w-3.5 h-3.5 text-blue-400" />
            Python · Pyodide
          </div>
          <button
            onClick={copyCode}
            className="text-[10px] font-medium text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
          >
            {copied ? '✓ Copied' : '⧉ Copy'}
          </button>
        </div>
        <Editor
          height="320px"
          defaultLanguage="python"
          value={trick.python_code}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            renderLineHighlight: 'none',
            scrollbar: { verticalScrollbarSize: 4 },
          }}
          theme="lbf-math-dark"
          beforeMount={beforeMount}
        />
      </div>
    </div>
  )
}

// ─── Slider control ───────────────────────────────────────────────────────────
function SliderControl({ slider, value, onChange }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-400">{slider.label}</label>
        <span className="text-xs font-mono text-gray-300 tabular-nums">{value}</span>
      </div>
      <input
        type="range"
        min={slider.min}
        max={slider.max}
        step={slider.step ?? 1}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 accent-violet-500 cursor-pointer"
      />
      <div className="flex justify-between text-[10px] text-gray-600">
        <span>{slider.min}</span>
        <span>{slider.max}</span>
      </div>
    </div>
  )
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin w-6 h-6 text-violet-500" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function ZapIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 1L3 9h5.5L6.5 15 14 7H8.5L9.5 1z"/>
    </svg>
  )
}

function PythonIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3C7 3 7 6 7 6v3h5v1H5S2 10 2 14s3 4 3 4h2v-3s0-3 3-3h5s3 0 3-3V6s0-3-4-3z"/>
      <path d="M12 21c5 0 5-3 5-3v-3h-5v-1h7s3 0 3-4-3-4-3-4h-2v3s0 3-3 3H9s-3 0-3 3v3s0 3 4 3z"/>
    </svg>
  )
}
