import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router'
import SupportModal from './SupportModal'
import SearchPalette from './SearchPalette.jsx'
import AdminReviewModal from './AdminReviewModal.jsx'
import { useState, useEffect, Suspense } from 'react'
import { toast } from 'react-hot-toast'
import { useProgressStore } from '../../store/progressStore.js'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail } from 'lucide-react'
import {
  GridIcon, CodeIcon, MapIcon, BookIcon, RefreshIcon,
  ZapIcon, EditIcon, TrophyIcon, AwardIcon, MessageIcon, PartyIcon
} from './Icons.jsx'

// ─── Navigation structure ─────────────────────────────────────────────────────
// Primary links shown in desktop nav bar (most used)
const PRIMARY_LINKS = [
  { to: '/browse',      label: 'Browse'      },
  { to: '/projects',    label: 'Projects'    },
  { to: '/roadmaps',    label: 'Roadmaps'    },
  { to: '/cheatsheets', label: 'Cheat Sheets'},
  { to: '/math',        label: 'Math'        },
  { to: '/review',      label: 'Review'      },
  { to: '/playground',  label: 'Playground'  },
]

// Secondary links shown only in mobile drawer (and also accessible via drawer on desktop)
const MORE_LINKS = [
  { to: '/notes',        label: 'Notes'        },
  { to: '/leaderboard',  label: 'Leaderboard'  },
  { to: '/certificates', label: 'Certificates' },
  { to: '/testimonials', label: 'Testimonials' },
]

const ALL_LINKS = [...PRIMARY_LINKS, ...MORE_LINKS]

export default function Layout() {
  const [isSearchOpen, setIsSearchOpen]   = useState(false)
  const [isMobileOpen, setIsMobileOpen]   = useState(false)
  const [isAdminOpen, setIsAdminOpen]     = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const leaderboardPromptPending = useProgressStore(s => s.leaderboard_prompt_pending)
  const setLeaderboardOptIn = useProgressStore(s => s.setLeaderboardOptIn)

  useEffect(() => { setIsMobileOpen(false) }, [location.pathname])

  // Close mobile menu on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setIsMobileOpen(false) }
    if (isMobileOpen) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isMobileOpen])

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isMobileOpen])

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen(true)
      }
      if (e.ctrlKey && e.altKey && e.key === 'o') {
        e.preventDefault()
        setIsAdminOpen(open => !open)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!leaderboardPromptPending) return
    toast((t) => (
        <div className="flex flex-col gap-3 p-1">
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 font-bold text-white">You've completed 10 concepts! <PartyIcon className="w-4 h-4 text-yellow-400" /></p>
            <p className="text-gray-400">Join the public leaderboard to track your rank.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                toast.dismiss(t.id)
                setLeaderboardOptIn(false)
                navigate('/leaderboard')
              }}
              className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs rounded-lg font-bold hover:bg-blue-500 transition-colors"
            >
              Join
            </button>
            <button
              onClick={() => { toast.dismiss(t.id); setLeaderboardOptIn(false) }}
              className="flex-1 px-3 py-2 bg-surface-700 text-gray-300 rounded-lg font-bold hover:bg-surface-600"
            >
              No thanks
            </button>
          </div>
        </div>
    ), {
      duration: 20000,
      position: 'bottom-right',
      style: { background: '#171717', color: '#fff', border: '1px solid #262626', borderRadius: '16px', padding: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,.5)' },
    })
  }, [leaderboardPromptPending, setLeaderboardOptIn, navigate])

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-surface-700 bg-surface-900/95 backdrop-blur-md">
        <nav className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">

          {/* Logo */}
          <Link to="/" className="text-lg font-bold tracking-tight select-none shrink-0 mr-4">
            <span className="text-dsa-500">Learn</span>
            <span className="text-ml-500"> Blazingly</span>
            <span className="text-white hidden sm:inline"> Fast</span>
          </Link>

          {/* Desktop nav - hidden on mobile */}
          <div className="hidden lg:flex items-center gap-0.5 flex-1">
            {PRIMARY_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-surface-700 text-white'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-surface-800'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}

            {/* More dropdown */}
            <MoreDropdown links={MORE_LINKS} />
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1 ml-auto lg:ml-2">
            {/* Search button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-400 hover:text-gray-300 hover:bg-surface-800 transition-colors"
              title="Search (Ctrl+K)"
            >
              <SearchIcon className="w-4 h-4" />
              <span className="hidden sm:inline text-gray-400 font-mono">Ctrl+K</span>
            </button>

            {/* Hamburger - mobile only */}
            <button
              onClick={() => setIsMobileOpen(v => !v)}
              className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-gray-300 hover:bg-surface-800 transition-colors"
              aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileOpen}
            >
              {isMobileOpen ? <XIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
            </button>
          </div>
        </nav>
      </header>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsMobileOpen(false)}
            />

            {/* Drawer panel */}
            <motion.div
              key="drawer"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="lg:hidden fixed top-14 left-0 right-0 z-40 bg-surface-900 border-surface-700 shadow-2xl"
            >
              <div className="max-w-7xl mx-auto px-4 py-4">
                {/* Nav links in 2-column grid */}
                <div className="grid grid-cols-2 gap-1 mb-4">
                  {ALL_LINKS.map(({ to, label }) => (
                    <NavLink
                      key={to}
                      to={to}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-surface-700 text-white'
                            : 'text-gray-300 hover:text-white hover:bg-surface-800'
                        }`
                      }
                    >
                      <span className="w-4 h-4 flex items-center justify-center shrink-0">{NAV_ICON_COMPONENT[to]}</span>
                      {label}
                    </NavLink>
                  ))}
                </div>

                {/* Search shortcut */}
                <button
                  onClick={() => { setIsMobileOpen(false); setIsSearchOpen(true) }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-800 border border-surface-700 text-gray-400 hover:text-white transition-colors"
                >
                  <SearchIcon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">Search everything…</span>
                  <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-surface-700 border border-surface-600 font-mono">Ctrl+K</kbd>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1">
        <SearchPalette isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        <SupportModal />
        <AdminReviewModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="bg-surface-900 border-surface-700 py-10 px-6 text-gray-400">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8 md:gap-0 md:justify-between">
            {/* Left */}
            <div>
              <p className="font-bold text-white mb-1">Learn Blazingly Fast</p>
              <p className="text-gray-400 mb-2">Built for developers who learn fast.</p>
              <a
                href="https://learnblazinglyfast.tech"
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                learnblazinglyfast.tech
              </a>
            </div>

            {/* Center */}
            <div>
              <p className="uppercase tracking-wider text-gray-400 mb-3">Explore</p>
              <div className="flex flex-col gap-1.5">
                {[
                  ['/browse',       'Concepts'],
                  ['/projects',     'Projects'],
                  ['/playground',   'Playground'],
                  ['/cheatsheets',  'Cheat Sheets'],
                  ['/math',         'Math Tricks'],
                  ['/roadmaps',     'Roadmaps'],
                  ['/leaderboard',  'Leaderboard'],
                  ['/certificates', 'Certificates'],
                  ['/notes',        'Notes'],
                ].map(([to, label]) => (
                  <Link key={to} to={to} className="hover:text-white transition-colors">
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right */}
            <div>
              <p className="uppercase tracking-wider text-gray-400 mb-3">Get in touch</p>
              <p className="text-gray-400 mb-3">Found a bug or have feedback?</p>
              <div className="flex flex-col gap-2">
                <a
                  href="mailto:emmanuelekundayo1234@gmail.com"
                  className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Mail size={14} />
                  emmanuelekundayo1234@gmail.com
                </a>
                <a
                  href="https://x.com/ekunday00"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <XSocialIcon />
                  @ekunday00
                </a>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-surface-700 mt-6 pt-4 flex flex-col md:flex-row items-center justify-between gap-2 text-gray-400">
            <span>© 2026 Learn Blazingly Fast. All rights reserved.</span>
            <span>
              Built with love by{' '}
              <a
                href="https://x.com/ekunday00"
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                Emma
              </a>{' '}
              ♥
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ─── Suspense fallback shown while a lazy route chunk loads ───────────────────
function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-label="Loading">
      <div className="w-6 h-6 border-surface-600 border-t-white rounded-full animate-spin" />
    </div>
  )
}

// ─── Nav icons for mobile drawer ─────────────────────────────────────────────
const NAV_ICON_COMPONENT = {
  '/browse':       <GridIcon    className="w-4 h-4" />,
  '/projects':     <CodeIcon    className="w-4 h-4" />,
  '/roadmaps':     <MapIcon     className="w-4 h-4" />,
  '/cheatsheets':  <BookIcon    className="w-4 h-4" />,
  '/math':         <MathNavIcon className="w-4 h-4" />,
  '/review':       <RefreshIcon className="w-4 h-4" />,
  '/playground':   <ZapIcon     className="w-4 h-4" />,
  '/notes':        <EditIcon    className="w-4 h-4" />,
  '/leaderboard':  <TrophyIcon  className="w-4 h-4" />,
  '/certificates': <AwardIcon   className="w-4 h-4" />,
  '/testimonials': <MessageIcon className="w-4 h-4" />,
}

// ─── More dropdown (desktop) ─────────────────────────────────────────────────
function MoreDropdown({ links }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  // Close on route change
  useEffect(() => { setOpen(false) }, [location.pathname])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (!e.target.closest('[data-more-menu]')) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const anyActive = links.some(l => location.pathname === l.to)

  return (
    <div className="relative" data-more-menu>
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          anyActive
            ? 'bg-surface-700 text-white'
            : 'text-gray-400 hover:text-gray-200 hover:bg-surface-800'
        }`}
      >
        More
        <svg className={`w-3 h-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1.5 w-44 bg-surface-800 border border-surface-700 rounded-xl shadow-2xl overflow-hidden z-50 p-1"
          >
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-surface-700 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-surface-700/70'
                  }`
                }
              >
                <span className="w-4 h-4 flex items-center justify-center shrink-0">{NAV_ICON_COMPONENT[to]}</span>
                {label}
              </NavLink>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Icons ───────────────────────────────────────────────────────────────────
function SearchIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="6.5" cy="6.5" r="4.5" />
      <path d="M10 10l3 3" strokeLinecap="round" />
    </svg>
  )
}

function MenuIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  )
}

function XIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

function MathNavIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h3l2 8 2-5 1.5 3H14" />
      <path d="M11 4l-2 2 2 2" />
    </svg>
  )
}

function XSocialIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.626L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
    </svg>
  )
}
