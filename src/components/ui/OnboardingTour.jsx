import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, Sparkles, BookOpen, Code2, TrendingUp, Rocket } from 'lucide-react'

const STEPS = [
  {
    icon: Sparkles,
    title: 'Welcome to Learn Blazingly Fast',
    description: 'Master algorithms, system design, and software engineering with interactive visualizations and hands-on exercises.',
    target: null,
    color: 'text-blue-400',
    bg: 'from-blue-600/20 to-purple-600/10',
  },
  {
    icon: BookOpen,
    title: 'Explore 400+ Concepts',
    description: 'Browse our comprehensive collection of computer science concepts, each with interactive visualizations.',
    target: '/browse',
    color: 'text-emerald-400',
    bg: 'from-emerald-600/20 to-teal-600/10',
  },
  {
    icon: Code2,
    title: 'Try the Code Playground',
    description: 'Run Python and JavaScript directly in your browser. Experiment with algorithms and data structures.',
    target: '/playground',
    color: 'text-purple-400',
    bg: 'from-purple-600/20 to-pink-600/10',
  },
  {
    icon: TrendingUp,
    title: 'Track Your Progress',
    description: 'Your learning progress is saved locally. Complete exercises to build streaks and climb the leaderboard.',
    target: null,
    color: 'text-orange-400',
    bg: 'from-orange-600/20 to-red-600/10',
  },
  {
    icon: Rocket,
    title: "You're All Set!",
    description: 'Start with the Browse page to find concepts that interest you. Happy learning!',
    target: '/browse',
    color: 'text-blue-400',
    bg: 'from-blue-600/20 to-cyan-600/10',
    isLast: true,
  },
]

const variants = {
  enter: (dir) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -200 : 200, opacity: 0 }),
}

export default function OnboardingTour({ onComplete }) {
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const navigate = useNavigate()

  const current = STEPS[step]

  function close() {
    localStorage.setItem('lbf_onboarding_complete', 'true')
    onComplete()
  }

  function next() {
    if (step === STEPS.length - 1) {
      close()
      navigate('/browse')
      return
    }
    setDir(1)
    setStep(s => s + 1)
  }

  function prev() {
    setDir(-1)
    setStep(s => Math.max(0, s - 1))
  }

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') return close()
      if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        next()
      }
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  const Icon = current.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-white/10 bg-gray-900 shadow-2xl overflow-hidden">
        <button
          onClick={close}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors z-10"
        >
          <X size={18} />
        </button>

        <div className={`bg-gradient-to-b ${current.bg} p-8 pb-6`}>
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="text-center"
            >
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 mb-5 ${current.color}`}>
                <Icon size={32} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{current.title}</h2>
              <p className="text-gray-300 text-sm leading-relaxed">{current.description}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between px-6 py-4 bg-gray-900">
          <button
            onClick={prev}
            disabled={step === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} /> Back
          </button>

          <div className="flex gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-blue-500' : 'bg-gray-600'}`}
              />
            ))}
          </div>

          <button
            onClick={next}
            className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
          >
            {current.isLast ? 'Get Started' : 'Next'} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
