import { create } from 'zustand'
import { persist } from 'zustand/middleware'

async function getEmail() {
  try {
    const mod = await import('./authStore.js')
    return mod.useAuthStore.getState().user?.email || null
  } catch {
    return null
  }
}

let syncTimeout = null
function debouncedSync(get) {
  clearTimeout(syncTimeout)
  syncTimeout = setTimeout(() => get().syncToServer(), 2000)
}
export const useProgressStore = create(
  persist(
    (set, get) => ({
      // Record<slug, ConceptProgress>
      progress: {},
      interacted_concepts: [], // persisted
      completion_dates: {},    // Record<domain, timestamp>
      show_support_modal: false, // not persisted (triggered in session)
      leaderboard_opted_in: null, // null = not asked, true = opted in, false = declined
      active_roadmap_slug: null,  // slug of the currently followed roadmap
      streak: { count: 0, last_date: null },

      markViewed(slug) {
        set((state) => {
          const today = new Date().toISOString().split('T')[0]
          let nextStreak = { ...state.streak }

          if (state.streak.last_date !== today) {
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)
            const yesterdayStr = yesterday.toISOString().split('T')[0]
            
            if (state.streak.last_date === yesterdayStr) {
              nextStreak.count += 1
            } else {
              nextStreak.count = 1
            }
            nextStreak.last_date = today
          }

          return {
            streak: nextStreak,
            progress: {
              ...state.progress,
              [slug]: {
                ...state.progress[slug],
                viewed: true,
                last_seen: Date.now(),
              },
            },
          }
        })
        debouncedSync(get)
      },

      incrementInteractions() {
        const hasCompletedSupport = localStorage.getItem('completed_support') === 'true'
        if (hasCompletedSupport) return
        const current = parseInt(localStorage.getItem('lbf_interactions') || '0', 10)
        const next = current + 1
        localStorage.setItem('lbf_interactions', String(next))
        if (next >= 5) {
          set({ show_support_modal: true })
        }
      },

      recordAttempt(slug, passed) {
        get().incrementInteractions()

        set((state) => {
          const prev = state.progress[slug] ?? {}
          const newInteracted = [...state.interacted_concepts]
          if (!newInteracted.includes(slug)) {
            newInteracted.push(slug)
          }

          const passedCount = Object.values(state.progress).filter(p => p.exercise_passed).length + (passed ? 1 : 0)
          const shouldPromptLeaderboard = state.leaderboard_opted_in === null && passedCount === 10

          const nextProgress = {
            ...state.progress,
            [slug]: {
              ...prev,
              exercise_attempts: (prev.exercise_attempts ?? 0) + 1,
              exercise_passed: prev.exercise_passed || passed,
              last_seen: Date.now(),
            },
          }

          if (state.leaderboard_opted_in === true && passed) {
            get().syncLeaderboard(nextProgress)
          }

          return {
            interacted_concepts: newInteracted,
            leaderboard_prompt_pending: shouldPromptLeaderboard,
            progress: nextProgress
          }
        })
        debouncedSync(get)
      },

      setLeaderboardOptIn(optedIn, userData = {}) {
        set({ leaderboard_opted_in: optedIn, leaderboard_prompt_pending: false })
        if (optedIn) {
           get().syncLeaderboard(get().progress, userData)
        }
      },

      setActiveRoadmap: (slug) => set({ active_roadmap_slug: slug }),

      getRoadmapProgress: (roadmap) => {
        if (!roadmap) return null
        const progress = get().progress
        const allConcepts = roadmap.phases.flatMap(p => p.concepts)
        const total = allConcepts.length
        const completed = allConcepts.filter(slug => progress[slug]?.exercise_passed).length
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
        
        let nextConcept = null
        for (const slug of allConcepts) {
          if (!progress[slug]?.exercise_passed) {
            nextConcept = slug
            break
          }
        }
        
        return { completed, total, percentage, nextConcept }
      },

      async syncLeaderboard(progressData, userData = {}) {
        const { streak } = get()
        const passedCount = Object.values(progressData).filter(p => p.exercise_passed).length
        
        // This requires authStore info which we'll pass in from the component 
        // OR we can just use the provided userData if syncing for the first time.
        // For auto-sync, we'll need to fetch authStore state.
        // Since we can't easily access other stores' state directly in the middle of an action 
        // with standard Zustand (without 'get' of that store), we'll pass it from the component.
        
        if (!userData.email) return // skip if no info provided yet

        try {
          fetch('/api/v1/leaderboard/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...userData,
              concepts_passed: passedCount,
              streak: streak.count,
              opted_in: true
            })
          })
        } catch (err) {
          console.error('Failed to sync leaderboard', err)
        }
      },

      dismissSupportModal() {
        set({ show_support_modal: false })
      },

      async syncToServer() {
        const email = await getEmail()
        if (!email) return
        const { progress, interacted_concepts, completion_dates, streak, leaderboard_opted_in, active_roadmap_slug } = get()
        try {
          await fetch('/api/v1/progress', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ progress, interacted_concepts, completion_dates, streak, leaderboard_opted_in, active_roadmap_slug })
          })
        } catch {}
      },

      async syncFromServer() {
        const email = await getEmail()
        if (!email) return
        try {
          const res = await fetch('/api/v1/progress')
          if (res.ok) {
            const serverData = await res.json()
            const localPassed = Object.values(get().progress).filter(p => p.exercise_passed).length
            const serverPassed = Object.values(serverData.progress || {}).filter(p => p.exercise_passed).length
            if (serverPassed > localPassed) {
              set({
                progress: serverData.progress || {},
                interacted_concepts: serverData.interacted_concepts || [],
                completion_dates: serverData.completion_dates || {},
                streak: serverData.streak || { count: 0, last_date: null },
                leaderboard_opted_in: serverData.leaderboard_opted_in ?? null,
                active_roadmap_slug: serverData.active_roadmap_slug || null,
              })
            }
          }
        } catch {}
      },

      setConfidence(slug, confidence) {
        set((state) => ({
          progress: {
            ...state.progress,
            [slug]: {
              ...state.progress[slug],
              confidence,
            },
          },
        }))
      },

      getProgress(slug) {
        return get().progress[slug] ?? {}
      },

      /** Concepts seen but never exercised */
      getUnexercised() {
        const { progress } = get()
        return Object.entries(progress)
          .filter(([, p]) => p.viewed && !p.exercise_attempts)
          .map(([slug]) => slug)
      },

      /** Concepts failed on first attempt */
      getFailedFirst() {
        const { progress } = get()
        return Object.entries(progress)
          .filter(([, p]) => p.exercise_attempts === 1 && !p.exercise_passed)
          .map(([slug]) => slug)
      },

      /** Concepts not visited in 7+ days */
      getStale() {
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
        const { progress } = get()
        return Object.entries(progress)
          .filter(([, p]) => p.viewed && p.last_seen < cutoff)
          .map(([slug]) => slug)
      },

      /**
       * Per-domain completion summary.
       * @param {Array<{slug:string, domain:string}>} concepts — full concept list from conceptStore
       * @returns Record<domain, { total, viewed, passed }>
       */
      getSummaryByDomain(concepts) {
        const { progress } = get()
        const summary = {}
        for (const { slug, domain } of concepts) {
          if (!summary[domain]) summary[domain] = { total: 0, viewed: 0, passed: 0 }
          summary[domain].total++
          const p = progress[slug] ?? {}
          if (p.viewed)           summary[domain].viewed++
          if (p.exercise_passed)  summary[domain].passed++
        }
        return summary
      },

      /**
       * Returns a list of domains where ALL concepts have been passed.
       * Also updates completion_dates if a new completion is detected.
       */
      getCompletedDomains(concepts) {
        const { progress, completion_dates } = get()
        const domains = [...new Set(concepts.map(c => c.domain))]
        const completed = []
        const newDates = { ...completion_dates }
        let changed = false

        for (const d of domains) {
          const domainConcepts = concepts.filter(c => c.domain === d)
          const isComplete = domainConcepts.length > 0 && domainConcepts.every(c => progress[c.slug]?.exercise_passed)
          
          if (isComplete) {
            completed.push(d)
            if (!newDates[d]) {
              newDates[d] = Date.now()
              changed = true
            }
          }
        }

        if (changed) {
          set({ completion_dates: newDates })
        }

        return completed
      },
    }),
    { name: 'learnblazinglyfast-progress' }
  )
)
