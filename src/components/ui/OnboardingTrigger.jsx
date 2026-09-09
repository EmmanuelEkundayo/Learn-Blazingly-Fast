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
        className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-blue-600 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-blue-500 transition-colors"
      >
        <HelpCircle size={22} />
      </button>
      <AnimatePresence>
        {show && <OnboardingTour onComplete={handleComplete} />}
      </AnimatePresence>
    </>
  )
}
