import { describe, it, expect } from 'vitest'
import {
  generateBinarySearchSteps,
  generateLinearSearchSteps,
} from './searchAlgorithms.js'

const finalStep = (steps) => steps[steps.length - 1]

describe('binary search', () => {
  const sorted = [1, 3, 5, 7, 9, 11]

  sorted.forEach((target, idx) => {
    it(`finds ${target} at index ${idx}`, () => {
      const last = finalStep(generateBinarySearchSteps(sorted, target))
      expect(last.found).toBe(true)
      expect(last.mid).toBe(idx)
      expect(sorted[last.mid]).toBe(target)
    })
  })

  it('reports "not found" for a value missing from the array', () => {
    const last = finalStep(generateBinarySearchSteps(sorted, 4))
    expect(last.found).toBe(false)
    expect(last.done).toBe(true)
  })

  it('handles an empty array without finding anything', () => {
    const last = finalStep(generateBinarySearchSteps([], 5))
    expect(last.found).toBe(false)
    expect(last.done).toBe(true)
  })

  it('finds the single element in a one-element array', () => {
    const last = finalStep(generateBinarySearchSteps([42], 42))
    expect(last.found).toBe(true)
    expect(last.mid).toBe(0)
  })
})

describe('linear search', () => {
  const arr = [4, 8, 15, 16, 23, 42]

  it('finds an existing element at the correct index', () => {
    const last = finalStep(generateLinearSearchSteps(arr, 16))
    expect(last.found).toBe(true)
    expect(last.i).toBe(3)
  })

  it('finds the first element', () => {
    const last = finalStep(generateLinearSearchSteps(arr, 4))
    expect(last.found).toBe(true)
    expect(last.i).toBe(0)
  })

  it('reports "not found" for a missing element', () => {
    const last = finalStep(generateLinearSearchSteps(arr, 99))
    expect(last.found).toBe(false)
    expect(last.done).toBe(true)
  })
})
