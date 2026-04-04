import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material'
import { sessionApi } from '../../services/api'
import { useSession } from '../../context/SessionContext'

export default function JoinPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setPlayerSession, connect, joinSession, clearGameState } = useSession()

  const [joinCode, setJoinCode] = useState(searchParams.get('session') || '')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [quizTitle, setQuizTitle] = useState('')

  // Check if join code is valid
  useEffect(() => {
    const code = searchParams.get('session')
    if (code) {
      setJoinCode(code.toUpperCase())
      sessionApi.getByCode(code).then((session) => {
        setQuizTitle(session.quizTitle)
      }).catch(() => {
        setError('Invalid session code')
      })
    }
  }, [searchParams])

  const handleCodeChange = async (code: string) => {
    const upperCode = code.toUpperCase().slice(0, 6)
    setJoinCode(upperCode)
    setError('')
    setQuizTitle('')

    if (upperCode.length === 6) {
      try {
        const session = await sessionApi.getByCode(upperCode)
        setQuizTitle(session.quizTitle)
      } catch {
        setError('Session not found')
      }
    }
  }

  const handleJoin = async () => {
    if (!joinCode || !name.trim()) return

    setLoading(true)
    setError('')
    clearGameState()

    try {
      // Join via REST API first
      const response = await sessionApi.join(joinCode, name.trim())

      // Store session info
      setPlayerSession({
        participantId: response.participantId,
        sessionId: response.sessionId,
        quizTitle: response.quizTitle,
        playerName: name.trim(),
      })

      // Connect to SignalR and join session
      await connect()
      await joinSession(response.participantId)

      // Navigate to waiting room
      navigate('/wait')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h2" component="h1" gutterBottom>
          kweez
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Join the quiz!
        </Typography>
      </Box>

      <Paper sx={{ p: 4 }}>
        <Box component="form" onSubmit={(e) => { e.preventDefault(); handleJoin(); }}>
          <TextField
            fullWidth
            label="Game PIN"
            value={joinCode}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="Enter 6-character code"
            inputProps={{ 
              maxLength: 6,
              style: { 
                textAlign: 'center', 
                fontSize: '1.5rem',
                letterSpacing: '0.5rem',
                textTransform: 'uppercase',
              },
            }}
            sx={{ mb: 2 }}
          />

          {quizTitle && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Quiz: {quizTitle}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            inputProps={{ maxLength: 50 }}
            sx={{ mb: 3 }}
          />

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleJoin}
            disabled={!joinCode || !name.trim() || loading || !!error}
          >
            {loading ? <CircularProgress size={24} /> : 'Join Game'}
          </Button>
        </Box>
      </Paper>
    </Container>
  )
}
