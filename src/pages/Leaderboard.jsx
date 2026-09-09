import { useEffect, useState, useMemo } from 'react'
import { useProgressStore } from '../store/progressStore.js'
import { getLearnerName } from '../utils/learnerName.js'
import { motion, AnimatePresence } from 'framer-motion'
import { FlameIcon, TrophyIcon } from '../components/ui/Icons.jsx'
import SEO from '../components/ui/SEO.jsx'
import { getPageMeta } from '../utils/seo'

export default function Leaderboard() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showOptInModal, setShowOptInModal] = useState(false)
  const [firstName, setFirstName] = useState('')

  const optedIn = useProgressStore(s => s.leaderboard_opted_in)
  const progress = useProgressStore(s => s.progress)
  const streak = useProgressStore(s => s.streak)
  const setOptIn = useProgressStore(s => s.setLeaderboardOptIn)
  const [email, setEmail] = useState(() => {
    try { return localStorage.getItem('lbf_leaderboard_email') || '' } catch { return '' }
  })
  const defaultName = getLearnerName()
  const [occupation, setOccupation] = useState('')

  const conceptsPassed = useMemo(() => Object.values(progress).filter(p => p.exercise_passed).length, [progress])
  const domainsCompleted = 0 // simplified for now

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  async function fetchLeaderboard() {
    try {
      const res = await fetch('/api/v1/leaderboard')
      const data = await res.json()
      setEntries(data)
    } catch {
      console.error('Failed to fetch leaderboard')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    const nameToUse = firstName || defaultName.split(' ')[0] || 'Learner'
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      window.alert('Please enter a valid email so we can link your leaderboard entry.')
      return
    }
    try { localStorage.setItem('lbf_leaderboard_email', email.trim()) } catch {}
    setOptIn(true, { 
      name: nameToUse, 
      email: email.trim(), 
      occupation: occupation.trim() || 'Learner',
      concepts_passed: conceptsPassed,
      domains_completed: domainsCompleted,
      streak: streak.count
    })
    setShowOptInModal(false)
    // Refresh list
    setTimeout(fetchLeaderboard, 500)
  }

  const handleOptOut = async () => {
    if (!window.confirm('Are you sure you want to remove yourself from the leaderboard?')) return
    try {
      await fetch('/api/v1/leaderboard/opt-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
    } catch {
      // silent — list will still refresh
    }
    setOptIn(false)
    fetchLeaderboard()
  }

  const myEntry = entries.find(e => e.name === defaultName.split(' ')[0] && e.concepts_passed === conceptsPassed)
  const myRank = myEntry?.rank
  const percentile = myRank ? Math.round((1 - myRank / Math.max(entries.length, 100)) * 100) : null

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">
      <SEO {...getPageMeta('/leaderboard')} />
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Leaderboard</h1>
        <p className="text-gray-400">Top learners globally. Opt in to compete and track your progress.</p>
      </header>

      {/* Rank Card */}
      {optedIn && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-600/20 to-purple-600/10 border border-blue-500/30 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-blue-900/40">
              {myRank || '?'}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Your Rank</h3>
              <p className="text-gray-400 text-sm">
                {percentile ? `You're in the top ${percentile}% of learners!` : 'Refreshing your position...'}
              </p>
            </div>
          </div>
          <div className="flex gap-8 text-center">
            <div>
              <div className="text-2xl font-black text-white">{conceptsPassed}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Concepts</div>
            </div>
            <div>
              <div className="text-2xl font-black text-orange-400">{streak.count}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Streak</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Table */}
      <div className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-900/50">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest w-16">Rank</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Name</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Occupation</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Concepts</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Streak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/50">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-20 text-center text-gray-400 animate-pulse">Loading top learners...</td></tr>
              ) : entries.length > 0 ? (
                entries.map((entry) => (
                  <tr 
                    key={entry.rank}
                    className={`transition-colors ${
                      entry.rank === 1 ? 'bg-yellow-500/5' : 
                      entry.rank === 2 ? 'bg-gray-400/5' : 
                      entry.rank === 3 ? 'bg-orange-500/5' : ''
                    } ${myRank === entry.rank ? 'bg-blue-600/10' : 'hover:bg-surface-700/30'}`}
                  >
                    <td className="px-6 py-4 font-black">
                      {entry.rank === 1 ? <TrophyIcon className="w-5 h-5 text-yellow-500 inline-block drop-shadow-md" /> : 
                       entry.rank === 2 ? <TrophyIcon className="w-4 h-4 text-gray-300 inline-block drop-shadow-md" /> : 
                       entry.rank === 3 ? <TrophyIcon className="w-4 h-4 text-orange-400 inline-block drop-shadow-md" /> : 
                       `#${entry.rank}`}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-100">{entry.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{entry.occupation}</td>
                    <td className="px-6 py-4 text-center">
                       <span className="bg-surface-700 text-white px-2 py-0.5 rounded text-xs font-mono">{entry.concepts_passed}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <span className="text-orange-400 font-bold text-sm flex items-center justify-center gap-1.5">
                           <FlameIcon className="w-4 h-4" /> {entry.streak}
                       </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" className="px-6 py-20 text-center text-gray-400 italic">Leaderboard is empty. Be the first to join!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CTA */}
      {!optedIn && (
        <div className="bg-surface-800 border-2 border-dashed border-surface-600 rounded-2xl p-8 text-center space-y-4">
          <p className="text-gray-400">You're currently hidden from the public leaderboard. Join others and climb the ranks!</p>
<button 
              onClick={() => {
                setFirstName(defaultName.split(' ')[0])
                setEmail(email)
                setShowOptInModal(true)
              }}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-95"
            >
              Join the Leaderboard
            </button>
        </div>
      )}

      {optedIn && (
        <div className="text-center pt-10">
          <button onClick={handleOptOut} className="text-xs text-gray-400 hover:text-red-400 transition-colors">
            Remove me from leaderboard
          </button>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showOptInModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface-800 border border-surface-600 rounded-2xl p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <h2 className="text-2xl font-bold text-white">Join the Leaderboard</h2>
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">First name</label>
                  <input 
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="e.g. Emma"
                    className="w-full bg-surface-900 border border-surface-700 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email</label>
                  <input 
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-surface-900 border border-surface-700 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Occupation</label>
                  <input 
                    type="text"
                    value={occupation}
                    onChange={e => setOccupation(e.target.value)}
                    placeholder="e.g. Software Engineer"
                    className="w-full bg-surface-900 border border-surface-700 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <p className="text-[10px] text-gray-400 italic">Only your first name and learning stats will be visible publicly.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowOptInModal(false)} className="flex-1 py-3 text-sm text-gray-400 font-bold hover:text-gray-300">Cancel</button>
                <button onClick={handleJoin} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 shadow-xl shadow-blue-900/40">Join Now</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
