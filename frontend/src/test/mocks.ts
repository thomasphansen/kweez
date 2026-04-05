import { vi } from 'vitest'
import type { QuizHubEvents } from '../services/signalr'

// Create a mock QuizHub service for testing
export function createMockQuizHub() {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>()
  let isConnected = false
  let onReconnectedCallback: (() => void) | null = null
  let onReconnectingCallback: (() => void) | null = null
  let onDisconnectedCallback: (() => void) | null = null

  const mockHub = {
    connect: vi.fn(async () => {
      isConnected = true
    }),
    disconnect: vi.fn(async () => {
      isConnected = false
    }),
    get connected() {
      return isConnected
    },
    get reconnecting() {
      return false
    },
    on: vi.fn(<K extends keyof QuizHubEvents>(event: K, callback: QuizHubEvents[K]) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set())
      }
      listeners.get(event)!.add(callback as (...args: unknown[]) => void)
      return () => {
        listeners.get(event)?.delete(callback as (...args: unknown[]) => void)
      }
    }),
    setOnReconnected: vi.fn((callback: (() => void) | null) => {
      onReconnectedCallback = callback
    }),
    setOnReconnecting: vi.fn((callback: (() => void) | null) => {
      onReconnectingCallback = callback
    }),
    setOnDisconnected: vi.fn((callback: (() => void) | null) => {
      onDisconnectedCallback = callback
    }),
    joinSession: vi.fn(async () => {}),
    submitAnswer: vi.fn(async () => {}),
    joinAsAdmin: vi.fn(async () => {}),
    startQuiz: vi.fn(async () => {}),
    releaseNextQuestion: vi.fn(async () => {}),
    forceCloseQuestion: vi.fn(async () => {}),
    endQuiz: vi.fn(async () => {}),

    // Test helpers - not part of actual API
    _emit: <K extends keyof QuizHubEvents>(event: K, ...args: Parameters<QuizHubEvents[K]>) => {
      const callbacks = listeners.get(event)
      callbacks?.forEach((cb) => cb(...args))
    },
    _simulateReconnected: () => {
      onReconnectedCallback?.()
    },
    _simulateReconnecting: () => {
      onReconnectingCallback?.()
    },
    _simulateDisconnected: () => {
      onDisconnectedCallback?.()
    },
    _setConnected: (value: boolean) => {
      isConnected = value
    },
    _clearListeners: () => {
      listeners.clear()
    },
  }

  return mockHub
}

// Type for our mock hub with test helpers
export type MockQuizHub = ReturnType<typeof createMockQuizHub>
