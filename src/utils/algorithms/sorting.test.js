import { describe, it, expect } from 'vitest'
import {
  generateBubbleSortSteps,
  generateSelectionSortSteps,
  generateInsertionSortSteps,
} from './sorting.js'

const generators = {
  bubble: generateBubbleSortSteps,
  selection: generateSelectionSortSteps,
  insertion: generateInsertionSortSteps,
}

const cases = [
  [],
  [1],
  [2, 1],
  [3, 1, 2],
  [5, 4, 3, 2, 1],
  [1, 2, 3, 4, 5],
  [3, 3, 1, 2, 3],
  [10, -1, 0, 5, -3, 8],
  [7, 7, 7, 7],
]

const finalArray = (steps) => steps[steps.length - 1].array

describe('sorting step generators', () => {
  for (const [name, gen] of Object.entries(generators)) {
    describe(name, () => {
      cases.forEach((input) => {
        it(`sorts ${JSON.stringify(input)} into ascending order`, () => {
          const expected = [...input].sort((a, b) => a - b)
          expect(finalArray(gen(input))).toEqual(expected)
        })
      })

      it('does not mutate the caller’s input array', () => {
        const input = [5, 3, 1, 4, 2]
        const copy = [...input]
        gen(input)
        expect(input).toEqual(copy)
      })

      it('keeps every step snapshot the same length as the input', () => {
        const input = [4, 2, 5, 1, 3]
        for (const step of gen(input)) {
          expect(step.array).toHaveLength(input.length)
        }
      })
    })
  }
})
