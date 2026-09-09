import { useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import roadmaps from '../data/roadmaps/index.js'
import { useProgressStore } from '../store/progressStore.js'
import { useConceptStore }  from '../store/conceptStore.js'
import { useAuthStore }     from '../store/authStore.js'
import { generateCertificate } from '../utils/generateCertificate.js'
import { RoadmapIcon, ClockIcon, BookIcon, GraduationIcon } from '../components/ui/Icons.jsx'
import SEO from '../components/ui/SEO.jsx'
import { getRoadmapMeta } from '../utils/seo'

export default function Roadmap() {
  const { slug } = useParams()
  const navigate = useNavigate()
  
  const concepts = useConceptStore(s => s.concepts)
  const progress = useProgressStore(s => s.progress)
  const getRoadmapProgress = useProgressStore(s => s.getRoadmapProgress)
  const setActiveRoadmap = useProgressStore(s => s.setActiveRoadmap)
  const incrementInteractions = useProgressStore(s => s.incrementInteractions)
  const userName = useAuthStore(s => s.userName)

  const roadmap = useMemo(() => roadmaps.find(r => r.slug === slug), [slug])
  const roadmapProgress = useMemo(() => getRoadmapProgress(roadmap), [roadmap, progress])

  useEffect(() => { incrementInteractions() }, [incrementInteractions])

  useEffect(() => {
    if (roadmapProgress?.percentage === 100) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#8b5cf6', '#10b981']
      })
    }
  }, [roadmapProgress?.percentage])

  if (!roadmap) return <div className="p-20 text-center text-gray-500">Roadmap not found</div>

  const handleStartRoadmap = () => {
    setActiveRoadmap(roadmap.slug)
    if (roadmapProgress.nextConcept) {
      navigate(`/concept/${roadmapProgress.nextConcept}`)
    }
  }

  const handleDownloadCertificate = () => {
    const totalConcepts = roadmap.phases.reduce((acc, p) => acc + p.concepts.length, 0)
    generateCertificate(roadmap.title, userName || 'Learner', totalConcepts, Date.now())
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 pb-32 space-y-12 relative">
      <SEO {...getRoadmapMeta(roadmap)} />
      {/* Header */}
      <header className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex shrink-0"><RoadmapIcon id={roadmap.id} className="w-16 h-16 text-white" /></div>
          <div className="space-y-1">
             <div className="flex items-center gap-2">
               <span className="bg-surface-800 text-gray-500 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">{roadmap.category}</span>
               <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest bg-opacity-20 ${
                 roadmap.difficulty === 'beginner' ? 'bg-green-500 text-green-400' : 
                 roadmap.difficulty === 'intermediate' ? 'bg-yellow-500 text-yellow-400' : 'bg-red-500 text-red-400'
               }`}>
                 {roadmap.difficulty}
               </span>
             </div>
             <h1 className="text-4xl font-black text-white">{roadmap.title}</h1>
          </div>
        </div>
        <p className="text-gray-400 text-lg leading-relaxed max-w-2xl">{roadmap.description}</p>
        
        <div className="flex items-center gap-6 text-sm font-bold text-gray-500 uppercase tracking-widest">
           <div className="flex items-center gap-1.5"><ClockIcon className="w-4 h-4" /> {roadmap.estimated_weeks} Weeks</div>
           <div className="flex items-center gap-1.5"><BookIcon className="w-4 h-4" /> {roadmapProgress.total} Concepts</div>
        </div>

        {/* Big Progress Bar */}
        <div className="space-y-3 pt-4">
           <div className="flex justify-between items-end">
             <div className="text-2xl font-black text-white">{roadmapProgress.percentage}% <span className="text-sm text-gray-600 uppercase">Complete</span></div>
             <div className="text-sm font-bold text-gray-500">{roadmapProgress.completed} / {roadmapProgress.total} Concepts Mastered</div>
           </div>
           <div className="h-3 w-full bg-surface-800 rounded-full overflow-hidden border border-surface-700">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${roadmapProgress.percentage}%` }}
               className={`h-full bg-gradient-to-r ${
                 roadmap.color === 'blue' ? 'from-blue-600 to-blue-400' :
                 roadmap.color === 'violet' ? 'from-violet-600 to-violet-400' :
                 roadmap.color === 'emerald' ? 'from-emerald-600 to-emerald-400' :
                 roadmap.color === 'yellow' ? 'from-yellow-600 to-yellow-400' :
                 roadmap.color === 'rose' ? 'from-rose-600 to-rose-400' :
                 roadmap.color === 'cyan' ? 'from-cyan-600 to-cyan-400' :
                 roadmap.color === 'orange' ? 'from-orange-600 to-orange-400' :
                 'from-indigo-600 to-indigo-400'
               }`}
             />
           </div>
        </div>
      </header>

      {/* Completion State */}
      {roadmapProgress.percentage === 100 && (
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-green-500/10 border border-green-500/30 p-8 rounded-3xl text-center space-y-6"
        >
          <div className="flex justify-center"><GraduationIcon className="w-12 h-12 text-white" /></div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Roadmap Completed!</h2>
            <p className="text-gray-400">You've mastered every concept in "{roadmap.title}".</p>
          </div>
          <button 
            onClick={handleDownloadCertificate}
            className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-xl shadow-green-900/20 transition-all"
          >
            Download Roadmap Certificate
          </button>
        </motion.div>
      )}

      {/* Phase List */}
      <div className="space-y-16 relative">
        {/* Vertical Line */}
        <div className="absolute left-6 top-8 bottom-8 w-px bg-surface-700 hidden md:block" />

        {roadmap.phases.map((phase, idx) => (
          <div key={phase.id} className="relative md:pl-20 space-y-6">
            {/* Phase Node */}
            <div className="absolute left-0 top-0 w-12 h-12 rounded-full bg-surface-900 border-2 border-surface-700 flex items-center justify-center font-black text-gray-500 hidden md:flex">
              {idx + 1}
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">{phase.title}</h2>
                  <span className="px-2 py-0.5 rounded bg-surface-800 text-gray-500 text-[10px] font-bold uppercase tracking-widest">{phase.duration}</span>
                </div>
                {/* Start Phase Button */}
                {phase.concepts.some(s => !progress[s]?.exercise_passed) && (
                  <button
                    onClick={() => {
                      const firstIncomplete = phase.concepts.find(s => !progress[s]?.exercise_passed)
                      if (firstIncomplete) navigate(`/concept/${firstIncomplete}`)
                    }}
                    className="px-3 py-1 bg-surface-700 hover:bg-surface-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg border border-surface-600 transition-colors"
                  >
                    Start Phase →
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-500 leading-relaxed max-w-xl">{phase.description}</p>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {phase.concepts.map(slug => {
                const concept = concepts.find(c => c.slug === slug)
                const isPassed = progress[slug]?.exercise_passed
                if (!concept) return null
                return (
                  <Link 
                    key={slug} 
                    to={`/concept/${slug}`}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      isPassed ? 'bg-green-500/5 border-green-500/20 grayscale-0' : 'bg-surface-800 border-surface-700 hover:border-surface-700 grayscale'
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-2 h-2 rounded-full ${isPassed ? 'bg-green-500' : 'bg-surface-600'}`} />
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-gray-200 truncate">{concept.title}</div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600 uppercase">
                           <span>{concept.domain}</span>
                           <span>•</span>
                           <span>{concept.difficulty}</span>
                        </div>
                      </div>
                    </div>
                    {isPassed && <span className="text-green-500 font-bold">✓</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sticky Bottom Bar */}
      <AnimatePresence>
        {roadmapProgress.percentage < 100 && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-50"
          >
            <button 
              onClick={handleStartRoadmap}
              className="w-full p-4 bg-white text-black rounded-2xl font-black shadow-2xl flex items-center justify-between group overflow-hidden relative"
            >
              <div className="relative z-10 flex flex-col items-start">
                <span className="text-[10px] uppercase tracking-tighter opacity-60">Continue Roadmap</span>
                <span className="text-sm">NEXT: {concepts.find(c => c.slug === roadmapProgress.nextConcept)?.title}</span>
              </div>
              <span className="relative z-10 text-xl group-hover:translate-x-2 transition-transform">→</span>
              
              {/* Progress Background Accent */}
              <div 
                className={`absolute inset-0 opacity-10 ${
                  roadmap.color === 'blue' ? 'bg-blue-600' :
                  roadmap.color === 'violet' ? 'bg-violet-600' :
                  roadmap.color === 'emerald' ? 'bg-emerald-600' :
                  roadmap.color === 'yellow' ? 'bg-yellow-600' :
                  roadmap.color === 'rose' ? 'bg-rose-600' :
                  roadmap.color === 'cyan' ? 'bg-cyan-600' :
                  roadmap.color === 'orange' ? 'bg-orange-600' : 'bg-indigo-600'
                }`}
                style={{ width: `${roadmapProgress.percentage}%` }}
              />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
