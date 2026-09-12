import { describe, it, expect, vi } from 'vitest'
import {
  canvasToBlobSafe,
  dataURItoBlob,
  exportCarouselZip,
  getPinterestPinTitle,
  getPinterestPinDescription,
  getYouTubeShortsTitle,
  getYouTubeShortsDescription,
  openPinterestUpload,
  openYouTubeUpload
} from './tiktokExport.js'
import { generatePinterestCard } from './shareCard.js'

describe('tiktokExport utility functions', () => {
  it('converts dataURI to Blob properly', () => {
    const uri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const blob = dataURItoBlob(uri)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('image/png')
    expect(blob.size).toBeGreaterThan(0)
  })

  it('safely converts canvas via canvasToBlobSafe using fallback when toBlob returns null', async () => {
    const fakeCanvas = {
      toBlob: vi.fn((cb) => cb(null)),
      toDataURL: vi.fn(() => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='),
    }
    const blob = await canvasToBlobSafe(fakeCanvas)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('image/png')
  })

  it('exportCarouselZip yields progress and generates zip archive without throwing', async () => {
    const progressSpy = vi.fn()

    const success = await exportCarouselZip(
      [],
      'test-concept',
      ['slide-01.png'],
      'Sample Caption',
      progressSpy
    )

    expect(success).toBe(true)
  })

  it('exportCarouselZip supports pinterest platform option', async () => {
    const success = await exportCarouselZip(
      [],
      'binary-search',
      ['slide-01.png'],
      'Pinterest caption',
      null,
      { platform: 'pinterest' }
    )
    expect(success).toBe(true)
  })

  it('exportVideoClip accepts theme parameter gracefully in unsupported environment', async () => {
    const { exportVideoClip } = await import('./tiktokExport.js')
    const { EXPORT_THEMES } = await import('./themePalettes.js')

    const emeraldTheme = EXPORT_THEMES.find(t => t.id === 'backend')
    const res = await exportVideoClip([], 'test-slug', null, { domain: 'Backend' }, emeraldTheme)
    // In node/vitest environment without MediaRecorder canvas stream, it safely returns error object
    expect(res).toBeDefined()
    expect(res.success).toBe(false)
    expect(res.error).toBeDefined()
  })

  it('generates Pinterest Pin title and description without emojis', () => {
    const concept = {
      title: 'Dijkstra Algorithm',
      slug: 'dijkstra-algorithm',
      domain: 'Algorithms',
      card: {
        time_complexity: 'O((V + E) log V)',
        space_complexity: 'O(V)',
        intuition: 'Greedily picks the closest unvisited vertex.'
      }
    }

    const title = getPinterestPinTitle(concept)
    const desc = getPinterestPinDescription(concept)

    expect(title).toContain('Dijkstra Algorithm')
    expect(desc).toContain('O((V + E) log V)')
    expect(desc).toContain('learnblazinglyfast.tech/concept/dijkstra-algorithm')

    // Verify ZERO emojis
    const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u
    expect(emojiRegex.test(title)).toBe(false)
    expect(emojiRegex.test(desc)).toBe(false)
  })

  it('generates YouTube Shorts title and description without emojis', () => {
    const concept = {
      title: 'Quicksort',
      slug: 'quicksort',
      domain: 'DSA',
      card: {
        time_complexity: 'O(N log N)',
        space_complexity: 'O(log N)'
      }
    }

    const title = getYouTubeShortsTitle(concept)
    const desc = getYouTubeShortsDescription(concept)

    expect(title).toContain('Quicksort')
    expect(title).toContain('#Shorts')
    expect(desc).toContain('Quicksort')
    expect(desc).toContain('#Shorts')

    // Verify ZERO emojis
    const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u
    expect(emojiRegex.test(title)).toBe(false)
    expect(emojiRegex.test(desc)).toBe(false)
  })

  it('openPinterestUpload and openYouTubeUpload invoke window.open with correct URLs', () => {
    const originalOpen = window.open
    const openMock = vi.fn()
    window.open = openMock

    openPinterestUpload()
    expect(openMock).toHaveBeenCalledWith('https://www.pinterest.com/pin-creation-tool/', '_blank', 'noopener,noreferrer')

    openYouTubeUpload()
    expect(openMock).toHaveBeenCalledWith('https://studio.youtube.com', '_blank', 'noopener,noreferrer')

    window.open = originalOpen
  })

  it('generatePinterestCard handles null or empty element gracefully', async () => {
    const result = await generatePinterestCard(null, 'test-slug')
    expect(result).toBe(false)
  })
})

