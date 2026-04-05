import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Container, Typography, Paper, CircularProgress } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { useSession } from '../../context/SessionContext'
import ConnectionStatus from '../../components/ConnectionStatus'

export default function StartedPage() {
  const navigate = useNavigate()
  const { playerSession, sessionState } = useSession()

  // Redirect if no session
  useEffect(() => {
    if (!playerSession) {
      navigate('/join')
    }
  }, [playerSession, navigate])

  // Redirect back to wait if quiz not started yet
  useEffect(() => {
    if (sessionState?.status === 'Waiting') {
      navigate('/wait')
    }
  }, [sessionState?.status, navigate])

  if (!playerSession) {
    return null
  }

  return (
    <>
      <Container maxWidth="sm" sx={{ py: 4, textAlign: 'center' }}>
        <Paper 
          sx={{ 
            p: 6, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
          }}
        >
          <Box
            sx={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            <PlayArrowIcon sx={{ fontSize: 60 }} />
          </Box>

          <Typography variant="h3" gutterBottom sx={{ fontWeight: 700 }}>
            Kweez has started!
          </Typography>

          <Typography variant="h6" sx={{ opacity: 0.9, mb: 4 }}>
            {playerSession.quizTitle}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <CircularProgress size={24} sx={{ color: 'white' }} />
            <Typography variant="body1">
              Waiting for the first question...
            </Typography>
          </Box>
        </Paper>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
          Get ready, {playerSession.playerName}!
        </Typography>
      </Container>
      
      <ConnectionStatus />
    </>
  )
}
