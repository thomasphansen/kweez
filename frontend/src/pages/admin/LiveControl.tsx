import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  Chip,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import StopIcon from '@mui/icons-material/Stop'
import { QRCodeSVG } from 'qrcode.react'
import { sessionApi } from '../../services/api'
import { quizHub } from '../../services/signalr'
import type { Session, SessionState, QuestionReleased, QuestionResults, LeaderboardEntry } from '../../types'

export default function LiveControl() {
  const { sessionId } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [sessionState, setSessionState] = useState<SessionState | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<QuestionReleased | null>(null)
  const [questionResults, setQuestionResults] = useState<QuestionResults | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState('')
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true)

  // Initialize session and SignalR connection
  useEffect(() => {
    if (!sessionId) return

    const currentSessionId = sessionId // Capture for closure
    let cancelled = false

    async function init() {
      // Load session data
      try {
        const data = await sessionApi.getById(currentSessionId)
        if (!cancelled && isMountedRef.current) {
          setSession(data)
        }
      } catch (err) {
        if (!cancelled && isMountedRef.current) {
          setError('Session not found')
        }
      } finally {
        if (!cancelled && isMountedRef.current) {
          setLoading(false)
        }
      }

      // Connect to SignalR
      try {
        await quizHub.connect()
        if (!cancelled && isMountedRef.current) {
          await quizHub.joinAsAdmin(currentSessionId)
          setIsConnected(true)
        }
      } catch (err) {
        if (!cancelled && isMountedRef.current) {
          console.error('SignalR connection error:', err)
          setError('Failed to connect to real-time updates')
        }
      }
    }

    init()

    // Cleanup: only mark as cancelled, don't disconnect during re-renders
    return () => {
      cancelled = true
    }
  }, [sessionId])

  // Cleanup SignalR only on actual unmount (empty deps)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      quizHub.disconnect()
    }
  }, [])

  // SignalR event listeners
  useEffect(() => {
    const unsubscribers: (() => void)[] = []

    unsubscribers.push(
      quizHub.on('SessionState', (state) => {
        setSessionState(state)
        setSession((prev) => prev ? { ...prev, status: state.status } : null)
      })
    )

    unsubscribers.push(
      quizHub.on('PlayerJoined', (participant) => {
        setSessionState((prev) => {
          if (!prev) return null
          const exists = prev.participants.some((p) => p.id === participant.id)
          if (exists) {
            return {
              ...prev,
              participants: prev.participants.map((p) =>
                p.id === participant.id ? participant : p
              ),
            }
          }
          return { ...prev, participants: [...prev.participants, participant] }
        })
      })
    )

    unsubscribers.push(
      quizHub.on('SessionStarted', () => {
        setSession((prev) => prev ? { ...prev, status: 'Active' } : null)
      })
    )

    unsubscribers.push(
      quizHub.on('QuestionReleased', (question) => {
        setCurrentQuestion(question)
        setQuestionResults(null)
      })
    )

    unsubscribers.push(
      quizHub.on('QuestionClosed', (results) => {
        setQuestionResults(results)
        setLeaderboard(results.leaderboard)
        setCurrentQuestion(null)
      })
    )

    unsubscribers.push(
      quizHub.on('LeaderboardUpdated', (lb) => {
        setLeaderboard(lb)
      })
    )

    unsubscribers.push(
      quizHub.on('QuizEnded', (finalLeaderboard) => {
        setLeaderboard(finalLeaderboard)
        setSession((prev) => prev ? { ...prev, status: 'Finished' } : null)
      })
    )

    return () => {
      unsubscribers.forEach((unsub) => unsub())
    }
  }, [])

  const handleStartQuiz = async () => {
    if (!sessionId) return
    try {
      await quizHub.startQuiz(sessionId)
    } catch (err) {
      setError('Failed to start quiz')
    }
  }

  const handleNextQuestion = async () => {
    if (!sessionId) return
    try {
      await quizHub.releaseNextQuestion(sessionId)
    } catch (err) {
      setError('Failed to release question')
    }
  }

  const handleForceClose = async () => {
    if (!sessionId) return
    try {
      await quizHub.forceCloseQuestion(sessionId)
    } catch (err) {
      setError('Failed to close question')
    }
  }

  const handleEndQuiz = async () => {
    setShowEndConfirm(false)
    if (!sessionId) return
    try {
      await quizHub.endQuiz(sessionId)
    } catch (err) {
      setError('Failed to end quiz')
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!session) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">Session not found</Alert>
        <Button onClick={() => navigate('/admin')} sx={{ mt: 2 }}>
          Back to Dashboard
        </Button>
      </Container>
    )
  }

  const joinUrl = `${window.location.origin}/join?session=${session.joinCode}`
  const participants = sessionState?.participants || []
  const isWaiting = session.status === 'Waiting'
  const isActive = session.status === 'Active'
  const isFinished = session.status === 'Finished'

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <IconButton onClick={() => navigate('/admin')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ flex: 1 }}>
          {session.quizTitle}
        </Typography>
        <Chip
          label={isConnected ? 'Connected' : 'Disconnected'}
          color={isConnected ? 'success' : 'error'}
          size="small"
        />
        <Chip
          label={session.status}
          color={isActive ? 'primary' : isFinished ? 'default' : 'warning'}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* Left Column - Controls */}
        <Grid item xs={12} md={8}>
          {/* QR Code (show when waiting) */}
          {isWaiting && (
            <Paper sx={{ p: 4, textAlign: 'center', mb: 4 }}>
              <Typography variant="h5" gutterBottom>
                Join Code: <strong>{session.joinCode}</strong>
              </Typography>
              <Box sx={{ my: 3, display: 'flex', justifyContent: 'center' }}>
                <QRCodeSVG value={joinUrl} size={250} />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {joinUrl}
              </Typography>
            </Paper>
          )}

          {/* Current Question */}
          {currentQuestion && (
            <Paper sx={{ p: 4, mb: 4 }}>
              <Typography variant="overline">
                Question {currentQuestion.questionIndex + 1} of {currentQuestion.totalQuestions}
              </Typography>
              <Typography variant="h5" sx={{ my: 2 }}>
                {currentQuestion.text}
              </Typography>
              <List>
                {currentQuestion.answers.map((answer, index) => (
                  <ListItem key={answer.id}>
                    <ListItemText primary={`${index + 1}. ${answer.text}`} />
                  </ListItem>
                ))}
              </List>
              <Typography variant="body2" color="text.secondary">
                Time limit: {currentQuestion.timeLimitSeconds} seconds
              </Typography>
            </Paper>
          )}

          {/* Question Results */}
          {questionResults && !currentQuestion && (
            <Paper sx={{ p: 4, mb: 4 }}>
              <Typography variant="h5" gutterBottom>
                Question {questionResults.questionIndex + 1} Results
              </Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                Answer distribution shown. Ready for next question.
              </Typography>
            </Paper>
          )}

          {/* Controls */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Controls
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {isWaiting && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<PlayArrowIcon />}
                  onClick={handleStartQuiz}
                  disabled={participants.length === 0}
                >
                  Start Quiz
                </Button>
              )}

              {isWaiting && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<StopIcon />}
                  onClick={() => setShowEndConfirm(true)}
                >
                  Cancel Session
                </Button>
              )}

              {isActive && !currentQuestion && (
                <Button
                  variant="contained"
                  startIcon={<SkipNextIcon />}
                  onClick={handleNextQuestion}
                >
                  {!questionResults 
                    ? 'First Question' 
                    : questionResults.questionIndex + 1 >= (sessionState?.totalQuestions || 0)
                      ? 'Final Results'
                      : 'Next Question'}
                </Button>
              )}

              {isActive && currentQuestion && (
                <Button
                  variant="outlined"
                  onClick={handleForceClose}
                >
                  Force Close Question
                </Button>
              )}

              {isActive && (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<StopIcon />}
                  onClick={() => setShowEndConfirm(true)}
                >
                  End Quiz
                </Button>
              )}

              {isFinished && (
                <Button
                  variant="contained"
                  onClick={() => navigate('/admin')}
                >
                  Back to Dashboard
                </Button>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Right Column - Participants & Leaderboard */}
        <Grid item xs={12} md={4}>
          {/* Participants/Leaderboard */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {isWaiting ? 'Players' : 'Leaderboard'} ({participants.length})
            </Typography>
            <List dense>
              {(isWaiting ? participants : leaderboard.length > 0 ? leaderboard.map(l => ({
                id: l.participantId,
                name: l.name,
                totalScore: l.totalScore,
                isConnected: true,
              })) : participants).map((p, index) => (
                <ListItem key={p.id}>
                  {!isWaiting && (
                    <Typography sx={{ width: 30, fontWeight: 'bold' }}>
                      {index + 1}.
                    </Typography>
                  )}
                  <ListItemText
                    primary={p.name}
                    secondary={!isWaiting ? `${p.totalScore} pts` : undefined}
                  />
                  {isWaiting && (
                    <Chip
                      label={p.isConnected ? 'Online' : 'Offline'}
                      size="small"
                      color={p.isConnected ? 'success' : 'default'}
                    />
                  )}
                </ListItem>
              ))}
            </List>
            {participants.length === 0 && (
              <Typography color="text.secondary" align="center">
                Waiting for players to join...
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Confirmation Dialog */}
      <Dialog open={showEndConfirm} onClose={() => setShowEndConfirm(false)}>
        <DialogTitle>
          {isWaiting ? 'Cancel Session?' : 'End Quiz?'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {isWaiting
              ? 'This will cancel the session. All players will be disconnected.'
              : 'This will end the quiz immediately. Players will see the final leaderboard.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEndConfirm(false)}>
            Go Back
          </Button>
          <Button onClick={handleEndQuiz} color="error" variant="contained">
            {isWaiting ? 'Cancel Session' : 'End Quiz'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
