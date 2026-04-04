import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { quizHub } from '../services/signalr'
import type {
  QuestionReleased,
  AnswerResult,
  QuestionResults,
  LeaderboardEntry,
  SessionState,
} from '../types'

interface PlayerSession {
  participantId: string
  sessionId: string
  quizTitle: string
  playerName: string
}

interface SessionContextType {
  // Player state
  playerSession: PlayerSession | null
  setPlayerSession: (session: PlayerSession | null) => void
  
  // Game state
  sessionState: SessionState | null
  currentQuestion: QuestionReleased | null
  lastAnswerResult: AnswerResult | null
  questionResults: QuestionResults | null
  leaderboard: LeaderboardEntry[]
  isQuizEnded: boolean
  
  // Connection
  isConnected: boolean
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  
  // Player actions
  joinSession: (participantId: string) => Promise<void>
  submitAnswer: (answerId: string) => Promise<void>
  
  // Reset
  clearGameState: () => void
}

const SessionContext = createContext<SessionContextType | null>(null)

const STORAGE_KEY = 'kweez_player_session'

export function SessionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Track if this is a player (not admin) - admin routes start with /admin
  const isPlayerRoute = !location.pathname.startsWith('/admin')
  const isPlayerRouteRef = useRef(isPlayerRoute)
  isPlayerRouteRef.current = isPlayerRoute
  
  // Player session (persisted)
  const [playerSession, setPlayerSessionState] = useState<PlayerSession | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  })
  
  // Game state
  const [sessionState, setSessionState] = useState<SessionState | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<QuestionReleased | null>(null)
  const [lastAnswerResult, setLastAnswerResult] = useState<AnswerResult | null>(null)
  const [questionResults, setQuestionResults] = useState<QuestionResults | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isQuizEnded, setIsQuizEnded] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  const setPlayerSession = useCallback((session: PlayerSession | null) => {
    setPlayerSessionState(session)
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const connect = useCallback(async () => {
    try {
      await quizHub.connect()
      setIsConnected(true)
    } catch (error) {
      console.error('Failed to connect to SignalR:', error)
      setIsConnected(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    await quizHub.disconnect()
    setIsConnected(false)
  }, [])

  const joinSession = useCallback(async (participantId: string) => {
    if (!isConnected) {
      await connect()
    }
    await quizHub.joinSession(participantId)
  }, [isConnected, connect])

  const submitAnswer = useCallback(async (answerId: string) => {
    if (!playerSession || !currentQuestion) return
    await quizHub.submitAnswer(playerSession.participantId, currentQuestion.questionId, answerId)
  }, [playerSession, currentQuestion])

  const clearGameState = useCallback(() => {
    setCurrentQuestion(null)
    setLastAnswerResult(null)
    setQuestionResults(null)
    setLeaderboard([])
    setIsQuizEnded(false)
    setSessionState(null)
  }, [])

  // Setup SignalR event listeners
  useEffect(() => {
    const unsubscribers: (() => void)[] = []

    unsubscribers.push(
      quizHub.on('SessionState', (state) => {
        setSessionState(state)
      })
    )

    unsubscribers.push(
      quizHub.on('SessionStarted', () => {
        setSessionState((prev) => prev ? { ...prev, status: 'Active' } : null)
      })
    )

    unsubscribers.push(
      quizHub.on('QuestionReleased', (question) => {
        setCurrentQuestion(question)
        setLastAnswerResult(null)
        setQuestionResults(null)
        // Only navigate if this is a player (not admin)
        if (isPlayerRouteRef.current) {
          navigate('/play')
        }
      })
    )

    unsubscribers.push(
      quizHub.on('AnswerResult', (result) => {
        setLastAnswerResult(result)
      })
    )

    unsubscribers.push(
      quizHub.on('QuestionClosed', (results) => {
        setQuestionResults(results)
        setLeaderboard(results.leaderboard)
        // Only navigate if this is a player (not admin)
        if (isPlayerRouteRef.current) {
          navigate('/results')
        }
      })
    )

    unsubscribers.push(
      quizHub.on('LeaderboardUpdated', (newLeaderboard) => {
        setLeaderboard(newLeaderboard)
      })
    )

    unsubscribers.push(
      quizHub.on('QuizEnded', (finalLeaderboard) => {
        setLeaderboard(finalLeaderboard)
        setIsQuizEnded(true)
        // Only navigate if this is a player (not admin)
        if (isPlayerRouteRef.current) {
          navigate('/final')
        }
      })
    )

    unsubscribers.push(
      quizHub.on('PlayerJoined', (participant) => {
        setSessionState((prev) => {
          if (!prev) return null
          const exists = prev.participants.some((p) => p.id === participant.id)
          if (exists) {
            return {
              ...prev,
              participants: prev.participants.map((p) =>
                p.id === participant.id ? participant : p
              ),
            }
          }
          return { ...prev, participants: [...prev.participants, participant] }
        })
      })
    )

    unsubscribers.push(
      quizHub.on('Error', (message) => {
        console.error('SignalR error:', message)
      })
    )

    return () => {
      unsubscribers.forEach((unsub) => unsub())
    }
  }, [navigate])

  return (
    <SessionContext.Provider
      value={{
        playerSession,
        setPlayerSession,
        sessionState,
        currentQuestion,
        lastAnswerResult,
        questionResults,
        leaderboard,
        isQuizEnded,
        isConnected,
        connect,
        disconnect,
        joinSession,
        submitAnswer,
        clearGameState,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}
