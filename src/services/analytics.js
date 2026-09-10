import posthog from 'posthog-js'

let isPostHogInitialized = false

/**
 * Initialize analytics services (PostHog + GoatCounter).
 * Safe to call multiple times; will only initialize once.
 * If VITE_POSTHOG_KEY is not set, runs in graceful fallback mode.
 */
export function initAnalytics() {
  if (isPostHogInitialized || typeof window === 'undefined') return

  const apiKey = import.meta.env.VITE_POSTHOG_KEY
  const apiHost = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

  if (apiKey) {
    try {
      posthog.init(apiKey, {
        api_host: apiHost,
        capture_pageview: false, // Handled manually on React Router transitions
        capture_pageleave: true,
        autocapture: true,       // Captures button clicks, interactions, and form inputs
        person_profiles: 'identified_only', // Privacy-first default
        persistence: 'localStorage+cookie',
      })
      isPostHogInitialized = true
      if (import.meta.env.DEV) {
        console.info('⚡️ [PostHog] Analytics initialized successfully with host:', apiHost)
      }
    } catch (err) {
      console.warn('⚠️ [PostHog] Failed to initialize PostHog:', err)
    }
  } else if (import.meta.env.DEV) {
    console.info(
      'ℹ️ [Analytics] VITE_POSTHOG_KEY not set. Running in mock mode. Events will log to console in dev.'
    )
  }
}

/**
 * Track page views across both PostHog and GoatCounter (Open Analytics).
 * @param {string} path - The route path (e.g. "/concept/binary-search")
 * @param {string} [title] - Optional page title
 */
export function trackPageView(path, title) {
  if (typeof window === 'undefined') return

  const currentPath = path || window.location.pathname
  const currentTitle = title || document.title

  // 1. PostHog Pageview
  if (isPostHogInitialized) {
    posthog.capture('$pageview', {
      $current_url: window.location.href,
      path: currentPath,
      title: currentTitle,
    })
  } else if (import.meta.env.DEV) {
    console.debug('[Analytics Mock] $pageview:', currentPath)
  }

  // 2. GoatCounter Open Analytics SPA bridge
  if (window.goatcounter && typeof window.goatcounter.count === 'function') {
    try {
      window.goatcounter.count({
        path: currentPath,
        title: currentTitle,
        event: false,
      })
    } catch (gcErr) {
      console.debug('GoatCounter tracking note:', gcErr)
    }
  }
}

/**
 * Generic event tracker with graceful fallback.
 * @param {string} eventName - Custom event name (e.g. "concept_viewed")
 * @param {object} [properties] - Metadata dictionary
 */
export function trackEvent(eventName, properties = {}) {
  if (isPostHogInitialized) {
    posthog.capture(eventName, properties)
  } else if (import.meta.env.DEV) {
    console.debug(`[Analytics Mock] Event: "${eventName}"`, properties)
  }
}

/**
 * Track when a user views a concept.
 */
export function trackConceptView(concept) {
  if (!concept) return
  trackEvent('concept_viewed', {
    concept_slug: concept.slug,
    concept_title: concept.title,
    domain: concept.domain,
    category: concept.category,
    difficulty: concept.difficulty,
  })
}

/**
 * Track when a user attempts or completes an exercise.
 */
export function trackExerciseAttempt({ slug, exerciseType, passed, confidence }) {
  trackEvent('exercise_attempted', {
    concept_slug: slug,
    exercise_type: exerciseType,
    passed: Boolean(passed),
    confidence: confidence || null,
  })
}

/**
 * Track when a user shares a concept card or link.
 */
export function trackShare({ slug, title, platform, method }) {
  trackEvent('concept_shared', {
    concept_slug: slug,
    concept_title: title,
    platform: platform || 'x', // 'x' | 'clipboard' | 'download' | 'native'
    method: method || 'menu',
  })
}

/**
 * Track search queries to understand user discovery intent.
 */
export function trackSearch({ query, resultsCount }) {
  if (!query || query.trim().length < 2) return
  trackEvent('search_performed', {
    query: query.trim(),
    results_count: resultsCount,
  })
}

/**
 * Track roadmap progress.
 */
export function trackRoadmapProgress({ roadmapSlug, phaseTitle, percentage }) {
  trackEvent('roadmap_progress_updated', {
    roadmap_slug: roadmapSlug,
    phase_title: phaseTitle,
    percentage,
  })
}

/**
 * Identify a user in PostHog (e.g. when opting into leaderboard).
 */
export function identifyUser(distinctId, properties = {}) {
  if (isPostHogInitialized && distinctId) {
    posthog.identify(distinctId, properties)
  }
}

/**
 * Reset user identity on logout/reset.
 */
export function resetUser() {
  if (isPostHogInitialized) {
    posthog.reset()
  }
}

export default posthog
