import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from '../../../theme'
import PlayPage from '../PlayPage'
import { createTestQuestion, createTestAnswerResult } from '../../../test/utils'

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock useSession
const mockSubmitAnswer = vi.fn()
const mockUseSession = vi.fn()
vi.mock('../../../context/SessionContext', () => ({
  useSession: () => mockUseSession(),
}))

// Mock ConnectionStatus
vi.mock('../../../components/ConnectionStatus', () => ({
  default: () => <div data-testid="connection-status" />,
}))

function renderPlayPage() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <PlayPage />
      </MemoryRouter>
    </ThemeProvider>
  )
}

describe('PlayPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should redirect to /join if no player session', () => {
    mockUseSession.mockReturnValue({
      playerSession: null,
      currentQuestion: null,
      lastAnswerResult: null,
      submitAnswer: mockSubmitAnswer,
    })
    
    renderPlayPage()
    
    expect(mockNavigate).toHaveBeenCalledWith('/join')
  })

  it('should redirect to /wait if no current question', () => {
    mockUseSession.mockReturnValue({
      playerSession: {
        participantId: 'p1',
        sessionId: 's1',
        quizTitle: 'Test Quiz',
        playerName: 'John',
      },
      currentQuestion: null,
      lastAnswerResult: null,
      submitAnswer: mockSubmitAnswer,
    })
    
    renderPlayPage()
    
    expect(mockNavigate).toHaveBeenCalledWith('/wait')
  })

  it('should display question text', () => {
    const question = createTestQuestion({ text: 'What is the capital of France?' })
    mockUseSession.mockReturnValue({
      playerSession: {
        participantId: 'p1',
        sessionId: 's1',
        quizTitle: 'Test Quiz',
        playerName: 'John',
      },
      currentQuestion: question,
      lastAnswerResult: null,
      submitAnswer: mockSubmitAnswer,
    })
    
    renderPlayPage()
    
    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument()
  })

  it('should display question progress', () => {
    const question = createTestQuestion({ questionIndex: 1, totalQuestions: 5 })
    mockUseSession.mockReturnValue({
      playerSession: {
        participantId: 'p1',
        sessionId: 's1',
        quizTitle: 'Test Quiz',
        playerName: 'John',
      },
      currentQuestion: question,
      lastAnswerResult: null,
      submitAnswer: mockSubmitAnswer,
    })
    
    renderPlayPage()
    
    expect(screen.getByText('Question 2 of 5')).toBeInTheDocument()
  })

  it('should display all answer options', () => {
    const question = createTestQuestion({
      answers: [
        { id: 'a1', text: 'Paris', index: 0 },
        { id: 'a2', text: 'London', index: 1 },
        { id: 'a3', text: 'Berlin', index: 2 },
        { id: 'a4', text: 'Madrid', index: 3 },
      ],
    })
    mockUseSession.mockReturnValue({
      playerSession: {
        participantId: 'p1',
        sessionId: 's1',
        quizTitle: 'Test Quiz',
        playerName: 'John',
      },
      currentQuestion: question,
      lastAnswerResult: null,
      submitAnswer: mockSubmitAnswer,
    })
    
    renderPlayPage()
    
    expect(screen.getByText('Paris')).toBeInTheDocument()
    expect(screen.getByText('London')).toBeInTheDocument()
    expect(screen.getByText('Berlin')).toBeInTheDocument()
    expect(screen.getByText('Madrid')).toBeInTheDocument()
  })

  it('should display timer with initial time', () => {
    const question = createTestQuestion({ timeLimitSeconds: 15 })
    mockUseSession.mockReturnValue({
      playerSession: {
        participantId: 'p1',
        sessionId: 's1',
        quizTitle: 'Test Quiz',
        playerName: 'John',
      },
      currentQuestion: question,
      lastAnswerResult: null,
      submitAnswer: mockSubmitAnswer,
    })
    
    renderPlayPage()
    
    expect(screen.getByText('15s')).toBeInTheDocument()
  })

  it('should call submitAnswer when answer is clicked', async () => {
    const question = createTestQuestion()
    mockUseSession.mockReturnValue({
      playerSession: {
        participantId: 'p1',
        sessionId: 's1',
        quizTitle: 'Test Quiz',
        playerName: 'John',
      },
      currentQuestion: question,
      lastAnswerResult: null,
      submitAnswer: mockSubmitAnswer,
    })
    
    renderPlayPage()
    
    const answerButton = screen.getByText('4')
    fireEvent.click(answerButton)
    
    expect(mockSubmitAnswer).toHaveBeenCalledWith('a2')
  })

  it('should show "Answer submitted!" after clicking answer', () => {
    const question = createTestQuestion()
    mockUseSession.mockReturnValue({
      playerSession: {
        participantId: 'p1',
        sessionId: 's1',
        quizTitle: 'Test Quiz',
        playerName: 'John',
      },
      currentQuestion: question,
      lastAnswerResult: null,
      submitAnswer: mockSubmitAnswer,
    })
    
    renderPlayPage()
    
    const answerButton = screen.getByText('4')
    fireEvent.click(answerButton)
    
    expect(screen.getByText('Answer submitted!')).toBeInTheDocument()
  })

  it('should disable all answers after one is selected', () => {
    const question = createTestQuestion()
    mockUseSession.mockReturnValue({
      playerSession: {
        participantId: 'p1',
        sessionId: 's1',
        quizTitle: 'Test Quiz',
        playerName: 'John',
      },
      currentQuestion: question,
      lastAnswerResult: null,
      submitAnswer: mockSubmitAnswer,
    })
    
    renderPlayPage()
    
    const answerButton = screen.getByText('4')
    fireEvent.click(answerButton)
    
    // Try clicking another answer
    const anotherButton = screen.getByText('3')
    fireEvent.click(anotherButton)
    
    // submitAnswer should only be called once
    expect(mockSubmitAnswer).toHaveBeenCalledTimes(1)
  })

  it('should show correct answer result', () => {
    const question = createTestQuestion()
    const result = createTestAnswerResult({ isCorrect: true, score: 950 })
    mockUseSession.mockReturnValue({
      playerSession: {
        participantId: 'p1',
        sessionId: 's1',
        quizTitle: 'Test Quiz',
        playerName: 'John',
      },
      currentQuestion: question,
      lastAnswerResult: result,
      submitAnswer: mockSubmitAnswer,
    })
    
    renderPlayPage()
    
    expect(screen.getByText('Correct!')).toBeInTheDocument()
    expect(screen.getByText('+950 points')).toBeInTheDocument()
  })

  it('should show wrong answer result', () => {
    const question = createTestQuestion()
    const result = createTestAnswerResult({ isCorrect: false, score: 0 })
    mockUseSession.mockReturnValue({
      playerSession: {
        participantId: 'p1',
        sessionId: 's1',
        quizTitle: 'Test Quiz',
        playerName: 'John',
      },
      currentQuestion: question,
      lastAnswerResult: result,
      submitAnswer: mockSubmitAnswer,
    })
    
    renderPlayPage()
    
    expect(screen.getByText('Wrong!')).toBeInTheDocument()
  })

  it('should render ConnectionStatus component', () => {
    const question = createTestQuestion()
    mockUseSession.mockReturnValue({
      playerSession: {
        participantId: 'p1',
        sessionId: 's1',
        quizTitle: 'Test Quiz',
        playerName: 'John',
      },
      currentQuestion: question,
      lastAnswerResult: null,
      submitAnswer: mockSubmitAnswer,
    })
    
    renderPlayPage()
    
    expect(screen.getByTestId('connection-status')).toBeInTheDocument()
  })

  it('should countdown timer', async () => {
    const question = createTestQuestion({ timeLimitSeconds: 15 })
    mockUseSession.mockReturnValue({
      playerSession: {
        participantId: 'p1',
        sessionId: 's1',
        quizTitle: 'Test Quiz',
        playerName: 'John',
      },
      currentQuestion: question,
      lastAnswerResult: null,
      submitAnswer: mockSubmitAnswer,
    })
    
    renderPlayPage()
    
    expect(screen.getByText('15s')).toBeInTheDocument()
    
    // Advance timer by 1 second using act
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    
    expect(screen.getByText('14s')).toBeInTheDocument()
  })
})
