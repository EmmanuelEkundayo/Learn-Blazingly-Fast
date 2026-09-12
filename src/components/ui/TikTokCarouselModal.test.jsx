import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import TikTokCarouselModal from './TikTokCarouselModal.jsx'
import componentLifecycleConcept from '../../data/concepts/component-lifecycle-01.json'
import slidingWindowConcept from '../../data/concepts/sliding-window-01.json'

import StepControls from '../visualizations/StepControls.jsx'
import AnimatedSlideVisualizer from './AnimatedSlideVisualizer.jsx'

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

  it('renders StepControls in readOnly mode with NO buttons and non-interactive HUD', () => {
    const { container, queryByText } = render(
      <StepControls
        step={1}
        totalSteps={5}
        playing={false}
        speed={1}
        annotation="Testing step annotation"
        readOnly={true}
      />
    )
    // No interactive buttons should be present
    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBe(0)

    // Non-interactive HUD should be present
    expect(queryByText(/Step 2 \/ 5/)).toBeDefined()
    expect(queryByText('Live Simulation')).toBeDefined()
    expect(queryByText('Testing step annotation')).toBeDefined()
  })

  it('renders AnimatedSlideVisualizer with pointer-events-none to prevent user interaction', () => {
    const { container } = render(
      <AnimatedSlideVisualizer
        concept={componentLifecycleConcept}
        progress={0.5}
        isVideoMode={true}
      />
    )
    const nonInteractiveDiv = container.querySelector('.pointer-events-none')
    expect(nonInteractiveDiv).not.toBeNull()
  })

  it('renders with Frontend Violet theme for react-server-components-01', async () => {
    const rscConcept = await import('../../data/concepts/react-server-components-01.json')
    const { getByText, getAllByText } = render(
      <TikTokCarouselModal
        isOpen={true}
        onClose={() => {}}
        concept={rscConcept.default || rscConcept}
        accent="#8b5cf6"
      />
    )
    // Should have Frontend Violet theme active
    const themeBadges = getAllByText(/Frontend Violet/)
    expect(themeBadges.length).toBeGreaterThan(0)
  })

  it('renders StepControls with custom primaryColor matching active theme', () => {
    const { container } = render(
      <StepControls
        step={2}
        totalSteps={5}
        playing={false}
        speed={1}
        annotation="RSC test"
        readOnly={true}
        primaryColor="#8b5cf6"
      />
    )
    const stepText = container.querySelector('[style*="color: rgb(139, 92, 246)"], [style*="#8b5cf6"]')
    expect(stepText).not.toBeNull()
  })

  it('renders with Pinterest platform and 3 export options when initialPlatform="pinterest"', () => {
    const { getByText, getAllByText } = render(
      <TikTokCarouselModal
        isOpen={true}
        onClose={() => {}}
        concept={componentLifecycleConcept}
        accent="#38bdf8"
        initialPlatform="pinterest"
      />
    )
    expect(getByText('Pinterest Pin Exporter')).toBeDefined()
    expect(getAllByText('Pin Card').length).toBeGreaterThanOrEqual(1)
    expect(getByText('Carousel')).toBeDefined()
    expect(getByText('Video Pin')).toBeDefined()
    expect(getByText('Pinterest Pin Card')).toBeDefined()
  })

  it('renders with YouTube Shorts platform and video alone when initialPlatform="youtube"', () => {
    const { getByText, queryByText } = render(
      <TikTokCarouselModal
        isOpen={true}
        onClose={() => {}}
        concept={componentLifecycleConcept}
        accent="#38bdf8"
        initialPlatform="youtube"
      />
    )
    expect(getByText('YouTube Shorts Exporter')).toBeDefined()
    expect(getByText('YouTube Shorts (9:16 Video)')).toBeDefined()
    // In YouTube Shorts mode, 7-Slide Carousel option is NOT present (video alone)
    expect(queryByText('7-Slide Carousel')).toBeNull()
  })
})
