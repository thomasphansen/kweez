import '@testing-library/jest-dom'
import { vi } from 'vitest'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Initialize i18n for tests
i18n
  .use(initReactI18next)
  .init({
    lng: 'en',
    fallbackLng: 'en',
    ns: ['translation'],
    defaultNS: 'translation',
    resources: {
      en: {
        translation: {
          common: {
            players: 'Players',
            you: 'You',
            points: 'points',
            pts: 'pts',
            question: 'Question',
            online: 'Online',
            offline: 'Offline',
            cancel: 'Cancel',
            create: 'Create',
            delete: 'Delete',
            goBack: 'Go Back',
            connected: 'Connected',
            disconnected: 'Disconnected',
          },
          wait: {
            welcome: 'Welcome, {{name}}!',
            waitingForHost: 'Waiting for the host to start the quiz...',
            playersJoined: 'players joined',
          },
          started: {
            quizStarted: 'Kweez has started!',
            waitingForFirstQuestion: 'Waiting for the first question...',
            getReady: 'Get ready, {{name}}!',
          },
          play: {
            questionOf: 'Question {{current}} of {{total}}',
            timeLeft: '{{time}}s',
            tapToChange: 'Tap another answer to change',
            answerSubmitted: 'Answer submitted!',
            waitingForResults: 'Waiting for results...',
          },
          results: {
            questionResults: 'Question {{number}} Results',
            correct: 'Correct!',
            wrong: 'Wrong!',
            plusPoints: '+{{points}} points',
            yourPosition: 'Your Position',
            leaderboard: 'Leaderboard',
            waitingForNextQuestion: 'Waiting for next question...',
          },
          connection: {
            reconnecting: 'Reconnecting...',
            pleaseWait: 'Please wait while we restore your connection',
            connectionLost: 'Connection Lost',
            tryingToReconnect: 'Trying to reconnect...',
          },
        },
      },
    },
    interpolation: {
      escapeValue: false,
    },
  })

// Mock import.meta.env
vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_API_URL: 'http://localhost:5000',
    },
  },
})

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks()
  localStorageMock.clear()
})
