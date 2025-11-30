import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSSE, SSEOptions } from './useSSE'

/**
 * Helper to create a mock ReadableStream that simulates SSE events.
 * Each string in the events array is enqueued as a chunk.
 */
function createMockSSEStream(events: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let index = 0

  return new ReadableStream({
    pull(controller) {
      if (index < events.length) {
        controller.enqueue(encoder.encode(events[index]))
        index++
      } else {
        controller.close()
      }
    },
  })
}

/**
 * Helper to create a mock fetch response with SSE stream
 */
function createMockFetchResponse(
  stream: ReadableStream<Uint8Array>,
  options: { ok?: boolean; status?: number } = {}
): Response {
  const { ok = true, status = 200 } = options
  return {
    ok,
    status,
    body: stream,
    headers: new Headers(),
    redirected: false,
    statusText: ok ? 'OK' : 'Error',
    type: 'basic',
    url: '',
    clone: vi.fn(),
    arrayBuffer: vi.fn(),
    blob: vi.fn(),
    formData: vi.fn(),
    json: vi.fn(),
    text: vi.fn(),
    bodyUsed: false,
  } as Response
}

describe('useSSE', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('connection', () => {
    it('connect makes fetch request with correct URL', async () => {
      const mockStream = createMockSSEStream([])
      const mockFetch = vi.fn().mockResolvedValue(createMockFetchResponse(mockStream))
      global.fetch = mockFetch

      const { result } = renderHook(() => useSSE())

      await act(async () => {
        result.current.connect('/api/test/stream')
        // Give the async connect time to start
        await new Promise((resolve) => setTimeout(resolve, 10))
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test/stream',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          signal: expect.any(AbortSignal),
        })
      )
    })

    it('connect makes POST request when body is provided', async () => {
      const mockStream = createMockSSEStream([])
      const mockFetch = vi.fn().mockResolvedValue(createMockFetchResponse(mockStream))
      global.fetch = mockFetch

      const { result } = renderHook(() => useSSE())
      const requestBody = { message: 'Hello' }

      await act(async () => {
        result.current.connect('/api/chat/stream', requestBody)
        await new Promise((resolve) => setTimeout(resolve, 10))
      })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/chat/stream',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
        })
      )
    })

    it('disconnect aborts connection', async () => {
      // Create a stream that never closes to simulate long-running connection
      let streamController: ReadableStreamDefaultController<Uint8Array> | null = null
      const mockStream = new ReadableStream<Uint8Array>({
        start(controller) {
          streamController = controller
        },
      })

      const abortSpy = vi.fn()
      const mockFetch = vi.fn().mockImplementation((_url: string, options?: RequestInit) => {
        // Listen for abort signal
        options?.signal?.addEventListener('abort', abortSpy)
        return Promise.resolve(createMockFetchResponse(mockStream))
      })
      global.fetch = mockFetch

      const onClose = vi.fn()
      const { result } = renderHook(() => useSSE({ onClose }))

      // Connect and wait for connection to establish
      await act(async () => {
        result.current.connect('/api/test/stream')
        await new Promise((resolve) => setTimeout(resolve, 50))
      })

      // Verify connected
      expect(result.current.isConnected).toBe(true)

      // Disconnect
      act(() => {
        result.current.disconnect()
      })

      expect(abortSpy).toHaveBeenCalled()
      expect(result.current.isConnected).toBe(false)
      expect(onClose).toHaveBeenCalled()

      // Cleanup
      streamController?.close()
    })
  })

  describe('parsing', () => {
    it('parses single SSE event', async () => {
      const onMessage = vi.fn()
      const mockStream = createMockSSEStream([
        'data: {"type":"test","content":"hello"}\n\n',
      ])
      const mockFetch = vi.fn().mockResolvedValue(createMockFetchResponse(mockStream))
      global.fetch = mockFetch

      const { result } = renderHook(() =>
        useSSE<{ type: string; content: string }>({ onMessage })
      )

      await act(async () => {
        result.current.connect('/api/test/stream')
      })

      await waitFor(() => {
        expect(onMessage).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'test', content: 'hello' })
        )
      })

      // Verify data state is also updated
      expect(result.current.data).toEqual({ type: 'test', content: 'hello' })
    })

    it('parses multiple SSE events', async () => {
      const onMessage = vi.fn()
      const mockStream = createMockSSEStream([
        'data: {"taskId":"1","event":"started"}\n\n',
        'data: {"taskId":"1","event":"progress","content":"Working..."}\n\n',
        'data: {"taskId":"1","event":"completed"}\n\n',
      ])
      const mockFetch = vi.fn().mockResolvedValue(createMockFetchResponse(mockStream))
      global.fetch = mockFetch

      const { result } = renderHook(() =>
        useSSE<{ taskId: string; event: string; content?: string }>({ onMessage })
      )

      await act(async () => {
        result.current.connect('/api/test/stream')
      })

      await waitFor(() => {
        expect(onMessage).toHaveBeenCalledTimes(3)
      })

      // Verify all events were parsed correctly
      expect(onMessage).toHaveBeenNthCalledWith(1, { taskId: '1', event: 'started' })
      expect(onMessage).toHaveBeenNthCalledWith(2, {
        taskId: '1',
        event: 'progress',
        content: 'Working...',
      })
      expect(onMessage).toHaveBeenNthCalledWith(3, { taskId: '1', event: 'completed' })

      // Verify final data state is the last event
      expect(result.current.data).toEqual({ taskId: '1', event: 'completed' })
    })

    it('handles events split across chunks', async () => {
      const onMessage = vi.fn()
      // Simulate an event split across two chunks
      const mockStream = createMockSSEStream([
        'data: {"part":"',
        'complete"}\n\n',
      ])
      const mockFetch = vi.fn().mockResolvedValue(createMockFetchResponse(mockStream))
      global.fetch = mockFetch

      const { result } = renderHook(() =>
        useSSE<{ part: string }>({ onMessage })
      )

      await act(async () => {
        result.current.connect('/api/test/stream')
      })

      await waitFor(() => {
        expect(onMessage).toHaveBeenCalledWith({ part: 'complete' })
      })
    })
  })

  describe('error handling', () => {
    it('connection error invokes error callback', async () => {
      const onError = vi.fn()
      const networkError = new Error('Network error')
      const mockFetch = vi.fn().mockRejectedValue(networkError)
      global.fetch = mockFetch

      const { result } = renderHook(() => useSSE({ onError }))

      await act(async () => {
        result.current.connect('/api/test/stream')
      })

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(networkError)
      })

      // Verify error state is set
      expect(result.current.error).toBe(networkError)
      expect(result.current.isConnected).toBe(false)
    })

    it('HTTP error throws and invokes error callback', async () => {
      const onError = vi.fn()
      const mockStream = createMockSSEStream([])
      const mockFetch = vi
        .fn()
        .mockResolvedValue(createMockFetchResponse(mockStream, { ok: false, status: 500 }))
      global.fetch = mockFetch

      const { result } = renderHook(() => useSSE({ onError }))

      await act(async () => {
        result.current.connect('/api/test/stream')
      })

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'HTTP error! status: 500' })
        )
      })

      expect(result.current.error?.message).toBe('HTTP error! status: 500')
    })

    it('abort error does not invoke error callback', async () => {
      const onError = vi.fn()
      const onClose = vi.fn()

      // Create a stream that we control
      let streamController: ReadableStreamDefaultController<Uint8Array> | null = null
      const mockStream = new ReadableStream<Uint8Array>({
        start(controller) {
          streamController = controller
        },
      })

      const mockFetch = vi.fn().mockResolvedValue(createMockFetchResponse(mockStream))
      global.fetch = mockFetch

      const { result } = renderHook(() => useSSE({ onError, onClose }))

      await act(async () => {
        result.current.connect('/api/test/stream')
        await new Promise((resolve) => setTimeout(resolve, 50))
      })

      // Disconnect (which aborts)
      act(() => {
        result.current.disconnect()
      })

      // Wait a bit for any potential error callbacks
      await new Promise((resolve) => setTimeout(resolve, 50))

      // onError should NOT be called for abort
      expect(onError).not.toHaveBeenCalled()
      // But onClose should be called
      expect(onClose).toHaveBeenCalled()

      // Cleanup
      streamController?.close()
    })
  })

  describe('callbacks', () => {
    it('onOpen is called when connection is established', async () => {
      const onOpen = vi.fn()
      const mockStream = createMockSSEStream([])
      const mockFetch = vi.fn().mockResolvedValue(createMockFetchResponse(mockStream))
      global.fetch = mockFetch

      const { result } = renderHook(() => useSSE({ onOpen }))

      await act(async () => {
        result.current.connect('/api/test/stream')
      })

      await waitFor(() => {
        expect(onOpen).toHaveBeenCalled()
      })
    })

    it('onClose is called when stream ends', async () => {
      const onClose = vi.fn()
      const mockStream = createMockSSEStream(['data: {"done":true}\n\n'])
      const mockFetch = vi.fn().mockResolvedValue(createMockFetchResponse(mockStream))
      global.fetch = mockFetch

      const { result } = renderHook(() => useSSE({ onClose }))

      await act(async () => {
        result.current.connect('/api/test/stream')
      })

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled()
      })

      expect(result.current.isConnected).toBe(false)
    })
  })

  describe('state management', () => {
    it('isConnected reflects connection state', async () => {
      const mockStream = createMockSSEStream(['data: {"test":true}\n\n'])
      const mockFetch = vi.fn().mockResolvedValue(createMockFetchResponse(mockStream))
      global.fetch = mockFetch

      const { result } = renderHook(() => useSSE())

      // Initially not connected
      expect(result.current.isConnected).toBe(false)

      await act(async () => {
        result.current.connect('/api/test/stream')
        // Check during connection
        await new Promise((resolve) => setTimeout(resolve, 10))
      })

      // After stream ends, should be disconnected
      await waitFor(() => {
        expect(result.current.isConnected).toBe(false)
      })
    })

    it('reconnecting aborts previous connection', async () => {
      const abortSpy = vi.fn()

      // First connection - long running
      let firstStreamController: ReadableStreamDefaultController<Uint8Array> | null = null
      const firstStream = new ReadableStream<Uint8Array>({
        start(controller) {
          firstStreamController = controller
        },
      })

      // Second connection
      const secondStream = createMockSSEStream(['data: {"second":true}\n\n'])

      let callCount = 0
      const mockFetch = vi.fn().mockImplementation((_url: string, options?: RequestInit) => {
        callCount++
        if (callCount === 1) {
          options?.signal?.addEventListener('abort', abortSpy)
          return Promise.resolve(createMockFetchResponse(firstStream))
        }
        return Promise.resolve(createMockFetchResponse(secondStream))
      })
      global.fetch = mockFetch

      const { result } = renderHook(() => useSSE<{ second?: boolean }>())

      // First connection
      await act(async () => {
        result.current.connect('/api/first')
        await new Promise((resolve) => setTimeout(resolve, 50))
      })

      // Second connection should abort first
      await act(async () => {
        result.current.connect('/api/second')
      })

      expect(abortSpy).toHaveBeenCalled()

      await waitFor(() => {
        expect(result.current.data).toEqual({ second: true })
      })

      // Cleanup
      firstStreamController?.close()
    })
  })
})
