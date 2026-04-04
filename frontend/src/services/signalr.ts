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
  private isConnecting: boolean = false
  private connectionPromise: Promise<void> | null = null

  async connect(): Promise<void> {
    // Already connected
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      return
    }

    // Connection in progress - wait for it
    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise
    }

    // Start new connection
    this.isConnecting = true
    this.connectionPromise = this.doConnect()
    
    try {
      await this.connectionPromise
    } finally {
      this.isConnecting = false
      this.connectionPromise = null
    }
  }

  private async doConnect(): Promise<void> {
    // Build the SignalR URL
    // VITE_API_URL might be "https://domain.com/api" or "https://domain.com" or empty
    let baseUrl = import.meta.env.VITE_API_URL || ''
    
    // Strip /api suffix if present, since SignalR hub is at /hubs/quiz not /api/hubs/quiz
    if (baseUrl.endsWith('/api')) {
      baseUrl = baseUrl.slice(0, -4)
    }
    
    const hubUrl = `${baseUrl}/hubs/quiz`
    console.log('Connecting to SignalR hub:', hubUrl)

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000]) // Retry intervals
      .configureLogging(signalR.LogLevel.Information)
      .build()

    // Handle reconnection
    this.connection.onreconnecting((error) => {
      console.log('SignalR reconnecting...', error)
    })

    this.connection.onreconnected((connectionId) => {
      console.log('SignalR reconnected:', connectionId)
    })

    this.connection.onclose((error) => {
      console.log('SignalR connection closed', error)
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
    console.log('SignalR connected successfully')
  }

  async disconnect(): Promise<void> {
    // Don't disconnect while connecting - it causes the negotiation error
    if (this.isConnecting) {
      console.log('Skipping disconnect - connection in progress')
      return
    }

    if (this.connection) {
      try {
        await this.connection.stop()
      } catch (err) {
        console.error('Error disconnecting SignalR:', err)
      }
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

  // Check if connected
  get connected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected
  }

  // Player methods
  async joinSession(participantId: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to SignalR')
    }
    await this.connection!.invoke('JoinSession', participantId)
  }

  async submitAnswer(participantId: string, questionId: string, answerOptionId: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to SignalR')
    }
    await this.connection!.invoke('SubmitAnswer', participantId, {
      questionId,
      answerOptionId,
    })
  }

  // Admin methods
  async joinAsAdmin(sessionId: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to SignalR')
    }
    await this.connection!.invoke('JoinAsAdmin', sessionId)
  }

  async startQuiz(sessionId: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to SignalR')
    }
    await this.connection!.invoke('StartQuiz', sessionId)
  }

  async releaseNextQuestion(sessionId: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to SignalR')
    }
    await this.connection!.invoke('ReleaseNextQuestion', sessionId)
  }

  async forceCloseQuestion(sessionId: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to SignalR')
    }
    await this.connection!.invoke('ForceCloseQuestion', sessionId)
  }

  async endQuiz(sessionId: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to SignalR')
    }
    await this.connection!.invoke('EndQuiz', sessionId)
  }
}

export const quizHub = new QuizHubService()
