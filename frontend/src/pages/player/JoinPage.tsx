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
import { useTranslation } from 'react-i18next'
import { sessionApi } from '../../services/api'
import { useSession } from '../../context/SessionContext'

export default function JoinPage() {
  const { t } = useTranslation()
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
        setError(t('join.invalidSessionCode'))
      })
    }
  }, [searchParams, t])

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
        setError(t('join.sessionNotFound'))
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
      setError(err instanceof Error ? err.message : t('join.failedToJoin'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h2" component="h1" gutterBottom>
          {t('join.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('join.subtitle')}
        </Typography>
      </Box>

      <Paper sx={{ p: 4 }}>
        <Box component="form" onSubmit={(e) => { e.preventDefault(); handleJoin(); }}>
          <TextField
            fullWidth
            label={t('join.gamePinLabel')}
            value={joinCode}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder={t('join.gamePinPlaceholder')}
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
              {t('join.quizFound', { title: quizTitle })}
            </Alert>
          )}

          <TextField
            fullWidth
            label={t('join.yourNameLabel')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('join.yourNamePlaceholder')}
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
            {loading ? <CircularProgress size={24} /> : t('join.joinGame')}
          </Button>
        </Box>
      </Paper>
    </Container>
  )
}
