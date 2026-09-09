import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle,
  XCircle,
  Lightbulb,
  HelpCircle,
  ArrowUp,
  ArrowDown,
  GripVertical,
  ArrowRight,
  RotateCcw,
} from 'lucide-react'

export default function OrderSteps({
  exercise,
  concept,
  domain = 'DSA',
  onPass,
  onFail,
  onConfidence,
}) {
  const rawSteps = exercise.steps || exercise.scrambled_steps || []
  const initialSteps = rawSteps.map((text, idx) => ({ id: idx, text, originalIdx: idx }))

  const [steps, setSteps] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [confidence, setConfidence] = useState(null)

  // Scramble on initial mount if not pre-scrambled
  useEffect(() => {
    if (rawSteps.length > 0) {
      if (exercise.scrambled_steps) {
        setSteps(initialSteps)
      } else {
        // deterministic shuffle
        const shuffled = [...initialSteps].sort((a, b) => ((a.id * 7 + 3) % 11) - ((b.id * 7 + 3) % 11))
        setSteps(shuffled)
      }
    }
  }, [exercise])

  const correctOrder = exercise.correct_order || rawSteps.map((_, i) => i)

  const moveStep = (index, direction) => {
    if (submitted) return
    const targetIdx = index + direction
    if (targetIdx < 0 || targetIdx >= steps.length) return
    const updated = [...steps]
    const temp = updated[index]
    updated[index] = updated[targetIdx]
    updated[targetIdx] = temp
    setSteps(updated)
  }

  const isCorrect = steps.every((s, idx) => s.originalIdx === (correctOrder[idx] ?? idx))

  const handleSubmit = () => {
    setSubmitted(true)
    if (isCorrect) {
      if (onPass) onPass()
    } else {
      if (onFail) onFail()
    }
  }

  const handleReset = () => {
    const shuffled = [...initialSteps].sort((a, b) => ((a.id * 7 + 3) % 11) - ((b.id * 7 + 3) % 11))
    setSteps(shuffled)
    setSubmitted(false)
    setConfidence(null)
  }

  const handleConfidenceSelect = (level) => {
    setConfidence(level)
    if (onConfidence) onConfidence(level)
  }

  return (
    <div className="space-y-6">
      {/* Prompt */}
      <div className="bg-surface-800/80 border border-surface-600/60 rounded-xl p-5 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Sequence Ordering
            </span>
            <h3 className="text-lg font-bold text-white mt-1">
              {exercise.prompt || 'Arrange these steps into the correct logical order:'}
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

      {/* Reorderable Steps List */}
      <div className="space-y-2.5">
        {steps.map((step, idx) => {
          const isStepCorrect = step.originalIdx === (correctOrder[idx] ?? idx)
          let cardStyle = 'bg-surface-800/90 border-surface-600/70 text-gray-200'
          if (submitted) {
            cardStyle = isStepCorrect
              ? 'bg-green-950/40 border-green-500/50 text-green-200'
              : 'bg-red-950/40 border-red-500/50 text-red-200'
          }

          return (
            <motion.div
              key={step.id}
              layout
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${cardStyle}`}
            >
              {/* Position Number */}
              <span className="w-7 h-7 rounded-lg bg-surface-900 border border-surface-700 flex items-center justify-center text-xs font-mono font-bold text-gray-400 shrink-0">
                {idx + 1}
              </span>

              {/* Step Text */}
              <div className="flex-1 text-xs md:text-sm font-mono leading-relaxed">
                {step.text}
              </div>

              {/* Status Badge when submitted */}
              {submitted && (
                <span className="shrink-0">
                  {isStepCorrect ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                </span>
              )}

              {/* Up/Down Controls */}
              {!submitted && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    disabled={idx === 0}
                    onClick={() => moveStep(idx, -1)}
                    className="p-1.5 rounded-lg border border-surface-600 bg-surface-700/60 hover:bg-surface-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-gray-300"
                    title="Move step up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={idx === steps.length - 1}
                    onClick={() => moveStep(idx, 1)}
                    className="p-1.5 rounded-lg border border-surface-600 bg-surface-700/60 hover:bg-surface-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-gray-300"
                    title="Move step down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Feedback Panel */}
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
                {isCorrect ? 'Sequence is Correct!' : 'Steps are out of order'}
              </h4>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed mb-3">
              {exercise.explanation ||
                (isCorrect
                  ? 'All steps are arranged in the precise algorithmic order.'
                  : 'Check the step prerequisites and try moving misplaced steps.')}
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

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-gray-400 font-mono">
          {!submitted ? 'Use arrows to reorder steps' : isCorrect ? '✅ Completed' : '❌ Sequence incorrect'}
        </div>
        <div className="flex items-center gap-3">
          {submitted && !isCorrect && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-surface-600 bg-surface-700/80 text-xs font-semibold text-gray-200 hover:bg-surface-600 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Re-shuffle & Retry
            </button>
          )}
          {!submitted && (
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg transition-all"
            >
              Verify Order <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
