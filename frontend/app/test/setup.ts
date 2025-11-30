import '@testing-library/jest-dom/vitest'
import { vi, beforeEach, afterEach } from 'vitest'

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// Mock fetch globally (can be overridden per test)
global.fetch = vi.fn()

// Mock ResizeObserver (required for some UI components)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))
