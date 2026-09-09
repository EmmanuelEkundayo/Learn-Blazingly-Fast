import { useState, useMemo, useRef, useEffect } from 'react'
import { useParams, Link } from 'react-router'
import { motion } from 'framer-motion'
import { Download } from 'lucide-react'
import cheatsheets from '../data/cheatsheets/index.js'
import { highlight } from '../utils/codeHighlight.js'
import { SheetIcon, CheckIcon } from '../components/ui/Icons.jsx'
import { useProgressStore } from '../store/progressStore.js'
import { generateCheatsheetPdf } from '../utils/generateCheatsheetPdf.js'
import SEO from '../components/ui/SEO.jsx'
import { getCheatsheetMeta } from '../utils/seo'

// ─── accent map (same as browse page) ────────────────────────────────────────
const accentMap = {
  orange:  { border: 'border-orange-500/30', text: 'text-orange-400',  badge: 'bg-orange-500/15 text-orange-300', btn: 'bg-orange-600 hover:bg-orange-500', active: 'bg-orange-500/20 text-orange-300 border-l-2 border-orange-400' },
  blue:    { border: 'border-blue-500/30',   text: 'text-blue-400',    badge: 'bg-blue-500/15 text-blue-300',     btn: 'bg-blue-600 hover:bg-blue-500',     active: 'bg-blue-500/20 text-blue-300 border-l-2 border-blue-400' },
  yellow:  { border: 'border-yellow-500/30', text: 'text-yellow-400',  badge: 'bg-yellow-500/15 text-yellow-300', btn: 'bg-yellow-600 hover:bg-yellow-500', active: 'bg-yellow-500/20 text-yellow-300 border-l-2 border-yellow-400' },
  emerald: { border: 'border-emerald-500/30',text: 'text-emerald-400', badge: 'bg-emerald-500/15 text-emerald-300',btn: 'bg-emerald-600 hover:bg-emerald-500',active: 'bg-emerald-500/20 text-emerald-300 border-l-2 border-emerald-400' },
  violet:  { border: 'border-violet-500/30', text: 'text-violet-400',  badge: 'bg-violet-500/15 text-violet-300', btn: 'bg-violet-600 hover:bg-violet-500', active: 'bg-violet-500/20 text-violet-300 border-l-2 border-violet-400' },
  rose:    { border: 'border-rose-500/30',   text: 'text-rose-400',    badge: 'bg-rose-500/15 text-rose-300',     btn: 'bg-rose-600 hover:bg-rose-500',     active: 'bg-rose-500/20 text-rose-300 border-l-2 border-rose-400' },
}

// ─── CodeBlock ────────────────────────────────────────────────────────────────
function CodeBlock({ item, badge }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(item.code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const html = useMemo(() => highlight(item.code, item.language || 'text'), [item.code, item.language])

  return (
    <div className="rounded-xl border border-gray-700/60 bg-gray-900 overflow-hidden mb-3">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-700/40">
        <span className="text-sm font-medium text-gray-300">{item.label}</span>
        <div className="flex items-center gap-2">
          {item.language && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${badge}`}>
              {item.language}
            </span>
          )}
          <button
            onClick={copy}
            className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-0.5 rounded hover:bg-gray-700"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Code */}
      <pre className="p-3 text-sm leading-relaxed overflow-x-auto font-mono">
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>

      {/* Note */}
      {item.note && (
        <p className="px-3 pb-2 text-xs text-gray-400 italic">{item.note}</p>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CheatSheet() {
  const { id } = useParams()
  const sheet = cheatsheets.find(s => s.id === id)
  const [query, setQuery] = useState('')
  const [activeSection, setActiveSection] = useState(0)
  const [copiedAll, setCopiedAll] = useState(false)
  const [exporting, setExporting] = useState(false)
  const sectionRefs = useRef([])
  const contentRef = useRef(null)
  const incrementInteractions = useProgressStore(s => s.incrementInteractions)

  useEffect(() => { incrementInteractions() }, [incrementInteractions])

  const a = accentMap[sheet?.color] ?? accentMap.blue

  // ── filtered results ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!sheet) return []
    const q = query.trim().toLowerCase()
    if (!q) return sheet.sections
    return sheet.sections
      .map(sec => ({
        ...sec,
        items: sec.items.filter(
          it =>
            it.label.toLowerCase().includes(q) ||
            it.code.toLowerCase().includes(q) ||
            (it.note && it.note.toLowerCase().includes(q))
        ),
      }))
      .filter(sec => sec.items.length > 0)
  }, [sheet, query])

  const totalResults = useMemo(() => filtered.reduce((n, s) => n + s.items.length, 0), [filtered])

  // ── copy all ──────────────────────────────────────────────────────────────
  function copyAll() {
    if (!sheet) return
    const text = sheet.sections
      .map(sec => `## ${sec.title}\n\n` + sec.items.map(it => `### ${it.label}\n${it.code}`).join('\n\n'))
      .join('\n\n---\n\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 2000)
    })
  }

  async function handleExportPdf() {
    if (!contentRef.current) return
    setExporting(true)
    try {
      await generateCheatsheetPdf(contentRef.current, sheet.title)
    } finally {
      setExporting(false)
    }
  }

  // ── scroll spy ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (query) return // disable spy during search
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const idx = sectionRefs.current.indexOf(e.target)
            if (idx !== -1) setActiveSection(idx)
          }
        })
      },
      { rootMargin: '-20% 0px -70% 0px' }
    )
    sectionRefs.current.forEach(el => el && observer.observe(el))
    return () => observer.disconnect()
  }, [sheet, query])

  // ── scroll to section ────────────────────────────────────────────────────
  function scrollTo(idx) {
    sectionRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveSection(idx)
  }

  if (!sheet) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-lg mb-4">Cheat sheet not found.</p>
          <Link to="/cheatsheets" className="text-blue-400 hover:underline">← Back to Cheat Sheets</Link>
        </div>
      </div>
    )
  }

  return (
    <>
    <SEO {...getCheatsheetMeta(sheet)} />
    <div className="min-h-screen bg-gray-950">
      {/* ── Header ── */}
      <div className="border-b border-gray-800 bg-gray-900/60 backdrop-blur px-4 py-4">
        <div className="max-w-6xl mx-auto space-y-3">
          {/* Row 1: back + actions */}
          <div className="flex items-center gap-3">
            <Link to="/cheatsheets" className="text-gray-400 hover:text-gray-300 text-sm shrink-0">
              ← Back
            </Link>
            <div className="ml-auto flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-8 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 w-36 sm:w-48"
                />
                <svg className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                {query && (
                  <button onClick={() => setQuery('')} className="absolute right-2 top-1.5 text-gray-400 hover:text-gray-300 text-xs">✕</button>
                )}
              </div>
              <button
                onClick={copyAll}
                className={`text-xs sm:text-sm font-medium px-3 py-1.5 rounded-lg text-white transition-colors shrink-0 ${a.btn}`}
              >
                {copiedAll ? 'Copied!' : 'Copy All'}
              </button>
              <button
                onClick={handleExportPdf}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 bg-surface-800 hover:bg-surface-700 border border-surface-600 rounded-xl text-sm text-gray-300 hover:text-white transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                {exporting ? 'Exporting…' : 'Export PDF'}
              </button>
            </div>
          </div>

          {/* Row 2: icon + title + description */}
          <div className="flex items-start gap-3">
            <span className={`shrink-0 ${a.text}`}><SheetIcon id={sheet.id} className="w-7 h-7 sm:w-8 sm:h-8" /></span>
            <div>
              <h1 className={`text-xl sm:text-2xl font-bold ${a.text}`}>{sheet.title}</h1>
              <p className="text-gray-400 text-xs sm:text-sm">{sheet.description}</p>
            </div>
          </div>

          {/* Result count */}
          {query && (
            <p className="text-xs text-gray-400">
              {totalResults} result{totalResults !== 1 ? 's' : ''} for "{query}"
            </p>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        {/* ── Sidebar (desktop) ── */}
        <aside className="hidden lg:block w-52 shrink-0">
          <nav className="sticky top-20 flex flex-col gap-0.5 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 px-2">Sections</p>
            {sheet.sections.map((sec, i) => (
              <button
                key={i}
                onClick={() => scrollTo(i)}
                className={`text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${
                  !query && activeSection === i
                    ? a.active
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {sec.title}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Mobile section dropdown ── */}
        <div className="lg:hidden w-full mb-4 absolute" style={{ display: 'contents' }}>
          {/* rendered inline above main via a portal-like trick — keep it simple: rendered before sections below */}
        </div>

        {/* ── Main content ── */}
        <main ref={contentRef} className="flex-1 min-w-0">
          {/* Mobile dropdown */}
          <div className="lg:hidden mb-4">
            <select
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none"
              value={activeSection}
              onChange={e => scrollTo(Number(e.target.value))}
            >
              {sheet.sections.map((sec, i) => (
                <option key={i} value={i}>{sec.title}</option>
              ))}
            </select>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              No results for "{query}"
            </div>
          )}

          {filtered.map((sec, si) => {
            // When searching, find real index for ref placement
            const realIdx = sheet.sections.findIndex(s => s.title === sec.title)
            return (
              <motion.section
                key={sec.title}
                ref={el => { if (!query) sectionRefs.current[realIdx] = el }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: si * 0.04 }}
                className="mb-10"
              >
                <h2 className={`text-lg font-bold mb-4 ${a.text}`}>{sec.title}</h2>
                {sec.items.map((item, ii) => (
                  <CodeBlock key={ii} item={item} badge={a.badge} />
                ))}
              </motion.section>
            )
          })}
        </main>
      </div>
    </div>
    </>
  )
}
