/**
 * Theme palettes for TikTok & Shorts Exporter and Share Cards.
 * Aligns with the core domain color tokens in tailwind.config.js and the site UI:
 * - DSA Blue (#3b82f6)
 * - Frontend Violet (#8b5cf6)
 * - Backend Emerald (#10b981)
 * - ML Amber (#f59e0b)
 * - Software Engineering Rose (#f43f5e)
 * - AI Cyan (#06b6d4)
 * - Electric Sky (#38bdf8)
 */

export const EXPORT_THEMES = [
  {
    id: 'dsa',
    name: 'DSA Blue',
    domain: 'DSA',
    primary: '#3b82f6',
    secondary: '#60a5fa',
    accentText: 'text-blue-400',
    border: 'border-blue-500',
    bg: 'bg-blue-600',
    glow: 'rgba(59, 130, 246, 0.35)',
  },
  {
    id: 'frontend',
    name: 'Frontend Violet',
    domain: 'Frontend',
    primary: '#8b5cf6',
    secondary: '#a78bfa',
    accentText: 'text-purple-400',
    border: 'border-purple-500',
    bg: 'bg-purple-600',
    glow: 'rgba(139, 92, 246, 0.35)',
  },
  {
    id: 'backend',
    name: 'Backend Emerald',
    domain: 'Backend',
    primary: '#10b981',
    secondary: '#34d399',
    accentText: 'text-emerald-400',
    border: 'border-emerald-500',
    bg: 'bg-emerald-600',
    glow: 'rgba(16, 185, 129, 0.35)',
  },
  {
    id: 'ml',
    name: 'ML Amber',
    domain: 'ML',
    primary: '#f59e0b',
    secondary: '#fbbf24',
    accentText: 'text-amber-400',
    border: 'border-amber-500',
    bg: 'bg-amber-600',
    glow: 'rgba(245, 158, 11, 0.35)',
  },
  {
    id: 'se',
    name: 'SE Rose',
    domain: 'Software Engineering',
    primary: '#f43f5e',
    secondary: '#fb7185',
    accentText: 'text-rose-400',
    border: 'border-rose-500',
    bg: 'bg-rose-600',
    glow: 'rgba(244, 63, 94, 0.35)',
  },
  {
    id: 'ai',
    name: 'AI Cyan',
    domain: 'AI',
    primary: '#06b6d4',
    secondary: '#22d3ee',
    accentText: 'text-cyan-400',
    border: 'border-cyan-500',
    bg: 'bg-cyan-600',
    glow: 'rgba(6, 182, 212, 0.35)',
  },
  {
    id: 'sky',
    name: 'Electric Sky',
    domain: 'All',
    primary: '#38bdf8',
    secondary: '#7dd3fc',
    accentText: 'text-sky-400',
    border: 'border-sky-500',
    bg: 'bg-sky-600',
    glow: 'rgba(56, 189, 248, 0.35)',
  },
]

/**
 * Returns the theme matching a concept's domain or category.
 */
export function getInitialThemeForConcept(concept) {
  if (!concept) return EXPORT_THEMES[0]
  const domain = (concept?.domain || '').toLowerCase().trim()
  const category = (concept?.category || '').toLowerCase().trim()
  const slug = (concept?.slug || '').toLowerCase().trim()

  if (domain === 'ai' || domain.includes('artificial') || domain.includes('intelligence') || domain.includes('agent') || domain.includes('gpt') || domain.includes('transformer') || category.includes('ai')) {
    return EXPORT_THEMES.find(t => t.id === 'ai') || EXPORT_THEMES[5]
  }
  if (domain.includes('front') || domain.includes('react') || domain.includes('css') || domain.includes('ui') || category.includes('frontend') || category.includes('react') || slug.includes('react') || slug.includes('component') || slug.includes('lifecycle')) {
    return EXPORT_THEMES.find(t => t.id === 'frontend') || EXPORT_THEMES[1]
  }
  if (domain.includes('back') || domain.includes('node') || domain.includes('db') || domain.includes('sql') || domain.includes('system') || category.includes('backend')) {
    return EXPORT_THEMES.find(t => t.id === 'backend') || EXPORT_THEMES[2]
  }
  if (domain === 'dsa' || domain.includes('struct') || domain.includes('algo') || category.includes('dsa') || category.includes('algorithms')) {
    return EXPORT_THEMES.find(t => t.id === 'dsa') || EXPORT_THEMES[0]
  }
  if (domain === 'ml' || domain.includes('machine') || domain.includes('data science') || category.includes('machine-learning') || domain.includes('deep learning')) {
    return EXPORT_THEMES.find(t => t.id === 'ml') || EXPORT_THEMES[3]
  }
  if (domain.includes('soft') || domain.includes('eng') || domain.includes('clean') || domain.includes('design') || domain.includes('business') || category.includes('architecture')) {
    return EXPORT_THEMES.find(t => t.id === 'se') || EXPORT_THEMES[4]
  }
  return EXPORT_THEMES[0] // DSA Blue
}
