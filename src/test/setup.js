import '@testing-library/jest-dom'
import { afterEach } from 'vitest'

// jsdom serves pages from an opaque origin by default, which disables Web
// Storage — `localStorage`/`sessionStorage` come back undefined and throw on
// access. Provide a small in-memory implementation so storage-backed code
// (e.g. daily-concept caching, persisted stores) is testable and isolated.
function createStorage() {
  let store = new Map()
  return {
    get length() {
      return store.size
    },
    key: (i) => [...store.keys()][i] ?? null,
    getItem: (k) => (store.has(String(k)) ? store.get(String(k)) : null),
    setItem: (k, v) => {
      store.set(String(k), String(v))
    },
    removeItem: (k) => {
      store.delete(String(k))
    },
    clear: () => {
      store = new Map()
    },
  }
}

for (const name of ['localStorage', 'sessionStorage']) {
  Object.defineProperty(globalThis, name, {
    value: createStorage(),
    writable: true,
    configurable: true,
  })
}

// Keep storage isolated between tests.
afterEach(() => {
  globalThis.localStorage.clear()
  globalThis.sessionStorage.clear()
})
