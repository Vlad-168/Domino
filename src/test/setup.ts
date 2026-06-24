import '@testing-library/jest-dom'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// jsdom lacks matchMedia / crypto.randomUUID in some versions — polyfill safely.
if (!('matchMedia' in window)) {
  // @ts-expect-error test polyfill
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
}

afterEach(() => cleanup())
