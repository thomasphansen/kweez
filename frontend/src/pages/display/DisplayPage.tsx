import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Grid,
  Button,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import CheckIcon from '@mui/icons-material/Check'
import { QRCodeSVG } from 'qrcode.react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { sessionApi } from '../../services/api'
import { quizHub } from '../../services/signalr'
import { answerColors } from '../../theme'
import { localizeQuestion, localizeActiveQuestion, type LocalizedQuestion } from '../../utils/questionLocalization'
import type { Session, SessionState, QuestionResults, LeaderboardEntry } from '../../types'

const API_URL = import.meta.env.VITE_API_URL || ''

type DisplayState = 'loading' | 'no-session' | 'waiting' | 'started' | 'question' | 'results' | 'final'

export default function DisplayPage() {
  const { t } = useTranslation()
  const { sessionId } = useParams()

  const [displayState, setDisplayState] = useState<DisplayState>('loading')
  const [session, setSession] = useState<Session | null>(null)
  const [sessionState, setSessionState] = useState<SessionState | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<LocalizedQuestion | null>(null)
  const [lastQuestion, setLastQuestion] = useState<LocalizedQuestion | null>(null)
  const [questionResults, setQuestionResults] = useState<QuestionResults | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [error, setError] = useState('')

  const isMountedRef = useRef(true)
  const questionStartTimeRef = useRef<number | null>(null)
  const currentQuestionRef = useRef<LocalizedQuestion | null>(null)

  // Initialize session and SignalR connection
  useEffect(() => {
    if (!sessionId) {
      setDisplayState('no-session')
      return
    }

    let cancelled = false

    async function init() {
      try {
        const data = await sessionApi.getById(sessionId!)
        if (cancelled) return

        setSession(data)

        if (data.status === 'Finished') {
          setDisplayState('final')
        } else if (data.status === 'Active') {
          setDisplayState('started')
        } else {
          setDisplayState('waiting')
        }

        // Connect to SignalR
        await quizHub.connect()
        if (!cancelled) {
          await quizHub.joinAsAdmin(sessionId!)
        }
      } catch (err) {
        if (!cancelled) {
          setError('Session not found')
          setDisplayState('no-session')
        }
      }
    }

    init()

    return () => {
      cancelled = true
    }
  }, [sessionId])

  // Cleanup SignalR on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      quizHub.disconnect()
    }
  }, [])

  // Timer countdown
  useEffect(() => {
    if (displayState !== 'question' || !currentQuestion || timeLeft <= 0) return

    const timer = setInterval(() => {
      const elapsed = (Date.now() - (questionStartTimeRef.current || Date.now())) / 1000
      const remaining = Math.max(0, currentQuestion.timeLimitSeconds - elapsed)
      setTimeLeft(Math.ceil(remaining))
    }, 100)

    return () => clearInterval(timer)
  }, [displayState, currentQuestion, timeLeft])

  // SignalR event listeners
  useEffect(() => {
    const unsubscribers: (() => void)[] = []

    unsubscribers.push(
      quizHub.on('SessionState', (state) => {
        setSessionState(state)
        setLeaderboard(state.participants.map((p, i) => ({
          rank: i + 1,
          participantId: p.id,
          name: p.name,
          totalScore: p.totalScore,
        })).sort((a, b) => b.totalScore - a.totalScore))

        if (state.status === 'Finished') {
          setDisplayState('final')
        } else if (state.status === 'Active' && state.activeQuestion) {
          // Localize using quiz default language (display view)
          const localized = localizeActiveQuestion(
            state.activeQuestion,
            state.availableLanguages,
            state.defaultLanguage
          )
          setCurrentQuestion(localized)
          questionStartTimeRef.current = Date.now()
          setTimeLeft(state.activeQuestion.remainingSeconds)
          setDisplayState('question')
        }
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
        setDisplayState('started')
      })
    )

    unsubscribers.push(
      quizHub.on('QuestionReleased', (question) => {
        // Localize using quiz default language (display view)
        const localized = localizeQuestion(question)
        setCurrentQuestion(localized)
        currentQuestionRef.current = localized
        setQuestionResults(null)
        questionStartTimeRef.current = Date.now()
        setTimeLeft(question.timeLimitSeconds)
        setDisplayState('question')
      })
    )

    unsubscribers.push(
      quizHub.on('QuestionClosed', (results) => {
        setLastQuestion(currentQuestionRef.current)
        setQuestionResults(results)
        setLeaderboard(results.leaderboard)
        setCurrentQuestion(null)
        setDisplayState('results')
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
        setDisplayState('final')
      })
    )

    return () => {
      unsubscribers.forEach((unsub) => unsub())
    }
  }, [])

  const participants = sessionState?.participants || []
  const joinUrl = session ? `${window.location.origin}/join?session=${session.joinCode}` : ''

  // Loading state
  if (displayState === 'loading') {
    return (
      <Box sx={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress size={60} />
      </Box>
    )
  }

  // No session / error state
  if (displayState === 'no-session') {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <Typography variant="h2" gutterBottom color="text.secondary">
          {error || t('display.noActiveGame')}
        </Typography>
        <Typography variant="h5" color="text.secondary">
          {t('display.waitingForSession')}
        </Typography>
      </Box>
    )
  }

  // Waiting for players
  if (displayState === 'waiting') {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', p: 4 }}>
        <Typography variant="h3" align="center" gutterBottom>
          {session?.quizTitle}
        </Typography>

        <Box sx={{ flex: 1, display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
          {/* QR Code */}
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom>
              {t('display.joinCodeLabel', { code: session?.joinCode })}
            </Typography>
            <Box sx={{ my: 3 }}>
              <QRCodeSVG value={joinUrl} size={300} />
            </Box>
            <Typography variant="body1" color="text.secondary">
              {joinUrl}
            </Typography>
          </Paper>

          {/* Players list */}
          <Paper sx={{ p: 4, minWidth: 300, maxHeight: '60vh', overflow: 'auto' }}>
            <Typography variant="h4" gutterBottom>
              {t('display.playersCount', { count: participants.length })}
            </Typography>
            <List>
              {participants.map((p) => (
                <ListItem key={p.id}>
                  <ListItemText 
                    primary={p.name}
                    primaryTypographyProps={{ variant: 'h6' }}
                  />
                </ListItem>
              ))}
              {participants.length === 0 && (
                <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                  {t('display.waitingForPlayersJoin')}
                </Typography>
              )}
            </List>
          </Paper>
        </Box>
      </Box>
    )
  }

  // Quiz started, waiting for first question
  if (displayState === 'started') {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <Paper 
          sx={{ 
            p: 8, 
            textAlign: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
          }}
        >
          <Box
            sx={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 4,
            }}
          >
            <PlayArrowIcon sx={{ fontSize: 80 }} />
          </Box>

          <Typography variant="h2" gutterBottom sx={{ fontWeight: 700 }}>
            {t('display.quizStarted')}
          </Typography>

          <Typography variant="h4" sx={{ opacity: 0.9 }}>
            {session?.quizTitle}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mt: 4 }}>
            <CircularProgress size={32} sx={{ color: 'white' }} />
            <Typography variant="h5">
              {t('display.waitingForFirstQuestion')}
            </Typography>
          </Box>
        </Paper>
      </Box>
    )
  }

  // Question active
  if (displayState === 'question' && currentQuestion) {
    const progress = (timeLeft / currentQuestion.timeLimitSeconds) * 100

    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h5" color="text.secondary">
              {t('display.questionOfTotal', { current: currentQuestion.questionIndex + 1, total: currentQuestion.totalQuestions })}
            </Typography>
            <Typography variant="h3" color={timeLeft <= 5 ? 'error.main' : 'primary.main'}>
              {t('display.timeSeconds', { time: timeLeft })}
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={progress}
            sx={{ 
              height: 12, 
              borderRadius: 6,
              bgcolor: 'rgba(255,255,255,0.2)',
              '& .MuiLinearProgress-bar': {
                bgcolor: timeLeft <= 5 ? 'error.main' : 'primary.main',
              },
            }}
          />
        </Box>

        {/* Question */}
        <Typography variant="h3" align="center" sx={{ mb: 4, flex: '0 0 auto' }}>
          {currentQuestion.text}
        </Typography>

        {/* Answer buttons */}
        <Grid container spacing={2} sx={{ flex: 1 }}>
          {currentQuestion.answers.map((answer, index) => (
            <Grid item xs={6} key={answer.id}>
              <Button
                fullWidth
                variant="contained"
                disabled
                sx={{
                  height: '100%',
                  minHeight: 120,
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  bgcolor: answerColors[index],
                  color: 'white',
                  '&:disabled': {
                    bgcolor: answerColors[index],
                    color: 'white',
                  },
                }}
              >
                {answer.text}
              </Button>
            </Grid>
          ))}
        </Grid>
      </Box>
    )
  }

  // Results after question
  if (displayState === 'results' && questionResults) {
    // Prepare pie chart data using lastQuestion for answer texts
    const pieData = Object.entries(questionResults.answerCounts).map(([answerId, count], index) => {
      const answer = lastQuestion?.answers.find(a => a.id === answerId)
      return {
        name: answer?.text || `Answer ${index + 1}`,
        value: count as number,
        color: answerColors[index] || '#666',
        isCorrect: answerId === questionResults.correctAnswerId,
      }
    })

    const totalAnswers = pieData.reduce((sum, d) => sum + d.value, 0)
    const hasImage = !!lastQuestion?.imageUrl

    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', p: 3, overflow: 'hidden' }}>
        {/* Header */}
        <Box sx={{ mb: 2, flexShrink: 0 }}>
          <Typography variant="h5" align="center" color="text.secondary">
            {t('display.questionResults', { number: questionResults.questionIndex + 1 })}
          </Typography>
          <Typography variant="h3" align="center" sx={{ mt: 1 }}>
            {lastQuestion?.text || 'Question'}
          </Typography>
        </Box>

        <Box sx={{ flex: 1, display: 'flex', gap: 3, minHeight: 0, overflow: 'hidden' }}>
          {/* Left: Pie Chart + Answer Legend column */}
          <Box sx={{ flex: 1, display: 'flex', gap: 2, minHeight: 0, overflow: 'hidden' }}>
            {/* Pie Chart - fixed width, aligned to bottom */}
            <Box sx={{ width: 200, flexShrink: 0, display: 'flex', alignItems: 'flex-end' }}>
              <Box sx={{ width: 200, height: 200, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ value, percent }) => 
                        value > 0 && percent ? `${(percent * 100).toFixed(0)}%` : ''
                      }
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          stroke={entry.isCorrect ? '#4caf50' : 'transparent'}
                          strokeWidth={entry.isCorrect ? 4 : 0}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [t('display.answersCount', { count: value }), '']}
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Box>

            {/* Image (above) + Answer Legend column */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
              {/* Question Image (if present) - centered above answers */}
              {hasImage && (
                <Box sx={{ 
                  flex: '1 1 auto', 
                  minHeight: 0, 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  overflow: 'hidden',
                  mb: 2,
                }}>
                  <Box
                    component="img"
                    src={`${API_URL}${lastQuestion.imageUrl}`}
                    alt="Question"
                    sx={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      width: 'auto',
                      height: 'auto',
                      objectFit: 'contain',
                      borderRadius: 2,
                    }}
                  />
                </Box>
              )}

              {/* Answer Legend - fixed at bottom */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                {pieData.map((entry, index) => (
                  <Box 
                    key={index}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2,
                      px: 2,
                      py: 1,
                      borderRadius: 2,
                      bgcolor: entry.isCorrect ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255,255,255,0.05)',
                      border: entry.isCorrect ? '2px solid #4caf50' : '2px solid transparent',
                    }}
                  >
                    <Box 
                      sx={{ 
                        width: 24, 
                        height: 24, 
                        borderRadius: 1, 
                        bgcolor: entry.color,
                        flexShrink: 0,
                      }} 
                    />
                    <Typography variant="h6" sx={{ flex: 1, fontWeight: entry.isCorrect ? 700 : 400 }}>
                      {entry.name}
                    </Typography>
                    <Typography variant="h6" color="text.secondary" sx={{ minWidth: 80, textAlign: 'right' }}>
                      {t('display.answerRatio', { count: entry.value, total: totalAnswers })}
                    </Typography>
                    {entry.isCorrect && <CheckIcon sx={{ color: '#4caf50', fontSize: 28 }} />}
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>

          {/* Leaderboard */}
          <Paper sx={{ width: 350, p: 2, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <Typography variant="h5" gutterBottom>
              {t('display.top10')}
            </Typography>
            <List dense sx={{ flex: 1, overflow: 'auto' }}>
              {leaderboard.slice(0, 10).map((entry) => (
                <ListItem key={entry.participantId} sx={{ py: 1 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      width: 40, 
                      color: entry.rank <= 3 ? 'warning.main' : 'text.primary',
                    }}
                  >
                    {entry.rank <= 3 ? <EmojiEventsIcon /> : entry.rank}
                  </Typography>
                  <ListItemText 
                    primary={entry.name}
                    secondary={entry.lastQuestionScore ? `+${entry.lastQuestionScore}` : undefined}
                  />
                  <Typography variant="h6">
                    {entry.totalScore}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Box>
      </Box>
    )
  }

  // Final results
  if (displayState === 'final') {
    const top3 = leaderboard.slice(0, 3)
    const rest = leaderboard.slice(3, 10)

    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', p: 4 }}>
        <Typography variant="h2" align="center" gutterBottom sx={{ mb: 4 }}>
          {t('display.finalResults')}
        </Typography>

        {/* Podium for top 3 */}
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 2, mb: 4 }}>
          {/* 2nd place */}
          {top3[1] && (
            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#a0a0a0', color: 'white', minWidth: 180 }}>
              <EmojiEventsIcon sx={{ fontSize: 48, color: '#e0e0e0' }} />
              <Typography variant="h4">{t('display.second')}</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{top3[1].name}</Typography>
              <Typography variant="h6">{top3[1].totalScore} {t('common.pts')}</Typography>
            </Paper>
          )}

          {/* 1st place */}
          {top3[0] && (
            <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#ffd700', color: '#333', minWidth: 220, transform: 'scale(1.1)' }}>
              <EmojiEventsIcon sx={{ fontSize: 64, color: '#b8860b' }} />
              <Typography variant="h3">{t('display.first')}</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>{top3[0].name}</Typography>
              <Typography variant="h5">{top3[0].totalScore} {t('common.pts')}</Typography>
            </Paper>
          )}

          {/* 3rd place */}
          {top3[2] && (
            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#cd7f32', color: 'white', minWidth: 180 }}>
              <EmojiEventsIcon sx={{ fontSize: 48 }} />
              <Typography variant="h4">{t('display.third')}</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{top3[2].name}</Typography>
              <Typography variant="h6">{top3[2].totalScore} {t('common.pts')}</Typography>
            </Paper>
          )}
        </Box>

        {/* Rest of top 10 */}
        {rest.length > 0 && (
          <Paper sx={{ p: 2, maxWidth: 600, mx: 'auto', width: '100%' }}>
            <List>
              {rest.map((entry) => (
                <ListItem key={entry.participantId}>
                  <Typography variant="h5" sx={{ width: 50 }}>
                    {entry.rank}.
                  </Typography>
                  <ListItemText 
                    primary={entry.name}
                    primaryTypographyProps={{ variant: 'h6' }}
                  />
                  <Typography variant="h5">
                    {entry.totalScore}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Box>
    )
  }

  return null
}
