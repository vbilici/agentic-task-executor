import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { toast } from 'sonner'
import {
  isApiError,
  getErrorMessage,
  showErrorToast,
  showSuccessToast,
  showInfoToast,
  handleApiCall,
} from './error-handler'
import type { ApiError } from '@/types/api'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}))

describe('Error Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('isApiError', () => {
    it('returns true for valid ApiError object', () => {
      const error: ApiError = { detail: 'Something went wrong' }
      expect(isApiError(error)).toBe(true)
    })

    it('returns true for ApiError with additional fields', () => {
      const error: ApiError = {
        detail: 'Validation error',
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
      }
      expect(isApiError(error)).toBe(true)
    })

    it('returns false for null', () => {
      expect(isApiError(null)).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(isApiError(undefined)).toBe(false)
    })

    it('returns false for string', () => {
      expect(isApiError('error message')).toBe(false)
    })

    it('returns false for Error instance', () => {
      expect(isApiError(new Error('Something went wrong'))).toBe(false)
    })

    it('returns false for object without detail property', () => {
      expect(isApiError({ message: 'Error' })).toBe(false)
    })

    it('returns false for object with non-string detail', () => {
      expect(isApiError({ detail: 123 })).toBe(false)
    })

    it('returns false for array', () => {
      expect(isApiError(['error'])).toBe(false)
    })
  })

  describe('getErrorMessage', () => {
    it('extracts message from ApiError', () => {
      const error: ApiError = { detail: 'Session not found' }
      expect(getErrorMessage(error)).toBe('Session not found')
    })

    it('extracts message from Error instance', () => {
      const error = new Error('Network failed')
      expect(getErrorMessage(error)).toBe('Network failed')
    })

    it('returns string error directly', () => {
      expect(getErrorMessage('Something went wrong')).toBe('Something went wrong')
    })

    it('returns fallback for null', () => {
      expect(getErrorMessage(null)).toBe('An unexpected error occurred')
    })

    it('returns fallback for undefined', () => {
      expect(getErrorMessage(undefined)).toBe('An unexpected error occurred')
    })

    it('returns fallback for number', () => {
      expect(getErrorMessage(500)).toBe('An unexpected error occurred')
    })

    it('returns fallback for object without recognized structure', () => {
      expect(getErrorMessage({ code: 500 })).toBe('An unexpected error occurred')
    })

    it('returns fallback for empty object', () => {
      expect(getErrorMessage({})).toBe('An unexpected error occurred')
    })
  })

  describe('showErrorToast', () => {
    it('shows error toast with message from ApiError', () => {
      const error: ApiError = { detail: 'Task failed' }
      showErrorToast(error)

      expect(toast.error).toHaveBeenCalledWith('Error', {
        description: 'Task failed',
      })
    })

    it('shows error toast with custom title', () => {
      const error: ApiError = { detail: 'Permission denied' }
      showErrorToast(error, 'Access Error')

      expect(toast.error).toHaveBeenCalledWith('Access Error', {
        description: 'Permission denied',
      })
    })

    it('shows error toast with message from Error instance', () => {
      const error = new Error('Connection lost')
      showErrorToast(error)

      expect(toast.error).toHaveBeenCalledWith('Error', {
        description: 'Connection lost',
      })
    })

    it('shows error toast with fallback for unknown error', () => {
      showErrorToast({})

      expect(toast.error).toHaveBeenCalledWith('Error', {
        description: 'An unexpected error occurred',
      })
    })
  })

  describe('showSuccessToast', () => {
    it('shows success toast with default title', () => {
      showSuccessToast('Session created successfully')

      expect(toast.success).toHaveBeenCalledWith('Success', {
        description: 'Session created successfully',
      })
    })

    it('shows success toast with custom title', () => {
      showSuccessToast('Task completed', 'Done')

      expect(toast.success).toHaveBeenCalledWith('Done', {
        description: 'Task completed',
      })
    })
  })

  describe('showInfoToast', () => {
    it('shows info toast with default title', () => {
      showInfoToast('Loading data...')

      expect(toast.info).toHaveBeenCalledWith('Info', {
        description: 'Loading data...',
      })
    })

    it('shows info toast with custom title', () => {
      showInfoToast('Connecting to server', 'Status')

      expect(toast.info).toHaveBeenCalledWith('Status', {
        description: 'Connecting to server',
      })
    })
  })

  describe('handleApiCall', () => {
    it('returns result on successful API call', async () => {
      const mockResult = { id: '1', name: 'Test' }
      const apiCall = vi.fn().mockResolvedValue(mockResult)

      const result = await handleApiCall(apiCall)

      expect(result).toEqual(mockResult)
      expect(apiCall).toHaveBeenCalledTimes(1)
    })

    it('shows success toast when successMessage is provided', async () => {
      const mockResult = { id: '1' }
      const apiCall = vi.fn().mockResolvedValue(mockResult)

      await handleApiCall(apiCall, {
        successMessage: 'Session created',
        successTitle: 'Created',
      })

      expect(toast.success).toHaveBeenCalledWith('Created', {
        description: 'Session created',
      })
    })

    it('does not show success toast when no successMessage provided', async () => {
      const apiCall = vi.fn().mockResolvedValue({ id: '1' })

      await handleApiCall(apiCall)

      expect(toast.success).not.toHaveBeenCalled()
    })

    it('shows error toast and returns null on API error', async () => {
      const error: ApiError = { detail: 'Not found' }
      const apiCall = vi.fn().mockRejectedValue(error)

      const result = await handleApiCall(apiCall)

      expect(result).toBeNull()
      expect(toast.error).toHaveBeenCalledWith('Error', {
        description: 'Not found',
      })
    })

    it('shows error toast with custom title on API error', async () => {
      const error: ApiError = { detail: 'Invalid session' }
      const apiCall = vi.fn().mockRejectedValue(error)

      const result = await handleApiCall(apiCall, {
        errorTitle: 'Session Error',
      })

      expect(result).toBeNull()
      expect(toast.error).toHaveBeenCalledWith('Session Error', {
        description: 'Invalid session',
      })
    })

    it('handles Error instance rejection', async () => {
      const error = new Error('Network error')
      const apiCall = vi.fn().mockRejectedValue(error)

      const result = await handleApiCall(apiCall)

      expect(result).toBeNull()
      expect(toast.error).toHaveBeenCalledWith('Error', {
        description: 'Network error',
      })
    })

    it('handles unknown error rejection', async () => {
      const apiCall = vi.fn().mockRejectedValue(null)

      const result = await handleApiCall(apiCall)

      expect(result).toBeNull()
      expect(toast.error).toHaveBeenCalledWith('Error', {
        description: 'An unexpected error occurred',
      })
    })
  })
})
