import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Container, Typography, Paper, List, ListItem, ListItemText, Chip } from '@mui/material'
import { useSession } from '../../context/SessionContext'
import ConnectionStatus from '../../components/ConnectionStatus'

export default function WaitPage() {
  const navigate = useNavigate()
  const { playerSession, sessionState } = useSession()

  // Redirect if no session
  useEffect(() => {
    if (!playerSession) {
      navigate('/join')
    }
  }, [playerSession, navigate])

  if (!playerSession) {
    return null
  }

  const participants = sessionState?.participants || []
  const myParticipant = participants.find((p) => p.id === playerSession.participantId)

  return (
    <>
      <Container maxWidth="sm" sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h3" gutterBottom>
          {playerSession.quizTitle}
        </Typography>

        <Paper sx={{ p: 4, mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Welcome, {playerSession.playerName}!
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Waiting for the host to start the quiz...
          </Typography>

          <Box sx={{ mt: 4 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <Typography variant="h3">
                {participants.length}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              players joined
            </Typography>
          </Box>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Players
          </Typography>
          <List dense>
            {participants.map((participant) => (
              <ListItem key={participant.id}>
                <ListItemText primary={participant.name} />
                {participant.id === myParticipant?.id && (
                  <Chip label="You" size="small" color="primary" />
                )}
              </ListItem>
            ))}
          </List>
        </Paper>
      </Container>
      
      <ConnectionStatus />
    </>
  )
}
