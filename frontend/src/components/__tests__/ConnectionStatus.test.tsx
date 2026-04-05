import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from '../../theme'
import ConnectionStatus from '../ConnectionStatus'

// Mock useSession hook
const mockUseSession = vi.fn()
vi.mock('../../context/SessionContext', () => ({
  useSession: () => mockUseSession(),
}))

function renderConnectionStatus() {
  return render(
    <ThemeProvider theme={theme}>
      <ConnectionStatus />
    </ThemeProvider>
  )
}

describe('ConnectionStatus', () => {
  it('should not show overlay when connected', () => {
    mockUseSession.mockReturnValue({
      connectionStatus: 'connected',
    })
    
    renderConnectionStatus()
    
    // The overlay has display: none when connected, so while elements may exist in DOM,
    // they should not be visible. We check the container has display: none
    const overlay = screen.queryByText('Connection Lost')
    if (overlay) {
      // Find the overlay container and check it's hidden
      const container = overlay.closest('[class*="MuiBox-root"]')
      expect(container).toHaveStyle({ display: 'none' })
    }
    expect(screen.queryByText('Reconnecting...')).not.toBeInTheDocument()
  })

  it('should show reconnecting message when reconnecting', () => {
    mockUseSession.mockReturnValue({
      connectionStatus: 'reconnecting',
    })
    
    renderConnectionStatus()
    
    expect(screen.getByText('Reconnecting...')).toBeInTheDocument()
    expect(screen.getByText('Please wait while we restore your connection')).toBeInTheDocument()
  })

  it('should show connection lost message when disconnected', () => {
    mockUseSession.mockReturnValue({
      connectionStatus: 'disconnected',
    })
    
    renderConnectionStatus()
    
    expect(screen.getByText('Connection Lost')).toBeInTheDocument()
    expect(screen.getByText('Trying to reconnect...')).toBeInTheDocument()
  })

  it('should show CircularProgress when reconnecting', () => {
    mockUseSession.mockReturnValue({
      connectionStatus: 'reconnecting',
    })
    
    renderConnectionStatus()
    
    // MUI CircularProgress renders with role="progressbar"
    const progressIndicators = screen.getAllByRole('progressbar')
    expect(progressIndicators.length).toBeGreaterThan(0)
  })

  it('should show CircularProgress when disconnected', () => {
    mockUseSession.mockReturnValue({
      connectionStatus: 'disconnected',
    })
    
    renderConnectionStatus()
    
    const progressIndicators = screen.getAllByRole('progressbar')
    expect(progressIndicators.length).toBeGreaterThan(0)
  })
})
