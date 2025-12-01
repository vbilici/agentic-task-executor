import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type {
  Session,
  SessionDetail,
  SessionsListResponse,
  Task,
  TasksListResponse,
  Artifact,
  ArtifactsListResponse,
} from '@/types/api'

// We need to mock import.meta.env before importing the module
vi.stubEnv('VITE_API_URL', 'http://localhost:8000')

// Import after mocking environment
const { api } = await import('./api')

/**
 * Helper to create a mock fetch response
 */
function createMockResponse<T>(
  data: T,
  options: { ok?: boolean; status?: number } = {}
): Response {
  const { ok = true, status = 200 } = options
  return {
    ok,
    status,
    json: () => Promise.resolve(data),
    headers: new Headers(),
    redirected: false,
    statusText: ok ? 'OK' : 'Error',
    type: 'basic',
    url: '',
    clone: vi.fn(),
    arrayBuffer: vi.fn(),
    blob: vi.fn(),
    formData: vi.fn(),
    text: vi.fn(),
    body: null,
    bodyUsed: false,
  } as Response
}

/**
 * Helper to create a mock error response
 */
function createMockErrorResponse(
  detail: string,
  status: number,
  additionalFields: { code?: string; message?: string } = {}
): Response {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({ detail, ...additionalFields }),
    headers: new Headers(),
    redirected: false,
    statusText: 'Error',
    type: 'basic',
    url: '',
    clone: vi.fn(),
    arrayBuffer: vi.fn(),
    blob: vi.fn(),
    formData: vi.fn(),
    text: vi.fn(),
    body: null,
    bodyUsed: false,
  } as Response
}

describe('API Client', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Sessions', () => {
    const mockSession: Session = {
      id: 'session-1',
      title: 'Test Session',
      status: 'planning',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }

    const mockSessionDetail: SessionDetail = {
      ...mockSession,
      tasks: [],
      messages: [],
      artifacts: [],
    }

    const mockSessionsResponse: SessionsListResponse = {
      sessions: [mockSession],
      total: 1,
    }

    describe('listSessions', () => {
      it('makes GET request to /sessions', async () => {
        mockFetch.mockResolvedValue(createMockResponse(mockSessionsResponse))

        const result = await api.listSessions()

        expect(mockFetch).toHaveBeenCalledTimes(1)
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8000/sessions',
          expect.objectContaining({
            headers: {
              'Content-Type': 'application/json',
            },
          })
        )
        expect(result).toEqual(mockSessionsResponse)
      })

      it('includes query parameters when provided', async () => {
        mockFetch.mockResolvedValue(createMockResponse(mockSessionsResponse))

        await api.listSessions({ status: 'planning', limit: 10, offset: 5 })

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8000/sessions?status=planning&limit=10&offset=5',
          expect.any(Object)
        )
      })

      it('does not include undefined parameters', async () => {
        mockFetch.mockResolvedValue(createMockResponse(mockSessionsResponse))

        await api.listSessions({ status: 'completed' })

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8000/sessions?status=completed',
          expect.any(Object)
        )
      })
    })

    describe('createSession', () => {
      it('makes POST request to /sessions', async () => {
        mockFetch.mockResolvedValue(createMockResponse(mockSession))

        const result = await api.createSession()

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8000/sessions',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          })
        )
        expect(result).toEqual(mockSession)
      })
    })

    describe('getSession', () => {
      it('makes GET request to /sessions/:id', async () => {
        mockFetch.mockResolvedValue(createMockResponse(mockSessionDetail))

        const result = await api.getSession('session-1')

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8000/sessions/session-1',
          expect.objectContaining({
            headers: {
              'Content-Type': 'application/json',
            },
          })
        )
        expect(result).toEqual(mockSessionDetail)
      })
    })

    describe('deleteSession', () => {
      it('makes DELETE request to /sessions/:id', async () => {
        // 204 No Content response
        mockFetch.mockResolvedValue(createMockResponse(undefined, { status: 204 }))

        const result = await api.deleteSession('session-1')

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8000/sessions/session-1',
          expect.objectContaining({
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
          })
        )
        expect(result).toBeUndefined()
      })
    })
  })

  describe('Tasks', () => {
    const mockTask: Task = {
      id: 'task-1',
      sessionId: 'session-1',
      title: 'Test Task',
      description: 'Test description',
      status: 'pending',
      result: null,
      order: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }

    const mockTasksResponse: TasksListResponse = {
      tasks: [mockTask],
    }

    describe('listTasks', () => {
      it('makes GET request to /sessions/:id/tasks', async () => {
        mockFetch.mockResolvedValue(createMockResponse(mockTasksResponse))

        const result = await api.listTasks('session-1')

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8000/sessions/session-1/tasks',
          expect.objectContaining({
            headers: {
              'Content-Type': 'application/json',
            },
          })
        )
        expect(result).toEqual(mockTasksResponse)
      })
    })

    describe('getTask', () => {
      it('makes GET request to /sessions/:sessionId/tasks/:taskId', async () => {
        mockFetch.mockResolvedValue(createMockResponse(mockTask))

        const result = await api.getTask('session-1', 'task-1')

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8000/sessions/session-1/tasks/task-1',
          expect.objectContaining({
            headers: {
              'Content-Type': 'application/json',
            },
          })
        )
        expect(result).toEqual(mockTask)
      })
    })
  })

  describe('Artifacts', () => {
    const mockArtifact: Artifact = {
      id: 'artifact-1',
      sessionId: 'session-1',
      taskId: 'task-1',
      name: 'Test Artifact',
      type: 'document',
      content: 'Test content',
      createdAt: '2024-01-01T00:00:00Z',
    }

    const mockArtifactsResponse: ArtifactsListResponse = {
      artifacts: [
        {
          id: 'artifact-1',
          sessionId: 'session-1',
          taskId: 'task-1',
          name: 'Test Artifact',
          type: 'document',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ],
    }

    describe('listArtifacts', () => {
      it('makes GET request to /sessions/:id/artifacts', async () => {
        mockFetch.mockResolvedValue(createMockResponse(mockArtifactsResponse))

        const result = await api.listArtifacts('session-1')

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8000/sessions/session-1/artifacts',
          expect.objectContaining({
            headers: {
              'Content-Type': 'application/json',
            },
          })
        )
        expect(result).toEqual(mockArtifactsResponse)
      })

      it('includes type query parameter when provided', async () => {
        mockFetch.mockResolvedValue(createMockResponse(mockArtifactsResponse))

        await api.listArtifacts('session-1', 'document')

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8000/sessions/session-1/artifacts?type=document',
          expect.any(Object)
        )
      })
    })

    describe('getArtifact', () => {
      it('makes GET request to /sessions/:sessionId/artifacts/:artifactId', async () => {
        mockFetch.mockResolvedValue(createMockResponse(mockArtifact))

        const result = await api.getArtifact('session-1', 'artifact-1')

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8000/sessions/session-1/artifacts/artifact-1',
          expect.objectContaining({
            headers: {
              'Content-Type': 'application/json',
            },
          })
        )
        expect(result).toEqual(mockArtifact)
      })
    })

    describe('getArtifactDownloadUrl', () => {
      it('returns correct download URL', () => {
        const url = api.getArtifactDownloadUrl('session-1', 'artifact-1')

        expect(url).toBe('http://localhost:8000/sessions/session-1/artifacts/artifact-1/download')
      })
    })
  })

  describe('SSE URL builders', () => {
    describe('getChatSSEUrl', () => {
      it('returns correct chat SSE URL', () => {
        const url = api.getChatSSEUrl('session-1')

        expect(url).toBe('http://localhost:8000/sessions/session-1/chat')
      })
    })

    describe('getExecuteSSEUrl', () => {
      it('returns correct execute SSE URL', () => {
        const url = api.getExecuteSSEUrl('session-1')

        expect(url).toBe('http://localhost:8000/sessions/session-1/execute')
      })
    })

    describe('getSummarizeSSEUrl', () => {
      it('returns correct summarize SSE URL', () => {
        const url = api.getSummarizeSSEUrl('session-1')

        expect(url).toBe('http://localhost:8000/sessions/session-1/summarize')
      })
    })
  })

  describe('Error handling', () => {
    it('throws ApiError with detail from response body', async () => {
      mockFetch.mockResolvedValue(
        createMockErrorResponse('Session not found', 404)
      )

      await expect(api.getSession('nonexistent')).rejects.toEqual({
        detail: 'Session not found',
      })
    })

    it('throws ApiError with additional fields when provided', async () => {
      mockFetch.mockResolvedValue(
        createMockErrorResponse('Validation error', 422, {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
        })
      )

      await expect(api.createSession()).rejects.toEqual({
        detail: 'Validation error',
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
      })
    })

    it('uses statusText when response body parsing fails', async () => {
      const response = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('Not JSON')),
        headers: new Headers(),
        redirected: false,
        type: 'basic',
        url: '',
        clone: vi.fn(),
        arrayBuffer: vi.fn(),
        blob: vi.fn(),
        formData: vi.fn(),
        text: vi.fn(),
        body: null,
        bodyUsed: false,
      } as Response

      mockFetch.mockResolvedValue(response)

      await expect(api.getSession('test')).rejects.toEqual({
        detail: 'Internal Server Error',
      })
    })
  })
})
