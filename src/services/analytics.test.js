import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as analytics from './analytics.js'

describe('Analytics Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    window.goatcounter = undefined
  })

  it('initializes safely without crashing when environment keys are absent', () => {
    expect(() => analytics.initAnalytics()).not.toThrow()
  })

  it('trackPageView executes without errors and triggers goatcounter bridge if available', () => {
    const gcMock = vi.fn()
    window.goatcounter = { count: gcMock }

    analytics.trackPageView('/test-path', 'Test Title')

    expect(gcMock).toHaveBeenCalledWith({
      path: '/test-path',
      title: 'Test Title',
      event: false,
    })
  })

  it('trackConceptView formats concept details correctly', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    
    analytics.trackConceptView({
      slug: 'binary-search-01',
      title: 'Binary Search',
      domain: 'DSA',
      category: 'Algorithms',
      difficulty: 'beginner',
    })

    expect(debugSpy).toHaveBeenCalledWith(
      '[Analytics Mock] Event: "concept_viewed"',
      expect.objectContaining({
        concept_slug: 'binary-search-01',
        concept_title: 'Binary Search',
        domain: 'DSA',
      })
    )
  })

  it('trackExerciseAttempt captures pass/fail status and exercise type', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

    analytics.trackExerciseAttempt({
      slug: 'quick-sort-01',
      exerciseType: 'spot-the-bug',
      passed: true,
      confidence: 'high',
    })

    expect(debugSpy).toHaveBeenCalledWith(
      '[Analytics Mock] Event: "exercise_attempted"',
      expect.objectContaining({
        concept_slug: 'quick-sort-01',
        exercise_type: 'spot-the-bug',
        passed: true,
      })
    )
  })

  it('trackShare records platform and method', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

    analytics.trackShare({
      slug: 'transformer-01',
      title: 'Transformers',
      platform: 'x_twitter',
      method: 'web_intent',
    })

    expect(debugSpy).toHaveBeenCalledWith(
      '[Analytics Mock] Event: "concept_shared"',
      expect.objectContaining({
        concept_slug: 'transformer-01',
        platform: 'x_twitter',
        method: 'web_intent',
      })
    )
  })

  it('trackSearch ignores 1-character queries and records valid searches', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

    analytics.trackSearch({ query: 'a', resultsCount: 0 })
    expect(debugSpy).not.toHaveBeenCalled()

    analytics.trackSearch({ query: 'graph', resultsCount: 4 })
    expect(debugSpy).toHaveBeenCalledWith(
      '[Analytics Mock] Event: "search_performed"',
      expect.objectContaining({
        query: 'graph',
        results_count: 4,
      })
    )
  })

  it('trackRoadmapProgress sends structured progress payload', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

    analytics.trackRoadmapProgress({
      roadmapSlug: 'frontend-architect',
      phaseTitle: 'Phase 1: React Internals',
      percentage: 60,
    })

    expect(debugSpy).toHaveBeenCalledWith(
      '[Analytics Mock] Event: "roadmap_progress_updated"',
      expect.objectContaining({
        roadmap_slug: 'frontend-architect',
        percentage: 60,
      })
    )
  })
})
