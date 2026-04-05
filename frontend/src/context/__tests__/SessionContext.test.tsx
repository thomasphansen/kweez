import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import {
  createTestQuestion,
  createTestSessionState,
  createTestAnswerResult,
  createTestQuestionResults,
  createTestLeaderboardEntry,
  createTestParticipant,
} from '../../test/utils'

// Create the mock hub state that persists across tests
const mockState = {
  listeners: new Map<string, Set<(...args: unknown[]) => void>>(),
  isConnected: false,
  onReconnectedCallback: null as (() => void) | null,
  onReconnectingCallback: null as (() => void) | null,
  onDisconnectedCallback: null as (() => void) | null,
}

// Mock the signalr module - this gets hoisted to the top
vi.mock('../../services/signalr', () => {
  const state = {
    listeners: new Map<string, Set<(...args: unknown[]) => void>>(),
    isConnected: false,
    onReconnectedCallback: null as (() => void) | null,
    onReconnectingCallback: null as (() => void) | null,
    onDisconnectedCallback: null as (() => void) | null,
  }

  // Store reference for test access
  ;(globalThis as Record<string, unknown>).__mockQuizHubState = state

  return {
    quizHub: {
      connect: vi.fn(async () => {
        state.isConnected = true
      }),
      disconnect: vi.fn(async () => {
        state.isConnected = false
      }),
      get connected() {
        return state.isConnected
      },
      get reconnecting() {
        return false
      },
      on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
        if (!state.listeners.has(event)) {
          state.listeners.set(event, new Set())
        }
        state.listeners.get(event)!.add(callback)
        return () => {
          state.listeners.get(event)?.delete(callback)
        }
      }),
      setOnReconnected: vi.fn((callback: (() => void) | null) => {
        state.onReconnectedCallback = callback
      }),
      setOnReconnecting: vi.fn((callback: (() => void) | null) => {
        state.onReconnectingCallback = callback
      }),
      setOnDisconnected: vi.fn((callback: (() => void) | null) => {
        state.onDisconnectedCallback = callback
      }),
      joinSession: vi.fn(async () => {}),
      submitAnswer: vi.fn(async () => {}),
      joinAsAdmin: vi.fn(async () => {}),
      startQuiz: vi.fn(async () => {}),
      releaseNextQuestion: vi.fn(async () => {}),
      forceCloseQuestion: vi.fn(async () => {}),
      endQuiz: vi.fn(async () => {}),
    },
  }
})

// Import after mock is defined
import { SessionProvider, useSession } from '../SessionContext'
import { quizHub } from '../../services/signalr'

// Helper to access the mock state
function getMockState() {
  return (globalThis as Record<string, unknown>).__mockQuizHubState as typeof mockState
}

// Helper functions to simulate events
function emit(event: string, ...args: unknown[]) {
  const state = getMockState()
  const callbacks = state.listeners.get(event)
  callbacks?.forEach((cb) => cb(...args))
}

function simulateReconnecting() {
  const state = getMockState()
  state.onReconnectingCallback?.()
}

function simulateDisconnected() {
  const state = getMockState()
  state.onDisconnectedCallback?.()
}

function setConnected(value: boolean) {
  const state = getMockState()
  state.isConnected = value
}

function clearListeners() {
  const state = getMockState()
  state.listeners.clear()
}

describe('SessionContext', () => {
  function wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter initialEntries={['/wait']}>
        <SessionProvider>{children}</SessionProvider>
      </MemoryRouter>
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
    clearListeners()
    setConnected(false)
    localStorage.clear()
  })

  describe('initial state', () => {
    it('should have null playerSession initially', () => {
      const { result } = renderHook(() => useSession(), { wrapper })
      expect(result.current.playerSession).toBeNull()
    })

    it('should have disconnected status initially', () => {
      const { result } = renderHook(() => useSession(), { wrapper })
      expect(result.current.connectionStatus).toBe('disconnected')
      expect(result.current.isConnected).toBe(false)
    })

    it('should have no game state initially', () => {
      const { result } = renderHook(() => useSession(), { wrapper })
      expect(result.current.currentQuestion).toBeNull()
      expect(result.current.lastAnswerResult).toBeNull()
      expect(result.current.questionResults).toBeNull()
      expect(result.current.leaderboard).toEqual([])
      expect(result.current.isQuizEnded).toBe(false)
    })
  })

  describe('playerSession management', () => {
    it('should persist playerSession to localStorage', () => {
      const { result } = renderHook(() => useSession(), { wrapper })
      
      const session = {
        participantId: 'p1',
        sessionId: 's1',
        quizTitle: 'Test Quiz',
        playerName: 'Test Player',
      }
      
      act(() => {
        result.current.setPlayerSession(session)
      })
      
      expect(result.current.playerSession).toEqual(session)
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'kweez_player_session',
        JSON.stringify(session)
      )
    })

    it('should restore playerSession from localStorage', () => {
      const session = {
        participantId: 'p1',
        sessionId: 's1',
        quizTitle: 'Test Quiz',
        playerName: 'Test Player',
      }
      localStorage.setItem('kweez_player_session', JSON.stringify(session))
      vi.mocked(localStorage.getItem).mockReturnValueOnce(JSON.stringify(session))

      const { result } = renderHook(() => useSession(), { wrapper })
      
      expect(result.current.playerSession).toEqual(session)
    })

    it('should clear localStorage when setting null session', () => {
      const { result } = renderHook(() => useSession(), { wrapper })
      
      act(() => {
        result.current.setPlayerSession({
          participantId: 'p1',
          sessionId: 's1',
          quizTitle: 'Test Quiz',
          playerName: 'Test Player',
        })
      })
      
      act(() => {
        result.current.setPlayerSession(null)
      })
      
      expect(result.current.playerSession).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalledWith('kweez_player_session')
    })
  })

  describe('connection management', () => {
    it('should call quizHub.connect when connect is called', async () => {
      const { result } = renderHook(() => useSession(), { wrapper })
      
      await act(async () => {
        await result.current.connect()
      })
      
      expect(quizHub.connect).toHaveBeenCalled()
    })

    it('should update connectionStatus to connected after successful connect', async () => {
      const { result } = renderHook(() => useSession(), { wrapper })
      
      await act(async () => {
        await result.current.connect()
      })
      
      expect(result.current.connectionStatus).toBe('connected')
      expect(result.current.isConnected).toBe(true)
    })

    it('should call quizHub.disconnect when disconnect is called', async () => {
      const { result } = renderHook(() => useSession(), { wrapper })
      
      await act(async () => {
        await result.current.connect()
        await result.current.disconnect()
      })
      
      expect(quizHub.disconnect).toHaveBeenCalled()
    })
  })

  describe('joinSession', () => {
    it('should call quizHub.joinSession with participantId', async () => {
      setConnected(true)
      const { result } = renderHook(() => useSession(), { wrapper })
      
      await act(async () => {
        await result.current.joinSession('participant-123')
      })
      
      expect(quizHub.joinSession).toHaveBeenCalledWith('participant-123')
    })

    it('should connect first if not connected', async () => {
      const { result } = renderHook(() => useSession(), { wrapper })
      
      await act(async () => {
        await result.current.joinSession('participant-123')
      })
      
      expect(quizHub.connect).toHaveBeenCalled()
    })
  })

  describe('clearGameState', () => {
    it('should reset all game state', async () => {
      const { result } = renderHook(() => useSession(), { wrapper })
      
      // First, set some game state via events
      act(() => {
        emit('QuestionReleased', createTestQuestion())
        emit('AnswerResult', createTestAnswerResult())
        emit('LeaderboardUpdated', [createTestLeaderboardEntry()])
      })
      
      // Now clear it
      act(() => {
        result.current.clearGameState()
      })
      
      expect(result.current.currentQuestion).toBeNull()
      expect(result.current.lastAnswerResult).toBeNull()
      expect(result.current.questionResults).toBeNull()
      expect(result.current.leaderboard).toEqual([])
      expect(result.current.isQuizEnded).toBe(false)
      expect(result.current.sessionState).toBeNull()
    })
  })

  describe('SignalR event handling', () => {
    it('should update sessionState on SessionState event', () => {
      const { result } = renderHook(() => useSession(), { wrapper })
      const testState = createTestSessionState()
      
      act(() => {
        emit('SessionState', testState)
      })
      
      expect(result.current.sessionState).toEqual(testState)
    })

    it('should update currentQuestion on QuestionReleased event', () => {
      const { result } = renderHook(() => useSession(), { wrapper })
      const testQuestion = createTestQuestion()
      
      act(() => {
        emit('QuestionReleased', testQuestion)
      })
      
      expect(result.current.currentQuestion).toEqual(testQuestion)
    })

    it('should clear lastAnswerResult and questionResults on QuestionReleased', () => {
      const { result } = renderHook(() => useSession(), { wrapper })
      
      // Set some previous results
      act(() => {
        emit('AnswerResult', createTestAnswerResult())
        emit('QuestionClosed', createTestQuestionResults())
      })
      
      // Now release a new question
      act(() => {
        emit('QuestionReleased', createTestQuestion())
      })
      
      expect(result.current.lastAnswerResult).toBeNull()
      expect(result.current.questionResults).toBeNull()
    })

    it('should update lastAnswerResult on AnswerResult event', () => {
      const { result } = renderHook(() => useSession(), { wrapper })
      const testResult = createTestAnswerResult()
      
      act(() => {
        emit('AnswerResult', testResult)
      })
      
      expect(result.current.lastAnswerResult).toEqual(testResult)
    })

    it('should update questionResults and leaderboard on QuestionClosed event', () => {
      const { result } = renderHook(() => useSession(), { wrapper })
      const testResults = createTestQuestionResults()
      
      act(() => {
        emit('QuestionClosed', testResults)
      })
      
      expect(result.current.questionResults).toEqual(testResults)
      expect(result.current.currentQuestion).toBeNull()
      expect(result.current.leaderboard).toEqual(testResults.leaderboard)
    })

    it('should update leaderboard on LeaderboardUpdated event', () => {
      const { result } = renderHook(() => useSession(), { wrapper })
      const testLeaderboard = [
        createTestLeaderboardEntry({ rank: 1, name: 'Player 1', totalScore: 1000 }),
        createTestLeaderboardEntry({ rank: 2, name: 'Player 2', totalScore: 800 }),
      ]
      
      act(() => {
        emit('LeaderboardUpdated', testLeaderboard)
      })
      
      expect(result.current.leaderboard).toEqual(testLeaderboard)
    })

    it('should set isQuizEnded and update leaderboard on QuizEnded event', () => {
      const { result } = renderHook(() => useSession(), { wrapper })
      const finalLeaderboard = [createTestLeaderboardEntry()]
      
      act(() => {
        emit('QuizEnded', finalLeaderboard)
      })
      
      expect(result.current.isQuizEnded).toBe(true)
      expect(result.current.leaderboard).toEqual(finalLeaderboard)
      expect(result.current.currentQuestion).toBeNull()
    })

    it('should add new participant on PlayerJoined event', () => {
      const { result } = renderHook(() => useSession(), { wrapper })
      
      // Set initial session state
      act(() => {
        emit('SessionState', createTestSessionState({ participants: [] }))
      })
      
      const newParticipant = createTestParticipant({ id: 'p2', name: 'New Player' })
      
      act(() => {
        emit('PlayerJoined', newParticipant)
      })
      
      expect(result.current.sessionState?.participants).toContainEqual(newParticipant)
    })

    it('should update existing participant on PlayerJoined event', () => {
      const { result } = renderHook(() => useSession(), { wrapper })
      const existingParticipant = createTestParticipant({ id: 'p1', isConnected: false })
      
      // Set initial session state with existing participant
      act(() => {
        emit('SessionState', createTestSessionState({
          participants: [existingParticipant],
        }))
      })
      
      // Player rejoins (reconnects)
      const updatedParticipant = createTestParticipant({ id: 'p1', isConnected: true })
      
      act(() => {
        emit('PlayerJoined', updatedParticipant)
      })
      
      expect(result.current.sessionState?.participants).toHaveLength(1)
      expect(result.current.sessionState?.participants[0].isConnected).toBe(true)
    })

    it('should update session status on SessionStarted event', () => {
      const { result } = renderHook(() => useSession(), { wrapper })
      
      // Set initial session state
      act(() => {
        emit('SessionState', createTestSessionState({ status: 'Waiting' }))
      })
      
      act(() => {
        emit('SessionStarted')
      })
      
      expect(result.current.sessionState?.status).toBe('Active')
    })
  })

  describe('reconnection callbacks', () => {
    it('should set up reconnection callbacks', () => {
      renderHook(() => useSession(), { wrapper })
      
      expect(quizHub.setOnReconnected).toHaveBeenCalled()
      expect(quizHub.setOnReconnecting).toHaveBeenCalled()
      expect(quizHub.setOnDisconnected).toHaveBeenCalled()
    })

    it('should update connectionStatus to reconnecting', () => {
      const { result } = renderHook(() => useSession(), { wrapper })
      
      act(() => {
        simulateReconnecting()
      })
      
      expect(result.current.connectionStatus).toBe('reconnecting')
    })

    it('should update connectionStatus to disconnected on close', () => {
      const { result } = renderHook(() => useSession(), { wrapper })
      
      // First connect
      act(() => {
        setConnected(true)
      })
      
      act(() => {
        simulateDisconnected()
      })
      
      expect(result.current.connectionStatus).toBe('disconnected')
    })
  })
})
