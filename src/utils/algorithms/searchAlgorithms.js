/**
 * Pre-computes steps for various search algorithms.
 * Each step is a snapshot used by ArrayPointers.
 */

// ─── Binary Search ───────────────────────────────────────────────────────────
export function generateBinarySearchSteps(arr, target) {
  const steps = []
  let lo = 0, hi = arr.length - 1

  steps.push({
    lo, hi, mid: null, found: false, done: false,
    annotation: `Search for ${target} in sorted array of ${arr.length} elements. lo=0, hi=${hi}.`,
  })

  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2)
    steps.push({ 
      lo, hi, mid, found: false, done: false,
      annotation: `Calculate mid = lo + (hi - lo) / 2 = ${mid}.` 
    })

    if (arr[mid] === target) {
      steps.push({ lo, hi, mid, found: true, done: true,
        annotation: `arr[${mid}] = ${arr[mid]} == ${target} ✓  Found at index ${mid}!` })
      return steps
    } else if (arr[mid] < target) {
      steps.push({ lo, hi, mid, found: false, done: false,
        annotation: `arr[${mid}]=${arr[mid]} < ${target} → search right half. lo = mid+1 = ${mid + 1}` })
      lo = mid + 1
    } else {
      steps.push({ lo, hi, mid, found: false, done: false,
        annotation: `arr[${mid}]=${arr[mid]} > ${target} → search left half. hi = mid-1 = ${mid - 1}` })
      hi = mid - 1
    }
  }

  steps.push({ lo: null, hi: null, mid: null, found: false, done: true,
    annotation: `${target} not in array. Return -1.` })
  
  return steps
}

// ─── Linear Search ───────────────────────────────────────────────────────────
export function generateLinearSearchSteps(arr, target) {
  const steps = []
  
  steps.push({
    i: null, found: false, done: false,
    annotation: `Starting Linear Search for ${target}.`
  })

  for (let i = 0; i < arr.length; i++) {
    steps.push({
      i, found: false, done: false,
      annotation: `Checking index ${i}: arr[${i}] = ${arr[i]}.`
    })

    if (arr[i] === target) {
      steps.push({
        i, found: true, done: true,
        annotation: `Found ${target} at index ${i}!`
      })
      return steps
    }
  }

  steps.push({
    i: null, found: false, done: true,
    annotation: `${target} not found in array.`
  })

  return steps
}

// ─── Two Pointers (Target Sum Pair) ──────────────────────────────────────────
export function generateTwoPointersSteps(arr, target) {
  const steps = []
  let lo = 0, hi = arr.length - 1
  const t = target ?? (arr[1] + arr[arr.length - 2])

  steps.push({
    lo, hi, mid: null, found: false, done: false,
    annotation: `Find pair summing to ${t} using Two Pointers. lo=0, hi=${hi}.`
  })

  while (lo < hi) {
    const sum = arr[lo] + arr[hi]
    steps.push({
      lo, hi, mid: null, found: false, done: false,
      annotation: `Check arr[${lo}] (${arr[lo]}) + arr[${hi}] (${arr[hi]}) = ${sum} vs target ${t}.`
    })

    if (sum === t) {
      steps.push({
        lo, hi, mid: null, found: true, done: true,
        annotation: `arr[${lo}] (${arr[lo]}) + arr[${hi}] (${arr[hi]}) == ${t} ✓ Pair found!`
      })
      return steps
    } else if (sum < t) {
      steps.push({
        lo, hi, mid: null, found: false, done: false,
        annotation: `Sum ${sum} < ${t} → Need larger value. Increment lo: lo=${lo + 1}.`
      })
      lo++
    } else {
      steps.push({
        lo, hi, mid: null, found: false, done: false,
        annotation: `Sum ${sum} > ${t} → Need smaller value. Decrement hi: hi=${hi - 1}.`
      })
      hi--
    }
  }

  steps.push({
    lo: null, hi: null, mid: null, found: false, done: true,
    annotation: `No pair found summing to ${t}.`
  })
  return steps
}

// ─── Sliding Window (Maximum Sum Subarray of size k) ─────────────────────────
export function generateSlidingWindowSteps(arr, k = 3) {
  const steps = []
  const n = arr.length
  if (n < k) return steps

  let windowSum = 0
  for (let i = 0; i < k; i++) windowSum += arr[i]
  let maxSum = windowSum
  let maxStart = 0

  steps.push({
    lo: 0, hi: k - 1, mid: 0, found: false, done: false,
    annotation: `Initialize window [0…${k - 1}]: Sum = ${windowSum}.`
  })

  for (let i = k; i < n; i++) {
    const prev = arr[i - k]
    const curr = arr[i]
    windowSum = windowSum - prev + curr

    const isNewMax = windowSum > maxSum
    if (isNewMax) {
      maxSum = windowSum
      maxStart = i - k + 1
    }

    steps.push({
      lo: i - k + 1, hi: i, mid: maxStart, found: isNewMax, done: false,
      annotation: `Slide window [${i - k + 1}…${i}]: -${prev} +${curr} = ${windowSum}. Max = ${maxSum}.`
    })
  }

  steps.push({
    lo: maxStart, hi: maxStart + k - 1, mid: maxStart, found: true, done: true,
    annotation: `Maximum subarray found at [${maxStart}…${maxStart + k - 1}] with sum = ${maxSum}!`
  })
  return steps
}

// ─── Dutch National Flag (Three-Way Partitioning) ─────────────────────────────
export function generateDutchFlagSteps(arr) {
  const a = arr && arr.length ? [...arr] : [2, 0, 2, 1, 1, 0]
  const steps = []
  let lo = 0, mid = 0, hi = a.length - 1

  steps.push({
    lo, hi, mid, array: [...a], found: false, done: false,
    annotation: `Dutch National Flag partition: Sort 0s, 1s, 2s in-place. lo=0, mid=0, hi=${hi}.`
  })

  while (mid <= hi) {
    if (a[mid] === 0) {
      ;[a[lo], a[mid]] = [a[mid], a[lo]]
      steps.push({
        lo, hi, mid, array: [...a], found: false, done: false,
        annotation: `a[${mid}]=0: Swap with a[${lo}]. lo++, mid++.`
      })
      lo++
      mid++
    } else if (a[mid] === 1) {
      steps.push({
        lo, hi, mid, array: [...a], found: false, done: false,
        annotation: `a[${mid}]=1: In correct middle section. mid++.`
      })
      mid++
    } else {
      ;[a[mid], a[hi]] = [a[hi], a[mid]]
      steps.push({
        lo, hi, mid, array: [...a], found: false, done: false,
        annotation: `a[${mid}]=2: Swap with a[${hi}]. hi--.`
      })
      hi--
    }
  }

  steps.push({
    lo, hi, mid, array: [...a], found: true, done: true,
    annotation: `Dutch National Flag partitioning complete in O(n) time!`
  })
  return steps
}

