import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Shield, Check, XCircle, Trash2, Loader2, Lock } from 'lucide-react'
import toast from 'react-hot-toast'

const TOKEN_STORAGE_KEY = 'lbf_admin_token'

export default function AdminReviewModal({ isOpen, onClose }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY) || '')
  const [tokenEntered, setTokenEntered] = useState(!!localStorage.getItem(TOKEN_STORAGE_KEY))
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(false)
  const [tokenLoading, setTokenLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [filter, setFilter] = useState('all')

  const adminHeaders = {
    'Content-Type': 'application/json',
    'x-admin-token': token,
  }

  const loadReviews = useCallback(async () => {
    setLoading(true)
    setAuthError('')
    try {
      const res = await fetch('/api/v1/reviews/admin', { headers: { 'x-admin-token': token } })
      if (!res.ok) {
        if (res.status === 401) throw new Error('unauthorized')
        throw new Error('Failed to load reviews')
      }
      setReviews(await res.json())
      setTokenEntered(true)
      localStorage.setItem(TOKEN_STORAGE_KEY, token)
    } catch (err) {
      if (err.message === 'unauthorized') {
        setTokenEntered(false)
        setAuthError('Invalid admin token')
        localStorage.removeItem(TOKEN_STORAGE_KEY)
      } else {
        toast.error('Could not load reviews')
      }
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (isOpen && tokenEntered && token) {
      loadReviews()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  function handleTokenSubmit(e) {
    e.preventDefault()
    setTokenLoading(true)
    setTokenEntered(true)
    loadReviews().finally(() => setTokenLoading(false))
  }

  function resetToken() {
    setToken('')
    setTokenEntered(false)
    setAuthError('')
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }

  async function patchApproval(rev, approved) {
    try {
      const res = await fetch(`/api/v1/reviews/${encodeURIComponent(rev.id)}`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({ approved }),
      })
      if (!res.ok) {
        if (res.status === 401) { resetToken(); toast.error('Session expired, re-enter token') }
        else toast.error('Update failed')
        return
      }
      setReviews(prev => prev.map(r => r.id === rev.id ? { ...r, approved } : r))
      toast.success(approved ? 'Review approved & published' : 'Review unapproved')
    } catch {
      toast.error('Update failed')
    }
  }

  async function deleteReview(rev) {
    if (!window.confirm('Delete this review permanently?')) return
    try {
      const res = await fetch(`/api/v1/reviews/${encodeURIComponent(rev.id)}`, {
        method: 'DELETE',
        headers: adminHeaders,
      })
      if (!res.ok) {
        if (res.status === 401) { resetToken(); toast.error('Session expired, re-enter token') }
        else toast.error('Delete failed')
        return
      }
      setReviews(prev => prev.filter(r => r.id !== rev.id))
      toast.success('Review deleted')
    } catch {
      toast.error('Delete failed')
    }
  }

  function logout() {
    resetToken()
    setReviews([])
    toast('Logged out of admin')
  }

  if (!isOpen) return null

  const pending = reviews.filter(r => !r.approved)
  const approved = reviews.filter(r => r.approved)
  const shown = filter === 'pending' ? pending : filter === 'approved' ? approved : reviews

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-bold text-white">Review Manager</h2>
            </div>
            <div className="flex items-center gap-2">
              {tokenEntered && (
                <button
                  onClick={logout}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-surface-800 text-gray-400 hover:text-white hover:bg-surface-700 transition-colors"
                >
                  Log out
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-surface-800 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {!tokenEntered ? (
            <form onSubmit={handleTokenSubmit} className="p-8 space-y-4">
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <Lock className="w-4 h-4 text-blue-400" />
                <span>Enter the admin token to manage reviews</span>
              </div>
              <input
                type="password"
                placeholder="Admin token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                autoFocus
                className="w-full bg-surface-800 border border-surface-600 rounded-xl py-3 px-4 text-white text-sm placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all"
              />
              {authError && (
                <p className="text-sm text-red-400">{authError}</p>
              )}
              <button
                type="submit"
                disabled={tokenLoading || !token}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all"
              >
                {tokenLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Unlock admin'}
              </button>
            </form>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 px-6 pt-4 items-center">
                {[
                  { key: 'all', label: `All (${reviews.length})` },
                  { key: 'pending', label: `Pending (${pending.length})` },
                  { key: 'approved', label: `Approved (${approved.length})` },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      filter === f.key ? 'bg-blue-600 text-white' : 'bg-surface-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {loading ? (
                  <div className="py-16 flex justify-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : shown.length === 0 ? (
                  <div className="py-16 text-center text-gray-500">
                    {filter === 'pending' ? 'No pending reviews. New submissions will appear here for approval.' : filter === 'approved' ? 'No approved reviews yet.' : 'No reviews yet.'}
                  </div>
                ) : (
                  shown.map(rev => (
                    <div key={rev.id} className={`border rounded-xl p-4 ${rev.approved ? 'border-emerald-600/30 bg-emerald-500/5' : 'border-amber-600/30 bg-amber-500/5'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm">{rev.name}</span>
                            <span className="text-xs text-gray-500">{rev.occupation}</span>
                            {rev.approved ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600/20 text-emerald-400 font-semibold">APPROVED · LIVE</span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-600/20 text-amber-400 font-semibold">PENDING</span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-600 mt-0.5">
                            {new Date(rev.submitted_at).toLocaleString()} · {rev.concepts_seen_count} concepts
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {rev.approved ? (
                            <button
                              onClick={() => patchApproval(rev, false)}
                              title="Unpublish"
                              className="p-2 rounded-lg bg-surface-800 text-amber-400 hover:bg-surface-700 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => patchApproval(rev, true)}
                              title="Approve & publish"
                              className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteReview(rev)}
                            title="Delete"
                            className="p-2 rounded-lg bg-surface-800 text-red-400 hover:bg-surface-700 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-300 mt-3 leading-relaxed">{rev.review_text}</p>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
