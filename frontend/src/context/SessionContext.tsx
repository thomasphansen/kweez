import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { quizHub } from '../services/signalr'
import type {
  QuestionReleased,
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

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting'

interface SessionContextType {
  // Player state
  playerSession: PlayerSession | null
  setPlayerSession: (session: PlayerSession | null) => void
  
  // Game state
  sessionState: SessionState | null
  currentQuestion: QuestionReleased | null
  selectedAnswerId: string | null
  lastQuestion: QuestionReleased | null  // Store last question for results display
  lastSelectedAnswerId: string | null    // Store player's answer for results display
  questionResults: QuestionResults | null
  leaderboard: LeaderboardEntry[]
  isQuizEnded: boolean
  
  // Connection
  connectionStatus: ConnectionStatus
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
  
  // Reference for use in callbacks
  const playerSessionRef = useRef(playerSession)
  playerSessionRef.current = playerSession
  
  // Game state
  const [sessionState, setSessionState] = useState<SessionState | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<QuestionReleased | null>(null)
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null)
  const [lastQuestion, setLastQuestion] = useState<QuestionReleased | null>(null)
  const [lastSelectedAnswerId, setLastSelectedAnswerId] = useState<string | null>(null)
  const [questionResults, setQuestionResults] = useState<QuestionResults | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isQuizEnded, setIsQuizEnded] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  
  // Refs to access current state in callbacks
  const currentQuestionRef = useRef(currentQuestion)
  currentQuestionRef.current = currentQuestion
  const selectedAnswerIdRef = useRef(selectedAnswerId)
  selectedAnswerIdRef.current = selectedAnswerId

  const isConnected = connectionStatus === 'connected'

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
      setConnectionStatus('connected')
    } catch (error) {
      console.error('Failed to connect to SignalR:', error)
      setConnectionStatus('disconnected')
    }
  }, [])

  const disconnect = useCallback(async () => {
    await quizHub.disconnect()
    setConnectionStatus('disconnected')
  }, [])

  const joinSession = useCallback(async (participantId: string) => {
    if (!quizHub.connected) {
      await connect()
    }
    await quizHub.joinSession(participantId)
  }, [connect])

  const submitAnswer = useCallback(async (answerId: string) => {
    if (!playerSession || !currentQuestion) return
    await quizHub.submitAnswer(playerSession.participantId, currentQuestion.questionId, answerId)
  }, [playerSession, currentQuestion])

  const clearGameState = useCallback(() => {
    setCurrentQuestion(null)
    setSelectedAnswerId(null)
    setLastQuestion(null)
    setLastSelectedAnswerId(null)
    setQuestionResults(null)
    setLeaderboard([])
    setIsQuizEnded(false)
    setSessionState(null)
  }, [])

  // Handle reconnection - rejoin session when SignalR reconnects
  const handleReconnection = useCallback(async () => {
    const session = playerSessionRef.current
    if (!session || !isPlayerRouteRef.current) return
    
    console.log('Reconnected - rejoining session...')
    try {
      await quizHub.joinSession(session.participantId)
      setConnectionStatus('connected')
    } catch (error) {
      console.error('Failed to rejoin session after reconnection:', error)
    }
  }, [])

  // Setup connection state callbacks
  useEffect(() => {
    quizHub.setOnReconnected(() => {
      handleReconnection()
    })
    
    quizHub.setOnReconnecting(() => {
      setConnectionStatus('reconnecting')
    })
    
    quizHub.setOnDisconnected(() => {
      setConnectionStatus('disconnected')
    })

    return () => {
      quizHub.setOnReconnected(null)
      quizHub.setOnReconnecting(null)
      quizHub.setOnDisconnected(null)
    }
  }, [handleReconnection])

  // Auto-connect and join when player session exists
  useEffect(() => {
    if (!playerSession || !isPlayerRouteRef.current) return
    
    // Connect and join if not connected
    if (!quizHub.connected) {
      connect().then(() => {
        quizHub.joinSession(playerSession.participantId).catch(console.error)
      })
    }
  }, [playerSession, connect])

  // Setup SignalR event listeners
  useEffect(() => {
    const unsubscribers: (() => void)[] = []

    unsubscribers.push(
      quizHub.on('SessionState', (state) => {
        setSessionState(state)
        
        // Handle state sync on reconnection
        if (isPlayerRouteRef.current && state.activeQuestion) {
          // There's an active question - restore it and navigate to play
          setCurrentQuestion({
            questionId: state.activeQuestion.questionId,
            text: state.activeQuestion.text,
            questionIndex: state.activeQuestion.questionIndex,
            totalQuestions: state.activeQuestion.totalQuestions,
            timeLimitSeconds: state.activeQuestion.remainingSeconds, // Use remaining time
            answers: state.activeQuestion.answers,
          })
          setQuestionResults(null)
          setSelectedAnswerId(null)
          navigate('/play')
        } else if (isPlayerRouteRef.current && state.status === 'Finished') {
          // Quiz ended while disconnected
          setIsQuizEnded(true)
          navigate('/final')
        } else if (isPlayerRouteRef.current && state.status === 'Active' && !state.activeQuestion) {
          // Quiz is active but between questions - go to results if we have them, otherwise wait
          // Stay on current page - next question will be pushed via QuestionReleased
        }
      })
    )

    unsubscribers.push(
      quizHub.on('SessionStarted', () => {
        setSessionState((prev) => prev ? { ...prev, status: 'Active' } : null)
        // Navigate players to the started page
        if (isPlayerRouteRef.current) {
          navigate('/started')
        }
      })
    )

    unsubscribers.push(
      quizHub.on('QuestionReleased', (question) => {
        setCurrentQuestion(question)
        setSelectedAnswerId(null)
        setQuestionResults(null)
        // Only navigate if this is a player (not admin)
        if (isPlayerRouteRef.current) {
          navigate('/play')
        }
      })
    )

    unsubscribers.push(
      quizHub.on('AnswerSubmitted', (result) => {
        setSelectedAnswerId(result.selectedAnswerId)
      })
    )

    unsubscribers.push(
      quizHub.on('QuestionClosed', (results) => {
        // Save the current question and answer for results display
        setLastQuestion(currentQuestionRef.current)
        setLastSelectedAnswerId(selectedAnswerIdRef.current)
        
        setQuestionResults(results)
        setCurrentQuestion(null)
        setSelectedAnswerId(null)
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
        setCurrentQuestion(null)
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
        selectedAnswerId,
        lastQuestion,
        lastSelectedAnswerId,
        questionResults,
        leaderboard,
        isQuizEnded,
        connectionStatus,
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
