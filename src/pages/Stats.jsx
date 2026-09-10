import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useConceptStore } from '../store/conceptStore.js'
import { useProgressStore } from '../store/progressStore.js'
import SEO from '../components/ui/SEO.jsx'
import { ExternalLink, BarChart3, ShieldCheck, Activity, Users, BookOpen, Sparkles, CheckCircle2 } from 'lucide-react'

export default function Stats() {
  const concepts = useConceptStore(s => s.concepts)
  const progress = useProgressStore(s => s.progress)

  const stats = useMemo(() => {
    const totalConcepts = concepts.length
    const domainCounts = {}
    const difficultyCounts = { beginner: 0, intermediate: 0, advanced: 0 }

    concepts.forEach(c => {
      domainCounts[c.domain] = (domainCounts[c.domain] || 0) + 1
      if (difficultyCounts[c.difficulty] !== undefined) {
        difficultyCounts[c.difficulty]++
      }
    })

    const completedCount = Object.values(progress).filter(p => p.passed).length

    return {
      totalConcepts,
      domainCounts,
      difficultyCounts,
      completedCount,
    }
  }, [concepts, progress])

  const goatCounterUrl = import.meta.env.VITE_GOATCOUNTER_URL || 'https://learnblazinglyfast.goatcounter.com'

  return (
    <>
      <SEO
        title="Open Analytics & Platform Stats — Learn Blazingly Fast"
        description="Public platform statistics, open analytics, and transparent metrics for Learn Blazingly Fast."
        url="https://learnblazinglyfast.tech/stats"
      />

      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Open & Transparent</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Open Analytics & Platform Stats
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-sm sm:text-base">
            We believe in radical transparency. View live platform usage, content distribution, and our privacy-first telemetry architecture.
          </p>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-surface-800/80 border border-surface-700/60 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span>Concepts</span>
            </div>
            <p className="text-3xl font-extrabold text-white">{stats.totalConcepts || '550+'}</p>
            <p className="text-xs text-gray-400 mt-1">Across 6 tech domains</p>
          </div>

          <div className="p-5 rounded-2xl bg-surface-800/80 border border-surface-700/60 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Simulations</span>
            </div>
            <p className="text-3xl font-extrabold text-white">14</p>
            <p className="text-xs text-gray-400 mt-1">Custom interactive engines</p>
          </div>

          <div className="p-5 rounded-2xl bg-surface-800/80 border border-surface-700/60 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Completed</span>
            </div>
            <p className="text-3xl font-extrabold text-white">{stats.completedCount}</p>
            <p className="text-xs text-gray-400 mt-1">Exercises passed on your device</p>
          </div>

          <div className="p-5 rounded-2xl bg-surface-800/80 border border-surface-700/60 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>Privacy</span>
            </div>
            <p className="text-3xl font-extrabold text-white">100%</p>
            <p className="text-xs text-gray-400 mt-1">Zero invasive ad trackers</p>
          </div>
        </div>

        {/* Live Open Analytics Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-surface-800 via-surface-800/90 to-surface-900 border border-blue-500/20 shadow-2xl relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <h2 className="text-xl font-bold text-white">Live Public Traffic Dashboard</h2>
              </div>
              <p className="text-sm text-gray-300 max-w-xl leading-relaxed">
                We use **GoatCounter**, an open-source, privacy-first web statistics tool. All traffic statistics (pageviews, visitor countries, referrers, and browsers) are publicly accessible without collecting personal data.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-gray-400 font-mono">
                <span className="flex items-center gap-1 text-emerald-400">✓ No Cookies</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-400">✓ GDPR Compliant</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-400">✓ Open Source</span>
              </div>
            </div>

            <a
              href={goatCounterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold flex items-center gap-2 shadow-lg transition-all hover:scale-105 active:scale-95 shrink-0"
            >
              <span>View Live Stats</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </motion.div>

        {/* Telemetry & PostHog Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-surface-800/70 border border-surface-700/60 space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-lg">
              <Users className="w-5 h-5 text-purple-400" />
              <h3>Product Analytics with PostHog</h3>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">
              We use **PostHog** to understand which concepts help developers learn fastest, diagnose where exercises are too confusing, and fix visual rendering bugs before users report them.
            </p>
            <ul className="space-y-2 text-xs text-gray-400">
              <li className="flex items-center gap-2">
                <span className="text-purple-400">✦</span>
                <span>Tracks concept view count and learning completion rate</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-purple-400">✦</span>
                <span>Monitors exercise pass/fail rates to balance difficulty</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-purple-400">✦</span>
                <span>Diagnoses rendering errors on complex SVG & Canvas animations</span>
              </li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-surface-800/70 border border-surface-700/60 space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-lg">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3>Our Privacy Guarantee</h3>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">
              Your learning journey belongs to you. All telemetry collected by Learn Blazingly Fast is used exclusively to improve the platform.
            </p>
            <ul className="space-y-2 text-xs text-gray-400">
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                <span>We never sell or monetize user data with third-party advertisers</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Progress is stored locally in your browser (LocalStorage)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                <span>All telemetry can be audited in our open-source codebase</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Content Breakdown by Domain */}
        <div className="p-6 sm:p-8 rounded-2xl bg-surface-800/50 border border-surface-700/60 space-y-6">
          <h3 className="text-lg font-bold text-white">Content Breakdown by Domain</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Object.entries(stats.domainCounts).map(([domain, count]) => (
              <div key={domain} className="p-4 rounded-xl bg-surface-800 border border-surface-700/50">
                <p className="text-xs text-gray-400 font-medium">{domain}</p>
                <p className="text-2xl font-bold text-white mt-1">{count} <span className="text-xs text-gray-400 font-normal">concepts</span></p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
