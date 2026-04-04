import * as signalR from '@microsoft/signalr'
import type {
  SessionState,
  Participant,
  QuestionReleased,
  AnswerResult,
  QuestionResults,
  LeaderboardEntry,
} from '../types'

export type QuizHubEvents = {
  PlayerJoined: (participant: Participant) => void
  PlayerLeft: (participantId: string) => void
  SessionStarted: () => void
  QuestionReleased: (question: QuestionReleased) => void
  AnswerResult: (result: AnswerResult) => void
  QuestionClosed: (results: QuestionResults) => void
  LeaderboardUpdated: (leaderboard: LeaderboardEntry[]) => void
  QuizEnded: (finalLeaderboard: LeaderboardEntry[]) => void
  SessionState: (state: SessionState) => void
  Error: (message: string) => void
}

class QuizHubService {
  private connection: signalR.HubConnection | null = null
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map()

  async connect(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      return
    }

    const apiUrl = import.meta.env.VITE_API_URL || ''
    
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${apiUrl}/hubs/quiz`)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build()

    // Re-register listeners on reconnect
    this.connection.onreconnected(() => {
      console.log('SignalR reconnected')
    })

    // Register all event handlers
    const eventNames: (keyof QuizHubEvents)[] = [
      'PlayerJoined',
      'PlayerLeft',
      'SessionStarted',
      'QuestionReleased',
      'AnswerResult',
      'QuestionClosed',
      'LeaderboardUpdated',
      'QuizEnded',
      'SessionState',
      'Error',
    ]

    eventNames.forEach((eventName) => {
      this.connection!.on(eventName, (...args: unknown[]) => {
        const callbacks = this.listeners.get(eventName)
        callbacks?.forEach((cb) => cb(...args))
      })
    })

    await this.connection.start()
    console.log('SignalR connected')
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop()
      this.connection = null
    }
  }

  on<K extends keyof QuizHubEvents>(event: K, callback: QuizHubEvents[K]): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback as (...args: unknown[]) => void)

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback as (...args: unknown[]) => void)
    }
  }

  // Player methods
  async joinSession(participantId: string): Promise<void> {
    await this.connection?.invoke('JoinSession', participantId)
  }

  async submitAnswer(participantId: string, questionId: string, answerOptionId: string): Promise<void> {
    await this.connection?.invoke('SubmitAnswer', participantId, {
      questionId,
      answerOptionId,
    })
  }

  // Admin methods
  async joinAsAdmin(sessionId: string): Promise<void> {
    await this.connection?.invoke('JoinAsAdmin', sessionId)
  }

  async startQuiz(sessionId: string): Promise<void> {
    await this.connection?.invoke('StartQuiz', sessionId)
  }

  async releaseNextQuestion(sessionId: string): Promise<void> {
    await this.connection?.invoke('ReleaseNextQuestion', sessionId)
  }

  async forceCloseQuestion(sessionId: string): Promise<void> {
    await this.connection?.invoke('ForceCloseQuestion', sessionId)
  }

  async endQuiz(sessionId: string): Promise<void> {
    await this.connection?.invoke('EndQuiz', sessionId)
  }
}

export const quizHub = new QuizHubService()
