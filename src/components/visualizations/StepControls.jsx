import { motion, AnimatePresence } from 'framer-motion'

const SPEEDS = [0.5, 1, 1.5, 2, 3]

export default function StepControls({
  step,
  totalSteps,
  playing,
  speed,
  annotation,
  onPrev,
  onNext,
  onPlay,
  onPause,
  onReset,
  onSpeedChange,
  readOnly = false,
  theme,
  primaryColor,
}) {
  const isReadOnly = readOnly || !onPlay || !onPrev
  const pct = totalSteps > 1 ? (step / (totalSteps - 1)) * 100 : 0
  const activeColor = primaryColor || theme?.primary || '#3b82f6'

  return (
    <div className="flex flex-col gap-2">
      {/* Annotation */}
      <div className="min-h-[2.5rem] px-3 py-2 rounded bg-surface-700 border border-surface-600 text-xs sm:text-sm text-gray-200 font-mono leading-snug flex items-center">
        {isReadOnly ? (
          <span className="w-full text-slate-200">{annotation || '—'}</span>
        ) : (
          <AnimatePresence mode="wait">
            <motion.span
              key={step}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              {annotation || '—'}
            </motion.span>
          </AnimatePresence>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-surface-600 overflow-hidden">
        {isReadOnly ? (
          <div
            className="h-full rounded-full transition-all duration-75"
            style={{ width: `${pct}%`, backgroundColor: activeColor }}
          />
        ) : (
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: activeColor }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.15 }}
          />
        )}
      </div>

      {/* Controls row or Non-interactive video HUD */}
      {isReadOnly ? (
        <div className="flex items-center justify-between px-1 text-xs font-mono text-gray-400 select-none">
          <span className="font-semibold flex items-center gap-1.5" style={{ color: activeColor }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: activeColor }} />
            Step {step + 1} / {totalSteps}
          </span>
          <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Live Simulation</span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-1 sm:gap-2">
          {/* Left: Playback controls + Step counter */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Reset */}
            <button
              onClick={onReset}
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-surface-600 transition-colors"
              title="Reset"
            >
              <ResetIcon />
            </button>

            {/* Prev */}
            <button
            onClick={onPrev}
            disabled={step === 0}
            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-surface-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Previous step"
          >
            <PrevIcon />
          </button>

          {/* Play / Pause */}
          <button
            onClick={playing ? onPause : onPlay}
            disabled={step === totalSteps - 1}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-dsa-600 hover:bg-dsa-500 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title={playing ? 'Pause' : 'Play'}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>

          {/* Next */}
          <button
            onClick={onNext}
            disabled={step === totalSteps - 1}
            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-surface-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next step"
          >
            <NextIcon />
          </button>

          {/* Step counter */}
          <span className="ml-1 text-xs text-gray-400 font-mono tabular-nums">
            {step + 1} / {totalSteps}
          </span>
        </div>

        {/* Right: Speed picker */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <span className="hidden sm:inline text-xs text-gray-400">Speed</span>
          <div className="flex items-center bg-surface-700 p-0.5 rounded-lg border border-surface-600">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={`text-[11px] sm:text-xs px-1.5 py-0.5 rounded font-mono transition-colors ${
                  speed === s
                    ? 'bg-dsa-600 text-white font-bold'
                    : 'text-gray-400 hover:text-white hover:bg-surface-600'
                }`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>
    )}
  </div>
)
}

function PlayIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
      <path d="M6 3.5l7 4.5-7 4.5V3.5z" />
    </svg>
  )
}
function PauseIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
      <rect x="3" y="3" width="4" height="10" rx="1" />
      <rect x="9" y="3" width="4" height="10" rx="1" />
    </svg>
  )
}
function PrevIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
      <path d="M10 12L5 8l5-4v8z" />
    </svg>
  )
}
function NextIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
      <path d="M6 4l5 4-5 4V4z" />
    </svg>
  )
}
function ResetIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 8a6 6 0 1 0 1.5-4L2 2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 2v4h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
