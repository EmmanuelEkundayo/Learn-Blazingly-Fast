import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useProgressStore } from '../../store/progressStore.js'
import toast from 'react-hot-toast'

export default function SupportModal() {
  const show = useProgressStore((s) => s.show_support_modal)
  const interacted = useProgressStore((s) => s.interacted_concepts)
  const dismiss = useProgressStore((s) => s.dismissSupportModal)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    occupation: '',
    review_text: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [errors, setErrors] = useState({})
  const [showErrors, setShowErrors] = useState(false)

  useEffect(() => {
    const words = formData.review_text.trim().split(/\s+/).filter(w => w.length > 0)
    setWordCount(words.length)
  }, [formData.review_text])

  const validate = () => {
    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required'
    } else if (formData.phone.replace(/\D/g, '').length < 10) {
      newErrors.phone = 'Phone must be at least 10 digits'
    }
    if (!formData.occupation.trim()) newErrors.occupation = 'Occupation is required'
    if (wordCount < 30) newErrors.review = `Minimum 30 words required (${wordCount}/30)`
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValid = wordCount >= 30 && 
    formData.name.trim() && 
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
    formData.phone.replace(/\D/g, '').length >= 10 &&
    formData.occupation.trim()

  async function handleSubmit(e) {
    e.preventDefault()
    setShowErrors(true)
    if (!validate() || isSubmitting) return

    setIsSubmitting(true)

    const payload = {
      ...formData,
      concepts_seen: interacted,
      submitted_at: new Date().toISOString()
    }

    try {
      const res = await fetch('/api/v1/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error('Submission failed')

      localStorage.setItem('completed_support', 'true')
      toast.success(`Thank you, ${formData.name} — your review means a lot ✦`)
      dismiss()
    } catch {
      toast.error('Failed to submit review. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!show) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-surface-800 rounded-xl max-w-md w-full shadow-2xl p-8 my-8"
        >
          <div className="text-center mb-8">
            <span className="text-blue-400 text-3xl block mb-2">✦</span>
            <h2 className="text-xl font-bold text-white mb-2">You've been learning. Tell us about it.</h2>
            <p className="text-gray-400 text-sm">
              Learn Blazingly Fast is free. Leave a quick review to continue — it takes less than a minute.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Full Name</label>
              <input
                type="text"
                placeholder="Your name"
                className={`w-full bg-surface-900 border ${errors.name && showErrors ? 'border-red-500' : 'border-surface-600'} focus:border-blue-500 outline-none rounded-lg p-3 text-white transition-colors`}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              {errors.name && showErrors && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                className={`w-full bg-surface-900 border ${errors.email && showErrors ? 'border-red-500' : 'border-surface-600'} focus:border-blue-500 outline-none rounded-lg p-3 text-white transition-colors`}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              {errors.email && showErrors && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="10+ digits recommended"
                className={`w-full bg-surface-900 border ${errors.phone && showErrors ? 'border-red-500' : 'border-surface-600'} focus:border-blue-500 outline-none rounded-lg p-3 text-white transition-colors`}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              {errors.phone && showErrors && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Occupation</label>
              <input
                type="text"
                placeholder="e.g. Software Engineer, Student"
                className={`w-full bg-surface-900 border ${errors.occupation && showErrors ? 'border-red-500' : 'border-surface-600'} focus:border-blue-500 outline-none rounded-lg p-3 text-white transition-colors`}
                value={formData.occupation}
                onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
              />
              {errors.occupation && showErrors && <p className="text-red-500 text-xs mt-1">{errors.occupation}</p>}
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Your Review</label>
              <textarea
                placeholder="What were you struggling with before? What clicked after using Learn Blazingly Fast? (Min 30 words)"
                className={`w-full bg-surface-900 border ${errors.review && showErrors ? 'border-red-500' : 'border-surface-600'} focus:border-blue-500 outline-none rounded-lg p-3 text-white transition-colors min-h-[120px] resize-none`}
                value={formData.review_text}
                onChange={(e) => setFormData({ ...formData, review_text: e.target.value })}
              />
              <div className="flex justify-between items-center mt-1">
                {errors.review && showErrors ? (
                  <p className="text-red-500 text-xs">{errors.review}</p>
                ) : <div />}
                <p className={`text-xs ${wordCount >= 30 ? 'text-blue-400' : 'text-gray-500'}`}>
                  {wordCount} / 30 words minimum
                </p>
              </div>
            </div>

            <button
              disabled={!isValid || isSubmitting}
              className={`w-full py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2
                ${isValid && !isSubmitting 
                  ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20' 
                  : 'bg-surface-700 text-gray-500 cursor-not-allowed opacity-50'}`}
            >
              {isSubmitting ? (
                <>
                  <Spinner /> Submitting...
                </>
              ) : (
                'Submit Review'
              )}
            </button>

            <p className="text-[10px] text-gray-400 text-center mt-4 uppercase tracking-widest">
              Learn Blazingly Fast is built by one developer. Your review helps other developers find us.
            </p>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}
