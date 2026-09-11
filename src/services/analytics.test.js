import { describe, it, expect, vi, beforeEach } from 'vitest'
import posthog from 'posthog-js'
import * as analytics from './analytics.js'

describe('Analytics Service', () => {
  let captureSpy
  let debugSpy

  beforeEach(() => {
    vi.restoreAllMocks()
    window.goatcounter = undefined
    captureSpy = vi.spyOn(posthog, 'capture').mockImplementation(() => {})
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
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
    analytics.trackConceptView({
      slug: 'binary-search-01',
      title: 'Binary Search',
      domain: 'DSA',
      category: 'Algorithms',
      difficulty: 'beginner',
    })

    const called = captureSpy.mock.calls.length > 0 || debugSpy.mock.calls.length > 0
    expect(called).toBe(true)

    const payload = captureSpy.mock.calls[0]?.[1] || debugSpy.mock.calls[0]?.[1]
    expect(payload).toEqual(
      expect.objectContaining({
        concept_slug: 'binary-search-01',
        concept_title: 'Binary Search',
        domain: 'DSA',
      })
    )
  })

  it('trackExerciseAttempt captures pass/fail status and exercise type', () => {
    analytics.trackExerciseAttempt({
      slug: 'quick-sort-01',
      exerciseType: 'spot-the-bug',
      passed: true,
      confidence: 'high',
    })

    const payload = captureSpy.mock.calls[0]?.[1] || debugSpy.mock.calls[0]?.[1]
    expect(payload).toEqual(
      expect.objectContaining({
        concept_slug: 'quick-sort-01',
        exercise_type: 'spot-the-bug',
        passed: true,
      })
    )
  })

  it('trackShare records platform and method', () => {
    analytics.trackShare({
      slug: 'transformer-01',
      title: 'Transformers',
      platform: 'x_twitter',
      method: 'web_intent',
    })

    const payload = captureSpy.mock.calls[0]?.[1] || debugSpy.mock.calls[0]?.[1]
    expect(payload).toEqual(
      expect.objectContaining({
        concept_slug: 'transformer-01',
        platform: 'x_twitter',
        method: 'web_intent',
      })
    )
  })

  it('trackSearch ignores 1-character queries and records valid searches', () => {
    analytics.trackSearch({ query: 'a', resultsCount: 0 })
    expect(captureSpy).not.toHaveBeenCalled()
    expect(debugSpy).not.toHaveBeenCalled()

    analytics.trackSearch({ query: 'graph', resultsCount: 4 })
    const payload = captureSpy.mock.calls[0]?.[1] || debugSpy.mock.calls[0]?.[1]
    expect(payload).toEqual(
      expect.objectContaining({
        query: 'graph',
        results_count: 4,
      })
    )
  })

  it('trackRoadmapProgress sends structured progress payload', () => {
    analytics.trackRoadmapProgress({
      roadmapSlug: 'frontend-architect',
      phaseTitle: 'Phase 1: React Internals',
      percentage: 60,
    })

    const payload = captureSpy.mock.calls[0]?.[1] || debugSpy.mock.calls[0]?.[1]
    expect(payload).toEqual(
      expect.objectContaining({
        roadmap_slug: 'frontend-architect',
        percentage: 60,
      })
    )
  })
})
