import { describe, it, expect, beforeEach } from 'vitest'
import { useConceptStore } from './conceptStore.js'

describe('useConceptStore', () => {
  beforeEach(() => {
    useConceptStore.getState().setConcepts([
      { id: 'consistent-hashing-01', slug: 'consistent-hashing', title: 'Consistent Hashing', domain: 'DSA', category: 'Hashing', tags: ['hash'] },
      { id: 'bfs-01', slug: 'breadth-first-search', title: 'Breadth-First Search', domain: 'DSA', category: 'Graph', tags: ['graph', 'bfs'] }
    ])
  })

  it('resolves concept by exact slug', () => {
    const concept = useConceptStore.getState().getBySlug('consistent-hashing')
    expect(concept).not.toBeNull()
    expect(concept.title).toBe('Consistent Hashing')
  })

  it('resolves concept by id (with -01 suffix)', () => {
    const concept = useConceptStore.getState().getBySlug('consistent-hashing-01')
    expect(concept).not.toBeNull()
    expect(concept.title).toBe('Consistent Hashing')
  })

  it('resolves concept when slug has -01 stripped', () => {
    const concept = useConceptStore.getState().getBySlug('breadth-first-search-01')
    expect(concept).not.toBeNull()
    expect(concept.title).toBe('Breadth-First Search')
  })

  it('returns null for nonexistent slug', () => {
    const concept = useConceptStore.getState().getBySlug('nonexistent-concept')
    expect(concept).toBeNull()
  })
})
