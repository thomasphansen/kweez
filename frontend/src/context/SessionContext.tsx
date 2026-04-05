import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { quizHub } from '../services/signalr'
import type {
  QuestionReleased,
  QuestionResults,
  LeaderboardEntry,
  SessionState,
  AnswerChoice,
} from '../types'

interface PlayerSession {
  participantId: string
  sessionId: string
  quizTitle: string
  playerName: string
}

// Localized question for display (with text resolved for current language)
interface LocalizedQuestion {
  questionId: string
  text: string
  imageUrl?: string
  questionIndex: number
  totalQuestions: number
  timeLimitSeconds: number
  answers: AnswerChoice[]
}

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting'

interface SessionContextType {
  // Player state
  playerSession: PlayerSession | null
  setPlayerSession: (session: PlayerSession | null) => void
  
  // Game state
  sessionState: SessionState | null
  currentQuestion: LocalizedQuestion | null
  selectedAnswerId: string | null
  lastQuestion: LocalizedQuestion | null  // Store last question for results display
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
  const { i18n } = useTranslation()
  
  // Track if this is a player (not admin/display) - admin routes start with /admin, display routes with /display
  const isPlayerRoute = !location.pathname.startsWith('/admin') && !location.pathname.startsWith('/display')
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
  const [currentQuestion, setCurrentQuestion] = useState<LocalizedQuestion | null>(null)
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null)
  const [lastQuestion, setLastQuestion] = useState<LocalizedQuestion | null>(null)
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
  
  // Helper to pick the best language for quiz content
  const pickQuizLanguage = useCallback((availableLanguages: string[], defaultLanguage: string): string => {
    const uiLanguage = i18n.language.split('-')[0] // Get base language (e.g., 'en' from 'en-US')
    if (availableLanguages.includes(uiLanguage)) {
      return uiLanguage
    }
    return defaultLanguage
  }, [i18n.language])
  
  // Helper to localize a QuestionReleased into LocalizedQuestion
  const localizeQuestion = useCallback((question: QuestionReleased): LocalizedQuestion => {
    const lang = pickQuizLanguage(question.availableLanguages, question.defaultLanguage)
    const translation = question.translations[lang] || question.translations[question.defaultLanguage]
    
    return {
      questionId: question.questionId,
      text: translation?.questionText || '',
      imageUrl: question.imageUrl,
      questionIndex: question.questionIndex,
      totalQuestions: question.totalQuestions,
      timeLimitSeconds: question.timeLimitSeconds,
      answers: question.answerIds.map((id, index) => ({
        id,
        text: translation?.answerTexts[index] || '',
        index,
      })),
    }
  }, [pickQuizLanguage])

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
          // Pick the right language for the player
          const lang = pickQuizLanguage(state.availableLanguages, state.defaultLanguage)
          const translation = state.activeQuestion.translations[lang] || state.activeQuestion.translations[state.defaultLanguage]
          
          setCurrentQuestion({
            questionId: state.activeQuestion.questionId,
            text: translation?.questionText || '',
            imageUrl: state.activeQuestion.imageUrl,
            questionIndex: state.activeQuestion.questionIndex,
            totalQuestions: state.activeQuestion.totalQuestions,
            timeLimitSeconds: state.activeQuestion.remainingSeconds, // Use remaining time
            answers: state.activeQuestion.answerIds.map((id, index) => ({
              id,
              text: translation?.answerTexts[index] || '',
              index,
            })),
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
        // Localize the question based on UI language
        const localized = localizeQuestion(question)
        setCurrentQuestion(localized)
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
  }, [navigate, localizeQuestion, pickQuizLanguage])

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
