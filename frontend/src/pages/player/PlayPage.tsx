import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, LinearProgress, Grid, Button } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import { useSession } from '../../context/SessionContext'
import { answerColors } from '../../theme'
import ConnectionStatus from '../../components/ConnectionStatus'

export default function PlayPage() {
  const navigate = useNavigate()
  const { playerSession, currentQuestion, lastAnswerResult, submitAnswer } = useSession()
  
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [hasAnswered, setHasAnswered] = useState(false)

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

    // Reset state for new question
    setSelectedAnswer(null)
    setHasAnswered(false)
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
    if (hasAnswered || timeLeft <= 0) return

    setSelectedAnswer(answerId)
    setHasAnswered(true)
    await submitAnswer(answerId)
  }, [hasAnswered, timeLeft, submitAnswer])

  if (!currentQuestion) {
    return null
  }

  const progress = (timeLeft / currentQuestion.timeLimitSeconds) * 100
  const showResult = lastAnswerResult !== null

  return (
    <>
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', p: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
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
          {hasAnswered && !showResult && (
            <Typography variant="body2" color="text.secondary">
              Answer submitted!
            </Typography>
          )}
        </Box>
      </Box>

      {/* Question */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Typography 
          variant="h4" 
          align="center" 
          sx={{ mb: 4, px: 2 }}
        >
          {currentQuestion.text}
        </Typography>

        {/* Answer result feedback */}
        {showResult && (
          <Box 
            sx={{ 
              textAlign: 'center', 
              mb: 4,
              p: 3,
              borderRadius: 3,
              bgcolor: lastAnswerResult.isCorrect ? 'success.main' : 'error.main',
              color: lastAnswerResult.isCorrect ? 'success.contrastText' : 'error.contrastText',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
              {lastAnswerResult.isCorrect ? (
                <CheckIcon fontSize="large" />
              ) : (
                <CloseIcon fontSize="large" />
              )}
              <Typography variant="h5">
                {lastAnswerResult.isCorrect ? 'Correct!' : 'Wrong!'}
              </Typography>
            </Box>
            {lastAnswerResult.isCorrect && (
              <Typography variant="h6">
                +{lastAnswerResult.score} points
              </Typography>
            )}
          </Box>
        )}

        {/* Answer buttons */}
        <Grid container spacing={2}>
          {currentQuestion.answers.map((answer, index) => {
            const isSelected = selectedAnswer === answer.id
            const isCorrect = showResult && answer.id === lastAnswerResult?.correctAnswerId
            const isWrong = showResult && isSelected && !lastAnswerResult?.isCorrect

            return (
              <Grid item xs={6} key={answer.id}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => handleAnswerClick(answer.id)}
                  disabled={hasAnswered || timeLeft <= 0}
                  sx={{
                    py: 4,
                    px: 2,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    bgcolor: answerColors[index],
                    color: 'white',
                    opacity: showResult && !isCorrect && !isSelected ? 0.4 : 1,
                    border: isSelected ? '4px solid white' : 'none',
                    '&:hover': {
                      bgcolor: answerColors[index],
                      opacity: 0.9,
                    },
                    '&:disabled': {
                      bgcolor: answerColors[index],
                      color: 'white',
                    },
                    position: 'relative',
                  }}
                >
                  {answer.text}
                  {isCorrect && (
                    <CheckIcon 
                      sx={{ 
                        position: 'absolute', 
                        top: 8, 
                        right: 8,
                        bgcolor: 'success.main',
                        borderRadius: '50%',
                        p: 0.5,
                      }} 
                    />
                  )}
                  {isWrong && (
                    <CloseIcon 
                      sx={{ 
                        position: 'absolute', 
                        top: 8, 
                        right: 8,
                        bgcolor: 'error.main',
                        borderRadius: '50%',
                        p: 0.5,
                      }} 
                    />
                  )}
                </Button>
              </Grid>
            )
          })}
        </Grid>
      </Box>
    </Box>
    
    <ConnectionStatus />
    </>
  )
}
