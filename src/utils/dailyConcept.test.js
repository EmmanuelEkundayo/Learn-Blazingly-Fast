import { describe, it, expect, beforeEach } from 'vitest'
import { hashDate, getDailyConcept } from './dailyConcept.js'

const concepts = [
  { slug: 'a', title: 'A' },
  { slug: 'b', title: 'B' },
  { slug: 'c', title: 'C' },
]

describe('hashDate', () => {
  it('is deterministic for the same date', () => {
    expect(hashDate('2026-09-02')).toBe(hashDate('2026-09-02'))
  })

  it('produces different hashes for different dates', () => {
    expect(hashDate('2026-09-02')).not.toBe(hashDate('2026-09-03'))
  })
})

describe('getDailyConcept', () => {
  beforeEach(() => localStorage.clear())

  it('returns null when there are no concepts', () => {
    expect(getDailyConcept([])).toBeNull()
    expect(getDailyConcept(null)).toBeNull()
  })

  it('returns a concept drawn from the provided list', () => {
    expect(concepts).toContainEqual(getDailyConcept(concepts))
  })

  it('returns the same concept on repeated calls the same day (cached)', () => {
    const first = getDailyConcept(concepts)
    const second = getDailyConcept(concepts)
    expect(second).toEqual(first)
  })

  it('prefers concepts the user has not viewed yet', () => {
    // Only "c" is unviewed, so it must be chosen.
    expect(getDailyConcept(concepts, ['a', 'b']).slug).toBe('c')
  })
})
