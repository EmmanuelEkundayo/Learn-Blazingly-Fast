import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Lightbulb, HelpCircle, ArrowRight } from 'lucide-react'
import { complexityColor } from '../../utils/complexity.js'

const COMPLEXITY_OPTIONS = [
  'O(1)',
  'O(log n)',
  'O(n)',
  'O(n log n)',
  'O(n²)',
  'O(2ⁿ)',
  'O(V + E)',
  'O(V²)',
]

export default function ComplexityQuiz({
  exercise,
  concept,
  domain = 'DSA',
  onPass,
  onFail,
  onConfidence,
}) {
  const timeTarget = exercise.time_complexity || concept?.card?.time_complexity || 'O(n)'
  const spaceTarget = exercise.space_complexity || concept?.card?.space_complexity || 'O(1)'

  // Extract base O(...) if target has extra prose (e.g. "O(V + E) with adjacency list")
  const normalizeTarget = (raw) => {
    const match = raw.match(/O\([^)]+\)/)
    return match ? match[0] : raw
  }

  const normalizedTime = normalizeTarget(timeTarget)
  const normalizedSpace = normalizeTarget(spaceTarget)

  const [selectedTime, setSelectedTime] = useState(null)
  const [selectedSpace, setSelectedSpace] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [confidence, setConfidence] = useState(null)

  const timePassed = selectedTime && (selectedTime === normalizedTime || timeTarget.includes(selectedTime))
  const spacePassed = selectedSpace && (selectedSpace === normalizedSpace || spaceTarget.includes(selectedSpace))
  const allPassed = timePassed && (exercise.require_space ? spacePassed : true)

  const handleSubmit = () => {
    if (!selectedTime) return
    setSubmitted(true)
    if (allPassed) {
      if (onPass) onPass()
    } else {
      if (onFail) onFail()
    }
  }

  const handleReset = () => {
    setSelectedTime(null)
    setSelectedSpace(null)
    setSubmitted(false)
    setConfidence(null)
  }

  const handleConfidenceSelect = (level) => {
    setConfidence(level)
    if (onConfidence) onConfidence(level)
  }

  const codeSnippet = exercise.code || exercise.prompt_code

  return (
    <div className="space-y-6">
      {/* Exercise Prompt */}
      <div className="bg-surface-800 border border-surface-600 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
              Complexity Analysis
            </span>
            <h3 className="text-lg font-bold text-white mt-1">
              {exercise.prompt || 'Determine the Time and Space Complexity for this algorithm:'}
            </h3>
          </div>
          {exercise.hints && exercise.hints.length > 0 && (
            <button
              onClick={() => setShowHint((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs font-medium hover:bg-amber-500/20 transition-all"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              {showHint ? 'Hide Hint' : 'Hint'}
            </button>
          )}
        </div>

        {/* Code Snippet if provided */}
        {codeSnippet && (
          <div className="mt-4 rounded-lg bg-surface-900 border border-surface-700 p-4 font-mono text-xs text-gray-300 overflow-x-auto">
            <pre>{codeSnippet}</pre>
          </div>
        )}

        {/* Hint Accordion */}
        <AnimatePresence>
          {showHint && exercise.hints && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 p-3.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 space-y-1"
            >
              <div className="font-semibold flex items-center gap-1.5 text-amber-400">
                <HelpCircle className="w-3.5 h-3.5" />
                Hint:
              </div>
              {exercise.hints.map((h, i) => (
                <p key={i} className="text-gray-300 pl-5">
                  • {h}
                </p>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Time Complexity Options */}
        <div className="bg-surface-800 border border-surface-600 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-300">
              Time Complexity
            </label>
            {submitted && (
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  timePassed
                    ? 'bg-green-950/60 border border-green-500/40 text-green-400'
                    : 'bg-red-950/60 border border-red-500/40 text-red-400'
                }`}
              >
                {timePassed ? 'Correct' : 'Incorrect'}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {COMPLEXITY_OPTIONS.map((opt) => {
              const isSelected = selectedTime === opt
              let btnClass = 'bg-surface-700 border-surface-600 text-gray-300 hover:border-surface-400'
              if (isSelected) {
                btnClass = 'bg-blue-600/30 border-blue-500 text-blue-300 font-semibold shadow-sm'
              }
              if (submitted) {
                if (opt === normalizedTime) {
                  btnClass = 'bg-green-600/30 border-green-500 text-green-300 font-bold'
                } else if (isSelected && !timePassed) {
                  btnClass = 'bg-red-600/30 border-red-500 text-red-300'
                }
              }

              return (
                <button
                  key={opt}
                  disabled={submitted}
                  onClick={() => setSelectedTime(opt)}
                  className={`py-2 px-3 rounded-lg border text-xs font-mono text-center transition-all ${btnClass}`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>

        {/* Space Complexity Options */}
        <div className="bg-surface-800 border border-surface-600 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-300">
              Space Complexity
            </label>
            {submitted && (
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  spacePassed
                    ? 'bg-green-950/60 border border-green-500/40 text-green-400'
                    : 'bg-red-950/60 border border-red-500/40 text-red-400'
                }`}
              >
                {spacePassed ? 'Correct' : 'Incorrect'}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {COMPLEXITY_OPTIONS.map((opt) => {
              const isSelected = selectedSpace === opt
              let btnClass = 'bg-surface-700 border-surface-600 text-gray-300 hover:border-surface-400'
              if (isSelected) {
                btnClass = 'bg-purple-600/30 border-purple-500 text-purple-300 font-semibold shadow-sm'
              }
              if (submitted) {
                if (opt === normalizedSpace) {
                  btnClass = 'bg-green-600/30 border-green-500 text-green-300 font-bold'
                } else if (isSelected && !spacePassed) {
                  btnClass = 'bg-red-600/30 border-red-500 text-red-300'
                }
              }

              return (
                <button
                  key={opt}
                  disabled={submitted}
                  onClick={() => setSelectedSpace(opt)}
                  className={`py-2 px-3 rounded-lg border text-xs font-mono text-center transition-all ${btnClass}`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Result Explanation */}
      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className={`p-5 rounded-xl border ${
              allPassed
                ? 'bg-green-950/30 border-green-500/30 text-green-100'
                : 'bg-red-950/30 border-red-500/30 text-red-100'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {allPassed ? (
                <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400 shrink-0" />
              )}
              <h4 className="font-bold text-sm">
                {allPassed ? 'Well Done! Complexity Identified Correctly.' : 'Not quite right.'}
              </h4>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed mb-3">
              {exercise.explanation ||
                `Time: ${timeTarget} | Space: ${spaceTarget}. ${concept?.card?.intuition || ''}`}
            </p>

            {/* Self-reported confidence */}
            {allPassed && (
              <div className="mt-4 pt-3 border-t border-green-500/20 flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-green-300/80">How confident were you?</span>
                <div className="flex gap-1.5">
                  {[
                    { lvl: 1, label: 'Guessed' },
                    { lvl: 2, label: 'Reasonable' },
                    { lvl: 3, label: 'Mastered' },
                  ].map(({ lvl, label }) => (
                    <button
                      key={lvl}
                      onClick={() => handleConfidenceSelect(lvl)}
                      className={`text-xs px-2.5 py-1 rounded border transition-all ${
                        confidence === lvl
                          ? 'bg-green-500 text-black font-semibold border-green-400'
                          : 'bg-surface-800 text-gray-300 border-surface-600 hover:border-gray-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-gray-400 font-mono">
          {!submitted ? 'Select your answers and submit' : allPassed ? '✅ Passed' : '❌ Try again'}
        </div>
        <div className="flex items-center gap-3">
          {submitted && !allPassed && (
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-lg border border-surface-600 bg-surface-700/80 text-xs font-semibold text-gray-300 hover:bg-surface-600 transition-all"
            >
              Retry
            </button>
          )}
          {!submitted && (
            <button
              disabled={!selectedTime}
              onClick={handleSubmit}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold text-white shadow-lg transition-all"
            >
              Submit Answer <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
