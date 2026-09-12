import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Lightbulb, HelpCircle, Bug, ArrowRight, RotateCcw } from 'lucide-react'

export default function SpotTheBug({
  exercise,
  concept,
  domain = 'DSA',
  onPass,
  onFail,
  onConfidence,
}) {
  const codeLines = (exercise.code || exercise.starter_code || '').split('\n')
  const targetLine = exercise.bug_line ?? exercise.bug_line_number ?? 1
  const options = exercise.options || []

  const [selectedLine, setSelectedLine] = useState(null)
  const [selectedOption, setSelectedOption] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [confidence, setConfidence] = useState(null)

  const isLineMode = !options || options.length === 0
  const isCorrect = isLineMode
    ? selectedLine === targetLine
    : selectedOption === (exercise.correct_index ?? 0)

  const handleSubmit = () => {
    if (isLineMode && selectedLine === null) return
    if (!isLineMode && selectedOption === null) return

    setSubmitted(true)
    if (isCorrect) {
      if (onPass) onPass()
    } else {
      if (onFail) onFail()
    }
  }

  const handleReset = () => {
    setSelectedLine(null)
    setSelectedOption(null)
    setSubmitted(false)
    setConfidence(null)
  }

  const handleConfidenceSelect = (level) => {
    setConfidence(level)
    if (onConfidence) onConfidence(level)
  }

  return (
    <div className="space-y-6">
      {/* Prompt Header */}
      <div className="bg-surface-800 border border-surface-600 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-400">
              <Bug className="w-4 h-4" />
              Spot The Bug
            </div>
            <h3 className="text-lg font-bold text-white mt-1">
              {exercise.prompt || 'Click the line containing the bug in this implementation:'}
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

        {/* Hint Box */}
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

      {/* Code Viewer with Line Selection */}
      <div className="bg-surface-900 border border-surface-700 rounded-xl overflow-hidden shadow-inner font-mono text-xs">
        <div className="bg-surface-800 border-b border-surface-700 px-4 py-2 flex items-center justify-between text-gray-400 text-xs">
          <span>{exercise.language || 'python'} snippet</span>
          <span>{isLineMode ? 'Click any line to mark bug' : 'Inspect the code below'}</span>
        </div>
        <div className="p-2 space-y-0.5 overflow-x-auto">
          {codeLines.map((line, idx) => {
            const lineNum = idx + 1
            const isSelected = selectedLine === lineNum
            const isBugLine = lineNum === targetLine

            let lineClass = 'hover:bg-surface-800 cursor-pointer text-gray-300'
            if (isSelected) {
              lineClass = 'bg-rose-950/50 border-rose-500/60 text-rose-200 font-semibold'
            }
            if (submitted) {
              if (isBugLine) {
                lineClass = 'bg-rose-900/60 border border-rose-500 text-rose-100 font-bold'
              } else if (isSelected && !isCorrect) {
                lineClass = 'bg-red-950/40 line-through opacity-60 text-red-400'
              }
            }

            return (
              <div
                key={idx}
                onClick={() => {
                  if (!submitted && isLineMode) setSelectedLine(lineNum)
                }}
                className={`flex items-start rounded px-2.5 py-1 transition-colors border border-transparent ${lineClass}`}
              >
                <span className="w-8 shrink-0 text-gray-400 select-none text-right pr-3 font-mono">
                  {lineNum}
                </span>
                <span className="whitespace-pre flex-1">{line || ' '}</span>
                {isSelected && !submitted && (
                  <span className="text-xs text-rose-400 font-sans font-medium shrink-0 ml-2">
                    [Selected]
                  </span>
                )}
                {submitted && isBugLine && (
                  <span className="text-xs text-rose-300 font-sans font-bold shrink-0 ml-2 flex items-center gap-1">
                    <Bug className="w-3 h-3" /> Bug Line
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Multiple-Choice Options if present */}
      {options.length > 0 && (
        <div className="bg-surface-800 border border-surface-600 rounded-xl p-5 space-y-3">
          <label className="text-sm font-semibold text-gray-300">
            What is the bug causing the failure?
          </label>
          <div className="space-y-2">
            {options.map((opt, idx) => {
              const isSelected = selectedOption === idx
              const isCorrectOpt = idx === (exercise.correct_index ?? 0)

              let optClass = 'bg-surface-700 border-surface-600 text-gray-300 hover:border-surface-400'
              if (isSelected) {
                optClass = 'bg-rose-950/40 border-rose-500 text-rose-200 font-semibold'
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
                  className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex items-center gap-3 ${optClass}`}
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
                {isCorrect ? 'Bug Spotted!' : 'Incorrect Line Selected'}
              </h4>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed mb-3">
              {exercise.explanation ||
                (isCorrect
                  ? `Line ${targetLine} contains the bug: ${exercise.solution || 'Logic error in state update.'}`
                  : `The bug is on line ${targetLine}. Take another look at how variables are updated.`)}
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

      {/* Bottom Bar */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-gray-400 font-mono">
          {!submitted
            ? isLineMode
              ? selectedLine
                ? `Line ${selectedLine} selected`
                : 'Click the buggy line above'
              : 'Choose the bug explanation'
            : isCorrect
            ? '✅ Bug identified'
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
              disabled={isLineMode ? selectedLine === null : selectedOption === null}
              onClick={handleSubmit}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold text-white shadow-lg transition-all"
            >
              Verify Bug <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
