/* eslint-disable */
/**
 * Classic Web Worker for Pyodide Python execution.
 * Placed in /public so it is served as-is (no bundling).
 * Loaded via:  new Worker('/pyodide.worker.js')
 */

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js'

let pyodide = null

// ─── init ──────────────────────────────────────────────────────────────────

async function initPyodide() {
  importScripts(PYODIDE_CDN)
  pyodide = await loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
  })
  // Pre-load packages needed for math visualizations
  await pyodide.loadPackage(['numpy', 'matplotlib'])
  // Pre-warm: set up stdout/stderr redirect helpers + matplotlib Agg backend + font cache
  pyodide.runPython(`
import sys
from io import StringIO as _StringIO
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
_f, _a = plt.subplots(figsize=(1, 1))
plt.close(_f)
`)
  self.postMessage({ type: 'ready' })
}

// ─── run ───────────────────────────────────────────────────────────────────

async function runCode(code, id) {
  // Redirect stdout/stderr before each run
  pyodide.runPython(`
_al_out = _StringIO()
_al_err = _StringIO()
_al_prev_out = sys.stdout
_al_prev_err = sys.stderr
sys.stdout = _al_out
sys.stderr = _al_err
`)

  let jsError = null
  try {
    await pyodide.runPythonAsync(code)
  } catch (err) {
    jsError = cleanPythonError(err.message)
  }

  // Capture and restore
  let stdout = ''
  let stderr = ''
  try {
    stdout = pyodide.runPython('_al_out.getvalue()')
    stderr = pyodide.runPython('_al_err.getvalue()')
    pyodide.runPython('sys.stdout = _al_prev_out\nsys.stderr = _al_prev_err')
  } catch (_) {
    // If pyodide state is broken, swallow
  }

  self.postMessage({ type: 'result', id, stdout, stderr, error: jsError })
}

// ─── error cleaning ────────────────────────────────────────────────────────

function cleanPythonError(msg) {
  if (!msg) return ''
  const lines = msg.split('\n')
  const start = lines.findIndex(
    (l) => l.trim().startsWith('Traceback') || /^\w+(Error|Exception|Warning):/.test(l.trim())
  )
  if (start >= 0) {
    return lines
      .slice(start)
      .filter((l) => !l.startsWith('  at ')) // strip JS stack frames
      .join('\n')
      .trim()
  }
  return lines.filter((l) => !l.startsWith('  at ')).join('\n').trim()
}

// ─── message handler ───────────────────────────────────────────────────────

self.onmessage = function (e) {
  const { type, code, id } = e.data
  if (type === 'run') {
    runCode(code, id)
  }
}

// Auto-init on worker creation
initPyodide().catch((err) => {
  self.postMessage({ type: 'init_error', message: String(err) })
})
