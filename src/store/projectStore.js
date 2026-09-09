import { create } from 'zustand'

/**
 * Project store — holds the loaded project catalog in memory.
 * Data comes from /src/data/projects/*.json (imported at build time).
 */
export const useProjectStore = create((set, get) => ({
  projects: [],
  loaded: false,

  setProjects(projects) {
    set({ projects, loaded: true })
  },

  getProjectBySlug(slug) {
    if (!slug) return null
    const normalized = slug.toLowerCase().trim()
    const stripped = normalized.replace(/-\d+$/, '')
    return (
      get().projects.find(
        (p) =>
          p.slug?.toLowerCase() === normalized ||
          p.id?.toLowerCase() === normalized ||
          p.slug?.toLowerCase() === stripped ||
          p.id?.toLowerCase() === stripped
      ) ?? null
    )
  },

  getProjectsByCategory(category) {
    if (category === 'All') return get().projects
    return get().projects.filter((p) => p.category === category)
  },

  search(query) {
    const q = query.toLowerCase()
    return get().projects.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q)
    )
  },
}))
