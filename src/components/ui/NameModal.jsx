import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function NameModal({ isOpen, onSubmit, onCancel }) {
  const [name, setName] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit(name.trim())
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-surface-800 border border-surface-700 rounded-2xl max-w-sm w-full p-8 shadow-2xl space-y-6"
        >
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-white">Certificate Name</h3>
            <p className="text-sm text-gray-400">
              What name should appear on your certificate of completion?
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              autoFocus
              required
              type="text"
              placeholder="Enter your full name"
              className="w-full bg-surface-900 border border-surface-600 focus:border-blue-500 outline-none rounded-xl p-4 text-white placeholder-gray-500 transition-all font-medium text-center"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-3 text-sm font-bold text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-900/20"
              >
                Continue
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
