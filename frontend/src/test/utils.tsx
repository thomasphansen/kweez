import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { MemoryRouter, MemoryRouterProps } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from '../theme'

interface WrapperOptions {
  initialEntries?: MemoryRouterProps['initialEntries']
}

function createWrapper({ initialEntries = ['/'] }: WrapperOptions = {}) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={initialEntries}>
          {children}
        </MemoryRouter>
      </ThemeProvider>
    )
  }
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & WrapperOptions
) {
  const { initialEntries, ...renderOptions } = options || {}
  return render(ui, {
    wrapper: createWrapper({ initialEntries }),
    ...renderOptions,
  })
}

// Test data factories
export const createTestQuestion = (overrides: Partial<{
  questionId: string
  text: string
  questionIndex: number
  totalQuestions: number
  timeLimitSeconds: number
  answers: Array<{ id: string; text: string; index: number }>
}> = {}) => ({
  questionId: 'q1',
  text: 'What is 2 + 2?',
  questionIndex: 0,
  totalQuestions: 3,
  timeLimitSeconds: 15,
  answers: [
    { id: 'a1', text: '3', index: 0 },
    { id: 'a2', text: '4', index: 1 },
    { id: 'a3', text: '5', index: 2 },
    { id: 'a4', text: '6', index: 3 },
  ],
  ...overrides,
})

export const createTestParticipant = (overrides: Partial<{
  id: string
  name: string
  totalScore: number
  isConnected: boolean
}> = {}) => ({
  id: 'p1',
  name: 'Test Player',
  totalScore: 0,
  isConnected: true,
  ...overrides,
})

export const createTestSessionState = (overrides: Partial<{
  sessionId: string
  status: 'Waiting' | 'Active' | 'Finished'
  currentQuestionIndex?: number
  totalQuestions: number
  participants: Array<{
    id: string
    name: string
    totalScore: number
    isConnected: boolean
  }>
}> = {}) => ({
  sessionId: 's1',
  status: 'Waiting' as const,
  totalQuestions: 3,
  participants: [createTestParticipant()],
  ...overrides,
})

export const createTestLeaderboardEntry = (overrides: Partial<{
  rank: number
  participantId: string
  name: string
  totalScore: number
  lastQuestionScore?: number
}> = {}) => ({
  rank: 1,
  participantId: 'p1',
  name: 'Test Player',
  totalScore: 1000,
  lastQuestionScore: 1000,
  ...overrides,
})

export const createTestAnswerSubmitted = (overrides: Partial<{
  selectedAnswerId: string
}> = {}) => ({
  selectedAnswerId: 'a2',
  ...overrides,
})

// Legacy helper for backwards compatibility in tests
export const createTestAnswerResult = createTestAnswerSubmitted

export const createTestQuestionResults = (overrides: Partial<{
  questionId: string
  questionIndex: number
  answerCounts: Record<string, number>
  correctAnswerId: string
  leaderboard: Array<{
    rank: number
    participantId: string
    name: string
    totalScore: number
    lastQuestionScore?: number
  }>
}> = {}) => ({
  questionId: 'q1',
  questionIndex: 0,
  answerCounts: { a1: 2, a2: 5, a3: 1, a4: 0 },
  correctAnswerId: 'a2',
  leaderboard: [createTestLeaderboardEntry()],
  ...overrides,
})
