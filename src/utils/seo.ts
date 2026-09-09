const SITE_NAME = 'Learn Blazingly Fast'
const DEFAULT_DESCRIPTION = 'Master algorithms, system design, and software engineering with interactive visualizations and hands-on exercises.'
const BASE_URL = 'https://learnblazinglyfast.tech'

interface Concept {
  title: string
  slug: string
  domain: string
  category: string
  card?: { intuition?: string }
}

interface Project {
  title: string
  slug: string
  domain?: string
  overview?: { what?: string }
}

interface Cheatsheet {
  title: string
  id: string
  domain?: string
}

interface Roadmap {
  title: string
  slug: string
  description?: string
}

interface PageMeta {
  title: string
  description: string
}

interface ArticleMeta extends PageMeta {
  url: string
  image: string
  type: 'article'
}

export function getConceptMeta(concept: Concept): ArticleMeta {
  return {
    title: `${concept.title} — ${SITE_NAME}`,
    description: concept.card?.intuition?.slice(0, 160) || `${concept.title} — interactive lesson with visualization and exercises.`,
    url: `${BASE_URL}/concept/${concept.slug}`,
    image: `${BASE_URL}/api/og?title=${encodeURIComponent(concept.title)}&domain=${encodeURIComponent(concept.domain)}&category=${encodeURIComponent(concept.category)}`,
    type: 'article',
  }
}

export function getProjectMeta(project: Project): ArticleMeta {
  return {
    title: `${project.title} — ${SITE_NAME}`,
    description: project.overview?.what?.slice(0, 160) || `${project.title} — hands-on project.`,
    url: `${BASE_URL}/project/${project.slug}`,
    image: `${BASE_URL}/api/og?title=${encodeURIComponent(project.title)}&domain=${encodeURIComponent(project.domain || '')}&category=Project`,
    type: 'article',
  }
}

export function getCheatsheetMeta(sheet: Cheatsheet): ArticleMeta {
  return {
    title: `${sheet.title} — ${SITE_NAME}`,
    description: `Quick reference for ${sheet.title}. Syntax, examples, and best practices.`,
    url: `${BASE_URL}/cheatsheets/${sheet.id}`,
    image: `${BASE_URL}/api/og?title=${encodeURIComponent(sheet.title)}&domain=${encodeURIComponent(sheet.domain || '')}&category=Cheat%20Sheet`,
    type: 'article',
  }
}

export function getRoadmapMeta(roadmap: Roadmap): ArticleMeta {
  return {
    title: `${roadmap.title} — ${SITE_NAME}`,
    description: roadmap.description || `Career roadmap: ${roadmap.title}`,
    url: `${BASE_URL}/roadmaps/${roadmap.slug}`,
    image: `${BASE_URL}/api/og?title=${encodeURIComponent(roadmap.title)}&domain=&category=Roadmap`,
    type: 'article',
  }
}

const pages: Record<string, PageMeta> = {
  '/': { title: SITE_NAME, description: DEFAULT_DESCRIPTION },
  '/browse': { title: `Browse Concepts — ${SITE_NAME}`, description: 'Browse all 400+ computer science concepts.' },
  '/projects': { title: `Projects — ${SITE_NAME}`, description: 'Hands-on projects to practice your skills.' },
  '/playground': { title: `Code Playground — ${SITE_NAME}`, description: 'Run Python and JavaScript in your browser.' },
  '/roadmaps': { title: `Roadmaps — ${SITE_NAME}`, description: 'Career learning paths for software engineers.' },
  '/cheatsheets': { title: `Cheat Sheets — ${SITE_NAME}`, description: 'Quick reference guides for 28+ topics.' },
  '/leaderboard': { title: `Leaderboard — ${SITE_NAME}`, description: 'Top learners on the platform.' },
  '/math': { title: `Math Tricks — ${SITE_NAME}`, description: 'Interactive math visualizations.' },
}

export function getPageMeta(path: string): PageMeta {
  return pages[path] ?? { title: SITE_NAME, description: DEFAULT_DESCRIPTION }
}
