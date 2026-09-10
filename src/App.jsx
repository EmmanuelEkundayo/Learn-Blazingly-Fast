import { useEffect, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router'
import { Toaster } from 'react-hot-toast'
import ErrorBoundary from './components/ui/ErrorBoundary.jsx'
import OnboardingTrigger from './components/ui/OnboardingTrigger.jsx'
import Layout from './components/ui/Layout.jsx'
import { useConceptStore } from './store/conceptStore.js'
import { useProjectStore } from './store/projectStore.js'
import { initAnalytics } from './services/analytics.js'
import concepts from './data/concepts/index.js'
import projects from './data/projects/index.js'

// Route components are lazy-loaded so heavy per-route deps (Monaco, D3) split
// into their own chunks instead of bloating the initial bundle. The Suspense
// boundary lives in Layout, around <Outlet />, so the nav/footer stay put.
const Home         = lazy(() => import('./pages/Home.jsx'))
const Concept      = lazy(() => import('./pages/Concept.jsx'))
const Browse       = lazy(() => import('./pages/Browse.jsx'))
const Review       = lazy(() => import('./pages/Review.jsx'))
const Playground   = lazy(() => import('./pages/Playground.jsx'))
const Projects     = lazy(() => import('./pages/Projects.jsx'))
const Project      = lazy(() => import('./pages/Project.jsx'))
const Testimonials = lazy(() => import('./pages/Testimonials.jsx'))
const Certificates = lazy(() => import('./pages/Certificates.jsx'))
const Notes        = lazy(() => import('./pages/Notes.jsx'))
const Leaderboard  = lazy(() => import('./pages/Leaderboard.jsx'))
const Roadmaps     = lazy(() => import('./pages/Roadmaps.jsx'))
const Roadmap      = lazy(() => import('./pages/Roadmap.jsx'))
const CheatSheets  = lazy(() => import('./pages/CheatSheets.jsx'))
const CheatSheet   = lazy(() => import('./pages/CheatSheet.jsx'))
const MathTricks   = lazy(() => import('./pages/MathTricks.jsx'))
const MathTrick    = lazy(() => import('./pages/MathTrick.jsx'))
const Stats        = lazy(() => import('./pages/Stats.jsx'))

export default function App() {
  const setConcepts = useConceptStore(s => s.setConcepts)
  const setProjects = useProjectStore(s => s.setProjects)
  useEffect(() => {
    initAnalytics()
  }, [])

  useEffect(() => { 
    async function loadData() {
      try {
        const conceptPromises = Object.values(concepts).map(load => load())
        const conceptModules = await Promise.all(conceptPromises)
        const conceptData = conceptModules.map(m => m.default ?? m)
        setConcepts(conceptData)

        const projectPromises = Object.values(projects).map(load => load())
        const projectModules = await Promise.all(projectPromises)
        const projectData = projectModules.map(m => m.default ?? m)
        setProjects(projectData)
      } catch (err) {
        console.error('Failed to load data:', err)
      }
    }
    loadData()
  }, [setConcepts, setProjects])

  return (
    <ErrorBoundary>
      <Toaster position="top-center" />
      <OnboardingTrigger />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/"                element={<Home />} />
          <Route path="/concept/:slug"   element={<Concept />} />
          <Route path="/concepts/:slug"  element={<Concept />} />
          <Route path="/concepts"        element={<Navigate to="/browse" replace />} />
          <Route path="/browse"          element={<Browse />} />
          <Route path="/projects"        element={<Projects />} />
          <Route path="/project/:slug"   element={<Project />} />
          <Route path="/review"          element={<Review />} />
          <Route path="/playground"      element={<Playground />} />
          <Route path="/testimonials"    element={<Testimonials />} />
          <Route path="/certificates"    element={<Certificates />} />
          <Route path="/notes"           element={<Notes />} />
          <Route path="/leaderboard"     element={<Leaderboard />} />
          <Route path="/roadmaps"        element={<Roadmaps />} />
          <Route path="/roadmaps/:slug"  element={<Roadmap />} />
          <Route path="/cheatsheets"     element={<CheatSheets />} />
          <Route path="/cheatsheets/:id" element={<CheatSheet />} />
          <Route path="/math"            element={<MathTricks />} />
          <Route path="/math/:slug"      element={<MathTrick />} />
          <Route path="/stats"           element={<Stats />} />
          <Route path="/analytics"       element={<Navigate to="/stats" replace />} />
          <Route path="*"                element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  )
}
