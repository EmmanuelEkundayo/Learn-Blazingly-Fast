import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle,
  XCircle,
  Lightbulb,
  HelpCircle,
  Code2,
  ArrowRight,
  RotateCcw,
} from 'lucide-react'

export default function TraceOutput({
  exercise,
  concept,
  domain = 'DSA',
  onPass,
  onFail,
  onConfidence,
}) {
  const options = exercise.options || []
  const expectedOutput = String(exercise.expected_output ?? exercise.solution ?? '').trim()

  const [selectedOption, setSelectedOption] = useState(null)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [confidence, setConfidence] = useState(null)

  const isMultipleChoice = options.length > 0
  const isCorrect = isMultipleChoice
    ? selectedOption === (exercise.correct_index ?? 0)
    : typedAnswer.trim().toLowerCase() === expectedOutput.toLowerCase()

  const handleSubmit = () => {
    if (isMultipleChoice && selectedOption === null) return
    if (!isMultipleChoice && !typedAnswer.trim()) return

    setSubmitted(true)
    if (isCorrect) {
      if (onPass) onPass()
    } else {
      if (onFail) onFail()
    }
  }

  const handleReset = () => {
    setSelectedOption(null)
    setTypedAnswer('')
    setSubmitted(false)
    setConfidence(null)
  }

  const handleConfidenceSelect = (level) => {
    setConfidence(level)
    if (onConfidence) onConfidence(level)
  }

  const codeSnippet = exercise.code || exercise.starter_code || ''

  return (
    <div className="space-y-6">
      {/* Prompt */}
      <div className="bg-surface-800 border border-surface-600 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
              <Code2 className="w-4 h-4" />
              Trace The Output
            </div>
            <h3 className="text-lg font-bold text-white mt-1">
              {exercise.prompt || 'Trace the execution of this code. What will it output?'}
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

        {/* Hints */}
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

      {/* Code Display */}
      {codeSnippet && (
        <div className="bg-surface-900 border border-surface-700 rounded-xl overflow-hidden shadow-inner font-mono text-xs">
          <div className="bg-surface-800 border-b border-surface-700 px-4 py-2 flex items-center justify-between text-gray-400 text-xs">
            <span>{exercise.language || 'python'} snippet</span>
            {exercise.input_case && (
              <span className="text-cyan-300">Input: {exercise.input_case}</span>
            )}
          </div>
          <pre className="p-4 text-gray-300 overflow-x-auto leading-relaxed whitespace-pre">
            {codeSnippet}
          </pre>
        </div>
      )}

      {/* Multiple-Choice or Input Mode */}
      {isMultipleChoice ? (
        <div className="bg-surface-800 border border-surface-600 rounded-xl p-5 space-y-3">
          <label className="text-sm font-semibold text-gray-300">
            Select the correct output:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {options.map((opt, idx) => {
              const isSelected = selectedOption === idx
              const isCorrectOpt = idx === (exercise.correct_index ?? 0)

              let optClass =
                'bg-surface-700 border-surface-600 text-gray-300 hover:border-surface-400'
              if (isSelected) {
                optClass = 'bg-cyan-950/50 border-cyan-500 text-cyan-200 font-semibold'
              }
              if (submitted) {
                if (isCorrectOpt) {
                  optClass = 'bg-green-950/50 border-green-500 text-green-200 font-bold'
                } else if (isSelected && !isCorrect) {
                  optClass = 'bg-red-950/40 border-red-500 text-red-300'
                }
              }

              return (
                <button
                  key={idx}
                  disabled={submitted}
                  onClick={() => setSelectedOption(idx)}
                  className={`p-3.5 rounded-lg border text-xs font-mono text-left transition-all flex items-center gap-3 ${optClass}`}
                >
                  <span className="w-5 h-5 rounded-full border border-gray-500 flex items-center justify-center text-xs shrink-0 font-mono">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1">{opt}</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="bg-surface-800 border border-surface-600 rounded-xl p-5 space-y-3">
          <label className="text-sm font-semibold text-gray-300">
            Type the expected output:
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              disabled={submitted}
              value={typedAnswer}
              onChange={(e) => setTypedAnswer(e.target.value)}
              placeholder="e.g. [1, 2, 3] or 42 or True"
              className="flex-1 px-4 py-2.5 rounded-lg bg-surface-900 border border-surface-600 text-white font-mono text-sm focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        </div>
      )}

      {/* Result feedback */}
      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className={`p-5 rounded-xl border ${
              isCorrect
                ? 'bg-green-950/30 border-green-500/30 text-green-100'
                : 'bg-red-950/30 border-red-500/30 text-red-100'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {isCorrect ? (
                <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400 shrink-0" />
              )}
              <h4 className="font-bold text-sm">
                {isCorrect ? 'Trace Completed Correctly!' : 'Incorrect Output'}
              </h4>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed mb-3">
              {exercise.explanation ||
                (isCorrect
                  ? `Expected: ${expectedOutput || options[exercise.correct_index ?? 0]}`
                  : `Expected output is ${expectedOutput || options[exercise.correct_index ?? 0]}. Trace variable state at each iteration.`)}
            </p>

            {isCorrect && (
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

      {/* Bottom Actions */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-gray-400 font-mono">
          {!submitted
            ? isMultipleChoice
              ? selectedOption !== null
                ? `Option ${String.fromCharCode(65 + selectedOption)} selected`
                : 'Select an output option'
              : 'Enter output value'
            : isCorrect
            ? '✅ Correct trace'
            : '❌ Incorrect'}
        </div>
        <div className="flex items-center gap-3">
          {submitted && !isCorrect && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-surface-600 bg-surface-700/80 text-xs font-semibold text-gray-300 hover:bg-surface-600 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Try Again
            </button>
          )}
          {!submitted && (
            <button
              disabled={isMultipleChoice ? selectedOption === null : !typedAnswer.trim()}
              onClick={handleSubmit}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold text-white shadow-lg transition-all"
            >
              Verify Output <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
