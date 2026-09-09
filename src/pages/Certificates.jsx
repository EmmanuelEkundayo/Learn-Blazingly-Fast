import { useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { useConceptStore }  from '../store/conceptStore.js'
import { useProgressStore } from '../store/progressStore.js'
import { useAuthStore }     from '../store/authStore.js'
import { generateCertificate } from '../utils/generateCertificate.js'
import NameModal from '../components/ui/NameModal.jsx'

export default function Certificates() {
  const concepts = useConceptStore(s => s.concepts)
  const getCompletedDomains = useProgressStore(s => s.getCompletedDomains)
  const completionDates = useProgressStore(s => s.completion_dates)
  const userName = useAuthStore(s => s.userName)
  
  const completed = getCompletedDomains(concepts)
  const [modalOpen, setModalOpen] = useState(false)
  const [pendingDomain, setPendingDomain] = useState(null)

  const handleDownload = (domain) => {
    if (!userName) {
      setPendingDomain(domain)
      setModalOpen(true)
      return
    }
    const count = concepts.filter(c => c.domain === domain).length
    const date = completionDates[domain] || Date.now()
    generateCertificate(domain, userName, count, date)
  }

  const handleNameSubmit = (name) => {
    setModalOpen(false)
    if (pendingDomain) {
      const count = concepts.filter(c => c.domain === pendingDomain).length
      const date = completionDates[pendingDomain] || Date.now()
      generateCertificate(pendingDomain, name, count, date)
      setPendingDomain(null)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-16 space-y-12">
      <header className="text-center space-y-4 max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-white tracking-tight">Mastery Certificates</h1>
        <p className="text-gray-400 text-lg">
          Earned by completing every visual concept and exercise within a domain.
        </p>
      </header>

      {completed.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {completed.map((domain, i) => {
            const count = concepts.filter(c => c.domain === domain).length
            const date = completionDates[domain] || Date.now()
            
            return (
              <motion.div
                key={domain}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-surface-800 border border-surface-700/50 rounded-2xl p-6 flex flex-col gap-6 shadow-2xl relative overflow-hidden group"
              >
                {/* Decorative background glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-colors" />

                <div className="flex justify-between items-start relative z-10">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">✦</span>
                    <div>
                      <h3 className="font-bold text-xl text-white">{domain}</h3>
                      <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Mastery Achieved</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 border-y border-surface-700/50 py-4 my-2 flex items-center justify-between relative z-10">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 uppercase font-medium">Concepts</p>
                    <p className="text-lg font-bold text-white">{count}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-xs text-gray-500 uppercase font-medium">Date</p>
                    <p className="text-lg font-bold text-white">{new Date(date).toLocaleDateString()}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleDownload(domain)}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/40 relative z-10"
                >
                  Download Certificate (PDF)
                </button>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20 space-y-6"
        >
          <div className="text-6xl opacity-10">✦</div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">No certificates earned yet</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              Complete all concepts in any domain to earn your professional certificate of completion.
            </p>
          </div>
          <Link 
            to="/browse" 
            className="inline-block px-6 py-3 bg-surface-800 border border-surface-700 rounded-xl text-sm font-bold text-gray-300 hover:text-white hover:bg-surface-700 transition-all"
          >
            Start Learning
          </Link>
        </motion.div>
      )}

      <NameModal 
        isOpen={modalOpen} 
        onSubmit={handleNameSubmit} 
        onCancel={() => { setModalOpen(false); setPendingDomain(null) }} 
      />
    </div>
  )
}
