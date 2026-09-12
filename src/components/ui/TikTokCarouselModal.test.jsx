import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import TikTokCarouselModal from './TikTokCarouselModal.jsx'
import componentLifecycleConcept from '../../data/concepts/component-lifecycle-01.json'
import slidingWindowConcept from '../../data/concepts/sliding-window-01.json'

describe('TikTokCarouselModal Stability Tests', () => {
  it('renders without crashing when open for component-lifecycle-01', () => {
    const { container } = render(
      <TikTokCarouselModal
        isOpen={true}
        onClose={() => {}}
        concept={componentLifecycleConcept}
        accent="#38bdf8"
      />
    )
    expect(container).toBeDefined()
  })

  it('renders without crashing when open for sliding-window-01', () => {
    const { container } = render(
      <TikTokCarouselModal
        isOpen={true}
        onClose={() => {}}
        concept={slidingWindowConcept}
        accent="#38bdf8"
      />
    )
    expect(container).toBeDefined()
  })
})
