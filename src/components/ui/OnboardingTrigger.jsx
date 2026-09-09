import { useState, useEffect } from 'react'
import { HelpCircle } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import OnboardingTour from './OnboardingTour.jsx'

export default function OnboardingTrigger() {
  const [show, setShow] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('lbf_onboarding_complete')) {
      setVisible(true)
    }
  }, [])

  function handleComplete() {
    setShow(false)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <>
      <button
        onClick={() => setShow(true)}
        aria-label="Start interactive tour"
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 w-10 h-10 sm:w-12 sm:h-12 bg-blue-600/90 hover:bg-blue-500 backdrop-blur-sm rounded-full shadow-xl flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 border border-blue-400/30"
      >
        <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>
      <AnimatePresence>
        {show && <OnboardingTour onComplete={handleComplete} />}
      </AnimatePresence>
    </>
  )
}
