import { useState, useRef, useCallback, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  initPyodide,
  runPython,
  getPyodideStatus,
  subscribePyodideStatus,
} from '../../utils/pyodide.js'
import { LightbulbIcon, FrownIcon, MehIcon, SmileIcon } from '../ui/Icons.jsx'
import { monacoBeforeMount, EDITOR_OPTIONS } from '../../utils/monacoConfig.js'

// ─── static term-matching fallback ────────────────────────────────────────────

function countBlanks(code) {
  return (code.match(/___________/g) ?? []).length
}

function termValidate(userCode, solution) {
  const expected = solution
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('//'))
    .map((l) => (l.includes(' = ') ? l.slice(l.indexOf(' = ') + 3).trim() : l))

  const userLines = userCode.split('\n').map((l) => l.replace(/\s+/g, ' ').trim())
  const missing   = expected.filter(
    (t) => !userLines.some((ul) => ul.includes(t.replace(/\s+/g, ' ')))
  )
  return { passed: missing.length === 0, missing }
}

// ─── component ────────────────────────────────────────────────────────────────

const MAX_AI_HINTS = 3

export default function FillInBlank({ exercise, concept, domain = 'DSA', onPass, onFail, onConfidence }) {
  const [code,            setCode]            = useState(exercise.starter_code)
  const [execResult,      setExecResult]      = useState(null)   // { stdout, stderr, error, passed }
  const [pyStatus,        setPyStatus]        = useState(getPyodideStatus)
  const [isRunning,       setIsRunning]       = useState(false)
  const [hintsShown,      setHintsShown]      = useState(0)
  const [aiHints,         setAiHints]         = useState([])     // AI-generated hints
  const [hintLoading,     setHintLoading]     = useState(false)
  const [solutionVisible, setSolutionVisible] = useState(false)
  const [confidence,      setConfidence]      = useState(null)
  const editorRef = useRef(null)

  // Sync pyodide global status → local state
  useEffect(() => subscribePyodideStatus(setPyStatus), [])

  const runAccent  = domain === 'DSA' ? 'bg-dsa-600 hover:bg-dsa-500' : 'bg-ml-500 hover:bg-ml-400'
  const hintAccent = domain === 'DSA' ? 'border-dsa-500' : 'border-ml-500'
  const staticHints    = exercise.hints ?? []
  const totalHints     = staticHints.length
  const blanksInStarter = countBlanks(exercise.starter_code)
  const lineCount      = exercise.starter_code.split('\n').length
  const editorHeight   = Math.max(200, Math.min(540, lineCount * 22 + 28))

  // ── Run handler ─────────────────────────────────────────────────────────────

  const handleRun = useCallback(async () => {
    // 1. Pre-flight: check for unfilled blanks
    if (countBlanks(code) > 0) {
      const n = countBlanks(code)
      setExecResult({
        stdout: '', stderr: '',
        error: `${n} blank${n > 1 ? 's' : ''} still unfilled — replace every ___________ before running.`,
        passed: false,
      })
      return
    }

    setIsRunning(true)
    setExecResult(null)

    // 2. Load Pyodide on first run (lazy)
    if (pyStatus === 'idle') {
      try { await initPyodide() }
      catch (err) {
        setIsRunning(false)
        setExecResult({ stdout: '', stderr: '', error: `Failed to load Python runtime:\n${err.message}`, passed: false })
        return
      }
    }

    // 3. Build execution payload: user code + test harness
    const fullCode = exercise.test_code
      ? `${code}\n\n# ── test harness ──\n${exercise.test_code}`
      : code

    // 4. Execute in sandbox
    const { stdout, stderr, error } = await runPython(fullCode)
    setIsRunning(false)

    // 5. Determine pass/fail
    //    Primary:  test harness printed "PASS" and no Python exception
    //    Fallback: term-matching (if no test_code or test_code didn't print PASS)
    let passed = false
    if (!error) {
      if (stdout.trim().includes('PASS')) {
        passed = true
      } else {
        // Fallback: static term validation
        passed = termValidate(code, exercise.solution).passed
      }
    }

    const result = { stdout, stderr, error, passed }
    setExecResult(result)

    if (passed) { if (onPass) onPass() }
    else        { if (onFail) onFail() }
  }, [code, exercise, pyStatus, onPass, onFail])

  const handleHint = useCallback(async () => {
    // Show next static hint if available
    if (hintsShown < totalHints) {
      setHintsShown((n) => n + 1)
      return
    }

    // All static hints exhausted — call AI
    if (aiHints.length >= MAX_AI_HINTS || hintLoading) return

    setHintLoading(true)

    const conceptTitle = concept?.title ?? exercise.prompt
    const systemPrompt =
      `You are a concise CS tutor helping a student with a coding exercise. ` +
      `Give ONE short hint (2-3 sentences max) that guides them toward the solution without giving it away. ` +
      `Be specific to the concept: ${conceptTitle}.`

    const userPrompt =
      `Exercise: ${exercise.prompt}\n\n` +
      `Student's current code:\n${code}\n\n` +
      `They've already seen these hints:\n` +
      staticHints.map((h, i) => `${i + 1}. ${h}`).join('\n') +
      (aiHints.length > 0 ? `\nAI hints already given:\n` + aiHints.map((h, i) => `${i + 1}. ${h}`).join('\n') : '') +
      `\n\nProvide the next hint.`

    try {
      const res = await fetch('/api/hint', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 256,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()
      const text = data?.content?.[0]?.text?.trim()
      if (!text) throw new Error('Empty response')

      setAiHints((prev) => [...prev, text])
    } catch {
      setAiHints((prev) => [...prev, "Couldn't load hint — check your connection."])
    } finally {
      setHintLoading(false)
    }
  }, [hintsShown, totalHints, aiHints, hintLoading, concept, exercise, code, staticHints])

  const handleCodeChange = useCallback((val) => {
    setCode(val ?? '')
    if (execResult) setExecResult(null)
  }, [execResult])

  // ── Run button label / state ─────────────────────────────────────────────────

  const runBusy   = isRunning || pyStatus === 'loading'
  const runLabel  =
    isRunning         ? 'Running…'
    : pyStatus === 'loading' ? 'Loading Python…'
    : '▶  Run'

  return (
    <div className="space-y-4">
      {/* Prompt */}
      <p className="text-gray-300 text-sm leading-relaxed">{exercise.prompt}</p>

      {/* Blank counter */}
      {blanksInStarter > 0 && (
        <p className="text-xs text-gray-400 font-mono">
          {blanksInStarter} blank{blanksInStarter > 1 ? 's' : ''} to fill
          {' '}(<code className="text-gray-400">___________</code>)
        </p>
      )}

      {/* Monaco Editor */}
      <div className={`rounded-lg overflow-hidden border transition-shadow ${
        isRunning
          ? 'border-dsa-500/60 shadow-[0_0_0_1px_rgba(96,165,250,0.25)]'
          : 'border-surface-600 focus-within:border-surface-500'
      }`}>
        <Editor
          height={editorHeight}
          language="python"
          theme="lbf-dark"
          value={code}
          onChange={handleCodeChange}
          onMount={(ed) => { editorRef.current = ed }}
          beforeMount={monacoBeforeMount}
          options={EDITOR_OPTIONS}
          loading={
            <div
              className="flex items-center justify-center bg-surface-900 text-gray-400 text-sm font-mono"
              style={{ height: editorHeight }}
            >
              Loading editor…
            </div>
          }
        />
      </div>

      {/* Action row */}
      <div className="flex items-center flex-wrap gap-2">
        <button
          onClick={handleRun}
          disabled={runBusy}
          className={`flex items-center gap-2 px-4 py-1.5 rounded font-medium text-sm text-white transition-all
            ${runBusy ? 'opacity-70 cursor-not-allowed' : ''} ${runAccent}`}
        >
          {isRunning && <Spinner />}
          {runLabel}
        </button>

        <button
          onClick={handleHint}
          disabled={hintLoading || aiHints.length >= MAX_AI_HINTS}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded border border-surface-500 text-gray-300 hover:bg-surface-700 text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {hintLoading && <Spinner />}
          {hintLoading
            ? 'Thinking…'
            : hintsShown < totalHints
              ? `Hint${hintsShown > 0 ? ` (${hintsShown}/${totalHints})` : ''}`
              : aiHints.length < MAX_AI_HINTS
                ? `AI Hint${aiHints.length > 0 ? ` (${aiHints.length}/${MAX_AI_HINTS})` : ''}`
                : 'No more hints'}
        </button>

        <button
          onClick={() => setSolutionVisible((v) => !v)}
          className="px-4 py-1.5 rounded border border-surface-500 text-gray-400 hover:bg-surface-700 text-sm transition-colors"
        >
          {solutionVisible ? 'Hide solution' : 'Solution'}
        </button>

        {/* Pass/fail badge */}
        <AnimatePresence mode="wait">
          {execResult && (
            <motion.span
              key={execResult.passed ? 'pass' : 'fail'}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className={`ml-auto flex items-center gap-1.5 text-sm font-semibold ${
                execResult.passed ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {execResult.passed ? '✓ Tests passed' : '✗ Tests failed'}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* ── Terminal output panel ── */}
      <AnimatePresence>
        {execResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <TerminalPanel result={execResult} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pyodide first-load notice ── */}
      <AnimatePresence>
        {pyStatus === 'loading' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-xs text-gray-400 font-mono"
          >
            <Spinner className="text-dsa-400" />
            Loading Python runtime (first run ~3–5 s on fast connection)…
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hints ── */}
      <AnimatePresence>
        {(hintsShown > 0 || aiHints.length > 0 || hintLoading) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            {/* Static hints */}
            {staticHints.slice(0, hintsShown).map((hint, i) => (
              <div
                key={`static-${i}`}
                className={`flex gap-2 px-3 py-2.5 rounded bg-surface-700 border-l-2 ${hintAccent} text-sm text-gray-300 leading-snug`}
              >
                <span className="shrink-0 pt-0.5"><LightbulbIcon className="w-4 h-4 text-yellow-400" /></span>
                {hint}
              </div>
            ))}

            {/* AI hints */}
            {aiHints.map((hint, i) => (
              <motion.div
                key={`ai-${i}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2 px-3 py-2.5 rounded bg-surface-800 border-l-2 ${hintAccent} text-sm text-gray-300 leading-snug`}
              >
                <span className="shrink-0 text-dsa-400 font-semibold select-none">✦</span>
                {hint}
              </motion.div>
            ))}

            {/* Loading indicator */}
            {hintLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`flex gap-2 px-3 py-2.5 rounded bg-surface-800 border-l-2 ${hintAccent} text-sm text-gray-500 leading-snug italic`}
              >
                <Spinner className="text-dsa-400 shrink-0 mt-0.5" />
                Thinking…
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Solution ── */}
      <AnimatePresence>
        {solutionVisible && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Solution</p>
            <pre className="text-xs font-mono bg-surface-900 border border-surface-600 rounded p-4 text-green-300 leading-relaxed overflow-x-auto scrollbar-thin">
              {exercise.solution}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Confidence self-report ── */}
      <AnimatePresence>
        {execResult?.passed && !confidence && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 pt-1 flex-wrap"
          >
            <span className="text-xs text-gray-400">How solid does this feel?</span>
            {[
              { level: 1, label: 'Shaky',        emoji: <FrownIcon className="w-3.5 h-3.5 text-red-400" /> },
              { level: 2, label: 'Getting there', emoji: <MehIcon className="w-3.5 h-3.5 text-yellow-400" /> },
              { level: 3, label: 'Got it',        emoji: <SmileIcon className="w-3.5 h-3.5 text-green-400" /> },
            ].map(({ level, label, emoji }) => (
              <button
                key={level}
                onClick={() => { setConfidence(level); if (onConfidence) onConfidence(level) }}
                className="px-2.5 py-1 rounded border border-surface-500 text-xs text-gray-300 hover:bg-surface-700 hover:border-surface-400 transition-colors flex items-center gap-1"
              >
                {emoji} {label}
              </button>
            ))}
          </motion.div>
        )}
        {execResult?.passed && confidence && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-gray-400">
            Confidence logged. Move on to the next concept →
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── TerminalPanel ────────────────────────────────────────────────────────────

function TerminalPanel({ result }) {
  const { stdout, stderr, error, passed } = result
  const hasOutput = stdout || stderr || error

  return (
    <div className="rounded-lg border border-surface-600 bg-[#0a0a0c] overflow-hidden">
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-800 border-b border-surface-700">
        <span className={`w-2 h-2 rounded-full ${passed ? 'bg-green-500' : error ? 'bg-red-500' : 'bg-yellow-500'}`} />
        <span className="text-xs text-gray-400 font-mono">output</span>
        {passed && <span className="ml-auto text-xs text-green-400 font-mono font-medium">PASS</span>}
      </div>

      <div className="px-4 py-3 font-mono text-xs leading-relaxed max-h-48 overflow-y-auto scrollbar-thin space-y-1">
        {/* stdout */}
        {stdout && stdout.trim() && (
          <pre className="text-green-300 whitespace-pre-wrap">{stdout.trimEnd()}</pre>
        )}

        {/* stderr */}
        {stderr && stderr.trim() && (
          <pre className="text-yellow-300/80 whitespace-pre-wrap">{stderr.trimEnd()}</pre>
        )}

        {/* Python/runtime error */}
        {error && (
          <pre className="text-red-400 whitespace-pre-wrap">{error}</pre>
        )}

        {/* No output at all */}
        {!hasOutput && (
          <span className="text-gray-400 italic">No output.</span>
        )}
      </div>
    </div>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ className = '' }) {
  return (
    <svg
      className={`w-3.5 h-3.5 animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  )
}
