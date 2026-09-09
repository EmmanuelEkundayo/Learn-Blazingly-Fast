import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { Editor } from '@monaco-editor/react'
import { useProjectStore } from '../store/projectStore.js'
import { useConceptStore } from '../store/conceptStore.js'
import { useProgressStore } from '../store/progressStore.js'
import SEO from '../components/ui/SEO.jsx'
import { getProjectMeta } from '../utils/seo'

const CAT_COLORS = {
  'Frontend':           'bg-frontend-500/20 text-frontend-400 border-frontend-500/50',
  'Backend':            'bg-backend-500/20 text-backend-400 border-backend-500/50',
  'AI-ML':              'bg-ml-500/20 text-ml-400 border-ml-500/50',
  'Full-stack':         'bg-dsa-500/20 text-dsa-400 border-dsa-500/50',
  'Web Scraping':       'bg-se-500/20 text-se-400 border-se-500/50',
  'Distributed Systems': 'bg-orange-500/20 text-orange-400 border-orange-500/50',
}

const DOMAIN_CHIPS = {
  'DSA':                  'bg-dsa-600/20 text-dsa-400',
  'ML':                   'bg-ml-500/20 text-ml-400',
  'Frontend':             'bg-frontend-500/20 text-frontend-400',
  'Backend':              'bg-backend-500/20 text-backend-400',
  'Software Engineering': 'bg-se-500/20 text-se-400',
}

export default function Project() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const project = useProjectStore(s => s.getProjectBySlug(slug))
  const conceptStore = useConceptStore()
  const incrementInteractions = useProgressStore(s => s.incrementInteractions)

  useEffect(() => { incrementInteractions() }, [incrementInteractions])

  const [activeFileIdx, setActiveFileIdx] = useState(0)

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <p className="text-gray-400">Project not found.</p>
        <Link to="/projects" className="text-violet-400 hover:underline">Back to Projects</Link>
      </div>
    )
  }

  const activeFile = project.files[activeFileIdx]
  const colorClass = CAT_COLORS[project.category] || 'bg-gray-500/20 text-gray-400'

  return (
    <>
    <SEO {...getProjectMeta(project)} />
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
      {/* Header */}
      <div className="space-y-4">
        <button 
          onClick={() => navigate(-1)}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          ← Back
        </button>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${colorClass}`}>
                {project.category}
              </span>
              <span className="text-xs text-gray-500 font-medium">{project.estimated_time}</span>
            </div>
            <h1 className="text-4xl font-bold text-white leading-tight">{project.title}</h1>
            <div className="flex flex-wrap gap-2">
              {project.stack.map(tech => (
                <span key={tech} className="text-xs bg-surface-800 border border-surface-600 px-2 py-1 rounded text-gray-300">
                  {tech}
                </span>
              ))}
            </div>
          </div>
          
          <div className={`px-4 py-2 rounded-xl border ${
            project.difficulty === 'beginner' ? 'bg-green-900/10 border-green-900/50 text-green-400' :
            project.difficulty === 'intermediate' ? 'bg-yellow-900/10 border-yellow-900/50 text-yellow-400' :
            'bg-red-900/10 border-red-900/50 text-red-400'
          }`}>
            <span className="text-xs uppercase tracking-widest font-bold">{project.difficulty} difficulty</span>
          </div>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <Section title="What it is">
            <p className="text-gray-300 leading-relaxed">{project.overview.what}</p>
          </Section>
          
          <Section title="How it works">
            <p className="text-gray-300 leading-relaxed">{project.overview.how_it_works}</p>
          </Section>
        </div>

        <div className="space-y-8">
          <Section title="What you'll learn">
            <ul className="space-y-3">
              {project.overview.what_you_learn.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-400">
                  <span className="text-indigo-500 mt-1">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </Section>

          {project.concepts_used?.length > 0 && (
            <Section title="Concepts Used">
              <div className="flex flex-wrap gap-2">
                {project.concepts_used.map(slug => {
                  const concept = conceptStore.getBySlug(slug)
                  if (!concept) return null
                  return (
                    <Link
                      key={slug}
                      to={`/concept/${slug}`}
                      className={`text-[11px] font-semibold px-2 py-1 rounded transition-colors ${DOMAIN_CHIPS[concept.domain] ?? 'bg-gray-600 text-gray-200'} hover:brightness-125`}
                    >
                      {concept.title}
                    </Link>
                  )
                })}
              </div>
            </Section>
          )}
        </div>
      </div>

      {/* Files & Code */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Project implementation</h2>
        
        <div className="border border-surface-600 rounded-2xl overflow-hidden bg-surface-900">
          {/* Tabs */}
          <div className="flex items-center gap-px bg-surface-700 p-1">
            {project.files.map((file, i) => (
              <button
                key={i}
                onClick={() => setActiveFileIdx(i)}
                className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                  activeFileIdx === i 
                    ? 'bg-surface-900 text-white shadow-sm' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-surface-800'
                }`}
              >
                {file.filename}
              </button>
            ))}
          </div>

          {/* Description */}
          <div className="px-5 py-3 border-b border-surface-700 bg-surface-850/50">
            <p className="text-xs text-gray-400 italic">{activeFile.description}</p>
          </div>

          {/* Monaco Editor */}
          <div className="h-[500px] relative">
            <Editor
              height="100%"
              language={activeFile.language}
              theme="vs-dark"
              value={activeFile.code}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: 'JetBrains Mono',
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                padding: { top: 20 },
                domReadOnly: true,
              }}
            />
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">{title}</h3>
      {children}
    </div>
  )
}
