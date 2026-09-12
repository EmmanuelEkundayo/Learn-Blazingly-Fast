import { describe, it, expect, vi } from 'vitest'
import { dataURItoBlob, canvasToBlobSafe } from './shareCard.js'

describe('shareCard utility functions', () => {
  it('converts a data URI string to a Blob accurately', () => {
    // 1x1 transparent PNG data URI
    const testDataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const blob = dataURItoBlob(testDataUri)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('image/png')
    expect(blob.size).toBeGreaterThan(0)
  })

  it('handles invalid data URI gracefully', () => {
    expect(dataURItoBlob(null)).toBeNull()
    expect(dataURItoBlob('')).toBeNull()
    expect(dataURItoBlob('not-a-valid-data-uri')).toBeNull()
  })

  it('safely converts canvas via canvasToBlobSafe using toBlob or dataURL fallback', async () => {
    const fakeCanvas = {
      toBlob: vi.fn((callback) => {
        const dummyBlob = new Blob(['sample-png-bytes'], { type: 'image/png' })
        callback(dummyBlob)
      }),
      toDataURL: vi.fn(() => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='),
    }

    const blob = await canvasToBlobSafe(fakeCanvas)
    expect(blob).toBeDefined()
    expect(blob).toBeInstanceOf(Blob)
  })

  it('falls back to toDataURL when toBlob produces null', async () => {
    const fakeCanvas = {
      toBlob: vi.fn((callback) => {
        // toBlob fails and returns null (e.g. tainted or memory issue)
        callback(null)
      }),
      toDataURL: vi.fn(() => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='),
    }

    const blob = await canvasToBlobSafe(fakeCanvas)
    expect(blob).toBeDefined()
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('image/png')
  })
})
