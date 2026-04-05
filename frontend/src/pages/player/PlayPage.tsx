import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, LinearProgress, Grid, Button } from '@mui/material'
import { useSession } from '../../context/SessionContext'
import { answerColors } from '../../theme'
import ConnectionStatus from '../../components/ConnectionStatus'

export default function PlayPage() {
  const navigate = useNavigate()
  const { playerSession, currentQuestion, selectedAnswerId, submitAnswer } = useSession()
  
  const [timeLeft, setTimeLeft] = useState(0)

  // Redirect if no session or question
  useEffect(() => {
    if (!playerSession) {
      navigate('/join')
      return
    }
    if (!currentQuestion) {
      navigate('/wait')
      return
    }

    // Reset timer for new question
    setTimeLeft(currentQuestion.timeLimitSeconds)
  }, [playerSession, currentQuestion, navigate])

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  const handleAnswerClick = useCallback(async (answerId: string) => {
    // Allow clicking even if already answered (to change answer)
    // But not if time has run out
    if (timeLeft <= 0) return

    await submitAnswer(answerId)
  }, [timeLeft, submitAnswer])

  if (!currentQuestion) {
    return null
  }

  const progress = (timeLeft / currentQuestion.timeLimitSeconds) * 100
  const hasAnswered = selectedAnswerId !== null

  return (
    <>
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 2, flexShrink: 0 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Question {currentQuestion.questionIndex + 1} of {currentQuestion.totalQuestions}
        </Typography>
        <LinearProgress 
          variant="determinate" 
          value={progress}
          sx={{ 
            height: 8, 
            borderRadius: 4,
            bgcolor: 'rgba(255,255,255,0.2)',
            '& .MuiLinearProgress-bar': {
              bgcolor: timeLeft <= 5 ? 'error.main' : 'primary.main',
            },
          }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          <Typography variant="h6">{timeLeft}s</Typography>
          {hasAnswered && (
            <Typography variant="body2" color="text.secondary">
              {timeLeft > 0 ? 'Tap another answer to change' : 'Answer submitted!'}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Question */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0 }}>
        <Typography 
          variant="h5" 
          align="center" 
          sx={{ mb: 3, px: 1, flexShrink: 0 }}
        >
          {currentQuestion.text}
        </Typography>

        {/* Answer buttons */}
        <Grid container spacing={1.5} sx={{ flex: 1, alignContent: 'center' }}>
          {currentQuestion.answers.map((answer, index) => {
            const isSelected = selectedAnswerId === answer.id

            return (
              <Grid item xs={6} key={answer.id}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => handleAnswerClick(answer.id)}
                  disabled={timeLeft <= 0}
                  sx={{
                    py: { xs: 4, sm: 5 },
                    px: 1,
                    minHeight: { xs: 80, sm: 100 },
                    fontSize: { xs: '1rem', sm: '1.2rem' },
                    fontWeight: 600,
                    bgcolor: answerColors[index],
                    color: 'white',
                    border: isSelected ? '4px solid white' : 'none',
                    boxShadow: isSelected ? '0 0 20px rgba(255,255,255,0.5)' : 'none',
                    '&:hover': {
                      bgcolor: answerColors[index],
                      opacity: 0.9,
                    },
                    '&:disabled': {
                      bgcolor: answerColors[index],
                      color: 'white',
                      opacity: isSelected ? 1 : 0.6,
                    },
                    position: 'relative',
                    lineHeight: 1.3,
                  }}
                >
                  {answer.text}
                </Button>
              </Grid>
            )
          })}
        </Grid>

        {/* Waiting message when time is up */}
        {timeLeft <= 0 && (
          <Typography 
            variant="body1" 
            color="text.secondary" 
            align="center" 
            sx={{ mt: 2, flexShrink: 0 }}
          >
            Waiting for results...
          </Typography>
        )}
      </Box>
    </Box>
    
    <ConnectionStatus />
    </>
  )
}
