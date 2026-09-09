import { describe, it, expect } from 'vitest'
import { complexityColor, COMPLEXITY_LABELS } from './complexity.js'

describe('complexityColor', () => {
  it('maps constant/logarithmic to green', () => {
    expect(complexityColor('O(1)')).toBe('text-green-400')
    expect(complexityColor('O(log n)')).toBe('text-green-400')
  })

  it('maps linear/linearithmic to yellow', () => {
    expect(complexityColor('O(n)')).toBe('text-yellow-400')
    expect(complexityColor('O(n log n)')).toBe('text-yellow-400')
  })

  it('maps quadratic/cubic to orange', () => {
    expect(complexityColor('O(n²)')).toBe('text-orange-400')
    expect(complexityColor('O(n³)')).toBe('text-orange-400')
  })

  it('falls back to red for exponential, factorial, and unknown labels', () => {
    expect(complexityColor('O(2ⁿ)')).toBe('text-red-400')
    expect(complexityColor('O(n!)')).toBe('text-red-400')
    expect(complexityColor('something-unknown')).toBe('text-red-400')
  })
})

describe('COMPLEXITY_LABELS', () => {
  it('provides a human-readable name for each canonical class', () => {
    expect(COMPLEXITY_LABELS['O(1)']).toBe('Constant')
    expect(COMPLEXITY_LABELS['O(n log n)']).toBe('Linearithmic')
    expect(COMPLEXITY_LABELS['O(n!)']).toBe('Factorial')
  })
})
