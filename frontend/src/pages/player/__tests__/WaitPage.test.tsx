import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from '../../../theme'
import WaitPage from '../WaitPage'
import { createTestParticipant } from '../../../test/utils'

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
const mockUseSession = vi.fn()
vi.mock('../../../context/SessionContext', () => ({
  useSession: () => mockUseSession(),
}))

// Mock ConnectionStatus
vi.mock('../../../components/ConnectionStatus', () => ({
  default: () => <div data-testid="connection-status" />,
}))

function renderWaitPage() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <WaitPage />
      </MemoryRouter>
    </ThemeProvider>
  )
}

describe('WaitPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should redirect to /join if no player session', () => {
    mockUseSession.mockReturnValue({
      playerSession: null,
      sessionState: null,
    })
    
    renderWaitPage()
    
    expect(mockNavigate).toHaveBeenCalledWith('/join')
  })

  it('should display quiz title', () => {
    mockUseSession.mockReturnValue({
      playerSession: {
        participantId: 'p1',
        sessionId: 's1',
        quizTitle: 'Test Quiz',
        playerName: 'John',
      },
      sessionState: null,
    })
    
    renderWaitPage()
    
    expect(screen.getByText('Test Quiz')).toBeInTheDocument()
  })

  it('should display welcome message with player name', () => {
    mockUseSession.mockReturnValue({
      playerSession: {
        participantId: 'p1',
        sessionId: 's1',
        quizTitle: 'Test Quiz',
        playerName: 'John',
      },
      sessionState: null,
    })
    
    renderWaitPage()
    
    expect(screen.getByText('Welcome, John!')).toBeInTheDocument()
  })

  it('should display waiting message', () => {
    mockUseSession.mockReturnValue({
      playerSession: {
        participantId: 'p1',
        sessionId: 's1',
        quizTitle: 'Test Quiz',
        playerName: 'John',
      },
      sessionState: null,
    })
    
    renderWaitPage()
    
    expect(screen.getByText('Waiting for the host to start the quiz...')).toBeInTheDocument()
  })

  it('should display participant count', () => {
    const participants = [
      createTestParticipant({ id: 'p1', name: 'John' }),
      createTestParticipant({ id: 'p2', name: 'Jane' }),
      createTestParticipant({ id: 'p3', name: 'Bob' }),
    ]
    
    mockUseSession.mockReturnValue({
      playerSession: {
        participantId: 'p1',
        sessionId: 's1',
        quizTitle: 'Test Quiz',
        playerName: 'John',
      },
      sessionState: { participants },
    })
    
    renderWaitPage()
    
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('players joined')).toBeInTheDocument()
  })

  it('should display list of participants', () => {
    const participants = [
      createTestParticipant({ id: 'p1', name: 'John' }),
      createTestParticipant({ id: 'p2', name: 'Jane' }),
    ]
    
    mockUseSession.mockReturnValue({
      playerSession: {
        participantId: 'p1',
        sessionId: 's1',
        quizTitle: 'Test Quiz',
        playerName: 'John',
      },
      sessionState: { participants },
    })
    
    renderWaitPage()
    
    expect(screen.getByText('John')).toBeInTheDocument()
    expect(screen.getByText('Jane')).toBeInTheDocument()
  })

  it('should show "You" chip next to current player', () => {
    const participants = [
      createTestParticipant({ id: 'p1', name: 'John' }),
      createTestParticipant({ id: 'p2', name: 'Jane' }),
    ]
    
    mockUseSession.mockReturnValue({
      playerSession: {
        participantId: 'p1',
        sessionId: 's1',
        quizTitle: 'Test Quiz',
        playerName: 'John',
      },
      sessionState: { participants },
    })
    
    renderWaitPage()
    
    expect(screen.getByText('You')).toBeInTheDocument()
  })

  it('should render ConnectionStatus component', () => {
    mockUseSession.mockReturnValue({
      playerSession: {
        participantId: 'p1',
        sessionId: 's1',
        quizTitle: 'Test Quiz',
        playerName: 'John',
      },
      sessionState: null,
    })
    
    renderWaitPage()
    
    expect(screen.getByTestId('connection-status')).toBeInTheDocument()
  })

  it('should handle empty participants list', () => {
    mockUseSession.mockReturnValue({
      playerSession: {
        participantId: 'p1',
        sessionId: 's1',
        quizTitle: 'Test Quiz',
        playerName: 'John',
      },
      sessionState: { participants: [] },
    })
    
    renderWaitPage()
    
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('Players')).toBeInTheDocument()
  })
})
