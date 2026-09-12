import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { getConceptVizCategory, drawCanvasVizFrame } from './visualizerPlayback.js'

function createMockCtx() {
  const calls = []
  return new Proxy({}, {
    get: (_, prop) => {
      if (prop === 'calls') return calls
      if (prop === 'measureText') return (text) => ({ width: (text || '').length * 7 })
      return (...args) => {
        calls.push({ method: prop, args })
      }
    },
    set: () => true,
  })
}

describe('visualizerPlayback', () => {
  it('correctly maps component-lifecycle-01 to state-diagram category', () => {
    const filePath = path.resolve(process.cwd(), 'src/data/concepts/component-lifecycle-01.json')
    const concept = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    const category = getConceptVizCategory(concept)
    expect(category).toBe('state-diagram')
  })

  it('draws state-diagram frames across progress 0.0, 0.5, 1.0 without crashing', () => {
    const filePath = path.resolve(process.cwd(), 'src/data/concepts/component-lifecycle-01.json')
    const concept = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    const box = { x: 53, y: 256, width: 614, height: 384 }

    for (const p of [0.0, 0.25, 0.5, 0.75, 1.0]) {
      const ctx = createMockCtx()
      expect(() => drawCanvasVizFrame(ctx, concept, box, p)).not.toThrow()
      expect(ctx.calls.length).toBeGreaterThan(10)
    }
  })

  it('draws sorting bars for quicksort without crashing', () => {
    const filePath = path.resolve(process.cwd(), 'src/data/concepts/quicksort-01.json')
    const concept = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    const box = { x: 53, y: 256, width: 614, height: 384 }

    for (const p of [0.0, 0.5, 1.0]) {
      const ctx = createMockCtx()
      expect(() => drawCanvasVizFrame(ctx, concept, box, p)).not.toThrow()
      expect(ctx.calls.length).toBeGreaterThan(10)
    }
  })

  it('draws search pointers for binary search without crashing', () => {
    const filePath = path.resolve(process.cwd(), 'src/data/concepts/binary-search-01.json')
    const concept = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    const box = { x: 53, y: 256, width: 614, height: 384 }

    for (const p of [0.0, 0.5, 1.0]) {
      const ctx = createMockCtx()
      expect(() => drawCanvasVizFrame(ctx, concept, box, p)).not.toThrow()
      expect(ctx.calls.length).toBeGreaterThan(10)
    }
  })

  it('renders non-interactive LIVE SIMULATION HUD and never renders Speed: 1x', () => {
    const filePath = path.resolve(process.cwd(), 'src/data/concepts/quicksort-01.json')
    const concept = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    const box = { x: 53, y: 256, width: 614, height: 384 }
    const ctx = createMockCtx()
    drawCanvasVizFrame(ctx, concept, box, 0.5)

    const textCalls = ctx.calls.filter(c => c.method === 'fillText').map(c => c.args[0])
    expect(textCalls.some(t => t === 'LIVE SIMULATION')).toBe(true)
    expect(textCalls.some(t => String(t).includes('Speed: 1×'))).toBe(false)
  })

  it('provides all 7 domain-aligned export color themes matching the site UI', async () => {
    const { EXPORT_THEMES, getInitialThemeForConcept } = await import('./themePalettes.js')
    expect(EXPORT_THEMES.length).toBe(7)

    const ids = EXPORT_THEMES.map(t => t.id)
    expect(ids).toEqual(['dsa', 'frontend', 'backend', 'ml', 'se', 'ai', 'sky'])

    // Verify key colors
    expect(EXPORT_THEMES.find(t => t.id === 'frontend').primary).toBe('#8b5cf6')
    expect(EXPORT_THEMES.find(t => t.id === 'backend').primary).toBe('#10b981')
    expect(EXPORT_THEMES.find(t => t.id === 'ml').primary).toBe('#f59e0b')
    expect(EXPORT_THEMES.find(t => t.id === 'se').primary).toBe('#f43f5e')
    expect(EXPORT_THEMES.find(t => t.id === 'ai').primary).toBe('#06b6d4')
    expect(EXPORT_THEMES.find(t => t.id === 'dsa').primary).toBe('#3b82f6')
    expect(EXPORT_THEMES.find(t => t.id === 'sky').primary).toBe('#38bdf8')

    // Verify getInitialThemeForConcept mapping
    expect(getInitialThemeForConcept({ domain: 'Frontend Development' }).id).toBe('frontend')
    expect(getInitialThemeForConcept({ domain: 'Backend & APIs' }).id).toBe('backend')
    expect(getInitialThemeForConcept({ domain: 'Machine Learning' }).id).toBe('ml')
    expect(getInitialThemeForConcept({ domain: 'Software Engineering' }).id).toBe('se')
    expect(getInitialThemeForConcept({ domain: 'Artificial Intelligence' }).id).toBe('ai')
    expect(getInitialThemeForConcept({ domain: 'Data Structures & Algorithms' }).id).toBe('dsa')
  })

  it('draws canvas viz frame with custom domain themes without crashing', async () => {
    const { EXPORT_THEMES } = await import('./themePalettes.js')
    const filePath = path.resolve(process.cwd(), 'src/data/concepts/component-lifecycle-01.json')
    const concept = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    const box = { x: 53, y: 256, width: 614, height: 384 }

    for (const theme of EXPORT_THEMES) {
      const ctx = createMockCtx()
      expect(() => drawCanvasVizFrame(ctx, concept, box, 0.5, theme)).not.toThrow()
      expect(ctx.calls.length).toBeGreaterThan(10)
    }
  })

  it('draws react-server-components-01 with real steps, annotations and Frontend Violet theme', async () => {
    const { EXPORT_THEMES, getInitialThemeForConcept } = await import('./themePalettes.js')
    const filePath = path.resolve(process.cwd(), 'src/data/concepts/react-server-components-01.json')
    const concept = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    const theme = getInitialThemeForConcept(concept)
    expect(theme.id).toBe('frontend')
    expect(theme.primary).toBe('#8b5cf6')

    const box = { x: 53, y: 256, width: 614, height: 384 }
    const ctx = createMockCtx()
    drawCanvasVizFrame(ctx, concept, box, 0.3, theme)

    const textCalls = ctx.calls.filter(c => c.method === 'fillText').map(c => c.args[0])
    // Should render actual RSC steps
    expect(textCalls.some(t => String(t).includes('Request'))).toBe(true)
    expect(textCalls.some(t => String(t).includes('RSC render'))).toBe(true)
    expect(textCalls.some(t => String(t).includes('Serialise'))).toBe(true)
    // Should render header and stage
    expect(textCalls.some(t => String(t).includes('STAGE 02 / 05'))).toBe(true)
    // Should render real annotation
    expect(textCalls.some(t => String(t).includes('Server Components render on the server'))).toBe(true)
  })
})

